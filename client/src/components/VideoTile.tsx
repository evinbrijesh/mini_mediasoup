import React, { useEffect, useRef } from 'react';
import { MicOff, Hand, Pin, PinOff } from 'lucide-react';

interface VideoTileProps {
    stream?: MediaStream;
    audioStream?: MediaStream;
    displayName: string;
    isLocal?: boolean;
    isMuted?: boolean;
    isHandRaised?: boolean;
    isScreenShare?: boolean;
    isPinned?: boolean;
    onTogglePin?: () => void;
    onSpeakingChange?: (isSpeaking: boolean) => void;
}

export const VideoTile: React.FC<VideoTileProps> = ({
    stream, audioStream, displayName, isLocal, isMuted, isHandRaised, isScreenShare, isPinned, onTogglePin,
    onSpeakingChange,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const rafRef = useRef<number | null>(null);
    const speakingCallbackRef = useRef<typeof onSpeakingChange>(onSpeakingChange);

    useEffect(() => {
        speakingCallbackRef.current = onSpeakingChange;
    }, [onSpeakingChange]);

    const videoTrack = stream?.getVideoTracks?.()[0];
    const hasRenderableVideo = Boolean(videoTrack && videoTrack.readyState === 'live' && videoTrack.enabled);

    useEffect(() => {
        if (videoRef.current && hasRenderableVideo && stream) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error('Video play error:', e));
        }
    }, [stream, hasRenderableVideo]);

    useEffect(() => {
        if (audioRef.current && audioStream) {
            audioRef.current.srcObject = audioStream;
            audioRef.current.play().catch(e => console.error('Audio play error:', e));
        }
    }, [audioStream]);

    useEffect(() => {
        if (!audioStream) return;

        const track = audioStream.getAudioTracks()[0];
        if (!track) {
            speakingCallbackRef.current?.(false);
            return;
        }

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;

        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(new MediaStream([track]));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const data = new Uint8Array(analyser.fftSize);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;

        const tick = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i += 1) {
                const n = (data[i] - 128) / 128;
                sum += n * n;
            }
            const rms = Math.sqrt(sum / data.length);
            speakingCallbackRef.current?.(rms > 0.04 && track.enabled);
            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
            analyserRef.current = null;
            speakingCallbackRef.current?.(false);
            if (audioCtxRef.current) {
                void audioCtxRef.current.close();
                audioCtxRef.current = null;
            }
        };
    }, [audioStream]);

    return (
        <div className="video-tile">
            {hasRenderableVideo ? (
                <video
                    ref={videoRef}
                    autoPlay
                    muted={isLocal}
                    playsInline
                    className={`video-element ${isLocal && !isScreenShare ? 'mirrored' : ''}`}
                />
            ) : (
                <div className="participant-avatar">
                    {displayName[0].toUpperCase()}
                </div>
            )}

            {/* Hidden audio element for remote participants audio streams */}
            {audioStream && !isLocal && (
                <audio ref={audioRef} autoPlay />
            )}

            <div className={`tile-overlay ${isScreenShare ? 'screen-share-overlay' : ''}`}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {isHandRaised && (
                        <div className="hand-indicator">
                            <Hand size={14} color="#facc15" fill="#facc15" />
                        </div>
                    )}
                    {isMuted && !isScreenShare && (
                        <div className="mic-indicator muted">
                            <MicOff size={11} />
                        </div>
                    )}
                    <span className="name-bg">{displayName} {isLocal && !isScreenShare ? '(You)' : ''}</span>
                </div>
            </div>

            {onTogglePin && (
                <button
                    type="button"
                    className={`tile-pin-btn ${isPinned ? 'active' : ''}`}
                    onClick={onTogglePin}
                    title={isPinned ? 'Unpin tile' : 'Pin tile'}
                >
                    {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                </button>
            )}
        </div>
    );
};
