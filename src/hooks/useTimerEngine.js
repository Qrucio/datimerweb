import { useState, useEffect, useRef, useCallback } from 'react';
import { Storage } from '../utils/storage';

export function useTimerEngine({
  initialState,
  settings,
  getStrictMode,
  syncTimerState,
  setStats,
  playAlarm,
}) {
  const [mode, setMode] = useState(initialState?.mode || 'focus');
  const [timeLeft, setTimeLeft] = useState(initialState?.timeLeft ?? (settings.focus * 60));
  const [isActive, setIsActive] = useState(initialState?.isActive || false);
  const [timerResetKey, setTimerResetKey] = useState(0);
  const [pomoCount, setPomoCount] = useState(initialState?.pomoCount || 0);
  const [hasStartedSession, setHasStartedSession] = useState(false);
  const [currentSessionTotalDuration, setCurrentSessionTotalDuration] = useState(null);

  const timerIntervalRef = useRef(null);
  const lastTickRef = useRef(null);
  const endTimeRef = useRef(null);
  const unsavedSecondsRef = useRef(0);
  const accumulatedTimeRef = useRef(0);
  const skipStatsRef = useRef(false);
  const lastHeartbeatRef = useRef(Date.now());
  const isInitialMount = useRef(true);
  const prevDurationRef = useRef(settings[mode] * 60);

  const flushUnsavedTime = useCallback(() => {
    unsavedSecondsRef.current = 0;
  }, []);

  useEffect(() => { 
    if (isInitialMount.current) { 
      isInitialMount.current = false; 
      return; 
    } 
    const newDuration = settings[mode] * 60; 
    if (!isActive) { 
      if (timeLeft === prevDurationRef.current) { 
        setTimeLeft(newDuration); 
      } 
    } 
    prevDurationRef.current = newDuration; 
  }, [mode, settings, isActive, timeLeft]);

  useEffect(() => {
    if (isActive && endTimeRef.current) {
      localStorage.setItem('zen_timer_state', JSON.stringify({
        mode,
        isActive: true,
        targetEndTime: endTimeRef.current,
        timestamp: Date.now(),
        skipStats: skipStatsRef.current,
        pomoCount
      }));
    }
  }, [isActive, mode, pomoCount]); 

  useEffect(() => {
    if (!isActive) {
      localStorage.setItem('zen_timer_state', JSON.stringify({
        mode,
        isActive: false,
        timeLeft,
        timestamp: Date.now(),
        skipStats: skipStatsRef.current,
        pomoCount
      }));
    }
  }, [isActive, mode, timeLeft, pomoCount]);

  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    if (isActive) {
      lastTickRef.current = Date.now();
      if (!endTimeRef.current) {
        endTimeRef.current = mode === 'stopwatch' 
          ? Date.now() - timeLeft * 1000 
          : Date.now() + timeLeft * 1000;
      }

      // Update UI and stats once every 1000ms
      timerIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const delta = now - lastTickRef.current;

        const diff = mode === 'stopwatch' 
          ? now - endTimeRef.current 
          : endTimeRef.current - now;
        const secondsRemaining = Math.max(0, Math.ceil(diff / 1000));

        setTimeLeft(prev => {
          if (prev !== secondsRemaining) return secondsRemaining;
          return prev;
        });

        if (delta >= 1000) {
          const secondsPassed = Math.floor(delta / 1000);
          lastTickRef.current += (secondsPassed * 1000);
          const updatedStats = Storage.updateLocalStats(secondsPassed, mode);
          unsavedSecondsRef.current += secondsPassed;
          setStats(prev => ({
            ...prev,
            dailyFocusTime: updatedStats.dailyFocusTime,
            dailyBreakTime: updatedStats.dailyBreakTime
          }));
        }

        if (secondsRemaining <= 0 && mode !== 'stopwatch') {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          if (mode === 'focus') {
            const updatedStats = Storage.incrementSessionCount();
            setStats(updatedStats);
          }
          flushUnsavedTime();
          playAlarm(mode);

          let nextMode = mode;
          let nextTimeLeft = 0;
          let nextIsActive = false;

          if (mode === 'focus') {
            setStats(prev => ({ ...prev, dailySessions: prev.dailySessions + 1 }));
            if (getStrictMode()) document.exitFullscreen().catch(() => { });

            let intendedNextMode = 'shortBreak';
            let intendedTimeLeft = (Number(settings.shortBreak) || 5) * 60;

            if (pomoCount + 1 >= (Number(settings.pomosBeforeLongBreak) || 4)) {
              intendedNextMode = 'longBreak';
              intendedTimeLeft = (Number(settings.longBreak) || 15) * 60;
            }

            nextMode = intendedNextMode;
            nextTimeLeft = intendedTimeLeft;
            if (settings.autoStartBreaks) nextIsActive = true;

          } else if (mode === 'shortBreak') {
            const nextCount = pomoCount + 1;
            setPomoCount(nextCount);
            nextMode = 'focus';
            if (getStrictMode()) document.documentElement.requestFullscreen().catch(() => { });
            nextTimeLeft = (Number(settings.focus) || 25) * 60;
            if (settings.autoStartWork) nextIsActive = true;

            setMode(nextMode);
            setTimeLeft(nextTimeLeft);
            setIsActive(nextIsActive);
            endTimeRef.current = nextIsActive ? Date.now() + (nextTimeLeft * 1000) : null;

            syncTimerState({
              pomoCount: nextCount,
              isActive: nextIsActive,
              targetEndTime: nextIsActive ? Date.now() + (nextTimeLeft * 1000) : null,
              mode: nextMode,
              timeLeft: nextTimeLeft,
              lastUpdated: Date.now()
            });
            setTimerResetKey(prev => prev + 1);
            return;

          } else if (mode === 'longBreak') {
            setPomoCount(0);
            nextMode = 'focus';
            if (getStrictMode()) document.documentElement.requestFullscreen().catch(() => { });
            nextTimeLeft = (Number(settings.focus) || 25) * 60;
            if (settings.autoStartWork) nextIsActive = true;

            setMode(nextMode);
            setTimeLeft(nextTimeLeft);
            setIsActive(nextIsActive);
            endTimeRef.current = nextIsActive ? Date.now() + (nextTimeLeft * 1000) : null;

            syncTimerState({
              pomoCount: 0,
              isActive: nextIsActive,
              targetEndTime: nextIsActive ? Date.now() + (nextTimeLeft * 1000) : null,
              mode: nextMode,
              timeLeft: nextTimeLeft,
              lastUpdated: Date.now()
            });
            setTimerResetKey(prev => prev + 1);
            return;
          }

          setMode(nextMode);
          setTimeLeft(nextTimeLeft);
          setIsActive(nextIsActive);

          let nextTarget = nextIsActive ? Date.now() + (nextTimeLeft * 1000) : null;
          endTimeRef.current = nextTarget;

          syncTimerState({
            isActive: nextIsActive,
            targetEndTime: nextTarget,
            mode: nextMode,
            timeLeft: nextTimeLeft,
            lastUpdated: Date.now()
          });

          setTimerResetKey(prev => prev + 1);
        }
      }, 1000); 
    } else {
      endTimeRef.current = null;
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isActive, mode, settings, pomoCount, getStrictMode, timerResetKey, playAlarm, setStats, flushUnsavedTime, syncTimerState]);

  const toggleTimer = useCallback(() => {
    if (isActive) flushUnsavedTime();
    const newIsActive = !isActive;
    setIsActive(newIsActive);

    if (newIsActive) {
      lastHeartbeatRef.current = Date.now();
      setHasStartedSession(true);
    }

    let stateToSync = {
      isActive: newIsActive,
      mode,
      timeLeft,
      targetEndTime: newIsActive 
        ? (mode === 'stopwatch' ? Date.now() - timeLeft * 1000 : Date.now() + timeLeft * 1000) 
        : null
    };

    if (newIsActive) {
      endTimeRef.current = stateToSync.targetEndTime;
    }

    syncTimerState(stateToSync);
  }, [isActive, mode, timeLeft, flushUnsavedTime, syncTimerState]);

  const handleConfirmReset = useCallback(() => {
    unsavedSecondsRef.current = 0;
    accumulatedTimeRef.current = 0;

    setIsActive(false);
    const nextTime = mode === 'stopwatch' ? 0 : (settings[mode] || 25) * 60;
    setTimeLeft(nextTime);
    setPomoCount(0);
    endTimeRef.current = null;
    setHasStartedSession(false);
    setCurrentSessionTotalDuration(null);

    syncTimerState({
      isActive: false,
      targetEndTime: null,
      mode: mode,
      timeLeft: nextTime,
      lastUpdated: Date.now()
    });
  }, [mode, settings, syncTimerState]);

  const handleModeChange = useCallback((newMode) => {
    flushUnsavedTime();
    accumulatedTimeRef.current = 0;
    setMode(newMode);
    setIsActive(false);
    
    const newTimeLeft = newMode === 'stopwatch' ? 0 : settings[newMode] * 60;
    setTimeLeft(newTimeLeft);
    
    setHasStartedSession(false);
    setCurrentSessionTotalDuration(null);

    syncTimerState({
      isActive: false,
      targetEndTime: null,
      mode: newMode,
      timeLeft: newTimeLeft,
    });
  }, [settings, syncTimerState, flushUnsavedTime]);

  return {
    mode, setMode,
    timeLeft, setTimeLeft,
    isActive, setIsActive,
    pomoCount, setPomoCount,
    hasStartedSession, setHasStartedSession,
    currentSessionTotalDuration, setCurrentSessionTotalDuration,
    endTimeRef,
    toggleTimer,
    handleConfirmReset,
    handleModeChange,
    flushUnsavedTime
  };
}
