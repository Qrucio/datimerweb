import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Edit2 } from 'lucide-react';

const HoloNote = ({ initialContent, onSave, onClose }) => {
    const [content, setContent] = useState(initialContent || "1. Stretch\n2. Drink water\n3. Check messages");
    const [isEditing, setIsEditing] = useState(false);

    // Styled to look like a yellow sticky note BUT with a holographic glass overlay
    // Base: Yellowish tint
    // Overlay: Linear gradient shimmer + backdrop filter

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            className="relative w-64 min-h-[220px] rounded-sm shadow-xl p-4 flex flex-col group"
            style={{
                background: 'linear-gradient(135deg, rgba(254, 240, 138, 0.9), rgba(253, 224, 71, 0.8))', // Yellow sticky base
                backdropFilter: 'blur(4px)',
            }}
            drag
            dragConstraints={{ left: -50, right: 50, top: -50, bottom: 50 }}
        >
            {/* HOLOGRAPHIC OVERLAY LAYER */}
            <div
                className="absolute inset-0 pointer-events-none rounded-sm overflow-hidden"
                style={{
                    background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.0) 50%, transparent 100%)',
                    backgroundSize: '200% 100%',
                    mixBlendMode: 'overlay',
                    animation: 'holoShimmer 6s infinite linear'
                }}
            />
            <style>{`
            @keyframes holoShimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        `}</style>

            {/* HEADER */}
            <div className="flex items-center justify-between mb-2 border-b border-black/10 pb-1 z-10 relative">
                <span className="font-handwriting text-lg font-bold text-black/70">Break Tasks</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setIsEditing(!isEditing)} className="p-1 hover:bg-black/10 rounded text-black/60">
                        {isEditing ? <Save size={14} /> : <Edit2 size={14} />}
                    </button>
                    <button onClick={onClose} className="p-1 hover:bg-red-500/20 hover:text-red-600 rounded text-black/60 transition-colors">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* BODY */}
            <div className="flex-1 relative z-10">
                {isEditing ? (
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onBlur={() => { setIsEditing(false); onSave(content); }}
                        className="w-full h-full bg-transparent resize-none focus:outline-none font-handwriting text-lg text-black/80 leading-snug"
                        autoFocus
                    />
                ) : (
                    <div
                        onClick={() => setIsEditing(true)}
                        className="w-full h-full font-handwriting text-lg text-black/80 leading-snug whitespace-pre-wrap cursor-pointer"
                    >
                        {content || "Click to add tasks..."}
                    </div>
                )}
            </div>

            {/* Tape Effect (Optional) */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-6 bg-white/30 backdrop-blur-sm rotate-1 shadow-sm border-l border-r border-white/40" />
        </motion.div>
    );
};

export default HoloNote;
