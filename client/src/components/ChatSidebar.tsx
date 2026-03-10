import React, { useState, useEffect } from 'react';
import { Send, X, MessageSquare } from 'lucide-react';

interface Message {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
}

interface ChatSidebarProps {
    socket: any;
    onClose: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ socket, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    // BUG-046: Track own socket ID so we can identify own messages reliably
    const [mySocketId, setMySocketId] = useState<string | null>(null);

    useEffect(() => {
        if (!socket) return;
        // Capture socket ID when available
        setMySocketId(socket.id ?? null);
        const handleId = () => setMySocketId(socket.id);
        socket.on('connect', handleId);

        socket.on('new-message', (msg: Message) => {
            setMessages(prev => [...prev, msg]);
        });
        return () => {
            socket.off('new-message');
            socket.off('connect', handleId);
        };
    }, [socket]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            socket.emit('send-message', { text: input });
            setInput('');
        }
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h3 className="sidebar-title flex items-center gap-2">
                    In-call messages
                </h3>
                <button onClick={onClose} className="sidebar-close">
                    <X size={20} />
                </button>
            </div>

            <div className="px-4 py-3 bg-meet-surface text-xs text-center text-meet-gray-muted border-b border-meet-surfaceHover">
                Messages can only be seen by people in the call and are deleted when the call ends.
            </div>

            <div className="sidebar-content chat-messages">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-meet-gray-muted">
                        <MessageSquare size={48} className="mb-4 opacity-50" />
                        <p className="font-medium">No messages yet</p>
                    </div>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-[13px] text-meet-gray">{msg.senderName}</span>
                                <span className="text-[11px] text-meet-gray-muted">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className={`chat-bubble ${msg.senderId === mySocketId ? 'own' : 'other'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={handleSend} className="chat-input-area">
                <input
                    type="text"
                    placeholder="Send a message"
                    className="chat-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                />
                <button
                    type="submit"
                    disabled={!input.trim()}
                    className={`chat-send-btn ${!input.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
};
