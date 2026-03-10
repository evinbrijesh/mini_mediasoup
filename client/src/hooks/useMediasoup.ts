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

    const joinRoom = useCallback(async (roomId: string, displayName: string) => {
        if (!socket) throw new Error('Socket not connected');

        // BUG-028: Detect errors from join-room response
        const data: any = await new Promise(resolve =>
            socket.emit('join-room', {
                roomId,
                displayName,
                // BUG-029: rtpCapabilities aren't available until after device.load(),
                // so we send them after loading the device in a second step.
            }, resolve)
        );

        if (data?.error) {
            throw new Error(`join-room failed: ${data.error}`);
        }

        // Create device and load router capabilities
        const device = new mediasoupClient.Device();
        try {
            await device.load({ routerRtpCapabilities: data.rtpCapabilities });
        } catch (err: any) {
            throw new Error(`Device load failed: ${err.message}`);
        }
        deviceRef.current = device;

        // Create send and recv transports
        await createSendTransport(socket);
        await createRecvTransport(socket);

        // Consume existing producers in the room
        socket.emit('get-producers', (producers: any[]) => {
            if (Array.isArray(producers)) {
                producers.forEach(p =>
                    consumeProducer(socket, p.producerId, p.peerId, p.displayName ?? 'Remote User', p.kind, p.appData)
                );
            }
        });

        // BUG-034: Remove any existing listener before adding a new one to prevent
        // duplicate listeners (e.g. in React StrictMode double-invoke)
        socket.off('new-producer');
        socket.on('new-producer', (producerData: any) => {
            consumeProducer(
                socket,
                producerData.producerId,
                producerData.peerId,
                producerData.displayName ?? 'Remote User',
                producerData.kind,
                producerData.appData
            );
        });

        // BUG-074: Handle peer-left — remove the video tile when someone disconnects
        socket.off('peer-left');
        socket.on('peer-left', ({ peerId }: { peerId: string }) => {
            removeRemoteParticipant(peerId);
        });

        // Handle producer being closed remotely (e.g. screen share ended on sender side)
        socket.off('producer-closed');
        socket.on('producer-closed', ({ peerId }: { peerId: string; producerId: string }) => {
            // Re-fetch or remove participant streams as needed.
            // For now just mark: a more complete implementation would
            // track which producer belonged to which stream.
            console.log(`Producer closed for peer ${peerId}`);
        });
    }, [socket, addRemoteParticipant, removeRemoteParticipant]);

    const createSendTransport = async (socket: Socket) => {
        if (!deviceRef.current) return;

        const data: any = await new Promise(resolve =>
            socket.emit('create-transport', { direction: 'send' }, resolve)
        );

        if (data?.error) throw new Error(`create-transport (send) failed: ${data.error}`);

        const transport = deviceRef.current.createSendTransport(data);
        sendTransportRef.current = transport;

        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
            socket.emit('connect-transport', { transportId: transport.id, dtlsParameters }, (res: any) => {
                if (res?.error) errback(new Error(res.error));
                else callback();
            });
        });

        transport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
            socket.emit('produce', { transportId: transport.id, kind, rtpParameters, appData }, (res: any) => {
                if (res?.error) errback(new Error(res.error));
                else callback({ id: res.id });
            });
        });
    };

    const createRecvTransport = async (socket: Socket) => {
        if (!deviceRef.current) return;

        const data: any = await new Promise(resolve =>
            socket.emit('create-transport', { direction: 'recv' }, resolve)
        );

        if (data?.error) throw new Error(`create-transport (recv) failed: ${data.error}`);

        const transport = deviceRef.current.createRecvTransport(data);
        recvTransportRef.current = transport;

        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
            socket.emit('connect-transport', { transportId: transport.id, dtlsParameters }, (res: any) => {
                if (res?.error) errback(new Error(res.error));
                else callback();
            });
        });
    };

    const produce = useCallback(async (track: MediaStreamTrack, kind: 'audio' | 'video', appData?: any) => {
        if (!sendTransportRef.current) return null;
        return await sendTransportRef.current.produce({ track, appData: appData || { kind } });
    }, []);

    const consumeProducer = async (
        socket: Socket,
        producerId: string,
        peerId: string,
        displayName: string,
        kind: string,
        appData?: any
    ) => {
        if (!deviceRef.current || !recvTransportRef.current) return;

        // BUG-032: Use non-optional access — guards above ensure these are non-null
        const transportId = recvTransportRef.current.id;
        const rtpCapabilities = deviceRef.current.rtpCapabilities;

        const data: any = await new Promise(resolve =>
            socket.emit('consume', { transportId, producerId, rtpCapabilities }, resolve)
        );

        if (data?.error) {
            console.error('Consume error:', data.error);
            return;
        }

        const consumer = await recvTransportRef.current.consume(data);

        // BUG-033: Resume consumer first, then add stream — and close the consumer
        // on error to avoid dangling server-side consumers
        const resumeResult: any = await new Promise(resolve =>
            socket.emit('resume-consumer', { consumerId: consumer.id }, resolve)
        );

        if (resumeResult?.error) {
            console.error('resume-consumer error:', resumeResult.error);
            // Close the consumer server-side to avoid leaking resources
            consumer.close();
            return;
        }

        const stream = new MediaStream([consumer.track]);
        const isScreen = appData?.sourceType === 'screen';

        // BUG-031: Use the displayName passed from the server instead of hardcoded 'Remote User'
        addRemoteParticipant({
            id: peerId,
            displayName,
            isLocal: false,
            videoStream: kind === 'video' && !isScreen ? stream : undefined,
            audioStream: kind === 'audio' ? stream : undefined,
            screenStream: isScreen ? stream : undefined,
            isMuted: false,
            isVideoOff: false
        });
    };

    return { joinRoom, produce };
};
