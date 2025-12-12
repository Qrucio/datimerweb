import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Search, Check, X } from 'lucide-react';
import Avatar from '../Avatar';
import CloseButton from '../ui/CloseButton';

const AddMemberModal = ({ isOpen, onClose, friends = [], serverMembers = [], pendingInvites = new Set(), onAdd }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [addingIds, setAddingIds] = useState({}); // { uid: true/false }

    if (!isOpen) return null;

    // Filter friends: 
    // 1. Must match search
    // 2. Must NOT be in serverMembers already
    const memberIds = new Set(serverMembers.map(m => m.user_id));

    const filteredFriends = friends.filter(friend => {
        const matchesSearch = friend.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            friend.handle?.toLowerCase().includes(searchTerm.toLowerCase());
        const isAlreadyMember = memberIds.has(friend.uid);
        // We DO show them even if pending, just with a different UI state
        return matchesSearch && !isAlreadyMember;
    });

    const handleAdd = async (friendId) => {
        setAddingIds(prev => ({ ...prev, [friendId]: true }));
        await onAdd(friendId);
        setAddingIds(prev => ({ ...prev, [friendId]: false }));
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-[#1a1a1a] border border-white/10 p-6 rounded-2xl w-[90%] max-w-sm shadow-2xl h-[500px] flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-6 shrink-0">
                        <h3 className="text-white font-bold text-lg">Add Members</h3>
                        <CloseButton onClick={onClose} />
                    </div>

                    {/* SEARCH */}
                    <div className="relative mb-4 shrink-0">
                        <Search size={16} className="absolute left-3 top-3 text-white/30" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search friends..."
                            className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-white/20 transition-colors placeholder:text-white/20"
                            autoFocus
                        />
                    </div>

                    {/* FRIEND LIST */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
                        {filteredFriends.length === 0 ? (
                            <div className="text-center text-white/30 py-8 text-sm">
                                {searchTerm ? "No friends found" : "No friends to add"}
                            </div>
                        ) : (
                            filteredFriends.map(friend => {
                                const isInvited = pendingInvites.has(friend.uid);
                                return (
                                    <div key={friend.uid} className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/5">
                                        <div className="flex items-center gap-3">
                                            <Avatar userData={friend} size="sm" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-white">{friend.displayName}</span>
                                                <span className="text-xs text-white/40">{friend.handle}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleAdd(friend.uid)}
                                            disabled={addingIds[friend.uid] || isInvited}
                                            className={`p-2 rounded-full transition-colors ${isInvited
                                                ? 'bg-green-500 text-black cursor-default'
                                                : 'bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                                        >
                                            {addingIds[friend.uid] ? (
                                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                            ) : isInvited ? (
                                                <Check size={16} strokeWidth={3} />
                                            ) : (
                                                <UserPlus size={16} />
                                            )}
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AddMemberModal;
