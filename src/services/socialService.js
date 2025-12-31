import { supabase } from '../lib/supabase';
import { DB_TABLES, DB_RPC } from '../lib/constants';

export const SocialService = {
  /**
   * Block a user and remove any existing relationships
   * @param {string} currentUserId 
   * @param {string} targetUserId 
   */
  blockUser: async (currentUserId, targetUserId) => {
    try {
      // 1. Add to blocked_users
      const { error: blockError } = await supabase
        .from(DB_TABLES.BLOCKED_USERS)
        .insert({ user_id: currentUserId, blocked_user_id: targetUserId });
      
      if (blockError) throw blockError;

      // 2. Remove any pending friend requests (sent or received)
      await supabase
        .from(DB_TABLES.FRIEND_REQUESTS)
        .delete()
        .or(`sender_id.eq.${targetUserId},receiver_id.eq.${targetUserId}`);

      // 3. Remove friendship if exists
      await supabase
        .from(DB_TABLES.FRIENDSHIPS)
        .delete()
        .eq('user_id', currentUserId)
        .eq('friend_id', targetUserId);

      return { success: true };
    } catch (error) {
      console.error("SocialService: Block failed", error);
      return { success: false, error };
    }
  },

  /**
   * Unblock a user
   * @param {string} currentUserId 
   * @param {string} blockedUserId 
   */
  unblockUser: async (currentUserId, blockedUserId) => {
    try {
      const { error: deleteError } = await supabase
          .from(DB_TABLES.BLOCKED_USERS)
          .delete()
          .eq('user_id', currentUserId)
          .eq('blocked_user_id', blockedUserId);
          
      if (deleteError) throw deleteError;

      return { success: true };
    } catch (error) {
      console.error("SocialService: Unblock failed", error);
      return { success: false, error };
    }
  },

  /**
   * Accept a friend request
   * @param {string} requestId 
   */
  acceptFriendRequest: async (requestId) => {
    try {
      console.log("SocialService: Accepting request", requestId);
      const { error } = await supabase.rpc(DB_RPC.CONFIRM_FRIENDSHIP, { req_id: requestId });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("SocialService: Accept failed", error);
      return { success: false, error };
    }
  },

  /**
   * Decline a friend request
   * @param {string} currentUserId 
   * @param {string} requesterId 
   */
  declineFriendRequest: async (currentUserId, requesterId) => {
    try {
      const { error } = await supabase
        .from(DB_TABLES.FRIEND_REQUESTS)
        .delete()
        .eq('receiver_id', currentUserId)
        .eq('sender_id', requesterId);
        
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("SocialService: Decline failed", error);
      return { success: false, error };
    }
  },

  /**
   * Remove a friend
   * @param {string} currentUserId 
   * @param {string} friendId 
   */
  removeFriend: async (currentUserId, friendId) => {
    try {
      // Use RPC for atomic reciprocal removal
      const { error } = await supabase.rpc(DB_RPC.REMOVE_FRIEND, { friend_uid: friendId });

      if (error) {
        console.warn("SocialService: RPC Remove failed, falling back to manual deletion", error);
        // Fallback: Manual Double Delete
        const { error: manualError } = await supabase
          .from(DB_TABLES.FRIENDSHIPS)
          .delete()
          .match({ user_id: currentUserId, friend_id: friendId });
          
        if (manualError) throw manualError;
      }
      return { success: true };
    } catch (error) {
      console.error("SocialService: Remove friend failed", error);
      return { success: false, error };
    }
  },

  /**
   * Fetch all friends with their profiles
   * @param {string} currentUserId 
   */
  fetchFriends: async (currentUserId) => {
    try {
      const { data, error } = await supabase
        .from(DB_TABLES.FRIENDSHIPS)
        .select(`
          friend_id,
          is_pinned,
          profile:${DB_TABLES.PROFILES}!friend_id (
             id, display_name, handle, photo_url, is_pro, timer_state, last_active, stats
          )
        `)
        .eq('user_id', currentUserId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("SocialService: Fetch friends failed", error);
      return { success: false, error };
    }
  },

  /**
   * Send a friend request
   * @param {string} currentUserId 
   * @param {string} targetUserId 
   */
  sendFriendRequest: async (currentUserId, targetUserId) => {
    try {
      const { error } = await supabase
        .from(DB_TABLES.FRIEND_REQUESTS)
        .insert({ sender_id: currentUserId, receiver_id: targetUserId });

      if (error) {
        if (error.code === '23505') return { success: false, error: "Request already sent/exists." };
        throw error;
      }
      return { success: true };
    } catch (error) {
      console.error("SocialService: Send request failed", error);
      return { success: false, error };
    }
  },

  /**
   * Check if an outgoing request exists
   * @param {string} currentUserId 
   * @param {string} targetUserId 
   */
  checkOutgoingRequest: async (currentUserId, targetUserId) => {
    if (!targetUserId) return { success: true, data: false }; // Safe exit if undefined
    try {
      const { data, error } = await supabase
        .from(DB_TABLES.FRIEND_REQUESTS)
        .select('id')
        .eq('sender_id', currentUserId)
        .eq('receiver_id', targetUserId)
        .maybeSingle();
      
      if (error) throw error;
      return { success: true, data: !!data };
    } catch (error) {
      console.error("SocialService: Check outgoing request failed", error);
      return { success: false, error };
    }
  }
};
