import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
    X, Check, Zap, StickyNote, Gamepad2, CloudRain, Music, Crown,
    Sparkles, ArrowRight, Star
} from 'lucide-react';
import { FlowTag } from '../ui/FlowTag';

const FEATURE_CONFIG = {
    notes: {
        id: 'notes',
        title: "Unlimited Thinking",
        subtitle: "Unlock Unlimited Notes",
        description: "Capture every idea without limits. Create infinite notes, organize with advanced tags, and never lose a thought again.",
        image: "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=1000",
        icon: StickyNote
    },
    arcade: {
        id: 'arcade',
        title: "Play & Recharge",
        subtitle: "Unlock The Arcade",
        description: "Access exclusive games designed to reboot your brain. compete on global leaderboards and challenge friends.",
        image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1000",
        icon: Gamepad2
    },
    ambience: {
        id: 'ambience',
        title: "Sonic Immersion",
        subtitle: "Unlock Full Ambience",
        description: "Access the complete sound library. Mix unlimited sounds to create your perfect focus environment.",
        image: "https://images.unsplash.com/photo-1519834785169-98be25ec3f84?auto=format&fit=crop&q=80&w=1000",
        icon: CloudRain
    },
    music: {
        id: 'music',
        title: "Deep Focus",
        subtitle: "Unlock Focus Music",
        description: " scientifically curated binaural beats and lofi streams. High-fidelity audio to keep you in the zone.",
        image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1000",
        icon: Music
    },
    settings: {
        id: 'settings',
        title: "Ultimate Control",
        subtitle: "Unlock Everything",
        description: "Get full access to all customization options, themes, and premium features.",
        image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1000",
        icon: Crown
    },
    personalities: {
        id: 'personalities',
        title: "AI Companions",
        subtitle: "Unlock Personalities",
        description: "Focus with different AI personalities. From strict drill sergeants to supportive coaches.",
        image: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?auto=format&fit=crop&q=80&w=1000",
        icon: Sparkles
    }
};

const ALL_FEATURES = [
    { label: "Unlimited Notes & Tags", icon: StickyNote },
    { label: "Full Ambience Library", icon: CloudRain },
    { label: "Exclusive Arcade Games", icon: Gamepad2 },
    { label: "Focus Music Channels", icon: Music },
    { label: "Premium Customization", icon: Crown },
    { label: "Priority AI Support", icon: Zap },
];

const GetProModal = ({ isOpen, onClose, onUpgrade, source = 'notes' }) => {
    // Determine primary feature to show based on source
    const primaryFeature = FEATURE_CONFIG[source] || FEATURE_CONFIG.settings;

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-all"
                    />

                    {/* Modal Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                        className="relative w-full max-w-4xl bg-[#0A0A0A] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] md:max-h-[600px]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* CLOSE BUTTON */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/20 hover:bg-white/10 text-white/50 hover:text-white transition-colors backdrop-blur-md border border-white/5"
                        >
                            <X size={20} />
                        </button>

                        {/* LEFT SIDE: VISUAL & MEDIA */}
                        <div className="relative w-full md:w-5/12 h-64 md:h-auto overflow-hidden group">
                            {/* Main Image/Video */}
                            <div className="absolute inset-0 bg-black">
                                <img
                                    src={primaryFeature.image}
                                    alt={primaryFeature.title}
                                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-[#0A0A0A]" />
                            </div>

                            {/* Float Content over Image */}
                            <div className="absolute bottom-6 left-6 right-6 z-10">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/20 backdrop-blur-md border border-cyan-500/30 rounded-full mb-3 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                                    <Sparkles size={12} className="text-cyan-400 fill-cyan-400" />
                                    <span className="text-[10px] font-bold text-cyan-100 uppercase tracking-widest">Premium Feature</span>
                                </div>
                                <h3 className="text-3xl md:text-4xl font-serif-display text-white mb-2 leading-tight">
                                    {primaryFeature.title}
                                </h3>
                            </div>
                        </div>

                        {/* RIGHT SIDE: CONTENT & BENEFITS */}
                        <div className="flex-1 p-6 md:p-10 flex flex-col relative bg-[#0A0A0A]">
                            {/* Premium Badge Top Right (Desktop) */}
                            <div className="hidden md:flex absolute top-10 right-10">
                                <img src="/icons/protag.png" alt="Pro" className="h-6 w-auto opacity-80" />
                            </div>

                            <div className="mb-6 md:mb-8">
                                <h4 className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Zap size={14} className="fill-current" />
                                    Unlock Limitless Potential
                                </h4>
                                <p className="text-white/80 text-lg leading-relaxed font-light">
                                    {primaryFeature.description}
                                </p>
                            </div>

                            {/* ALL FEATURES GRID */}
                            <div className="grid grid-cols-2 gap-3 mb-8 overflow-y-auto custom-scrollbar md:pr-2">
                                {ALL_FEATURES.map((feat, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                                        <div className={`p-2 rounded-lg ${feat.label.includes(primaryFeature.title) ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/40 group-hover:text-white/60'}`}>
                                            <feat.icon size={16} />
                                        </div>
                                        <span className={`text-sm font-medium ${feat.label.includes(primaryFeature.title) ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}>
                                            {feat.label}
                                        </span>
                                        {/* Checkmark if needed, or just keep distinct style */}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-auto pt-6 border-t border-white/10 flex flex-col gap-3">
                                <button
                                    onClick={onUpgrade}
                                    className="w-full relative group overflow-hidden rounded-2xl p-[1px]"
                                >
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 opacity-80 group-hover:opacity-100"
                                        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                        style={{ backgroundSize: "200% 200%" }}
                                    />
                                    <div className="relative bg-black h-full rounded-2xl px-6 py-4 flex items-center justify-between group-hover:bg-black/90 transition-colors">
                                        <div className="flex flex-col items-start gap-1">
                                            <span className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
                                                Get <FlowTag className="h-4 w-auto brightness-200" />
                                            </span>
                                            <span className="text-white/50 text-xs uppercase tracking-widest font-medium">Unlock All Features</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <span className="block text-white font-bold text-xl">$4.99</span>
                                                <span className="block text-white/40 text-[10px] uppercase font-bold tracking-widest">/ Lifetime</span>
                                            </div>
                                            <ArrowRight className="text-white group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </button>

                                <p className="text-center text-white/30 text-[10px] uppercase tracking-widest font-bold">
                                    One-time payment • No subscription
                                </p>
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default GetProModal;
