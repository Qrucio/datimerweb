import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { UserService } from '../src/services/userService.js';
import { supabase } from '../src/lib/supabase.js';
import { DB_TABLES, DB_RPC } from '../src/lib/constants.js';
import { createMockSupabase } from './helpers/mockSupabase.js';

process.env.NODE_ENV = 'test';

describe('UserService Unit Tests', () => {
  let mockSupabase;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    // Attach mock implementations onto supabase
    supabase.from = mockSupabase.from;
    supabase.rpc = mockSupabase.rpc;
    mockSupabase._clearLogs();
  });

  // -------------------------------------------------------------
  // checkHandle(handle, currentUserId)
  // -------------------------------------------------------------
  describe('checkHandle', () => {
    describe('Validation & Short/Long/Invalid Character Rules', () => {
      it('returns too-short when handle is empty string or whitespace', async () => {
        const resEmpty = await UserService.checkHandle('');
        assert.deepEqual(resEmpty, { success: true, available: false, reason: 'too-short' });

        const resSpaces = await UserService.checkHandle('    ');
        assert.deepEqual(resSpaces, { success: true, available: false, reason: 'too-short' });
      });

      it('returns too-short when handle is null or undefined', async () => {
        const resNull = await UserService.checkHandle(null);
        assert.deepEqual(resNull, { success: true, available: false, reason: 'too-short' });

        const resUndef = await UserService.checkHandle(undefined);
        assert.deepEqual(resUndef, { success: true, available: false, reason: 'too-short' });
      });

      it('returns too-short when handle length < 3', async () => {
        const res1 = await UserService.checkHandle('a');
        assert.deepEqual(res1, { success: true, available: false, reason: 'too-short' });

        const res2 = await UserService.checkHandle('ab');
        assert.deepEqual(res2, { success: true, available: false, reason: 'too-short' });

        // Leading @ stripped still leaves 1 or 2 chars
        const resAt1 = await UserService.checkHandle('@x');
        assert.deepEqual(resAt1, { success: true, available: false, reason: 'too-short' });

        const resAt2 = await UserService.checkHandle('@@xy');
        assert.deepEqual(resAt2, { success: true, available: false, reason: 'too-short' });
      });

      it('returns too-long when handle length > 20', async () => {
        const exact21 = 'a'.repeat(21);
        const res21 = await UserService.checkHandle(exact21);
        assert.deepEqual(res21, { success: true, available: false, reason: 'too-long' });

        const longWithAt = '@' + 'b'.repeat(21);
        const resLongAt = await UserService.checkHandle(longWithAt);
        assert.deepEqual(resLongAt, { success: true, available: false, reason: 'too-long' });
      });

      it('accepts handle with exact 3 and exact 20 characters', async () => {
        mockSupabase._setTableHandler(DB_TABLES.PROFILES, () => ({
          data: null,
          error: null
        }));

        const res3 = await UserService.checkHandle('abc');
        assert.equal(res3.success, true);
        assert.equal(res3.available, true);

        const res20 = await UserService.checkHandle('a'.repeat(20));
        assert.equal(res20.success, true);
        assert.equal(res20.available, true);
      });

      it('returns invalid-chars when handle contains hyphens, spaces, or symbols', async () => {
        const testCases = [
          'user-name',   // hyphen
          'user name',   // space
          'user.name',   // period
          'user!name',   // exclamation
          'user@name',   // middle @
          'user#123',    // hash
          'user$money',  // dollar
          'user*star',   // asterisk
          'user+plus',   // plus
          'user=equal',  // equals
          'user/slash',  // slash
          'user?query'   // question mark
        ];

        for (const testCase of testCases) {
          const res = await UserService.checkHandle(testCase);
          assert.deepEqual(
            res,
            { success: true, available: false, reason: 'invalid-chars' },
            `Expected invalid-chars for: ${testCase}`
          );
        }
      });

      it('allows valid alphanumeric characters and underscores', async () => {
        mockSupabase._setTableHandler(DB_TABLES.PROFILES, () => ({
          data: null,
          error: null
        }));

        const validHandles = ['john_doe', 'user123', '_private_', 'a1_b2_c3'];
        for (const handle of validHandles) {
          const res = await UserService.checkHandle(handle);
          assert.equal(res.success, true, `Expected valid handle for: ${handle}`);
          assert.equal(res.available, true);
        }
      });

      it('blocks reserved usernames and returns reason: reserved', async () => {
        const reservedList = ['admin', 'guest', 'root', 'datimer', 'support', 'anonymous'];
        for (const reserved of reservedList) {
          const res = await UserService.checkHandle(reserved);
          assert.deepEqual(
            res,
            { success: true, available: false, reason: 'reserved' },
            `Expected reserved for: ${reserved}`
          );
        }
      });
    });

    describe('Trimming, Normalization & Querying', () => {
      it('trims whitespace, leading @ symbols, and normalizes uppercase letters', async () => {
        let capturedQuery = null;
        mockSupabase._setTableHandler(DB_TABLES.PROFILES, (query) => {
          capturedQuery = query;
          return { data: null, error: null };
        });

        const res = await UserService.checkHandle('   @@@Cool_User_99   ');
        assert.equal(res.success, true);
        assert.equal(res.available, true);

        assert.equal(capturedQuery.table, DB_TABLES.PROFILES);
        assert.equal(capturedQuery.select, 'id');
        assert.equal(capturedQuery.isMaybeSingle, true);
        assert.deepEqual(capturedQuery.orFilters, ['handle_lowercase.eq.cool_user_99,handle.eq.cool_user_99']);
      });
    });

    describe('Availability & Conflict Scenarios', () => {
      it('returns available: true when no profile row matches', async () => {
        mockSupabase._setTableHandler(DB_TABLES.PROFILES, () => ({
          data: null,
          error: null
        }));

        const res = await UserService.checkHandle('free_handle');
        assert.deepEqual(res, { success: true, available: true });
      });

      it('returns available: false, reason: "taken" when another user owns the handle', async () => {
        mockSupabase._setTableHandler(DB_TABLES.PROFILES, () => ({
          data: { id: 'other_user_456' },
          error: null
        }));

        const res = await UserService.checkHandle('taken_handle', 'my_user_123');
        assert.deepEqual(res, { success: true, available: false, reason: 'taken' });
      });

      it('returns available: false, reason: "taken" when currentUserId is omitted and handle is taken', async () => {
        mockSupabase._setTableHandler(DB_TABLES.PROFILES, () => ({
          data: { id: 'existing_user_789' },
          error: null
        }));

        const res = await UserService.checkHandle('taken_handle');
        assert.deepEqual(res, { success: true, available: false, reason: 'taken' });
      });

      it('returns available: true, isSelf: true when the current user checks their own handle', async () => {
        const userId = 'user_abc_123';
        mockSupabase._setTableHandler(DB_TABLES.PROFILES, () => ({
          data: { id: userId },
          error: null
        }));

        const res = await UserService.checkHandle('my_own_handle', userId);
        assert.deepEqual(res, { success: true, available: true, isSelf: true });
      });
    });

    describe('Database Errors (Fail-Closed)', () => {
      it('fails closed (success: false) when Supabase returns an error', async () => {
        const dbError = new Error('Connection timeout to Supabase Postgres');
        mockSupabase._setTableHandler(DB_TABLES.PROFILES, () => ({
          data: null,
          error: dbError
        }));

        const res = await UserService.checkHandle('test_handle');
        assert.equal(res.success, false);
        assert.equal(res.available, undefined); // Never returns available: true on error
        assert.equal(res.error, dbError);
      });

      it('fails closed (success: false) when query builder throws synchronously or asynchronously', async () => {
        mockSupabase._setTableHandler(DB_TABLES.PROFILES, () => {
          throw new Error('Fatal socket failure');
        });

        const res = await UserService.checkHandle('test_handle');
        assert.equal(res.success, false);
        assert.match(res.error.message, /Fatal socket failure/);
      });
    });
  });

  // -------------------------------------------------------------
  // setHandle(user, handle)
  // -------------------------------------------------------------
  describe('setHandle', () => {
    describe('Validation', () => {
      it('returns error when user object is null, undefined, or missing id/uid', async () => {
        const resNull = await UserService.setHandle(null, 'cool_handle');
        assert.equal(resNull.success, false);
        assert.match(resNull.error.message, /User ID is required/);

        const resEmpty = await UserService.setHandle({}, 'cool_handle');
        assert.equal(resEmpty.success, false);
        assert.match(resEmpty.error.message, /User ID is required/);

        const resNoId = await UserService.setHandle({ email: 'test@example.com' }, 'cool_handle');
        assert.equal(resNoId.success, false);
        assert.match(resNoId.error.message, /User ID is required/);
      });

      it('returns error when handle is shorter than 3 characters or invalid', async () => {
        const user = { uid: 'user_123' };

        const resEmpty = await UserService.setHandle(user, '');
        assert.equal(resEmpty.success, false);
        assert.match(resEmpty.error.message, /Username must be 3-20 characters/);

        const resShort = await UserService.setHandle(user, 'ab');
        assert.equal(resShort.success, false);
        assert.match(resShort.error.message, /Username must be 3-20 characters/);

        const resAtOnly = await UserService.setHandle(user, '@@');
        assert.equal(resAtOnly.success, false);
        assert.match(resAtOnly.error.message, /Username must be 3-20 characters/);

        const resSpecial = await UserService.setHandle(user, 'user-name');
        assert.equal(resSpecial.success, false);
        assert.match(resSpecial.error.message, /Username must be 3-20 characters/);
      });

      it('blocks claiming reserved handles on setHandle', async () => {
        const user = { uid: 'user_123' };
        const res = await UserService.setHandle(user, 'admin');
        assert.equal(res.success, false);
        assert.equal(res.taken, true);
        assert.match(res.error.message, /reserved/);
      });
    });

    describe('Updating Existing Profile Row', () => {
      it('updates existing profile row with cleaned handle and lowercase version', async () => {
        let capturedQuery = null;
        let insertCalled = false;

        mockSupabase._setTableHandler(DB_TABLES.PROFILES, (query) => {
          if (query.op === 'update') {
            capturedQuery = query;
            return { data: [{ id: 'user_123' }], error: null };
          }
          if (query.op === 'insert') {
            insertCalled = true;
            return { data: null, error: null };
          }
          return { data: null, error: null };
        });

        const user = { uid: 'user_123', email: 'user@example.com' };
        const res = await UserService.setHandle(user, '  @Awesome_Hero  ');

        assert.equal(res.success, true);
        assert.equal(insertCalled, false, 'Insert should not be called when update succeeds');

        assert.equal(capturedQuery.table, DB_TABLES.PROFILES);
        assert.equal(capturedQuery.op, 'update');
        assert.equal(capturedQuery.payload.handle, 'awesome_hero');
        assert.equal(capturedQuery.payload.handle_lowercase, 'awesome_hero');
        assert.ok(capturedQuery.payload.updated_at, 'Should include updated_at timestamp');
        assert.deepEqual(capturedQuery.filters, [{ type: 'eq', column: 'id', value: 'user_123' }]);
      });

      it('works with user.id instead of user.uid', async () => {
        let capturedFilters = null;
        mockSupabase._setTableHandler(DB_TABLES.PROFILES, (query) => {
          if (query.op === 'update') {
            capturedFilters = query.filters;
            return { data: [{ id: 'user_456' }], error: null };
          }
          return { data: null, error: null };
        });

        const user = { id: 'user_456' };
        const res = await UserService.setHandle(user, 'valid_handle');

        assert.equal(res.success, true);
        assert.deepEqual(capturedFilters, [{ type: 'eq', column: 'id', value: 'user_456' }]);
      });
    });

    describe('Inserting New Profile Row (e.g. New Google OAuth User)', () => {
      it('inserts new profile row when update matches 0 rows', async () => {
        let updateCalled = false;
        let capturedInsert = null;

        mockSupabase._setTableHandler(DB_TABLES.PROFILES, (query) => {
          if (query.op === 'update') {
            updateCalled = true;
            // Zero rows updated
            return { data: [], error: null };
          }
          if (query.op === 'insert') {
            capturedInsert = query;
            return { data: null, error: null };
          }
          return { data: null, error: null };
        });

        const user = {
          uid: 'google_user_789',
          displayName: 'Jane Doe',
          photoURL: 'https://lh3.googleusercontent.com/avatar.jpg',
          email: 'jane.doe@example.com'
        };

        const res = await UserService.setHandle(user, 'janedoe');

        assert.equal(res.success, true);
        assert.equal(updateCalled, true);
        assert.ok(capturedInsert, 'Insert should have been invoked');
        assert.equal(capturedInsert.table, DB_TABLES.PROFILES);
        assert.equal(capturedInsert.payload.id, 'google_user_789');
        assert.equal(capturedInsert.payload.handle, 'janedoe');
        assert.equal(capturedInsert.payload.handle_lowercase, 'janedoe');
        assert.equal(capturedInsert.payload.display_name, 'Jane Doe');
        assert.equal(capturedInsert.payload.photo_url, 'https://lh3.googleusercontent.com/avatar.jpg');
        assert.equal(capturedInsert.payload.email, 'jane.doe@example.com');
        assert.ok(capturedInsert.payload.updated_at);
      });

      it('falls back through display_name and photo_url variants on insert', async () => {
        let capturedPayload = null;
        mockSupabase._setTableHandler(DB_TABLES.PROFILES, (query) => {
          if (query.op === 'update') return { data: null, error: null };
          if (query.op === 'insert') {
            capturedPayload = query.payload;
            return { data: null, error: null };
          }
          return { data: null, error: null };
        });

        // Test fallback to snake_case display_name & photo_url
        const user1 = {
          id: 'user_alt',
          display_name: 'Snake Name',
          photo_url: 'https://example.com/photo.png'
        };
        await UserService.setHandle(user1, 'alithandle');
        assert.equal(capturedPayload.display_name, 'Snake Name');
        assert.equal(capturedPayload.photo_url, 'https://example.com/photo.png');

        // Test fallback to email prefix when no name is provided
        const user2 = {
          id: 'user_email_only',
          email: 'developer.pro@datimer.app'
        };
        await UserService.setHandle(user2, 'devpro');
        assert.equal(capturedPayload.display_name, 'developer.pro');
        assert.equal(capturedPayload.photo_url, null);

        // Test fallback to 'User' when completely empty
        const user3 = { id: 'user_blank' };
        await UserService.setHandle(user3, 'blankuser');
        assert.equal(capturedPayload.display_name, 'User');
        assert.equal(capturedPayload.photo_url, null);
        assert.equal(capturedPayload.email, null);
      });
    });

    describe('Unique Constraint Violations (Postgres 23505)', () => {
      it('returns taken: true on update duplicate key error (code 23505)', async () => {
        mockSupabase._setTableHandler(DB_TABLES.PROFILES, (query) => {
          if (query.op === 'update') {
            const err = new Error('duplicate key value violates unique constraint "profiles_handle_key"');
            err.code = '23505';
            return { data: null, error: err };
          }
          return { data: null, error: null };
        });

        const user = { uid: 'user_123' };
        const res = await UserService.setHandle(user, 'duplicate_handle');

        assert.equal(res.success, false);
        assert.equal(res.taken, true);
        assert.equal(res.error.code, '23505');
      });

      it('returns taken: true on insert duplicate key error (code 23505)', async () => {
        mockSupabase._setTableHandler(DB_TABLES.PROFILES, (query) => {
          if (query.op === 'update') {
            return { data: [], error: null }; // triggers insert
          }
          if (query.op === 'insert') {
            const err = new Error('duplicate key value violates unique constraint');
            err.code = '23505';
            return { data: null, error: err };
          }
          return { data: null, error: null };
        });

        const user = { uid: 'user_new' };
        const res = await UserService.setHandle(user, 'taken_on_insert');

        assert.equal(res.success, false);
        assert.equal(res.taken, true);
      });

      it('returns taken: true when error message contains "duplicate key" or "unique" without explicit 23505 code', async () => {
        mockSupabase._setTableHandler(DB_TABLES.PROFILES, (query) => {
          if (query.op === 'update') {
            return { data: null, error: new Error('Unique constraint violation for handle') };
          }
          return { data: null, error: null };
        });

        const res = await UserService.setHandle({ uid: 'u1' }, 'handle_conflict');
        assert.equal(res.success, false);
        assert.equal(res.taken, true);
      });

      it('returns taken: false on other non-conflict database errors', async () => {
        mockSupabase._setTableHandler(DB_TABLES.PROFILES, (query) => {
          if (query.op === 'update') {
            return { data: null, error: new Error('Connection lost to DB') };
          }
          return { data: null, error: null };
        });

        const res = await UserService.setHandle({ uid: 'u1' }, 'handle_net_err');
        assert.equal(res.success, false);
        assert.equal(res.taken, false);
        assert.match(res.error.message, /Connection lost to DB/);
      });
    });
  });

  // -------------------------------------------------------------
  // getProfile(userId, select)
  // -------------------------------------------------------------
  describe('getProfile', () => {
    it('fetches profile successfully with default select (*)', async () => {
      let capturedQuery = null;
      const mockProfile = { id: 'user_99', handle: 'cosmo', is_pro: true };

      mockSupabase._setTableHandler(DB_TABLES.PROFILES, (query) => {
        capturedQuery = query;
        return { data: mockProfile, error: null };
      });

      const res = await UserService.getProfile('user_99');

      assert.equal(res.success, true);
      assert.deepEqual(res.data, mockProfile);
      assert.equal(capturedQuery.table, DB_TABLES.PROFILES);
      assert.equal(capturedQuery.select, '*');
      assert.equal(capturedQuery.isMaybeSingle, true);
      assert.deepEqual(capturedQuery.filters, [{ type: 'eq', column: 'id', value: 'user_99' }]);
    });

    it('returns error if userId is missing', async () => {
      const res = await UserService.getProfile(null);
      assert.equal(res.success, false);
      assert.match(res.error.message, /User ID is required/);
    });

    it('fetches profile with custom columns list', async () => {
      let capturedSelect = null;
      mockSupabase._setTableHandler(DB_TABLES.PROFILES, (query) => {
        capturedSelect = query.select;
        return { data: { id: 'user_1', handle: 'custom' }, error: null };
      });

      const columns = 'id, handle, about, is_pro, photo_url, display_name';
      const res = await UserService.getProfile('user_1', columns);

      assert.equal(res.success, true);
      assert.equal(capturedSelect, columns);
    });

    it('handles database errors gracefully', async () => {
      mockSupabase._setTableHandler(DB_TABLES.PROFILES, () => ({
        data: null,
        error: new Error('Row not found PGRST116')
      }));

      const res = await UserService.getProfile('non_existent');
      assert.equal(res.success, false);
      assert.match(res.error.message, /Row not found/);
    });

    it('handles query exception throws', async () => {
      mockSupabase._setTableHandler(DB_TABLES.PROFILES, () => {
        throw new Error('Supabase client failed');
      });

      const res = await UserService.getProfile('err_user');
      assert.equal(res.success, false);
      assert.match(res.error.message, /Supabase client failed/);
    });
  });

  // -------------------------------------------------------------
  // getProfileByHandle & Settings / History Helpers
  // -------------------------------------------------------------
  describe('getProfileByHandle and Other User Methods', () => {
    it('getProfileByHandle returns profile for matching handle', async () => {
      let capturedQuery = null;
      mockSupabase._setTableHandler(DB_TABLES.PROFILES, (query) => {
        capturedQuery = query;
        return { data: { id: 'u1', handle: 'starlight' }, error: null };
      });

      const res = await UserService.getProfileByHandle('@starlight');
      assert.equal(res.success, true);
      assert.equal(res.data.handle, 'starlight');
      assert.deepEqual(capturedQuery.orFilters, [
        'handle_lowercase.eq.starlight,handle.eq.starlight,handle.eq.@starlight'
      ]);
    });

    it('getProfileByHandle returns error if handle is empty', async () => {
      const res = await UserService.getProfileByHandle('');
      assert.equal(res.success, false);
      assert.match(res.error.message, /Handle is required/);
    });

    it('getProfileByHandle returns error on 404 without crashing', async () => {
      mockSupabase._setTableHandler(DB_TABLES.PROFILES, () => ({
        data: null,
        error: new Error('Not found')
      }));

      const res = await UserService.getProfileByHandle('missing_user');
      assert.equal(res.success, false);
      assert.ok(res.error);
    });

    it('getSettings queries USER_SETTINGS table', async () => {
      let capturedQuery = null;
      mockSupabase._setTableHandler(DB_TABLES.USER_SETTINGS, (query) => {
        capturedQuery = query;
        return { data: { user_id: 'u1', theme: 'dark' }, error: null };
      });

      const res = await UserService.getSettings('u1');
      assert.equal(res.success, true);
      assert.equal(res.data.theme, 'dark');
      assert.equal(capturedQuery.table, DB_TABLES.USER_SETTINGS);
      assert.equal(capturedQuery.isMaybeSingle, true);
    });

    it('upsertSettings saves settings to USER_SETTINGS table', async () => {
      let capturedQuery = null;
      mockSupabase._setTableHandler(DB_TABLES.USER_SETTINGS, (query) => {
        capturedQuery = query;
        return { data: null, error: null };
      });

      const res = await UserService.upsertSettings({ user_id: 'u1', volume: 0.8 });
      assert.equal(res.success, true);
      assert.equal(capturedQuery.op, 'upsert');
      assert.equal(capturedQuery.payload.volume, 0.8);
    });

    it('insertSettings inserts initial settings', async () => {
      let capturedQuery = null;
      mockSupabase._setTableHandler(DB_TABLES.USER_SETTINGS, (query) => {
        capturedQuery = query;
        return { data: null, error: null };
      });

      const res = await UserService.insertSettings({ user_id: 'u1', initial: true });
      assert.equal(res.success, true);
      assert.equal(capturedQuery.op, 'insert');
    });

    it('getHistory queries HISTORY table by user_id', async () => {
      let capturedQuery = null;
      mockSupabase._setTableHandler(DB_TABLES.HISTORY, (query) => {
        capturedQuery = query;
        return { data: [{ date_id: '2026-11-16' }], error: null };
      });

      const res = await UserService.getHistory('u1');
      assert.equal(res.success, true);
      assert.equal(res.data.length, 1);
      assert.deepEqual(capturedQuery.filters, [{ type: 'eq', column: 'user_id', value: 'u1' }]);
    });

    it('getHistoryByDate queries HISTORY table by user_id and date_id', async () => {
      let capturedQuery = null;
      mockSupabase._setTableHandler(DB_TABLES.HISTORY, (query) => {
        capturedQuery = query;
        return { data: { date_id: '2026-11-16', focus_time: 1500 }, error: null };
      });

      const res = await UserService.getHistoryByDate('u1', '2026-11-16');
      assert.equal(res.success, true);
      assert.equal(res.data.focus_time, 1500);
      assert.deepEqual(capturedQuery.filters, [
        { type: 'eq', column: 'user_id', value: 'u1' },
        { type: 'eq', column: 'date_id', value: '2026-11-16' }
      ]);
    });

    it('upsertHistory upserts with onConflict: user_id, date_id', async () => {
      let capturedQuery = null;
      mockSupabase._setTableHandler(DB_TABLES.HISTORY, (query) => {
        capturedQuery = query;
        return { data: null, error: null };
      });

      const payload = { user_id: 'u1', date_id: '2026-11-16', focus_time: 3000 };
      const res = await UserService.upsertHistory(payload);
      assert.equal(res.success, true);
      assert.equal(capturedQuery.op, 'upsert');
      assert.deepEqual(capturedQuery.options, { onConflict: 'user_id, date_id' });
    });

    it('searchUsers invokes RPC function with search_query', async () => {
      mockSupabase._setRpcHandler(DB_RPC.SEARCH_USERS, (params) => {
        assert.equal(params.search_query, 'alice');
        return { data: [{ id: 'u1', handle: 'alice' }], error: null };
      });

      const res = await UserService.searchUsers('alice');
      assert.equal(res.success, true);
      assert.equal(res.data[0].handle, 'alice');
    });

    it('getCurrentStreak invokes RPC function with user_id_input', async () => {
      mockSupabase._setRpcHandler(DB_RPC.GET_CURRENT_STREAK, (params) => {
        assert.equal(params.user_id_input, 'u_streak');
        return { data: 5, error: null };
      });

      const res = await UserService.getCurrentStreak('u_streak');
      assert.equal(res.success, true);
      assert.equal(res.data, 5);
    });
  });
});
