import React from 'react';
import {
    Mic, MicOff, Video, VideoOff, ScreenShare,
    MessageSquare, Users, Phone, MoreVertical, Hand, Info, Activity, Shield
} from 'lucide-react';

interface ControlsBarProps {
    isMuted: boolean;
    isVideoOff: boolean;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onToggleChat: () => void;
    onToggleParticipants: () => void;
    onLeave: () => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
    isMuted, isVideoOff, onToggleMic, onToggleCamera, onToggleChat, onToggleParticipants, onLeave
}) => {
    return (
        <div className="absolute bottom-0 left-0 w-full h-[88px] bg-meet-bg flex items-center justify-between px-6 z-50">
            {/* Left section - Time & Info */}
            <div className="flex-1 flex items-center gap-4 text-white font-medium text-[15px]">
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <div className="w-px h-4 bg-gray-500 mx-1"></div>
                <span>x5k-ky9-byz</span>
            </div>

            {/* Center section - Main Controls */}
            <div className="flex items-center justify-center gap-3">
                <button
                    onClick={onToggleMic}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-meet-red hover:bg-meet-redHover text-white' : 'bg-meet-surface hover:bg-meet-surfaceHover text-white'}`}
                >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>

                <button
                    onClick={onToggleCamera}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? 'bg-meet-red hover:bg-meet-redHover text-white' : 'bg-meet-surface hover:bg-meet-surfaceHover text-white'}`}
                >
                    {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                </button>

                <button className="w-14 h-14 rounded-full flex items-center justify-center bg-meet-surface hover:bg-meet-surfaceHover text-white transition-colors">
                    <Hand size={24} />
                </button>

                <button className="w-14 h-14 rounded-full flex items-center justify-center bg-meet-surface hover:bg-meet-surfaceHover text-white transition-colors">
                    <ScreenShare size={24} />
                </button>

                <button className="hidden sm:flex w-14 h-14 rounded-full items-center justify-center bg-meet-surface hover:bg-meet-surfaceHover text-white transition-colors">
                    <MoreVertical size={24} />
                </button>

                <button onClick={onLeave} className="w-16 h-10 px-6 rounded-full flex items-center justify-center bg-meet-red hover:bg-meet-redHover text-white transition-colors mx-2">
                    <Phone size={24} className="transform rotate-[135deg]" />
                </button>
            </div>

            {/* Right section - Sidebars & Options */}
            <div className="flex-1 flex justify-end items-center gap-1 text-white">
                <button className="p-3 rounded-full hover:bg-meet-surface transition-colors hidden md:block">
                    <Info size={24} />
                </button>
                <button
                    onClick={onToggleParticipants}
                    className="p-3 rounded-full hover:bg-meet-surface transition-colors"
                >
                    <Users size={24} />
                </button>
                <button
                    onClick={onToggleChat}
                    className="p-3 rounded-full hover:bg-meet-surface transition-colors"
                >
                    <MessageSquare size={24} />
                </button>
                <button className="p-3 rounded-full hover:bg-meet-surface transition-colors hidden lg:block">
                    <Activity size={24} />
                </button>
                <button className="p-3 rounded-full hover:bg-meet-surface transition-colors hidden lg:block">
                    <Shield size={24} />
                </button>
            </div>
        </div>
    );
};
