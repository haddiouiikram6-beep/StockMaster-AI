FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Install build dependencies if needed
RUN apk add --no-cache python3 make g++

# Copy package configuration
COPY package*.json ./

# Install dependencies (production + development for migrations)
RUN npm install

# Copy application source code and migrations
COPY . .

# Expose API port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Start application
CMD ["npm", "start"]
