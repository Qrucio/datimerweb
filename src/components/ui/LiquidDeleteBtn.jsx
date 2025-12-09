import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Check, X } from 'lucide-react';

const LiquidDeleteBtn = ({ onDelete, size = 30, expandedWidth = 140, expandedHeight = 40, className = "", darkMode = false }) => {
    // ... existing hooks ...
    const [status, setStatus] = useState('idle'); // 'idle' | 'confirming'
    const containerRef = useRef(null);

    // Close confirmation if clicked outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setStatus('idle');
            }
        };
        if (status === 'confirming') {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [status]);

    // ... handlers ...
    const handleInitialClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setStatus('confirming');
    };

    const handleConfirm = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete();
        setStatus('idle');
    };

    const handleCancel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setStatus('idle');
    };

    return (
        <motion.div
            ref={containerRef}
            layout
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            initial={false}
            animate={status === 'confirming'
                ? { width: expandedWidth, height: expandedHeight, borderRadius: 50, backgroundColor: darkMode ? "rgba(220, 38, 38, 0.2)" : "rgba(220, 38, 38, 0.15)" }
                : { width: size, height: size, borderRadius: 50 }
            }
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`relative backdrop-blur-md border border-white/10 flex items-center justify-center overflow-hidden cursor-default shadow-lg ${status !== 'confirming' ? className : ''}`}
        >
            <AnimatePresence mode="popLayout">
                {status === 'idle' ? (
                    <motion.button
                        key="trash-icon"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.2 }}
                        onClick={handleInitialClick}
                        className="w-full h-full flex items-center justify-center opacity-50 hover:opacity-100 hover:text-red-500 transition-colors cursor-pointer"
                    >
                        <Trash2 size={16} /> {/* Increased Icon Size */}
                    </motion.button>
                ) : (
                    <motion.div
                        key="confirm-actions"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="flex items-center gap-2 px-1 w-full justify-evenly"
                    >
                        <button
                            onClick={handleConfirm}
                            className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-110 active:scale-90 transition-transform cursor-pointer shadow-sm"
                            title="Confirm Delete"
                        >
                            <Check size={16} strokeWidth={3} />
                        </button>
                        <span className={`text-xs font-bold select-none ${darkMode ? 'text-white' : 'text-red-600'}`}>Delete?</span>
                        <button
                            onClick={handleCancel}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${darkMode ? 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white' : 'bg-black/10 text-black/50 hover:bg-black/20 hover:text-black'}`}
                            title="Cancel"
                        >
                            <X size={14} strokeWidth={3} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default LiquidDeleteBtn;
