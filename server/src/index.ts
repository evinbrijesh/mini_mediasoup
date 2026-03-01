import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { createWorkers } from './mediasoupWorkers.js';
import { handleSocketEvents } from './socketHandlers.js';

import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // Initialize mediasoup workers
        await createWorkers();

        // Socket.io handlers
        io.on('connection', (socket) => {
            handleSocketEvents(socket, io);
        });

        httpServer.listen(PORT, () => {
            console.log(`Signaling server listening on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
