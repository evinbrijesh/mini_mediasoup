# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim

# mediasoup prebuilt worker download needs curl; build fallback needs python3/pip/g++
# openssl is required by Prisma client
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    openssl \
    python3 \
    python3-pip \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm install

# Generate Prisma client before copying full source (cached unless schema changes)
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the source
COPY . .

EXPOSE 3000

# Run DB migration then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]
