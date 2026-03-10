import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useSocket = () => {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        // BUG-053: Pass JWT token in handshake auth so the server can authenticate
        // the socket connection. Token may be null for guest users.
        const token = localStorage.getItem('token') ?? undefined;

        const srv = io(SOCKET_URL, {
            auth: { token },
            // Don't auto-connect — we connect lazily to avoid unauthenticated
            // connections before the user has a session.
            autoConnect: false,
        });

        srv.connect();
        setSocket(srv);

        srv.on('connect', () => {
            console.log('Connected to signaling server', srv.id);
        });

        srv.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
        });

        return () => {
            srv.disconnect();
        };
    }, []);

    return socket;
};
