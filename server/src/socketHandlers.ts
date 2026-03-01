import { Socket, Server } from 'socket.io';
import { getMediasoupWorker } from './mediasoupWorkers';
import { Room } from './Room.js';
import { Peer } from './Peer.js';
import prisma from './prisma.js';
import type { DtlsParameters, MediaKind, RtpCapabilities, RtpParameters } from 'mediasoup/node/lib/types';

const rooms: Map<string, Room> = new Map();

export const handleSocketEvents = (socket: Socket, io: Server) => {
    let peer: Peer;
    let room: Room;

    socket.on('join-room', async ({ roomId, displayName, rtpCapabilities }: { roomId: string, displayName: string, rtpCapabilities: RtpCapabilities }, callback: any) => {
        try {
            if (!rooms.has(roomId)) {
                const worker = getMediasoupWorker();
                rooms.set(roomId, await Room.create(roomId, worker));
            }

            room = rooms.get(roomId)!;
            peer = new Peer({ id: socket.id, displayName, rtpCapabilities });
            room.addPeer(peer);

            socket.join(roomId);

            // Notify others
            socket.to(roomId).emit('peer-joined', { peerId: socket.id, displayName });

            callback({ rtpCapabilities: room.rtpCapabilities });
        } catch (error: any) {
            console.error('join-room error:', error);
            callback({ error: error.message });
        }
    });

    socket.on('create-transport', async ({ direction }: { direction: 'send' | 'recv' }, callback: any) => {
        try {
            if (!room || !peer) {
                return callback({ error: 'room or peer not initialized' });
            }

            const transport = await room.router.createWebRtcTransport({
                listenIps: [{ ip: '0.0.0.0', announcedIp: '127.0.0.1' }], // Adjust for production
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

    socket.on('connect-transport', async ({ transportId, dtlsParameters }: { transportId: string, dtlsParameters: DtlsParameters }, callback: any) => {
        try {
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

    socket.on('produce', async ({ transportId, kind, rtpParameters, appData }: { transportId: string, kind: MediaKind, rtpParameters: RtpParameters, appData: any }, callback: any) => {
        try {
            const transport = peer.getTransport(transportId);
            if (transport) {
                const producer = await transport.produce({ kind, rtpParameters, appData });
                peer.addProducer(producer);

                // If audio, pipe to AI service (Temporarily disabled to prevent Mediasoup Worker crash)
                /*
                if (kind === 'audio') {
                    const plainTransport = await room.createPlainTransport();
                    await plainTransport.connect({
                        ip: '127.0.0.1',
                        port: 5000, // Dummy port for AI service RTP receiver
                    });
                    const consumer = await plainTransport.consume({
                        producerId: producer.id,
                        rtpCapabilities: room.rtpCapabilities, // Use router capabilities
                    });
                    console.log(`Piping audio producer ${producer.id} to AI service`);
                }
                */

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

    socket.on('consume', async ({ transportId, producerId, rtpCapabilities }: { transportId: string, producerId: string, rtpCapabilities: RtpCapabilities }, callback: any) => {
        try {
            if (!room.router.canConsume({ producerId, rtpCapabilities })) {
                return callback({ error: 'cannot consume' });
            }

            const transport = peer.getTransport(transportId);
            if (transport) {
                const consumer = await transport.consume({
                    producerId,
                    rtpCapabilities,
                    paused: true, // Start paused
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

    socket.on('resume-consumer', async ({ consumerId }: { consumerId: string }, callback: any) => {
        try {
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

    socket.on('get-producers', (callback: any) => {
        try {
            const producerList: any[] = [];
            room.peers.forEach((p) => {
                if (p.id !== peer.id) {
                    p.producers.forEach((producer) => {
                        producerList.push({
                            peerId: p.id,
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
            callback({ error: error.message });
        }
    });

    socket.on('transcript-from-ai', (data: any) => {
        // Broadcast transcript to the room
        // Note: AI service needs to provide the roomId
        io.to(room.id).emit('transcript', data);
    });

    socket.on('send-message', ({ text }: { text: string }) => {
        if (!room || !peer) return;
        const message = {
            id: Math.random().toString(36).substring(7),
            senderId: peer.id,
            senderName: peer.displayName,
            text,
            timestamp: Date.now()
        };
        io.to(room.id).emit('new-message', message);
    });

    socket.on('disconnect', () => {
        if (room && peer) {
            room.removePeer(socket.id);
            socket.to(room.id).emit('peer-left', { peerId: socket.id });

            if (room.peers.size === 0) {
                rooms.delete(room.id);
            }
        }
    });
};
