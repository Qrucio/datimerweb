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
            tasks.forEach(task => {
                if (task.isDone || !task.date || !task.startTime) return;

                // Normalize Reminders
                let taskReminders = [];
                if (task.reminders && Array.isArray(task.reminders)) {
                    taskReminders = task.reminders;
                } else if (task.reminder && task.reminder !== 'none') {
                    taskReminders = [task.reminder];
                }

                if (taskReminders.length === 0) return;

                // Parse Date
                let taskDate;
                try {
                    const [year, month, day] = task.date.split('-').map(Number);
                    const [hours, mins] = task.startTime.split(':').map(Number);

                    if (!year || !month || !day || isNaN(hours) || isNaN(mins)) {
                        const fallbackString = `${task.date}T${task.startTime}`;
                        taskDate = new Date(fallbackString);
                    } else {
                        taskDate = new Date(year, month - 1, day, hours, mins, 0);
                    }
                } catch (e) {
                    return;
                }

                if (isNaN(taskDate.getTime())) return;

                // Calculate Trigger Times
                taskReminders.forEach(reminderVal => {
                    const reminderMinutes = parseInt(reminderVal, 10);
                    if (isNaN(reminderMinutes)) return;

                    const reminderOffsetMs = reminderMinutes * 60 * 1000;
                    const triggerTimeMs = taskDate.getTime() - reminderOffsetMs;
                    const alertId = `${task.id}-${reminderMinutes}`;

                    // Check if already alerted
                    if (!alertedTaskIds.current.has(alertId)) {
                        // If it's in the past but within last 2 minutes, fire immediately (missed valid window)
                        if (triggerTimeMs <= currentMs && (currentMs - triggerTimeMs) < 120000) {
                            fireReminder(task, reminderMinutes, alertId);
                        }
                        // If it's strictly in the future, add to schedule candidates
                        else if (triggerTimeMs > currentMs) {
                            allFutureReminders.push({
                                triggerTimeMs,
                                task,
                                reminderMinutes,
                                alertId
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