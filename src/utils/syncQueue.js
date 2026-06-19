/**
 * Sync Queue Engine
 * 
 * Queues mutations made while offline (or between sync intervals) and
 * processes them when connectivity is restored.
 * 
 * Queue entries are deduplicated by `type` — if the same type is enqueued
 * again, the existing entry's timestamp and payload are updated in-place
 * rather than creating a duplicate.
 * 
 * Structure: Array<{ type: string, timestamp: number, payload?: any }>
 */

const QUEUE_KEY = 'zen_sync_queue';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function readQueue() {
    try {
        return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
        return [];
    }
}

function writeQueue(queue) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Add an item to the sync queue.
 * If an entry with the same `type` already exists, its timestamp and payload
 * are updated (deduplication) instead of pushing a new entry.
 *
 * @param {string}  type    - Identifier for the sync action (e.g. 'stats', 'settings').
 * @param {any}    [payload] - Optional data to attach.
 */
export function enqueueSync(type, payload) {
    const queue = readQueue();
    const idx = queue.findIndex((item) => item.type === type);

    if (idx !== -1) {
        // Deduplicate: update existing entry
        queue[idx].timestamp = Date.now();
        queue[idx].payload = payload;
    } else {
        queue.push({ type, timestamp: Date.now(), payload });
    }

    writeQueue(queue);
}

/**
 * Return the current queue (read-only snapshot).
 *
 * @returns {Array<{ type: string, timestamp: number, payload?: any }>}
 */
export function getQueue() {
    return readQueue();
}

/**
 * Remove a single item from the queue after it has been successfully synced.
 *
 * @param {string} type - The type identifier to remove.
 */
export function clearQueueItem(type) {
    const queue = readQueue().filter((item) => item.type !== type);
    writeQueue(queue);
}

/**
 * Process every queued item by calling the matching handler from `processors`.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @param {Record<string, (supabaseClient: any, payload: any) => Promise<void>>} processors
 *        A map of `type` -> async handler. Each handler receives the supabase
 *        client and the queued payload. If a handler throws due to a network
 *        error or a 401, the item stays in the queue for the next attempt.
 * @returns {Promise<{ processed: string[], failed: string[] }>}
 */
export async function processQueue(supabaseClient, processors = {}) {
    const queue = readQueue();
    if (queue.length === 0) return { processed: [], failed: [] };

    const processed = [];
    const failed = [];

    for (const item of queue) {
        const handler = processors[item.type];
        if (!handler) {
            // No handler registered for this type — skip but keep in queue
            failed.push(item.type);
            continue;
        }

        try {
            await handler(supabaseClient, item.payload);
            // Success — remove from queue
            clearQueueItem(item.type);
            processed.push(item.type);
        } catch (err) {
            // Keep in queue on network / auth errors so we retry next cycle
            const isRetryable =
                !navigator.onLine ||
                (err?.status === 401) ||
                (err?.message?.toLowerCase().includes('network')) ||
                (err?.message?.toLowerCase().includes('fetch'));

            if (isRetryable) {
                console.warn(`[SyncQueue] Retryable error for "${item.type}", keeping in queue:`, err?.message);
            } else {
                console.error(`[SyncQueue] Non-retryable error for "${item.type}", keeping in queue:`, err);
            }
            failed.push(item.type);
        }
    }

    return { processed, failed };
}
