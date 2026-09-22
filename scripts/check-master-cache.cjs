const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadMasterCache() {
  const exports = {};
  const compiled = ts.transpileModule(fs.readFileSync('services/master-cache.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(compiled, { exports, require, console, Error, JSON, Object });
  return exports;
}

function store(initial = {}) {
  const rows = { ...initial };
  return {
    rows,
    save: async (key, payload) => {
      rows[key] = JSON.parse(JSON.stringify(payload));
    },
    read: async (key) => (key in rows ? rows[key] : null),
  };
}

const deps = (db, userId = 'user-1') => ({
  getUserId: () => userId,
  save: db.save,
  read: db.read,
});

const page = { data: [{ id: 'blok-1', nama: 'B20-JERAPAH' }], meta: { total: 1 } };

test('a successful fetch is returned and stored for later', async () => {
  const { readThroughCache, masterCacheKey } = loadMasterCache();
  const db = store();
  const result = await readThroughCache(deps(db), 'blok', { limit: 200 }, async () => page);
  assert.deepEqual(result, page);
  assert.deepEqual(db.rows[masterCacheKey('user-1', 'blok', { limit: 200 })], page);
});

test('a failed fetch falls back to the stored copy', async () => {
  const { readThroughCache, masterCacheKey } = loadMasterCache();
  const db = store({ [masterCacheKey('user-1', 'blok', { limit: 200 })]: page });
  const result = await readThroughCache(deps(db), 'blok', { limit: 200 }, async () => {
    throw new Error('Network request failed');
  });
  assert.deepEqual(result, page);
});

test('a failed fetch with nothing stored still throws', async () => {
  const { readThroughCache } = loadMasterCache();
  const db = store();
  await assert.rejects(
    readThroughCache(deps(db), 'blok', { limit: 200 }, async () => {
      throw new Error('Network request failed');
    }),
    /Network request failed/
  );
});

test('one user cannot read another user\'s cached master data', async () => {
  const { readThroughCache, masterCacheKey } = loadMasterCache();
  const db = store({ [masterCacheKey('user-1', 'blok', { limit: 200 })]: page });
  await assert.rejects(
    readThroughCache(deps(db, 'user-2'), 'blok', { limit: 200 }, async () => {
      throw new Error('Network request failed');
    }),
    /Network request failed/
  );
});

test('nothing is cached when no user is signed in', async () => {
  const { readThroughCache } = loadMasterCache();
  const db = store();
  const result = await readThroughCache(
    { getUserId: () => undefined, save: db.save, read: db.read },
    'blok',
    undefined,
    async () => page
  );
  assert.deepEqual(result, page);
  assert.deepEqual(Object.keys(db.rows), []);
});

test('a fresh fetch replaces a stale stored copy', async () => {
  const { readThroughCache, masterCacheKey } = loadMasterCache();
  const key = masterCacheKey('user-1', 'blok', { limit: 200 });
  const db = store({ [key]: { data: [{ id: 'blok-1', nama: 'OLD NAME' }], meta: { total: 1 } } });
  const result = await readThroughCache(deps(db), 'blok', { limit: 200 }, async () => page);
  assert.deepEqual(result, page);
  assert.deepEqual(db.rows[key], page);
});

test('a different page size does not reuse another page size\'s cache', async () => {
  const { readThroughCache, masterCacheKey } = loadMasterCache();
  const db = store({ [masterCacheKey('user-1', 'blok', { limit: 50 })]: page });
  await assert.rejects(
    readThroughCache(deps(db), 'blok', { limit: 200 }, async () => {
      throw new Error('Network request failed');
    }),
    /Network request failed/
  );
});

test('cache keys ignore parameter order and undefined values', async () => {
  const { masterCacheKey } = loadMasterCache();
  assert.equal(
    masterCacheKey('user-1', 'tph', { limit: 200, page: 1 }),
    masterCacheKey('user-1', 'tph', { page: 1, limit: 200 })
  );
  assert.equal(
    masterCacheKey('user-1', 'tph', { limit: 200, search: undefined }),
    masterCacheKey('user-1', 'tph', { limit: 200 })
  );
});

test('each resource is cached separately', async () => {
  const { masterCacheKey } = loadMasterCache();
  assert.notEqual(
    masterCacheKey('user-1', 'blok', { limit: 200 }),
    masterCacheKey('user-1', 'tph', { limit: 200 })
  );
});
