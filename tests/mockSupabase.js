/**
 * In-memory Mock Supabase Client for Testing Coworking Rooms
 */

export class MockSupabaseClient {
    constructor() {
        this.reset();
    }

    reset() {
        this.channels = new Map();
        this.removeChannelCalls = [];
        this.rpcHandlers = new Map();
        this.tables = {
            rooms: [],
            profiles: []
        };
        this.queryLog = [];
        this.rpcLog = [];
        this.channelLog = [];
        this.broadcastLog = [];
        this.queryMocks = [];
        this.rpcMocks = [];
        this.nextChannelStatus = 'SUBSCRIBED';
        this.channelSendError = null;
    }

    // Configure next channel subscription status ('SUBSCRIBED', 'CHANNEL_ERROR', 'TIMED_OUT')
    setChannelBehavior({ status = 'SUBSCRIBED', sendError = null } = {}) {
        this.nextChannelStatus = status;
        this.channelSendError = sendError;
    }

    mockRpc(fnName, handlerOrResult) {
        this.rpcMocks.push({ fnName, handlerOrResult });
    }

    mockQuery(matcher, result) {
        this.queryMocks.push({ matcher, result });
    }

    rpc(fnName, params) {
        this.rpcLog.push({ fnName, params });

        // Check if there's a mock registered for this RPC
        const mock = this.rpcMocks.find(m => m.fnName === fnName);
        if (mock) {
            if (typeof mock.handlerOrResult === 'function') {
                return Promise.resolve(mock.handlerOrResult(params));
            }
            return Promise.resolve(mock.handlerOrResult);
        }

        // Default RPC implementations
        if (fnName === 'get_server_time') {
            return Promise.resolve({ data: Date.now(), error: null });
        }
        if (fnName === 'mutate_room_state') {
            return Promise.resolve({ data: null, error: null });
        }

        return Promise.resolve({ data: null, error: null });
    }

    channel(name) {
        const self = this;
        this.channelLog.push({ name, action: 'channel_created' });

        const listeners = [];
        const channelObj = {
            name,
            subscribe: (callback) => {
                const status = self.nextChannelStatus;
                setTimeout(() => {
                    callback(status);
                }, 5);
                return channelObj;
            },
            send: async (msg) => {
                self.broadcastLog.push({ channel: name, msg });
                if (self.channelSendError) {
                    throw self.channelSendError;
                }
                return 'ok';
            },
            on: (event, filter, callback) => {
                listeners.push({ event, filter, callback });
                return channelObj;
            },
            // Test trigger helper
            __trigger: (type, payload) => {
                for (const l of listeners) {
                    if (l.event === type || l.event === payload?.eventType) {
                        l.callback(payload);
                    }
                }
            }
        };

        this.channels.set(name, channelObj);
        return channelObj;
    }

    removeChannel(channel) {
        this.removeChannelCalls.push(channel?.name || channel);
        if (channel?.name) {
            this.channels.delete(channel.name);
        }
        return Promise.resolve();
    }

    from(tableName) {
        const self = this;
        const currentQuery = {
            table: tableName,
            action: null,
            payload: null,
            filters: [],
            order: null,
            limitVal: null,
            isSingle: false,
            selectFields: null
        };

        const builder = {
            select: (fields = '*') => {
                currentQuery.action = currentQuery.action || 'select';
                currentQuery.selectFields = fields;
                return builder;
            },
            insert: (payload) => {
                currentQuery.action = 'insert';
                currentQuery.payload = payload;
                return builder;
            },
            update: (payload) => {
                currentQuery.action = 'update';
                currentQuery.payload = payload;
                return builder;
            },
            delete: () => {
                currentQuery.action = 'delete';
                return builder;
            },
            eq: (col, val) => {
                currentQuery.filters.push({ op: 'eq', col, val });
                return builder;
            },
            neq: (col, val) => {
                currentQuery.filters.push({ op: 'neq', col, val });
                return builder;
            },
            order: (col, options) => {
                currentQuery.order = { col, options };
                return builder;
            },
            limit: (n) => {
                currentQuery.limitVal = n;
                return builder;
            },
            single: () => {
                currentQuery.isSingle = true;
                return execute();
            },
            then: (onFulfilled, onRejected) => {
                return execute().then(onFulfilled, onRejected);
            },
            catch: (onRejected) => {
                return execute().catch(onRejected);
            }
        };

        const execute = () => {
            self.queryLog.push(JSON.parse(JSON.stringify(currentQuery)));

            // 1. Check custom query mocks
            for (let i = self.queryMocks.length - 1; i >= 0; i--) {
                const { matcher, result } = self.queryMocks[i];
                if (typeof matcher === 'function' && matcher(currentQuery)) {
                    return Promise.resolve(typeof result === 'function' ? result(currentQuery) : result);
                }
                if (typeof matcher === 'object') {
                    const match = Object.entries(matcher).every(([k, v]) => currentQuery[k] === v);
                    if (match) {
                        return Promise.resolve(typeof result === 'function' ? result(currentQuery) : result);
                    }
                }
            }

            // 2. Default table in-memory simulation
            const rows = self.tables[tableName] || [];

            if (currentQuery.action === 'select') {
                let filtered = [...rows];
                for (const f of currentQuery.filters) {
                    if (f.op === 'eq') {
                        filtered = filtered.filter(r => r[f.col] === f.val);
                    } else if (f.op === 'neq') {
                        filtered = filtered.filter(r => r[f.col] !== f.val);
                    }
                }
                if (currentQuery.limitVal) {
                    filtered = filtered.slice(0, currentQuery.limitVal);
                }
                if (currentQuery.isSingle) {
                    if (filtered.length === 0) {
                        return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'The result contains 0 rows' } });
                    }
                    return Promise.resolve({ data: filtered[0], error: null });
                }
                return Promise.resolve({ data: filtered, error: null });
            }

            if (currentQuery.action === 'insert') {
                const newRow = {
                    id: currentQuery.payload.id || `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    created_at: new Date().toISOString(),
                    ...currentQuery.payload
                };
                rows.push(newRow);
                if (currentQuery.isSingle) {
                    return Promise.resolve({ data: newRow, error: null });
                }
                return Promise.resolve({ data: [newRow], error: null });
            }

            if (currentQuery.action === 'update') {
                let updatedCount = 0;
                let updatedRows = [];
                for (const r of rows) {
                    const matches = currentQuery.filters.every(f => {
                        if (f.op === 'eq') return r[f.col] === f.val;
                        if (f.op === 'neq') return r[f.col] !== f.val;
                        return true;
                    });
                    if (matches) {
                        Object.assign(r, currentQuery.payload);
                        updatedRows.push(r);
                        updatedCount++;
                    }
                }
                return Promise.resolve({ data: updatedRows, error: null });
            }

            if (currentQuery.action === 'delete') {
                let deletedCount = 0;
                for (let i = rows.length - 1; i >= 0; i--) {
                    const r = rows[i];
                    const matches = currentQuery.filters.every(f => {
                        if (f.op === 'eq') return r[f.col] === f.val;
                        if (f.op === 'neq') return r[f.col] !== f.val;
                        return true;
                    });
                    if (matches) {
                        rows.splice(i, 1);
                        deletedCount++;
                    }
                }
                return Promise.resolve({ data: null, error: null });
            }

            return Promise.resolve({ data: null, error: null });
        };

        return builder;
    }
}

export const mockSupabase = new MockSupabaseClient();
