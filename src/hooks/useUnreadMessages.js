import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useUnreadMessages = (user) => {
    const [unreadCounts, setUnreadCounts] = useState({}); // { serverId: count }
    const [lastReadTimes, setLastReadTimes] = useState({}); // { serverId: isoString }
    const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

    // Helper to get read time for a server
    const getReadTime = (serverId) => {
        const userId = user?.id || user?.uid;
        if (!userId) return new Date(0);
        const stored = localStorage.getItem(`last_read_chat_${userId}_${serverId}`);
        return stored ? new Date(stored) : new Date(0); // Epoch if never read
    };

    // 1. Initial Load & Subscription
    useEffect(() => {
        if (!user) return;

        // Load initial read times for reference (optimization: we could load lazily)
        // But we needed them for the initial fetch.
        // Actually, we'll just read from LS during processing.

        let channel;

        const setup = async () => {
            const userId = user?.id || user?.uid;
            if (!userId) return;

            // Fetch messages from last 7 days (Reasonable lookback for "unread")
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data: recentMessages, error } = await supabase
                .from('messages')
                .select('server_id, created_at, sender_id')
                .gt('created_at', sevenDaysAgo.toISOString())
                .neq('sender_id', userId);

            if (recentMessages) {
                const newCounts = {};
                recentMessages.forEach(msg => {
                    const serverReadTime = getReadTime(msg.server_id);
                    if (new Date(msg.created_at) > serverReadTime) {
                        newCounts[msg.server_id] = (newCounts[msg.server_id] || 0) + 1;
                    }
                });
                setUnreadCounts(newCounts);
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
                            // Check if it's new relative to our current read time
                            // Basically always increment for incoming unless we are currently looking at it?
                            // For simplicity: Increment.
                            setUnreadCounts(prev => ({
                                ...prev,
                                [msg.server_id]: (prev[msg.server_id] || 0) + 1
                            }));
                        }
                    }
                )
                .subscribe();
        };

        setup();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [user]);

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

    return { unreadCounts, totalUnread, markAsRead, getLastReadTime };
};
