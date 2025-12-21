import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Hash, Crown, Shield, UserPlus, UserMinus, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Avatar from '../Avatar';
import CloseButton from '../ui/CloseButton';
import LiquidButton from '../ui/LiquidButton';
import { getIconById } from '../../utils/iconOptions';
import ChatArea from '../chat/ChatArea';

const ServerView = ({ server, user, onClose, members = [], friends = [], onInvite, onMemberUpdate, isFocusing, onMarkRead, getLastReadTime, onViewProfile, onMentionClick }) => {
    // SAFETY CHECK: If server is missing (e.g. just kicked), don't crash
    if (!server) return null;

    const [activeTab, setActiveTab] = useState('chat'); // Default to Chat? Or Leaderboard? Chat seems primary now.
    const [adminHoverId, setAdminHoverId] = useState(null);

    // MARK READ ON CHAT TAB
    useEffect(() => {
        if (activeTab === 'chat' && onMarkRead && server) {
            onMarkRead(server.id);
        }
    }, [activeTab, onMarkRead, server]);

    // Resolve Read Time
    const currentReadTime = getLastReadTime ? getLastReadTime(server.id) : new Date(0);

    // MAP MEMBERS TO RICH DATA (Profiles/Status)
    // We prioritize Friend data (rich status), fallback to server member profile data
    // HELPER: Calculate Status (Matches App.jsx logic)
    const calculateMemberStatus = (profile, now) => {
        if (!profile || !profile.timer_state) return { status: 'offline', statusText: 'Offline', isOnline: false };

        const { mode, startTime, duration, lastUpdated } = profile.timer_state;

        // Stale check (e.g. 24h)
        if (now - new Date(lastUpdated).getTime() > 24 * 60 * 60 * 1000) {
            return { status: 'offline', statusText: 'Offline', isOnline: false };
        }

        if (mode === 'focus' && startTime) {
            const elapsed = Math.floor((now - new Date(startTime).getTime()) / 60000);
            // If duration is set, show remaining? Or just elapsed? 
            // FriendView usually shows Elapsed for Focus or Duration?
            // Let's match the screenshot: "Focus • 49m" (Likely elapsed or remaining)
            // If calculateFriendStatus is standard, it probably does:
            let timeDisplay = `${elapsed}m`;
            if (duration) {
                const remaining = Math.max(0, duration - elapsed);
                timeDisplay = `${remaining}m`;
            }
            return { status: 'focus', statusText: `Focus • ${timeDisplay}`, isOnline: true };
        }

        if (mode === 'break' && startTime) {
            const elapsed = Math.floor((now - new Date(startTime).getTime()) / 60000);
            return { status: 'break', statusText: `Break • ${elapsed}m`, isOnline: true };
        }

        if (mode === 'idle') return { status: 'online', statusText: 'Online', isOnline: true };

        return { status: 'offline', statusText: 'Offline', isOnline: false };
    };

    const now = Date.now();

    const resolvedMembers = members.map(m => {
        // 1. Friend (Detailed Status already computed in App.jsx)
        const friend = friends.find(f => f.uid === m.user_id);
        if (friend) {
            return {
                ...friend,
                role: m.role,
                // Ensure statusText is populated if FriendView uses different keys
                statusText: friend.statusText || (friend.status === 'focus' ? `Focus • ${friend.stats?.dailyFocusTime || 0}m` : friend.status)
                // Actually, let's rely on calculating it fresh if needed or respecting what App.jsx passed
            };
        }

        // 2. You
        if (m.user_id === user.uid) {
            return {
                uid: user.uid,
                displayName: 'You',
                handle: user?.handle || '@you',
                avatarUrl: user.user_metadata?.avatar_url,
                isOnline: true,
                status: 'online',
                statusText: 'Online',
                role: m.role
            };
        }

        // 3. Non-Friend (Calculate from Profile)
        if (m.profile) {
            const computed = calculateMemberStatus(m.profile, now);
            return {
                uid: m.user_id,
                displayName: m.profile.display_name,
                handle: m.profile.handle,
                avatarUrl: m.profile.photo_url,
                isPro: m.profile.is_pro,
                role: m.role,
                ...computed
            };
        }

        // 4. Unknown
        return {
            uid: m.user_id,
            displayName: 'Unknown User',
            handle: '@user',
            isOnline: false,
            status: 'offline',
            statusText: 'Offline',
            role: m.role
        };
    });

    const onlineCount = resolvedMembers.filter(m => m.isOnline).length;
    const currentUserRole = resolvedMembers.find(m => m.uid === user.uid)?.role;
    const isOwner = currentUserRole === 'owner';
    const isAdmin = currentUserRole === 'admin';

    // SERVER ACTIONS
    const handleKick = async (uid) => {
        // REMOVED window.confirm as requested
        console.log("Attempting to kick user:", uid, "from server:", server.id);
        try {
            // Include select() to get the deleted row back, confirming it actually happened
            const { data, error } = await supabase
                .from('server_members')
                .delete()
                .eq('server_id', server.id)
                .eq('user_id', uid)
                .select();

            if (error) {
                console.error("Kick Error from DB:", error);
                alert("Failed to kick user: " + error.message);
            } else if (!data || data.length === 0) {
                // RLS Blocked It
                console.error("Kick Failed: 0 rows deleted. RLS Policy likely blocking 'Owner' delete.");
                alert("Kick failed! You might not have permission (Check Database RLS Policies).");
            } else {
                console.log("Kick successful, deleted:", data);
                if (onMemberUpdate) onMemberUpdate();
            }
        } catch (e) { console.error("Kick Exception:", e); }
    };

    const handlePromote = async (uid) => {
        // LiquidButton handles the confirmation UI, so we just do the logic
        console.log("Promoting user:", uid, "in server:", server.id);
        try {
            const { data, error } = await supabase
                .from('server_members')
                .update({ role: 'admin' })
                .eq('server_id', server.id)
                .eq('user_id', uid)
                .select();

            if (error) {
                console.error("Promote Error:", error);
                alert("Failed to promote: " + error.message);
            } else {
                console.log("Promoted:", data);
                if (onMemberUpdate) onMemberUpdate();
            }
        } catch (e) { console.error(e); }
    };

    const tabs = [
        { id: 'chat', label: 'Chat', icon: MessageCircle },
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
        { id: 'members', label: 'Members', icon: Users },
        // Removed Settings Tab as requested
    ];

    const currentUserMember = members.find(m => m.user_id === user.uid);
    const userRole = currentUserMember?.role;

    return (
        <div className="flex flex-col h-full w-full bg-[#111]">
            {/* SERVER HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0 h-[70px]">
                {/* HEADER */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-2xl">
                        {(() => {
                            const iconUrl = server.icon_url;
                            if (iconUrl && iconUrl.startsWith('lucide:')) {
                                const iconId = iconUrl.split(':')[1];
                                const IconComp = getIconById(iconId);
                                if (IconComp) return <IconComp size={24} className="text-white" />;
                            }
                            return iconUrl ? (
                                <img src={iconUrl} alt={server.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="font-bold text-lg">{server.name.substring(0, 2).toUpperCase()}</span>
                            );
                        })()}
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-lg leading-tight tracking-tight">{server.name}</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.4)]"></span>
                            <span className="text-[11px] font-bold text-white/30 uppercase tracking-wider">{resolvedMembers.length} members</span>
                        </div>
                    </div>
                </div>
                {/* Invite Button - Restricted to Owner AND Admin */}
                <div className="flex items-center">
                    {(isOwner || isAdmin) && (
                        <button
                            onClick={onInvite}
                            className="p-2.5 rounded-full bg-white text-black hover:bg-gray-200 transition-colors shadow-lg shadow-white/10 mr-2"
                            title="Add Members"
                        >
                            <UserPlus size={18} strokeWidth={2.5} />
                        </button>
                    )}
                    {onClose && <CloseButton onClick={onClose} />}
                </div>
            </div>

            {/* TAB CONTENT AREA */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                <AnimatePresence mode="wait">
                    {activeTab === 'chat' && (
                        <motion.div
                            key="chat"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex-1 overflow-hidden"
                        >
                            <ChatArea
                                serverId={server.id}
                                user={user}
                                isFocusing={isFocusing}
                                userRole={userRole}
                                lastReadTime={currentReadTime}
                                onViewProfile={onViewProfile}
                                onMentionClick={onMentionClick}
                                members={resolvedMembers}
                            />
                        </motion.div>
                    )}

                    {activeTab === 'leaderboard' && (
                        <motion.div
                            key="leaderboard"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="p-6 flex-1 overflow-y-auto custom-scrollbar"
                        >
                            {members.length < 3 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                        <Users size={32} className="text-white/30" />
                                    </div>
                                    <h4 className="text-white font-bold mb-2">Leaderboard Locked</h4>
                                    <p className="text-xs text-white/40 max-w-[200px] leading-relaxed mb-6">
                                        You need at least <span className="text-white font-bold">3 members</span> in this server to unlock the leaderboard.
                                    </p>
                                    {isOwner && (
                                        <button
                                            onClick={onInvite}
                                            className="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            Add Members
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg shadow-white/10">
                                            <Trophy size={22} fill="black" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold text-sm">Weekly Leaderboard</h4>
                                            <p className="text-xs text-white/50 mt-0.5">Top focus time this week</p>
                                        </div>
                                    </div>

                                    <div className="text-center py-10 text-white/20 text-sm italic font-medium">
                                        Leaderboard coming soon...
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                    {activeTab === 'members' && (
                        <motion.div
                            key="members"
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="p-6 flex-1 overflow-y-auto custom-scrollbar"
                        >
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Online - {onlineCount}</h4>
                                    {isOwner && (
                                        <button onClick={onInvite} className="text-[10px] font-bold text-white hover:text-white/70 transition-colors flex items-center gap-1">
                                            <UserPlus size={12} /> ADD
                                        </button>
                                    )}
                                </div>

                                {resolvedMembers.map(m => (
                                    <div
                                        key={m.uid}
                                        className="bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 rounded-xl p-3 flex items-center justify-between transition-all group cursor-pointer relative"
                                        onMouseEnter={() => setAdminHoverId(m.uid)}
                                        onMouseLeave={() => setAdminHoverId(null)}
                                    >
                                        <div className="flex items-center gap-3 pointer-events-none">
                                            <div className="relative">
                                                <Avatar userData={m} size="md" />
                                                {/* Online Indicator if needed, but the status dot below covers it usually. 
                                                    FriendView puts the dot in the text line below. 
                                                    ServerView previously put it on the avatar. 
                                                    I will remove it from Avatar to match FriendView exactly. */}
                                            </div>
                                            <div className="flex flex-col justify-center">
                                                <div className="flex items-baseline gap-2 mb-1">
                                                    <span className="text-sm font-medium text-white leading-none flex items-center gap-1.5">
                                                        {m.displayName}
                                                        {m.role === 'owner' && <Crown size={10} className="text-yellow-500 fill-yellow-500" />}
                                                        {m.role === 'admin' && <Shield size={10} className="text-blue-400 fill-blue-400" />}
                                                    </span>
                                                    <span className="text-xs text-white/50">{m.handle}</span>
                                                </div>
                                                <div className="text-[10px] text-white/50 flex items-center gap-1.5">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'focus' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]'
                                                        : m.status === 'break' ? 'bg-orange-500'
                                                            : m.isOnline ? 'bg-green-500'
                                                                : 'bg-gray-600'}`}></span>
                                                    <span className={m.status === 'focus' ? 'text-green-400' : m.status === 'break' ? 'text-orange-400' : ''}>
                                                        {m.statusText}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ADMIN TOOLS (Only visible for Owner/Admin) */}
                                        <div className="flex items-center gap-1 h-8">
                                            {isOwner && m.uid !== user.uid && (
                                                <div className={`flex items-center gap-2 transition-opacity duration-200 ${adminHoverId === m.uid ? 'opacity-100' : 'opacity-0'}`}>
                                                    {/* HIDDEN ADMIN BUTTON AS REQUESTED
                                                    <LiquidButton
                                                        icon={Shield}
                                                        label="Admin?"
                                                        variant="success"
                                                        onConfirm={() => handlePromote(m.uid)}
                                                    />
                                                    */}
                                                    <LiquidButton
                                                        icon={UserMinus}
                                                        label="Kick?"
                                                        variant="danger"
                                                        onConfirm={() => handleKick(m.uid)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                    {activeTab === 'settings' && (
                        <div className="p-8 text-center text-white/30 text-sm font-medium">Settings coming soon</div>
                    )}
                </AnimatePresence>
            </div>

            {/* BOTTOM TABS - PILL NAVIGATION */}
            <div className="flex justify-center p-6 bg-[#111] shrink-0">
                <div className="inline-flex p-1 bg-white/5 rounded-full border border-white/5 relative">
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors z-10 ${isActive ? 'text-black' : 'text-white/40 hover:text-white'}`}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="serverTabPill"
                                        className="absolute inset-0 bg-white rounded-full shadow-lg z-[-1]"
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                                <tab.icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ServerView;
