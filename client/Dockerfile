# Node.js base image
FROM node:22

# Working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source code
COPY . .

# Build frontend
RUN npm run build

# Expose Vite port
EXPOSE 5173

# Start frontend
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
