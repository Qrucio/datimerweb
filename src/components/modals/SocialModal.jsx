import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ban, Bell, Loader2, UserPlus, Check, UserMinus, Pin } from 'lucide-react';

// ... (LiquidButton remains same)

// --- MAIN SOCIAL MODAL ---
const SocialModal = ({ isOpen, onClose, user, friends, friendRequests, onSendRequest, onAcceptRequest, onDeclineRequest, onBlockUser, onUnblockUser, checkOutgoingRequest, onRemoveFriend, onTogglePin, onViewStats, onSearchUsers, blockedUsers, initialView = 'list' }) => {
    const [view, setView] = useState(initialView);
    const [searchText, setSearchText] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [rawSearchResults, setRawSearchResults] = useState([]);
    const [requestStatuses, setRequestStatuses] = useState({});
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setView(initialView); setSearchText(""); setRawSearchResults([]); setSearchPerformed(false); setErrorMsg(null); setRequestStatuses({});
        }
    }, [isOpen, initialView]);

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

    const modalVariants = { hidden: { opacity: 0, scale: 0.95, y: 10 }, visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } }, exit: { opacity: 0, scale: 0.98, y: 10, transition: { duration: 0.15, ease: "easeOut" } } };
    const slideVariants = { enter: (direction) => ({ x: direction > 0 ? 20 : -20, opacity: 0 }), center: { x: 0, opacity: 1, transition: { duration: 0.2, ease: "easeOut" } }, exit: (direction) => ({ x: direction < 0 ? 20 : -20, opacity: 0, transition: { duration: 0.15, ease: "easeIn" } }) };
    const direction = view === 'list' ? -1 : 1;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
                    <motion.div layout variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="bg-[#111] border border-white/10 p-6 rounded-3xl w-[95vw] md:w-full md:max-w-md shadow-2xl overflow-hidden mx-2 md:mx-0 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <h3 className="text-xl font-medium text-white">Social</h3>
                            <div className="flex gap-2">
                                <button onClick={() => setView(view === 'blocked' ? 'list' : 'blocked')} className={`p-2 rounded-full transition-colors ${view === 'blocked' ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-white/50 hover:text-white'}`} title="Blocked Users"> <Ban size={20} /> </button>
                                <button onClick={() => setView(view === 'requests' ? 'list' : 'requests')} className={`relative p-2 rounded-full transition-colors ${view === 'requests' ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:text-white'}`}> <Bell size={20} /> {friendRequests.length > 0 && view !== 'requests' && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-[#111]" />} </button>
                                <CloseButton onClick={onClose} />
                            </div>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar flex-1 -mr-2 pr-2">
                            <AnimatePresence mode="wait" custom={direction}>
                                {view === 'blocked' && (
                                    <motion.div key="blocked" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit">
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
                                    <motion.div key="requests" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit">
                                        <div className="flex items-center justify-between mb-4"> <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold">Pending Requests</h4> <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/60">{friendRequests.length}</span> </div>
                                        {friendRequests.length === 0 ? <div className="text-center py-12 text-white/20 text-sm italic">No pending requests.</div> : (
                                            <div className="flex flex-col gap-2"> {friendRequests.map(req => (
                                                <div key={req.uid} className="bg-white/10 border border-white/20 rounded-xl p-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-3"> <Avatar userData={req} size="md" /> <div className="flex flex-col md:flex-row md:items-baseline md:gap-2"> <span className="text-sm font-bold text-white">{req.displayName}</span> <span className="text-xs text-white/50 font-medium">{req.handle}</span> </div> </div>
                                                    <div className="flex gap-3 pr-2 items-center"> <LiquidButton icon={Ban} label="Block?" variant="danger" onConfirm={() => handleBlock(req)} /> <LiquidButton icon={X} label="Deny?" variant="danger" onConfirm={() => onDeclineRequest(req.uid)} /> <button onClick={() => onAcceptRequest(req)} className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-green-400 hover:scale-110 transition-all shadow-md z-20"><Check size={14} strokeWidth={3} /></button> </div>
                                                </div>
                                            ))} </div>
                                        )}
                                    </motion.div>
                                )}

                                {view === 'list' && (
                                    <motion.div key="list" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit">
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
                                            <div key={friend.uid} onClick={() => onViewStats(friend)} className="bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 rounded-xl p-3 flex items-center justify-between transition-all group cursor-pointer relative">
                                                <div className="flex items-center gap-3 pointer-events-none"> <Avatar userData={friend} size="md" /> <div className="flex flex-col justify-center"> <div className="flex items-baseline gap-2 mb-1"> <span className="text-sm font-medium text-white leading-none">{friend.displayName}</span> <span className="text-xs text-white/50">{friend.handle}</span> </div> <div className="text-[10px] text-white/50 flex items-center gap-1.5"> <span className={`w-1.5 h-1.5 rounded-full ${friend.isOnline ? (friend.isActive ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-yellow-500') : 'bg-gray-600'}`}></span> {friend.statusText} </div> </div> </div>
                                                <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>

                                                    <button onClick={() => onTogglePin(friend.uid, friend.isPinned)} className={`p-2 rounded-lg transition-colors ${friend.isPinned ? 'text-white' : 'text-white/20 hover:text-white hover:bg-white/10'}`}><Pin size={16} className={friend.isPinned ? "fill-white" : ""} /></button>
                                                    <LiquidButton icon={UserMinus} label="Remove?" variant="danger" onConfirm={() => onRemoveFriend(friend.uid)} />
                                                </div>
                                            </div>
                                        )))} </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
export default SocialModal;