import { supabase } from '../lib/supabase';
import { Storage } from '../utils/storage';

// In-memory clock offset (Server Time - Local Time)
let serverTimeOffset = 0;
const getDeclinedIds = () => new Set(JSON.parse(localStorage.getItem('datimer_declined_invites') || '[]'));

export const RoomsService = {
    /**
     * NTP-like Clock Sync
     * Runs multiple times and averages the offset for millisecond accuracy.
     * FIX #3: Removed the broadcast-based invite from createRoom.
     * Invites now go through DB inserts for reliability (see room_invites table usage).
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
                // offset = serverTime - (t0 + rtt / 2)
                const offset = serverTime - (t0 + rtt / 2);
                offsets.push({ offset, rtt });
            } catch (err) {
                console.error("Clock sync failed on iteration", i, err);
            }
        }

        if (offsets.length > 0) {
            // Discard the highest RTT outlier for accuracy
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
     * FIX #3: Uses a DB row in the `rooms` table itself as the invite mechanism.
     * The receiver listens via postgres_changes on `rooms` where they are the participant.
     * This is far more reliable than ephemeral broadcast which can be missed.
     */
    createRoom: async (hostId, targetUserId) => {
        try {
            const { data: existing } = await supabase.from('rooms').select('*').eq('host_id', hostId).eq('participant_id', targetUserId).limit(1).single();
            if (existing) {
                return { success: true, room: existing };
            }

            const { data, error } = await supabase
                .from('rooms')
                .insert({ host_id: hostId, participant_id: targetUserId })
                .select()
                .single();
            
            if (error) throw error;

            return { success: true, room: data };
        } catch (error) {
            console.error("[RoomsService] Create room failed", error);
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
            
            return { success: true, invite: data || null };
        } catch(e) {
            console.error("[RoomsService] Get pending invite failed", e);
            return { success: false, error: e };
        }
    },

    /**
     * Leave / close a room.
     * FIX #4: Proper cleanup — deletes the room row from the DB.
     */
    leaveRoom: async (roomId) => {
        try {
            // Broadcast over the existing channel to notify peer instantly
            const channel = supabase.channel(`room_sync:${roomId}`);
            await channel.send({
                type: 'broadcast',
                event: 'room_left',
                payload: { roomId }
            }).catch(console.error); // Fire and forget if it fails

            const { error } = await supabase
                .from('rooms')
                .delete()
                .eq('id', roomId);
                
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error("[RoomsService] Leave room failed", error);
            return { success: false, error };
        }
    },

    /**
     * Decline an incoming invite
     * Broadcasts to host and marks locally to avoid RLS limitations
     */
    declineInvite: async (roomId) => {
        try {
            const set = getDeclinedIds();
            set.add(roomId);
            localStorage.setItem('datimer_declined_invites', JSON.stringify(Array.from(set)));
            
            const channel = supabase.channel(`room_accept:${roomId}`);
            await channel.send({
                type: 'broadcast',
                event: 'room_declined',
                payload: { roomId }
            }).catch(console.error);

            // Attempt to delete it anyway (fails if RLS blocks, but we tried)
            await supabase.from('rooms').delete().eq('id', roomId);
            
            return { success: true };
        } catch (error) {
            console.error("[RoomsService] Decline invite failed", error);
            return { success: false, error };
        }
    },

    /**
     * Mutate Room State using OCC (Optimistic Concurrency Control)
     */
    mutateState: async (roomId, expectedVersion, isHost, newState) => {
        try {
            const { error } = await supabase.rpc('mutate_room_state', {
                p_room_id: roomId,
                p_expected_version: expectedVersion,
                p_is_host: isHost,
                p_new_timer_state: newState
            });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error("[RoomsService] Mutate state failed (OCC conflict)", error);
            return { success: false, error };
        }
    }
};
