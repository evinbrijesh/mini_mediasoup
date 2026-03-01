import { useState, useCallback } from 'react';
import { useMeetingStore } from '../store/meetingStore';

export const useLocalMedia = () => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const updateParticipant = useMeetingStore((state) => state.updateParticipant);

    const startLocalStream = useCallback(async () => {
        try {
            const localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
            });
            setStream(localStream);
            return localStream;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            throw error;
        }
    }, []);

    const toggleVideo = useCallback(() => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            videoTrack.enabled = !videoTrack.enabled;
            // Update store state if needed
        }
    }, [stream]);

    const toggleAudio = useCallback(() => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            audioTrack.enabled = !audioTrack.enabled;
        }
    }, [stream]);

    return { stream, startLocalStream, toggleVideo, toggleAudio };
};
