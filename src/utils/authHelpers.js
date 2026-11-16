import { UserService } from '../services/userService.js';
import { Storage } from './storage.js';

/**
 * Generates a suggested handle from user profile (displayName or email prefix).
 * @param {object} user - User object with displayName and/or email
 * @returns {string} Suggested handle or empty string if shorter than 3 chars
 */
export const generateSuggestedHandle = (user) => {
  if (!user) return '';
  const seed = user.displayName || user.email?.split('@')[0] || '';
  const suggested = seed.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 15);
  return suggested.length >= 3 ? suggested : '';
};

/**
 * Generates alternative handle suggestions when a handle is taken.
 * @param {string} cleanHandle - Normalized handle string
 * @param {object} [options]
 * @param {number} [options.year] - Year override for deterministic testing
 * @param {number} [options.rand] - Random number override for deterministic testing
 * @returns {string[]} Array of 3 suggestions
 */
export const generateHandleSuggestions = (cleanHandle, options = {}) => {
  const base = String(cleanHandle || '').replace(/[^a-z0-9_]/g, '').slice(0, 10);
  const rand = options.rand !== undefined ? options.rand : Math.floor(10 + Math.random() * 90);
  const year = options.year !== undefined ? options.year : new Date().getFullYear();

  return [
    `${base}_${rand}`,
    `${base}${year}`,
    `its_${base}`
  ];
};

/**
 * Evaluates the initial status of a handle prior to remote check.
 * @param {string} handle
 * @returns {'idle'|'too-short'|'checking'}
 */
export const evaluateHandleInitialStatus = (handle) => {
  const clean = String(handle || '').trim().replace(/^@+/, '').toLowerCase();
  if (!clean) return 'idle';
  if (clean.length < 3) return 'too-short';
  return 'checking';
};

/**
 * Handles the async check for handle availability and generates suggestions if taken.
 * @param {string} handle
 * @param {string} [userId]
 * @param {object} [options]
 * @param {object} [options.userService]
 * @param {number} [options.year]
 * @param {number} [options.rand]
 * @returns {Promise<{status: 'idle'|'too-short'|'available'|'taken'|'error', suggestions: string[], reason?: string, error?: any}>}
 */
export const checkHandleFlow = async (handle, userId = null, options = {}) => {
  const clean = String(handle || '').trim().replace(/^@+/, '').toLowerCase();
  if (!clean) {
    return { status: 'idle', suggestions: [] };
  }
  if (clean.length < 3) {
    return { status: 'too-short', suggestions: [] };
  }

  const userService = options.userService || UserService;
  const res = await userService.checkHandle(clean, userId);

  if (!res.success) {
    return { status: 'error', suggestions: [], error: res.error };
  }

  if (res.available) {
    return { status: 'available', suggestions: [] };
  }

  return {
    status: 'taken',
    suggestions: generateHandleSuggestions(clean, options),
    reason: res.reason
  };
};

/**
 * Submits the selected handle to save in the profile and localStorage.
 * @param {object} params
 * @param {object} params.user
 * @param {string} params.handle
 * @param {string} params.handleStatus
 * @param {object} [params.userService]
 * @param {Storage} [params.storageEngine]
 * @param {Function} [params.onComplete]
 * @returns {Promise<{success: boolean, cleanHandle?: string, taken?: boolean, error?: any}>}
 */
export const submitHandleChoice = async ({
  user,
  handle,
  handleStatus = 'available',
  userService = UserService,
  storageEngine = (typeof window !== 'undefined' ? window.localStorage : globalThis.localStorage),
  onComplete = null
}) => {
  const clean = String(handle || '').trim().replace(/^@+/, '').toLowerCase();
  if (handleStatus !== 'available' || clean.length < 3) {
    return { success: false, error: new Error('Invalid handle or not available') };
  }

  try {
    const res = await userService.setHandle(user, clean);
    if (!res.success) {
      return {
        success: false,
        taken: res.taken || false,
        error: res.error || new Error('Failed to set handle')
      };
    }

    if (storageEngine && typeof storageEngine.setItem === 'function') {
      storageEngine.setItem('zen_user_handle', clean);
    }

    if (typeof onComplete === 'function') {
      onComplete(clean);
    }

    return { success: true, cleanHandle: clean };
  } catch (err) {
    return { success: false, error: err };
  }
};

