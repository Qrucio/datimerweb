import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Check } from 'lucide-react';
import Avatar from '../Avatar';
import { supabase } from '../../lib/supabase';

/**
 * RoomInviteToast — FIX #9
 * Replaces the ugly `window.confirm()` with a premium glassmorphism toast
 * that slides in from the top when a friend invites the user to a room.
 */
const RoomInviteToast = ({ invite, onAccept, onDecline }) => {
    const [senderProfile, setSenderProfile] = useState(null);

    useEffect(() => {
        if (!invite?.host_id) return;
        const fetchSender = async () => {
            const { data } = await supabase.from('profiles').select('*').eq('id', invite.host_id).single();
            setSenderProfile(data);
        };
        fetchSender();
    }, [invite?.host_id]);

    return (
        <AnimatePresence>
            {invite && (
                <motion.div
                    initial={{ opacity: 0, y: -80, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -80, scale: 0.9 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[90vw] max-w-md"
                >
                    <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                        <div className="flex items-center gap-3">
                            {/* Sender Avatar */}
                            <div className="shrink-0">
                                {senderProfile ? (
                                    <Avatar userData={senderProfile} size="lg" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-white/10 animate-pulse" />
                                )}
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">
                                    {senderProfile?.display_name || 'A friend'} invited you
                                </p>
                                <p className="text-xs text-white/50 flex items-center gap-1 mt-0.5">
                                    <Users size={12} /> Coworking Room
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={onDecline}
                                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-white/50 hover:text-red-400 flex items-center justify-center transition-all active:scale-90"
                                >
                                    <X size={16} />
                                </button>
                                <button
                                    onClick={onAccept}
                                    className="w-9 h-9 rounded-full bg-white hover:bg-green-400 text-black flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                                >
                                    <Check size={16} strokeWidth={3} />
                                </button>
                            </div>
                        </div>

                        {/* Auto-dismiss progress bar */}
                        <motion.div
                            initial={{ scaleX: 1 }}
                            animate={{ scaleX: 0 }}
                            transition={{ duration: 30, ease: 'linear' }}
                            onAnimationComplete={onDecline}
                            className="h-0.5 bg-white/20 rounded-full mt-3 origin-left"
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default RoomInviteToast;
