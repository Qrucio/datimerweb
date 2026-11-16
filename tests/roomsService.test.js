import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RoomsService } from '../src/services/roomsService.js';
import { mockSupabase } from './mockSupabase.js';
import { mockLocalStorage } from './mockLocalStorage.js';

describe('RoomsService', () => {
    beforeEach(() => {
        mockSupabase.reset();
        mockLocalStorage.clear();
    });

    describe('createRoom', () => {
        test('new room creation with initialHostTimerState populates host_timer_state immediately upon INSERT', async () => {
            const hostId = 'user_host_1';
            const guestId = 'user_guest_1';
            const initialTimerState = {
                mode: 'focus',
                remainingDuration: 1500000,
                totalDuration: 1500,
                isActive: false
            };

            const result = await RoomsService.createRoom(hostId, guestId, initialTimerState);

            assert.equal(result.success, true);
            assert.ok(result.room);
            assert.equal(result.room.host_id, hostId);
            assert.equal(result.room.participant_id, guestId);
            assert.equal(result.room.state_version, 1);
            assert.deepEqual(result.room.host_timer_state, initialTimerState);

            // Verify query log
            const insertQueries = mockSupabase.queryLog.filter(q => q.action === 'insert');
            assert.equal(insertQueries.length, 1);
            assert.equal(insertQueries[0].payload.host_id, hostId);
            assert.equal(insertQueries[0].payload.participant_id, guestId);
            assert.deepEqual(insertQueries[0].payload.host_timer_state, initialTimerState);
        });

        test('new room creation without initialHostTimerState omits host_timer_state from INSERT payload', async () => {
            const hostId = 'user_host_2';
            const guestId = 'user_guest_2';

            const result = await RoomsService.createRoom(hostId, guestId);

            assert.equal(result.success, true);
            assert.ok(result.room);
            assert.equal(result.room.host_id, hostId);
            assert.equal(result.room.participant_id, guestId);
            assert.equal(result.room.host_timer_state, undefined);

            const insertQuery = mockSupabase.queryLog.find(q => q.action === 'insert');
            assert.ok(!('host_timer_state' in insertQuery.payload));
        });

        test('re-invite when previous invite was unaccepted (stale row): deletes stale row and creates fresh room', async () => {
            const hostId = 'user_host_1';
            const guestId = 'user_guest_1';
            const staleRoom = {
                id: 'stale_room_123',
                host_id: hostId,
                participant_id: guestId,
                participant_timer_state: null,
                state_version: 1
            };
            mockSupabase.tables.rooms.push(staleRoom);

            const initialTimer = { mode: 'focus', remainingDuration: 1200000, isActive: false };
            const result = await RoomsService.createRoom(hostId, guestId, initialTimer);

            assert.equal(result.success, true);
            assert.notEqual(result.room.id, staleRoom.id, 'Fresh room must have a new ID so Realtime INSERT fires');

            // Verify stale room was deleted
            const deleteQueries = mockSupabase.queryLog.filter(q => q.action === 'delete');
            assert.equal(deleteQueries.length, 1);
            assert.equal(deleteQueries[0].filters.some(f => f.col === 'id' && f.val === staleRoom.id), true);

            // Verify stale room is no longer in mock DB
            const existingStale = mockSupabase.tables.rooms.find(r => r.id === staleRoom.id);
            assert.equal(existingStale, undefined);
        });

        test('re-invite when previous invite was declined: deletes stale row and creates fresh room', async () => {
            const hostId = 'user_host_1';
            const guestId = 'user_guest_1';
            const declinedRoom = {
                id: 'declined_room_456',
                host_id: hostId,
                participant_id: guestId,
                participant_timer_state: { status: 'declined' },
                state_version: 1
            };
            mockSupabase.tables.rooms.push(declinedRoom);

            const result = await RoomsService.createRoom(hostId, guestId);

            assert.equal(result.success, true);
            assert.notEqual(result.room.id, declinedRoom.id);

            const deleteQueries = mockSupabase.queryLog.filter(q => q.action === 'delete');
            assert.equal(deleteQueries.length, 1);
            assert.equal(deleteQueries[0].filters.some(f => f.col === 'id' && f.val === declinedRoom.id), true);
        });

        test('re-invite when previous participant left: deletes stale row and creates fresh room', async () => {
            const hostId = 'user_host_1';
            const guestId = 'user_guest_1';
            const leftRoom = {
                id: 'left_room_789',
                host_id: hostId,
                participant_id: guestId,
                participant_timer_state: { status: 'left' },
                state_version: 2
            };
            mockSupabase.tables.rooms.push(leftRoom);

            const result = await RoomsService.createRoom(hostId, guestId);

            assert.equal(result.success, true);
            assert.notEqual(result.room.id, leftRoom.id);

            const deleteQueries = mockSupabase.queryLog.filter(q => q.action === 'delete');
            assert.equal(deleteQueries.length, 1);
            assert.equal(deleteQueries[0].filters.some(f => f.col === 'id' && f.val === leftRoom.id), true);
        });

        test('re-invite when active coworking session is already in progress: preserves active room without deletion', async () => {
            const hostId = 'user_host_1';
            const guestId = 'user_guest_1';
            const activeRoom = {
                id: 'active_session_room',
                host_id: hostId,
                participant_id: guestId,
                participant_timer_state: {
                    mode: 'focus',
                    remainingDuration: 1400000,
                    isActive: true
                },
                host_timer_state: {
                    mode: 'focus',
                    remainingDuration: 1400000,
                    isActive: true
                },
                state_version: 3
            };
            mockSupabase.tables.rooms.push(activeRoom);

            const result = await RoomsService.createRoom(hostId, guestId);

            assert.equal(result.success, true);
            assert.equal(result.room.id, activeRoom.id, 'Active session room must be preserved');

            // Ensure NO delete query was executed
            const deleteQueries = mockSupabase.queryLog.filter(q => q.action === 'delete');
            assert.equal(deleteQueries.length, 0);

            // Ensure NO insert query was executed
            const insertQueries = mockSupabase.queryLog.filter(q => q.action === 'insert');
            assert.equal(insertQueries.length, 0);
        });

        test('returns failure if room creation query throws an error', async () => {
            mockSupabase.mockQuery({ table: 'rooms', action: 'insert' }, () => {
                return { data: null, error: new Error('Database insert timeout') };
            });

            const result = await RoomsService.createRoom('h1', 'g1');
            assert.equal(result.success, false);
            assert.ok(result.error);
        });
    });

    describe('leaveRoom', () => {
        test('host leaving: broadcasts room_left and deletes room row without updating participant state', async () => {
            const roomId = 'room_host_leave_1';
            mockSupabase.tables.rooms.push({ id: roomId, host_id: 'host1' });

            const result = await RoomsService.leaveRoom(roomId, true);

            assert.equal(result.success, true);

            // 1. Verify broadcast
            const broadcast = mockSupabase.broadcastLog.find(b => b.channel === `room_sync:${roomId}`);
            assert.ok(broadcast);
            assert.equal(broadcast.msg.event, 'room_left');
            assert.deepEqual(broadcast.msg.payload, { roomId });

            // 2. Verify no participant update
            const updateQueries = mockSupabase.queryLog.filter(q => q.action === 'update');
            assert.equal(updateQueries.length, 0);

            // 3. Verify delete query
            const deleteQuery = mockSupabase.queryLog.find(q => q.action === 'delete');
            assert.ok(deleteQuery);
            assert.equal(deleteQuery.filters.some(f => f.col === 'id' && f.val === roomId), true);
        });

        test('host leaving: propagates error if delete throws for host', async () => {
            const roomId = 'room_host_err';
            mockSupabase.mockQuery(
                (q) => q.table === 'rooms' && q.action === 'delete' && q.filters.some(f => f.val === roomId),
                { data: null, error: new Error('RLS host delete error') }
            );

            const result = await RoomsService.leaveRoom(roomId, true);
            assert.equal(result.success, false);
            assert.ok(result.error);
        });

        test('guest leaving: broadcasts room_left + sets participant_timer_state to status: left as fallback', async () => {
            const roomId = 'room_guest_leave_1';
            mockSupabase.tables.rooms.push({ id: roomId, host_id: 'host1', participant_id: 'guest1' });

            const result = await RoomsService.leaveRoom(roomId, false);

            assert.equal(result.success, true);

            // 1. Verify broadcast
            const broadcast = mockSupabase.broadcastLog.find(b => b.channel === `room_sync:${roomId}`);
            assert.ok(broadcast);
            assert.equal(broadcast.msg.event, 'room_left');

            // 2. Verify participant update with status: left
            const updateQuery = mockSupabase.queryLog.find(q => q.action === 'update');
            assert.ok(updateQuery, 'Guest must update participant_timer_state as fallback');
            assert.deepEqual(updateQuery.payload, { participant_timer_state: { status: 'left' } });
            assert.equal(updateQuery.filters.some(f => f.col === 'id' && f.val === roomId), true);

            // 3. Verify delete attempt
            const deleteQuery = mockSupabase.queryLog.find(q => q.action === 'delete');
            assert.ok(deleteQuery);
        });

        test('guest leaving: absorbs delete error when guest RLS blocks delete', async () => {
            const roomId = 'room_guest_rls_delete_fail';
            // Simulate RLS error on delete for guest
            mockSupabase.mockQuery(
                (q) => q.table === 'rooms' && q.action === 'delete' && q.filters.some(f => f.val === roomId),
                { data: null, error: { message: 'new row violates row-level security policy for table rooms', code: '42501' } }
            );

            const result = await RoomsService.leaveRoom(roomId, false);
            // Guest leave should succeed because guest delete error is safely ignored
            assert.equal(result.success, true);
        });
    });

    describe('declineInvite', () => {
        test('guest declining: caches declined ID in localStorage, broadcasts room_declined, updates DB state, and attempts delete', async () => {
            const roomId = 'room_decline_test_1';
            mockSupabase.tables.rooms.push({ id: roomId, host_id: 'h1', participant_id: 'g1' });

            const result = await RoomsService.declineInvite(roomId);

            assert.equal(result.success, true);

            // 1. Verify localStorage declined set
            const declinedStored = JSON.parse(mockLocalStorage.getItem('datimer_declined_invites') || '[]');
            assert.ok(declinedStored.includes(roomId));

            // 2. Verify broadcast on room_accept channel
            const broadcast = mockSupabase.broadcastLog.find(b => b.channel === `room_accept:${roomId}`);
            assert.ok(broadcast, 'Must broadcast over accept channel');
            assert.equal(broadcast.msg.event, 'room_declined');
            assert.deepEqual(broadcast.msg.payload, { roomId });

            // 3. Verify DB update
            const updateQuery = mockSupabase.queryLog.find(q => q.action === 'update');
            assert.ok(updateQuery);
            assert.deepEqual(updateQuery.payload, { participant_timer_state: { status: 'declined' } });
            assert.equal(updateQuery.filters.some(f => f.col === 'id' && f.val === roomId), true);

            // 4. Verify delete attempt
            const deleteQuery = mockSupabase.queryLog.find(q => q.action === 'delete');
            assert.ok(deleteQuery);
        });

        test('multiple declined invites accumulate in localStorage without duplicates', async () => {
            await RoomsService.declineInvite('room_1');
            await RoomsService.declineInvite('room_2');
            await RoomsService.declineInvite('room_1'); // Duplicate decline

            const declined = JSON.parse(mockLocalStorage.getItem('datimer_declined_invites') || '[]');
            assert.equal(declined.length, 2);
            assert.ok(declined.includes('room_1'));
            assert.ok(declined.includes('room_2'));
        });
    });

    describe('mutateState', () => {
        test('success via OCC RPC mutate_room_state', async () => {
            const roomId = 'room_occ_1';
            const expectedVersion = 3;
            const isHost = true;
            const newState = { mode: 'focus', remainingDuration: 1200000, isActive: true };

            mockSupabase.mockRpc('mutate_room_state', (params) => {
                assert.equal(params.p_room_id, roomId);
                assert.equal(params.p_expected_version, expectedVersion);
                assert.equal(params.p_is_host, isHost);
                assert.deepEqual(params.p_new_timer_state, newState);
                return { data: null, error: null };
            });

            const result = await RoomsService.mutateState(roomId, expectedVersion, isHost, newState);

            assert.equal(result.success, true);
            // Ensure no fallback direct update query was executed
            const updateQueries = mockSupabase.queryLog.filter(q => q.action === 'update');
            assert.equal(updateQueries.length, 0);
        });

        test('graceful fallback to direct DB update for host when OCC RPC returns an error', async () => {
            const roomId = 'room_occ_fallback_host';
            const expectedVersion = 1;
            const isHost = true;
            const newState = { mode: 'shortBreak', remainingDuration: 300000, isActive: true };

            mockSupabase.tables.rooms.push({ id: roomId, state_version: 1, host_timer_state: null });

            // Simulate OCC RPC error (e.g. version conflict or function error)
            mockSupabase.mockRpc('mutate_room_state', {
                data: null,
                error: { message: 'state_version mismatch', code: 'P0001' }
            });

            const result = await RoomsService.mutateState(roomId, expectedVersion, isHost, newState);

            assert.equal(result.success, true);

            // Direct update fallback must have fired with host_timer_state
            const updateQuery = mockSupabase.queryLog.find(q => q.action === 'update');
            assert.ok(updateQuery);
            assert.deepEqual(updateQuery.payload, { host_timer_state: newState });
            assert.equal(updateQuery.filters.some(f => f.col === 'id' && f.val === roomId), true);
        });

        test('graceful fallback to direct DB update for participant when OCC RPC returns an error', async () => {
            const roomId = 'room_occ_fallback_guest';
            const expectedVersion = 2;
            const isHost = false;
            const newState = { mode: 'focus', remainingDuration: 1400000, isActive: true };

            mockSupabase.tables.rooms.push({ id: roomId, state_version: 2, participant_timer_state: null });

            mockSupabase.mockRpc('mutate_room_state', {
                data: null,
                error: new Error('RPC unavailable')
            });

            const result = await RoomsService.mutateState(roomId, expectedVersion, isHost, newState);

            assert.equal(result.success, true);

            // Direct update fallback must have fired with participant_timer_state
            const updateQuery = mockSupabase.queryLog.find(q => q.action === 'update');
            assert.ok(updateQuery);
            assert.deepEqual(updateQuery.payload, { participant_timer_state: newState });
            assert.equal(updateQuery.filters.some(f => f.col === 'id' && f.val === roomId), true);
        });

        test('returns failure if both OCC RPC and fallback direct DB update fail', async () => {
            const roomId = 'room_both_fail';
            mockSupabase.mockRpc('mutate_room_state', {
                data: null,
                error: new Error('RPC failure')
            });
            mockSupabase.mockQuery(
                (q) => q.table === 'rooms' && q.action === 'update',
                { data: null, error: new Error('Direct update failure') }
            );

            const result = await RoomsService.mutateState(roomId, 1, true, { mode: 'focus' });
            assert.equal(result.success, false);
            assert.ok(result.error);
        });
    });

    describe('getPendingInvite', () => {
        test('returns pending invite when room exists and is not declined or left', async () => {
            const userId = 'guest_target_1';
            const inviteRoom = {
                id: 'invite_1',
                host_id: 'host_99',
                participant_id: userId,
                participant_timer_state: null,
                created_at: new Date().toISOString()
            };
            mockSupabase.tables.rooms.push(inviteRoom);

            const result = await RoomsService.getPendingInvite(userId);
            assert.equal(result.success, true);
            assert.deepEqual(result.invite, inviteRoom);
        });

        test('ignores excluded roomId', async () => {
            const userId = 'guest_target_1';
            const currentRoomId = 'current_room_100';
            mockSupabase.tables.rooms.push({
                id: currentRoomId,
                host_id: 'host_99',
                participant_id: userId,
                created_at: new Date().toISOString()
            });

            const result = await RoomsService.getPendingInvite(userId, currentRoomId);
            assert.equal(result.success, true);
            assert.equal(result.invite, null);

            // Verify query applied neq filter
            const selectQuery = mockSupabase.queryLog.find(q => q.action === 'select');
            assert.ok(selectQuery);
            assert.equal(selectQuery.filters.some(f => f.op === 'neq' && f.col === 'id' && f.val === currentRoomId), true);
        });

        test('ignores invites marked declined in local storage cache', async () => {
            const userId = 'guest_target_1';
            const roomId = 'declined_in_cache_room';
            mockSupabase.tables.rooms.push({
                id: roomId,
                host_id: 'host_99',
                participant_id: userId,
                created_at: new Date().toISOString()
            });

            // Mark declined in localStorage
            mockLocalStorage.setItem('datimer_declined_invites', JSON.stringify([roomId]));

            const result = await RoomsService.getPendingInvite(userId);
            assert.equal(result.success, true);
            assert.equal(result.invite, null);
        });

        test('ignores invites where participant is already marked as declined in DB', async () => {
            const userId = 'guest_target_1';
            mockSupabase.tables.rooms.push({
                id: 'declined_in_db_room',
                host_id: 'host_99',
                participant_id: userId,
                participant_timer_state: { status: 'declined' },
                created_at: new Date().toISOString()
            });

            const result = await RoomsService.getPendingInvite(userId);
            assert.equal(result.success, true);
            assert.equal(result.invite, null);
        });

        test('ignores invites where participant is already marked as left in DB', async () => {
            const userId = 'guest_target_1';
            mockSupabase.tables.rooms.push({
                id: 'left_in_db_room',
                host_id: 'host_99',
                participant_id: userId,
                participant_timer_state: { status: 'left' },
                created_at: new Date().toISOString()
            });

            const result = await RoomsService.getPendingInvite(userId);
            assert.equal(result.success, true);
            assert.equal(result.invite, null);
        });

        test('handles PGRST116 (no rows found) gracefully without error', async () => {
            const result = await RoomsService.getPendingInvite('non_existent_user');
            assert.equal(result.success, true);
            assert.equal(result.invite, null);
        });

        test('returns failure when database query encounters an unexpected error', async () => {
            mockSupabase.mockQuery(
                (q) => q.table === 'rooms' && q.action === 'select',
                { data: null, error: { code: 'PGRST500', message: 'Internal server error' } }
            );

            const result = await RoomsService.getPendingInvite('user_1');
            assert.equal(result.success, false);
            assert.ok(result.error);
        });
    });

    describe('getRoom', () => {
        test('returns room details when found', async () => {
            const roomId = 'room_found_1';
            const roomData = { id: roomId, host_id: 'h1', participant_id: 'g1', state_version: 5 };
            mockSupabase.tables.rooms.push(roomData);

            const result = await RoomsService.getRoom(roomId);
            assert.equal(result.success, true);
            assert.deepEqual(result.room, roomData);
        });

        test('returns failure if room not found or query errors', async () => {
            const result = await RoomsService.getRoom('non_existent_room_id');
            assert.equal(result.success, false);
            assert.ok(result.error);
        });
    });

    describe('syncClock and getSyncedTime', () => {
        test('averages server offsets and returns synced time', async () => {
            const now = Date.now();
            // Mock get_server_time with a +500ms offset
            mockSupabase.mockRpc('get_server_time', () => {
                return { data: Date.now() + 500, error: null };
            });

            await RoomsService.syncClock();
            const synced = RoomsService.getSyncedTime();

            // Synced time should be roughly Date.now() + 500ms (within 50ms tolerance)
            assert.ok(synced >= Date.now() + 450);
            assert.ok(synced <= Date.now() + 550);
        });

        test('tolerates failures in individual clock sync iterations', async () => {
            let attempt = 0;
            mockSupabase.mockRpc('get_server_time', () => {
                attempt++;
                if (attempt === 2 || attempt === 4) {
                    return { data: null, error: new Error('Network jitter') };
                }
                return { data: Date.now() + 200, error: null };
            });

            await RoomsService.syncClock();
            const synced = RoomsService.getSyncedTime();
            assert.ok(typeof synced === 'number');
        });
    });
});
