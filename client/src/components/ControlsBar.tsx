import React from 'react';
import {
    Mic, MicOff, Video, VideoOff, ScreenShare,
    MessageSquare, Users, Phone, MoreVertical, Hand, Info, Activity, Shield, LayoutGrid
} from 'lucide-react';

type LayoutMode = 'grid' | 'spotlight' | 'sidebar';

interface ControlsBarProps {
    roomId?: string | null;
    isMuted: boolean;
    isVideoOff: boolean;
    isHandRaised?: boolean;
    isScreenSharing?: boolean;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onToggleHandRaise?: () => void;
    onToggleScreenShare?: () => void;
    onCycleLayout?: () => void;
    layoutMode?: LayoutMode;
    onToggleInfo?: () => void;
    onToggleActivity?: () => void;
    onToggleSafety?: () => void;
    onToggleMore?: () => void;
    isInfoOpen?: boolean;
    isActivityOpen?: boolean;
    isSafetyOpen?: boolean;
    isMoreOpen?: boolean;
    onToggleChat: () => void;
    onToggleParticipants: () => void;
    onLeave: () => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
    roomId,
    isMuted, isVideoOff, isHandRaised, isScreenSharing,
    onToggleMic, onToggleCamera, onToggleHandRaise, onToggleScreenShare,
    onCycleLayout, layoutMode,
    onToggleInfo, onToggleActivity, onToggleSafety, onToggleMore,
    isInfoOpen, isActivityOpen, isSafetyOpen, isMoreOpen,
    onToggleChat, onToggleParticipants, onLeave
}) => {
    return (
        <div className="controls-bar">
            {/* Left section - Time & Info */}
            <div className="controls-left">
                <span>{new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                <span className="controls-divider">|</span>
                <span>{roomId || '—'}</span>
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

                <button onClick={onToggleMore} className={`ctrl-btn hide-sm ${isMoreOpen ? 'bg-blue' : 'bg-gray'}`}>
                    <MoreVertical size={22} />
                </button>

                <button
                    onClick={onCycleLayout}
                    className="ctrl-btn bg-gray hide-sm"
                    title={`Layout: ${layoutMode || 'grid'}`}
                >
                    <LayoutGrid size={22} />
                </button>

                <button onClick={onLeave} className="ctrl-btn bg-red ctrl-btn-leave">
                    <Phone size={24} />
                </button>
            </div>

            {/* Right section - Sidebars & Options */}
            <div className="controls-right">
                <button onClick={onToggleInfo} className={`icon-btn-ghost-dark hide-md ${isInfoOpen ? 'active' : ''}`}>
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
                <button onClick={onToggleActivity} className={`icon-btn-ghost-dark hide-lg ${isActivityOpen ? 'active' : ''}`}>
                    <Activity size={22} />
                </button>
                <button onClick={onToggleSafety} className={`icon-btn-ghost-dark hide-lg ${isSafetyOpen ? 'active' : ''}`}>
                    <Shield size={22} />
                </button>
            </div>
        </div>
    );
};
