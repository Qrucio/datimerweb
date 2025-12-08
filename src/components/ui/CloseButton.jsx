import React from 'react';
import { X } from 'lucide-react';

const CloseButton = ({ onClick, className = "" }) => {
    return (
        <button
            onClick={onClick}
            className={`
                group
                flex items-center justify-center
                w-10 h-10 rounded-full
                bg-white/5 border border-white/5
                text-white/50
                hover:bg-white/10 hover:text-white hover:scale-110 hover:rotate-90
                active:scale-95
                transition-all duration-300 ease-out
                backdrop-blur-sm
                z-50
                ${className}
            `}
            aria-label="Close"
        >
            <X size={20} strokeWidth={2.5} />
        </button>
    );
};

export default CloseButton;
