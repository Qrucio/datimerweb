import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ban, Bell, Loader2, UserPlus, Check, UserMinus, Pin, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Avatar from '../Avatar';
import CloseButton from '../ui/CloseButton';
import { getIconById } from '../../utils/iconOptions';

import LiquidButton from '../ui/LiquidButton';

const FriendView = ({
    user, friends, friendRequests, onSendRequest, onAcceptRequest, onDeclineRequest,
    onBlockUser, onUnblockUser, checkOutgoingRequest, onRemoveFriend, onTogglePin,
    onViewStats, onSearchUsers, blockedUsers, onClose, onServerJoined
}) => {
    const [view, setView] = useState('list');
    const [searchText, setSearchText] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [rawSearchResults, setRawSearchResults] = useState([]);
    const [requestStatuses, setRequestStatuses] = useState({});
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [acceptingIds, setAcceptingIds] = useState({});
    const [serverInvites, setServerInvites] = useState([]);

    // FETCH INVITES (Manual Join for robustness)
    const fetchInvites = async () => {
        // 1. Fetch Invites
        const { data: invites, error } = await supabase
            .from('server_invites')
            .select(`
                id,
                sender_id,
                server:servers(id, name, icon_url)
            `)
            .eq('receiver_id', user.uid)
            .eq('status', 'pending');

        if (error) {
            console.error("Fetch invites error:", error);
            return;
        }

        if (invites && invites.length > 0) {
            // 2. Fetch Sender Profiles
            const senderIds = [...new Set(invites.map(i => i.sender_id))];
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, display_name, photo_url')
                .in('id', senderIds);

            const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

            // 3. Merge
            const richInvites = invites.map(inv => ({
                ...inv,
                sender: profileMap.get(inv.sender_id) || { display_name: 'Unknown', photo_url: null }
            }));
            setServerInvites(richInvites);
        } else {
            setServerInvites([]);
        }
    };

    useEffect(() => {
        fetchInvites();
    }, [user]);

    const handleAcceptServer = async (inviteId) => {
        setAcceptingIds(prev => ({ ...prev, [inviteId]: true }));
        try {
            const { error } = await supabase.rpc('accept_server_invite', { invite_id: inviteId });
            if (error) {
                console.error("Join Failed", error);
                alert("Failed to join: " + error.message);
            } else {
                console.log("Joined server!");
                // Refresh Invites List
                setServerInvites(prev => prev.filter(i => i.id !== inviteId));
                // Toggle Sidebar Refresh
                if (onServerJoined) onServerJoined();
            }
        } catch (e) {
            console.error("Failed to accept invite", e);
        } finally {
            setAcceptingIds(prev => ({ ...prev, [inviteId]: false }));
        }
    };

    const handleDeclineServer = async (inviteId) => {
        try {
            const { error, count } = await supabase
                .from('server_invites')
                .delete()
                .eq('id', inviteId)
                .select('id', { count: 'exact' }); // Select to check if it actually deleted

            if (error) {
                console.error("Failed to delete invite:", error);
                alert("Failed to decline: " + error.message);
                return;
            }

            // If count is 0, it means it didn't find the row OR RLS blocked it silently.
            // But we'll remove it from UI anyway to be responsive, but warn in console.
            console.log("Deleted invite count:", count);

            setServerInvites(prev => prev.filter(i => i.id !== inviteId));
        } catch (e) {
            console.error("Failed to decline", e);
        }
    };

    // ... rest of component logic ...

    // MERGE requests for display
    // We'll render Server Invites above Friend Requests
    // ... logic below ...
    const handleAcceptClick = async (req) => {
        const id = req.uid;
        setAcceptingIds(prev => ({ ...prev, [id]: true }));
        try { await onAcceptRequest(req); } catch (e) { console.error(e); } finally {
            setAcceptingIds(prev => { const next = { ...prev }; delete next[id]; return next; });
        }
    };

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!searchText.trim()) { setRawSearchResults([]); setSearchPerformed(false); return; }
            setIsSearching(true);
            const results = await onSearchUsers(searchText);
            setIsSearching(false); setRawSearchResults(results); setSearchPerformed(true);
            if (results.length > 0) {
                const statuses = {};
                for (const res of results) { const isSent = await checkOutgoingRequest(res.uid); statuses[res.uid] = isSent ? 'sent' : 'none'; }
                setRequestStatuses(statuses);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [searchText, onSearchUsers, checkOutgoingRequest, blockedUsers]);

    const filteredSearchResults = rawSearchResults.filter(result => !friends.some(friend => friend.uid === result.uid) && result.uid !== user.uid);

    const handleSendRequest = async (targetUser) => {
        setRequestStatuses(prev => ({ ...prev, [targetUser.uid]: 'sent' }));
        const result = await onSendRequest(targetUser);
        if (!result.success) { setRequestStatuses(prev => ({ ...prev, [targetUser.uid]: 'none' })); setErrorMsg(result.error); setTimeout(() => setErrorMsg(null), 3000); }
    };

    const handleBlock = async (targetUser) => {
        await onBlockUser(targetUser);
        if (friendRequests.some(req => req.uid === targetUser.uid)) { onDeclineRequest(targetUser.uid); }
        setRawSearchResults(prev => prev.filter(r => r.uid !== targetUser.uid));
    };

    const sortedFriends = [...friends].sort((a, b) => { if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1; if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1; return 0; });

    // Framer Motion Variants
    const slideVariants = { enter: { opacity: 0, x: 20 }, center: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } };

    return (
        <div className="flex flex-col h-full w-full">
            {/* --- HEADER --- */}
            <div className="flex justify-between items-center mb-6 shrink-0 px-2">
                <h3 className="text-xl font-medium text-white flex items-center gap-2">
                    Friends
                </h3>
                <div className="flex gap-2">
                    <button onClick={() => setView(view === 'blocked' ? 'list' : 'blocked')} className={`p-2 rounded-full transition-colors ${view === 'blocked' ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-white/50 hover:text-white'}`} title="Blocked Users"> <Ban size={20} /> </button>
                    <button onClick={() => setView(view === 'requests' ? 'list' : 'requests')} className={`relative p-2 rounded-full transition-colors ${view === 'requests' ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:text-white'}`}> <Bell size={20} /> {(friendRequests.length > 0 || serverInvites.length > 0) && view !== 'requests' && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-[#111]" />} </button>
                    {onClose && <CloseButton onClick={onClose} />}
                </div>
            </div>

            {/* --- SCROLLABLE CONTENT --- */}
            <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
                <AnimatePresence mode="wait">
                    {view === 'blocked' && (
                        <motion.div key="blocked" variants={slideVariants} initial="enter" animate="center" exit="exit">
                            <div className="flex items-center justify-between mb-4"> <h4 className="text-xs uppercase tracking-widest text-red-400 font-bold">Blocked Users</h4> </div>
                            {!blockedUsers || blockedUsers.length === 0 ? <div className="text-center py-12 text-white/20 text-sm italic">No blocked users.</div> : (
                                <div className="flex flex-col gap-2"> {blockedUsers.map(bUser => (
                                    <div key={bUser.uid} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3 opacity-70"> <Avatar userData={bUser} size="md" /> <div className="flex flex-col"> <span className="text-sm font-bold text-white">{bUser.displayName}</span> <span className="text-[10px] text-white/50">Blocked</span> </div> </div>
                                        <button onClick={() => onUnblockUser(bUser.uid)} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold rounded-lg transition-colors"> UNBLOCK </button>
                                    </div>
                                ))} </div>
                            )}
                        </motion.div>
                    )}

                    {view === 'requests' && (
                        <motion.div key="requests" variants={slideVariants} initial="enter" animate="center" exit="exit">
                            <div className="flex items-center justify-between mb-4"> <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold">Pending Requests</h4> <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/60">{friendRequests.length + serverInvites.length}</span> </div>

                            {(friendRequests.length === 0 && serverInvites.length === 0) ? <div className="text-center py-12 text-white/20 text-sm italic">No pending requests.</div> : (
                                <div className="flex flex-col gap-2">
                                    {/* SERVER INVITES */}
                                    {serverInvites.map(invite => (
                                        <div key={invite.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {/* Server Icon */}
                                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/50 overflow-hidden shrink-0">
                                                    {(() => {
                                                        const iconUrl = invite.server?.icon_url;
                                                        if (iconUrl && iconUrl.startsWith('lucide:')) {
                                                            const iconId = iconUrl.split(':')[1];
                                                            const IconComp = getIconById(iconId);
                                                            if (IconComp) return <IconComp size={20} className="text-white" />;
                                                        }
                                                        return iconUrl ? (
                                                            <img src={iconUrl} alt="Server" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="font-bold text-xs">{invite.server?.name?.substring(0, 2).toUpperCase()}</span>
                                                        );
                                                    })()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white leading-tight">You've been invited to join {invite.server?.name}</div>
                                                    <div className="text-xs text-white/40">{invite.sender?.display_name || 'Someone'} invited you to join this server!</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <LiquidButton
                                                    icon={Check}
                                                    label="Join"
                                                    variant="success"
                                                    onConfirm={() => handleAcceptServer(invite.id)}
                                                />
                                                <LiquidButton
                                                    icon={X}
                                                    label="Decline"
                                                    variant="danger"
                                                    onConfirm={() => handleDeclineServer(invite.id)}
                                                />
                                            </div>
                                        </div>
                                    ))}

                                    {friendRequests.map(req => (
                                        <div key={req.uid} className="bg-white/10 border border-white/20 rounded-xl p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3"> <Avatar userData={req} size="md" /> <div className="flex flex-col md:flex-row md:items-baseline md:gap-2"> <span className="text-sm font-bold text-white">{req.displayName}</span> <span className="text-xs text-white/50 font-medium">{req.handle}</span> </div> </div>
                                            <div className="flex gap-3 pr-2 items-center"> <LiquidButton icon={Ban} label="Block?" variant="danger" onConfirm={() => handleBlock(req)} /> <LiquidButton icon={X} label="Deny?" variant="danger" onConfirm={() => onDeclineRequest(req.uid)} /> <button onClick={() => handleAcceptClick(req)} disabled={acceptingIds[req.uid]} className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-green-400 hover:scale-110 transition-all shadow-md z-20 disabled:opacity-50 disabled:cursor-not-allowed">{acceptingIds[req.uid] ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={3} />}</button> </div>
                                        </div>
                                    ))} </div>
                            )}
                        </motion.div>
                    )}

                    {view === 'list' && (
                        <motion.div key="list" variants={slideVariants} initial="enter" animate="center" exit="exit">
                            <div className="mb-4 relative"> <div className="relative z-10"> <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Find users..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-white/30 transition-colors" /> <div className="absolute right-2 top-2 p-1.5 text-white/30"> {isSearching ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} </div> </div> </div>
                            {errorMsg && <p className="text-red-400 text-xs mb-4 ml-1">{errorMsg}</p>}
                            {filteredSearchResults.length > 0 && (
                                <div className="mb-6 animate-fade-in"> <h4 className="text-xs uppercase tracking-widest text-white/40 mb-2 font-medium">Found Users</h4> <div className="flex flex-col gap-2"> {filteredSearchResults.map(result => {
                                    const isSent = requestStatuses[result.uid] === 'sent';
                                    return (
                                        <div key={result.uid} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3"> <Avatar userData={result} size="md" /> <div className="flex items-baseline gap-2"> <span className="text-sm font-bold text-white leading-tight">{result.displayName}</span> <span className="text-xs text-white/50">{result.handle}</span> </div> </div>
                                            <div className="flex items-center gap-2"> <LiquidButton icon={Ban} label="Block?" variant="danger" onConfirm={() => handleBlock(result)} /> {isSent ? <button disabled className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500 text-black shadow-[0_0_10px_rgba(34,197,94,0.4)] transition-all scale-100 cursor-default"> <Check size={16} strokeWidth={3} /> </button> : <button onClick={() => handleSendRequest(result)} className="w-8 h-8 rounded-full flex items-center justify-center bg-white text-black hover:bg-gray-200 transition-all shadow-md active:scale-95"> <UserPlus size={16} strokeWidth={2.5} /> </button>} </div>
                                        </div>
                                    );
                                })} </div> <div className="w-full h-px bg-white/10 my-4"></div> </div>
                            )}
                            <div className="flex flex-col gap-2"> <h4 className="text-xs uppercase tracking-widest text-white/40 mb-2 font-medium">Your Circle ({friends.length})</h4> {friends.length === 0 ? <div className="text-center py-8 text-white/30 text-sm">No friends yet.</div> : (sortedFriends.map((friend) => (
                                <div key={friend.uid} onClick={() => onViewStats(friend)} className="bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 rounded-xl p-3 flex items-center justify-between transition-all group cursor-pointer relative overflow-hidden">
                                    <div className="flex items-center gap-3 pointer-events-none min-w-0 flex-1">
                                        <Avatar userData={friend} size="md" />
                                        <div className="flex flex-col justify-center min-w-0">
                                            <div className="flex items-baseline gap-2 mb-1 min-w-0">
                                                <span className="text-sm font-medium text-white leading-none truncate">{friend.displayName}</span>
                                                <span className="text-xs text-white/50 truncate hidden sm:inline">{friend.handle}</span>
                                            </div>
                                            <div className="text-[10px] text-white/50 flex items-center gap-1.5 truncate">
                                                <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${friend.isOnline ? (friend.isActive ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-yellow-500') : 'bg-gray-600'}`}></span>
                                                <span className="truncate">{friend.statusText}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 items-center shrink-0 ml-2 z-10" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => onTogglePin(friend.uid, friend.isPinned)} className={`p-2 rounded-lg transition-colors ${friend.isPinned ? 'text-white' : 'text-white/20 hover:text-white hover:bg-white/10'}`}><Pin size={16} className={friend.isPinned ? "fill-white" : ""} /></button>
                                        <LiquidButton icon={UserMinus} label="Remove" variant="danger" onConfirm={() => onRemoveFriend(friend.uid)} />
                                    </div>
                                </div>
                            )))} </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default FriendView;
