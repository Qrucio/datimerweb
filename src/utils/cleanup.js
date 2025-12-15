import { supabase } from '../lib/supabase';

/**
 * Deletes messages older than 24 hours.
 * This is a client-side cleanup trigger. Ideally, this should be a scheduled job on the database.
 */
export const deleteOldMessages = async () => {
    // 24 hours in milliseconds
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    try {
        const { data, error } = await supabase
            .from('messages')
            .delete()
            .lt('created_at', cutoffTime);

        if (error) {
            console.error("Failed to auto-delete old messages:", error);
        } else {
            // console.log("Cleanup success. Messages deleted.");
        }
    } catch (e) {
        console.error("Cleanup exception:", e);
    }
};
