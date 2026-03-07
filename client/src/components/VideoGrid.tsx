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
        if (count === 1) return 'grid-cols-1';
        if (count <= 2) return 'grid-cols-2';
        if (count <= 4) return 'grid-cols-2';
        if (count <= 6) return 'grid-cols-3';
        return 'grid-cols-4';
    };

    return (
        <div className={`video-grid ${getGridCols(allParticipants.length)}`}>
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
