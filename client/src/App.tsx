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
import { UtilitySidebar } from './components/UtilitySidebar';

type LayoutMode = 'grid' | 'spotlight' | 'sidebar';
type PolicyPreset = 'open' | 'controlled' | 'strict';

const App: React.FC = () => {
    const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('token'));
    const { socket, isConnected } = useSocket(authToken);
    const { startLocalStream, startScreenShare, startTranscription, stopTranscription, stopLocalStream, toggleVideo, toggleAudio, setAudioEnabled, adoptLocalStream } = useLocalMedia();
    const { joinRoom, produce, leaveRoom } = useMediasoup(socket);

    const [inMeeting, setInMeeting] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [user, setUser] = useState<any>(null);

    const [sidebar, setSidebar] = useState<'chat' | 'participants' | 'info' | 'activity' | 'safety' | 'more' | null>(null);
    const [joinError, setJoinError] = useState<string | null>(null);
    const [isJoining, setIsJoining] = useState(false);
    const [selfPeerId, setSelfPeerId] = useState<string | null>(null);
    const [isRoomLocked, setIsRoomLocked] = useState(false);
    const [policyPreset, setPolicyPreset] = useState<PolicyPreset>('open');
    const [waitingStatus, setWaitingStatus] = useState<'none' | 'pending' | 'denied'>('none');
    const [waitingQueue, setWaitingQueue] = useState<Array<{ peerId: string; displayName: string; requestedAt: number }>>([]);
    const [policyTemplates, setPolicyTemplates] = useState<Array<{ id: string; name: string; preset: PolicyPreset; isLocked: boolean; waitingRoomEnabled: boolean }>>([]);
    const [policyAudits, setPolicyAudits] = useState<Array<{ id: string; action: string; createdAt: string; details: any }>>([]);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [latestSessionSummary, setLatestSessionSummary] = useState<{ id: string; started_at: string; ended_at?: string | null; participants?: any[]; events?: any[] } | null>(null);
    const [activeSessions, setActiveSessions] = useState<Array<{ id: string; room_id: string; started_at: string }>>([]);
    const pendingJoinRef = useRef<{ roomId: string; displayName: string; localStream: MediaStream; muted: boolean; videoOff: boolean } | null>(null);

    const setLocalParticipant = useMeetingStore(state => state.setLocalParticipant);
    const updateParticipant = useMeetingStore(state => state.updateParticipant);
    const setRoomId = useMeetingStore(state => state.setRoomId);
    const localParticipant = useMeetingStore(state => state.localParticipant);
    const layoutMode = useMeetingStore(state => state.layoutMode);
    const setLayoutMode = useMeetingStore(state => state.setLayoutMode);
    const setPinnedTileId = useMeetingStore(state => state.setPinnedTileId);
    const roomId = useMeetingStore(state => state.roomId);
    const [screenProducer, setScreenProducer] = useState<{ close: () => void } | null>(null);

    useEffect(() => {
        if (!socket) return;

        socket.on('hand-raise-changed', ({ peerId, isHandRaised }) => {
            updateParticipant(peerId, { isHandRaised });
        });

        return () => {
            socket.off('hand-raise-changed');
        };
    }, [socket, updateParticipant]);

    useEffect(() => {
        if (!socket || !selfPeerId) return;

        const onHostChanged = ({ hostPeerId }: { hostPeerId: string }) => {
            updateParticipant('local', { isHost: hostPeerId === selfPeerId });
        };

        socket.on('host-changed', onHostChanged);
        return () => {
            socket.off('host-changed', onHostChanged);
        };
    }, [socket, selfPeerId, updateParticipant]);

    useEffect(() => {
        if (!socket || !selfPeerId) return;

        const onRoleChanged = ({ peerId, isHost, isCoHost }: { peerId: string; isHost?: boolean; isCoHost?: boolean }) => {
            if (peerId !== selfPeerId) return;
            updateParticipant('local', {
                ...(typeof isHost === 'boolean' ? { isHost } : {}),
                ...(typeof isCoHost === 'boolean' ? { isCoHost } : {}),
            });
        };

        socket.on('peer-role-changed', onRoleChanged);
        return () => {
            socket.off('peer-role-changed', onRoleChanged);
        };
    }, [socket, selfPeerId, updateParticipant]);

    useEffect(() => {
        if (!socket) return;
        const onRoomLockChanged = ({ locked }: { locked: boolean }) => setIsRoomLocked(Boolean(locked));
        socket.on('room-lock-changed', onRoomLockChanged);
        return () => {
            socket.off('room-lock-changed', onRoomLockChanged);
        };
    }, [socket]);

    useEffect(() => {
        if (!socket) return;

        const onPolicyUpdated = ({ preset, isLocked, waitingRoomEnabled }: { preset: PolicyPreset | null; isLocked: boolean; waitingRoomEnabled: boolean }) => {
            if (preset) setPolicyPreset(preset);
            setIsRoomLocked(Boolean(isLocked));
            if (!waitingRoomEnabled) {
                setWaitingQueue([]);
            }
        };

        const onWaitingUpdated = ({ queue }: { queue: Array<{ peerId: string; displayName: string; requestedAt: number }> }) => {
            setWaitingQueue(queue);
        };

        const onWaitingResponse = async ({ allowed }: { allowed: boolean }) => {
            if (!allowed) {
                setWaitingStatus('denied');
                pendingJoinRef.current = null;
                return;
            }

            const pending = pendingJoinRef.current;
            if (!pending) return;

            const joinMeta = await joinRoom(pending.roomId, pending.displayName);
            if (joinMeta?.waiting) {
                setWaitingStatus('pending');
                return;
            }

            if (joinMeta?.selfPeerId) {
                setSelfPeerId(joinMeta.selfPeerId);
            }
            const isHost = Boolean(joinMeta?.hostPeerId && joinMeta?.selfPeerId === joinMeta.hostPeerId);

            setLocalParticipant({
                id: 'local',
                displayName: pending.displayName,
                isLocal: true,
                videoStream: pending.localStream,
                audioStream: pending.localStream,
                isMuted: pending.muted,
                isVideoOff: pending.videoOff,
                isCoHost: false,
                isHost,
            });

            const videoTrack = pending.localStream.getVideoTracks()[0];
            const audioTrack = pending.localStream.getAudioTracks()[0];
            if (videoTrack) await produce(videoTrack, 'video');
            if (audioTrack) await produce(audioTrack, 'audio');
            socket.emit('set-media-state', { isMuted: pending.muted, isVideoOff: pending.videoOff });

            pendingJoinRef.current = null;
            setWaitingStatus('none');
            setInMeeting(true);
        };

        socket.on('room-policy-updated', onPolicyUpdated);
        socket.on('waiting-room-updated', onWaitingUpdated);
        socket.on('waiting-room-response', onWaitingResponse);

        return () => {
            socket.off('room-policy-updated', onPolicyUpdated);
            socket.off('waiting-room-updated', onWaitingUpdated);
            socket.off('waiting-room-response', onWaitingResponse);
        };
    }, [socket, joinRoom, produce, setLocalParticipant]);

    useEffect(() => {
        if (!socket) return;

        const handleForcedMute = () => {
            setAudioEnabled(false);
            setIsMuted(true);
            updateParticipant('local', { isMuted: true });
            socket.emit('set-media-state', { isMuted: true });
            alert('Host muted your microphone');
        };

        const handleRemoved = () => {
            alert('You were removed from the meeting by the host');
            handleLeave();
        };

        socket.on('moderation-force-mute', handleForcedMute);
        socket.on('moderation-removed', handleRemoved);

        return () => {
            socket.off('moderation-force-mute', handleForcedMute);
            socket.off('moderation-removed', handleRemoved);
        };
    }, [socket, setAudioEnabled, updateParticipant]);

    useEffect(() => {
        if (isConnected && joinError === 'Still connecting to server. Please wait a moment and try again.') {
            setJoinError(null);
        }
    }, [isConnected, joinError]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token && token !== authToken) {
            setAuthToken(token);
        }
    }, [authToken]);

    useEffect(() => {
        if (sidebar !== 'safety') return;
        void refreshPolicyData();
        void refreshSessionData();
    }, [sidebar, roomId]);

    const apiFetch = async (endpoint: string, method: string, body: any) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body)
        });
        return res.json();
    };

    const policyFetch = async (endpoint: string, method = 'GET', body?: any) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/policies/${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (res.status === 204) return null;
        return res.json();
    };

    const refreshPolicyData = async () => {
        if (!roomId || !localStorage.getItem('token')) return;
        const [templateRes, auditRes] = await Promise.all([
            policyFetch('templates'),
            policyFetch(`rooms/${roomId}/audits?limit=20`),
        ]);
        setPolicyTemplates(templateRes?.templates || []);
        setPolicyAudits(auditRes?.audits || []);
    };

    const refreshSessionData = async () => {
        if (!roomId || !localStorage.getItem('token')) return;
        const [activeRes, latestRes] = await Promise.all([
            fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/sessions/active`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            }).then((r) => r.json()),
            fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/sessions/rooms/${roomId}/latest`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            }).then((r) => r.json()).catch(() => null),
        ]);

        setActiveSessions(activeRes?.sessions || []);
        setLatestSessionSummary(latestRes?.session || null);
    };

    const handleLogin = async (email: string, pass: string): Promise<boolean> => {
        const res = await apiFetch('login', 'POST', { email, password: pass });
        if (res.token) {
            setUser(res.user);
            localStorage.setItem('token', res.token);
            setAuthToken(res.token);
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
            setAuthToken(res.token);
            return true;
        } else {
            alert(res.error || 'Signup failed');
            return false;
        }
    };

    const handleJoin = async (roomId: string, displayName: string, previewStream: MediaStream | null) => {
        if (!socket || !isConnected) {
            setJoinError('Still connecting to server. Please wait a moment and try again.');
            return;
        }

        try {
            setJoinError(null);
            setIsJoining(true);

            const localStream = previewStream ?? await startLocalStream();
            if (previewStream) {
                adoptLocalStream(previewStream);
            }
            setRoomId(roomId);

            const initialVideoTrack = localStream.getVideoTracks()[0];
            const initialAudioTrack = localStream.getAudioTracks()[0];
            const videoOff = !initialVideoTrack || !initialVideoTrack.enabled || initialVideoTrack.readyState !== 'live';
            const muted = !initialAudioTrack || !initialAudioTrack.enabled || initialAudioTrack.readyState !== 'live';

            setIsMuted(muted);
            setIsVideoOff(videoOff);

            const joinMeta = await joinRoom(roomId, displayName);
            if (joinMeta?.waiting) {
                pendingJoinRef.current = { roomId, displayName, localStream, muted, videoOff };
                setWaitingStatus('pending');
                return;
            }

            if (joinMeta?.selfPeerId) {
                setSelfPeerId(joinMeta.selfPeerId);
            }
            const isHost = Boolean(joinMeta?.hostPeerId && joinMeta?.selfPeerId === joinMeta.hostPeerId);

            setLocalParticipant({
                id: 'local',
                displayName,
                isLocal: true,
                videoStream: localStream,
                audioStream: localStream,
                isMuted: muted,
                isVideoOff: videoOff,
                isCoHost: false,
                isHost,
            });

            const videoTrack = localStream.getVideoTracks()[0];
            const audioTrack = localStream.getAudioTracks()[0];

            if (videoTrack) await produce(videoTrack, 'video');
            if (audioTrack) await produce(audioTrack, 'audio');
            socket.emit('set-media-state', { isMuted: muted, isVideoOff: videoOff });

            // startTranscription(socket, 'local'); // Disabled AI feature

            setWaitingStatus('none');
            setInMeeting(true);
        } catch (err: any) {
            console.error('Failed to join meeting:', err);
            setJoinError(err.message || 'Unknown error');
            alert(`Failed to join meeting: ${err.message || 'Unknown error'}`);
        } finally {
            setIsJoining(false);
        }
    };

    const handleLeave = () => {
        stopTranscription();
        leaveRoom();
        stopLocalStream();
        screenProducer?.close();
        setScreenProducer(null);
        setInMeeting(false);
        setIsMuted(false);
        setIsVideoOff(false);
        setIsHandRaised(false);
        setIsScreenSharing(false);
        setSelfPeerId(null);
        setIsRoomLocked(false);
        setPolicyPreset('open');
        setWaitingStatus('none');
        setWaitingQueue([]);
        pendingJoinRef.current = null;
        setSidebar(null);
        setJoinError(null);
    };

    const handleToggleMic = () => {
        toggleAudio();
        const next = !isMuted;
        setIsMuted(next);
        updateParticipant('local', { isMuted: next });
        socket?.emit('set-media-state', { isMuted: next });
    };

    const handleToggleCamera = () => {
        toggleVideo();
        const next = !isVideoOff;
        setIsVideoOff(next);
        updateParticipant('local', { isVideoOff: next });
        socket?.emit('set-media-state', { isVideoOff: next });
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
                    screenProducer?.close();
                    const producedScreenProducer = await produce(videoTrack, 'video', { sourceType: 'screen' });
                    if (producedScreenProducer) {
                        setScreenProducer(producedScreenProducer as { close: () => void });
                    }
                    updateParticipant('local', { screenStream });
                    setIsScreenSharing(true);

                    // Handle native stop sharing button on browser
                    videoTrack.onended = () => {
                        (producedScreenProducer as { close: () => void } | undefined)?.close?.();
                        setScreenProducer(null);
                        screenStream.getTracks().forEach(track => track.stop());
                        updateParticipant('local', { screenStream: undefined });
                        setIsScreenSharing(false);
                    };
                }
            } else {
                screenProducer?.close();
                setScreenProducer(null);
                localParticipant?.screenStream?.getTracks().forEach((track) => track.stop());
                updateParticipant('local', { screenStream: undefined });
                setIsScreenSharing(false);
            }
        } catch (err) {
            console.error('Failed to share screen', err);
        }
    };

    if (!inMeeting) {
        return <LobbyPage onJoin={handleJoin} onLogin={handleLogin} onSignup={handleSignup} user={user} canJoin={isConnected} joining={isJoining} joinError={joinError} waitingStatus={waitingStatus} />;
    }

    const cycleLayout = () => {
        const next: LayoutMode = layoutMode === 'grid' ? 'spotlight' : layoutMode === 'spotlight' ? 'sidebar' : 'grid';
        setLayoutMode(next);
        if (next !== 'grid' && !useMeetingStore.getState().pinnedTileId) {
            const localId = useMeetingStore.getState().localParticipant?.id;
            if (localId) setPinnedTileId(localId);
        }
    };

    const copyInvite = async () => {
        const link = `${window.location.origin}?room=${roomId || ''}`;
        await navigator.clipboard.writeText(link);
        alert('Invite link copied');
    };

    const toggleRoomLock = () => {
        socket?.emit('moderation:toggle-room-lock', { locked: !isRoomLocked });
    };

    const applyPolicyPreset = (preset: PolicyPreset) => {
        socket?.emit('moderation:set-policy-preset', { preset });
    };

    const toggleWaitingRoom = () => {
        const enabled = policyPreset === 'open';
        socket?.emit('moderation:toggle-waiting-room', { enabled });
        if (enabled) setPolicyPreset('controlled');
        if (!enabled) setPolicyPreset('open');
    };

    const handleWaitingDecision = (peerId: string, allow: boolean) => {
        socket?.emit('waiting-room:respond', { targetPeerId: peerId, allow });
    };

    const saveCurrentPolicyAsTemplate = async () => {
        if (!newTemplateName.trim()) return;
        await policyFetch('templates', 'POST', {
            name: newTemplateName.trim(),
            preset: policyPreset,
            isLocked: isRoomLocked,
            waitingRoomEnabled: policyPreset !== 'open',
        });
        setNewTemplateName('');
        await refreshPolicyData();
    };

    const applyTemplateToRoom = async (templateId: string) => {
        if (!roomId) return;
        const res = await policyFetch(`rooms/${roomId}/apply-template`, 'POST', { templateId });
        if (res?.policy) {
            const policy = res.policy;
            socket?.emit('moderation:set-policy-preset', { preset: policy.preset });
        }
        await refreshPolicyData();
    };

    const deleteTemplate = async (templateId: string) => {
        await policyFetch(`templates/${templateId}`, 'DELETE');
        await refreshPolicyData();
    };

    const canModerate = Boolean(localParticipant?.isHost || localParticipant?.isCoHost);

    return (
        <div className="app-container">
            <div className="main-content">
                <div className="video-area">
                    <VideoGrid />
                    <CaptionOverlay socket={socket} />
                </div>

                {sidebar === 'chat' && <ChatSidebar socket={socket} onClose={() => setSidebar(null)} />}
                {sidebar === 'participants' && <ParticipantsList socket={socket} onClose={() => setSidebar(null)} />}
                {sidebar === 'info' && (
                    <UtilitySidebar title="Meeting info" onClose={() => setSidebar(null)}>
                        <p>Room ID: <strong>{roomId || '—'}</strong></p>
                        <button className="participant-action-btn mt-3" onClick={copyInvite}>Copy invite link</button>
                    </UtilitySidebar>
                )}
                {sidebar === 'activity' && (
                    <UtilitySidebar title="Activity" onClose={() => setSidebar(null)}>
                        <p>Active speaker highlighting is enabled.</p>
                        <p className="mt-2">Hand raise and chat activity appear in real-time.</p>
                    </UtilitySidebar>
                )}
                {sidebar === 'safety' && (
                    <UtilitySidebar title="Safety" onClose={() => setSidebar(null)}>
                        <p>Room lock: <strong>{isRoomLocked ? 'Locked' : 'Unlocked'}</strong></p>
                        <button className="participant-action-btn mt-3" onClick={toggleRoomLock} disabled={!canModerate}>
                            {isRoomLocked ? 'Unlock room' : 'Lock room'}
                        </button>
                        <p className="mt-3">Policy preset: <strong>{policyPreset}</strong></p>
                        <div className="participant-actions mt-2">
                            <button className="participant-action-btn" onClick={() => applyPolicyPreset('open')} disabled={!canModerate}>Open</button>
                            <button className="participant-action-btn" onClick={() => applyPolicyPreset('controlled')} disabled={!canModerate}>Controlled</button>
                            <button className="participant-action-btn" onClick={() => applyPolicyPreset('strict')} disabled={!canModerate}>Strict</button>
                        </div>
                        <button className="participant-action-btn mt-3" onClick={toggleWaitingRoom} disabled={!canModerate}>
                            {policyPreset === 'open' ? 'Enable waiting room' : 'Disable waiting room'}
                        </button>
                        {waitingQueue.length > 0 && (
                            <div className="mt-3">
                                <p>Waiting room requests ({waitingQueue.length})</p>
                                {waitingQueue.map((req) => (
                                    <div key={req.peerId} className="participant-actions mt-2">
                                        <span>{req.displayName}</span>
                                        <button className="participant-action-btn" onClick={() => handleWaitingDecision(req.peerId, true)} disabled={!canModerate}>Admit</button>
                                        <button className="participant-action-btn danger" onClick={() => handleWaitingDecision(req.peerId, false)} disabled={!canModerate}>Deny</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {localStorage.getItem('token') && (
                            <>
                                <div className="mt-3">
                                    <p>Policy templates</p>
                                    <div className="participant-actions mt-2">
                                        <input
                                            className="chat-input"
                                            placeholder="Template name"
                                            value={newTemplateName}
                                            onChange={(e) => setNewTemplateName(e.target.value)}
                                        />
                                        <button className="participant-action-btn" onClick={saveCurrentPolicyAsTemplate}>Save</button>
                                    </div>
                                    {policyTemplates.map((template) => (
                                        <div key={template.id} className="participant-actions mt-2">
                                            <span>{template.name}</span>
                                            <button className="participant-action-btn" onClick={() => applyTemplateToRoom(template.id)} disabled={!canModerate}>Apply</button>
                                            <button className="participant-action-btn danger" onClick={() => deleteTemplate(template.id)}>Delete</button>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-3">
                                    <p>Policy audit log</p>
                                    {policyAudits.length === 0 && <p className="mt-2">No audit entries yet.</p>}
                                    {policyAudits.map((entry) => (
                                        <div key={entry.id} className="mt-2">
                                            <div><strong>{entry.action}</strong></div>
                                            <div className="text-xs text-meet-gray-muted">{new Date(entry.createdAt).toLocaleString()}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-3">
                                    <p>Session history</p>
                                    {latestSessionSummary ? (
                                        <>
                                            <div className="mt-2">Latest session: <strong>{latestSessionSummary.id}</strong></div>
                                            <div className="text-xs text-meet-gray-muted">
                                                Started: {new Date(latestSessionSummary.started_at).toLocaleString()}
                                            </div>
                                            <div className="text-xs text-meet-gray-muted">
                                                Participants: {latestSessionSummary.participants?.length || 0}
                                            </div>
                                            <div className="text-xs text-meet-gray-muted">
                                                Events: {latestSessionSummary.events?.length || 0}
                                            </div>
                                        </>
                                    ) : (
                                        <p className="mt-2">No session history yet.</p>
                                    )}

                                    <div className="mt-2 text-xs text-meet-gray-muted">
                                        Active sessions tracked: {activeSessions.length}
                                    </div>
                                </div>
                            </>
                        )}
                        {!canModerate && <p className="mt-2">Only host/co-host can change lock state.</p>}
                    </UtilitySidebar>
                )}
                {sidebar === 'more' && (
                    <UtilitySidebar title="More options" onClose={() => setSidebar(null)}>
                        <button className="participant-action-btn" onClick={cycleLayout}>Cycle layout ({layoutMode})</button>
                        <button className="participant-action-btn mt-3" onClick={copyInvite}>Copy invite link</button>
                    </UtilitySidebar>
                )}
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
                onCycleLayout={cycleLayout}
                layoutMode={layoutMode}
                onToggleInfo={() => setSidebar(sidebar === 'info' ? null : 'info')}
                onToggleActivity={() => setSidebar(sidebar === 'activity' ? null : 'activity')}
                onToggleSafety={() => setSidebar(sidebar === 'safety' ? null : 'safety')}
                onToggleMore={() => setSidebar(sidebar === 'more' ? null : 'more')}
                isInfoOpen={sidebar === 'info'}
                isActivityOpen={sidebar === 'activity'}
                isSafetyOpen={sidebar === 'safety'}
                isMoreOpen={sidebar === 'more'}
                onToggleChat={() => setSidebar(sidebar === 'chat' ? null : 'chat')}
                onToggleParticipants={() => setSidebar(sidebar === 'participants' ? null : 'participants')}
                onLeave={handleLeave}
            />
        </div>
    );
};

export default App;
