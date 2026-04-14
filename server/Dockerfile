FROM node:22-bookworm-slim

WORKDIR /app

# mediasoup worker fallback build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first for better layer caching
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

# Copy project files
COPY . .

EXPOSE 3000
EXPOSE 10000-11000/udp
EXPOSE 10000-11000/tcp

CMD ["npm", "run", "dev"]
