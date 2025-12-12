import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import CloseButton from '../ui/CloseButton';
import FriendView from '../social/FriendView';
import ServerSidebar from '../social/ServerSidebar';
import ServerView from '../social/ServerView';
import CreateServerModal from '../social/CreateServerModal';
import AddMemberModal from '../social/AddMemberModal';

const SocialModal = ({
    isOpen, onClose, user, friends, friendRequests, onSendRequest, onAcceptRequest,
    onDeclineRequest, onBlockUser, onUnblockUser, checkOutgoingRequest,
    onRemoveFriend, onTogglePin, onViewStats, onSearchUsers, blockedUsers
}) => {
    // --- STATE ---
    const [activeServerId, setActiveServerId] = useState(null); // null = Home/Friends
    const [servers, setServers] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // --- FETCH SERVERS ---
    const fetchServers = async () => {
        if (!user) return;
        // RLS Policy allows invited users to SEE servers now.
        // We must EXPLICITLY filter for servers where we are a MEMBER.
        const { data, error } = await supabase
            .from('servers')
            .select('*, server_members!inner(user_id)')
            .eq('server_members.user_id', user.uid)
            .order('created_at', { ascending: false });

        if (data) setServers(data);
    };

    useEffect(() => {
        if (isOpen) {
            fetchServers();
        }
    }, [isOpen, user]);

    // --- REALTIME: Listen for My Membership Changes (Kicks/Invites) ---
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(`my_memberships:${user.uid}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'server_members',
                    filter: `user_id=eq.${user.uid}`
                },
                async (payload) => {
                    // console.log("Membership Change:", payload);

                    if (payload.eventType === 'DELETE') {
                        // KICKED / LEFT
                        const removedServerId = payload.old.server_id;
                        setServers(prev => prev.filter(s => s.id !== removedServerId));
                        if (activeServerId === removedServerId) {
                            setActiveServerId(null);
                        }
                    } else if (payload.eventType === 'INSERT') {
                        // JOINED / ACCEPTED INVITE
                        const newServerId = payload.new.server_id;
                        // Fetch the server details to add to list
                        const { data: newServer } = await supabase
                            .from('servers')
                            .select('*')
                            .eq('id', newServerId)
                            .single();

                        if (newServer) {
                            setServers(prev => [newServer, ...prev]);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, activeServerId]); // activeServerId dependency to properly check against it


    // --- ACTIONS ---
    const handleCreateServer = async ({ name, iconUrl }) => {
        if (!user) return;
        try {
            // 1. Create Server
            const { data: server, error: sErr } = await supabase
                .from('servers')
                .insert({
                    name,
                    icon_url: iconUrl,
                    created_by: user.uid
                })
                .select()
                .single();

            if (sErr || !server) throw sErr;

            // 2. Add as Owner (Member)
            const { error: mErr } = await supabase
                .from('server_members')
                .insert({
                    server_id: server.id,
                    user_id: user.uid,
                    role: 'owner'
                });

            if (mErr) throw mErr;

            // 3. Refresh List
            setServers([server, ...servers]);
            setActiveServerId(server.id); // Auto-switch
            return true;
        } catch (e) {
            console.error("Failed to create server", e);
            return false;
        }
    };

    // --- MEMBERSHIP ---
    const [inviteServerId, setInviteServerId] = useState(null); // ID of server we are inviting to
    const [serverMembers, setServerMembers] = useState([]); // Members of the ACTIVE or INVITE server
    const [pendingInviteIds, setPendingInviteIds] = useState(new Set()); // IDs of pending invites

    const fetchMembers = async (serverId) => {
        if (!serverId) return;
        const { data, error } = await supabase
            .from('server_members')
            .select('*, profile:profiles(id, display_name, handle, photo_url, is_pro, timer_state, stats)')
            .eq('server_id', serverId);

        if (error) console.error("Fetch members error:", error);
        if (data) {
            setServerMembers(data);
        }
    };

    // Fetch members and pending invites when active server changes or invite opens
    useEffect(() => {
        // Fetch Membership
        if (activeServerId) {
            fetchMembers(activeServerId);
            // ... realtime subs handled above ...
        }
    }, [activeServerId]);

    // Fetch Pending Invites when opening Invite Modal
    useEffect(() => {
        if (!inviteServerId) {
            setPendingInviteIds(new Set());
            return;
        }

        // 1. Fetch Members (to exclude them)
        fetchMembers(inviteServerId);

        // 2. Fetch Pending Invites
        const fetchInvites = async () => {
            const { data } = await supabase
                .from('server_invites')
                .select('receiver_id')
                .eq('server_id', inviteServerId)
                .eq('status', 'pending');

            if (data) {
                setPendingInviteIds(new Set(data.map(i => i.receiver_id)));
            }
        };
        fetchInvites();

    }, [inviteServerId]);

    const handleMemberUpdate = () => {
        if (activeServerId) fetchMembers(activeServerId);
    };

    const handleAddMember = async (friendId) => {
        if (!inviteServerId) return;
        try {
            // Optimistic Update
            setPendingInviteIds(prev => new Set(prev).add(friendId));

            // Check if already invited (redundant if UI is correct but safe)
            /* 
            const { data: existing } = await supabase
                .from('server_invites')
                ...
            */
            // We trust the UI state for speed, but DB constraints handle safety too.

            const { error } = await supabase.from('server_invites').insert({
                server_id: inviteServerId,
                sender_id: user.uid,
                receiver_id: friendId,
                status: 'pending'
            });

            if (error) throw error;
            // Removed Alert as requested.
            // Success state is already reflected by the optimistic update (Green Check)
        } catch (e) {
            console.error("Failed to send invite", e);
            // Revert on failure
            setPendingInviteIds(prev => {
                const next = new Set(prev);
                next.delete(friendId);
                return next;
            });
            alert("Failed to send invite.");
        }
    };

    // --- ANIMATIONS ---
    const modalVariants = { hidden: { opacity: 0, scale: 0.95, y: 10 }, visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } }, exit: { opacity: 0, scale: 0.98, y: 10, transition: { duration: 0.15, ease: "easeOut" } } };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
                    <motion.div
                        layout
                        variants={modalVariants} initial="hidden" animate="visible" exit="exit"
                        className="bg-[#111] border border-white/10 rounded-3xl w-[95vw] md:w-[800px] shadow-2xl overflow-hidden mx-2 md:mx-0 flex h-[85vh] md:h-[600px] relative"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* 1. SIDEBAR (Navigation) */}
                        <ServerSidebar
                            servers={servers}
                            activeServerId={activeServerId}
                            onSelectServer={setActiveServerId}
                            onSelectHome={() => setActiveServerId(null)}
                            onCreateServer={() => setIsCreateModalOpen(true)}
                        />

                        {/* 2. MAIN CONTENT */}
                        <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a]">
                            <AnimatePresence mode="wait">
                                {activeServerId ? (
                                    <motion.div
                                        key={activeServerId}
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="h-full"
                                    >
                                        <ServerView
                                            server={servers.find(s => s.id === activeServerId)}
                                            user={user}
                                            onClose={onClose}
                                            members={serverMembers}
                                            friends={friends}
                                            onInvite={() => setInviteServerId(activeServerId)}
                                            onMemberUpdate={handleMemberUpdate}
                                        />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="home"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="h-full p-6 pt-4"
                                    >
                                        <FriendView
                                            user={user}
                                            friends={friends}
                                            friendRequests={friendRequests}
                                            onSendRequest={onSendRequest}
                                            onAcceptRequest={onAcceptRequest}
                                            onDeclineRequest={onDeclineRequest}
                                            onBlockUser={onBlockUser}
                                            onUnblockUser={onUnblockUser}
                                            checkOutgoingRequest={checkOutgoingRequest}
                                            onRemoveFriend={onRemoveFriend}
                                            onTogglePin={onTogglePin}
                                            onViewStats={onViewStats}
                                            onSearchUsers={onSearchUsers}
                                            blockedUsers={blockedUsers}
                                            onClose={onClose}
                                            onServerJoined={fetchServers}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* CREATE MODAL OVERLAY */}
                        <CreateServerModal
                            isOpen={isCreateModalOpen}
                            onClose={() => setIsCreateModalOpen(false)}
                            onCreate={handleCreateServer}
                        />

                        {/* ADD MEMBER MODAL */}
                        <AddMemberModal
                            isOpen={!!inviteServerId}
                            onClose={() => setInviteServerId(null)}
                            friends={friends}
                            serverMembers={serverMembers} // Passed from ServerView state? No, we need to fetch or manage this.
                            pendingInvites={pendingInviteIds} // NEW
                            onAdd={handleAddMember}
                        />

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SocialModal;