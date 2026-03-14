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
    
    // Store for display names mapping peerId -> displayName
    const displayNamesRef = useRef<Map<string, string>>(new Map());

    const joinRoom = useCallback(async (roomId: string, displayName: string) => {
        if (!socket) return;

        // 1. Join room and get router RTP capabilities from server
        const data: any = await new Promise((resolve, reject) =>
            socket.emit('join-room', { roomId, displayName }, (res: any) => {
                if (res?.error) reject(new Error(res.error));
                else resolve(res);
            })
        );
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
                consumeProducer(socket, p.producerId, p.peerId, p.kind, p.appData);
            });
        });

        // 6. Listen for new producers
        socket.on('new-producer', (data: any) => {
            console.log('new-producer event', data);
            consumeProducer(socket, data.producerId, data.peerId, data.kind, data.appData);
        });

        // 7. Listen for peer join/leave
        socket.on('peer-joined', ({ peerId, displayName }: { peerId: string, displayName: string }) => {
            console.log('peer-joined', peerId, displayName);
            displayNamesRef.current.set(peerId, displayName);
            addRemoteParticipant({
                id: peerId,
                displayName: displayName,
                isLocal: false,
                isMuted: false,
                isVideoOff: false
            });
        });

        socket.on('peer-left', ({ peerId }: { peerId: string }) => {
            console.log('peer-left', peerId);
            removeRemoteParticipant(peerId);
        });
    }, [socket, addRemoteParticipant, removeRemoteParticipant]);

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

            // Update UI store with remote stream
            addRemoteParticipant({
                id: peerId,
                displayName: displayNamesRef.current.get(peerId) || 'Remote User',
                isLocal: false,
                videoStream: kind === 'video' && !isScreen ? stream : undefined,
                audioStream: kind === 'audio' ? stream : undefined,
                screenStream: isScreen ? stream : undefined,
                isMuted: false,
                isVideoOff: false
            });
        });
    };

    return { joinRoom, produce };
};
