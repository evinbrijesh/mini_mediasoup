import React, { useEffect, useRef } from 'react';
import { MicOff, Hand } from 'lucide-react';

interface VideoTileProps {
    stream?: MediaStream;
    audioStream?: MediaStream;
    displayName: string;
    isLocal?: boolean;
    isMuted?: boolean;
    isHandRaised?: boolean;
    isScreenShare?: boolean;
}

export const VideoTile: React.FC<VideoTileProps> = ({
    stream, audioStream, displayName, isLocal, isMuted, isHandRaised, isScreenShare
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream ?? null;
        }
        // BUG-048: Cleanup srcObject on unmount / stream change to release MediaStream references
        return () => {
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };
    }, [stream]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.srcObject = audioStream ?? null;
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.srcObject = null;
            }
        };
    }, [audioStream]);

    // BUG-049: Safe avatar initial — handle empty/undefined displayName
    const avatarInitial = displayName?.trim()
        ? displayName.trim()[0].toUpperCase()
        : '?';

    return (
        <div className="video-tile">
            {stream ? (
                <video
                    ref={videoRef}
                    autoPlay
                    muted={isLocal}
                    playsInline
                    className={`video-element ${isLocal && !isScreenShare ? 'mirrored' : ''}`}
                />
            ) : (
                <div className="participant-avatar">
                    {avatarInitial}
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
        </div>
    );
};
