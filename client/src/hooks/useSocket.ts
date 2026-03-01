import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const useSocket = () => {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        const srv = io(SOCKET_URL);
        setSocket(srv);

        srv.on('connect', () => {
            console.log('Connected to signaling server', srv.id);
        });

        return () => {
            srv.disconnect();
        };
    }, []);

    return socket;
};
