import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useSocket = (token?: string | null) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const srv = io(SOCKET_URL, {
            auth: token ? { token } : {},
            autoConnect: true,
        });

        setSocket(srv);

        srv.on('connect', () => {
            setIsConnected(true);
            console.log('Connected to signaling server', srv.id);
        });

        srv.on('disconnect', () => {
            setIsConnected(false);
        });

        srv.on('connect_error', (error) => {
            setIsConnected(false);
            console.warn('Socket connection error:', error.message);
        });

        return () => {
            setIsConnected(false);
            srv.disconnect();
        };
    }, [token]);

    return { socket, isConnected };
};
