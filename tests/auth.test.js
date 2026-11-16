import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  handleUserMapping,
  generateSuggestedHandle,
  generateHandleSuggestions,
  evaluateHandleInitialStatus,
  checkHandleFlow,
  submitHandleChoice
} from '../src/utils/authHelpers.js';
import { createMockLocalStorage } from './helpers/mockLocalStorage.js';

describe('Auth State, User Mapping & Onboarding Flow Tests', () => {
  let mockStorage;
  let dispatched;
  let mockUserService;
  let mockAppStorage;

  beforeEach(() => {
    mockStorage = createMockLocalStorage();

    dispatched = {
      user: undefined,
      onboardingStep: [],
      onboardingInnerStep: [],
      isPro: [],
      dataLoaded: [],
      isAuthChecking: []
    };

    mockUserService = {
      getProfile: async (userId, _select) => ({
        success: true,
        data: { id: userId, handle: 'existing_handle', is_pro: false }
      }),
      checkHandle: async (_handle, _userId) => ({
        success: true,
        available: true
      }),
      setHandle: async (_user, _handle) => ({
        success: true
      })
    };

    mockAppStorage = {
      saveProStatusCalls: [],
      saveProStatus: function(status) {
        this.saveProStatusCalls.push(status);
      }
    };
  });

  const createDispatchers = (overrides = {}) => ({
    setUser: (u) => { dispatched.user = u; },
    setOnboardingStep: (s) => { dispatched.onboardingStep.push(s); },
    setOnboardingInnerStep: (s) => { dispatched.onboardingInnerStep.push(s); },
    setIsPro: (p) => { dispatched.isPro.push(p); },
    setDataLoaded: (d) => { dispatched.dataLoaded.push(d); },
    setIsAuthChecking: (c) => { dispatched.isAuthChecking.push(c); },
    userService: mockUserService,
    storage: mockAppStorage,
    storageEngine: mockStorage,
    ...overrides
  });

  // =========================================================================
  // 1. handleUserMapping
  // =========================================================================
  describe('handleUserMapping', () => {
    describe('Signed out or Session Expired (supaUser is null/undefined)', () => {
      it('resets user to null, resets onboardingStep to 0, resets onboardingInnerStep to 0, and clears localStorage', async () => {
        // Pre-populate storage
        mockStorage.setItem('zen_user_handle', 'old_handle');
        mockStorage.setItem('pomodoro_user_name', 'OldName');

        await handleUserMapping(null, createDispatchers());

        // Assert user reset to null
        assert.equal(dispatched.user, null);

        // Assert step resets
        assert.deepEqual(dispatched.onboardingStep, [0]);
        assert.deepEqual(dispatched.onboardingInnerStep, [0]);
        assert.deepEqual(dispatched.dataLoaded, [false]);
        assert.deepEqual(dispatched.isAuthChecking, [false]);

        // Assert localStorage cleanup
        assert.equal(mockStorage.getItem('zen_user_handle'), null);
        assert.equal(mockStorage.getItem('pomodoro_user_name'), null);
      });

      it('also treats undefined supaUser as signed out / expired session', async () => {
        mockStorage.setItem('zen_user_handle', 'cached_handle');
        mockStorage.setItem('pomodoro_user_name', 'CachedUser');

        await handleUserMapping(undefined, createDispatchers());

        assert.equal(dispatched.user, null);
        assert.deepEqual(dispatched.onboardingStep, [0]);
        assert.deepEqual(dispatched.onboardingInnerStep, [0]);
        assert.deepEqual(dispatched.isAuthChecking, [false]);
        assert.equal(mockStorage.getItem('zen_user_handle'), null);
        assert.equal(mockStorage.getItem('pomodoro_user_name'), null);
      });
    });

    describe('Guest Session (isAnonymous: true)', () => {
      it('sets pomodoro_user_name to Guest, removes zen_user_handle, and sets onboardingStep to 3 (timer dashboard)', async () => {
        const guestUser = {
          id: 'guest_uid_123',
          is_anonymous: true
        };

        mockStorage.setItem('zen_user_handle', 'stale_handle');

        await handleUserMapping(guestUser, createDispatchers());

        // Storage assertions
        assert.equal(mockStorage.getItem('pomodoro_user_name'), 'Guest');
        assert.equal(mockStorage.getItem('zen_user_handle'), null);

        // Step routing assertions: straight to timer (step 3), never step 1 or 0
        assert.deepEqual(dispatched.onboardingStep, [3]);
        assert.equal(dispatched.onboardingInnerStep.length, 0);

        // User object assertions
        assert.ok(dispatched.user);
        assert.equal(dispatched.user.uid, 'guest_uid_123');
        assert.equal(dispatched.user.isAnonymous, true);
        assert.deepEqual(dispatched.isAuthChecking, [false]);
      });
    });

    describe('Existing User With Handle', () => {
      it('saves zen_user_handle, sets onboardingStep to 3 (straight to timer screen without flashing step 1)', async () => {
        const supaUser = {
          id: 'user_456',
          email: 'alex@example.com',
          user_metadata: { full_name: 'Alex Rivera' },
          is_anonymous: false
        };

        mockUserService.getProfile = async (id, select) => {
          assert.equal(id, 'user_456');
          assert.match(select, /handle/);
          return {
            success: true,
            data: {
              id: 'user_456',
              handle: 'alexrivera',
              display_name: 'Alex Rivera',
              photo_url: 'https://example.com/alex.jpg',
              about: 'Coding & focus',
              is_pro: false
            }
          };
        };

        await handleUserMapping(supaUser, createDispatchers());

        // Storage assertion
        assert.equal(mockStorage.getItem('zen_user_handle'), 'alexrivera');

        // Step routing: MUST go directly to 3, never flashing step 1
        assert.deepEqual(dispatched.onboardingStep, [3]);
        assert.equal(dispatched.onboardingInnerStep.length, 0);

        // User mapping
        assert.equal(dispatched.user.uid, 'user_456');
        assert.equal(dispatched.user.handle, 'alexrivera');
        assert.equal(dispatched.user.displayName, 'Alex Rivera');
        assert.equal(dispatched.user.photoURL, 'https://example.com/alex.jpg');
        assert.equal(dispatched.user.about, 'Coding & focus');
        assert.equal(dispatched.user.isPro, false);
        assert.deepEqual(dispatched.isAuthChecking, [false]);
      });
    });

    describe('New User Without Handle (e.g. Google OAuth Sign-in)', () => {
      it('sets onboardingStep to 1, sets onboardingInnerStep to 1, and does NOT set onboardingStep to 3 (no flash!)', async () => {
        const googleUser = {
          id: 'google_oauth_999',
          email: 'newbie@gmail.com',
          user_metadata: {
            full_name: 'Newbie Coder',
            avatar_url: 'https://lh3.googleusercontent.com/avatar.png'
          },
          is_anonymous: false
        };

        // Profile does not have a handle yet
        mockUserService.getProfile = async () => ({
          success: true,
          data: null
        });

        await handleUserMapping(googleUser, createDispatchers());

        // Step routing: MUST be step 1, innerStep 1; NEVER step 3 (no flash!)
        assert.deepEqual(dispatched.onboardingStep, [1]);
        assert.deepEqual(dispatched.onboardingInnerStep, [1]);
        assert.equal(dispatched.onboardingStep.includes(3), false);

        // Storage must NOT have a handle set
        assert.equal(mockStorage.getItem('zen_user_handle'), null);

        // Merged appUser maintains uid and falls back to Google metadata
        assert.equal(dispatched.user.uid, 'google_oauth_999');
        assert.equal(dispatched.user.displayName, 'Newbie Coder');
        assert.equal(dispatched.user.photoURL, 'https://lh3.googleusercontent.com/avatar.png');
        assert.equal(dispatched.user.handle, null);
        assert.deepEqual(dispatched.isAuthChecking, [false]);
      });
    });

    describe('Pro User Synchronization', () => {
      it('syncs isPro = true and calls Storage.saveProStatus(true) when profileData.is_pro is true', async () => {
        const supaUser = {
          id: 'pro_user_1',
          email: 'pro@datimer.app'
        };

        mockUserService.getProfile = async () => ({
          success: true,
          data: {
            id: 'pro_user_1',
            handle: 'prouser',
            is_pro: true
          }
        });

        await handleUserMapping(supaUser, createDispatchers());

        assert.deepEqual(dispatched.isPro, [true]);
        assert.deepEqual(mockAppStorage.saveProStatusCalls, [true]);
        assert.equal(dispatched.user.isPro, true);
        assert.deepEqual(dispatched.onboardingStep, [3]);
      });

      it('does not dispatch isPro or saveProStatus when profileData.is_pro is false or missing', async () => {
        const supaUser = {
          id: 'free_user_1',
          email: 'free@datimer.app'
        };

        mockUserService.getProfile = async () => ({
          success: true,
          data: {
            id: 'free_user_1',
            handle: 'freeuser',
            is_pro: false
          }
        });

        await handleUserMapping(supaUser, createDispatchers());

        assert.deepEqual(dispatched.isPro, []);
        assert.deepEqual(mockAppStorage.saveProStatusCalls, []);
        assert.equal(dispatched.user.isPro, false);
      });
    });

    describe('Demo Mode Guard', () => {
      it('skips auth check and does not mutate user or step when isDemo is true', async () => {
        const supaUser = { id: 'demo_user' };

        await handleUserMapping(supaUser, createDispatchers({ isDemo: true }));

        assert.deepEqual(dispatched.isAuthChecking, [false]);
        assert.equal(dispatched.user, undefined);
        assert.deepEqual(dispatched.onboardingStep, []);
      });
    });

    describe('Network Resilience & Stale Sequence Handling', () => {
      it('falls back to cached zen_user_handle if network/profile fetch fails', async () => {
        mockStorage.setItem('zen_user_handle', 'cached_hero');

        mockUserService.getProfile = async () => {
          throw new Error('Supabase unreachable (offline)');
        };

        const supaUser = {
          id: 'user_offline',
          email: 'offline@example.com',
          user_metadata: { full_name: 'Offline Hero' }
        };

        await handleUserMapping(supaUser, createDispatchers());

        assert.ok(dispatched.user);
        assert.equal(dispatched.user.handle, 'cached_hero');
        assert.deepEqual(dispatched.onboardingStep, [3]);
        assert.deepEqual(dispatched.isAuthChecking, [false]);
      });

      it('aborts state updates when a newer sequence has been triggered (race condition protection)', async () => {
        let currentSeq = 2; // Newer sequence is 2
        const supaUser = { id: 'slow_user', email: 'slow@example.com' };

        await handleUserMapping(supaUser, createDispatchers({
          seq: 1, // This execution was sequence 1
          currentSeqGetter: () => currentSeq
        }));

        // Stale execution must abort without updating user state
        assert.equal(dispatched.user, undefined);
        assert.deepEqual(dispatched.onboardingStep, []);
      });
    });
  });

  // =========================================================================
  // 2. Onboarding Username Picker Flow
  // =========================================================================
  describe('Onboarding Username Picker Flow', () => {
    describe('Suggested Handle Generation (generateSuggestedHandle)', () => {
      it('generates clean lowercase handle from user.displayName', () => {
        assert.equal(generateSuggestedHandle({ displayName: 'John Doe' }), 'johndoe');
        assert.equal(generateSuggestedHandle({ displayName: 'Sarah Connor 99!' }), 'sarahconnor99');
        assert.equal(generateSuggestedHandle({ displayName: 'User_Name' }), 'user_name');
        assert.equal(generateSuggestedHandle({ displayName: 'Al-Khwarizmi' }), 'alkhwarizmi');
      });

      it('truncates suggestions to max 15 characters', () => {
        const longUser = { displayName: 'SuperLongDisplayNameExceedingLimit' };
        const result = generateSuggestedHandle(longUser);
        assert.equal(result.length, 15);
        assert.equal(result, 'superlongdispla');
      });

      it('falls back to email prefix when displayName is missing', () => {
        assert.equal(generateSuggestedHandle({ email: 'developer.pro@datimer.app' }), 'developerpro');
        assert.equal(generateSuggestedHandle({ email: 'ninja_99@test.com' }), 'ninja_99');
      });

      it('returns empty string when suggested handle is shorter than 3 characters', () => {
        assert.equal(generateSuggestedHandle({ displayName: 'Ed' }), '');
        assert.equal(generateSuggestedHandle({ email: 'a@b.com' }), '');
        assert.equal(generateSuggestedHandle({ displayName: '!@#' }), '');
      });

      it('returns empty string when user is null, undefined, or empty object', () => {
        assert.equal(generateSuggestedHandle(null), '');
        assert.equal(generateSuggestedHandle(undefined), '');
        assert.equal(generateSuggestedHandle({}), '');
      });
    });

    describe('Availability Check States', () => {
      it('evaluateHandleInitialStatus returns idle for empty handle', () => {
        assert.equal(evaluateHandleInitialStatus(''), 'idle');
        assert.equal(evaluateHandleInitialStatus('   '), 'idle');
        assert.equal(evaluateHandleInitialStatus(null), 'idle');
      });

      it('evaluateHandleInitialStatus returns too-short for handles with < 3 characters', () => {
        assert.equal(evaluateHandleInitialStatus('a'), 'too-short');
        assert.equal(evaluateHandleInitialStatus('ab'), 'too-short');
        assert.equal(evaluateHandleInitialStatus('@x'), 'too-short');
      });

      it('evaluateHandleInitialStatus returns checking for handles >= 3 characters', () => {
        assert.equal(evaluateHandleInitialStatus('abc'), 'checking');
        assert.equal(evaluateHandleInitialStatus('@myhandle'), 'checking');
      });

      it('checkHandleFlow returns available when handle is free', async () => {
        mockUserService.checkHandle = async (handle, _userId) => {
          assert.equal(handle, 'freehandle');
          return { success: true, available: true };
        };

        const res = await checkHandleFlow('FreeHandle', 'u1', { userService: mockUserService });
        assert.deepEqual(res, {
          status: 'available',
          suggestions: []
        });
      });

      it('checkHandleFlow returns taken with 3 suggestions when handle is taken', async () => {
        mockUserService.checkHandle = async () => ({
          success: true,
          available: false,
          reason: 'taken'
        });

        const res = await checkHandleFlow('cosmo', 'u1', {
          userService: mockUserService,
          year: 2026,
          rand: 42
        });

        assert.equal(res.status, 'taken');
        assert.equal(res.reason, 'taken');
        assert.deepEqual(res.suggestions, [
          'cosmo_42',
          'cosmo2026',
          'its_cosmo'
        ]);
      });

      it('checkHandleFlow returns error when database query fails', async () => {
        mockUserService.checkHandle = async () => ({
          success: false,
          error: new Error('Network timeout')
        });

        const res = await checkHandleFlow('validhandle', 'u1', { userService: mockUserService });
        assert.equal(res.status, 'error');
        assert.deepEqual(res.suggestions, []);
        assert.match(res.error.message, /Network timeout/);
      });
    });

    describe('Taken Suggestions Generator (generateHandleSuggestions)', () => {
      it('generates 3 structured suggestions based on clean base handle', () => {
        const suggestions = generateHandleSuggestions('alex', { year: 2026, rand: 77 });
        assert.deepEqual(suggestions, [
          'alex_77',
          'alex2026',
          'its_alex'
        ]);
      });

      it('strips non-alphanumeric chars and slices base to 10 chars', () => {
        const suggestions = generateHandleSuggestions('super_long_handle_name', { year: 2026, rand: 10 });
        // Sliced to 10 chars: "super_long"
        assert.deepEqual(suggestions, [
          'super_long_10',
          'super_long2026',
          'its_super_long'
        ]);
      });

      it('generates valid suggestions with default random numbers and current year', () => {
        const suggestions = generateHandleSuggestions('test');
        assert.equal(suggestions.length, 3);
        assert.match(suggestions[0], /^test_\d{2}$/);
        assert.match(suggestions[1], new RegExp(`^test${new Date().getFullYear()}$`));
        assert.equal(suggestions[2], 'its_test');
      });
    });

    describe('Handle Submission Flow (submitHandleChoice)', () => {
      it('calls setHandle, saves zen_user_handle to localStorage, and calls onComplete on success', async () => {
        let setHandleUser = null;
        let setHandleClean = null;
        let onCompleteCalledWith = null;

        mockUserService.setHandle = async (u, h) => {
          setHandleUser = u;
          setHandleClean = h;
          return { success: true };
        };

        const user = { uid: 'user_sub_1' };
        const res = await submitHandleChoice({
          user,
          handle: '  @Master_Coder  ',
          handleStatus: 'available',
          userService: mockUserService,
          storageEngine: mockStorage,
          onComplete: (clean) => { onCompleteCalledWith = clean; }
        });

        assert.equal(res.success, true);
        assert.equal(res.cleanHandle, 'master_coder');
        assert.equal(setHandleUser, user);
        assert.equal(setHandleClean, 'master_coder');
        assert.equal(mockStorage.getItem('zen_user_handle'), 'master_coder');
        assert.equal(onCompleteCalledWith, 'master_coder');
      });

      it('refuses submission if handleStatus is not available', async () => {
        let setHandleCalled = false;
        mockUserService.setHandle = async () => { setHandleCalled = true; };

        const res = await submitHandleChoice({
          user: { uid: 'u1' },
          handle: 'coolhandle',
          handleStatus: 'taken',
          userService: mockUserService,
          storageEngine: mockStorage
        });

        assert.equal(res.success, false);
        assert.equal(setHandleCalled, false);
        assert.match(res.error.message, /not available/);
      });

      it('handles race-condition where handle was taken right before submission', async () => {
        let onCompleteCalled = false;
        mockUserService.setHandle = async () => ({
          success: false,
          taken: true,
          error: new Error('Unique constraint violated')
        });

        const res = await submitHandleChoice({
          user: { uid: 'u1' },
          handle: 'just_taken',
          handleStatus: 'available',
          userService: mockUserService,
          storageEngine: mockStorage,
          onComplete: () => { onCompleteCalled = true; }
        });

        assert.equal(res.success, false);
        assert.equal(res.taken, true);
        assert.equal(onCompleteCalled, false);
        assert.equal(mockStorage.getItem('zen_user_handle'), null);
      });

      it('handles unexpected exceptions during setHandle', async () => {
        mockUserService.setHandle = async () => {
          throw new Error('Database connection reset');
        };

        const res = await submitHandleChoice({
          user: { uid: 'u1' },
          handle: 'err_handle',
          handleStatus: 'available',
          userService: mockUserService,
          storageEngine: mockStorage
        });

        assert.equal(res.success, false);
        assert.match(res.error.message, /Database connection reset/);
      });
    });
  });
});
