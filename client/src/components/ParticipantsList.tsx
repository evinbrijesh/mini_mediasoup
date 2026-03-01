import React from 'react';
import { X, Mic, MicOff, Users } from 'lucide-react';
import { useMeetingStore } from '../store/meetingStore';

interface ParticipantsListProps {
    onClose: () => void;
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({ onClose }) => {
    const localParticipant = useMeetingStore(state => state.localParticipant);
    const remoteParticipants = useMeetingStore(state => state.remoteParticipants);

    const participants = [
        ...(localParticipant ? [localParticipant] : []),
        ...remoteParticipants
    ];
    return (
        <div className="absolute right-4 top-4 bottom-[104px] w-[360px] bg-white rounded-xl shadow-lg flex flex-col z-40 border border-gray-200 overflow-hidden">
            <div className="p-4 flex justify-between items-center bg-white">
                <h3 className="text-lg font-normal text-gray-800 flex items-center gap-2">
                    People
                </h3>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="px-4 py-2 border-b border-gray-200">
                <button className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded transition-colors text-meet-blue font-medium">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <Users size={18} />
                    </div>
                    Add people
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                <div className="px-2 py-3 text-sm text-gray-500 font-medium tracking-wide text-xs uppercase">
                    In meeting ({participants.length})
                </div>
                {participants.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#1a73e8] flex items-center justify-center font-medium text-white shadow-sm">
                                {p.displayName[0].toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-800 truncate max-w-[150px]">
                                    {p.displayName} {p.isLocal && <span className="text-gray-500 font-normal ml-1">(You)</span>}
                                </span>
                                <span className="text-xs text-gray-500">Meeting host</span>
                            </div>
                        </div>
                        <div className="text-gray-500">
                            {p.isMuted ? (
                                <div className="p-2">
                                    <MicOff size={18} className="text-meet-red" />
                                </div>
                            ) : (
                                <div className="p-2 hover:bg-gray-200 rounded-full cursor-pointer transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                                    <Mic size={18} />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
