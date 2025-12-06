import { doc, writeBatch, Timestamp, increment } from "firebase/firestore";

const KEYS = {
    STATS: 'zen_stats_current',     // Today's active stats
    HISTORY: 'zen_stats_history',   // Data waiting to be uploaded
    NOTES: 'zen_cache_notes',
    TRASH: 'zen_cache_trash',       // <--- NEW: The Hit List (Deleted Note IDs)
    SETTINGS: 'zen_cache_settings', // User preferences
    TIMER: 'zen_timer_state',       // Current timer status
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

    // Call this every second in your timer loop.
    updateLocalStats: (elapsedSeconds, mode) => {
        const today = getDateId();
        let data = JSON.parse(localStorage.getItem(KEYS.STATS) || '{}');

        // Rollover Check: If data is from yesterday, queue it and reset
        if (data.date && data.date !== today) {
            Storage.queueDayForSync(data);
            data = {};
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

    syncPendingData: async (db, user) => {
        if (!user) return;

        // 1. Check current slot for stale data (e.g. user opened app next day)
        const current = JSON.parse(localStorage.getItem(KEYS.STATS) || '{}');
        if (current.date && current.date !== getDateId()) {
            Storage.queueDayForSync(current);
            localStorage.removeItem(KEYS.STATS);
        }

        // 2. Load Queue
        const history = JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]');
        if (history.length === 0) return;

        console.log(`[Sync] Found ${history.length} items to upload...`);

        try {
            // CONSOLIDATE DUPLICATES (Optimization)
            // Combine multiple small entries for the same date into one big payload
            const consolidated = history.reduce((acc, item) => {
                const date = item.date;
                if (!acc[date]) {
                    acc[date] = { ...item };
                } else {
                    acc[date].dailyFocusTime = (acc[date].dailyFocusTime || 0) + (item.dailyFocusTime || 0);
                    acc[date].dailyBreakTime = (acc[date].dailyBreakTime || 0) + (item.dailyBreakTime || 0);
                    acc[date].dailySessions = (acc[date].dailySessions || 0) + (item.dailySessions || 0);
                }
                return acc;
            }, {});

            const batch = writeBatch(db);

            Object.values(consolidated).forEach(dayStat => {
                const historyRef = doc(db, "users", user.uid, "history", dayStat.date);

                // CRITICAL FIX: Use 'increment' to add to server totals instead of overwriting
                batch.set(historyRef, {
                    date: dayStat.date,
                    dailyFocusTime: increment(dayStat.dailyFocusTime || 0),
                    dailyBreakTime: increment(dayStat.dailyBreakTime || 0),
                    dailySessions: increment(dayStat.dailySessions || 0),
                    uploadedAt: Timestamp.now()
                }, { merge: true });
            });

            await batch.commit();

            // Clear queue only on success
            localStorage.removeItem(KEYS.HISTORY);
            console.log("[Sync] Upload successful!");

        } catch (error) {
            console.error("[Sync] Failed:", error);
        }
    },

    // --- 3. NOTES ---
    saveNotesLocally: (notes) => {
        localStorage.setItem(KEYS.NOTES, JSON.stringify(notes));
    },

    getNotes: () => {
        try {
            return JSON.parse(localStorage.getItem(KEYS.NOTES) || '[]');
        } catch { return []; }
    },

    // --- 4. TRASH (The Hit List) ---
    saveTrashLocally: (trashMap) => {
        localStorage.setItem(KEYS.TRASH, JSON.stringify(trashMap));
    },

    getTrash: () => {
        try { return JSON.parse(localStorage.getItem(KEYS.TRASH) || '{}'); } catch { return {}; }
    },

    // --- 5. SETTINGS ---
    saveSettingsLocally: (settings) => {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    },

    getSettings: (defaults) => {
        try {
            const saved = localStorage.getItem(KEYS.SETTINGS);
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        } catch { return defaults; }
    },

    // --- 6. PRO LICENSE MANAGEMENT ---
    getProStatus: () => {
        try {
            const claim = JSON.parse(localStorage.getItem(KEYS.PRO_CLAIM) || '{}');
            if (!claim.isPro) return false;

            const now = Date.now();
            const lastVerified = claim.lastVerified || 0;

            if (now - lastVerified > GRACE_PERIOD_MS) {
                return false; // Expired
            }
            return true;
        } catch { return false; }
    },

    saveProStatus: (isPro) => {
        localStorage.setItem(KEYS.PRO_CLAIM, JSON.stringify({
            isPro: isPro,
            lastVerified: Date.now()
        }));
    }
};