import { useEffect, useState, useRef, useCallback } from 'react';
import { RoomsService } from '../services/roomsService';
import { supabase } from '../lib/supabase';

export const useRoomSync = (roomId, isHost, localTimerState, onRoomClosed) => {
    const [stateVersion, setStateVersion] = useState(0);
    const [remoteTimerState, setRemoteTimerState] = useState(null);
    const lastBroadcastState = useRef(null);
    const isSyncing = useRef(false);
    const stateVersionRef = useRef(0);
    
    const [isReady, setIsReady] = useState(false);

    // NEW: Ref to track the latest state and any pending broadcasts
    const latestStateRef = useRef(localTimerState);
    const hasPendingSync = useRef(false);

    // Reset ALL internal state when roomId changes (new room session)
    useEffect(() => {
        lastBroadcastState.current = null;
        isSyncing.current = false;
        stateVersionRef.current = 0;
        hasPendingSync.current = false;
        setStateVersion(0);
        setRemoteTimerState(null);
        setIsReady(false);
    }, [roomId]);

    // Keep the ref in sync with state so the broadcast function always has the latest version
    useEffect(() => {
        stateVersionRef.current = stateVersion;
    }, [stateVersion]);

    useEffect(() => {
        latestStateRef.current = localTimerState;
    }, [localTimerState]);

    const performSync = useCallback(async function sync() {
        if (!roomId || !latestStateRef.current) {
            isSyncing.current = false;
            hasPendingSync.current = false;
            return;
        }

        const stateToSync = latestStateRef.current;
        const strState = JSON.stringify(stateToSync);
        
        if (lastBroadcastState.current === strState) {
            isSyncing.current = false;
            hasPendingSync.current = false;
            return;
        }
        
        lastBroadcastState.current = strState;
        hasPendingSync.current = false; // Clear pending flag since we are about to sync it
        isSyncing.current = true;
        
        let success = false;
        let retries = 0;
        
        while (!success && retries < 3) {
            const currentVersion = stateVersionRef.current;
            // Always use the latest state we captured at the start of this sync attempt
            const res = await RoomsService.mutateState(roomId, currentVersion, isHost, stateToSync);
            if (res.success) {
                setStateVersion(prev => prev + 1);
                success = true;
            } else {
                console.warn(`[useRoomSync] OCC Conflict (Attempt ${retries + 1}). Fetching latest state_version...`);
                const { room } = await RoomsService.getRoom(roomId);
                if (room) {
                    setStateVersion(room.state_version);
                    stateVersionRef.current = room.state_version;
                }
                retries++;
            }
        }
        
        if (!success) {
            console.error("[useRoomSync] Failed to broadcast state after 3 OCC retries.");
            lastBroadcastState.current = null;
        }
        
        isSyncing.current = false;
        
        // If the state changed while we were syncing, immediately trigger another sync
        if (hasPendingSync.current) {
            sync();
        }
    }, [roomId, isHost]);

    // Broadcast local state to the DB when it changes
    useEffect(() => {
        if (!roomId || !localTimerState || !isReady) return;
        
        const strState = JSON.stringify(localTimerState);
        if (lastBroadcastState.current === strState) return;
        
        if (isSyncing.current) {
            // Queue it up so it gets picked up when the current sync finishes
            hasPendingSync.current = true;
            return;
        }
        
        performSync();
    }, [localTimerState, roomId, isHost, performSync, isReady]);

    // Listen for Postgres changes to keep stateVersion perfectly in sync 
    // even if the remote user triggers the mutation.
    useEffect(() => {
        if (!roomId) return;
        setIsReady(false);

        let hasReceivedRealtimeUpdate = false;

        const processRoomState = (room) => {
            setStateVersion(room.state_version);
            setRemoteTimerState(isHost ? room.participant_timer_state : room.host_timer_state);
        };

        // Fetch initial version on mount
        const fetchInitial = async () => {
            const { room } = await RoomsService.getRoom(roomId);
            if (room && !hasReceivedRealtimeUpdate) {
                processRoomState(room);
            }
            setIsReady(true);
        };
        fetchInitial();

        const channel = supabase.channel(`room_sync:${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
                hasReceivedRealtimeUpdate = true;
                processRoomState(payload.new);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, () => {
                console.log("[Room] Room was deleted by the host or watchdog. Closing.");
                if (onRoomClosed) onRoomClosed();
            })
            .on('broadcast', { event: 'room_left' }, () => {
                console.log("[Room] Remote user left the room via broadcast. Closing.");
                if (onRoomClosed) onRoomClosed();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomId, isHost, onRoomClosed]);
    
    // NEW: Smart Lazy Evaluation Watchdog
    useEffect(() => {
        if (!roomId) return;
        
        const getExpirationTime = (state) => {
            if (!state || !state.isActive) return null;
            if (state.mode === 'stopwatch') return Infinity; // Stopwatch never naturally expires
            return state.serverEndTime || Infinity; // In case of missing timestamp, don't kill
        };

        const localExp = getExpirationTime(localTimerState);
        const remoteExp = getExpirationTime(remoteTimerState);

        const localIsPaused = !localTimerState?.isActive;
        const remoteIsPaused = !remoteTimerState?.isActive;

        // Determine when the LATEST active timer will end
        let maxExpiration = -Infinity;
        if (!localIsPaused && localExp !== null) maxExpiration = Math.max(maxExpiration, localExp);
        if (!remoteIsPaused && remoteExp !== null) maxExpiration = Math.max(maxExpiration, remoteExp);

        // If someone is running a stopwatch, it never expires. Watchdog sleeps forever.
        if (maxExpiration === Infinity) {
            return;
        }

        let timeUntilWatchdogFires = 15 * 60 * 1000; // 15 mins by default (if both are paused)

        if (maxExpiration !== -Infinity) {
            // Someone is running a countdown timer!
            // The watchdog should fire 15 minutes AFTER the timer ends.
            const now = RoomsService.getSyncedTime();
            timeUntilWatchdogFires = (maxExpiration - now) + (15 * 60 * 1000);
        }

        // If it should have fired in the past, cap it to 0 (execute immediately in setTimeout)
        timeUntilWatchdogFires = Math.max(0, timeUntilWatchdogFires);

        console.log(`[Watchdog] Scheduled to evaluate room death in ${Math.round(timeUntilWatchdogFires/1000)}s`);

        const timeout = setTimeout(() => {
            console.log("[Watchdog] 15 minutes of zero activity elapsed (timers naturally expired or paused). Abandoning room.");
            RoomsService.leaveRoom(roomId);
            if (onRoomClosed) onRoomClosed();
        }, timeUntilWatchdogFires);

        return () => clearTimeout(timeout);
    }, [roomId, localTimerState, remoteTimerState, onRoomClosed]);

    return { stateVersion };
};
