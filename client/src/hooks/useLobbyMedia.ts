import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type DeviceStatus = 'ready' | 'off' | 'blocked' | 'unavailable';

const getAudioLevel = (analyser: AnalyserNode, dataArray: Uint8Array): number => {
    analyser.getByteTimeDomainData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i += 1) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    return Math.min(1, rms * 3);
};

export const useLobbyMedia = () => {
    const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
    const [micEnabled, setMicEnabled] = useState(true);
    const [camEnabled, setCamEnabled] = useState(true);
    const [micLevel, setMicLevel] = useState(0);
    const [cameraStatus, setCameraStatus] = useState<DeviceStatus>('unavailable');
    const [microphoneStatus, setMicrophoneStatus] = useState<DeviceStatus>('unavailable');
    const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
    const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
    const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
    const [selectedVideoInputId, setSelectedVideoInputId] = useState<string>('');
    const [selectedAudioInputId, setSelectedAudioInputId] = useState<string>('');
    const [selectedAudioOutputId, setSelectedAudioOutputId] = useState<string>('');
    const [isTestingSpeaker, setIsTestingSpeaker] = useState(false);
    const [speakerOutputSupported, setSpeakerOutputSupported] = useState(false);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const meterRafRef = useRef<number | null>(null);
    const meterDataRef = useRef<Uint8Array | null>(null);
    const consumedForJoinRef = useRef(false);
    const speakerContextRef = useRef<AudioContext | null>(null);
    const speakerTimeoutRef = useRef<number | null>(null);
    const speakerElementRef = useRef<HTMLAudioElement | null>(null);

    const refreshDeviceList = useCallback(async () => {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const nextVideoInputs = devices.filter((d) => d.kind === 'videoinput');
        const nextAudioInputs = devices.filter((d) => d.kind === 'audioinput');
        const nextAudioOutputs = devices.filter((d) => d.kind === 'audiooutput');

        setVideoInputs(nextVideoInputs);
        setAudioInputs(nextAudioInputs);
        setAudioOutputs(nextAudioOutputs);

        if (!selectedVideoInputId && nextVideoInputs[0]?.deviceId) {
            setSelectedVideoInputId(nextVideoInputs[0].deviceId);
        }
        if (!selectedAudioInputId && nextAudioInputs[0]?.deviceId) {
            setSelectedAudioInputId(nextAudioInputs[0].deviceId);
        }
        if (!selectedAudioOutputId && nextAudioOutputs[0]?.deviceId) {
            setSelectedAudioOutputId(nextAudioOutputs[0].deviceId);
        }
    }, [selectedVideoInputId, selectedAudioInputId, selectedAudioOutputId]);

    const stopSpeakerTest = useCallback(() => {
        if (speakerTimeoutRef.current !== null) {
            clearTimeout(speakerTimeoutRef.current);
            speakerTimeoutRef.current = null;
        }

        if (speakerContextRef.current) {
            void speakerContextRef.current.close();
            speakerContextRef.current = null;
        }

        if (speakerElementRef.current) {
            speakerElementRef.current.pause();
            speakerElementRef.current.srcObject = null;
            speakerElementRef.current = null;
        }

        setIsTestingSpeaker(false);
    }, []);

    const teardownMeter = useCallback(() => {
        if (meterRafRef.current !== null) {
            cancelAnimationFrame(meterRafRef.current);
            meterRafRef.current = null;
        }

        analyserRef.current = null;
        meterDataRef.current = null;

        if (audioContextRef.current) {
            void audioContextRef.current.close();
            audioContextRef.current = null;
        }

        setMicLevel(0);
    }, []);

    const setupMeter = useCallback((stream: MediaStream) => {
        teardownMeter();
        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack) return;

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;

        const context = new AudioCtx();
        const source = context.createMediaStreamSource(new MediaStream([audioTrack]));
        const analyser = context.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.fftSize);

        audioContextRef.current = context;
        analyserRef.current = analyser;
        meterDataRef.current = dataArray;

        const tick = () => {
            if (!analyserRef.current || !meterDataRef.current) return;
            const level = audioTrack.enabled ? getAudioLevel(analyserRef.current, meterDataRef.current) : 0;
            setMicLevel(level);
            meterRafRef.current = requestAnimationFrame(tick);
        };

        meterRafRef.current = requestAnimationFrame(tick);
    }, [teardownMeter]);

    const initPreview = useCallback(async (forceRestart = false) => {
        if (previewStream && !forceRestart) return previewStream;

        if (previewStream && forceRestart) {
            previewStream.getTracks().forEach((track) => track.stop());
        }

        const audioConstraint = selectedAudioInputId
            ? { deviceId: { exact: selectedAudioInputId } }
            : true;

        const videoConstraint = selectedVideoInputId
            ? {
                deviceId: { exact: selectedVideoInputId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
            }
            : {
                width: { ideal: 1280 },
                height: { ideal: 720 },
            };

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: audioConstraint,
                video: videoConstraint,
            });

            stream.getAudioTracks().forEach((track) => {
                track.enabled = true;
            });
            stream.getVideoTracks().forEach((track) => {
                track.enabled = true;
            });

            setPreviewStream(stream);
            setMicEnabled(stream.getAudioTracks().length > 0);
            setCamEnabled(stream.getVideoTracks().length > 0);
            setMicrophoneStatus(stream.getAudioTracks().length > 0 ? 'ready' : 'unavailable');
            setCameraStatus(stream.getVideoTracks().length > 0 ? 'ready' : 'unavailable');
            setupMeter(stream);
            await refreshDeviceList();

            return stream;
        } catch (error: any) {
            const blocked = error?.name === 'NotAllowedError' || error?.name === 'SecurityError';
            setCameraStatus(blocked ? 'blocked' : 'unavailable');
            setMicrophoneStatus(blocked ? 'blocked' : 'unavailable');
            setMicEnabled(false);
            setCamEnabled(false);
            setPreviewStream(null);
            teardownMeter();
            await refreshDeviceList();
            return null;
        }
    }, [previewStream, selectedAudioInputId, selectedVideoInputId, setupMeter, teardownMeter, refreshDeviceList]);

    const toggleMic = useCallback(() => {
        if (!previewStream) return;
        const audioTrack = previewStream.getAudioTracks()[0];
        if (!audioTrack) return;

        const nextEnabled = !audioTrack.enabled;
        audioTrack.enabled = nextEnabled;
        setMicEnabled(nextEnabled);
        setMicrophoneStatus(nextEnabled ? 'ready' : 'off');
    }, [previewStream]);

    const toggleCam = useCallback(() => {
        if (!previewStream) return;
        const videoTrack = previewStream.getVideoTracks()[0];
        if (!videoTrack) return;

        const nextEnabled = !videoTrack.enabled;
        videoTrack.enabled = nextEnabled;
        setCamEnabled(nextEnabled);
        setCameraStatus(nextEnabled ? 'ready' : 'off');
    }, [previewStream]);

    const stopPreview = useCallback(() => {
        consumedForJoinRef.current = false;
        if (previewStream) {
            previewStream.getTracks().forEach((track) => track.stop());
            setPreviewStream(null);
        }
        teardownMeter();
        setMicEnabled(false);
        setCamEnabled(false);
        setCameraStatus('unavailable');
        setMicrophoneStatus('unavailable');
    }, [previewStream, teardownMeter]);

    const consumePreviewStreamForJoin = useCallback(() => {
        if (!previewStream) return null;
        consumedForJoinRef.current = true;
        teardownMeter();
        return previewStream;
    }, [previewStream, teardownMeter]);

    const resetAfterFailedJoin = useCallback(() => {
        consumedForJoinRef.current = false;
        if (previewStream) {
            setupMeter(previewStream);
        }
    }, [previewStream, setupMeter]);

    const selectVideoInput = useCallback(async (deviceId: string) => {
        setSelectedVideoInputId(deviceId);
    }, []);

    const selectAudioInput = useCallback(async (deviceId: string) => {
        setSelectedAudioInputId(deviceId);
    }, []);

    const selectAudioOutput = useCallback((deviceId: string) => {
        setSelectedAudioOutputId(deviceId);
    }, []);

    const playSpeakerTestTone = useCallback(async () => {
        if (isTestingSpeaker) return;

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;

        const context = new AudioCtx();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const destination = context.createMediaStreamDestination();
        const audioElement = new Audio();
        audioElement.autoplay = true;

        const hasSetSinkId = typeof (audioElement as any).setSinkId === 'function';
        if (hasSetSinkId && selectedAudioOutputId) {
            try {
                await (audioElement as any).setSinkId(selectedAudioOutputId);
            } catch {
                // fallback to default output
            }
        }

        oscillator.type = 'sine';
        oscillator.frequency.value = 660;
        gain.gain.value = 0.05;
        oscillator.connect(gain);
        gain.connect(destination);

        audioElement.srcObject = destination.stream;
        await audioElement.play();

        oscillator.start();

        speakerContextRef.current = context;
        speakerElementRef.current = audioElement;
        setIsTestingSpeaker(true);

        speakerTimeoutRef.current = window.setTimeout(() => {
            oscillator.stop();
            stopSpeakerTest();
        }, 1500);
    }, [isTestingSpeaker, selectedAudioOutputId, stopSpeakerTest]);

    useEffect(() => {
        void refreshDeviceList();

        const checker = new Audio();
        setSpeakerOutputSupported(typeof (checker as any).setSinkId === 'function');

        const mediaDevices = navigator.mediaDevices;
        if (!mediaDevices?.addEventListener) return;

        const onDeviceChange = () => {
            void refreshDeviceList();
        };

        mediaDevices.addEventListener('devicechange', onDeviceChange);
        return () => {
            mediaDevices.removeEventListener('devicechange', onDeviceChange);
        };
    }, [refreshDeviceList]);

    useEffect(() => {
        if (!previewStream) return;
        const currentVideoId = previewStream.getVideoTracks()[0]?.getSettings().deviceId;
        if (selectedVideoInputId && currentVideoId && selectedVideoInputId !== currentVideoId) {
            void initPreview(true);
        }
    }, [selectedVideoInputId, previewStream, initPreview]);

    useEffect(() => {
        if (!previewStream) return;
        const currentAudioId = previewStream.getAudioTracks()[0]?.getSettings().deviceId;
        if (selectedAudioInputId && currentAudioId && selectedAudioInputId !== currentAudioId) {
            void initPreview(true);
        }
    }, [selectedAudioInputId, previewStream, initPreview]);

    useEffect(() => () => {
        stopSpeakerTest();
    }, [stopSpeakerTest]);

    const state = useMemo(() => ({
        previewStream,
        micEnabled,
        camEnabled,
        micLevel,
        cameraStatus,
        microphoneStatus,
        videoInputs,
        audioInputs,
        audioOutputs,
        selectedVideoInputId,
        selectedAudioInputId,
        selectedAudioOutputId,
        isTestingSpeaker,
        speakerOutputSupported,
    }), [
        previewStream,
        micEnabled,
        camEnabled,
        micLevel,
        cameraStatus,
        microphoneStatus,
        videoInputs,
        audioInputs,
        audioOutputs,
        selectedVideoInputId,
        selectedAudioInputId,
        selectedAudioOutputId,
        isTestingSpeaker,
        speakerOutputSupported,
    ]);

    return {
        ...state,
        initPreview,
        toggleMic,
        toggleCam,
        stopPreview,
        consumePreviewStreamForJoin,
        resetAfterFailedJoin,
        selectVideoInput,
        selectAudioInput,
        selectAudioOutput,
        playSpeakerTestTone,
        stopSpeakerTest,
    };
};
