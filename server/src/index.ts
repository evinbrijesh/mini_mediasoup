import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createWorkers, closeWorkers } from './mediasoupWorkers.js';
import { handleSocketEvents } from './socketHandlers.js';
import { verifyToken } from './auth.js';
import { initPolicyStore } from './policyStore.js';
import { initSessionStore } from './sessionStore.js';

import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import policyRoutes from './routes/policyRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';

dotenv.config();

const app = express();
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({
    origin: allowedOrigin,
    credentials: true,
}));
app.use(express.json());

const globalLimiter = rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(globalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/health', healthRoutes);

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

io.use((socket, next) => {
    try {
        const auth = socket.handshake.auth as { token?: string } | undefined;
        const token = auth?.token;

        const aiToken = process.env.AI_SOCKET_TOKEN;
        if (token && aiToken && token === aiToken) {
            socket.data.userId = 'ai-service';
            socket.data.isAIService = true;
            return next();
        }

        if (!token) {
            socket.data.userId = `guest:${socket.id}`;
            socket.data.isGuest = true;
            return next();
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return next(new Error('Unauthorized'));
        }

        socket.data.userId = decoded.userId;
        next();
    } catch {
        next(new Error('Unauthorized'));
    }
});

const PORT = process.env.PORT || 3000;
let shuttingDown = false;

const startServer = async () => {
    try {
        await initPolicyStore();
        await initSessionStore();

        // Initialize mediasoup workers
        await createWorkers();

        // Socket.io handlers
        io.on('connection', (socket) => {
            handleSocketEvents(socket, io);
        });

        httpServer.listen(PORT, () => {
            console.log(`Signaling server listening on port ${PORT}`);
        });

        const gracefulShutdown = () => {
            if (shuttingDown) return;
            shuttingDown = true;

            console.log('Graceful shutdown started...');
            io.close(() => {
                httpServer.close(() => {
                    closeWorkers();
                    process.exit(0);
                });
            });

            setTimeout(() => {
                process.exit(1);
            }, 10_000);
        };

        process.on('SIGINT', gracefulShutdown);
        process.on('SIGTERM', gracefulShutdown);
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
