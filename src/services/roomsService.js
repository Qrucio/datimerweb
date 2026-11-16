import { supabase } from '../lib/supabase';
import { Storage } from '../utils/storage';

// In-memory clock offset (Server Time - Local Time)
let serverTimeOffset = 0;
const getDeclinedIds = () => new Set(JSON.parse(localStorage.getItem('datimer_declined_invites') || '[]'));

/**
 * Reliable broadcast sender that ensures the channel is connected and subscribed
 * before dispatching the payload, then safely disposes of the channel.
 */
const sendReliableBroadcast = async (channelName, event, payload) => {
    return new Promise((resolve) => {
        const channel = supabase.channel(channelName);
        let resolved = false;

        const cleanup = () => {
            if (!resolved) {
                resolved = true;
                setTimeout(() => {
                    supabase.removeChannel(channel);
                }, 200);
                resolve();
            }
        };

        const timeout = setTimeout(() => {
            console.warn(`[RoomsService] Broadcast to ${channelName} timed out`);
            cleanup();
        }, 3000);

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                try {
                    await channel.send({
                        type: 'broadcast',
                        event,
                        payload
                    });
                } catch (err) {
                    console.error(`[RoomsService] Broadcast send failed on ${channelName}:`, err);
                } finally {
                    clearTimeout(timeout);
                    cleanup();
                }
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                clearTimeout(timeout);
                cleanup();
            }
        });
    });
};

