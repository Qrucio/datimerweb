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
const RoomInviteToast = ({ invite, onAccept, onDecline, onDismiss }) => {
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
            {invite && senderProfile && (
                <motion.div
                    initial={{ opacity: 0, x: -50, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -50, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative w-[320px] mb-3 pointer-events-auto"
                >
                    <div className="bg-black/90 backdrop-blur-3xl border border-white/10 rounded-2xl p-3 shadow-2xl overflow-hidden">
                        <div className="flex items-center gap-3">
                            {/* Sender Avatar */}
                            <div className="shrink-0">
                                {senderProfile ? (
                                    <Avatar userData={senderProfile} size="md" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
                                )}
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {senderProfile?.display_name || 'A friend'}
                                </p>
                                <p className="text-xs text-white/50 flex items-center gap-1 mt-0.5">
                                    <Users size={12} /> Coworking Invite
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={onDecline}
                                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all active:scale-90"
                                >
                                    <X size={14} />
                                </button>
                                <button
                                    onClick={onAccept}
                                    className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                                >
                                    <Check size={14} strokeWidth={3} />
                                </button>
                            </div>
                        </div>

                        {/* Auto-dismiss progress bar */}
                        <motion.div
                            initial={{ scaleX: 1 }}
                            animate={{ scaleX: 0 }}
                            transition={{ duration: 30, ease: 'linear' }}
                            onAnimationComplete={() => {
                                if (onDismiss) {
                                    onDismiss();
                                } else {
                                    onDecline();
                                }
                            }}
                            className="absolute bottom-0 left-0 h-0.5 bg-white/30 rounded-full origin-left w-full"
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default RoomInviteToast;
