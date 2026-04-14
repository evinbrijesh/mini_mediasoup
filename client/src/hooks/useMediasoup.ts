import { useRef, useCallback } from 'react';
import * as mediasoupClient from 'mediasoup-client';
import { Device, types } from 'mediasoup-client';
type Transport = types.Transport;
import { Socket } from 'socket.io-client';
import { useMeetingStore } from '../store/meetingStore';

export const useMediasoup = (socket: Socket | null) => {
    const deviceRef = useRef<Device | null>(null);
    const sendTransportRef = useRef<Transport | null>(null);
    const recvTransportRef = useRef<Transport | null>(null);

    const addRemoteParticipant = useMeetingStore(state => state.addRemoteParticipant);
    const removeRemoteParticipant = useMeetingStore(state => state.removeRemoteParticipant);
    const updateParticipant = useMeetingStore(state => state.updateParticipant);
    const resetMeeting = useMeetingStore(state => state.resetMeeting);

    const joinedRoomIdRef = useRef<string | null>(null);
    const displayNameRef = useRef<string>('');
    
    // Store for display names mapping peerId -> displayName
    const displayNamesRef = useRef<Map<string, string>>(new Map());
    const peerMediaStateRef = useRef<Map<string, { isMuted: boolean; isVideoOff: boolean; isHost: boolean; isCoHost: boolean }>>(new Map());

    const joinRoom = useCallback(async (roomId: string, displayName: string) => {
        if (!socket) return;

        joinedRoomIdRef.current = roomId;
        displayNameRef.current = displayName;

        // 1. Join room and get router RTP capabilities from server
        const data: any = await new Promise((resolve, reject) =>
            socket.emit('join-room', { roomId, displayName }, (res: any) => {
                if (res?.error) reject(new Error(res.error));
                else resolve(res);
            })
        );
        if (data?.waiting) {
            return { waiting: true as const };
        }
        if (!data || !data.rtpCapabilities) throw new Error("Missing RTP Capabilities");

        // 2. Create and load device with router capabilities
        const device = new mediasoupClient.Device();
        await device.load({ routerRtpCapabilities: data.rtpCapabilities });
        deviceRef.current = device;

        // 3. Create send transport
        await createSendTransport(socket);
        // 4. Create recv transport
        await createRecvTransport(socket);

        // 5. Get existing producers
        socket.emit('get-producers', (producers: any[]) => {
            console.log('get-producers response', producers);
            producers.forEach(p => {
                displayNamesRef.current.set(p.peerId, p.displayName);
                const isMuted = Boolean(p.isMuted ?? false);
                const isVideoOff = Boolean(p.isVideoOff ?? false);
                const isHost = Boolean(p.isHost ?? false);
                const isCoHost = Boolean(p.isCoHost ?? false);
                peerMediaStateRef.current.set(p.peerId, { isMuted, isVideoOff, isHost, isCoHost });
                consumeProducer(socket, p.producerId, p.peerId, p.kind, p.appData);
            });
        });

        socket.off('new-producer');
        socket.off('peer-joined');
        socket.off('peer-left');
        socket.off('peer-media-state-changed');
        socket.off('host-changed');
        socket.off('peer-role-changed');

        // 6. Listen for new producers
        socket.on('new-producer', (data: any) => {
            console.log('new-producer event', data);
            consumeProducer(socket, data.producerId, data.peerId, data.kind, data.appData);
        });

        // 7. Listen for peer join/leave
        socket.on('peer-joined', ({ peerId, displayName, isHost, isCoHost }: { peerId: string, displayName: string, isHost?: boolean, isCoHost?: boolean }) => {
            console.log('peer-joined', peerId, displayName);
            displayNamesRef.current.set(peerId, displayName);
            peerMediaStateRef.current.set(peerId, {
                isMuted: false,
                isVideoOff: false,
                isHost: Boolean(isHost),
                isCoHost: Boolean(isCoHost),
            });
            addRemoteParticipant({
                id: peerId,
                displayName: displayName,
                isLocal: false,
                isMuted: false,
                isVideoOff: false,
                isHost: Boolean(isHost),
                isCoHost: Boolean(isCoHost),
            });
        });

        socket.on('peer-left', ({ peerId }: { peerId: string }) => {
            console.log('peer-left', peerId);
            peerMediaStateRef.current.delete(peerId);
            removeRemoteParticipant(peerId);
        });

        socket.on('peer-media-state-changed', ({ peerId, isMuted, isVideoOff }: { peerId: string; isMuted?: boolean; isVideoOff?: boolean }) => {
            const prev = peerMediaStateRef.current.get(peerId) || { isMuted: false, isVideoOff: false, isHost: false, isCoHost: false };
            peerMediaStateRef.current.set(peerId, {
                ...prev,
                ...(typeof isMuted === 'boolean' ? { isMuted } : {}),
                ...(typeof isVideoOff === 'boolean' ? { isVideoOff } : {}),
            });
            updateParticipant(peerId, {
                ...(typeof isMuted === 'boolean' ? { isMuted } : {}),
                ...(typeof isVideoOff === 'boolean' ? { isVideoOff } : {}),
            });
        });

        socket.on('host-changed', ({ hostPeerId }: { hostPeerId: string }) => {
            peerMediaStateRef.current.forEach((state, peerId) => {
                const isHost = peerId === hostPeerId;
                peerMediaStateRef.current.set(peerId, { ...state, isHost });
                updateParticipant(peerId, { isHost });
            });
        });

        socket.on('peer-role-changed', ({ peerId, isHost, isCoHost }: { peerId: string; isHost?: boolean; isCoHost?: boolean }) => {
            const prev = peerMediaStateRef.current.get(peerId) || { isMuted: false, isVideoOff: false, isHost: false, isCoHost: false };
            const next = {
                ...prev,
                ...(typeof isHost === 'boolean' ? { isHost } : {}),
                ...(typeof isCoHost === 'boolean' ? { isCoHost } : {}),
            };
            peerMediaStateRef.current.set(peerId, next);
            updateParticipant(peerId, {
                ...(typeof isHost === 'boolean' ? { isHost } : {}),
                ...(typeof isCoHost === 'boolean' ? { isCoHost } : {}),
            });
        });

        socket.off('reconnect');
        socket.on('reconnect', async () => {
            try {
                if (!joinedRoomIdRef.current || !displayNameRef.current) return;
                await joinRoom(joinedRoomIdRef.current, displayNameRef.current);
            } catch (error) {
                console.error('Failed to rejoin room after reconnect', error);
            }
        });
        return {
            waiting: false as const,
            selfPeerId: data.selfPeerId as string,
            hostPeerId: data.hostPeerId as string | null,
            waitingRoomEnabled: Boolean(data.waitingRoomEnabled),
        };
    }, [socket, addRemoteParticipant, removeRemoteParticipant, updateParticipant]);

    const createSendTransport = async (socket: Socket) => {
        if (!deviceRef.current) return;

        const data: any = await new Promise((resolve, reject) =>
            socket.emit('create-transport', { direction: 'send' }, (res: any) => {
                if (res?.error) reject(new Error(res.error));
                else resolve(res);
            })
        );

        const transport = deviceRef.current.createSendTransport(data);
        sendTransportRef.current = transport;

        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
            socket.emit('connect-transport', { transportId: transport.id, dtlsParameters }, (res: any) => {
                if (res?.error) errback(res.error);
                else callback();
            });
        });

        transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
            socket.emit('produce', { transportId: transport.id, kind, rtpParameters, appData }, (res: any) => {
                if (res?.error) errback(res.error);
                else callback({ id: res.id });
            });
        });
    };

    const createRecvTransport = async (socket: Socket) => {
        if (!deviceRef.current) return;

        const data: any = await new Promise((resolve, reject) =>
            socket.emit('create-transport', { direction: 'recv' }, (res: any) => {
                if (res?.error) reject(new Error(res.error));
                else resolve(res);
            })
        );

        const transport = deviceRef.current.createRecvTransport(data);
        recvTransportRef.current = transport;

        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
            socket.emit('connect-transport', { transportId: transport.id, dtlsParameters }, (res: any) => {
                if (res?.error) errback(res.error);
                else callback();
            });
        });
    };

    const produce = async (track: MediaStreamTrack, kind: 'audio' | 'video', appData?: any) => {
        if (!sendTransportRef.current) return;
        return await sendTransportRef.current.produce({ track, appData: appData || { kind } });
    };

    const leaveRoom = useCallback(() => {
        socket?.off('new-producer');
        socket?.off('peer-joined');
        socket?.off('peer-left');
        socket?.off('peer-media-state-changed');
        socket?.off('host-changed');
        socket?.off('peer-role-changed');
        socket?.off('reconnect');

        sendTransportRef.current?.close();
        recvTransportRef.current?.close();

        sendTransportRef.current = null;
        recvTransportRef.current = null;
        deviceRef.current = null;
        displayNamesRef.current.clear();
        peerMediaStateRef.current.clear();
        joinedRoomIdRef.current = null;
        displayNameRef.current = '';

        resetMeeting();
    }, [socket, resetMeeting]);

    const consumeProducer = async (socket: Socket, producerId: string, peerId: string, kind: string, appData?: any) => {
        // Wait up to 5 seconds for recvTransportRef to be ready
        let retryCount = 0;
        while (!recvTransportRef.current && retryCount < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retryCount++;
        }

        if (!deviceRef.current || !recvTransportRef.current) {
            console.error('Recv transport not ready for consuming after waiting');
            return;
        }

        const data: any = await new Promise(resolve =>
            socket.emit('consume', {
                transportId: recvTransportRef.current?.id,
                producerId,
                rtpCapabilities: deviceRef.current?.rtpCapabilities
            }, resolve)
        );

        if (data.error) {
            console.error('Consume error:', data.error);
            return;
        }

        const consumer = await recvTransportRef.current.consume(data);

        socket.emit('resume-consumer', { consumerId: consumer.id }, (res: any) => {
            if (res?.error) {
                console.error('resume-consumer error:', res.error);
                return;
            }
            const stream = new MediaStream([consumer.track]);
            const isScreen = appData?.sourceType === 'screen';
            console.log('Got consumer track', kind, consumer.track.id, 'for peer', peerId);
            const state = peerMediaStateRef.current.get(peerId) || { isMuted: false, isVideoOff: false, isHost: false, isCoHost: false };

            // Update UI store with remote stream
            addRemoteParticipant({
                id: peerId,
                displayName: displayNamesRef.current.get(peerId) || 'Remote User',
                isLocal: false,
                videoStream: kind === 'video' && !isScreen ? stream : undefined,
                audioStream: kind === 'audio' ? stream : undefined,
                screenStream: isScreen ? stream : undefined,
                isMuted: state.isMuted,
                isVideoOff: state.isVideoOff,
                isHost: state.isHost,
                isCoHost: state.isCoHost,
            });
        });
    };

    return { joinRoom, produce, leaveRoom };
};
