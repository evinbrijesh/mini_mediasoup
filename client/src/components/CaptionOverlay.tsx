import React, { useState, useEffect, useRef } from 'react';

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
    // BUG-047: Track timeouts so we can clear stale interim captions
    const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!socket) return;

        socket.on('transcript', (data: Transcript) => {
            // Clear any pending clear timer
            if (clearTimerRef.current) {
                clearTimeout(clearTimerRef.current);
                clearTimerRef.current = null;
            }

            setCaption(data.text);

            if (data.isFinal) {
                // Clear after 3 seconds for final results
                clearTimerRef.current = setTimeout(() => setCaption(null), 3000);
            } else {
                // BUG-047: Clear interim results after a shorter timeout so they don't
                // stay on screen if speech recognition stops mid-word
                clearTimerRef.current = setTimeout(() => setCaption(null), 5000);
            }
        });

        return () => {
            socket.off('transcript');
            if (clearTimerRef.current) {
                clearTimeout(clearTimerRef.current);
            }
        };
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
