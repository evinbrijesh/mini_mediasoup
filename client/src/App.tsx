import React, { useState } from 'react';
import { useSocket } from './hooks/useSocket';
import { useLocalMedia } from './hooks/useLocalMedia';
import { useMediasoup } from './hooks/useMediasoup';
import { useMeetingStore } from './store/meetingStore';
import { LobbyPage } from './components/LobbyPage';
import { VideoGrid } from './components/VideoGrid';
import { ControlsBar } from './components/ControlsBar';
import { ChatSidebar } from './components/ChatSidebar';
import { ParticipantsList } from './components/ParticipantsList';
import { CaptionOverlay } from './components/CaptionOverlay';

const App: React.FC = () => {
    const socket = useSocket();
    const { startLocalStream, toggleVideo, toggleAudio } = useLocalMedia();
    const { joinRoom, produce } = useMediasoup(socket);

    const [inMeeting, setInMeeting] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [user, setUser] = useState<any>(null);

    const [sidebar, setSidebar] = useState<'chat' | 'participants' | null>(null);

    const setLocalParticipant = useMeetingStore(state => state.setLocalParticipant);

    const apiFetch = async (endpoint: string, method: string, body: any) => {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/${endpoint}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return res.json();
    };

    const handleLogin = async (email: string, pass: string) => {
        const res = await apiFetch('login', 'POST', { email, password: pass });
        if (res.token) {
            setUser(res.user);
            localStorage.setItem('token', res.token);
        } else {
            alert(res.error || 'Login failed');
        }
    };

    const handleSignup = async (email: string, name: string, pass: string) => {
        const res = await apiFetch('signup', 'POST', { email, name, password: pass });
        if (res.token) {
            setUser(res.user);
            localStorage.setItem('token', res.token);
        } else {
            alert(res.error || 'Signup failed');
        }
    };

    const handleJoin = async (roomId: string, displayName: string) => {
        try {
            const localStream = await startLocalStream();

            setLocalParticipant({
                id: 'local',
                displayName,
                isLocal: true,
                videoStream: localStream,
                audioStream: localStream,
                isMuted: false,
                isVideoOff: false
            });

            await joinRoom(roomId, displayName);

            const videoTrack = localStream.getVideoTracks()[0];
            const audioTrack = localStream.getAudioTracks()[0];

            if (videoTrack) await produce(videoTrack, 'video');
            if (audioTrack) await produce(audioTrack, 'audio');

            setInMeeting(true);
        } catch (err) {
            alert('Failed to join meeting. Please check camera/mic permissions.');
        }
    };

    const handleToggleMic = () => {
        toggleAudio();
        setIsMuted(!isMuted);
    };

    const handleToggleCamera = () => {
        toggleVideo();
        setIsVideoOff(!isVideoOff);
    };

    if (!inMeeting) {
        return <LobbyPage onJoin={handleJoin} onLogin={handleLogin} onSignup={handleSignup} user={user} />;
    }

    return (
        <div className="app-container">
            <div className="main-content">
                <div className="video-area">
                    <VideoGrid />
                    <CaptionOverlay socket={socket} />
                </div>

                {sidebar === 'chat' && <ChatSidebar socket={socket} onClose={() => setSidebar(null)} />}
                {sidebar === 'participants' && <ParticipantsList onClose={() => setSidebar(null)} />}
            </div>

            <ControlsBar
                isMuted={isMuted}
                isVideoOff={isVideoOff}
                onToggleMic={handleToggleMic}
                onToggleCamera={handleToggleCamera}
                onToggleChat={() => setSidebar(sidebar === 'chat' ? null : 'chat')}
                onToggleParticipants={() => setSidebar(sidebar === 'participants' ? null : 'participants')}
                onLeave={() => window.location.reload()}
            />
        </div>
    );
};

export default App;