export const RoomsService = {
    /**
     * NTP-like Clock Sync
     * Runs multiple times and averages the offset for millisecond accuracy.
     */
    syncClock: async () => {
        const offsets = [];
        for (let i = 0; i < 5; i++) {
            const t0 = Date.now();
            try {
                const { data: serverTime, error } = await supabase.rpc('get_server_time');
                if (error) throw error;

                const t3 = Date.now();
                const rtt = t3 - t0;
                // Assuming server processing time is negligible, T1 ≈ T2 ≈ serverTime
                const offset = serverTime - (t0 + rtt / 2);
                offsets.push({ offset, rtt });
            } catch (err) {
                console.error("[RoomsService] Clock sync failed on iteration", i, err);
            }
        }

        if (offsets.length > 0) {
            offsets.sort((a, b) => a.rtt - b.rtt);
            const trimmed = offsets.slice(0, Math.max(1, offsets.length - 1));
            const avg = trimmed.reduce((a, b) => a + b.offset, 0) / trimmed.length;
            serverTimeOffset = avg;
            console.log("[RoomsService] Clock synced. Offset:", serverTimeOffset.toFixed(1), "ms (from", trimmed.length, "samples)");
        }
    },

    getSyncedTime: () => {
        return Date.now() + serverTimeOffset;
    },

    /**
     * Create a room and invite a user.
     * Inserts the host's initial timer state immediately so the guest doesn't get stuck on an infinite skeleton.
     * If an unaccepted or stale invite exists, deletes it so a fresh INSERT event fires in Realtime.
     */
    createRoom: async (hostId, targetUserId, initialHostTimerState = null) => {
        try {
            const { data: existing } = await supabase
                .from('rooms')
                .select('*')
                .eq('host_id', hostId)
                .eq('participant_id', targetUserId)
                .limit(1)
                .single();

            if (existing) {
                // If it's an active session where participant has already joined, keep it
                const pState = existing.participant_timer_state;
                const isActiveSession = pState && typeof pState === 'object' && Object.keys(pState).length > 0 && !pState.status;
                
                if (isActiveSession) {
                    return { success: true, room: existing };
                }

                // If it's a pending invite or stale invite, delete it so the new insert fires a fresh Realtime INSERT
                await supabase.from('rooms').delete().eq('id', existing.id);
            }

            const insertPayload = {
                host_id: hostId,
                participant_id: targetUserId,
                state_version: 1
            };
            if (initialHostTimerState) {
                insertPayload.host_timer_state = initialHostTimerState;
            }

            const { data, error } = await supabase
                .from('rooms')
                .insert(insertPayload)
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, room: data };
        } catch (error) {
            console.error("[RoomsService] createRoom failed", error);
            return { success: false, error };
        }
    },

    getRoom: async (roomId) => {
        try {
             const { data, error } = await supabase
                .from('rooms')
                .select('*')
                .eq('id', roomId)
                .single();
            if (error) throw error;
            return { success: true, room: data };
        } catch(e) {
            console.error("[RoomsService] Get room failed", e);
            return { success: false, error: e };
        }
    },

    getPendingInvite: async (userId, excludeRoomId = null) => {
        try {
            let query = supabase
                .from('rooms')
                .select('*')
                .eq('participant_id', userId)
                .order('created_at', { ascending: false })
                .limit(1);

            if (excludeRoomId) {
                query = query.neq('id', excludeRoomId);
            }

            const { data, error } = await query.single();
            
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
            if (data && getDeclinedIds().has(data.id)) return { success: true, invite: null };
            // Also skip if participant already marked as left or declined
            if (data?.participant_timer_state?.status === 'declined' || data?.participant_timer_state?.status === 'left') {
                return { success: true, invite: null };
            }
            
            return { success: true, invite: data || null };
        } catch(e) {
            console.error("[RoomsService] Get pending invite failed", e);
            return { success: false, error: e };
        }
    },

    /**
     * Leave / close a room.
     * Dual-signal:
     * 1. Subscribed broadcast of 'room_left'.
     * 2. Sets status: 'left' on participant state if not host (RLS safety).
     * 3. Deletes the room row (succeeds for host).
     */
    leaveRoom: async (roomId, isHost = false) => {
        try {
            // 1. Send reliable broadcast
            await sendReliableBroadcast(`room_sync:${roomId}`, 'room_left', { roomId });

            // 2. If participant, update DB state as fallback signal for host in case RLS blocks delete
            if (!isHost) {
                await supabase
                    .from('rooms')
                    .update({ participant_timer_state: { status: 'left' } })
                    .eq('id', roomId)
                    .catch(() => {});
            }

            // 3. Attempt DB delete (Host has RLS delete permission)
            const { error } = await supabase
                .from('rooms')
                .delete()
                .eq('id', roomId);
                
            if (error && isHost) throw error;
            return { success: true };
        } catch (error) {
            console.error("[RoomsService] Leave room failed", error);
            return { success: false, error };
        }
    },

    /**
     * Decline an incoming invite.
     * Dual-signal:
     * 1. Marks declined in local storage.
     * 2. Reliable broadcast of 'room_declined' on accept channel.
     * 3. Sets participant_timer_state = { status: 'declined' } so host's Postgres listener catches it.
     * 4. Attempts DB delete.
     */
    declineInvite: async (roomId) => {
        try {
            const set = getDeclinedIds();
            set.add(roomId);
            localStorage.setItem('datimer_declined_invites', JSON.stringify(Array.from(set)));
            
            // 1. Reliable broadcast to host's accept channel
            await sendReliableBroadcast(`room_accept:${roomId}`, 'room_declined', { roomId });

            // 2. Update DB state to notify host via postgres_changes even if broadcast missed
            await supabase
                .from('rooms')
                .update({ participant_timer_state: { status: 'declined' } })
                .eq('id', roomId)
                .catch(() => {});

            // 3. Attempt deletion
            await supabase.from('rooms').delete().eq('id', roomId).catch(() => {});
            
            return { success: true };
        } catch (error) {
            console.error("[RoomsService] Decline invite failed", error);
            return { success: false, error };
        }
    },

    /**
     * Mutate Room State using OCC (Optimistic Concurrency Control)
     * with fallback to direct update if OCC fails.
     */
    mutateState: async (roomId, expectedVersion, isHost, newState) => {
        try {
            const { error } = await supabase.rpc('mutate_room_state', {
                p_room_id: roomId,
                p_expected_version: expectedVersion,
                p_is_host: isHost,
                p_new_timer_state: newState
            });

            if (error) {
                console.warn("[RoomsService] mutate_room_state RPC error, attempting direct update fallback:", error);
                const updatePayload = isHost 
                    ? { host_timer_state: newState }
                    : { participant_timer_state: newState };
                
                const { error: directError } = await supabase
                    .from('rooms')
                    .update(updatePayload)
                    .eq('id', roomId);

                if (directError) throw directError;
            }
            return { success: true };
        } catch (error) {
            console.error("[RoomsService] Mutate state failed", error);
            return { success: false, error };
        }
    }
};
