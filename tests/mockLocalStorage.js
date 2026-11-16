/**
 * In-memory Mock LocalStorage
 */
export class MockLocalStorage {
    constructor() {
        this.store = new Map();
    }

    getItem(key) {
        return this.store.has(key) ? this.store.get(key) : null;
    }

    setItem(key, value) {
        this.store.set(key, String(value));
    }

    removeItem(key) {
        this.store.delete(key);
    }

    clear() {
        this.store.clear();
    }

    get length() {
        return this.store.size;
    }

    key(index) {
        return Array.from(this.store.keys())[index] || null;
    }
}

export const mockLocalStorage = new MockLocalStorage();
