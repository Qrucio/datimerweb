import React, { useEffect, useRef } from 'react';

const TaskReminderSystem = ({ tasks = [] }) => {
    // Track alerted task-reminder pairs to prevent double firing
    const alertedTaskIds = useRef(new Set());
    const timeoutRef = useRef(null);

    useEffect(() => {
        const scheduleNextCheck = () => {
            // 1. Clear existing timeout
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

                    // Only consider if not already alerted AND in the future (or very recent past)
                    if (!alertedTaskIds.current.has(alertId)) {
                        // If it's in the past but within last 1 minute, fire immediately
                        if (triggerTimeMs <= currentMs && (currentMs - triggerTimeMs) < 60000) {
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
                // console.log("[ReminderSystem] No future reminders pending.");
                return;
            }

            allFutureReminders.sort((a, b) => a.triggerTimeMs - b.triggerTimeMs);
            const nextEvent = allFutureReminders[0];
            const delay = Math.max(0, nextEvent.triggerTimeMs - currentMs);

            // console.log(`[ReminderSystem] Next reminder for "${nextEvent.task.title}" in ${(delay / 1000).toFixed(1)}s`);

            // 4. Set Single Timeout
            timeoutRef.current = setTimeout(() => {
                fireReminder(nextEvent.task, nextEvent.reminderMinutes, nextEvent.alertId);
                // Recursively check for the NEXT one after this finishes
                scheduleNextCheck();
            }, delay);
        };

        const fireReminder = (task, minutes, alertId) => {
            console.log(`[ReminderSystem] 🔔 ALARM: "${task.title}" (${minutes}m warning)`);
            playReminderSound();
            alertedTaskIds.current.add(alertId);
        };

        // Run scheduling whenever tasks change or tab visibility changes
        scheduleNextCheck();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // console.log("[ReminderSystem] Tab awake. Re-syncing schedule...");
                scheduleNextCheck();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [tasks]); // Re-schedule if tasks list changes

    const playReminderSound = () => {
        try {
            const audio = new Audio('/sounds/remindnotif.mp3');
            audio.volume = 1.0;
            audio.play().catch(e => console.error("[ReminderSystem] Play failed:", e));
        } catch (e) {
            console.error("[ReminderSystem] Sound error:", e);
        }
    };

    return null;
};

export default TaskReminderSystem;