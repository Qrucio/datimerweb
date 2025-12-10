import { doc, writeBatch, Timestamp, increment } from "firebase/firestore";

const KEYS = {
    STATS: 'zen_stats_current',     // Today's active stats
    HISTORY: 'zen_stats_history',   // Data waiting to be uploaded
    NOTES: 'zen_cache_notes',
    TRASH: 'zen_cache_trash',       // The Hit List (Deleted Note IDs)
    SETTINGS: 'zen_cache_settings', // User preferences
    TIMER: 'zen_timer_state',       // Current timer status
    PRO_CLAIM: 'zen_pro_claim',     // Offline Pro License
    BASE_STREAK: 'zen_stats_base',  // Server-Side Streak Baseline
    TASKS: 'zen_cache_tasks',
    HABITS: 'zen_cache_habits'
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

    // Simple getter for UI/Piggybacking
    getTodayStats: () => {
        try {
            return JSON.parse(localStorage.getItem(KEYS.STATS) || '{}');
        } catch { return {}; }
    },

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
        // [DEPRECATED] - Piggyback Sync now handles history via syncTimerState
        /*
        if (!dayData || !dayData.date) return;
        const history = JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]');
        history.push(dayData);
        localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
        */
    },

    // --- 2. THE SYNC WORKER (The "Bank Run") ---

    hasPendingData: () => {
        try {
            const history = JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]');
            const current = JSON.parse(localStorage.getItem(KEYS.STATS) || '{}');
            // Also check if current is stale
            const isStale = current.date && current.date !== getDateId();
            return history.length > 0 || isStale;
        } catch { return false; }
    },

    syncPendingData: async (db, user) => {
        // [DEPRECATED] - Piggyback Sync now handles history via syncTimerState
        return true;
        /*
        if (!user) return false;

        const today = getDateId();
        // ... (rest of old code commented out)
        */
    },

    // --- 2.5 SYNC DOWN (The "Withdrawal") ---
    // Kept for manual sync if needed, but not used on load anymore.
    mergeHistory: (remoteHistory) => {
        try {
            if (!remoteHistory || remoteHistory.length === 0) return;

            const localHistory = JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]');
            const historyMap = new Map();

            localHistory.forEach(item => historyMap.set(item.date, item));
            remoteHistory.forEach(item => {
                if (item.date === getDateId()) return;
                historyMap.set(item.date, item);
            });

            const merged = Array.from(historyMap.values());
            localStorage.setItem(KEYS.HISTORY, JSON.stringify(merged));
            return merged;
        } catch (e) {
            console.error("Failed to merge history", e);
            return [];
        }
    },

    getFullHistory: () => {
        try {
            const history = JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]');
            const today = JSON.parse(localStorage.getItem(KEYS.STATS) || '{}');

            if (today.date && (today.dailyFocusTime > 0 || today.dailySessions > 0)) {
                return [...history, today];
            }
            return history;
        } catch { return []; }
    },

    syncServerStreak: (streak, lastActive) => {
        if (streak === undefined || lastActive === undefined) return;
        localStorage.setItem(KEYS.BASE_STREAK, JSON.stringify({
            streak: streak,
            lastActive: lastActive,
            syncedAt: Date.now()
        }));
    },

    calculateStreak: (fullHistory) => {
        // 1. Load Server Baseline
        const base = JSON.parse(localStorage.getItem(KEYS.BASE_STREAK) || '{}');
        const baseStreak = base.streak || 0;
        const baseLastActive = base.lastActive ? new Date(base.lastActive) : null;

        if (!fullHistory || fullHistory.length === 0) {
            // No local history? Check if Server Baseline is still valid for Today/Yesterday
            if (baseLastActive && baseStreak > 0) {
                const today = getDateId();
                const yesterdayDate = new Date();
                yesterdayDate.setDate(yesterdayDate.getDate() - 1);

                const baseId = getDateId(baseLastActive);
                if (baseId === today || baseId === getDateId(yesterdayDate)) {
                    return baseStreak;
                }
            }
            return 0;
        }

        // 2. Sort Local History by Date Descending
        const sorted = [...fullHistory].sort((a, b) => new Date(b.date) - new Date(a.date));

        // 3. Check overlap with Today/Yesterday
        const today = getDateId();
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = getDateId(yesterdayDate);

        if (sorted.length === 0) return 0;
        const lastEntry = sorted[0];

        // If the last entry is older than yesterday, streak is broken.
        if (lastEntry.date !== today && lastEntry.date !== yesterday) {
            return 0; // Streak broken
        }

        // 4. Count backwards (Local Chain)
        let streak = 1;
        let currentDate = new Date(lastEntry.date);

        for (let i = 1; i < sorted.length; i++) {
            const entry = sorted[i];
            const entryDate = new Date(entry.date);

            // Expected previous day
            const expectedDate = new Date(currentDate);
            expectedDate.setDate(expectedDate.getDate() - 1);

            // Compare strings to avoid time issues
            if (getDateId(entryDate) === getDateId(expectedDate)) {
                streak++;
                currentDate = expectedDate; // Move cursor back
            } else {
                break; // Gap found
            }
        }

        // 5. Check Connection to Server Baseline
        // If we ran out of local history, does the end of our chain connect to the server baseline?
        if (baseLastActive && baseStreak > 0) {
            const lastLocalDate = currentDate; // The oldest date in our continuous chain
            const oneDayBeforeLocal = new Date(lastLocalDate);
            oneDayBeforeLocal.setDate(oneDayBeforeLocal.getDate() - 1);

            const baseId = getDateId(baseLastActive);
            const connectId = getDateId(oneDayBeforeLocal);

            if (baseId === connectId) {
                streak += baseStreak;
            }
        }

        return streak;
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

    // --- 3.5 SMART NOTES (Tasks & Habits) ---
    saveTasksLocally: (tasks) => {
        localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
    },

    getTasks: () => {
        try {
            const parsed = JSON.parse(localStorage.getItem(KEYS.TASKS) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    },

    saveHabitsLocally: (habits) => {
        localStorage.setItem(KEYS.HABITS, JSON.stringify(habits));
    },

    getHabits: () => {
        try {
            const parsed = JSON.parse(localStorage.getItem(KEYS.HABITS) || '[]');
            return Array.isArray(parsed) ? parsed : [];
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