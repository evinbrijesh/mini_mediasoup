import { useEffect, useRef, useCallback } from 'react';
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
    const updateParticipant = useMeetingStore(state => state.updateParticipant);

    const joinRoom = useCallback(async (roomId: string, displayName: string) => {
        if (!socket) return;

        // 1. Get router RTP capabilities
        const data: any = await new Promise(resolve =>
            socket.emit('join-room', { roomId, displayName }, resolve)
        );

        // 2. Create device
        const device = new mediasoupClient.Device();
        await device.load({ routerRtpCapabilities: data.rtpCapabilities });
        deviceRef.current = device;

        // 3. Create send transport
        await createSendTransport(socket);
        // 4. Create recv transport
        await createRecvTransport(socket);

        // 5. Get existing producers
        socket.emit('get-producers', (producers: any[]) => {
            producers.forEach(p => consumeProducer(socket, p.producerId, p.peerId, p.kind, p.appData));
        });

        // 6. Listen for new producers
        socket.on('new-producer', (data: any) => {
            consumeProducer(socket, data.producerId, data.peerId, data.kind, data.appData);
        });
    }, [socket]);

    const createSendTransport = async (socket: Socket) => {
        if (!deviceRef.current) return;

        const data: any = await new Promise(resolve =>
            socket.emit('create-transport', { direction: 'send' }, resolve)
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

        const data: any = await new Promise(resolve =>
            socket.emit('create-transport', { direction: 'recv' }, resolve)
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
        if (!deviceRef.current || !recvTransportRef.current) return;

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

            // Update UI store with remote stream
            addRemoteParticipant({
                id: peerId,
                displayName: 'Remote User', // Should be fetched from registry
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
