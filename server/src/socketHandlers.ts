import { Socket, Server } from 'socket.io';
import { getMediasoupWorker } from './mediasoupWorkers.js';
import { Room } from './Room.js';
import { Peer } from './Peer.js';
import { verifyToken } from './auth.js';
import { randomUUID } from 'crypto';
import type { DtlsParameters, MediaKind, RtpCapabilities, RtpParameters } from 'mediasoup/node/lib/types';

const rooms: Map<string, Room> = new Map();

/**
 * Peer registry: maps socketId -> { displayName }
 * Used so that when a new consumer is created we can look up the remote peer's display name.
 */
const peerRegistry: Map<string, { displayName: string }> = new Map();

export const handleSocketEvents = (socket: Socket, io: Server) => {
    // -------------------------------------------------------------------------
    // BUG-071: Socket authentication — verify JWT token on connection
    // -------------------------------------------------------------------------
    const token = socket.handshake.auth?.token as string | undefined;
    let authenticatedUserId: string | null = null;
    if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
            authenticatedUserId = decoded.userId;
        }
    }
    // Allow unauthenticated connections (guest users with display name only),
    // but track auth status for future permission checks.

    // BUG-006: peer and room are undefined until join-room fires — use | undefined
    // and guard every handler that depends on them.
    let peer: Peer | undefined;
    let room: Room | undefined;

    socket.on('join-room', async (
        { roomId, displayName, rtpCapabilities }: { roomId: string; displayName: string; rtpCapabilities?: RtpCapabilities },
        callback: (data: any) => void
    ) => {
        try {
            if (!roomId || !displayName) {
                return callback({ error: 'roomId and displayName are required' });
            }

            if (!rooms.has(roomId)) {
                const worker = getMediasoupWorker();
                rooms.set(roomId, await Room.create(roomId, worker));
            }

            room = rooms.get(roomId)!;
            peer = new Peer({ id: socket.id, displayName, rtpCapabilities });
            room.addPeer(peer);

            // BUG-031 (server side): Register peer so consumers can resolve display names
            peerRegistry.set(socket.id, { displayName });

            socket.join(roomId);

            // Notify others
            socket.to(roomId).emit('peer-joined', { peerId: socket.id, displayName });

            callback({ rtpCapabilities: room.rtpCapabilities });
        } catch (error: any) {
            console.error('join-room error:', error);
            callback({ error: error.message });
        }
    });

    socket.on('create-transport', async ({ direction }: { direction: 'send' | 'recv' }, callback: (data: any) => void) => {
        try {
            // BUG-006/010: Guard against uninitialized peer/room
            if (!room || !peer) {
                return callback({ error: 'Not in a room. Call join-room first.' });
            }

            // BUG-007: Read announcedIp from env instead of hardcoding 127.0.0.1
            const announcedIp = process.env.ANNOUNCED_IP || '127.0.0.1';

            const transport = await room.router.createWebRtcTransport({
                listenIps: [{ ip: '0.0.0.0', announcedIp }],
                enableUdp: true,
                enableTcp: true,
                preferUdp: true,
            });

            transport.on('dtlsstatechange', (dtlsState) => {
                if (dtlsState === 'closed') transport.close();
            });

            peer.addTransport(transport);

            callback({
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters,
            });
        } catch (error: any) {
            console.error('create-transport error:', error);
            callback({ error: error.message });
        }
    });

    socket.on('connect-transport', async (
        { transportId, dtlsParameters }: { transportId: string; dtlsParameters: DtlsParameters },
        callback: (data: any) => void
    ) => {
        try {
            // BUG-010: Guard against uninitialized peer
            if (!peer) {
                return callback({ error: 'Not in a room. Call join-room first.' });
            }

            const transport = peer.getTransport(transportId);
            if (transport) {
                await transport.connect({ dtlsParameters });
                callback({});
            } else {
                callback({ error: 'transport not found' });
            }
        } catch (error: any) {
            console.error('connect-transport error:', error);
            callback({ error: error.message });
        }
    });

    socket.on('produce', async (
        { transportId, kind, rtpParameters, appData }: { transportId: string; kind: MediaKind; rtpParameters: RtpParameters; appData: any },
        callback: (data: any) => void
    ) => {
        try {
            // BUG-011: Guard against uninitialized peer/room
            if (!peer || !room) {
                return callback({ error: 'Not in a room. Call join-room first.' });
            }

            const transport = peer.getTransport(transportId);
            if (transport) {
                const producer = await transport.produce({ kind, rtpParameters, appData });
                peer.addProducer(producer);

                // Notify others in the room
                socket.to(room.id).emit('new-producer', {
                    peerId: peer.id,
                    producerId: producer.id,
                    kind: producer.kind,
                    appData: producer.appData,
                });

                callback({ id: producer.id });
            } else {
                callback({ error: 'transport not found for produce' });
            }
        } catch (error: any) {
            console.error('produce error:', error);
            callback({ error: error.message });
        }
    });

    socket.on('close-producer', async ({ producerId }: { producerId: string }, callback: (data: any) => void) => {
        try {
            if (!peer || !room) {
                return callback({ error: 'Not in a room. Call join-room first.' });
            }
            const producer = peer.getProducer(producerId);
            if (producer) {
                producer.close();
                peer.producers.delete(producerId);
                // Notify others that this producer is gone
                socket.to(room.id).emit('producer-closed', { peerId: peer.id, producerId });
            }
            callback({});
        } catch (error: any) {
            console.error('close-producer error:', error);
            callback({ error: error.message });
        }
    });

    socket.on('consume', async (
        { transportId, producerId, rtpCapabilities }: { transportId: string; producerId: string; rtpCapabilities: RtpCapabilities },
        callback: (data: any) => void
    ) => {
        try {
            // BUG-012: Guard against uninitialized peer/room
            if (!peer || !room) {
                return callback({ error: 'Not in a room. Call join-room first.' });
            }

            if (!room.router.canConsume({ producerId, rtpCapabilities })) {
                return callback({ error: 'cannot consume' });
            }

            const transport = peer.getTransport(transportId);
            if (transport) {
                const consumer = await transport.consume({
                    producerId,
                    rtpCapabilities,
                    paused: true,
                });

                peer.addConsumer(consumer);

                callback({
                    id: consumer.id,
                    producerId: consumer.producerId,
                    kind: consumer.kind,
                    rtpParameters: consumer.rtpParameters,
                });
            } else {
                callback({ error: 'transport not found for consume' });
            }
        } catch (error: any) {
            console.error('consume error:', error);
            callback({ error: error.message });
        }
    });

    socket.on('resume-consumer', async ({ consumerId }: { consumerId: string }, callback: (data: any) => void) => {
        try {
            // BUG-013: Guard against uninitialized peer
            if (!peer) {
                return callback({ error: 'Not in a room. Call join-room first.' });
            }

            const consumer = peer.getConsumer(consumerId);
            if (consumer) {
                await consumer.resume();
                callback({});
            } else {
                callback({ error: 'consumer not found' });
            }
        } catch (error: any) {
            console.error('resume-consumer error:', error);
            callback({ error: error.message });
        }
    });

    socket.on('get-producers', (callback: (data: any) => void) => {
        try {
            // BUG-014: Guard against uninitialized peer/room
            if (!room || !peer) {
                return callback([]);
            }

            const producerList: any[] = [];
            room.peers.forEach((p) => {
                if (p.id !== peer!.id) {
                    p.producers.forEach((producer) => {
                        producerList.push({
                            peerId: p.id,
                            displayName: p.displayName,
                            producerId: producer.id,
                            kind: producer.kind,
                            appData: producer.appData,
                        });
                    });
                }
            });
            callback(producerList);
        } catch (error: any) {
            console.error('get-producers error:', error);
            callback([]);
        }
    });

    // BUG-075: server now handles `transcript-from-client` (the event the client actually emits)
    socket.on('transcript-from-client', (data: { peerId: string; text: string; isFinal: boolean; sourceLanguage: string }) => {
        if (!room) return;
        io.to(room.id).emit('transcript', data);
    });

    // BUG-008: `transcript-from-ai` now uses data.roomId instead of the closure `room`
    socket.on('transcript-from-ai', (data: { roomId: string; peerId: string; text: string; isFinal: boolean; sourceLanguage: string }) => {
        if (!data.roomId) {
            console.warn('transcript-from-ai missing roomId');
            return;
        }
        io.to(data.roomId).emit('transcript', data);
    });

    socket.on('send-message', ({ text }: { text: string }) => {
        if (!room || !peer) return;
        const message = {
            // BUG-009: Use crypto.randomUUID() instead of Math.random()
            id: randomUUID(),
            senderId: peer.id,
            senderName: peer.displayName,
            text,
            timestamp: Date.now()
        };
        io.to(room.id).emit('new-message', message);
    });

    socket.on('toggle-hand-raise', ({ isHandRaised }: { isHandRaised: boolean }) => {
        if (!room || !peer) return;
        socket.to(room.id).emit('hand-raise-changed', { peerId: peer.id, isHandRaised });
    });

    socket.on('disconnect', () => {
        // Clean up peer registry
        peerRegistry.delete(socket.id);

        if (room && peer) {
            room.removePeer(socket.id);
            // BUG-074: emit peer-left so clients can remove the tile
            socket.to(room.id).emit('peer-left', { peerId: socket.id });

            if (room.peers.size === 0) {
                rooms.delete(room.id);
            }
        }
    });
};

/**
 * Look up a peer's display name from the registry.
 * Used by consumers when they need to label a remote participant.
 */
export const getPeerDisplayName = (peerId: string): string => {
    return peerRegistry.get(peerId)?.displayName ?? 'Remote User';
};
