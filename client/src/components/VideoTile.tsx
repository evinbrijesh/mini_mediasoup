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
        <div className="relative w-full aspect-video bg-meet-surface rounded-lg overflow-hidden flex items-center justify-center">
            {stream ? (
                <video
                    ref={videoRef}
                    autoPlay
                    muted={isLocal}
                    playsInline
                    className={`w-full h-full object-cover rounded-lg relative z-0 ${isLocal ? 'scale-x-[-1]' : ''}`}
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-meet-surface">
                    <div className="w-24 h-24 rounded-full border border-gray-600 bg-meet-surfaceHover flex items-center justify-center text-4xl font-medium text-white">
                        {displayName[0].toUpperCase()}
                    </div>
                </div>
            )}

            {/* Hidden audio element for remote participants audio streams */}
            {audioStream && !isLocal && (
                <audio ref={audioRef} autoPlay />
            )}

            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded text-sm font-medium text-white">
                {isMuted && (
                    <div className="bg-red-500 rounded-full p-0.5 shadow-sm text-white flex items-center justify-center w-5 h-5">
                        <MicOff size={12} />
                    </div>
                )}
                <span className="truncate max-w-[150px]">{displayName} {isLocal ? '(You)' : ''}</span>
            </div>
        </div>
    );
};
