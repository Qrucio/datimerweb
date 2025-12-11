import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, User, BrainCircuit } from 'lucide-react';

const BreakCheckIn = ({
    isVisible,
    timeLeft,
    onDismiss,
    onConsult, // Async function to get AI advice
    formatTime
}) => {
    const [step, setStep] = useState('initial'); // 'initial', 'consulting', 'analyzing', 'result'
    const [userQuery, setUserQuery] = useState('');
    const [aiResponse, setAiResponse] = useState(null);

    // Reset state when visibility toggles
    useEffect(() => {
        if (!isVisible) {
            setTimeout(() => {
                setStep('initial');
                setUserQuery('');
                setAiResponse(null);
            }, 500);
        }
    }, [isVisible]);

    if (!IsVisible && step === 'initial') return null; // Simple render gate if needed, but AnimatePresence handles standard exit

    const handleConsultSubmit = async () => {
        if (!userQuery.trim()) return;
        setStep('analyzing');
        try {
            // Call AI with the user's query
            // The parent handler should return { advice: string, action: string }
            const response = await onConsult(userQuery);
            setAiResponse(response);
            setStep('result');
        } catch (e) {
            console.error(e);
            setAiResponse({ advice: "Connection to the Ether lost. Try again.", action: null });
            setStep('result');
        }
    };

    return createPortal(
        <AnimatePresence>
            {isVisible && (
                <React.Fragment>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[90%] max-w-[500px] bg-[#0A0A0A] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
                    >
                        {/* Header with Live Timer */}
                        <div className="p-6 pb-2 flex justify-center border-b border-white/5 bg-white/5">
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-white/50 uppercase tracking-widest font-bold mb-1">Break in Progress</span>
                                <div className="font-clock text-4xl text-white animate-pulse">
                                    {formatTime(timeLeft)}
                                </div>
                            </div>
                        </div>

                        <div className="p-8">
                            <AnimatePresence mode="wait">

                                {/* STEP 1: INITIAL CHOICE */}
                                {step === 'initial' && (
                                    <motion.div
                                        key="initial"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="flex flex-col gap-4"
                                    >
                                        <h2 className="text-2xl font-serif-display text-white text-center mb-2">
                                            Checking In
                                        </h2>
                                        <p className="text-white/60 text-center mb-6">
                                            How is your break going?
                                        </p>

                                        <button
                                            onClick={onDismiss}
                                            className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 group"
                                        >
                                            <User size={18} className="text-white/50 group-hover:text-white transition-colors" />
                                            Everything Alright
                                        </button>

                                        <button
                                            onClick={() => setStep('consulting')}
                                            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-purple-200 font-medium hover:from-purple-500/30 hover:to-blue-500/30 transition-all flex items-center justify-center gap-2 group"
                                        >
                                            <Sparkles size={18} className="text-purple-400 group-hover:text-purple-200 transition-colors" />
                                            Consult the Ether
                                        </button>
                                    </motion.div>
                                )}

                                {/* STEP 2: CONSULT INPUT */}
                                {step === 'consulting' && (
                                    <motion.div
                                        key="consulting"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                    >
                                        <h2 className="text-xl font-serif-display text-white mb-4">
                                            Speak to the Ether
                                        </h2>
                                        <textarea
                                            value={userQuery}
                                            onChange={(e) => setUserQuery(e.target.value)}
                                            placeholder="I'm feeling anxious about..."
                                            className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 resize-none mb-4"
                                            autoFocus
                                        />
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setStep('initial')}
                                                className="flex-1 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                            >
                                                Back
                                            </button>
                                            <button
                                                onClick={handleConsultSubmit}
                                                disabled={!userQuery.trim()}
                                                className="flex-[2] py-3 rounded-lg bg-white text-black font-bold hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                Ask Advice <ArrowRight size={16} />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* STEP 3: ANALYZING */}
                                {step === 'analyzing' && (
                                    <motion.div
                                        key="analyzing"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center justify-center py-8"
                                    >
                                        <div className="relative w-16 h-16 mb-6">
                                            <div className="absolute inset-0 rounded-full border-t-2 border-purple-500 animate-spin" />
                                            <div className="absolute inset-2 rounded-full border-r-2 border-blue-400 animate-spin-reverse" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <BrainCircuit size={24} className="text-purple-300 animate-pulse" />
                                            </div>
                                        </div>
                                        <p className="text-white/70 animate-pulse">Consulting the Ether...</p>
                                    </motion.div>
                                )}

                                {/* STEP 4: RESULT */}
                                {step === 'result' && aiResponse && (
                                    <motion.div
                                        key="result"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                    >
                                        <div className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                            <h3 className="text-sm font-bold text-purple-300 mb-2 flex items-center gap-2">
                                                <Sparkles size={14} /> Ether's Wisdom
                                            </h3>
                                            <p className="text-white/90 leading-relaxed text-sm">
                                                {aiResponse.advice}
                                            </p>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            {/* If explicit action returned */}
                                            {aiResponse.action && (
                                                <button
                                                    onClick={onDismiss} // For now, dismiss breaks unless logic requires otherwise. Or parent handleAction
                                                    className="w-full py-3 rounded-lg bg-white text-black font-bold hover:bg-white/90 transition-colors"
                                                >
                                                    Okay, I'll do that
                                                </button>
                                            )}
                                            {!aiResponse.action && (
                                                <button
                                                    onClick={onDismiss}
                                                    className="w-full py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                                                >
                                                    Thanks
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                )}

                            </AnimatePresence>
                        </div>
                    </motion.div>
                </React.Fragment>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default BreakCheckIn;
