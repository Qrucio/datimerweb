import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Save, X, UserPlus, MessageCircle, MoreVertical, Shield, Check, Clock, Loader2 } from 'lucide-react';
import Avatar from '../Avatar';

import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';

const ProfileCard = ({ user, currentUser, onClose, isSelf, onAddFriend, onMessage, onProfileUpdate }) => {
    // STATE
    const [isEditing, setIsEditing] = useState(false);
    const [editHandle, setEditHandle] = useState(user.handle || '');
    const [editAbout, setEditAbout] = useState(user.about || '');
    const [isSaving, setIsSaving] = useState(false);

    // HANDLE CHECK STATE
    const [isCheckingHandle, setIsCheckingHandle] = useState(false);
    const [handleAvailable, setHandleAvailable] = useState(null); // null = unknown, true = mobile, false = taken

    // Status Resolution
    const isPro = user.isPro || user.subscription?.plan === 'pro' || user.subscription?.plan === 'flow';
    const isDev = user.isDev;

    // EFFECT: Debounced Handle Check using setTimeout
    useEffect(() => {
        const cleanHandle = editHandle.replace(/@/g, ''); // Ensure clean
        if (!isEditing || cleanHandle === (user.handle || '').replace(/@/g, '')) return; // Don't check own handle
        if (cleanHandle.length < 3) { setHandleAvailable(false); return; }

        setIsCheckingHandle(true);
        const timer = setTimeout(async () => {
            try {
                // RPC Check (Bypasses RLS issues)
                const { data: isAvailable, error } = await supabase
                    .rpc('check_handle', { handle_str: cleanHandle });

                if (error) throw error;
                setHandleAvailable(isAvailable);
            } catch (err) {
                console.error("Handle check failed", err);
                setHandleAvailable(null);
            } finally {
                setIsCheckingHandle(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [editHandle, isEditing, user.handle]);

    // EFFECT: Update local state when prop changes
    useEffect(() => {
        setEditHandle((user.handle || '').replace(/^@+/, '')); // Robust strip
        setEditAbout(user.about || '');
    }, [user]);

    // SAVE HANDLER
    const handleSave = async () => {
        if (!isSelf) return;

        // Blocking Check
        if (handleAvailable === false) {
            alert("Handle is taken. Please choose another.");
            return;
        }

        setIsSaving(true);
        try {
            // Update Profile
            const updates = {
                handle: editHandle.replace(/^@+/, ''), // Ensure clean save
                about: editAbout,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;
            setIsEditing(false);
            // We assume Parent / Realtime will update the UI
        } catch (err) {
            console.error("Profile Save Error:", err);
            alert(`Failed to save profile: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
            if (onProfileUpdate) onProfileUpdate({ handle: editHandle.replace(/^@+/, ''), about: editAbout });
        }
    };

    // RENDER
    return (
        <div className="w-full bg-[#111] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative flex flex-col">
            {/* 1. BANNER */}
            <div className={`h-32 w-full relative ${isPro ? 'bg-gradient-to-r from-cyan-900/40 via-blue-900/40 to-purple-900/40' : 'bg-[#1a1a1a]'}`}>
                {/* Patterns or Pro Gradient */}
                {isPro && (
                    <div className="absolute inset-0 opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
                )}

                {/* Close Button (if modal context) */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors backdrop-blur-sm z-20"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* 2. AVATAR & BADGES */}
            <div className="relative px-6 pb-6 -mt-12 flex flex-col flex-1">
                {/* Avatar with Ring */}
                <div className="relative mb-4">
                    <div className="p-1.5 bg-[#111] rounded-full inline-block">
                        <Avatar userData={user} size="2xl" />
                    </div>
                    {/* Status Indicator (Online/DND/Idle) - Optional implementation */}
                    {/* Badge Row - Removed as requested */}
                    <div className="absolute bottom-2 right-2 flex gap-1">
                        {/* Status icons can go here if needed in future */}
                    </div>
                </div>

                {/* INFO SECTION */}
                <div className="flex-1 flex flex-col gap-6">

                    {/* Header: Name & Handle */}
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            {user.displayName || user.display_name || 'User'}
                            {isPro && (
                                <img
                                    src="/icons/protag.png"
                                    alt="Pro"
                                    className="h-5 w-auto object-contain drop-shadow-sm translate-y-0.5"
                                />
                            )}
                        </h2>
                        {isEditing ? (
                            <div className="mt-2 space-y-2">
                                {/* HANDLE INPUT */}
                                <div className={`flex items-center bg-white/5 border rounded-lg px-3 py-2 transition-colors w-full max-w-[200px] ${isCheckingHandle ? 'border-white/10' :
                                    handleAvailable === true ? 'border-green-500/50 bg-green-500/5' :
                                        handleAvailable === false ? 'border-red-500/50 bg-red-500/5' :
                                            'border-white/10 focus-within:border-white/30'
                                    }`}>
                                    <span className="text-white/40 mr-1">@</span>
                                    <input
                                        type="text"
                                        value={editHandle}
                                        onChange={(e) => {
                                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''); // Enforce format
                                            setEditHandle(val);
                                            setHandleAvailable(null); // Reset status on type
                                        }}
                                        className="bg-transparent outline-none text-white text-sm w-full placeholder:text-white/20"
                                        placeholder="username"
                                        autoCapitalize="none"
                                        autoComplete="off"
                                    />
                                    {isCheckingHandle && <Loader2 size={12} className="animate-spin text-white/30" />}
                                    {!isCheckingHandle && handleAvailable === true && <Check size={14} className="text-green-500" />}
                                    {!isCheckingHandle && handleAvailable === false && <X size={14} className="text-red-500" />}
                                </div>
                                {handleAvailable === false && <p className="text-[10px] text-red-400 pl-1">Handle taken or invalid</p>}
                            </div>
                        ) : (
                            <div className="text-white/40 text-sm font-mono mt-1">@{user.handle?.replace(/^@+/, '') || 'user'}</div>
                        )}
                    </div>

                    {/* Horizontal Rule */}
                    <div className="h-px w-full bg-white/5" />

                    {/* ABOUT SECTION */}
                    <div className="flex-1 min-h-[100px]">
                        <h3 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2">About Me</h3>
                        {isEditing ? (
                            <textarea
                                value={editAbout}
                                onChange={(e) => setEditAbout(e.target.value)}
                                className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-white/30 outline-none resize-none placeholder:text-white/20 custom-scrollbar"
                                placeholder="Write something about yourself..."
                            />
                        ) : (
                            <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                                {user.about || <span className="italic text-white/20">No bio yet.</span>}
                            </div>
                        )}
                    </div>

                    {/* STATS (Optional - Join Date) */}
                    <div className="flex items-center gap-4 text-xs text-white/30">
                        <div className="flex items-center gap-1.5">
                            <Clock size={12} />
                            <span>Joined {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}</span>
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="mt-auto pt-4 flex gap-3">
                        {isSelf ? (
                            isEditing ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-black font-bold text-xs transition-transform active:scale-95 disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        <span>Save Profile</span>
                                    </button>
                                    <button
                                        onClick={() => { setIsEditing(false); setEditHandle(user.handle || ''); setEditAbout(user.about || ''); }}
                                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-transform active:scale-95"
                                >
                                    <Edit2 size={14} />
                                    <span>Edit Profile</span>
                                </button>
                            )
                        ) : (
                            <>
                                {onAddFriend && (
                                    <button
                                        onClick={onAddFriend}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold text-xs transition-colors border border-green-500/30"
                                    >
                                        <UserPlus size={14} />
                                        <span>Add Friend</span>
                                    </button>
                                )}

                            </>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ProfileCard;
