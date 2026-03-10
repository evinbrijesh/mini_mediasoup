# syntax=docker/dockerfile:1

FROM node:22-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the source
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
