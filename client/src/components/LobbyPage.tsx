import React, { useState } from 'react';
import { Video, Keyboard, Settings, HelpCircle, MessageSquare, Sparkles } from 'lucide-react';

interface LobbyPageProps {
    onJoin: (roomId: string, displayName: string) => void;
    onLogin: (email: string, pass: string) => void;
    onSignup: (email: string, name: string, pass: string) => void;
    user: any;
}

export const LobbyPage: React.FC<LobbyPageProps> = ({ onJoin, onLogin, onSignup, user }) => {
    const [roomId, setRoomId] = useState('');
    const [displayName, setDisplayName] = useState(user?.name || '');
    const [mode, setMode] = useState<'join' | 'login' | 'signup'>('join');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (roomId && (displayName || user)) {
            onJoin(roomId, displayName || user.name);
        }
    };

    const generateRoomId = () => {
        const part = () => Math.random().toString(36).substring(2, 5);
        setRoomId(`${part()}-${part()}-${part()}`);
    };

    const inputClasses = "w-full p-4 bg-white/5 border border-white/10 rounded-xl focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all text-white placeholder-gray-400";
    const buttonClasses = "w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-purple-500/25 active:scale-[0.98] mt-2";

    const AuthForm = ({ title, buttonText, onSubmit, isLogin }: any) => (
        <div className="w-full max-w-md p-10 bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-75 group-hover:opacity-100 transition-opacity"></div>

            <h2 className="text-3xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-300">
                {title}
            </h2>
            <form className="space-y-4 relative z-10" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
                {!isLogin && (
                    <input type="text" placeholder="Full Name" className={inputClasses} value={name} onChange={e => setName(e.target.value)} required />
                )}
                <input type="email" placeholder="Email Address" className={inputClasses} value={email} onChange={e => setEmail(e.target.value)} required />
                <input type="password" placeholder="Password" className={inputClasses} value={password} onChange={e => setPassword(e.target.value)} required />

                <button type="submit" className={buttonClasses}>
                    {buttonText}
                </button>
            </form>
            <p className="mt-8 text-center text-sm text-gray-400 relative z-10">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button onClick={() => setMode(isLogin ? 'signup' : 'login')} className="text-purple-400 hover:text-purple-300 hover:underline font-medium transition-colors">
                    {isLogin ? 'Create account' : 'Sign in'}
                </button>
            </p>

            {/* Subtle background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-purple-500 rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
        </div>
    );

    if (mode === 'login' || mode === 'signup') {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center bg-slate-950 relative overflow-hidden text-white">
                {/* Decorative background elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob"></div>
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-2000"></div>
                </div>

                <div className="absolute top-10 left-10 text-2xl font-bold flex items-center gap-3 z-10">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/30">
                        <Video size={24} className="text-white" />
                    </div>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">StreamConnect</span>
                </div>

                {mode === 'login'
                    ? <AuthForm title="Welcome Back" buttonText="Sign In" isLogin={true} onSubmit={() => { onLogin(email, password); setMode('join'); }} />
                    : <AuthForm title="Create Account" buttonText="Get Started" isLogin={false} onSubmit={() => { onSignup(email, name, password); setMode('join'); }} />
                }
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
            {/* Ambient Background Lights */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/40 rounded-full filter blur-[100px] mix-blend-screen opacity-50"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/30 rounded-full filter blur-[120px] mix-blend-screen opacity-50"></div>
            </div>

            {/* Header */}
            <header className="px-6 py-5 flex justify-between items-center bg-slate-950/50 backdrop-blur-lg border-b border-white/5 relative z-10">
                <div className="text-xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/20">
                        <Video size={22} className="text-white" />
                    </div>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">StreamConnect</span>
                </div>
                <div className="flex items-center gap-5 text-gray-300">
                    <div className="hidden md:flex items-center gap-4 mr-2 text-sm font-medium text-gray-400">
                        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                        <span>{new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </div>

                    <div className="flex gap-2">
                        <button className="p-2.5 hover:bg-white/10 rounded-full transition-colors"><HelpCircle size={22} /></button>
                        <button className="p-2.5 hover:bg-white/10 rounded-full transition-colors"><MessageSquare size={22} /></button>
                        <button className="p-2.5 hover:bg-white/10 rounded-full transition-colors mr-2"><Settings size={22} /></button>
                    </div>

                    {user ? (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 p-[2px] shadow-lg cursor-pointer hover:scale-105 transition-transform">
                            <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-slate-900">
                                {user.name[0].toUpperCase()}
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setMode('login')} className="relative group overflow-hidden rounded-xl p-[1px]">
                            <span className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-xl opacity-70 group-hover:opacity-100 transition-opacity"></span>
                            <div className="relative bg-slate-950 px-5 py-2.5 rounded-xl transition-all group-hover:bg-slate-900">
                                <span className="font-semibold text-white">Sign in</span>
                            </div>
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col lg:flex-row px-6 lg:px-20 items-center justify-center gap-16 max-w-[1600px] mx-auto w-full pt-8 pb-24 relative z-10">

                {/* Left Side: Video Preview */}
                <div className="flex-1 w-full max-w-[750px] aspect-video bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden relative shadow-2xl flex items-center justify-center group">
                    {/* Subtle grid pattern inside video */}
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50"></div>

                    <div className="flex flex-col items-center gap-4 text-gray-400 relative z-10">
                        <div className="w-16 h-16 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center animate-pulse">
                            <Video size={32} className="text-gray-500" />
                        </div>
                        <span className="font-medium text-lg tracking-wide">Camera is starting...</span>
                    </div>

                    <div className="absolute bottom-6 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-14 h-14 rounded-full bg-slate-800/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-slate-700/80 cursor-pointer shadow-lg hover:shadow-purple-500/20 transition-all hover:scale-105">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
                        </div>
                        <div className="w-14 h-14 rounded-full bg-slate-800/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-slate-700/80 cursor-pointer shadow-lg hover:shadow-purple-500/20 transition-all hover:scale-105">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M15 8v8H5V8h10m1-2H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4V7c0-.55-.45-1-1-1z" /></svg>
                        </div>
                    </div>
                </div>

                {/* Right Side: Join Form */}
                <div className="flex-1 w-full max-w-[500px] flex flex-col justify-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium w-fit mb-6">
                        <Sparkles size={16} /> Premium Video Calls
                    </div>

                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-4">
                        Connect with<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">everyone.</span>
                    </h1>
                    <p className="text-xl text-slate-400 mb-10 font-light max-w-md">
                        Crystal clear video calls, right from your browser. No downloads required.
                    </p>

                    <form onSubmit={handleJoin} className="space-y-6">
                        {!user && (
                            <div className="w-full relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-0 group-focus-within:opacity-30 transition duration-500"></div>
                                <input
                                    type="text"
                                    placeholder="Enter your display name"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="relative w-full text-lg bg-slate-900 border border-white/10 py-4 px-6 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-white placeholder-slate-500"
                                    required
                                />
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                type="button"
                                onClick={generateRoomId}
                                className="bg-gradient-to-r from-blue-600 to-violet-600 text-white px-8 py-4 rounded-xl font-semibold flex items-center justify-center gap-3 hover:from-blue-500 hover:to-violet-500 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] whitespace-nowrap"
                            >
                                <Video size={22} /> New meeting
                            </button>

                            <div className="flex-1 relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Keyboard size={22} className="text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Enter a code or link"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 py-4 pl-12 pr-4 text-white placeholder-slate-500 transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex gap-4">
                            <button
                                type="submit"
                                className="bg-white text-slate-900 font-bold px-8 py-3 rounded-xl hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-white/10 active:scale-[0.98]"
                                disabled={!roomId || (!user && !displayName)}
                            >
                                Join Room
                            </button>
                            <button
                                type="button"
                                className="bg-slate-800 text-white font-medium px-8 py-3 rounded-xl border border-white/5 hover:bg-slate-700 transition-all flex items-center gap-2 active:scale-[0.98]"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3C2 3 1 4 1 5v14c0 1.1.9 2 2 2h18c1 0 2-.9 2-2V5c0-1-1-2-2-2zm0 16.02H3V4.98h18v14.04zM10 12H8l4-4 4 4h-2v4h-4v-4z" /></svg>
                                Present
                            </button>
                        </div>
                    </form>

                    <div className="mt-12 pt-8 border-t border-white/5">
                        <a href="#" className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors group">
                            <Settings size={16} className="group-hover:rotate-45 transition-transform duration-300" />
                            Check your audio and video settings
                        </a>
                    </div>
                </div>

            </main>
        </div>
    );
};
