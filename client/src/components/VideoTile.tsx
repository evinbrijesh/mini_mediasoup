import React, { useEffect, useRef } from 'react';
import { MicOff } from 'lucide-react';

interface VideoTileProps {
    stream?: MediaStream;
    audioStream?: MediaStream;
    displayName: string;
    isLocal?: boolean;
    isMuted?: boolean;
}

export const VideoTile: React.FC<VideoTileProps> = ({ stream, audioStream, displayName, isLocal, isMuted }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    useEffect(() => {
        if (audioRef.current && audioStream) {
            audioRef.current.srcObject = audioStream;
        }
    }, [audioStream]);

    return (
        <div className="video-tile">
            {stream ? (
                <video
                    ref={videoRef}
                    autoPlay
                    muted={isLocal}
                    playsInline
                    className={`video-element ${isLocal ? 'mirrored' : ''}`}
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

            <div className="tile-overlay">
                {isMuted && (
                    <div className="mic-indicator muted">
                        <MicOff size={11} />
                    </div>
                )}
                <span className="name-bg">{displayName} {isLocal ? '(You)' : ''}</span>
            </div>
        </div>
    );
};
