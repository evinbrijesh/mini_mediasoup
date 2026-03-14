import React, { useState, useEffect } from 'react';
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
    const { startLocalStream, startScreenShare, startTranscription, stopTranscription, toggleVideo, toggleAudio } = useLocalMedia();
    const { joinRoom, produce } = useMediasoup(socket);

    const [inMeeting, setInMeeting] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [user, setUser] = useState<any>(null);

    const [sidebar, setSidebar] = useState<'chat' | 'participants' | null>(null);

    const setLocalParticipant = useMeetingStore(state => state.setLocalParticipant);
    const updateParticipant = useMeetingStore(state => state.updateParticipant);

    useEffect(() => {
        if (!socket) return;

        socket.on('hand-raise-changed', ({ peerId, isHandRaised }) => {
            updateParticipant(peerId, { isHandRaised });
        });

        return () => {
            socket.off('hand-raise-changed');
        };
    }, [socket, updateParticipant]);

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

            // startTranscription(socket, 'local'); // Disabled AI feature

            setInMeeting(true);
        } catch (err: any) {
            console.error('Failed to join meeting:', err);
            alert(`Failed to join meeting: ${err.message || 'Unknown error'}`);
        }
    };

    const handleLeave = () => {
        stopTranscription();
        window.location.reload();
    };

    const handleToggleMic = () => {
        toggleAudio();
        setIsMuted(!isMuted);
    };

    const handleToggleCamera = () => {
        toggleVideo();
        setIsVideoOff(!isVideoOff);
    };

    const handleToggleHandRaise = () => {
        const newState = !isHandRaised;
        setIsHandRaised(newState);
        updateParticipant('local', { isHandRaised: newState });
        socket?.emit('toggle-hand-raise', { isHandRaised: newState });
    };

    const handleToggleScreenShare = async () => {
        try {
            if (!isScreenSharing) {
                const screenStream = await startScreenShare();
                const videoTrack = screenStream.getVideoTracks()[0];

                if (videoTrack) {
                    await produce(videoTrack, 'video', { sourceType: 'screen' });
                    updateParticipant('local', { screenStream });
                    setIsScreenSharing(true);

                    // Handle native stop sharing button on browser
                    videoTrack.onended = () => {
                        updateParticipant('local', { screenStream: undefined });
                        setIsScreenSharing(false);
                    };
                }
            } else {
                // To actually kill the stream, user just clicks stop on the browser UI
                // But we optionally handle clicking the button again
                alert('Click stop sharing on your browser popup.');
            }
        } catch (err) {
            console.error('Failed to share screen', err);
        }
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
                isHandRaised={isHandRaised}
                isScreenSharing={isScreenSharing}
                onToggleMic={handleToggleMic}
                onToggleCamera={handleToggleCamera}
                onToggleHandRaise={handleToggleHandRaise}
                onToggleScreenShare={handleToggleScreenShare}
                onToggleChat={() => setSidebar(sidebar === 'chat' ? null : 'chat')}
                onToggleParticipants={() => setSidebar(sidebar === 'participants' ? null : 'participants')}
                onLeave={handleLeave}
            />
        </div>
    );
};

export default App;
