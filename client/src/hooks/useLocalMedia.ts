import { useState, useCallback, useRef } from 'react';
import { useMeetingStore } from '../store/meetingStore';

export const useLocalMedia = () => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const recognitionRef = useRef<any>(null);
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
            console.warn('Camera access failed (possibly due to 3+ tabs hardware limit). Attempting audio only...', error);
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                setStream(audioStream);
                return audioStream;
            } catch (fallbackError) {
                console.warn('Full media access failed. Continuing with an empty stream so user can still join.', fallbackError);
                const emptyStream = new MediaStream();
                setStream(emptyStream);
                return emptyStream;
            }
        }
    }, []);

    const startScreenShare = useCallback(async () => {
        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false
            });
            setScreenStream(displayStream);
            return displayStream;
        } catch (error) {
            console.error('Error accessing display media:', error);
            throw error;
        }
    }, []);

    const startTranscription = useCallback((socket: any, localId: string) => {
        try {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) return;

            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event: any) => {
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const text = event.results[i][0].transcript;
                    const isFinal = event.results[i].isFinal;

                    socket.emit('transcript-from-client', {
                        peerId: localId,
                        text: text,
                        isFinal: isFinal,
                        sourceLanguage: 'en'
                    });
                }
            };

            recognition.onend = () => {
                // Restart if it stops abruptly
                try {
                    recognition.start();
                } catch (e) {
                    console.warn("SpeechRecognition restart failed", e);
                }
            };

            recognition.start();
            recognitionRef.current = recognition;
        } catch (e) {
            console.error("Failed to start speech recognition (likely hardware locking by browser):", e);
        }
    }, []);

    const stopTranscription = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.onend = null; // Prevent restart
            recognitionRef.current.stop();
            recognitionRef.current = null;
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

    return {
        stream,
        screenStream,
        startLocalStream,
        startScreenShare,
        startTranscription,
        stopTranscription,
        toggleVideo,
        toggleAudio
    };
};
