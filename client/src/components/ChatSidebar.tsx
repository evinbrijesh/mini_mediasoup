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

    useEffect(() => {
        if (!socket) return;
        socket.on('new-message', (msg: Message) => {
            setMessages(prev => [...prev, msg]);
        });
        return () => socket.off('new-message');
    }, [socket]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            socket.emit('send-message', { text: input });
            setInput('');
        }
    };

    return (
        <div className="absolute right-4 top-4 bottom-[104px] w-[360px] bg-white rounded-xl shadow-lg flex flex-col z-40 border border-gray-200 overflow-hidden">
            <div className="p-4 flex justify-between items-center bg-white">
                <h3 className="text-lg font-normal text-gray-800 flex items-center gap-2">
                    In-call messages
                </h3>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="px-4 py-3 bg-gray-50 text-xs text-center text-gray-500">
                Messages can only be seen by people in the call and are deleted when the call ends.
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <MessageSquare size={48} className="mb-4 text-gray-300" />
                        <p className="text-sm font-medium">No messages yet</p>
                    </div>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-[13px] text-gray-800">{msg.senderName}</span>
                                <span className="text-[11px] text-gray-500">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="text-sm text-gray-700 break-words">
                                {msg.text}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100">
                <div className="relative group flex items-center bg-gray-100 rounded-full border border-transparent focus-within:border-meet-blue transition-colors">
                    <input
                        type="text"
                        placeholder="Send a message"
                        className="w-full bg-transparent px-4 py-3 text-sm text-gray-800 placeholder-gray-600 focus:outline-none"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="p-2 mr-2 rounded-full text-meet-blue disabled:text-gray-400 hover:bg-blue-50 disabled:hover:bg-transparent transition-colors"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </form>
        </div>
    );
};
