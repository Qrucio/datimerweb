import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

const LiquidButton = ({ icon: Icon, label = "Sure?", onConfirm, variant = "danger", size = "sm", disabled = false, align = "right" }) => {
    const [status, setStatus] = useState('idle');
    const containerRef = useRef(null);
    const BASE_SIZE = size === 'sm' ? 32 : 40;
    const EXPANDED_WIDTH = 130;
    const EXPANDED_HEIGHT = size === 'sm' ? 36 : 44;

    const styles = {
        danger: { idleBg: "rgba(255, 255, 255, 0.05)", idleColor: "rgba(255, 255, 255, 0.5)", idleHoverBg: "rgba(220, 38, 38, 0.2)", idleHoverColor: "#f87171", confirmBg: "rgba(220, 38, 38, 0.15)", confirmBorder: "rgba(220, 38, 38, 0.3)", labelColor: "text-red-500", confirmBtnClass: "bg-red-500 text-white hover:bg-red-400" },
        success: { idleBg: "rgba(255, 255, 255, 1)", idleColor: "#000", idleHoverBg: "rgba(74, 222, 128, 1)", idleHoverColor: "#000", confirmBg: "rgba(34, 197, 94, 0.15)", confirmBorder: "rgba(34, 197, 94, 0.3)", labelColor: "text-green-500", confirmBtnClass: "bg-green-500 text-white hover:bg-green-400" },
        neutral: { idleBg: "rgba(255, 255, 255, 0.05)", idleColor: "rgba(255, 255, 255, 0.5)", idleHoverBg: "rgba(255, 255, 255, 0.1)", idleHoverColor: "#fff", confirmBg: "rgba(255, 255, 255, 0.1)", confirmBorder: "rgba(255, 255, 255, 0.1)", labelColor: "text-white", confirmBtnClass: "bg-white text-black" },
        primary: { idleBg: "rgba(255, 255, 255, 0.1)", idleColor: "#fff", idleHoverBg: "rgba(6, 182, 212, 0.2)", idleHoverColor: "#22d3ee", confirmBg: "rgba(6, 182, 212, 0.15)", confirmBorder: "rgba(6, 182, 212, 0.3)", labelColor: "text-cyan-400", confirmBtnClass: "bg-cyan-500 text-white hover:bg-cyan-400" },
        secondary: { idleBg: "rgba(255, 255, 255, 0.05)", idleColor: "rgba(255, 255, 255, 0.5)", idleHoverBg: "rgba(255, 255, 255, 0.1)", idleHoverColor: "#fff", confirmBg: "rgba(255, 255, 255, 0.1)", confirmBorder: "rgba(255, 255, 255, 0.1)", labelColor: "text-white", confirmBtnClass: "bg-white text-black" }
    }[variant] || { idleBg: "rgba(255, 255, 255, 0.05)", idleColor: "rgba(255, 255, 255, 0.5)", labelColor: "text-white" }; // Fallback

    useEffect(() => { let timer; if (status === 'confirming') { timer = setTimeout(() => setStatus('idle'), 3000); } return () => clearTimeout(timer); }, [status]);
    useEffect(() => { const handleClickOutside = (event) => { if (containerRef.current && !containerRef.current.contains(event.target)) { setStatus('idle'); } }; if (status === 'confirming') document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, [status]);

    if (disabled) return (<div className={`w-${size === 'sm' ? '8' : '10'} h-${size === 'sm' ? '8' : '10'} flex items-center justify-center opacity-30`}> <Icon size={size === 'sm' ? 14 : 18} /> </div>);

    return (
        <div className={`relative ${size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center z-10`}>
            <motion.div ref={containerRef} layout onClick={(e) => e.stopPropagation()} initial={false} animate={status === 'confirming' ? { width: EXPANDED_WIDTH, height: EXPANDED_HEIGHT, borderRadius: 20, backgroundColor: styles.confirmBg, borderColor: styles.confirmBorder, borderWidth: 1 } : { width: BASE_SIZE, height: BASE_SIZE, borderRadius: 50, backgroundColor: styles.idleBg, borderColor: "rgba(0,0,0,0)", borderWidth: 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} flex items-center justify-center overflow-hidden shadow-lg backdrop-blur-md`}>
                <AnimatePresence mode="popLayout">
                    {status === 'idle' ? (
                        <motion.button key="icon" layout="position" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1, color: styles.idleColor }} exit={{ opacity: 0, scale: 0.5 }} transition={{ duration: 0.2 }} whileHover={{ backgroundColor: styles.idleHoverBg, color: styles.idleHoverColor }} onClick={(e) => { e.stopPropagation(); setStatus('confirming'); }} className="w-full h-full flex items-center justify-center"> <Icon size={size === 'sm' ? 14 : 18} strokeWidth={variant === 'success' ? 3 : 2} /> </motion.button>
                    ) : (
                        <motion.div key="content" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="flex items-center justify-between w-full px-1">
                            <button onClick={(e) => { e.stopPropagation(); onConfirm(); setStatus('idle'); }} className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95 ${styles.confirmBtnClass}`}> <Check size={14} strokeWidth={3} /> </button>
                            <span className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${styles.labelColor}`}>{label}</span>
                            <button onClick={(e) => { e.stopPropagation(); setStatus('idle'); }} className="w-7 h-7 rounded-full bg-black/20 text-white/50 flex items-center justify-center hover:bg-black/40 hover:text-white transition-colors"> <X size={12} strokeWidth={3} /> </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default LiquidButton;
