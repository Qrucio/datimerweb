import { supabase } from '../lib/supabase';
import { DB_TABLES, DB_RPC } from '../lib/constants';

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
      const { error } = await supabase
        .from(DB_TABLES.PROFILES)
        .update(updates)
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
      const { data, error } = await supabase
        .from(DB_TABLES.PROFILES)
        .select(select)
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("UserService: getProfile failed", error);
      return { success: false, error };
    }
  },

  /**
   * Get profile by handle
   * @param {string} handle
   */
  getProfileByHandle: async (handle) => {
    try {
      // Handle might or might not have @ prefix, so we check both if needed,
      // but usually the caller handles the format. 
      // Based on App.jsx usage: .eq('handle', '@' + cleanHandle)
      
      const { data, error } = await supabase
        .from(DB_TABLES.PROFILES)
        .select('*')
        .eq('handle', handle)
        .single();
        
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      // Don't log error here as it might be a 404 which is expected
      return { success: false, error };
    }
  }
};
