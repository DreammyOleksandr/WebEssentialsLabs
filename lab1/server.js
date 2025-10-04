const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(path.join(__dirname, 'public')));

const users = new Map();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    socket.on('join', (data) => {
        const { username, room } = data;
        users.set(socket.id, { username, room });
        socket.join(room);
        
        const connectedUsers = Array.from(users.values()).filter(user => user.room === room);
        
        socket.emit('message', {
            user: 'Admin',
            text: `Welcome to room ${room}!`,
            time: new Date().toTimeString().split(' ')[0]
        });
        
        socket.broadcast.to(room).emit('message', {
            user: 'Admin',
            text: `${username} has joined the chat`,
            time: new Date().toTimeString().split(' ')[0]
        });
        
        io.to(room).emit('connectedUsers', {
          room,
          users: connectedUsers,
        })
    });

    socket.on('chatMessage', (msg) => {
        const user = users.get(socket.id);
        if (user) {
            io.to(user.room).emit('message', {
                user: user.username,
                text: msg,
                time: new Date().toTimeString().split(' ')[0]
            });
        }
    });

    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            users.delete(socket.id);
            const connectedUsers = Array.from(users.values()).filter(u => u.room === user.room);
            
            socket.broadcast.to(user.room).emit('message', {
                user: 'Admin',
                text: `${user.username} has left the chat`,
                time: new Date().toTimeString().split(' ')[0]
            });
            
            io.to(user.room).emit('connectedUsers', {
              room: user.room,
              users: connectedUsers,
            })
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});