
# Stage 1: Dependencies
FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package*.json ./

RUN npm ci


# Stage 2: Application Runtime
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=development
ENV HOST=0.0.0.0

COPY --from=dependencies /app/node_modules ./node_modules

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
