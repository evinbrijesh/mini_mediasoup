import React from 'react';
import { useMeetingStore } from '../store/meetingStore';
import { VideoTile } from './VideoTile';

export const VideoGrid: React.FC = () => {
    const localParticipant = useMeetingStore(state => state.localParticipant);
    const remoteParticipants = useMeetingStore(state => state.remoteParticipants);
    const pinnedTileId = useMeetingStore(state => state.pinnedTileId);
    const setPinnedTileId = useMeetingStore(state => state.setPinnedTileId);
    const layoutMode = useMeetingStore(state => state.layoutMode);
    const updateParticipant = useMeetingStore(state => state.updateParticipant);

    const handleSpeakingChange = React.useCallback((participantId: string, isSpeaking: boolean) => {
        const currentLocal = useMeetingStore.getState().localParticipant;
        const currentRemote = useMeetingStore.getState().remoteParticipants.find((p) => p.id === participantId);
        const current = participantId === currentLocal?.id ? currentLocal : currentRemote;
        if (current?.isSpeaking === isSpeaking) return;
        updateParticipant(participantId, { isSpeaking });
    }, [updateParticipant]);

    const baseParticipants = [
        ...(localParticipant ? [localParticipant] : []),
        ...remoteParticipants
    ];

    const tiles = baseParticipants.flatMap((p: any) => {
        const participantTile = {
            id: p.id,
            participantId: p.id,
            stream: p.videoStream,
            audioStream: p.audioStream,
            displayName: p.displayName,
            isLocal: p.isLocal,
            isMuted: p.isMuted,
            isSpeaking: p.isSpeaking,
            isHandRaised: p.isHandRaised,
            isScreenShare: false,
        };

        const screenTile = p.screenStream
            ? [{
                id: `${p.id}:screen`,
                participantId: p.id,
                stream: p.screenStream,
                audioStream: undefined,
                displayName: `${p.displayName}'s Screen`,
                isLocal: p.isLocal,
                isMuted: true,
                isHandRaised: false,
                isScreenShare: true,
            }]
            : [];

        return [participantTile, ...screenTile];
    });

    const orderedTiles = pinnedTileId
        ? [...tiles].sort((a, b) => (a.id === pinnedTileId ? -1 : b.id === pinnedTileId ? 1 : 0))
        : tiles;

    const spotlightTile = (pinnedTileId ? orderedTiles.find((tile) => tile.id === pinnedTileId) : null) || orderedTiles[0];
    const secondaryTiles = spotlightTile ? orderedTiles.filter((tile) => tile.id !== spotlightTile.id) : [];

    const getGridCols = (count: number) => {
        if (count === 1) return 'grid-cols-1';
        if (count <= 2) return 'grid-cols-2';
        if (count <= 4) return 'grid-cols-2';
        if (count <= 6) return 'grid-cols-3';
        return 'grid-cols-4';
    };

    const renderTile = (tile: any) => (
        <div key={tile.id} className={tile.isSpeaking ? 'speaking-tile' : ''}>
            <VideoTile
                stream={tile.stream}
                audioStream={tile.audioStream}
                displayName={tile.displayName}
                isLocal={tile.isLocal}
                isMuted={tile.isMuted}
                isHandRaised={tile.isHandRaised}
                isScreenShare={tile.isScreenShare}
                isPinned={pinnedTileId === tile.id}
                onTogglePin={() => setPinnedTileId(pinnedTileId === tile.id ? null : tile.id)}
                onSpeakingChange={(isSpeaking) => {
                    if (tile.isScreenShare) return;
                    handleSpeakingChange(tile.participantId, isSpeaking);
                }}
            />
        </div>
    );

    if (layoutMode === 'spotlight' && spotlightTile) {
        return (
            <div className="video-layout-spotlight">
                <div className="spotlight-main">{renderTile(spotlightTile)}</div>
                <div className="spotlight-strip">{secondaryTiles.map(renderTile)}</div>
            </div>
        );
    }

    if (layoutMode === 'sidebar' && spotlightTile) {
        return (
            <div className="video-layout-sidebar">
                <div className="sidebar-main">{renderTile(spotlightTile)}</div>
                <div className="sidebar-column">{secondaryTiles.map(renderTile)}</div>
            </div>
        );
    }

    return <div className={`video-grid ${getGridCols(orderedTiles.length)}`}>{orderedTiles.map(renderTile)}</div>;
};
