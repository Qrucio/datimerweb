import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTimeLeft } from '../src/components/RemoteTimerPane.jsx';
import { RoomsService } from '../src/services/roomsService.js';
import { mockSupabase } from './mockSupabase.js';

describe('Timer Sync Calculations (calculateTimeLeft)', () => {
    beforeEach(() => {
        mockSupabase.reset();
    });

    describe('Null and empty states', () => {
        test('returns 0 when state is null', () => {
            assert.equal(calculateTimeLeft(null), 0);
        });

        test('returns 0 when state is undefined', () => {
            assert.equal(calculateTimeLeft(undefined), 0);
        });

        test('returns 0 when state is empty object', () => {
            assert.equal(calculateTimeLeft({}), 0);
        });
    });

    describe('Countdown modes (focus, shortBreak, longBreak)', () => {
        test('actively running countdown: returns accurate remaining seconds relative to serverEndTime', () => {
            const now = RoomsService.getSyncedTime();
            // 25 minutes left in ms
            const remainingMs = 25 * 60 * 1000;
            const state = {
                mode: 'focus',
                isActive: true,
                serverEndTime: now + remainingMs,
                remainingDuration: remainingMs
            };

            const timeLeft = calculateTimeLeft(state);
            assert.equal(timeLeft, 1500); // 1500 seconds
        });

        test('actively running countdown: uses Math.ceil for sub-second precision', () => {
            const now = RoomsService.getSyncedTime();
            // 10.2 seconds left -> Math.ceil(10.2) = 11 seconds
            const state = {
                mode: 'focus',
                isActive: true,
                serverEndTime: now + 10200,
                remainingDuration: 10200
            };

            assert.equal(calculateTimeLeft(state), 11);
        });

        test('actively running countdown: caps at 0 when now exceeds serverEndTime', () => {
            const now = RoomsService.getSyncedTime();
            // Timer expired 5 seconds ago
            const state = {
                mode: 'focus',
                isActive: true,
                serverEndTime: now - 5000,
                remainingDuration: 0
            };

            assert.equal(calculateTimeLeft(state), 0);
        });

        test('actively running countdown: returns 0 exactly when now equals serverEndTime', () => {
            const now = RoomsService.getSyncedTime();
            const state = {
                mode: 'shortBreak',
                isActive: true,
                serverEndTime: now,
                remainingDuration: 0
            };

            assert.equal(calculateTimeLeft(state), 0);
        });

        test('paused countdown: returns remainingDuration converted to seconds using Math.ceil', () => {
            const state = {
                mode: 'focus',
                isActive: false,
                remainingDuration: 1500000, // 25 mins
                serverEndTime: null
            };

            assert.equal(calculateTimeLeft(state), 1500);
        });

        test('paused countdown: sub-second remainingDuration uses Math.ceil', () => {
            const state = {
                mode: 'shortBreak',
                isActive: false,
                remainingDuration: 299100 // 299.1 seconds -> 300
            };

            assert.equal(calculateTimeLeft(state), 300);
        });

        test('paused countdown with zero remainingDuration returns 0', () => {
            const state = {
                mode: 'focus',
                isActive: false,
                remainingDuration: 0
            };

            assert.equal(calculateTimeLeft(state), 0);
        });

        test('paused countdown with missing remainingDuration returns 0', () => {
            const state = {
                mode: 'focus',
                isActive: false
            };

            assert.equal(calculateTimeLeft(state), 0);
        });
    });

    describe('Stopwatch mode', () => {
        test('actively running stopwatch: counts UP from serverStartTime', () => {
            const now = RoomsService.getSyncedTime();
            // Started 42 seconds ago
            const state = {
                mode: 'stopwatch',
                isActive: true,
                serverStartTime: now - 42000,
                remainingDuration: 0
            };

            assert.equal(calculateTimeLeft(state), 42);
        });

        test('actively running stopwatch: uses Math.floor for elapsed seconds', () => {
            const now = RoomsService.getSyncedTime();
            // Started 42.8 seconds ago -> Math.floor(42.8) = 42 seconds
            const state = {
                mode: 'stopwatch',
                isActive: true,
                serverStartTime: now - 42800
            };

            assert.equal(calculateTimeLeft(state), 42);
        });

        test('actively running stopwatch: returns 0 at exact moment of start', () => {
            const now = RoomsService.getSyncedTime();
            const state = {
                mode: 'stopwatch',
                isActive: true,
                serverStartTime: now
            };

            assert.equal(calculateTimeLeft(state), 0);
        });

        test('actively running stopwatch: caps at 0 when serverStartTime is in future (clock skew edge case)', () => {
            const now = RoomsService.getSyncedTime();
            // Future start time by 2 seconds due to clock skew
            const state = {
                mode: 'stopwatch',
                isActive: true,
                serverStartTime: now + 2000
            };

            assert.equal(calculateTimeLeft(state), 0);
        });

        test('paused stopwatch: returns remainingDuration converted to seconds using Math.floor', () => {
            const state = {
                mode: 'stopwatch',
                isActive: false,
                remainingDuration: 125800 // 125.8 seconds -> 125
            };

            assert.equal(calculateTimeLeft(state), 125);
        });

        test('paused stopwatch with zero remainingDuration returns 0', () => {
            const state = {
                mode: 'stopwatch',
                isActive: false,
                remainingDuration: 0
            };

            assert.equal(calculateTimeLeft(state), 0);
        });

        test('paused stopwatch with missing remainingDuration returns 0', () => {
            const state = {
                mode: 'stopwatch',
                isActive: false
            };

            assert.equal(calculateTimeLeft(state), 0);
        });
    });

    describe('Mode switching & boundary transitions', () => {
        test('switching from active countdown to paused stopwatch preserves stopwatch floor semantics', () => {
            // First in focus mode running
            const now = RoomsService.getSyncedTime();
            const focusState = {
                mode: 'focus',
                isActive: true,
                serverEndTime: now + 500000
            };
            assert.equal(calculateTimeLeft(focusState), 500);

            // User switches to stopwatch (paused with accumulated duration)
            const switchedStopwatch = {
                mode: 'stopwatch',
                isActive: false,
                remainingDuration: 300400
            };
            assert.equal(calculateTimeLeft(switchedStopwatch), 300);
        });

        test('switching from active stopwatch to active shortBreak counts down to new serverEndTime', () => {
            const now = RoomsService.getSyncedTime();
            const stopwatchRunning = {
                mode: 'stopwatch',
                isActive: true,
                serverStartTime: now - 3600000 // 1 hour elapsed
            };
            assert.equal(calculateTimeLeft(stopwatchRunning), 3600);

            // Switch to short break
            const breakRunning = {
                mode: 'shortBreak',
                isActive: true,
                serverEndTime: now + 300000 // 5 mins left
            };
            assert.equal(calculateTimeLeft(breakRunning), 300);
        });

        test('large durations (e.g. 10 hours focus or stopwatch) calculate accurately without precision loss', () => {
            const now = RoomsService.getSyncedTime();
            const tenHoursMs = 10 * 3600 * 1000;

            const largeCountdown = {
                mode: 'focus',
                isActive: true,
                serverEndTime: now + tenHoursMs
            };
            assert.equal(calculateTimeLeft(largeCountdown), 36000);

            const largeStopwatch = {
                mode: 'stopwatch',
                isActive: true,
                serverStartTime: now - tenHoursMs
            };
            assert.equal(calculateTimeLeft(largeStopwatch), 36000);
        });
    });
});
