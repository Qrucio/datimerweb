import { supabase } from '../lib/supabase.js';
import { DB_TABLES, DB_RPC } from '../lib/constants.js';

export const UserService = {
  /**
   * Fetch user history
   * @param {string} userId
   */
  getHistory: async (userId) => {
    try {
      const { data, error } = await supabase
        .from(DB_TABLES.HISTORY)
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("UserService: getHistory failed", error);
      return { success: false, error };
    }
  },

  /**
   * Fetch user settings
   * @param {string} userId
   * @param {string} select - Optional columns to select (default: '*')
   */
  getSettings: async (userId, select = '*') => {
    try {
      const { data, error } = await supabase
        .from(DB_TABLES.USER_SETTINGS)
        .select(select)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("UserService: getSettings failed", error);
      return { success: false, error };
    }
  },

  /**
   * Fetch user history for a specific date
   * @param {string} userId
   * @param {string} dateId
   */
  getHistoryByDate: async (userId, dateId) => {
    try {
      const { data, error } = await supabase
        .from(DB_TABLES.HISTORY)
        .select('*')
        .eq('user_id', userId)
        .eq('date_id', dateId)
        .maybeSingle();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("UserService: getHistoryByDate failed", error);
      return { success: false, error };
    }
  },

  /**
   * Upsert user history entry
   * @param {object} historyData
   */
  upsertHistory: async (historyData) => {
    try {
      const { error } = await supabase
        .from(DB_TABLES.HISTORY)
        .upsert(historyData, { onConflict: 'user_id, date_id' });
        
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("UserService: upsertHistory failed", error);
      return { success: false, error };
    }
  },

  /**
   * Upsert user settings
   * @param {object} settingsData
   */
  upsertSettings: async (settingsData) => {
    try {
      const { error } = await supabase
        .from(DB_TABLES.USER_SETTINGS)
        .upsert(settingsData);
        
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("UserService: upsertSettings failed", error);
      return { success: false, error };
    }
  },

  /**
   * Insert user settings (initialization)
   * @param {object} settingsData
   */
  insertSettings: async (settingsData) => {
    try {
      const { error } = await supabase
        .from(DB_TABLES.USER_SETTINGS)
        .insert(settingsData);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("UserService: insertSettings failed", error);
      return { success: false, error };
    }
  },

  /**
   * Update user profile
   * @param {string} userId
   * @param {object} updates
   */
  updateProfile: async (userId, updates) => {
    try {
      if (!userId) throw new Error('User ID is required');
      const sanitized = { ...updates };
      if (sanitized.handle) {
        const clean = String(sanitized.handle).trim().replace(/^@+/, '').toLowerCase();
        sanitized.handle = clean;
        sanitized.handle_lowercase = clean;
      }
      sanitized.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from(DB_TABLES.PROFILES)
        .update(sanitized)
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("UserService: updateProfile failed", error);
      return { success: false, error };
    }
  },

  /**
   * Search users by term
   * @param {string} term
   */
  searchUsers: async (term) => {
    try {
      const { data, error } = await supabase.rpc(DB_RPC.SEARCH_USERS, { search_query: term });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("UserService: searchUsers failed", error);
      return { success: false, error };
    }
  },

  /**
   * Get current streak for user
   * @param {string} userId
   */
  getCurrentStreak: async (userId) => {
    try {
      const { data, error } = await supabase.rpc(DB_RPC.GET_CURRENT_STREAK, { user_id_input: userId });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("UserService: getCurrentStreak failed", error);
      return { success: false, error };
    }
  },

  /**
   * Get profile by User ID
   * @param {string} userId
   * @param {string} select - Columns to select
   */
  getProfile: async (userId, select = '*') => {
    try {
      if (!userId) return { success: false, error: new Error('User ID is required') };
      const { data, error } = await supabase
        .from(DB_TABLES.PROFILES)
        .select(select)
        .eq('id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("UserService: getProfile failed", error);
      return { success: false, error };
    }
  },

  /**
   * Reserved usernames that cannot be claimed
   */
  RESERVED_HANDLES: new Set([
    'admin', 'administrator', 'system', 'root', 'guest', 'datimer',
    'support', 'help', 'api', 'mod', 'moderator', 'null', 'undefined',
    'anonymous', 'everyone', 'here', 'official'
  ]),

  /**
   * Check if a handle is free.
   * Returns { success: false } when the check itself fails, so callers never
   * mistake a network error for "available".
   * @param {string} handle
   * @param {string} [currentUserId]
   */
  checkHandle: async (handle, currentUserId = null) => {
    try {
      const clean = String(handle || '').trim().replace(/^@+/, '').toLowerCase();
      if (clean.length < 3) return { success: true, available: false, reason: 'too-short' };
      if (clean.length > 20) return { success: true, available: false, reason: 'too-long' };
      if (!/^[a-z0-9_]+$/.test(clean)) return { success: true, available: false, reason: 'invalid-chars' };

      if (UserService.RESERVED_HANDLES.has(clean)) {
        return { success: true, available: false, reason: 'reserved' };
      }

      // Query profiles directly to accurately check availability
      const { data, error } = await supabase
        .from(DB_TABLES.PROFILES)
        .select('id')
        .or(`handle_lowercase.eq.${clean},handle.eq.${clean}`)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { success: true, available: true };
      if (currentUserId && (data.id === currentUserId)) return { success: true, available: true, isSelf: true };
      return { success: true, available: false, reason: 'taken' };
    } catch (error) {
      console.error("UserService: checkHandle failed", error);
      return { success: false, error };
    }
  },

  /**
   * Claim a handle for the signed-in user.
   * Updates the profile row when it exists, inserts one otherwise. Google
   * sign-ups often land without a profile row, so the insert path matters.
   * @param {object} user - app user (needs uid or id, displayName, photoURL, email)
   * @param {string} handle
   */
  setHandle: async (user, handle) => {
    try {
      const clean = String(handle || '').trim().replace(/^@+/, '').toLowerCase();
      const userId = user?.uid || user?.id;
      if (!userId) {
        return { success: false, error: new Error('User ID is required') };
      }
      if (clean.length < 3 || clean.length > 20 || !/^[a-z0-9_]+$/.test(clean)) {
        return { success: false, error: new Error('Username must be 3-20 characters using letters, numbers, and underscores.') };
      }

      if (UserService.RESERVED_HANDLES.has(clean)) {
        return { success: false, taken: true, error: new Error('This username is reserved.') };
      }

      const { data: updated, error: updateError } = await supabase
        .from(DB_TABLES.PROFILES)
        .update({ 
          handle: clean, 
          handle_lowercase: clean,
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId)
        .select('id');

      if (updateError) throw updateError;
      if (updated && updated.length > 0) return { success: true };

      const { error: insertError } = await supabase
        .from(DB_TABLES.PROFILES)
        .insert({
          id: userId,
          handle: clean,
          handle_lowercase: clean,
          display_name: user.displayName || user.display_name || user.email?.split('@')[0] || 'User',
          photo_url: user.photoURL || user.photo_url || null,
          email: user.email || null,
          updated_at: new Date().toISOString()
        });

      if (insertError) throw insertError;
      return { success: true };
    } catch (error) {
      const taken = error?.code === '23505' || /duplicate key|unique/i.test(error?.message || '');
      console.error("UserService: setHandle failed", error);
      return { success: false, taken, error };
    }
  },

  /**
   * Get profile by handle
   * @param {string} handle
   */
  getProfileByHandle: async (handle) => {
    try {
      const clean = String(handle || '').trim().replace(/^@+/, '').toLowerCase();
      if (!clean) return { success: false, error: new Error('Handle is required') };
      
      const { data, error } = await supabase
        .from(DB_TABLES.PROFILES)
        .select('*')
        .or(`handle_lowercase.eq.${clean},handle.eq.${clean},handle.eq.@${clean}`)
        .maybeSingle();
        
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      // Don't log error here as it might be a 404 which is expected
      return { success: false, error };
    }
  }
};
