import React, { useEffect, useRef } from 'react';

const CHECK_INTERVAL_MS = 2000; // Reduced to 2s for debugging

const TaskReminderSystem = ({ tasks = [] }) => {
    // We use a ref to track which task IDs we've already alerted for this session
    // to prevent the sound from looping constantly during the target minute.
    const alertedTaskIds = useRef(new Set());

    useEffect(() => {
        const checkReminders = () => {
            const now = new Date();
            const currentMs = now.getTime();

            console.log(`[ReminderSystem] Checking at ${now.toLocaleTimeString()}. Total tasks: ${tasks.length}`);

            tasks.forEach(task => {
                // 1. Basic Validation
                if (task.isDone || !task.date || !task.startTime) return;

                // 2. Normalize Reminders (Array support)
                let taskReminders = [];
                if (task.reminders && Array.isArray(task.reminders)) {
                    taskReminders = task.reminders;
                } else if (task.reminder && task.reminder !== 'none') {
                    taskReminders = [task.reminder];
                }

                if (taskReminders.length === 0) return;

                // 3. Robust Date Parsing
                // Expected: task.date = "YYYY-MM-DD", task.startTime = "HH:MM"
                let taskDate;
                try {
                    const [year, month, day] = task.date.split('-').map(Number);
                    const [hours, mins] = task.startTime.split(':').map(Number);

                    if (!year || !month || !day || isNaN(hours) || isNaN(mins)) {
                        // Fallback to string parsing if split fails
                        const fallbackString = `${task.date}T${task.startTime}`;
                        taskDate = new Date(fallbackString);
                    } else {
                        // Start counting months from 0
                        taskDate = new Date(year, month - 1, day, hours, mins, 0);
                    }
                } catch (e) {
                    console.error(`[ReminderSystem] Date parse error for "${task.title}"`, e);
                    return;
                }

                if (isNaN(taskDate.getTime())) {
                    console.log(`[ReminderSystem] Invalid date for "${task.title}"`);
                    return;
                }

                // 4. Check Each Reminder
                taskReminders.forEach(reminderVal => {
                    const reminderMinutes = parseInt(reminderVal, 10);
                    if (isNaN(reminderMinutes)) return;

                    const reminderOffsetMs = reminderMinutes * 60 * 1000;
                    const triggerTimeMs = taskDate.getTime() - reminderOffsetMs;

                    // 1-minute window (0ms to 60000ms past trigger)
                    const timeDiff = currentMs - triggerTimeMs;

                    // Unique ID for this specific reminder instance to prevent duplicate alerting
                    const alertId = `${task.id}-${reminderMinutes}`;

                    if (timeDiff >= 0 && timeDiff < 60000) {
                        if (!alertedTaskIds.current.has(alertId)) {
                            console.log(`[ReminderSystem] TRIGGERING SOUND for "${task.title}" (${reminderMinutes}m before)`);
                            playReminderSound();
                            alertedTaskIds.current.add(alertId);
                        }
                    }
                });
            });
        };

        const interval = setInterval(checkReminders, CHECK_INTERVAL_MS);

        // Initial check immediately
        checkReminders();

        return () => clearInterval(interval);
    }, [tasks]);

    const playReminderSound = () => {
        try {
            console.log("[ReminderSystem] Attempting to play sound...");
            // Assumes file is at public/sounds/remindnotif.mp3
            const audio = new Audio('/sounds/remindnotif.mp3');
            audio.volume = 1.0;
            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log("[ReminderSystem] Audio playback started successfully.");
                    })
                    .catch(e => {
                        console.error("[ReminderSystem] Audio playback failed:", e);
                    });
            }
        } catch (e) {
            console.error("[ReminderSystem] Sound error:", e);
        }
    };

    return null; // Headless component (no UI)
};

export default TaskReminderSystem;