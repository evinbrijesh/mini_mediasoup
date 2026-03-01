import React, { useState, useEffect } from 'react';

interface Transcript {
    peerId: string;
    text: string;
    isFinal: boolean;
    sourceLanguage: string;
}

interface CaptionOverlayProps {
    socket: any;
}

export const CaptionOverlay: React.FC<CaptionOverlayProps> = ({ socket }) => {
    const [caption, setCaption] = useState<string | null>(null);

    useEffect(() => {
        if (!socket) return;
        socket.on('transcript', (data: Transcript) => {
            setCaption(data.text);
            if (data.isFinal) {
                setTimeout(() => setCaption(null), 3000);
            }
        });
        return () => socket.off('transcript');
    }, [socket]);

    if (!caption) return null;

    return (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50">
            <div className="bg-black/80 px-6 py-3 rounded-lg text-white text-center text-lg animate-fade-in border border-white/10">
                <p className="leading-relaxed">{caption}</p>
            </div>
        </div>
    );
};
