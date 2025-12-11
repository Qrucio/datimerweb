import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { ArrowRight, Zap, Sparkles, Play } from 'lucide-react';

// CSS for the flowing gradient animation
const animationStyles = `
  @keyframes gradient-x {
    0%, 100% {
      background-size: 200% 200%;
      background-position: left center;
    }
    50% {
      background-size: 200% 200%;
      background-position: right center;
    }
  }
  .animate-gradient-text {
    background: linear-gradient(to right, #c084fc, #e879f9, #22d3ee, #c084fc);
    background-size: 200% auto;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: gradient-x 3s linear infinite;
  }
`;

const SmartIntervention = ({
    isVisible,
    intention,
    duration,
    timeLeft,
    userName,
    onClose,
    onApplyAction,
    getGeminiAdvice
}) => {
    const [step, setStep] = useState('initial');
    const [reasons, setReasons] = useState([]);
    const [customReason, setCustomReason] = useState("");
    const [emotion, setEmotion] = useState(null);
    const [adviceText, setAdviceText] = useState(null);
    const [actionCommand, setActionCommand] = useState(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isVisible) {
            setStep('initial');
            setReasons([]);
            setCustomReason("");
            setEmotion(null);
            setAdviceText(null);
            setActionCommand(null);
        }
    }, [isVisible]);

    const handleReasonToggle = (r) => {
        if (reasons.includes(r)) setReasons(reasons.filter(x => x !== r));
        else setReasons([...reasons, r]);
    };

    const handleGenerate = async (selectedEmotion) => {
        setEmotion(selectedEmotion);
        setStep('generating');

        // Combine preset reasons with custom input
        const finalReasons = customReason ? [...reasons, customReason] : reasons;

        try {
            const promptContext = {
                intention,
                reasons: finalReasons,
                emotion: selectedEmotion.label,
                timeFocused: Math.round((duration - timeLeft / 60)),
                timeLeft: Math.round(timeLeft / 60)
            };
            const response = await getGeminiAdvice(promptContext);

            // Parse the response to separate Text from Action
            // Expected format: "Here is some advice... [Action: Do Something]"
            const actionMatch = response.match(/\[Action:(.*?)\]/);
            const action = actionMatch ? actionMatch[1].trim() : "Resume Focus";
            const cleanText = response.replace(/\[Action:.*?\]/, '').trim();

            setAdviceText(cleanText);
            setActionCommand(action);
            setStep('outcome');
        } catch (e) {
            console.error(e);
            setAdviceText("Take a breath. Simplify. Just do the next smallest step.");
            setActionCommand("Resume Focus");
            setStep('outcome');
        }
    };

    // Preset Reasons
    const presetReasons = ['Bored', 'Stressed', 'Overwhelmed', 'Distracted', 'Stuck', 'Tired'];

    // Emoji/Mood Spectrum
    const moodSpectrum = [
        { icon: '🤯', label: 'Fried', color: 'text-red-400' },
        { icon: '😤', label: 'Angry', color: 'text-orange-400' },
        { icon: '🥱', label: 'Tired', color: 'text-yellow-400' },
        { icon: '😐', label: 'Neutral', color: 'text-gray-400' },
        { icon: '🙂', label: 'Okay', color: 'text-blue-400' },
        { icon: '⚡', label: 'Wired', color: 'text-purple-400' }
    ];

    if (!isVisible) return null;

    return createPortal(
        <AnimatePresence>
            {isVisible && (
                <>
                    <style>{animationStyles}</style>
                    {/* 1. BACKDROP */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9990]"
                        onClick={onClose}
                    />

                    {/* 2. MODAL CONTAINER */}
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                            className="w-full max-w-[600px] bg-[#0F0F0F] border border-white/10 rounded-[32px] overflow-hidden relative shadow-2xl pointer-events-auto"
                        >
                            {/* TOP BAR: RESUME PILL */}
                            <div className="absolute top-0 left-0 w-full p-8 flex justify-end z-50 pointer-events-none">
                                <button
                                    onClick={onClose}
                                    className="pointer-events-auto group flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white hover:border-white transition-all duration-300 shadow-lg"
                                >
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 group-hover:text-black transition-colors">
                                        Resume Focus
                                    </span>
                                    <div className="w-5 h-5 rounded-full bg-white/10 group-hover:bg-black text-white group-hover:text-white flex items-center justify-center transition-colors">
                                        <Play size={8} fill="currentColor" />
                                    </div>
                                </button>
                            </div>

                            {/* CONTENT AREA */}
                            <div className="px-10 pb-12 pt-24 min-h-[420px] flex flex-col justify-center">
                                <AnimatePresence mode="wait">

                                    {/* STEP 1: REASONS */}
                                    {step === 'initial' && (
                                        <motion.div
                                            key="step-initial"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            transition={{ duration: 0.25, ease: "easeOut" }}
                                            className="space-y-8"
                                        >
                                            <h3 className="text-3xl sm:text-4xl font-normal text-white leading-tight tracking-tight font-sans">
                                                Hey {userName}, what's blocking <br />
                                                <span className="animate-gradient-text font-medium">
                                                    {intention}?
                                                </span>
                                            </h3>

                                            <div className="space-y-5">
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                    {presetReasons.map(r => (
                                                        <button
                                                            key={r}
                                                            onClick={() => handleReasonToggle(r)}
                                                            className={`p-3.5 rounded-xl border text-sm font-medium transition-all duration-200 active:scale-[0.98] ${reasons.includes(r)
                                                                ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                                                                : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:border-white/10 hover:text-white'
                                                                }`}
                                                        >
                                                            {r}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Custom Input */}
                                                <div className="relative group">
                                                    <input
                                                        type="text"
                                                        value={customReason}
                                                        onChange={(e) => setCustomReason(e.target.value)}
                                                        placeholder="Or type what you're feeling..."
                                                        className="w-full bg-transparent border-b border-white/10 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/40 transition-colors text-sm font-light tracking-wide"
                                                    />
                                                    <div className="absolute right-0 top-3 text-white/20 pointer-events-none">
                                                        <Sparkles size={14} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <button
                                                    onClick={() => setStep('emotion')}
                                                    disabled={reasons.length === 0 && customReason === ""}
                                                    className={`flex items-center gap-3 px-6 py-3 rounded-full font-bold uppercase text-xs tracking-widest transition-all duration-300 ${reasons.length > 0 || customReason !== ""
                                                        ? 'bg-white text-black hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                                                        : 'bg-white/5 text-white/20 cursor-not-allowed'
                                                        }`}
                                                >
                                                    Next <ArrowRight size={14} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* STEP 2: MOOD SPECTRUM */}
                                    {step === 'emotion' && (
                                        <motion.div
                                            key="step-emotion"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            transition={{ duration: 0.25, ease: "easeOut" }}
                                            className="space-y-10 text-center"
                                        >
                                            <div className="space-y-2">
                                                <h3 className="text-2xl text-white font-light tracking-wide">Energy Check</h3>
                                                <p className="text-white/40 text-sm">Where are you on the spectrum?</p>
                                            </div>

                                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                                {moodSpectrum.map((item, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => handleGenerate(item)}
                                                        className="group flex flex-col items-center gap-4 p-4 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all active:scale-95"
                                                    >
                                                        <span className="text-3xl group-hover:scale-110 transition-transform filter drop-shadow-lg">{item.icon}</span>
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider opacity-40 group-hover:opacity-100 transition-opacity ${item.color}`}>
                                                            {item.label}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="pt-4">
                                                <button
                                                    onClick={() => setStep('initial')}
                                                    className="text-xs text-white/30 hover:text-white transition-colors border-b border-transparent hover:border-white/30 pb-0.5"
                                                >
                                                    Back to reasons
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* STEP 3: GENERATING */}
                                    {step === 'generating' && (
                                        <motion.div
                                            key="step-generating"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="flex flex-col items-center justify-center space-y-8 py-12"
                                        >
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-purple-500 blur-3xl opacity-20 animate-pulse" />
                                                <div className="relative z-10 w-16 h-16 border-t-2 border-r-2 border-purple-400 rounded-full animate-spin" />
                                                <div className="absolute inset-0 z-10 flex items-center justify-center">
                                                    <Sparkles className="text-white animate-pulse" size={20} />
                                                </div>
                                            </div>
                                            <div className="text-center space-y-2">
                                                <h4 className="text-lg text-white font-light">Realigning Focus</h4>
                                                <p className="text-sm text-white/40 font-mono">Consulting the ether...</p>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* STEP 4: OUTCOME */}
                                    {step === 'outcome' && (
                                        <motion.div
                                            key="step-outcome"
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                            className="space-y-8"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl border border-white/10">
                                                    <Sparkles className="text-purple-300" size={18} />
                                                </div>
                                                <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Guidance</span>
                                            </div>

                                            {/* Results Text */}
                                            <div className="text-lg sm:text-xl leading-loose font-light text-white/90 font-sans tracking-wide">
                                                {adviceText}
                                            </div>

                                            {/* Main Action Button - Purple Pill Aesthetic */}
                                            <div className="pt-6 w-full">
                                                <button
                                                    onClick={() => onApplyAction(actionCommand)}
                                                    className="group w-full py-4 rounded-xl bg-purple-500/20 text-purple-200 border border-purple-500/30 hover:bg-purple-500/30 transition-all shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:shadow-[0_0_30px_rgba(168,85,247,0.25)] active:scale-[0.99] flex items-center justify-center gap-3"
                                                >
                                                    <Zap size={18} className="fill-purple-200 group-hover:scale-110 transition-transform duration-300" />
                                                    <span className="font-bold uppercase tracking-widest text-xs">
                                                        {actionCommand}
                                                    </span>
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default SmartIntervention;