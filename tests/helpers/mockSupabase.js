/**
 * Comprehensive Mock Supabase client for unit testing.
 * Provides query chaining (.from().select().eq().maybeSingle(), etc.),
 * error injection, and call tracking.
 */
export function createMockSupabase(overrides = {}) {
  const queryLogs = [];
  const rpcLogs = [];
  const authLogs = [];

  // Configurable handlers: table -> operation ('select'|'update'|'insert'|'upsert') -> response
  const handlers = {
    tables: {},
    rpc: {},
    auth: {},
    ...overrides
  };

  class QueryBuilder {
    constructor(tableName) {
      this.tableName = tableName;
      this.currentOp = 'select';
      this.opPayload = null;
      this.opOptions = null;
      this.selectColumns = '*';
      this.filters = [];
      this.orFilters = [];
      this.isSingle = false;
      this.isMaybeSingle = false;
    }

    select(columns = '*') {
      this.selectColumns = columns;
      return this;
    }

    insert(payload, options) {
      this.currentOp = 'insert';
      this.opPayload = payload;
      this.opOptions = options;
      return this;
    }

    update(payload, options) {
      this.currentOp = 'update';
      this.opPayload = payload;
      this.opOptions = options;
      return this;
    }

    upsert(payload, options) {
      this.currentOp = 'upsert';
      this.opPayload = payload;
      this.opOptions = options;
      return this;
    }

    eq(column, value) {
      this.filters.push({ type: 'eq', column, value });
      return this;
    }

    or(filterString) {
      this.orFilters.push(filterString);
      return this;
    }

    single() {
      this.isSingle = true;
      return this._execute();
    }

    maybeSingle() {
      this.isMaybeSingle = true;
      return this._execute();
    }

    then(resolve, reject) {
      return this._execute().then(resolve, reject);
    }

    async _execute() {
      const queryEntry = {
        table: this.tableName,
        op: this.currentOp,
        payload: this.opPayload,
        options: this.opOptions,
        select: this.selectColumns,
        filters: this.filters,
        orFilters: this.orFilters,
        isSingle: this.isSingle,
        isMaybeSingle: this.isMaybeSingle
      };
      queryLogs.push(queryEntry);

      // Check for table handler
      const tableConfig = handlers.tables[this.tableName];
      if (typeof tableConfig === 'function') {
        return tableConfig(queryEntry);
      }

      const opHandler = tableConfig?.[this.currentOp];
      if (typeof opHandler === 'function') {
        return opHandler(queryEntry);
      } else if (opHandler !== undefined) {
        return opHandler;
      }

      // Default responses
      if (this.currentOp === 'update') {
        return { data: [{ id: 'default_id' }], error: null };
      }
      if (this.currentOp === 'insert') {
        return { data: null, error: null };
      }
      if (this.currentOp === 'upsert') {
        return { data: null, error: null };
      }

      // Default select
      if (this.isSingle) {
        return { data: { id: 'default_id' }, error: null };
      }
      if (this.isMaybeSingle) {
        return { data: null, error: null };
      }
      return { data: [], error: null };
    }
  }

  const client = {
    from: (tableName) => new QueryBuilder(tableName),

    rpc: async (fnName, params) => {
      rpcLogs.push({ fnName, params });
      if (typeof handlers.rpc[fnName] === 'function') {
        return handlers.rpc[fnName](params);
      }
      if (handlers.rpc[fnName] !== undefined) {
        return handlers.rpc[fnName];
      }
      return { data: null, error: null };
    },

    auth: {
      getSession: async () => {
        authLogs.push({ method: 'getSession' });
        if (handlers.auth.getSession) return handlers.auth.getSession();
        return { data: { session: null }, error: null };
      },
      getUser: async () => {
        authLogs.push({ method: 'getUser' });
        if (handlers.auth.getUser) return handlers.auth.getUser();
        return { data: { user: null }, error: null };
      },
      onAuthStateChange: (_callback) => {
        authLogs.push({ method: 'onAuthStateChange' });
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signInWithOAuth: async (options) => {
        authLogs.push({ method: 'signInWithOAuth', options });
        if (handlers.auth.signInWithOAuth) return handlers.auth.signInWithOAuth(options);
        return { data: {}, error: null };
      },
      signInAnonymously: async () => {
        authLogs.push({ method: 'signInAnonymously' });
        if (handlers.auth.signInAnonymously) return handlers.auth.signInAnonymously();
        return { data: { user: { id: 'anon_1', is_anonymous: true } }, error: null };
      },
      signInWithPassword: async (credentials) => {
        authLogs.push({ method: 'signInWithPassword', credentials });
        if (handlers.auth.signInWithPassword) return handlers.auth.signInWithPassword(credentials);
        return { data: { user: { id: 'user_1' } }, error: null };
      },
      signUp: async (options) => {
        authLogs.push({ method: 'signUp', options });
        if (handlers.auth.signUp) return handlers.auth.signUp(options);
        return { data: { user: { id: 'user_new' } }, error: null };
      },
      signOut: async () => {
        authLogs.push({ method: 'signOut' });
        if (handlers.auth.signOut) return handlers.auth.signOut();
        return { error: null };
      }
    },

    channel: () => ({
      on: function() { return this; },
      subscribe: function() { return this; }
    }),
    removeChannel: () => {},

    _setTableHandler: (tableName, opOrFn, handler) => {
      if (!handlers.tables[tableName]) handlers.tables[tableName] = {};
      if (typeof opOrFn === 'function') {
        handlers.tables[tableName] = opOrFn;
      } else {
        handlers.tables[tableName][opOrFn] = handler;
      }
    },

    _setRpcHandler: (fnName, handler) => {
      handlers.rpc[fnName] = handler;
    },

    _setAuthHandler: (method, handler) => {
      handlers.auth[method] = handler;
    },

    _getQueryLogs: () => [...queryLogs],
    _getRpcLogs: () => [...rpcLogs],
    _getAuthLogs: () => [...authLogs],
    _clearLogs: () => {
      queryLogs.length = 0;
      rpcLogs.length = 0;
      authLogs.length = 0;
    }
  };

  return client;
}
