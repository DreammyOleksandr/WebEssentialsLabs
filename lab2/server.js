require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const users = [];
const VALID_ROLES = ['admin', 'user'];
const SALT_ROUNDS = 10;
const PORT = 3001;
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_ERROR: 500
};

const findUser = (username) => users.find(user => user.username === username);
const findUserById = (id) => users.find(user => user.id === id);

const validateUserInput = (username, password) => {
    if (!username || !password) {
        return { isValid: false, message: 'Username and password are required' };
    }
    return { isValid: true };
};

const validateUserAccess = (requestUserId, targetUserId, userRole) => {
    return requestUserId === targetUserId || userRole === 'admin';
};

const formatUserResponse = (user) => ({
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt
});

const createUserObject = (username, hashedPassword, role) => ({
    id: users.length + 1,
    username,
    password: hashedPassword,
    role: VALID_ROLES.includes(role) ? role : 'user',
    createdAt: new Date()
});

const createAuthResponse = (message, user, token) => ({
    message,
    user: formatUserResponse(user),
    token
});

const generateToken = (user) => {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.EXPIRES_IN }
    )
};

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({ message: 'Invalid or expired token' });
    }
};

const adminMiddleware = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(HTTP_STATUS.FORBIDDEN).json({ message: 'Access denied. Admin role required.' });
    }
    next();
};

app.get('/', (req, res) => {
    res.json({ 
        message: 'JWT Authentication API',
        endpoints: {
            register: 'POST /users/register',
            login: 'POST /users/login',
            profile: 'GET /users/profile (requires auth)',
            users: 'GET /users (requires admin)',
            update: 'PUT /users/:id (requires auth)',
            delete: 'DELETE /users/:id (requires admin)'
        }
    });
});

app.post('/users/register', async (req, res) => {
    try {
        const { username, password, role = 'user' } = req.body;
        
        const validation = validateUserInput(username, password);
        if (!validation.isValid) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: validation.message });
        }
        
        if (findUser(username)) {
            return res.status(HTTP_STATUS.CONFLICT).json({ message: 'User already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        
        const newUser = createUserObject(username, hashedPassword, role);
        
        users.push(newUser);
        const token = generateToken(newUser);
        
        res.status(HTTP_STATUS.CREATED).json(
            createAuthResponse('User registered successfully', newUser, token)
        );
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({ message: 'Error registering user', error: error.message });
    }
});

app.post('/users/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const validation = validateUserInput(username, password);
        if (!validation.isValid) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: validation.message });
        }
        
        const user = findUser(username);
        if (!user) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Invalid credentials' });
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: 'Invalid credentials' });
        }
        
        const token = generateToken(user);
        
        res.json(
            createAuthResponse('Login successful', user, token)
        );
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({ message: 'Error logging in', error: error.message });
    }
});

app.get('/users/profile', authMiddleware, (req, res) => {
    const user = findUserById(req.user.id);
    if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'User not found' });
    }
    
    res.json(formatUserResponse(user));
});

app.get('/users', authMiddleware, adminMiddleware, (req, res) => {
    const usersData = users.map(formatUserResponse);
    res.json(usersData);
});

app.put('/users/:id', authMiddleware, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { password, newRole } = req.body;
        
        if (!validateUserAccess(req.user.id, userId, req.user.role)) {
            return res.status(HTTP_STATUS.FORBIDDEN).json({ message: 'Access denied' });
        }
        
        const user = findUserById(userId);
        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'User not found' });
        }
        
        if (password) {
            user.password = await bcrypt.hash(password, SALT_ROUNDS);
        }
        
        if (newRole && req.user.role === 'admin') {
            if (VALID_ROLES.includes(newRole)) {
                user.role = newRole;
            }
        }
        
        res.json({
            message: 'User updated successfully',
            user: formatUserResponse(user)
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_ERROR).json({ message: 'Error updating user', error: error.message });
    }
});

app.delete('/users/:id', authMiddleware, adminMiddleware, (req, res) => {
    const userId = parseInt(req.params.id);
    const userIndex = users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'User not found' });
    }
    
    users.splice(userIndex, 1);
    res.json({ message: 'User deleted successfully' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});