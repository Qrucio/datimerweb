import React, { useEffect, useRef } from 'react';

const CHECK_INTERVAL_MS = 10000; // Check every 10 seconds

const TaskReminderSystem = ({ tasks = [] }) => {
    // We use a ref to track which task IDs we've already alerted for this session
    // to prevent the sound from looping constantly during the target minute.
    const alertedTaskIds = useRef(new Set());

    useEffect(() => {
        const checkReminders = () => {
            const now = new Date();
            const currentMs = now.getTime();

            tasks.forEach(task => {
                // Skip if no reminder, done, or invalid time
                if (!task.reminder || task.reminder === 'none' || task.isDone || !task.date || !task.startTime) return;

                // 1. Construct Task Date Object
                const taskDateTimeString = `${task.date}T${task.startTime}`;
                const taskDate = new Date(taskDateTimeString);

                if (isNaN(taskDate.getTime())) return;

                // 2. Calculate Trigger Time
                // task.reminder is in minutes (e.g., 5, 10, 0)
                const reminderOffsetMs = parseInt(task.reminder) * 60 * 1000;
                const triggerTimeMs = taskDate.getTime() - reminderOffsetMs;

                // 3. Check if we are within a 1-minute window of the trigger time
                const timeDiff = currentMs - triggerTimeMs;

                // Logic: If the time is NOW (within last 60 seconds) and we haven't alerted yet
                if (timeDiff >= 0 && timeDiff < 60000) {
                    if (!alertedTaskIds.current.has(task.id)) {
                        playReminderSound();
                        alertedTaskIds.current.add(task.id);

                        // Optional: Browser Notification
                        if (Notification.permission === "granted") {
                            new Notification("Task Reminder", { body: task.title });
                        }
                    }
                }
            });
        };

        const interval = setInterval(checkReminders, CHECK_INTERVAL_MS);

        // Browser Notification Permission Request
        if (Notification.permission === "default") {
            Notification.requestPermission();
        }

        return () => clearInterval(interval);
    }, [tasks]);

    const playReminderSound = () => {
        try {
            // Assumes file is at public/sounds/reminder.mp3
            const audio = new Audio('/sounds/remindnotif.mp3');
            audio.volume = 0.7;
            audio.play().catch(e => console.error("Audio play failed (interaction needed first):", e));
        } catch (e) {
            console.error("Sound error:", e);
        }
    };

    return null; // Headless component (no UI)
};

export default TaskReminderSystem;