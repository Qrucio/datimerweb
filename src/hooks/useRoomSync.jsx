import { useEffect, useState, useRef, useCallback } from 'react';
import { RoomsService } from '../services/roomsService';
import { supabase } from '../lib/supabase';

export const useRoomSync = (roomId, isHost, localTimerState) => {
    const [stateVersion, setStateVersion] = useState(0);
    const lastBroadcastState = useRef(null);
    const isSyncing = useRef(false);
    const stateVersionRef = useRef(0);

    // Keep the ref in sync with state so the broadcast function always has the latest version
    useEffect(() => {
        stateVersionRef.current = stateVersion;
    }, [stateVersion]);

    // Broadcast local state to the DB when it changes
    // FIX #6: Removed stateVersion from deps to prevent infinite re-render loop.
    // We use a ref (stateVersionRef) instead so the broadcast always reads the latest version.
    useEffect(() => {
        if (!roomId || !localTimerState) return;
        
        // Serialize state to compare and avoid unnecessary broadcasts
        const strState = JSON.stringify(localTimerState);
        if (lastBroadcastState.current === strState) return;
        if (isSyncing.current) return;
        
        lastBroadcastState.current = strState;
        isSyncing.current = true;
        
        const broadcast = async () => {
            let success = false;
            let retries = 0;
            
            while (!success && retries < 3) {
                // OCC: Optimistic Concurrency Control
                const currentVersion = stateVersionRef.current;
                const res = await RoomsService.mutateState(roomId, currentVersion, isHost, localTimerState);
                if (res.success) {
                    setStateVersion(prev => prev + 1);
                    success = true;
                } else {
                    // Conflict or DB mismatch, let's resync our local version counter
                    console.warn(`[useRoomSync] OCC Conflict (Attempt ${retries + 1}). Fetching latest state_version...`);
                    const { room } = await RoomsService.getRoom(roomId);
                    if (room) {
                        setStateVersion(room.state_version);
                        stateVersionRef.current = room.state_version; // Update ref for next iteration
                    }
                    retries++;
                }
            }
            
            if (!success) {
                console.error("[useRoomSync] Failed to broadcast state after 3 OCC retries.");
                lastBroadcastState.current = null; // Clear so it can try again later
            }
            
            isSyncing.current = false;
        };
        
        broadcast();
    }, [roomId, isHost, localTimerState]); // FIX #6: stateVersion removed

    // Listen for Postgres changes to keep stateVersion perfectly in sync 
    // even if the remote user triggers the mutation.
    useEffect(() => {
        if (!roomId) return;

        // Fetch initial version on mount
        const fetchInitial = async () => {
            const { room } = await RoomsService.getRoom(roomId);
            if (room) {
                setStateVersion(room.state_version);
            }
        };
        fetchInitial();

        const channel = supabase.channel(`room_sync:${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
                setStateVersion(payload.new.state_version);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId]);
    
    return { stateVersion };
};
