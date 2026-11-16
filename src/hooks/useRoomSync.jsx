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
        hasPendingSync.current = false;
        isSyncing.current = true;
        
        let success = false;
        let retries = 0;
        const maxRetries = 5;
        
        while (!success && retries < maxRetries) {
            const currentVersion = stateVersionRef.current;
            const res = await RoomsService.mutateState(roomId, currentVersion, isHost, stateToSync);
            if (res.success) {
                setStateVersion(prev => prev + 1);
                stateVersionRef.current = currentVersion + 1;
                success = true;
            } else {
                console.warn(`[useRoomSync] OCC Conflict (Attempt ${retries + 1}/${maxRetries}). Fetching latest state_version...`);
                // Exponential backoff with jitter before fetching and retrying
                await new Promise(r => setTimeout(r, 40 * (2 ** retries) + Math.random() * 40));
                
                const { room } = await RoomsService.getRoom(roomId);
                if (room) {
                    setStateVersion(room.state_version);
                    stateVersionRef.current = room.state_version;
                }
                retries++;
            }
        }
        
        if (!success) {
            console.error("[useRoomSync] Failed to broadcast state after max retries.");
            lastBroadcastState.current = null;
        }
        
        isSyncing.current = false;
        
        if (hasPendingSync.current) {
            sync();
        }
    }, [roomId, isHost]);

    // Broadcast local state to DB when it changes
    useEffect(() => {
        if (!roomId || !localTimerState || !isReady) return;
        
        const strState = JSON.stringify(localTimerState);
        if (lastBroadcastState.current === strState) return;
        
        if (isSyncing.current) {
            hasPendingSync.current = true;
            return;
        }
        
        performSync();
    }, [localTimerState, roomId, isHost, performSync, isReady]);

    // Listen for Realtime Postgres changes and Broadcast events
    useEffect(() => {
        if (!roomId) return;
        setIsReady(false);

        let hasReceivedRealtimeUpdate = false;

        const processRoomState = (room) => {
            if (!room) return;
            setStateVersion(room.state_version);
            
            const remoteState = isHost ? room.participant_timer_state : room.host_timer_state;
            
            // Check if remote user marked themselves as left or declined
            if (remoteState && (remoteState.status === 'left' || remoteState.status === 'declined')) {
                console.log(`[useRoomSync] Remote user ${remoteState.status}. Closing room.`);
                if (isHost) {
                    RoomsService.leaveRoom(roomId, true).catch(() => {});
                }
                if (onRoomClosed) onRoomClosed();
                return;
            }
            
            setRemoteTimerState(remoteState);
        };

        // Fetch initial state on mount
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
                console.log("[useRoomSync] Room was deleted. Closing room.");
                if (onRoomClosed) onRoomClosed();
            })
            .on('broadcast', { event: 'room_left' }, () => {
                console.log("[useRoomSync] Remote user left the room via broadcast. Closing room.");
                if (isHost) {
                    RoomsService.leaveRoom(roomId, true).catch(() => {});
                }
                if (onRoomClosed) onRoomClosed();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, isHost, onRoomClosed]);
    
    // Watchdog ONLY for pending/unaccepted invites (5 minutes timeout)
    useEffect(() => {
        if (!roomId) return;

        // An active room has remoteTimerState populated with an active or paused timer
        const isPendingInvite = !remoteTimerState || Object.keys(remoteTimerState).length === 0;
        
        // Active sessions should NEVER be auto-deleted while user has the room open
        if (!isPendingInvite) {
            return;
        }

        const pendingGracePeriod = 5 * 60 * 1000; // 5 mins
        console.log(`[Watchdog] Pending invite timeout armed for 5 minutes.`);

        const timeout = setTimeout(() => {
            console.log(`[Watchdog] Pending invite timed out without acceptance. Abandoning room.`);
            RoomsService.leaveRoom(roomId, isHost);
            if (onRoomClosed) onRoomClosed();
        }, pendingGracePeriod);

        return () => clearTimeout(timeout);
    }, [roomId, isHost, remoteTimerState, onRoomClosed]);

    return { stateVersion, remoteTimerState, isReady };
};
