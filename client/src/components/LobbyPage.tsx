import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Video, Keyboard, Settings, HelpCircle, MessageSquare, Mic, MicOff, VideoOff, MoreVertical, Volume2 } from 'lucide-react';
import { useLobbyMedia } from '../hooks/useLobbyMedia';

interface AuthFormProps {
    title: string;
    buttonText: string;
    isLogin: boolean;
    email: string;
    password: string;
    name: string;
    setEmail: (value: string) => void;
    setPassword: (value: string) => void;
    setName: (value: string) => void;
    isSubmittingAuth: boolean;
    setIsSubmittingAuth: (value: boolean) => void;
    onSubmit: () => Promise<void>;
    onToggleMode: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({
    title,
    buttonText,
    isLogin,
    email,
    password,
    name,
    setEmail,
    setPassword,
    setName,
    isSubmittingAuth,
    setIsSubmittingAuth,
    onSubmit,
    onToggleMode,
}) => (
    <div className="auth-card">
        <h2 className="auth-title">
            {title}
        </h2>
        <form className="auth-form" onSubmit={async (e) => {
            e.preventDefault();
            if (isSubmittingAuth) return;
            setIsSubmittingAuth(true);
            try {
                await onSubmit();
            } finally {
                setIsSubmittingAuth(false);
            }
        }}>
            {!isLogin && (
                <input type="text" placeholder="Full Name" className="input-field" value={name} onChange={e => setName(e.target.value)} required />
            )}
            <input type="email" placeholder="Email Address" className="input-field" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password (min 8 chars)" className="input-field" value={password} minLength={8} onChange={e => setPassword(e.target.value)} required />

            <button type="submit" className="btn-primary" disabled={isSubmittingAuth}>
                {isSubmittingAuth ? 'Please wait...' : buttonText}
            </button>
        </form>
        <p className="auth-footer">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={onToggleMode} className="text-link">
                {isLogin ? 'Create account' : 'Sign in'}
            </button>
        </p>
    </div>
);

interface LobbyPageProps {
    onJoin: (roomId: string, displayName: string, previewStream: MediaStream | null) => void;
    onLogin: (email: string, pass: string) => Promise<boolean>;
    onSignup: (email: string, name: string, pass: string) => Promise<boolean>;
    user: any;
    canJoin: boolean;
    joining: boolean;
    joinError?: string | null;
    waitingStatus?: 'none' | 'pending' | 'denied';
}

const DeviceBadge: React.FC<{ label: string; status: 'ready' | 'off' | 'blocked' | 'unavailable' }> = ({ label, status }) => {
    const text = useMemo(() => {
        if (status === 'ready') return 'ready';
        if (status === 'off') return 'off';
        if (status === 'blocked') return 'blocked';
        return 'unavailable';
    }, [status]);

    return <span className={`device-badge ${status}`}>{label}: {text}</span>;
};

export const LobbyPage: React.FC<LobbyPageProps> = ({ onJoin, onLogin, onSignup, user, canJoin, joining, joinError, waitingStatus = 'none' }) => {
    const [roomId, setRoomId] = useState('');
    const [displayName, setDisplayName] = useState(user?.name || '');
    const [mode, setMode] = useState<'join' | 'login' | 'signup'>('join');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const {
        previewStream,
        micEnabled,
        camEnabled,
        micLevel,
        cameraStatus,
        microphoneStatus,
        videoInputs,
        audioInputs,
        audioOutputs,
        selectedVideoInputId,
        selectedAudioInputId,
        selectedAudioOutputId,
        isTestingSpeaker,
        speakerOutputSupported,
        initPreview,
        toggleMic,
        toggleCam,
        selectVideoInput,
        selectAudioInput,
        selectAudioOutput,
        playSpeakerTestTone,
    } = useLobbyMedia();

    useEffect(() => {
        void initPreview();
    }, [initPreview]);

    useEffect(() => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = previewStream;
    }, [previewStream, camEnabled]);

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (roomId && (displayName || user)) {
            onJoin(roomId, displayName || user.name, previewStream);
        }
    };

    const generateRoomId = () => {
        const part = () => Math.random().toString(36).substring(2, 5);
        setRoomId(`${part()}-${part()}-${part()}`);
    };

    if (mode === 'login' || mode === 'signup') {
        return (
            <div className="auth-container">
                <div className="logo-absolute">
                    <Video className="logo-icon" />
                    <span>StreamConnect</span>
                </div>

                {mode === 'login'
                    ? <AuthForm title="Welcome Back" buttonText="Sign In" isLogin={true} onSubmit={async () => {
                        const ok = await onLogin(email, password);
                        if (ok) setMode('join');
                    }} onToggleMode={() => setMode('signup')} email={email} password={password} name={name} setEmail={setEmail} setPassword={setPassword} setName={setName} isSubmittingAuth={isSubmittingAuth} setIsSubmittingAuth={setIsSubmittingAuth} />
                    : <AuthForm title="Create Account" buttonText="Get Started" isLogin={false} onSubmit={async () => {
                        const ok = await onSignup(email, name, password);
                        if (ok) setMode('join');
                    }} onToggleMode={() => setMode('login')} email={email} password={password} name={name} setEmail={setEmail} setPassword={setPassword} setName={setName} isSubmittingAuth={isSubmittingAuth} setIsSubmittingAuth={setIsSubmittingAuth} />
                }
            </div>
        );
    }

    return (
        <div className="lobby-container">
            {/* Header */}
            <header className="lobby-header">
                <div className="header-logo">
                    <Video className="logo-icon" />
                    <span>StreamConnect</span>
                </div>
                <div className="header-right">
                    <div className="header-time">
                        <span>{new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span>{new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </div>

                    <div className="header-actions">
                        <button className="icon-btn-ghost"><HelpCircle size={24} strokeWidth={1.5} /></button>
                        <button className="icon-btn-ghost"><MessageSquare size={24} strokeWidth={1.5} /></button>
                        <button className="icon-btn-ghost mr-4"><Settings size={24} strokeWidth={1.5} /></button>
                    </div>

                    {user ? (
                        <div className="user-avatar">
                            {user.name[0].toUpperCase()}
                        </div>
                    ) : (
                        <button onClick={() => setMode('login')} className="btn-signin">
                            Sign in
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="lobby-main">

                {/* Left Side: Video Preview */}
                <div className="preview-container">
                    <div className="preview-box">
                        {previewStream && camEnabled ? (
                            <video ref={videoRef} autoPlay playsInline muted className="lobby-preview-video" />
                        ) : (
                            <div className="preview-status">
                                <span>{cameraStatus === 'blocked' ? 'Camera blocked' : 'Camera is off'}</span>
                                <button type="button" className="btn-signin" onClick={() => void initPreview()}>
                                    Retry devices
                                </button>
                            </div>
                        )}

                        {previewStream && camEnabled && (
                            <span className="sr-only" aria-live="polite">Camera preview active</span>
                        )}

                        <div className="device-status-row">
                            <DeviceBadge label="Cam" status={cameraStatus} />
                            <DeviceBadge label="Mic" status={microphoneStatus} />
                            <div className="mic-meter" aria-label="Mic level">
                                <span className="mic-meter-label">Mic</span>
                                <div className="mic-meter-track">
                                    <div className="mic-meter-fill" style={{ width: `${Math.round(micLevel * 100)}%` }} />
                                </div>
                            </div>
                        </div>

                        {/* Video Controls overlay inside preview */}
                        <div className="preview-controls">
                            <button
                                type="button"
                                onClick={toggleMic}
                                className={`preview-ctrl-btn ${!micEnabled ? 'off' : ''}`}
                            >
                                {!micEnabled ? <MicOff size={24} /> : <Mic size={24} />}
                            </button>
                            <button
                                type="button"
                                onClick={toggleCam}
                                className={`preview-ctrl-btn ${!camEnabled ? 'off' : ''}`}
                            >
                                {!camEnabled ? <VideoOff size={24} /> : <Video size={24} />}
                            </button>
                        </div>

                        {/* More settings indicator top right */}
                        <button className="preview-more-btn">
                            <MoreVertical size={20} />
                        </button>
                    </div>
                </div>

                {/* Right Side: Join Form */}
                <div className="join-section">
                    <h1 className="hero-title">
                        Premium video meetings. Now free for everyone.
                    </h1>
                    <p className="hero-subtitle">
                        We re-engineered the service we built for secure business meetings, StreamConnect, to make it free and available for all.
                    </p>

                    <form onSubmit={handleJoin} className="join-form">
                        <button
                            type="button"
                            onClick={generateRoomId}
                            className="btn-new-meeting"
                        >
                            <Video size={20} /> New meeting
                        </button>

                        <div className="code-input-wrapper">
                            <div className="icon-keyboard">
                                <Keyboard size={20} />
                            </div>
                            <input
                                type="text"
                                placeholder="Enter a code or link"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                className="input-code"
                            />
                            {/* Inside the input area, Join text button only appears when there's an ID */}
                            <button
                                type="submit"
                                className={`btn-join-inside ${roomId ? 'active' : 'disabled'}`}
                                disabled={!roomId || (!user && !displayName) || !canJoin || joining}
                            >
                                {joining ? 'Joining...' : 'Join'}
                            </button>
                        </div>
                    </form>

                    {joinError && <p className="join-error">{joinError}</p>}
                    {waitingStatus === 'pending' && <p className="join-info">Waiting for host approval to enter this meeting...</p>}
                    {waitingStatus === 'denied' && <p className="join-error">Join request denied by host.</p>}

                    <div className="device-picker-grid">
                        <label className="device-picker-field">
                            <span>Camera</span>
                            <select
                                className="device-select"
                                value={selectedVideoInputId}
                                onChange={(e) => void selectVideoInput(e.target.value)}
                            >
                                {videoInputs.length === 0 && <option value="">No camera found</option>}
                                {videoInputs.map((device, idx) => (
                                    <option key={`camera-${device.deviceId || 'empty'}-${idx}`} value={device.deviceId}>
                                        {device.label || `Camera ${idx + 1}`}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="device-picker-field">
                            <span>Microphone</span>
                            <select
                                className="device-select"
                                value={selectedAudioInputId}
                                onChange={(e) => void selectAudioInput(e.target.value)}
                            >
                                {audioInputs.length === 0 && <option value="">No microphone found</option>}
                                {audioInputs.map((device, idx) => (
                                    <option key={`mic-${device.deviceId || 'empty'}-${idx}`} value={device.deviceId}>
                                        {device.label || `Microphone ${idx + 1}`}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="device-picker-field device-picker-field-full">
                            <span>Speaker output</span>
                            <select
                                className="device-select"
                                value={selectedAudioOutputId}
                                onChange={(e) => selectAudioOutput(e.target.value)}
                                disabled={!speakerOutputSupported}
                            >
                                {!speakerOutputSupported && <option value="">Browser does not support speaker selection</option>}
                                {speakerOutputSupported && audioOutputs.length === 0 && <option value="">No speaker output found</option>}
                                {audioOutputs.map((device, idx) => (
                                    <option key={`speaker-${device.deviceId || 'empty'}-${idx}`} value={device.deviceId}>
                                        {device.label || `Speaker ${idx + 1}`}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <button
                        type="button"
                        className="btn-speaker-test"
                        onClick={playSpeakerTestTone}
                        disabled={isTestingSpeaker}
                    >
                        <Volume2 size={16} /> {isTestingSpeaker ? 'Testing speaker...' : 'Test speaker'}
                    </button>

                    {!user && (
                        <div className="display-name-wrapper">
                            <input
                                type="text"
                                placeholder="Enter your display name"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="input-field"
                                required
                            />
                        </div>
                    )}

                    <div className="lobby-footer">
                        <a href="#" className="text-link">Learn more</a>
                        <span> about StreamConnect</span>
                    </div>
                </div>

            </main>
        </div>
    );
};
