import { useSyncExternalStore } from 'react';

const createStore = (initialState) => {
  let state = initialState;
  const listeners = new Set();
  
  return {
    getState: () => state,
    setState: (newState) => {
      if (typeof newState === 'function') {
        state = { ...state, ...newState(state) };
      } else {
        state = { ...state, ...newState };
      }
      listeners.forEach(listener => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
};

export const timerStore = createStore({
  timeLeft: 25 * 60,
  isActive: false,
  mode: 'focus',
});

// A custom hook to use the store in React components safely
export const useTimerStore = (selector = state => state) => {
  const slice = useSyncExternalStore(
    timerStore.subscribe, 
    () => selector(timerStore.getState())
  );
  return slice;
};
