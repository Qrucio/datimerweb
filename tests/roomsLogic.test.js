import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RoomsService } from '../src/services/roomsService.js';
import { mockSupabase } from './mockSupabase.js';
import { mockLocalStorage } from './mockLocalStorage.js';

/**
 * Controller class that simulates the state machine and effects of useRoomSync.jsx
 * This allows rigorous, deterministic testing of all async loops, timeouts, retries,
 * and realtime event handlers without requiring a browser DOM environment.
 */
class RoomSyncController {
    constructor({ roomId, isHost, localTimerState, onRoomClosed }) {
        this.roomId = roomId;
        this.isHost = isHost;
        this.localTimerState = localTimerState;
        this.onRoomClosed = onRoomClosed;

        this.stateVersion = 0;
        this.remoteTimerState = null;
        this.isReady = false;

        this.lastBroadcastState = null;
        this.isSyncing = false;
        this.stateVersionRef = 0;
        this.latestStateRef = localTimerState;
        this.hasPendingSync = false;

        this.watchdogTimer = null;
        this.channel = null;
        this.mounted = true;

        this.init();
    }

    init() {
        // Reset state on init / room change
        this.lastBroadcastState = null;
        this.isSyncing = false;
        this.stateVersionRef = 0;
        this.hasPendingSync = false;
        this.stateVersion = 0;
        this.remoteTimerState = null;
        this.isReady = false;

        this.setupRealtime();
        this.evaluateWatchdog();
    }

    setLocalTimerState(newState) {
        this.localTimerState = newState;
        this.latestStateRef = newState;

        if (!this.roomId || !this.localTimerState || !this.isReady) return;

        const strState = JSON.stringify(this.localTimerState);
        if (this.lastBroadcastState === strState) return;

        if (this.isSyncing) {
            this.hasPendingSync = true;
            return;
        }

        this.performSync();
    }

    setRemoteTimerState(remoteState) {
        this.remoteTimerState = remoteState;
        this.evaluateWatchdog();
    }

    async performSync() {
        if (!this.roomId || !this.latestStateRef) {
            this.isSyncing = false;
            this.hasPendingSync = false;
            return;
        }

        const stateToSync = this.latestStateRef;
        const strState = JSON.stringify(stateToSync);

        if (this.lastBroadcastState === strState) {
            this.isSyncing = false;
            this.hasPendingSync = false;
            return;
        }

        this.lastBroadcastState = strState;
        this.hasPendingSync = false;
        this.isSyncing = true;

        let success = false;
        let retries = 0;
        const maxRetries = 5;

        while (!success && retries < maxRetries) {
            const currentVersion = this.stateVersionRef;
            const res = await RoomsService.mutateState(this.roomId, currentVersion, this.isHost, stateToSync);
            if (res.success) {
                this.stateVersion = currentVersion + 1;
                this.stateVersionRef = currentVersion + 1;
                success = true;
            } else {
                // Exponential backoff
                await new Promise(r => setTimeout(r, 40 * (2 ** retries)));

                const { room } = await RoomsService.getRoom(this.roomId);
                if (room) {
                    this.stateVersion = room.state_version;
                    this.stateVersionRef = room.state_version;
                }
                retries++;
            }
        }

        if (!success) {
            this.lastBroadcastState = null;
        }

        this.isSyncing = false;

        if (this.hasPendingSync) {
            await this.performSync();
        }
    }

    processRoomState(room) {
        if (!room) return;
        this.stateVersion = room.state_version;
        this.stateVersionRef = room.state_version;

        const remoteState = this.isHost ? room.participant_timer_state : room.host_timer_state;

        if (remoteState && (remoteState.status === 'left' || remoteState.status === 'declined')) {
            if (this.isHost) {
                RoomsService.leaveRoom(this.roomId, true).catch(() => {});
            }
            if (this.onRoomClosed) this.onRoomClosed();
            return;
        }

        this.setRemoteTimerState(remoteState);
    }

    setupRealtime() {
        if (!this.roomId) return;
        this.isReady = false;
        this.hasReceivedRealtimeUpdate = false;

        this.channel = mockSupabase.channel(`room_sync:${this.roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${this.roomId}` }, (payload) => {
                this.hasReceivedRealtimeUpdate = true;
                this.processRoomState(payload.new);
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rooms', filter: `id=eq.${this.roomId}` }, () => {
                if (this.onRoomClosed) this.onRoomClosed();
            })
            .on('broadcast', { event: 'room_left' }, () => {
                if (this.isHost) {
                    RoomsService.leaveRoom(this.roomId, true).catch(() => {});
                }
                if (this.onRoomClosed) this.onRoomClosed();
            });

        this.channel.subscribe(() => {});

