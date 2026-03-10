import React, { useState, useEffect } from 'react';
import {
    Mic, MicOff, Video, VideoOff, ScreenShare,
    MessageSquare, Users, Phone, MoreVertical, Hand, Info, Activity, Shield
} from 'lucide-react';

interface ControlsBarProps {
    roomId: string;
    isMuted: boolean;
    isVideoOff: boolean;
    isHandRaised?: boolean;
    isScreenSharing?: boolean;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onToggleHandRaise?: () => void;
    onToggleScreenShare?: () => void;
    onToggleChat: () => void;
    onToggleParticipants: () => void;
    onLeave: () => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
    roomId, isMuted, isVideoOff, isHandRaised, isScreenSharing,
    onToggleMic, onToggleCamera, onToggleHandRaise, onToggleScreenShare,
    onToggleChat, onToggleParticipants, onLeave
}) => {
    // BUG-045: Live clock — update every second instead of freezing at mount time
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="controls-bar">
            {/* Left section - Time & Room Code */}
            <div className="controls-left">
                <span>{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                <span className="controls-divider">|</span>
                {/* BUG-044: Show actual roomId instead of hardcoded placeholder */}
                <span>{roomId}</span>
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

                <button
                    onClick={onToggleHandRaise}
                    className={`ctrl-btn ${isHandRaised ? 'bg-blue' : 'bg-gray'}`}
                >
                    <Hand size={22} />
                </button>

                <button
                    onClick={onToggleScreenShare}
                    className={`ctrl-btn hide-sm ${isScreenSharing ? 'bg-blue' : 'bg-gray'}`}
                >
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
