import { Socket, Server } from 'socket.io';
import { getMediasoupWorker } from './mediasoupWorkers';
import { Room } from './Room.js';
import { Peer } from './Peer.js';
import type { DtlsParameters, MediaKind, RtpCapabilities, RtpParameters } from 'mediasoup/node/lib/types';
import { policyRepository } from './repositories/policyRepository.js';
import { sessionRepository } from './repositories/sessionRepository.js';
import { hasRuntimeUserInRoom, registerRuntimeUser, unregisterRuntimePeer, updateRuntimeRole } from './roomRuntimeRegistry.js';
import { deriveFlagsFromPreset, evaluateJoinGate } from './domain/meetingPolicyEngine.js';
import { buildWaitingQueuePayload, buildWaitingRoomResponse } from './domain/waitingRoomContract.js';

const rooms: Map<string, Room> = new Map();

export const handleSocketEvents = (socket: Socket, io: Server) => {
    let messageCountWindowStart = Date.now();
    let messageCountInWindow = 0;

    let peer: Peer;
    let room: Room;

    const ensureJoined = (callback: any): boolean => {
        if (!room || !peer) {
            callback({ error: 'Not in a room' });
            return false;
        }
        return true;
    };

    const callbackError = (callback: any, publicMessage: string) => {
        callback({ error: publicMessage });
    };

    const canModerate = (): boolean => Boolean(peer?.isHost || peer?.isCoHost);

    const broadcastWaitingQueue = () => {
        if (!room) return;
        const queue = Array.from(room.waitingQueue.values()).sort((a, b) => a.requestedAt - b.requestedAt);
        io.to(room.id).emit('waiting-room-updated', buildWaitingQueuePayload(queue));
    };

    socket.on('join-room', async ({ roomId, displayName, rtpCapabilities }: { roomId: string, displayName: string, rtpCapabilities: RtpCapabilities }, callback: any) => {
        try {
            if (!rooms.has(roomId)) {
                const worker = getMediasoupWorker();
                const createdRoom = await Room.create(roomId, worker);
                const persistedPolicy = await policyRepository.getRoomPolicy(roomId);
                if (persistedPolicy) {
                    createdRoom.isLocked = persistedPolicy.isLocked;
                    createdRoom.waitingRoomEnabled = persistedPolicy.waitingRoomEnabled;
                }
                createdRoom.sessionId = await sessionRepository.startSession(roomId);
                rooms.set(roomId, createdRoom);
            }

            room = rooms.get(roomId)!;

            const joinGate = evaluateJoinGate({
                isLocked: room.isLocked,
                waitingRoomEnabled: room.waitingRoomEnabled,
                activePeerCount: room.peers.size,
                isAdmitted: room.admittedPeers.has(socket.id),
            });

            if (!joinGate.allowed && joinGate.reason === 'locked') {
                return callbackError(callback, 'Room is locked by host');
            }

            if (joinGate.queue) {
                room.waitingQueue.set(socket.id, {
                    peerId: socket.id,
                    displayName,
                    requestedAt: Date.now(),
                });
                broadcastWaitingQueue();
                return callback({ waiting: true });
            }

            room.admittedPeers.delete(socket.id);

            const socketUserId = socket.data?.userId as string | undefined;
            peer = new Peer({
                id: socket.id,
                displayName,
                rtpCapabilities,
                ...(socketUserId ? { userId: socketUserId } : {}),
            });
            room.addPeer(peer);

            socket.join(roomId);

            if (!room.sessionId) {
                room.sessionId = await sessionRepository.startSession(roomId);
            }
            const sessionId = room.sessionId;
            if (!sessionId) {
                return callbackError(callback, 'Failed to initialize session');
            }

            await sessionRepository.recordParticipantJoin({
                sessionId,
                roomId,
                peerId: socket.id,
                userId: socketUserId || null,
                displayName,
                isGuest: Boolean(socket.data?.isGuest),
            });
            await sessionRepository.recordEvent({
                sessionId,
                roomId,
                peerId: socket.id,
                userId: socketUserId || null,
                eventType: 'participant.joined',
                payload: { displayName },
            });

            const userId = socketUserId;
            if (userId && !String(userId).startsWith('guest:')) {
                const role = peer.isHost ? 'host' : peer.isCoHost ? 'cohost' : 'participant';
                registerRuntimeUser(roomId, socket.id, userId, role);
                void sessionRepository.upsertRuntimeRole(roomId, userId, role);
            }

            // Notify others
            socket.to(roomId).emit('peer-joined', { peerId: socket.id, displayName, isHost: peer.isHost, isCoHost: peer.isCoHost });

            callback({
                rtpCapabilities: room.rtpCapabilities,
                selfPeerId: socket.id,
                hostPeerId: room.hostPeerId,
                waitingRoomEnabled: room.waitingRoomEnabled,
            });
        } catch (error: any) {
            console.error('join-room error:', error);
            callbackError(callback, 'Failed to join room');
        }
    });

    socket.on('waiting-room:respond', async ({ targetPeerId, allow }: { targetPeerId: string; allow: boolean }, callback?: any) => {
        if (!room || !peer) return callback?.({ error: 'Not in a room' });
        if (!canModerate()) return callback?.({ error: 'Only host/co-host can manage waiting room' });

        const waiting = room.waitingQueue.get(targetPeerId);
        if (!waiting) return callback?.({ error: 'Waiting request not found' });

        room.waitingQueue.delete(targetPeerId);
        room.admittedPeers.add(targetPeerId);
        broadcastWaitingQueue();

        if (!allow) {
            io.to(targetPeerId).emit('waiting-room-response', buildWaitingRoomResponse(false, 'Denied by host'));
            return callback?.({ ok: true });
        }

        io.to(targetPeerId).emit('waiting-room-response', buildWaitingRoomResponse(true));
        callback?.({ ok: true });
    });

    socket.on('create-transport', async ({ direction }: { direction: 'send' | 'recv' }, callback: any) => {
        try {
            if (!ensureJoined(callback)) return;

            const transport = await room.router.createWebRtcTransport({
                listenIps: [{ 
                    ip: '0.0.0.0', 
                    announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1' 
                }],
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
            callbackError(callback, 'Failed to create transport');
        }
    });

    socket.on('connect-transport', async ({ transportId, dtlsParameters }: { transportId: string, dtlsParameters: DtlsParameters }, callback: any) => {
        try {
            if (!ensureJoined(callback)) return;
            const transport = peer.getTransport(transportId);
            if (transport) {
                await transport.connect({ dtlsParameters });
                callback({});
            } else {
                callback({ error: 'transport not found' });
            }
        } catch (error: any) {
            console.error('connect-transport error:', error);
            callbackError(callback, 'Failed to connect transport');
        }
    });

    socket.on('produce', async ({ transportId, kind, rtpParameters, appData }: { transportId: string, kind: MediaKind, rtpParameters: RtpParameters, appData: any }, callback: any) => {
        try {
            if (!ensureJoined(callback)) return;
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

                if (appData?.sourceType === 'screen') {
                    void sessionRepository.recordEvent({
                        sessionId: room.sessionId,
                        roomId: room.id,
                        peerId: peer.id,
                        userId: (socket.data?.userId as string | undefined) || null,
                        eventType: 'screen-share.started',
                        payload: { producerId: producer.id },
                    });
                }
            } else {
                callback({ error: 'transport not found for produce' });
            }
        } catch (error: any) {
            console.error('produce error:', error);
            callbackError(callback, 'Failed to produce media');
        }
    });

    socket.on('consume', async ({ transportId, producerId, rtpCapabilities }: { transportId: string, producerId: string, rtpCapabilities: RtpCapabilities }, callback: any) => {
        try {
            if (!ensureJoined(callback)) return;
            if (!room.router.canConsume({ producerId, rtpCapabilities })) {
                return callback({ error: 'cannot consume' });
            }

            let producerExistsInRoom = false;
            room.peers.forEach((p) => {
                if (p.producers.has(producerId)) {
                    producerExistsInRoom = true;
                }
            });

            if (!producerExistsInRoom) {
                return callback({ error: 'producer not in room' });
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
            callbackError(callback, 'Failed to consume media');
        }
    });

    socket.on('resume-consumer', async ({ consumerId }: { consumerId: string }, callback: any) => {
        try {
            if (!ensureJoined(callback)) return;
            const consumer = peer.getConsumer(consumerId);
            if (consumer) {
                await consumer.resume();
                callback({});
            } else {
                callback({ error: 'consumer not found' });
            }
        } catch (error: any) {
            console.error('resume-consumer error:', error);
            callbackError(callback, 'Failed to resume consumer');
        }
    });

    socket.on('get-producers', (callback: any) => {
        try {
            if (!ensureJoined(callback)) return;
            const producerList: any[] = [];
            room.peers.forEach((p) => {
                if (p.id !== peer.id) {
                    p.producers.forEach((producer) => {
                        producerList.push({
                            peerId: p.id,
                            producerId: producer.id,
                            kind: producer.kind,
                            appData: producer.appData,
                            displayName: p.displayName,
                            isMuted: p.isMuted,
                            isVideoOff: p.isVideoOff,
                            isHost: p.isHost,
                            isCoHost: p.isCoHost,
                        });
                    });
                }
            });
            callback(producerList);
        } catch (error: any) {
            console.error('get-producers error:', error);
            callbackError(callback, 'Failed to get producers');
        }
    });

    socket.on('transcript-from-client', ({ text, isFinal, sourceLanguage }: any) => {
        if (!room) return;
        io.to(room.id).emit('transcript', { peerId: peer.id, text, isFinal, sourceLanguage });
    });

    socket.on('transcript-from-ai', ({ roomId, text, isFinal, sourceLanguage, peerId }: any) => {
        if (!socket.data?.isAIService) return;
        if (!roomId || typeof roomId !== 'string') return;
        if (!text || typeof text !== 'string') return;

        const targetRoom = rooms.get(roomId);
        if (!targetRoom) return;

        io.to(roomId).emit('transcript', {
            peerId: typeof peerId === 'string' ? peerId : 'ai-service',
            text,
            isFinal: Boolean(isFinal),
            sourceLanguage: typeof sourceLanguage === 'string' ? sourceLanguage : 'unknown',
        });
    });

    socket.on('toggle-hand-raise', ({ isHandRaised }: { isHandRaised: boolean }) => {
        if (!room || !peer) return;
        io.to(room.id).emit('hand-raise-changed', { peerId: peer.id, isHandRaised });
        void sessionRepository.recordEvent({
            sessionId: room.sessionId,
            roomId: room.id,
            peerId: peer.id,
            userId: (socket.data?.userId as string | undefined) || null,
            eventType: 'participant.hand-raise',
            payload: { isHandRaised },
        });
    });

    socket.on('set-media-state', ({ isMuted, isVideoOff }: { isMuted?: boolean; isVideoOff?: boolean }) => {
        if (!room || !peer) return;

        if (typeof isMuted === 'boolean') {
            peer.isMuted = isMuted;
        }
        if (typeof isVideoOff === 'boolean') {
            peer.isVideoOff = isVideoOff;
        }

        io.to(room.id).emit('peer-media-state-changed', {
            peerId: peer.id,
            isMuted: peer.isMuted,
            isVideoOff: peer.isVideoOff,
        });

        void sessionRepository.recordEvent({
            sessionId: room.sessionId,
            roomId: room.id,
            peerId: peer.id,
            userId: (socket.data?.userId as string | undefined) || null,
            eventType: 'participant.media-state',
            payload: { isMuted: peer.isMuted, isVideoOff: peer.isVideoOff },
        });
    });

    socket.on('moderation:mute-peer', ({ targetPeerId }: { targetPeerId: string }, callback?: any) => {
        if (!room || !peer) return callback?.({ error: 'Not in a room' });
        if (!canModerate()) return callback?.({ error: 'Only host/co-host can mute participants' });
        if (!targetPeerId || targetPeerId === peer.id) return callback?.({ error: 'Invalid target peer' });

        const targetPeer = room.getPeer(targetPeerId);
        if (!targetPeer) return callback?.({ error: 'Target peer not found' });

        targetPeer.isMuted = true;
        io.to(targetPeerId).emit('moderation-force-mute');
        io.to(room.id).emit('peer-media-state-changed', {
            peerId: targetPeerId,
            isMuted: true,
            isVideoOff: targetPeer.isVideoOff,
        });

        callback?.({ ok: true });
    });

    socket.on('moderation:remove-peer', ({ targetPeerId }: { targetPeerId: string }, callback?: any) => {
        if (!room || !peer) return callback?.({ error: 'Not in a room' });
        if (!canModerate()) return callback?.({ error: 'Only host/co-host can remove participants' });
        if (!targetPeerId || targetPeerId === peer.id) return callback?.({ error: 'Invalid target peer' });

        const targetPeer = room.getPeer(targetPeerId);
        if (!targetPeer) return callback?.({ error: 'Target peer not found' });

        io.to(targetPeerId).emit('moderation-removed', { roomId: room.id });
        room.removePeer(targetPeerId);
        io.to(room.id).emit('peer-left', { peerId: targetPeerId });

        if (room.hostPeerId) {
            io.to(room.id).emit('host-changed', { hostPeerId: room.hostPeerId });
        }

        callback?.({ ok: true });
    });

    socket.on('moderation:toggle-room-lock', ({ locked }: { locked: boolean }, callback?: any) => {
        if (!room || !peer) return callback?.({ error: 'Not in a room' });
        if (!canModerate()) return callback?.({ error: 'Only host/co-host can lock room' });

        room.isLocked = Boolean(locked);
        io.to(room.id).emit('room-lock-changed', { locked: room.isLocked, byPeerId: peer.id });
        void policyRepository.upsertRoomPolicy(room.id, {
            preset: policyRepository.derivePresetFromFlags(room.isLocked, room.waitingRoomEnabled),
            isLocked: room.isLocked,
            waitingRoomEnabled: room.waitingRoomEnabled,
        });
        void policyRepository.addAudit(room.id, 'toggle-room-lock', { locked: room.isLocked }, socket.data?.userId, peer.id);
        callback?.({ ok: true, locked: room.isLocked });
    });

    socket.on('moderation:set-policy-preset', ({ preset }: { preset: 'open' | 'controlled' | 'strict' }, callback?: any) => {
        if (!room || !peer) return callback?.({ error: 'Not in a room' });
        if (!canModerate()) return callback?.({ error: 'Only host/co-host can set policy preset' });

        const nextFlags = deriveFlagsFromPreset(preset);
        room.isLocked = nextFlags.isLocked;
        room.waitingRoomEnabled = nextFlags.waitingRoomEnabled;

        io.to(room.id).emit('room-policy-updated', {
            preset,
            isLocked: room.isLocked,
            waitingRoomEnabled: room.waitingRoomEnabled,
        });

        void policyRepository.upsertRoomPolicy(room.id, {
            preset,
            isLocked: room.isLocked,
            waitingRoomEnabled: room.waitingRoomEnabled,
        });
        void policyRepository.addAudit(room.id, 'set-policy-preset', { preset }, socket.data?.userId, peer.id);

        callback?.({ ok: true });
    });

    socket.on('moderation:toggle-waiting-room', ({ enabled }: { enabled: boolean }, callback?: any) => {
        if (!room || !peer) return callback?.({ error: 'Not in a room' });
        if (!canModerate()) return callback?.({ error: 'Only host/co-host can toggle waiting room' });

        room.waitingRoomEnabled = Boolean(enabled);
        io.to(room.id).emit('room-policy-updated', {
            preset: null,
            isLocked: room.isLocked,
            waitingRoomEnabled: room.waitingRoomEnabled,
        });

        void policyRepository.upsertRoomPolicy(room.id, {
            preset: policyRepository.derivePresetFromFlags(room.isLocked, room.waitingRoomEnabled),
            isLocked: room.isLocked,
            waitingRoomEnabled: room.waitingRoomEnabled,
        });
        void policyRepository.addAudit(room.id, 'toggle-waiting-room', { waitingRoomEnabled: room.waitingRoomEnabled }, socket.data?.userId, peer.id);

        callback?.({ ok: true, waitingRoomEnabled: room.waitingRoomEnabled });
    });

    socket.on('moderation:set-cohost', ({ targetPeerId, isCoHost }: { targetPeerId: string; isCoHost: boolean }, callback?: any) => {
        if (!room || !peer) return callback?.({ error: 'Not in a room' });
        if (!peer.isHost) return callback?.({ error: 'Only host can assign co-host' });
        if (!targetPeerId || targetPeerId === peer.id) return callback?.({ error: 'Invalid target peer' });

        const targetPeer = room.getPeer(targetPeerId);
        if (!targetPeer) return callback?.({ error: 'Target peer not found' });

        targetPeer.isCoHost = Boolean(isCoHost);
        const targetRole = targetPeer.isHost ? 'host' : targetPeer.isCoHost ? 'cohost' : 'participant';
        updateRuntimeRole(room.id, targetPeer.id, targetRole);
        if (targetPeer.userId && !targetPeer.userId.startsWith('guest:')) {
            void sessionRepository.upsertRuntimeRole(room.id, targetPeer.userId, targetRole);
        }
        io.to(room.id).emit('peer-role-changed', {
            peerId: targetPeerId,
            isHost: targetPeer.isHost,
            isCoHost: targetPeer.isCoHost,
        });

        callback?.({ ok: true });
    });

    socket.on('send-message', ({ text }: { text: string }) => {
        if (!room || !peer) return;

        const now = Date.now();
        if (now - messageCountWindowStart > 10_000) {
            messageCountWindowStart = now;
            messageCountInWindow = 0;
        }

        messageCountInWindow += 1;
        if (messageCountInWindow > 30) {
            return;
        }

        const message = {
            id: Math.random().toString(36).substring(7),
            senderId: peer.id,
            senderName: peer.displayName,
            text,
            timestamp: Date.now()
        };
        io.to(room.id).emit('new-message', message);
        void sessionRepository.recordEvent({
            sessionId: room.sessionId,
            roomId: room.id,
            peerId: peer.id,
            userId: (socket.data?.userId as string | undefined) || null,
            eventType: 'chat.message',
            payload: { textLength: text.length },
        });
    });

    socket.on('disconnect', () => {
        if (room && peer) {
            const wasHost = room.hostPeerId === socket.id;
            const currentSessionId = room.sessionId;
            room.removePeer(socket.id);
            socket.to(room.id).emit('peer-left', { peerId: socket.id });
            if (currentSessionId) {
                void sessionRepository.recordParticipantLeft(currentSessionId, socket.id);
                void sessionRepository.recordEvent({
                    sessionId: currentSessionId,
                    roomId: room.id,
                    peerId: socket.id,
                    userId: (socket.data?.userId as string | undefined) || null,
                    eventType: 'participant.left',
                    payload: {},
                });
            }

            if (wasHost && room.hostPeerId) {
                io.to(room.id).emit('host-changed', { hostPeerId: room.hostPeerId });
                const newHost = room.getPeer(room.hostPeerId);
                if (newHost) {
                    io.to(room.id).emit('peer-role-changed', {
                        peerId: newHost.id,
                        isHost: true,
                        isCoHost: newHost.isCoHost,
                    });
                    updateRuntimeRole(room.id, newHost.id, 'host');
                    if (newHost.userId && !newHost.userId.startsWith('guest:')) {
                        void sessionRepository.upsertRuntimeRole(room.id, newHost.userId, 'host');
                    }
                }
            }

            if (room.peers.size === 0) {
                if (currentSessionId) {
                    void sessionRepository.endSession(currentSessionId, 'room-empty');
                }
                room.close();
                rooms.delete(room.id);
            }
            const leavingUserId = peer.userId;
            unregisterRuntimePeer(room.id, socket.id);
            if (leavingUserId && !leavingUserId.startsWith('guest:') && !hasRuntimeUserInRoom(room.id, leavingUserId)) {
                void sessionRepository.deleteRuntimeRole(room.id, leavingUserId);
            }
            return;
        }

        rooms.forEach((candidateRoom) => {
            if (candidateRoom.waitingQueue.has(socket.id)) {
                candidateRoom.waitingQueue.delete(socket.id);
                const queue = Array.from(candidateRoom.waitingQueue.values()).sort((a, b) => a.requestedAt - b.requestedAt);
                io.to(candidateRoom.id).emit('waiting-room-updated', { queue });
            }
        });
    });
};
