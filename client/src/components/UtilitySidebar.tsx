import React from 'react';
import { X } from 'lucide-react';

interface UtilitySidebarProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}

export const UtilitySidebar: React.FC<UtilitySidebarProps> = ({ title, onClose, children }) => {
    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h3 className="sidebar-title">{title}</h3>
                <button onClick={onClose} className="sidebar-close">
                    <X size={20} />
                </button>
            </div>
            <div className="sidebar-content p-4 text-sm text-meet-gray-muted">
                {children}
            </div>
        </div>
    );
};
