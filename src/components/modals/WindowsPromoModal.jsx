import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Download } from 'lucide-react';
import CloseButton from '../ui/CloseButton';

const WindowsPromoModal = ({ isOpen, onClose }) => {
    // Determine if mobile
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const modalVariants = isMobile ? {
        hidden: { opacity: 0, y: '100%' },
        visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
        exit: { opacity: 0, y: '100%' }
    } : {
        hidden: { opacity: 0, scale: 0.95, y: 10 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
        exit: { opacity: 0, scale: 0.95, y: 10 }
    };

    const handleOpenDownloads = () => {
        window.open('/downloads', '_blank');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={onClose}
                >
                    <motion.div
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                    >
                        {/* Close Button */}
                        <div className="absolute top-4 right-4 z-20">
                            <CloseButton onClick={onClose} />
                        </div>

                        {/* Top Section: Animation with Glow */}
                        <div className="relative w-full h-64 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center overflow-hidden">
                            {/* Blue/Purple Glow */}
                            <div className="absolute inset-0 bg-blue-600/20 blur-[80px] scale-75 rounded-full pointer-events-none" />
                            
                            <video
                                src="/animations/LogoToText.webm"
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-contain relative z-10 scale-125"
                                onEnded={(e) => e.target.pause()}
                            />
                        </div>

                        {/* Content Section */}
                        <div className="p-8 text-center space-y-6">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-white tracking-tight">
                                    Experience DaTimer on Windows
                                </h2>
                                <p className="text-white/50 text-sm leading-relaxed max-w-sm mx-auto">
                                    Unlock system-level features like Strict Mode, Application Blocking, and more with our native desktop app.
                                </p>
                            </div>

                            <button
                                onClick={handleOpenDownloads}
                                className="group relative w-full flex items-center justify-center gap-2 py-4 px-6 bg-white text-black font-bold text-sm uppercase tracking-widest rounded-xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-white/20"
                            >
                                <span>Go to Downloads</span>
                                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                                
                                {/* Button Shine Effect */}
                                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-black/10 to-transparent skew-x-12" />
                            </button>
                        </div>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default WindowsPromoModal;
