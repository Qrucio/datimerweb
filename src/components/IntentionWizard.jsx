import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Droplets, Smartphone, Armchair, ChevronRight } from 'lucide-react';


const IntentionWizard = ({ onComplete, onCancel }) => {
    const [step, setStep] = useState(1);
    const [task, setTask] = useState('');
    const [time, setTime] = useState('');
    const [checklist, setChecklist] = useState({
        water: false,
        comfort: false,
        environment: false
    });

    const handleNext = () => {
        if (step === 1 && (!task || !time)) return; // Validation
        if (step < 3) {
            setStep(prev => prev + 1);
        } else {
            // FIXED: Pass arguments separately
            onComplete(task, time);
        }
    };

    const toggleCheck = (item) => {
        setChecklist(prev => ({ ...prev, [item]: !prev[item] }));
    };

    const allChecked = Object.values(checklist).every(Boolean);

    // Animation variants... (kept same)
    const slideVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction) => ({
            x: direction < 0 ? 50 : -50,
            opacity: 0
        })
    };

    return (
        // FIXED: Reduced opacity (bg-black/80 -> bg-black/60)
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md">
            {/* Close/Cancel button */}
            <button
                onClick={onCancel}
                className="absolute top-6 right-6 p-2 text-white/30 hover:text-white transition-colors"
            >
                Cancel
            </button>

            <div className="w-full max-w-lg p-8">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex flex-col gap-8 text-center"
                        >
                            <div>
                                <h2 className="text-3xl font-serif-display text-white mb-2">What is your intention?</h2>
                                <p className="text-white/50">Define your focus for this session.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2 text-left">
                                    <label className="text-xs font-medium text-white/40 uppercase tracking-widest pl-1">I want to work on</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={task}
                                        onChange={(e) => setTask(e.target.value)}
                                        placeholder="writing my novel..."
                                        className="w-full bg-transparent border-b border-white/20 py-3 text-xl md:text-2xl text-white placeholder-white/20 focus:outline-none focus:border-white/60 transition-colors font-serif-display"
                                    />
                                </div>

                                <div className="space-y-2 text-left">
                                    <label className="text-xs font-medium text-white/40 uppercase tracking-widest pl-1">For</label>
                                    <input
                                        type="text"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        placeholder="2 hours"
                                        className="w-full bg-transparent border-b border-white/20 py-3 text-xl md:text-2xl text-white placeholder-white/20 focus:outline-none focus:border-white/60 transition-colors font-serif-display"
                                    />
                                    <p className="text-xs text-white/30">We'll handle the breaks nicely.</p>
                                </div>
                            </div>

                            <button
                                disabled={!task || !time}
                                onClick={handleNext}
                                className="mt-4 group flex items-center justify-center gap-2 w-full py-4 bg-white text-black font-medium text-lg rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Next <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex flex-col gap-8"
                        >
                            <div className="text-center">
                                <h2 className="text-3xl font-serif-display text-white mb-2">Prepare your space</h2>
                                <p className="text-white/50">Ensure you have everything you need.</p>
                            </div>

                            {/* FIXED: Box/Card Styling & Emojis */}
                            <div className="flex flex-col gap-3 bg-white/5 p-6 rounded-3xl border border-white/10">
                                <CheckItem
                                    label="Water bottle filled"
                                    emoji="💧"
                                    checked={checklist.water}
                                    onClick={() => toggleCheck('water')}
                                />
                                <CheckItem
                                    label="Seated comfortably"
                                    emoji="🪑"
                                    checked={checklist.comfort}
                                    onClick={() => toggleCheck('comfort')}
                                />
                                <CheckItem
                                    label="Distractions removed"
                                    emoji="🔕"
                                    checked={checklist.environment}
                                    onClick={() => toggleCheck('environment')}
                                />
                            </div>

                            <button
                                disabled={!allChecked}
                                onClick={handleNext}
                                className="mt-4 group flex items-center justify-center gap-2 w-full py-4 bg-white text-black font-medium text-lg rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Next <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex flex-col gap-8 text-center"
                        >
                            <div className="flex justify-center mb-4">
                                <div className="p-4 rounded-full bg-white/5 animate-pulse text-white/80">
                                    <Smartphone size={40} />
                                </div>
                            </div>

                            <div>
                                <h2 className="text-3xl font-serif-display text-white mb-4">Disconnect to Connect</h2>
                                <p className="text-white/60 text-lg leading-relaxed max-w-sm mx-auto">
                                    Put your phone away. Silence notifications. This time is for you and your intention.
                                </p>
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={handleNext}
                                    className="group flex items-center justify-center gap-2 w-full py-4 bg-white text-black font-bold text-lg rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                                >
                                    Start Session <div className="p-1 bg-black text-white rounded-full"><ArrowRight size={14} /></div>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Step Indicators */}
                <div className="flex justify-center gap-2 mt-8">
                    {[1, 2, 3].map(i => (
                        <div
                            key={i}
                            className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-white' : i < step ? 'w-2 bg-white/50' : 'w-2 bg-white/20'}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

const CheckItem = ({ label, emoji, checked, onClick }) => (
    <div
        onClick={onClick}
        className={`
      flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-300
      ${checked
                ? 'bg-white/10 border-white/30'
                : 'bg-transparent border-white/5 hover:bg-white/5 hover:border-white/10'
            }
    `}
    >
        <div className={`
      w-6 h-6 rounded-full border flex items-center justify-center transition-colors flex-shrink-0
      ${checked ? 'bg-white border-white' : 'border-white/30'}
    `}>
            {checked && <Check size={14} className="text-black" />}
        </div>

        <div className="flex items-center gap-3 text-white">
            <span className="text-xl">{emoji}</span>
            <span className={`text-lg font-medium transition-opacity ${checked ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
        </div>
    </div>
);

export default IntentionWizard;
