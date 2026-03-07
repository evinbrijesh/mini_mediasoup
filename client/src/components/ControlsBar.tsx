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
        <div className="controls-bar">
            {/* Left section - Time & Info */}
            <div className="controls-left">
                <span>{new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                <span className="controls-divider">|</span>
                <span>x5k-ky9-byz</span>
            </div>

            {/* Center section - Main Controls */}
            <div className="controls-center">
                <button
                    onClick={onToggleMic}
                    className={`ctrl-btn ${isMuted ? 'bg-red' : 'bg-gray'}`}
                >
                    {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                </button>

                <button
                    onClick={onToggleCamera}
                    className={`ctrl-btn ${isVideoOff ? 'bg-red' : 'bg-gray'}`}
                >
                    {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
                </button>

                <div className="vertical-separator"></div>

                <button className="ctrl-btn bg-gray">
                    <Hand size={22} />
                </button>

                <button className="ctrl-btn bg-gray hide-sm">
                    <ScreenShare size={22} />
                </button>

                <button className="ctrl-btn bg-gray hide-sm">
                    <MoreVertical size={22} />
                </button>

                <button onClick={onLeave} className="ctrl-btn bg-red ctrl-btn-leave">
                    <Phone size={24} />
                </button>
            </div>

            {/* Right section - Sidebars & Options */}
            <div className="controls-right">
                <button className="icon-btn-ghost-dark hide-md">
                    <Info size={22} />
                </button>
                <button
                    onClick={onToggleParticipants}
                    className="icon-btn-ghost-dark"
                >
                    <Users size={22} />
                </button>
                <button
                    onClick={onToggleChat}
                    className="icon-btn-ghost-dark"
                >
                    <MessageSquare size={22} />
                </button>
                <button className="icon-btn-ghost-dark hide-lg">
                    <Activity size={22} />
                </button>
                <button className="icon-btn-ghost-dark hide-lg">
                    <Shield size={22} />
                </button>
            </div>
        </div>
    );
};
