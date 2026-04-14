import React from 'react';
import { X, Mic, MicOff, Users, Video, VideoOff } from 'lucide-react';
import { useMeetingStore } from '../store/meetingStore';
import { Socket } from 'socket.io-client';

interface ParticipantsListProps {
    onClose: () => void;
    socket: Socket | null;
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({ onClose, socket }) => {
    const localParticipant = useMeetingStore(state => state.localParticipant);
    const remoteParticipants = useMeetingStore(state => state.remoteParticipants);
    const canModerate = Boolean(localParticipant?.isHost || localParticipant?.isCoHost);
    const isLocalHost = Boolean(localParticipant?.isHost);

    const handleMuteParticipant = (peerId: string) => {
        socket?.emit('moderation:mute-peer', { targetPeerId: peerId });
    };

    const handleRemoveParticipant = (peerId: string) => {
        socket?.emit('moderation:remove-peer', { targetPeerId: peerId });
    };

    const handleToggleCoHost = (peerId: string, makeCoHost: boolean) => {
        socket?.emit('moderation:set-cohost', { targetPeerId: peerId, isCoHost: makeCoHost });
    };

    const participants = [
        ...(localParticipant ? [localParticipant] : []),
        ...remoteParticipants
    ];
    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h3 className="sidebar-title flex items-center gap-2">
                    People
                </h3>
                <button onClick={onClose} className="sidebar-close flex items-center justify-center p-2 rounded-full">
                    <X size={20} />
                </button>
            </div>

            <div className="p-4 border-b border-meet-surface">
                <button className="flex items-center gap-3 p-2 rounded text-meet-blue-light transition-colors hover:bg-meet-surface w-full font-medium">
                    <div className="w-8 h-8 rounded-full bg-meet-surface flex items-center justify-center text-meet-blue-light">
                        <Users size={18} />
                    </div>
                    Add people
                </button>
            </div>

            <div className="sidebar-content">
                <div className="px-2 py-3 text-sm text-meet-gray-muted font-medium tracking-wide text-xs uppercase">
                    In meeting ({participants.length})
                </div>
                {participants.map(p => (
                    <div key={p.id} className="participant-item px-2 py-1 hover:bg-meet-surface rounded transition-colors group">
                        <div className="participant-info">
                            <div className="participant-mini-avatar">
                                {p.displayName[0].toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                                <span className="participant-name text-sm font-medium truncate max-w-[150px]">
                                    {p.displayName} {p.isLocal && <span className="text-meet-gray-muted font-normal ml-1">(You)</span>}
                                </span>
                                <span className="text-xs text-meet-gray-muted">{p.isHost ? 'Meeting host' : p.isCoHost ? 'Co-host' : 'Participant'}</span>
                            </div>
                        </div>
                        <div className="participant-indicators">
                            <div className="p-2">
                                {p.isVideoOff ? (
                                    <VideoOff size={18} className="text-meet-red" />
                                ) : (
                                    <Video size={18} className="text-meet-gray-muted" />
                                )}
                            </div>
                            {p.isMuted ? (
                                <div className="p-2">
                                    <MicOff size={18} className="text-meet-red" />
                                </div>
                            ) : (
                                <div className="p-2 hover:bg-meet-surfaceHover rounded-full cursor-pointer transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 text-meet-gray-muted hover:text-white">
                                    <Mic size={18} />
                                </div>
                            )}
                            {canModerate && !p.isLocal && (
                                <div className="participant-actions">
                                    <button type="button" className="participant-action-btn" onClick={() => handleMuteParticipant(p.id)}>
                                        Mute
                                    </button>
                                    <button type="button" className="participant-action-btn danger" onClick={() => handleRemoveParticipant(p.id)}>
                                        Remove
                                    </button>
                                    {isLocalHost && !p.isHost && (
                                        <button
                                            type="button"
                                            className="participant-action-btn"
                                            onClick={() => handleToggleCoHost(p.id, !Boolean(p.isCoHost))}
                                        >
                                            {p.isCoHost ? 'Revoke co-host' : 'Make co-host'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