/**
 * Core authentication state and user mapping logic.
 * Maps Supabase user session to application state, synchronizes storage,
 * and controls onboarding step routing without flashing intermediate states.
 *
 * @param {object|null} supaUser - The authenticated Supabase user object or null
 * @param {object} context - State dispatchers and dependencies
 */
export const handleUserMapping = async (supaUser, {
  setUser = () => {},
  setOnboardingStep = () => {},
  setOnboardingInnerStep = () => {},
  setIsPro = () => {},
  setDataLoaded = () => {},
  setIsAuthChecking = () => {},
  userService = UserService,
  storage = Storage,
  storageEngine = (typeof window !== 'undefined' ? window.localStorage : globalThis.localStorage),
  isDemo = false,
  seq = null,
  currentSeqGetter = null
} = {}) => {
  // GUARD: Skip Auth check if in Demo Mode
  if (isDemo) {
    setIsAuthChecking(false);
    return;
  }

  if (supaUser) {
    // 1. FETCH PROFILE DATA (Handle, About, Pro Status) with retry
    let profileData = {};
    let fetchSucceeded = false;

    try {
      let res = await userService.getProfile(
        supaUser.id,
        'id, handle, about, is_pro, photo_url, display_name'
      );

      // If initial fetch failed (e.g. temporary network glitch), retry once
      if (!res.success) {
        await new Promise(r => setTimeout(r, 600));
        res = await userService.getProfile(
          supaUser.id,
          'id, handle, about, is_pro, photo_url, display_name'
        );
      }

      if (res.success) {
        fetchSucceeded = true;
        if (res.data) {
          profileData = res.data;
        }
      }
    } catch (e) {
      console.warn("Profile fetch failed, using auth defaults", e);
    }

    // Abort if a newer auth mapping sequence has started
    if (seq !== null && currentSeqGetter && currentSeqGetter() !== seq) {
      return;
    }

    // Cached handle fallback if server returned null or failed due to network
    const cachedHandle = storageEngine?.getItem ? storageEngine.getItem('zen_user_handle') : null;
    if (!profileData.handle && cachedHandle) {
      profileData.handle = cachedHandle;
    }

    // 2. MAP & MERGE USER
    const appUser = {
      ...supaUser,
      uid: supaUser.id, // CRITICAL: Maintain 'uid' for existing code
      displayName: profileData.display_name || supaUser.user_metadata?.full_name || supaUser.email?.split('@')[0] || 'User',
      photoURL: profileData.photo_url || supaUser.user_metadata?.avatar_url,
      isAnonymous: supaUser.is_anonymous,
      handle: profileData.handle || null,
      about: profileData.about || null,
      isPro: profileData.is_pro || false
    };

    if (profileData.is_pro) {
      setIsPro(true);
      if (storage && typeof storage.saveProStatus === 'function') {
        storage.saveProStatus(true);
      }
    }

    setUser(appUser);

    // 3. STORAGE & ONBOARDING SYNC
    if (appUser.isAnonymous) {
      if (storageEngine) {
        storageEngine.removeItem('zen_user_handle');
        storageEngine.setItem('pomodoro_user_name', "Guest");
      }
      setOnboardingStep(3);
    } else if (appUser.handle) {
      // Registered User with Handle -> Go straight to Timer Dashboard
      if (storageEngine) {
        storageEngine.setItem('zen_user_handle', appUser.handle);
      }
      setOnboardingStep(3);
    } else if (!fetchSucceeded && !cachedHandle) {
      // Network failed and no cached handle found: don't kick user to username picker if they might already have one
      const previousName = storageEngine?.getItem ? storageEngine.getItem('pomodoro_user_name') : null;
      if (previousName) {
        setOnboardingStep(3);
      } else {
        setOnboardingStep(1);
        setOnboardingInnerStep(1);
      }
    } else {
      // Authenticated user genuinely WITHOUT Handle -> Go to Username Picker
      setOnboardingStep(1);
      setOnboardingInnerStep(1);
    }

  } else {
    // SESSION EXPIRED OR USER SIGNED OUT
    // Clear all user data to prevent stale state
    setUser(null);
    setOnboardingStep(0); // Always reset to login screen
    setOnboardingInnerStep(0);
    setDataLoaded(false);

    // Clear localStorage to prevent stale data showing
    if (storageEngine) {
      storageEngine.removeItem('zen_user_handle');
      storageEngine.removeItem('pomodoro_user_name');
    }
  }

  setIsAuthChecking(false);
};
