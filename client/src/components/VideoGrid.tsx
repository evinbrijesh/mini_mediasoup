import React from 'react';
import { useMeetingStore } from '../store/meetingStore';
import { VideoTile } from './VideoTile';

export const VideoGrid: React.FC = () => {
    const localParticipant = useMeetingStore(state => state.localParticipant);
    const remoteParticipants = useMeetingStore(state => state.remoteParticipants);

    const allParticipants = [
        ...(localParticipant ? [localParticipant] : []),
        ...remoteParticipants
    ];

    const getGridCols = (count: number) => {
        if (count === 1) return 'grid-cols-1 max-w-5xl mx-auto';
        if (count <= 2) return 'grid-cols-1 md:grid-cols-2 max-w-6xl mx-auto';
        if (count <= 4) return 'grid-cols-2 max-w-6xl mx-auto';
        if (count <= 6) return 'grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto';
        return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    };

    return (
        <div className={`grid ${getGridCols(allParticipants.length)} gap-4 w-full h-[calc(100vh-88px)] p-4 items-center place-content-center bg-meet-bg`}>
            {allParticipants.map(p => (
                <VideoTile
                    key={p.id}
                    stream={p.videoStream}
                    audioStream={p.audioStream}
                    displayName={p.displayName}
                    isLocal={p.isLocal}
                    isMuted={p.isMuted}
                />
            ))}
        </div>
    );
};
