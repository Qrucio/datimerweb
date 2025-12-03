import { doc, writeBatch, collection, Timestamp, getDoc, setDoc } from "firebase/firestore";

const KEYS = {
    STATS: 'zen_stats_current',     // Today's active stats
    HISTORY: 'zen_stats_history',   // Data waiting to be uploaded
    NOTES: 'zen_notes_cache',       // Notes content
    SETTINGS: 'zen_settings_cache', // User preferences
    TIMER: 'zen_timer_state',       // Current timer status (for crash recovery)
    PRO_CLAIM: 'zen_pro_claim'      // Offline Pro License
};

// 7 Days Grace Period in Milliseconds
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

// --- HELPER: GET DATE ID (YYYY-MM-DD) ---
const getDateId = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const Storage = {
    // --- 1. STATS MANAGEMENT (The "Ledger") ---

    // Call this every second in your timer loop. It costs nothing.
    updateLocalStats: (elapsedSeconds, mode) => {
        const today = getDateId();
        let data = JSON.parse(localStorage.getItem(KEYS.STATS) || '{}');

        // If the date in storage is NOT today, move it to history queue
        if (data.date && data.date !== today) {
            Storage.queueDayForSync(data);
            data = {}; // Reset for today
        }

        // Initialize if empty
        if (!data.date) {
            data = {
                date: today,
                dailyFocusTime: 0,
                dailyBreakTime: 0,
                dailySessions: 0
            };
        }

        // Update the values
        if (mode === 'focus') {
            data.dailyFocusTime = (data.dailyFocusTime || 0) + elapsedSeconds;
        } else {
            data.dailyBreakTime = (data.dailyBreakTime || 0) + elapsedSeconds;
        }

        // Save back to LocalStorage
        localStorage.setItem(KEYS.STATS, JSON.stringify(data));
        return data;
    },

    // Call this when a session finishes (Timer hits 0)
    incrementSessionCount: () => {
        const data = JSON.parse(localStorage.getItem(KEYS.STATS) || '{}');
        if (data.date) {
            data.dailySessions = (data.dailySessions || 0) + 1;
            localStorage.setItem(KEYS.STATS, JSON.stringify(data));
        }
        return data;
    },

    // Move a finished day into the "Upload Queue"
    queueDayForSync: (dayData) => {
        if (!dayData || !dayData.date) return;
        const history = JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]');
        history.push(dayData);
        localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
    },

    // --- 2. THE SYNC WORKER (The "Bank Run") ---

    // Call this ONCE when the app loads (useEffect)
    syncPendingData: async (db, user) => {
        if (!user) return;

        // 1. Check for old stats in the "Current" slot (e.g. user opened app next day)
        const current = JSON.parse(localStorage.getItem(KEYS.STATS) || '{}');
        if (current.date && current.date !== getDateId()) {
            Storage.queueDayForSync(current);
            localStorage.removeItem(KEYS.STATS);
        }

        // 2. Upload the Queue
        const history = JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]');
        if (history.length === 0) return;

        console.log(`[Sync] Found ${history.length} days to upload...`);

        try {
            const batch = writeBatch(db);

            // We calculate total stats to update the main profile if needed
            let totalFocusToAdd = 0;

            history.forEach(dayStat => {
                // Add to history subcollection: users/{uid}/history/{YYYY-MM-DD}
                const historyRef = doc(db, "users", user.uid, "history", dayStat.date);
                batch.set(historyRef, {
                    ...dayStat,
                    uploadedAt: Timestamp.now()
                }, { merge: true });

                totalFocusToAdd += (dayStat.dailyFocusTime || 0);
            });

            // Commit Batch
            await batch.commit();

            // Clear queue only on success
            localStorage.removeItem(KEYS.HISTORY);
            console.log("[Sync] Upload successful!");

        } catch (error) {
            console.error("[Sync] Failed:", error);
        }
    },

    // --- 3. NOTES (Optimistic) ---
    saveNotesLocally: (notes) => {
        localStorage.setItem(KEYS.NOTES, JSON.stringify(notes));
    },

    getNotes: () => {
        try {
            return JSON.parse(localStorage.getItem(KEYS.NOTES) || '[]');
        } catch { return []; }
    },

    // --- 4. SETTINGS ---
    saveSettingsLocally: (settings) => {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    },

    getSettings: (defaults) => {
        try {
            const saved = localStorage.getItem(KEYS.SETTINGS);
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        } catch { return defaults; }
    },

    // --- 5. PRO LICENSE MANAGEMENT (The "Lease") ---

    // Call this when initializing 'isPro' state (App Load)
    getProStatus: () => {
        try {
            const claim = JSON.parse(localStorage.getItem(KEYS.PRO_CLAIM) || '{}');

            // 1. If never pro, return false
            if (!claim.isPro) return false;

            // 2. Check Expiration
            const now = Date.now();
            const lastVerified = claim.lastVerified || 0;

            if (now - lastVerified > GRACE_PERIOD_MS) {
                console.warn("Pro license expired. Please connect to internet to verify.");
                return false; // Expired
            }

            // 3. Valid Pro License
            return true;
        } catch {
            return false;
        }
    },

    // Call this whenever Firebase successfully syncs user data
    saveProStatus: (isPro) => {
        localStorage.setItem(KEYS.PRO_CLAIM, JSON.stringify({
            isPro: isPro,
            lastVerified: Date.now() // Refreshes the 7-day timer
        }));
    }
};