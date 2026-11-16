/**
 * In-memory Mock implementation of localStorage for deterministic Node.js tests.
 */
export function createMockLocalStorage(initialStore = {}) {
  let store = { ...initialStore };
  const calls = {
    getItem: [],
    setItem: [],
    removeItem: [],
    clear: 0
  };

  return {
    getItem: (key) => {
      calls.getItem.push(key);
      return Object.prototype.hasOwnProperty.call(store, key) ? String(store[key]) : null;
    },
    setItem: (key, value) => {
      calls.setItem.push({ key, value: String(value) });
      store[key] = String(value);
    },
    removeItem: (key) => {
      calls.removeItem.push(key);
      delete store[key];
    },
    clear: () => {
      calls.clear++;
      store = {};
    },
    key: (index) => {
      return Object.keys(store)[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    },
    _getStore: () => ({ ...store }),
    _getCalls: () => ({ ...calls }),
    _reset: () => {
      store = {};
      calls.getItem = [];
      calls.setItem = [];
      calls.removeItem = [];
      calls.clear = 0;
    }
  };
}
