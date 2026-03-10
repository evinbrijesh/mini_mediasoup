import React, { useState, useEffect } from 'react';
import { Video, Keyboard, Settings, HelpCircle, MessageSquare, Mic, MicOff, VideoOff, MoreVertical } from 'lucide-react';

interface LobbyPageProps {
    onJoin: (roomId: string, displayName: string) => void;
    onLogin: (email: string, pass: string) => Promise<boolean>;
    onSignup: (email: string, name: string, pass: string) => Promise<boolean>;
    user: any;
    roomId?: string;
}

export const LobbyPage: React.FC<LobbyPageProps> = ({ onJoin, onLogin, onSignup, user, roomId: initialRoomId }) => {
    const [roomId, setRoomId] = useState(initialRoomId || '');
    const [displayName, setDisplayName] = useState(user?.name || '');
    const [mode, setMode] = useState<'join' | 'login' | 'signup'>('join');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isCamOff, setIsCamOff] = useState(false);

    // BUG-045: Live clock in lobby header
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        const name = displayName.trim() || user?.name?.trim();
        // BUG-050: Validate that displayName is non-empty before joining
        if (roomId && name) {
            onJoin(roomId, name);
        }
    };

    const generateRoomId = () => {
        const part = () => Math.random().toString(36).substring(2, 5);
        setRoomId(`${part()}-${part()}-${part()}`);
    };

    const AuthForm = ({ title, buttonText, onSubmit, isLogin }: any) => (
        <div className="auth-card">
            <h2 className="auth-title">
                {title}
            </h2>
            <form className="auth-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
                {!isLogin && (
                    <input type="text" placeholder="Full Name" className="input-field" value={name} onChange={e => setName(e.target.value)} required />
                )}
                <input type="email" placeholder="Email Address" className="input-field" value={email} onChange={e => setEmail(e.target.value)} required />
                <input type="password" placeholder="Password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} required />

                <button type="submit" className="btn-primary">
                    {buttonText}
                </button>
            </form>
            <p className="auth-footer">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button onClick={() => setMode(isLogin ? 'signup' : 'login')} className="text-link">
                    {isLogin ? 'Create account' : 'Sign in'}
                </button>
            </p>
        </div>
    );

    if (mode === 'login' || mode === 'signup') {
        return (
            <div className="auth-container">
                <div className="logo-absolute">
                    <Video className="logo-icon" />
                    <span>StreamConnect</span>
                </div>

                {mode === 'login'
                    // BUG-051: Await async login before switching mode — only switch on success
                    ? <AuthForm title="Welcome Back" buttonText="Sign In" isLogin={true} onSubmit={async () => {
                        const ok = await onLogin(email, password);
                        if (ok) setMode('join');
                    }} />
                    : <AuthForm title="Create Account" buttonText="Get Started" isLogin={false} onSubmit={async () => {
                        const ok = await onSignup(email, name, password);
                        if (ok) setMode('join');
                    }} />
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
                    {/* BUG-045: Live clock */}
                    <div className="header-time">
                        <span>{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span>{now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </div>

                    <div className="header-actions">
                        <button className="icon-btn-ghost"><HelpCircle size={24} strokeWidth={1.5} /></button>
                        <button className="icon-btn-ghost"><MessageSquare size={24} strokeWidth={1.5} /></button>
                        <button className="icon-btn-ghost mr-4"><Settings size={24} strokeWidth={1.5} /></button>
                    </div>

                    {user ? (
                        <div className="user-avatar">
                            {/* BUG-049: Safe avatar initial */}
                            {user.name?.trim() ? user.name.trim()[0].toUpperCase() : '?'}
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
                        <div className="preview-status">
                            <span>Camera is starting</span>
                        </div>

                        {/* Video Controls overlay inside preview */}
                        <div className="preview-controls">
                            <button
                                onClick={() => setIsMicMuted(!isMicMuted)}
                                className={`preview-ctrl-btn ${isMicMuted ? 'off' : ''}`}
                            >
                                {isMicMuted ? <MicOff size={24} /> : <Mic size={24} />}
                            </button>
                            <button
                                onClick={() => setIsCamOff(!isCamOff)}
                                className={`preview-ctrl-btn ${isCamOff ? 'off' : ''}`}
                            >
                                {isCamOff ? <VideoOff size={24} /> : <Video size={24} />}
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
                                // BUG-050: Also require a non-empty display name
                                disabled={!roomId || (!user && !displayName.trim())}
                            >
                                Join
                            </button>
                        </div>
                    </form>

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
