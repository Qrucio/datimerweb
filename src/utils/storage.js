import { supabase } from "../lib/supabase";
import { logger } from "./logger";

const KEYS = {
    STATS: 'zen_stats_current',     // Today's active stats
    HISTORY: 'zen_stats_history',   // Data waiting to be uploaded
    NOTES: 'zen_cache_notes',
    TRASH: 'zen_cache_trash',       // The Hit List (Deleted Note IDs)
    SETTINGS: 'zen_cache_settings', // User preferences
    TIMER: 'zen_timer_state',       // Current timer status
    PRO_CLAIM: 'zen_pro_claim',     // Offline Pro License
    TASKS: 'zen_cache_tasks',
    HABITS: 'zen_cache_habits',
    SUBSCRIPTION: 'zen_cache_subscription',
    QUICKLINKS: 'zen_quicklinks',
    REMOVE_ADS: 'zen_remove_ads',   // Purchase flag to hide ads
    VOLUME: 'zen_volume',           // Global Volume
    SPOTIFY_PROMO_DISMISSED: 'zen_spotify_promo_dismissed',
    VERSION_SEEN: 'zen_version_seen',
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

    // HYDRATE FROM SERVER (Fix for 0s bug)
    hydrateTodayStats: (serverData) => {
        if (!serverData) return;

        const currentLocal = Storage.getTodayStats();
        // If the server data is for the same day, we merge safely.
        // If server data is for a NEW day (tomorrow), we accept it (rollover).
        // If server data is OLD (yesterday), we ignore it.

        let data = {};

        if (currentLocal.date && currentLocal.date === serverData.date_id) {
            // SAME DAY: Merge (Take Max to prevent regression)
            // console.log("[Stats] Merging Server Data", serverData);
            data = {
                date: serverData.date_id,
                dailyFocusTime: Math.max(currentLocal.dailyFocusTime || 0, serverData.focus_time || 0),
                dailyBreakTime: Math.max(currentLocal.dailyBreakTime || 0, serverData.break_time || 0),
                dailySessions: Math.max(currentLocal.dailySessions || 0, serverData.sessions || 0),
                dailyStopwatchTime: Math.max(currentLocal.dailyStopwatchTime || 0, serverData.stopwatch_time || 0)
            };
        } else {
            // NEW DAY or UNINITIALIZED: Take Server Data specificially
            // (We trust server if we have no local data for this day yet)
            if (!currentLocal.date || serverData.date_id > currentLocal.date) {
                console.log("[Stats] Hydrating New Day from Server");
                data = {
                    date: serverData.date_id,
                    dailyFocusTime: serverData.focus_time || 0,
                    dailyBreakTime: serverData.break_time || 0,
                    dailySessions: serverData.sessions || 0,
                    dailyStopwatchTime: serverData.stopwatch_time || 0
                };
            } else {
                // OLD DATA: Ignore
                return currentLocal;
            }
        }

        localStorage.setItem(KEYS.STATS, JSON.stringify(data));
        return data;
    },

    // Call this every second in your timer loop.
    updateLocalStats: (elapsedSeconds, mode) => {
        const today = getDateId();
        let data = JSON.parse(localStorage.getItem(KEYS.STATS) || '{}');

        // Rollover Check: If data is from yesterday, queue it and reset
        if (data.date && data.date !== today) {
            Storage.queueDayForSync(data);
            data = {};
            localStorage.setItem(KEYS.STATS, JSON.stringify(data)); // Force save reset
        }

        // Initialize if empty
        if (!data.date) {
            data = {
                date: today,
                dailyFocusTime: 0,
                dailyBreakTime: 0,
                dailySessions: 0,
                dailyStopwatchTime: 0
            };
        }

        // Update the values
        if (mode === 'focus') {
            data.dailyFocusTime = (data.dailyFocusTime || 0) + elapsedSeconds;
        } else if (mode === 'stopwatch') {
            data.dailyStopwatchTime = (data.dailyStopwatchTime || 0) + elapsedSeconds;
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

    setTodayStats: (stats) => {
        const today = getDateId();
        const data = {
            date: today,
            ...stats
        };
        localStorage.setItem(KEYS.STATS, JSON.stringify(data));
        return data;
    },

    // Move a finished day into the "Upload Queue"
    queueDayForSync: async (dayData) => {
        if (!dayData || !dayData.date) return;

        // 1. History Array Logic (Deprecated but safe to keep locally)
        const history = JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]');
        history.push(dayData);
        localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));

        // 2. Immediate Supabase Sync attempt (Best Effort)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            try {
                await supabase.from('history').upsert({
                    user_id: user.id,
                    date_id: dayData.date,
                    focus_time: dayData.dailyFocusTime || 0,
                    break_time: dayData.dailyBreakTime || 0,
                    sessions: dayData.dailySessions || 0,
                    stopwatch_time: dayData.dailyStopwatchTime || 0,
                    data: dayData
                }, { onConflict: 'user_id, date_id' });
            } catch (e) {
                console.error("Queue Sync Failed", e);
            }
        }
    },

    // --- 2. THE SYNC WORKER ---
    // In Supabase, we don't strictly *need* complex offline queuing because 
    // the client handles retries well, but we'll leave the hooks for now.
    hasPendingData: () => false,
    syncPendingData: async () => true,

    // --- 2.5 SYNC DOWN (Fetch History) ---
    mergeHistory: (remoteHistory) => {
        // ... (kept for compat if needed, but easier to just trust DB)
        return remoteHistory;
    },

    getFullHistory: () => {
        try {
            const history = JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]');
            const today = JSON.parse(localStorage.getItem(KEYS.STATS) || '{}');

            // Copy history array
            let fullHistory = [...history];

            // If today has data, append it for streak calculation
            if (today.date && (today.dailyFocusTime > 0 || today.dailySessions > 0 || today.dailyStopwatchTime > 0)) {
                // Check if today already exists in history (duplicate protection)
                const exists = fullHistory.find(d => d.date === today.date);
                if (!exists) {
                    fullHistory.push(today);
                } else {
                    // Update existing today entry if in history (shouldn't happen with correct logic but safe)
                    fullHistory = fullHistory.map(d => d.date === today.date ? today : d);
                }
            }
            return fullHistory;
        } catch { return []; }
    },

    // --- NEW: FORCE DAILY RESET ON APP LOAD ---
    checkDailyReset: () => {
        const today = getDateId();
        let data = JSON.parse(localStorage.getItem(KEYS.STATS) || '{}');

        // If data exists and date is NOT today (and not empty)
        if (data.date && data.date !== today) {
            console.log("Storage: Daily Reset Triggered. Queuing", data.date);
            Storage.queueDayForSync(data);
            localStorage.setItem(KEYS.STATS, '{}'); // Wipe for today
            return true; // Indicates reset happened
        }

        // If data doesn't have a date yet (fresh install or empty), set it
        if (!data.date) {
            data.date = today;
            localStorage.setItem(KEYS.STATS, JSON.stringify(data));
        }

        return false;
    },

    // --- NEW: HYDRATE HISTORY FROM SERVER ---
    hydrateHistory: (serverHistory) => {
        if (!serverHistory || !Array.isArray(serverHistory)) return;

        // 1. Convert Server Format -> Local Format
        const localHistory = serverHistory.map(row => {
            // If 'data' column has full JSON, use it, else map columns
            return row.data || {
                date: row.date_id,
                dailyFocusTime: row.focus_time,
                dailyBreakTime: row.break_time,
                dailySessions: row.sessions,
                dailyStopwatchTime: row.stopwatch_time
            };
        });

        // 2. Save only "past" days to History (filter out today to avoid conflict)
        const todayId = getDateId();
        const pastHistory = localHistory.filter(h => h.date !== todayId);

        localStorage.setItem(KEYS.HISTORY, JSON.stringify(pastHistory));
        return pastHistory;
    },

    calculateStreak: (history = []) => {
        if (!history || !history.length) return 0;

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

        // Get unique dates, sorted descending
        const dates = [...new Set(history.map(h => h.date))].sort().reverse();

        if (!dates.length) return 0;

        // Must have activity today or yesterday to have active streak
        const mostRecent = dates[0];
        if (mostRecent !== todayStr && mostRecent !== yesterdayStr) return 0;

        // Count consecutive days backward
        let streak = 0;
        let expectedDate = new Date(mostRecent + 'T00:00:00');

        for (const dateStr of dates) {
            const expected = `${expectedDate.getFullYear()}-${String(expectedDate.getMonth() + 1).padStart(2, '0')}-${String(expectedDate.getDate()).padStart(2, '0')}`;
            if (dateStr === expected) {
                streak++;
                expectedDate.setDate(expectedDate.getDate() - 1);
            } else if (dateStr < expected) {
                break; // Gap found
            }
        }

        return streak;
    },

    // --- 3. NOTES ---
    saveNotesLocally: async (notes) => {
        localStorage.setItem(KEYS.NOTES, JSON.stringify(notes));

        // Supabase Sync
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('user_settings').upsert({
                user_id: user.id,
                notes: notes,
                updated_at: new Date()
            });
        }
    },

    getNotes: () => {
        try {
            return JSON.parse(localStorage.getItem(KEYS.NOTES) || '[]');
        } catch { return []; }
    },

    // --- 3.5 SMART NOTES (Tasks & Habits) ---
    // For now, these share the 'notes' jsonb column or can be split later.
    // Keeping local-only for brevity unless we want to migrate them too.
    saveTasksLocally: async (tasks) => {
        localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
        // SYNC TASKS TO DB
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('user_settings').upsert({
                user_id: user.id,
                tasks: tasks,
                updated_at: new Date()
            });
        }
    },
    getTasks: () => {
        try {
            return JSON.parse(localStorage.getItem(KEYS.TASKS) || '[]');
        } catch { return []; }
    },

    saveHabitsLocally: async (habits) => {
        localStorage.setItem(KEYS.HABITS, JSON.stringify(habits));
        // SYNC HABITS TO DB
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('user_settings').upsert({
                user_id: user.id,
                habits: habits,
                updated_at: new Date()
            });
        }
    },
    getHabits: () => {
        try {
            return JSON.parse(localStorage.getItem(KEYS.HABITS) || '[]');
        } catch { return []; }
    },

    // --- 4. TRASH ---
    saveTrashLocally: (trashMap) => localStorage.setItem(KEYS.TRASH, JSON.stringify(trashMap)),
    getTrash: () => {
        try {
            return JSON.parse(localStorage.getItem(KEYS.TRASH) || '{}');
        } catch { return {}; }
    },

    // --- QUICKLINKS ---
    saveQuicklinksLocally: (links) => {
        localStorage.setItem(KEYS.QUICKLINKS, JSON.stringify(links));
    },
    getQuicklinks: () => {
        try {
            const saved = localStorage.getItem(KEYS.QUICKLINKS);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    },

    // --- 5. SETTINGS ---
    saveSettingsLocally: async (settings) => {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('user_settings').upsert({
                user_id: user.id,
                settings: settings,
                updated_at: new Date()
            });
        }
    },

    getSettings: (defaults) => {
        try {
            const saved = localStorage.getItem(KEYS.SETTINGS);
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        } catch { return defaults; }
    },

    // --- 6. PRO LICENSE MANAGEMENT ---
    // --- 6. PRO LICENSE MANAGEMENT ---
    // Synchronous "Peek" for optimistic UI initialization (Instant Load)
    peekProStatus: () => {
        try {
            const claim = JSON.parse(localStorage.getItem(KEYS.PRO_CLAIM) || '{}');
            // Strict check: Must have isPro AND valid expiry
            return !!(claim.isPro && claim.expiresAt && claim.expiresAt > Date.now());
        } catch { return false; }
    },

    getProStatus: async () => {
        // ALWAYS check Supabase first to respect manual DB edits / revocations.
        // Only fallback to cache if the server check fails (Offline).
        console.log("[Storage] Checking Pro Status...");
        try {
            const { data: { user } } = await supabase.auth.getUser();
            logger.debug("[Storage] User:", user?.id);

            if (user) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('is_pro, pro_expires_at')
                    .eq('id', user.id)
                    .single();

                logger.debug("[Storage] DB Response:", data, error);

                if (data) {
                    // MASTER SWITCH: If is_pro is false in DB, revoke immediately.
                    if (!data.is_pro) {
                        console.log("[Storage] Master Switch: Revoked");
                        Storage.saveProStatus(false);
                        return false;
                    }

                    const now = Date.now();
                    const serverExpiresAt = data.pro_expires_at ? new Date(data.pro_expires_at).getTime() : null;

                    // Valid if:
                    // 1. Lifetime (is_pro = true, no expiry)
                    // 2. Subscription (is_pro = true, expiry in future)
                    const isValid = !serverExpiresAt || (serverExpiresAt > now);
                    console.log("[Storage] Is Valid?", isValid, "Expires:", serverExpiresAt);

                    if (isValid) {
                        // Confirmed Pro from Server
                        Storage.saveProStatus(true, serverExpiresAt);
                        return true;
                    }
                }
            }

            // If we are here, User is logged in but NOT Pro (or logged out)
            // We must invalidate the cache to prevent "zombie" Pro status
            console.log("[Storage] Defaulting to False");
            Storage.saveProStatus(false);
            return false;

        } catch (e) {
            console.warn("Pro Status Server Check Failed (Offline Mode)", e);
            // FALLBACK: Check Local Cache if Server is unreachable
            try {
                const claim = JSON.parse(localStorage.getItem(KEYS.PRO_CLAIM) || '{}');
                const now = Date.now();
                console.log("[Storage] Checking Cache Fallback:", claim);
                if (claim.isPro && claim.expiresAt && claim.expiresAt > now) {
                    return true;
                }
            } catch { /* ignore cache errors */ }
            return false;
        }
    },

    saveProStatus: (isPro, expiresAt = null) => {
        // Default to 7 days cache if lifetime, otherwise use exact expiry
        const validUntil = expiresAt || (Date.now() + GRACE_PERIOD_MS);

        localStorage.setItem(KEYS.PRO_CLAIM, JSON.stringify({
            isPro: isPro,
            lastVerified: Date.now(),
            expiresAt: validUntil
        }));
    },

    activateProSubscription: async (user, hours) => {
        const duration = hours * 60 * 60 * 1000;
        const expiresAt = Date.now() + duration;

        // 1. Local Update
        Storage.saveProStatus(true, expiresAt);

        // 2. Server Update (Supabase)
        if (user) {
            await supabase.from('profiles').update({
                is_pro: true,
                pro_expires_at: new Date(expiresAt).toISOString()
            }).eq('id', user.id);
        }
    },

    // --- 13. UI PERSISTENCE ---
    getVolume: () => {
        try {
            const vol = localStorage.getItem(KEYS.VOLUME);
            return vol !== null ? parseFloat(vol) : 0.5;
        } catch { return 0.5; }
    },
    setVolume: (vol) => {
        localStorage.setItem(KEYS.VOLUME, vol.toString());
    },

    getSpotifyPromoDismissed: () => {
        return localStorage.getItem(KEYS.SPOTIFY_PROMO_DISMISSED) === 'true';
    },
    setSpotifyPromoDismissed: (dismissed) => {
        localStorage.setItem(KEYS.SPOTIFY_PROMO_DISMISSED, dismissed.toString());
    },

    // --- 15. VERSION TRACKING ---
    getLastSeenVersion: () => {
        try {
            return localStorage.getItem(KEYS.VERSION_SEEN) || null;
        } catch { return null; }
    },

    setVersionSeen: (version) => {
        localStorage.setItem(KEYS.VERSION_SEEN, version);
    },

    hasNewVersion: (currentVersion) => {
        const lastSeen = Storage.getLastSeenVersion();
        return !lastSeen || currentVersion !== lastSeen;
    },

    // --- 14. SESSION CLEANUP ---
    clearAll: () => {
        Object.values(KEYS).forEach(key => localStorage.removeItem(key));
        // Clear legacy/other keys if they exist
        localStorage.removeItem('pomodoro_user_name');
        localStorage.removeItem('zen_user_handle');
        localStorage.removeItem('zen_intention_task');
        localStorage.removeItem('zen_holo_note');
        localStorage.removeItem('zen_bmc_disabled');
    }
};