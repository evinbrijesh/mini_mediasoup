import React, { useState, useEffect, useRef } from 'react';
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
    const { startLocalStream, startScreenShare, startTranscription, stopTranscription, toggleVideo, toggleAudio, stopAllTracks } = useLocalMedia();
    const { joinRoom, produce } = useMediasoup(socket);

    const [inMeeting, setInMeeting] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [roomId, setRoomId] = useState<string>('');

    const [sidebar, setSidebar] = useState<'chat' | 'participants' | null>(null);

    // BUG-041: Track the screen share producer so we can close it properly
    const screenProducerRef = useRef<any>(null);

    const setLocalParticipant = useMeetingStore(state => state.setLocalParticipant);
    const updateParticipant = useMeetingStore(state => state.updateParticipant);

    useEffect(() => {
        if (!socket) return;

        socket.on('hand-raise-changed', ({ peerId, isHandRaised }: { peerId: string; isHandRaised: boolean }) => {
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

    const handleLogin = async (email: string, pass: string): Promise<boolean> => {
        const res = await apiFetch('login', 'POST', { email, password: pass });
        if (res.token) {
            setUser(res.user);
            localStorage.setItem('token', res.token);
            return true;
        } else {
            alert(res.error || 'Login failed');
            return false;
        }
    };

    const handleSignup = async (email: string, name: string, pass: string): Promise<boolean> => {
        const res = await apiFetch('signup', 'POST', { email, name, password: pass });
        if (res.token) {
            setUser(res.user);
            localStorage.setItem('token', res.token);
            return true;
        } else {
            alert(res.error || 'Signup failed');
            return false;
        }
    };

    const handleJoin = async (joinRoomId: string, displayName: string) => {
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

            // BUG-054: Await joinRoom and let errors bubble up
            await joinRoom(joinRoomId, displayName);

            const videoTrack = localStream.getVideoTracks()[0];
            const audioTrack = localStream.getAudioTracks()[0];

            if (videoTrack) await produce(videoTrack, 'video');
            if (audioTrack) await produce(audioTrack, 'audio');

            // BUG-039: Guard against null socket before passing to startTranscription
            if (socket) {
                startTranscription(socket, 'local');
            }

            setRoomId(joinRoomId);
            setInMeeting(true);
        } catch (err) {
            console.error('Failed to join meeting:', err);
            alert('Failed to join meeting. Please check camera/mic permissions.');
        }
    };

    const handleLeave = () => {
        // BUG-042: Properly clean up before leaving instead of just reloading
        stopTranscription();
        stopAllTracks();

        // Close socket connection — server will clean up peer on disconnect
        if (socket) {
            socket.disconnect();
        }

        // Reset meeting state
        setInMeeting(false);
        setIsMuted(false);
        setIsVideoOff(false);
        setIsHandRaised(false);
        setIsScreenSharing(false);
        screenProducerRef.current = null;

        // Reload to fully reset mediasoup device and transport state
        window.location.reload();
    };

    const handleToggleMic = () => {
        // BUG-040: Only flip UI state if toggleAudio actually has a track to toggle
        toggleAudio();
        setIsMuted(prev => !prev);
    };

    const handleToggleCamera = () => {
        toggleVideo();
        setIsVideoOff(prev => !prev);
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
                    // BUG-041: Store the producer reference so we can close it
                    const producer = await produce(videoTrack, 'video', { sourceType: 'screen' });
                    screenProducerRef.current = producer;
                    updateParticipant('local', { screenStream });
                    setIsScreenSharing(true);

                    // Handle native stop sharing button on browser
                    videoTrack.onended = () => {
                        // BUG-041: Close the producer on the server when track ends
                        if (screenProducerRef.current) {
                            socket?.emit('close-producer', { producerId: screenProducerRef.current.id }, () => {});
                            screenProducerRef.current.close();
                            screenProducerRef.current = null;
                        }
                        updateParticipant('local', { screenStream: undefined });
                        setIsScreenSharing(false);
                    };
                }
            } else {
                // User clicked the button to stop sharing
                if (screenProducerRef.current) {
                    socket?.emit('close-producer', { producerId: screenProducerRef.current.id }, () => {});
                    screenProducerRef.current.close();
                    screenProducerRef.current = null;
                }
                updateParticipant('local', { screenStream: undefined });
                setIsScreenSharing(false);
            }
        } catch (err) {
            console.error('Failed to share screen', err);
        }
    };

    if (!inMeeting) {
        return (
            <LobbyPage
                onJoin={handleJoin}
                onLogin={handleLogin}
                onSignup={handleSignup}
                user={user}
                roomId={roomId}
            />
        );
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
                roomId={roomId}
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
