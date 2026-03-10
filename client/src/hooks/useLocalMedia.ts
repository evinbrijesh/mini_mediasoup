import { useState, useCallback, useRef } from 'react';
import { useMeetingStore } from '../store/meetingStore';

export const useLocalMedia = () => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const recognitionRef = useRef<any>(null);
    // BUG-036: Track whether transcription was intentionally stopped to prevent restart
    const stoppedRef = useRef<boolean>(false);
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
        // BUG-039: Guard against null socket
        if (!socket) return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        stoppedRef.current = false;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const text = event.results[i][0].transcript;
                const isFinal = event.results[i].isFinal;

                // BUG-035/BUG-075: Use 'transcript-from-client' which the server now handles
                socket.emit('transcript-from-client', {
                    peerId: localId,
                    text: text,
                    isFinal: isFinal,
                    sourceLanguage: 'en'
                });
            }
        };

        // BUG-036: Only restart if we haven't intentionally stopped
        recognition.onend = () => {
            if (!stoppedRef.current && recognitionRef.current) {
                recognition.start();
            }
        };

        recognition.onerror = (event: any) => {
            // Don't log 'no-speech' — it's normal and causes unnecessary noise
            if (event.error !== 'no-speech') {
                console.error('SpeechRecognition error:', event.error);
            }
        };

        recognition.start();
        recognitionRef.current = recognition;
    }, []);

    const stopTranscription = useCallback(() => {
        if (recognitionRef.current) {
            // BUG-036: Set stopped flag BEFORE clearing onend to prevent race condition
            stoppedRef.current = true;
            recognitionRef.current.onend = null;
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
    }, []);

    const toggleVideo = useCallback(() => {
        if (stream) {
            // BUG-037: Guard against missing video track (e.g. camera permission denied)
            const videoTrack = stream.getVideoTracks()[0];
            if (!videoTrack) return;
            videoTrack.enabled = !videoTrack.enabled;
        }
    }, [stream]);

    const toggleAudio = useCallback(() => {
        if (stream) {
            // BUG-038: Guard against missing audio track
            const audioTrack = stream.getAudioTracks()[0];
            if (!audioTrack) return;
            audioTrack.enabled = !audioTrack.enabled;
        }
    }, [stream]);

    const stopAllTracks = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
        }
    }, [stream, screenStream]);

    return {
        stream,
        screenStream,
        startLocalStream,
        startScreenShare,
        startTranscription,
        stopTranscription,
        toggleVideo,
        toggleAudio,
        stopAllTracks,
    };
};
