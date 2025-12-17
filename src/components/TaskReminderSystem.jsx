import React, { useEffect, useRef } from 'react';

const TaskReminderSystem = ({ tasks = [] }) => {
    // Track alerted task-reminder pairs using sessionStorage to persist across remounts
    const alertedTaskIds = useRef(new Set());
    const timeoutRef = useRef(null);
    const audioRef = useRef(null);

    // Initialize state and audio
    useEffect(() => {
        // 1. Load alerted state from storage
        try {
            const stored = sessionStorage.getItem('zen_alerted_reminders');
            if (stored) {
                const parsed = JSON.parse(stored);
                parsed.forEach(id => alertedTaskIds.current.add(id));
            }
        } catch (e) {
            console.error("[ReminderSystem] Failed to load history:", e);
        }

        // 2. Setup Audio
        // Create audio object once and keep it
        audioRef.current = new Audio('/sounds/remindnotif.mp3');
        audioRef.current.preload = 'auto'; // Preload for instant playback
        audioRef.current.volume = 1.0;

        // 3. Request Notification Permission
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission().catch(err => console.error("Notification permissions error", err));
        }

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const saveAlertState = () => {
        try {
            sessionStorage.setItem('zen_alerted_reminders', JSON.stringify([...alertedTaskIds.current]));
        } catch (e) {
            console.error("[ReminderSystem] Save failed", e);
        }
    };

    useEffect(() => {
        const scheduleNextCheck = () => {
            // 1. Clear existing timeout to avoid overlaps
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            const now = new Date();
            const currentMs = now.getTime();
            let allFutureReminders = [];

            // 2. Gather ALL pending future reminders
            // 2. Gather ALL pending future reminders
            tasks.forEach(task => {
                if (task.isDone || !task.startTime) return; // Note: !task.date check removed to allow floating recurring tasks if designed, but usually date is required.

                // Normalize Reminders
                let taskReminders = [];
                if (task.reminders && Array.isArray(task.reminders)) {
                    taskReminders = task.reminders;
                } else if (task.reminder && task.reminder !== 'none') {
                    taskReminders = [task.reminder];
                }

                if (taskReminders.length === 0) return;

                // --- RECURRENCE PROJECTION HELPER ---
                const getNextOccurrence = (t, fromDate) => {
                    if (!t.date) return null;
                    const baseDateStr = t.date; // YYYY-MM-DD
                    const [y, m, d] = baseDateStr.split('-').map(Number);
                    if (!y || !m || !d) return null;

                    const [th, tm] = t.startTime.split(':').map(Number);
                    if (isNaN(th) || isNaN(tm)) return null;

                    const baseDate = new Date(y, m - 1, d, th, tm, 0);

                    // If not recurring, return base date only
                    const isRecurring = (t.repeatDays && t.repeatDays.length > 0) || (t.recurrence && t.recurrence !== 'none');

                    if (!isRecurring) {
                        return baseDate;
                    }

                    // If Recurring, find next instance >= fromDate (minus buffer? No, we warn X mins before)
                    // Actually, we want the instance where (InstanceTime - ReminderOffset) > Now.
                    // But effectively we just want the next occurrence that hasn't finished yet.

                    // A. Setup
                    const nowMs = fromDate.getTime();
                    let cursor = new Date(baseDate);

                    // If base is already in future, great.
                    if (cursor.getTime() > nowMs) return cursor;

                    // If in past, project forward.
                    // SAFEGUARD: Limit iterations to avoid infinite loops (e.g. 1 year out)
                    for (let i = 0; i < 500; i++) {
                        // Advance cursor based on logic
                        if (t.repeatDays && t.repeatDays.length > 0) {
                            // Custom Days (0=Sun, 1=Mon...)
                            // Add 1 day until we hit a match
                            cursor.setDate(cursor.getDate() + 1);
                            if (t.repeatDays.includes(cursor.getDay())) {
                                // Match found. Is it in future?
                                if (cursor.getTime() > nowMs) return cursor;
                            }
                        } else if (t.recurrence === 'daily') {
                            cursor.setDate(cursor.getDate() + 1);
                            if (cursor.getTime() > nowMs) return cursor; // Optimization: we can jump days but loop is safe enough
                        } else if (t.recurrence === 'weekly') {
                            cursor.setDate(cursor.getDate() + 7);
                            if (cursor.getTime() > nowMs) return cursor;
                        } else if (t.recurrence === 'monthly') {
                            cursor.setMonth(cursor.getMonth() + 1);
                            if (cursor.getTime() > nowMs) return cursor;
                        } else if (t.recurrence === 'yearly') {
                            cursor.setFullYear(cursor.getFullYear() + 1);
                            if (cursor.getTime() > nowMs) return cursor;
                        } else {
                            // Unknown recurrence
                            return null;
                        }
                    }
                    return null;
                };

                const nextDate = getNextOccurrence(task, new Date(currentMs - (24 * 60 * 60 * 1000))); // Look back 24h just in case? No, 'now' is fine.
                // Actually, if I have a task at 10:00 AM and it's 9:55 AM, and reminder is 10 min, I want it to fire?
                // The loop logic handles the "offset".
                // We should find the next occurrence that satisfies: (OccurrenceTime - ReminderOffset) > Now OR (OccurrenceTime - ReminderOffset) is effectively "Active".

                // Simplified: Look back 1 hour to catch "Just Missed" instances (e.g. late by 2 mins)
                const targetDate = getNextOccurrence(task, new Date(currentMs - 3600000));

                if (!targetDate || isNaN(targetDate.getTime())) return;

                // Calculate Trigger Times
                taskReminders.forEach(reminderVal => {
                    const reminderMinutes = parseInt(reminderVal, 10);
                    if (isNaN(reminderMinutes)) return;

                    const reminderOffsetMs = reminderMinutes * 60 * 1000;
                    const triggerTimeMs = targetDate.getTime() - reminderOffsetMs;

                    // Unique ID now needs to include the DATE to allow re-alerting for next instance
                    // Format: ID-ReminderMin-EpochTime
                    const uniqueInstanceId = `${task.id}-${reminderMinutes}-${targetDate.getTime()}`;

                    // Check if already alerted
                    if (!alertedTaskIds.current.has(uniqueInstanceId)) {
                        // If it's in the past but within last 5 minutes (increased window), fire immediately
                        if (triggerTimeMs <= currentMs && (currentMs - triggerTimeMs) < 300000) {
                            fireReminder(task, reminderMinutes, uniqueInstanceId);
                        }
                        // If strictly future
                        else if (triggerTimeMs > currentMs) {
                            allFutureReminders.push({
                                triggerTimeMs,
                                task,
                                reminderMinutes,
                                alertId: uniqueInstanceId
                            });
                        }
                    }
                });
            });

            // 3. Find the Earliest Next Reminder
            if (allFutureReminders.length === 0) {
                return;
            }

            allFutureReminders.sort((a, b) => a.triggerTimeMs - b.triggerTimeMs);
            const nextEvent = allFutureReminders[0];
            const delay = Math.max(0, nextEvent.triggerTimeMs - currentMs);

            // 4. Set Single Timeout
            timeoutRef.current = setTimeout(() => {
                fireReminder(nextEvent.task, nextEvent.reminderMinutes, nextEvent.alertId);
                // Recursively check for the NEXT one after this finishes
                scheduleNextCheck();
            }, delay);
        };

        const fireReminder = (task, minutes, alertId) => {
            if (alertedTaskIds.current.has(alertId)) return; // Double-check

            console.log(`[ReminderSystem] 🔔 ALARM: "${task.title}" (${minutes}m warning)`);

            // Mark as done immediately
            alertedTaskIds.current.add(alertId);
            saveAlertState();

            // Play Sound
            playReminderSound();

            // Show Notification
            showSystemNotification(task.title, `Reminder: Due in ${minutes} minutes`);
        };

        // Run scheduling whenever tasks change or tab visibility changes
        scheduleNextCheck();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                scheduleNextCheck();
            }
        };

        const handleFocus = () => {
            scheduleNextCheck();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleFocus);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", handleFocus);
        };
    }, [tasks]); // Re-schedule if tasks list changes

    const playReminderSound = () => {
        if (!audioRef.current) return;

        // Reset and play
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();

        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error("[ReminderSystem] Audio playback failed:", error);

                // If audio fails (e.g. autoplay policy), we rely on Notification.
                // We could also try to show a visual toast, but Notification is standard.
            });
        }
    };

    const showSystemNotification = (title, body) => {
        if (!("Notification" in window)) return;

        if (Notification.permission === "granted") {
            try {
                // Use the standard notification
                new Notification(title, {
                    body: body,
                    icon: '/logo/altimer-logo.png', // Best guess path, or standard icon
                    silent: false
                });
            } catch (e) {
                console.error("[ReminderSystem] Notification failed", e);
            }
        }
        else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    showSystemNotification(title, body);
                }
            });
        }
    };

    return null;
};

export default TaskReminderSystem;