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
        <div className="caption-overlay">
            <div className="caption-box">
                {caption}
            </div>
        </div>
    );
};
