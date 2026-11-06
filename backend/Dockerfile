FROM node:22-alpine

WORKDIR /app

# Install the backend dependencies from the repository root.
COPY package*.json ./
RUN npm ci

# The backend source lives in the backend directory.
COPY backend ./backend

EXPOSE 3000

CMD ["npm", "start"]