        // Fetch initial state
        RoomsService.getRoom(this.roomId).then(({ room }) => {
            if (room && !this.hasReceivedRealtimeUpdate) {
                this.processRoomState(room);
            }
            this.isReady = true;
        });
    }

    evaluateWatchdog() {
        if (!this.roomId) return;

        // Clear existing watchdog timer
        if (this.watchdogTimer) {
            clearTimeout(this.watchdogTimer);
            this.watchdogTimer = null;
        }

        const isPendingInvite = !this.remoteTimerState || Object.keys(this.remoteTimerState).length === 0;

        // Active sessions should NEVER be auto-deleted while user has the room open
        if (!isPendingInvite) {
            return;
        }

        const pendingGracePeriod = 5 * 60 * 1000; // 5 mins
        this.watchdogTimer = setTimeout(() => {
            RoomsService.leaveRoom(this.roomId, this.isHost);
            if (this.onRoomClosed) this.onRoomClosed();
        }, pendingGracePeriod);
    }

    cleanup() {
        this.mounted = false;
        if (this.watchdogTimer) {
            clearTimeout(this.watchdogTimer);
            this.watchdogTimer = null;
        }
        if (this.channel) {
            mockSupabase.removeChannel(this.channel);
        }
    }
}

describe('Rooms Logic & Watchdog (useRoomSync behavior)', () => {
    beforeEach(() => {
        mockSupabase.reset();
        mockLocalStorage.clear();
    });

    describe('Watchdog Logic', () => {
        test('pending unaccepted invite times out after 5 minutes and cleans up room', async (t) => {
            t.mock.timers.enable({ apis: ['setTimeout'] });

            let roomClosedCalled = false;
            const roomId = 'room_pending_watchdog';
            mockSupabase.tables.rooms.push({
                id: roomId,
                host_id: 'host_1',
                participant_id: 'guest_1',
                participant_timer_state: null,
                state_version: 1
            });

            const controller = new RoomSyncController({
                roomId,
                isHost: true,
                localTimerState: { mode: 'focus', remainingDuration: 1500000 },
                onRoomClosed: () => {
                    roomClosedCalled = true;
                }
            });

            // Fast-forward 4 minutes: should NOT have timed out yet
            t.mock.timers.tick(4 * 60 * 1000);
            assert.equal(roomClosedCalled, false, 'Should not time out before 5 minutes');

            // Fast-forward past 5 minutes: watchdog should trigger
            t.mock.timers.tick(1 * 60 * 1000 + 100);
            assert.equal(roomClosedCalled, true, 'Watchdog should trigger onRoomClosed after 5 minutes');

            // Advance inner timers to allow leaveRoom broadcast to subscribe and send
            t.mock.timers.tick(500);
            await new Promise(r => setImmediate(r));

            // Verify leaveRoom was called on RoomsService (deletion attempted)
            const deleteQuery = mockSupabase.queryLog.find(q => q.action === 'delete');
            assert.ok(deleteQuery, 'Room delete must be attempted on timeout');

            controller.cleanup();
        });

        test('active room cancels watchdog timeout when participant accepts invite', (t) => {
            t.mock.timers.enable({ apis: ['setTimeout'] });

            let roomClosedCalled = false;
            const roomId = 'room_accept_cancels_watchdog';
            mockSupabase.tables.rooms.push({
                id: roomId,
                host_id: 'host_1',
                participant_id: 'guest_1',
                participant_timer_state: null,
                state_version: 1
            });

            const controller = new RoomSyncController({
                roomId,
                isHost: true,
                localTimerState: { mode: 'focus', remainingDuration: 1500000 },
                onRoomClosed: () => {
                    roomClosedCalled = true;
                }
            });

            // 2 minutes elapse
            t.mock.timers.tick(2 * 60 * 1000);

            // Participant accepts! Remote state becomes populated
            controller.setRemoteTimerState({
                mode: 'focus',
                remainingDuration: 1500000,
                isActive: false
            });

            // Fast-forward past original 5-minute mark (another 5 minutes)
            t.mock.timers.tick(5 * 60 * 1000);
            assert.equal(roomClosedCalled, false, 'Watchdog must NOT fire because session is now active');

            controller.cleanup();
        });

        test('paused active room is NOT deleted after 15 minutes', (t) => {
            t.mock.timers.enable({ apis: ['setTimeout'] });

            let roomClosedCalled = false;
            const roomId = 'room_paused_15m_test';
            mockSupabase.tables.rooms.push({
                id: roomId,
                host_id: 'host_1',
                participant_id: 'guest_1',
                host_timer_state: { mode: 'focus', remainingDuration: 1200000, isActive: false },
                participant_timer_state: { mode: 'focus', remainingDuration: 1200000, isActive: false },
                state_version: 2
            });

            const controller = new RoomSyncController({
                roomId,
                isHost: true,
                localTimerState: { mode: 'focus', remainingDuration: 1200000, isActive: false },
                onRoomClosed: () => {
                    roomClosedCalled = true;
                }
            });

            // Simulate populated active session (paused timer)
            controller.setRemoteTimerState({
                mode: 'focus',
                remainingDuration: 1200000,
                isActive: false
            });

            // Fast forward 15 minutes (900,000ms)
            t.mock.timers.tick(15 * 60 * 1000);

            assert.equal(roomClosedCalled, false, 'Paused active room must NOT be auto-closed after 15m');

            // Even after 30 minutes, an active session with an open room stays alive
            t.mock.timers.tick(15 * 60 * 1000);
            assert.equal(roomClosedCalled, false, 'Paused active room must NOT be auto-closed after 30m');

            // Ensure no room deletion query was issued
            const deleteQueries = mockSupabase.queryLog.filter(q => q.action === 'delete');
            assert.equal(deleteQueries.length, 0);

            controller.cleanup();
        });
    });

    describe('OCC Concurrency & Retry Loop', () => {
        test('broadcast state successfully mutates state and increments stateVersion', async () => {
            const roomId = 'room_sync_success';
            mockSupabase.tables.rooms.push({
                id: roomId,
                state_version: 1
            });

            const controller = new RoomSyncController({
                roomId,
                isHost: true,
                localTimerState: null,
                onRoomClosed: () => {}
            });
            controller.isReady = true;

            const newState = { mode: 'focus', remainingDuration: 1500000, isActive: true };
            controller.setLocalTimerState(newState);

            // Wait for sync to finish
            await new Promise(r => setTimeout(r, 20));

            assert.equal(controller.stateVersion, 1);
            assert.equal(controller.isSyncing, false);

            controller.cleanup();
        });

        test('broadcast deduplication: identical states do not trigger redundant mutateState calls', async () => {
            const roomId = 'room_dedupe_test';
            mockSupabase.tables.rooms.push({ id: roomId, state_version: 1 });

            let mutateCount = 0;
            mockSupabase.mockRpc('mutate_room_state', () => {
                mutateCount++;
                return { data: null, error: null };
            });

            const controller = new RoomSyncController({
                roomId,
                isHost: true,
                localTimerState: null,
                onRoomClosed: () => {}
            });
            controller.isReady = true;

            const state = { mode: 'focus', remainingDuration: 1500000, isActive: false };
            controller.setLocalTimerState(state);
            await new Promise(r => setTimeout(r, 20));
            assert.equal(mutateCount, 1);

            // Set identical state again
            controller.setLocalTimerState({ mode: 'focus', remainingDuration: 1500000, isActive: false });
            await new Promise(r => setTimeout(r, 20));
            assert.equal(mutateCount, 1, 'Should not broadcast duplicate state');

            controller.cleanup();
        });

        test('OCC Conflict retry loop: retries up to 5 times with backoff, updates version from server, and succeeds', async () => {
            const roomId = 'room_occ_conflict_retry';
            const roomRecord = { id: roomId, state_version: 1 };
            mockSupabase.tables.rooms.push(roomRecord);

            let attempts = 0;
            mockSupabase.mockRpc('mutate_room_state', (params) => {
                attempts++;
                if (attempts < 3) {
                    // Simulate OCC conflict: someone else incremented version to 2
                    roomRecord.state_version = 2;
                    return { data: null, error: { message: 'Version conflict', code: 'OCC_CONFLICT' } };
                }
                // Attempt 3 succeeds with version 2
                assert.equal(params.p_expected_version, 2);
                roomRecord.state_version = 3;
                return { data: null, error: null };
            });

            // Ensure fallback direct update also fails on attempts 1 and 2 to simulate true OCC conflict
            mockSupabase.mockQuery(
                (q) => q.table === 'rooms' && q.action === 'update' && attempts < 3,
                () => ({ data: null, error: new Error('OCC Conflict on direct update') })
            );

            const controller = new RoomSyncController({
                roomId,
                isHost: true,
                localTimerState: null,
                onRoomClosed: () => {}
            });
            controller.isReady = true;

            controller.setLocalTimerState({ mode: 'focus', remainingDuration: 1000000 });

            // Wait for retry loop and backoff
            await new Promise(r => setTimeout(r, 350));

            assert.equal(attempts, 3, 'Should have retried until succeeding on attempt 3');
            assert.equal(controller.stateVersion, 3);
            assert.equal(controller.isSyncing, false);

            controller.cleanup();
        });

        test('queues pending sync when state updates while a sync is already in flight', async () => {
            const roomId = 'room_queue_flight';
            mockSupabase.tables.rooms.push({ id: roomId, state_version: 1 });

            const syncedStates = [];
            mockSupabase.mockRpc('mutate_room_state', (params) => {
                syncedStates.push(params.p_new_timer_state);
                return new Promise(resolve => {
                    setTimeout(() => resolve({ data: null, error: null }), 50);
                });
            });

            const controller = new RoomSyncController({
                roomId,
                isHost: true,
                localTimerState: null,
                onRoomClosed: () => {}
            });
            controller.isReady = true;

            // Trigger first sync (takes 50ms)
            controller.setLocalTimerState({ mode: 'focus', remainingDuration: 1500000 });
            assert.equal(controller.isSyncing, true);

            // While in flight, update state twice rapidly
            controller.setLocalTimerState({ mode: 'focus', remainingDuration: 1499000 });
            controller.setLocalTimerState({ mode: 'focus', remainingDuration: 1498000 });

            // Wait for in-flight sync and queued sync to finish
            await new Promise(r => setTimeout(r, 160));

            // First sync synced 1500000, then queued sync synced latest state (1498000)
            assert.equal(syncedStates.length, 2);
            assert.equal(syncedStates[0].remainingDuration, 1500000);
            assert.equal(syncedStates[1].remainingDuration, 1498000);

            controller.cleanup();
        });
    });

    describe('Realtime Events and Signals', () => {
        test('remote participant marks status: left triggers room close and host cleanup', async () => {
            let roomClosed = false;
            const roomId = 'room_remote_left_test';
            mockSupabase.tables.rooms.push({ id: roomId, host_id: 'host1', state_version: 1 });

            const controller = new RoomSyncController({
                roomId,
                isHost: true,
                localTimerState: { mode: 'focus' },
                onRoomClosed: () => {
                    roomClosed = true;
                }
            });

            // Simulate Postgres UPDATE change payload from Supabase Realtime
            controller.processRoomState({
                id: roomId,
                state_version: 2,
                participant_timer_state: { status: 'left' }
            });

            assert.equal(roomClosed, true, 'Must call onRoomClosed when remote user left');

            // Wait for host leaveRoom
            await new Promise(r => setTimeout(r, 20));
            const deleteQuery = mockSupabase.queryLog.find(q => q.action === 'delete');
            assert.ok(deleteQuery, 'Host must delete room when participant leaves');

            controller.cleanup();
        });

        test('remote participant marks status: declined triggers room close and host cleanup', async () => {
            let roomClosed = false;
            const roomId = 'room_remote_declined_test';
            mockSupabase.tables.rooms.push({ id: roomId, host_id: 'host1', state_version: 1 });

            const controller = new RoomSyncController({
                roomId,
                isHost: true,
                localTimerState: { mode: 'focus' },
                onRoomClosed: () => {
                    roomClosed = true;
                }
            });

            controller.processRoomState({
                id: roomId,
                state_version: 2,
                participant_timer_state: { status: 'declined' }
            });

            assert.equal(roomClosed, true, 'Must call onRoomClosed when remote user declined');

            await new Promise(r => setTimeout(r, 20));
            const deleteQuery = mockSupabase.queryLog.find(q => q.action === 'delete');
            assert.ok(deleteQuery, 'Host must delete room when participant declines');

            controller.cleanup();
        });

        test('Postgres DELETE event on room triggers onRoomClosed', () => {
            let roomClosed = false;
            const roomId = 'room_delete_event_test';

            const controller = new RoomSyncController({
                roomId,
                isHost: false,
                localTimerState: { mode: 'focus' },
                onRoomClosed: () => {
                    roomClosed = true;
                }
            });

            // Trigger DELETE event on channel
            controller.channel.__trigger('postgres_changes', {
                eventType: 'DELETE',
                table: 'rooms',
                old: { id: roomId }
            });

            assert.equal(roomClosed, true, 'Must call onRoomClosed when room row is deleted');

            controller.cleanup();
        });

        test('Broadcast room_left event on room channel triggers onRoomClosed', () => {
            let roomClosed = false;
            const roomId = 'room_broadcast_left_test';

            const controller = new RoomSyncController({
                roomId,
                isHost: true,
                localTimerState: { mode: 'focus' },
                onRoomClosed: () => {
                    roomClosed = true;
                }
            });

            // Trigger broadcast room_left event
            controller.channel.__trigger('broadcast', {
                event: 'room_left',
                payload: { roomId }
            });

            assert.equal(roomClosed, true, 'Must call onRoomClosed when room_left broadcast is received');

            controller.cleanup();
        });
    });
});
