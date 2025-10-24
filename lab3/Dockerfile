# Use the official Node.js runtime as the base image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the dependencies
RUN npm install --omit=dev

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port the app runs on (not strictly necessary for a bot, but good practice)
EXPOSE 3000

# Create a non-root user to run the application
RUN addgroup -g 1001 -S nodejs
RUN adduser -S botuser -u 1001

# Change ownership of the app directory to the botuser
RUN chown -R botuser:nodejs /app
USER botuser

# Define the command to run the application
CMD ["npm", "start"]