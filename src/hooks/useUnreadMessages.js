import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useUnreadMessages = (user) => {
    const [unreadCounts, setUnreadCounts] = useState({}); // { serverId: count }
    const [lastReadTimes, setLastReadTimes] = useState({}); // { serverId: isoString }
    const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

    // Helper to get read time for a server
    // 2. Mention Tracking State
    const [mentionCounts, setMentionCounts] = useState({}); // { serverId: count }
    const totalMentions = Object.values(mentionCounts).reduce((a, b) => a + b, 0);

    // Helper to get read time for a server
    const getReadTime = (serverId) => {
        const userId = user?.id || user?.uid;
        if (!userId) return new Date(0);
        const stored = localStorage.getItem(`last_read_chat_${userId}_${serverId}`);
        return stored ? new Date(stored) : new Date(0); // Epoch if never read
    };

    // Helper: Check if message mentions me
    const isMention = useCallback((content) => {
        if (!user || !content) return false;
        // Check for @handle
        // We use a simple regex. Note: This might match partials without word boundaries if handles are simple.
        // Better: `(?:^|\\s)@${handle}(?:$|\\s|[^a-zA-Z0-9_])`
        const handle = user.handle;
        if (!handle) return false;
        const regex = new RegExp(`@${handle}\\b`, 'i');
        return regex.test(content);
    }, [user]);


    // 1. Initial Load & Subscription
    useEffect(() => {
        if (!user) return;

        let channel;

        const setup = async () => {
            const userId = user?.id || user?.uid;
            if (!userId) return;

            // Fetch messages from last 7 days (Reasonable lookback for "unread")
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data: recentMessages, error } = await supabase
                .from('messages')
                .select('server_id, created_at, sender_id, content') // Added content
                .gt('created_at', sevenDaysAgo.toISOString())
                .neq('sender_id', userId);

            if (recentMessages) {
                const newUnreadCounts = {};
                const newMentionCounts = {};

                recentMessages.forEach(msg => {
                    const serverReadTime = getReadTime(msg.server_id);
                    if (new Date(msg.created_at) > serverReadTime) {
                        // It is unread
                        newUnreadCounts[msg.server_id] = (newUnreadCounts[msg.server_id] || 0) + 1;

                        // Check Mention
                        if (isMention(msg.content)) {
                            newMentionCounts[msg.server_id] = (newMentionCounts[msg.server_id] || 0) + 1;
                        }
                    }
                });
                setUnreadCounts(newUnreadCounts);
                setMentionCounts(newMentionCounts);
            }

            // Realtime
            channel = supabase
                .channel('global_unread_check')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages'
                    },
                    (payload) => {
                        const userId = user?.id || user?.uid;
                        if (payload.new.sender_id !== userId) {
                            const msg = payload.new;

                            setUnreadCounts(prev => ({
                                ...prev,
                                [msg.server_id]: (prev[msg.server_id] || 0) + 1
                            }));

                            if (isMention(msg.content)) {
                                setMentionCounts(prev => ({
                                    ...prev,
                                    [msg.server_id]: (prev[msg.server_id] || 0) + 1
                                }));

                                // Play Notification Sound if NOT in Focus Mode?
                                // Actually, hook doesn't know about Focus Mode easily unless passed.
                                // But keeping logic simple here: just counts.
                            }
                        }
                    }
                )
                .subscribe();
        };

        setup();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [user, isMention]); // Added isMention dep

    const markAsRead = useCallback((serverId) => {
        const userId = user?.id || user?.uid;
        if (!userId || !serverId) return;
        const now = new Date();

        // Update Local Storage
        localStorage.setItem(`last_read_chat_${userId}_${serverId}`, now.toISOString());

        // Update State
        setUnreadCounts(prev => {
            const next = { ...prev };
            delete next[serverId]; // Clear count
            return next;
        });

        // Clear Mentions too
        setMentionCounts(prev => {
            const next = { ...prev };
            delete next[serverId];
            return next;
        });

        // Update Last Read Times state (useful for ChatArea divider)
        setLastReadTimes(prev => ({
            ...prev,
            [serverId]: now
        }));

    }, [user]);

    // Expose specific server read time helper
    const getLastReadTime = (serverId) => {
        return lastReadTimes[serverId] || getReadTime(serverId);
    };

    return { unreadCounts, totalUnread, markAsRead, mentionCounts, totalMentions, getLastReadTime };
};
