const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const exports = {};
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => mocks[name] ?? require(name),
    console,
    Error,
    Date,
    Math,
    String,
    Number,
  });
  return exports;
}

const loadErrors = () =>
  load('services/sync-errors.ts', { axios: { isAxiosError: (e) => Boolean(e && e.isAxiosError) } });

const loadMasterCache = () => load('services/master-cache.ts');

const httpError = (status, message = 'boom') => ({
  isAxiosError: true,
  message,
  response: { status, data: { error: message } },
});

// ── Error classification ─────────────────────────────────────────────

test('a validation failure dies immediately instead of burning five retries', () => {
  const { classify } = loadErrors();
  const result = classify(httpError(400, 'jumlah_janjang is required'), 0, 5);
  assert.equal(result.errorClass, 'VALIDATION');
  assert.equal(result.dead, true, 'retrying a rejected payload can never succeed');
});

test('an auth failure keeps the work and does not count as a lost attempt', () => {
  const { classify } = loadErrors();
  const result = classify(httpError(401), 0, 5);
  assert.equal(result.errorClass, 'AUTH');
  assert.equal(result.dead, false, 'a expired token must not throw away field work');
});

test('a conflict is routed to a person, never retried', () => {
  const { classify } = loadErrors();
  const result = classify(httpError(409, 'changed since you loaded it'), 0, 5);
  assert.equal(result.errorClass, 'CONFLICT');
  assert.equal(result.dead, true);
});

test('a network failure retries until the attempt budget runs out', () => {
  const { classify } = loadErrors();
  assert.equal(classify(new Error('Network Error'), 0, 5).dead, false);
  assert.equal(classify(new Error('Network Error'), 4, 5).dead, true, 'the last attempt dead-letters');
  assert.equal(classify(httpError(503), 0, 5).errorClass, 'RETRYABLE');
});

test('backoff grows and is capped at an hour', () => {
  const { backoffUntil } = loadErrors();
  const now = 1_000_000;
  assert.equal(backoffUntil(0, now) - now, 30_000);
  assert.equal(backoffUntil(1, now) - now, 60_000);
  assert.equal(backoffUntil(30, now) - now, 60 * 60 * 1000, 'a device must still catch up today');
});

test('only an auth failure stops the whole pass', () => {
  const { isBlocking } = loadErrors();
  assert.equal(isBlocking('AUTH'), true);
  for (const other of ['RETRYABLE', 'VALIDATION', 'CONFLICT', 'UNSUPPORTED']) {
    assert.equal(isBlocking(other), false, `${other} must not stall the rest of the queue`);
  }
});

// ── Incremental pull ─────────────────────────────────────────────────

function deltaDeps(pages) {
  const state = { invalidated: [], cursor: undefined, calls: [] };
  return {
    state,
    deps: {
      fetchDelta: async (since) => {
        state.calls.push(since);
        return pages.shift() ?? { changed: {}, cursor: 'end', has_more: false };
      },
      readCursor: async () => state.cursor,
      saveCursor: async (_userId, cursor) => { state.cursor = cursor; },
      invalidateResource: async (_userId, resource) => { state.invalidated.push(resource); },
    },
  };
}

test('only the resources that actually changed are invalidated', async () => {
  const { pullMasterDelta } = loadMasterCache();
  const { state, deps } = deltaDeps([
    { changed: { blok: [{ id: 'b1' }], lahan: [] }, cursor: 'c1', has_more: false },
  ]);

  await pullMasterDelta('user-1', deps);
  assert.deepEqual(state.invalidated, ['blok'], 'an empty list is not a change');
  assert.equal(state.cursor, 'c1');
});

test('an unchanged pull invalidates nothing but still advances the cursor', async () => {
  const { pullMasterDelta } = loadMasterCache();
  const { state, deps } = deltaDeps([{ changed: {}, cursor: 'c2', has_more: false }]);

  await pullMasterDelta('user-1', deps);
  assert.deepEqual(state.invalidated, []);
  assert.equal(state.cursor, 'c2');
});

test('paging follows has_more and passes the cursor back each time', async () => {
  const { pullMasterDelta } = loadMasterCache();
  const { state, deps } = deltaDeps([
    { changed: { tph: [{ id: 't1' }] }, cursor: 'c1', has_more: true },
    { changed: { pekerja: [{ id: 'p1' }] }, cursor: 'c2', has_more: false },
  ]);

  await pullMasterDelta('user-1', deps);
  assert.deepEqual(state.calls, [undefined, 'c1'], 'the second page resumes from the first cursor');
  assert.deepEqual(state.invalidated.sort(), ['pekerja', 'tph']);
  assert.equal(state.cursor, 'c2');
});

test('a server that never clears has_more cannot spin forever', async () => {
  const { pullMasterDelta } = loadMasterCache();
  const pages = Array.from({ length: 100 }, (_, i) => ({
    changed: {},
    cursor: `c${i}`,
    has_more: true,
  }));
  const { state, deps } = deltaDeps(pages);

  await pullMasterDelta('user-1', deps);
  assert.ok(state.calls.length <= 20, `bounded paging, got ${state.calls.length} calls`);
});

// ── Open restan from delta sync ──────────────────────────────────────

function restanDeps(pages, stored = null, cursor = 'old') {
  const state = { cursor, restan: stored, calls: [] };
  return {
    state,
    deps: {
      fetchDelta: async (since) => { state.calls.push(since); return pages.shift() ?? { changed: {}, cursor: 'end', has_more: false }; },
      readCursor: async () => state.cursor,
      saveCursor: async (_userId, next) => { state.cursor = next; },
      invalidateResource: async () => {},
      readRestan: async () => state.restan,
      saveRestan: async (_userId, rows) => { state.restan = JSON.parse(JSON.stringify(rows)); },
    },
  };
}
const row = (id, extra = {}) => ({ id, tph_id: 'tph-1', tanggal: '2026-09-27T00:30:00.000Z', jumlah_janjang: 40, sudah_dikirim: false, ...extra });
const ids = (rows) => rows.map((r) => r.id).sort();

test('open restan from the first pull are cached, and a device with an old cursor pulls from the start once', async () => {
  const { pullMasterDelta } = loadMasterCache();
  const { state, deps } = restanDeps([{ changed: { restan: [row('r1'), row('r2')] }, cursor: 'c1', has_more: false }]);
  await pullMasterDelta('user-1', deps);
  assert.deepEqual(state.calls, [undefined], 'the stored cursor is ignored while no restan list exists');
  assert.deepEqual(ids(state.restan), ['r1', 'r2']);
  assert.equal(state.cursor, 'c1');

  // From then on the cursor is used again.
  const next = restanDeps([], state.restan, 'c1');
  await pullMasterDelta('user-1', next.deps);
  assert.deepEqual(next.state.calls, ['c1']);
});

test('a restan collected by a dispatched trip leaves the cache, including across pages', async () => {
  const { pullMasterDelta } = loadMasterCache();
  const { state, deps } = restanDeps([
    { changed: { restan: [row('r3')] }, removed: { restan: ['r1'] }, cursor: 'c2', has_more: true },
    { changed: {}, removed: { restan: ['r2', 'never-cached'] }, cursor: 'c3', has_more: false },
  ], [row('r1'), row('r2')]);
  await pullMasterDelta('user-1', deps);
  assert.deepEqual(ids(state.restan), ['r3']);
});

test('a partial pickup swaps the shrunk row for its leftover, which keeps the original harvest day', async () => {
  const { pullMasterDelta } = loadMasterCache();
  const { state, deps } = restanDeps([{
    changed: { restan: [row('leftover', { jumlah_janjang: 25 })] }, removed: { restan: ['r1'] }, cursor: 'c2', has_more: false,
  }], [row('r1', { jumlah_janjang: 40 })]);
  await pullMasterDelta('user-1', deps);
  assert.deepEqual(ids(state.restan), ['leftover']);
  assert.equal(state.restan[0].jumlah_janjang, 25);
  assert.equal(state.restan[0].tanggal, '2026-09-27T00:30:00.000Z');
});

test('a withdrawn trip re-opens its restan, which arrives again as changed', async () => {
  const { pullMasterDelta } = loadMasterCache();
  const { state, deps } = restanDeps([{ changed: { restan: [row('r1')] }, cursor: 'c2', has_more: false }], []);
  await pullMasterDelta('user-1', deps);
  assert.deepEqual(ids(state.restan), ['r1']);
});

test('a failed pull leaves both the restan list and the cursor as they were', async () => {
  const { pullMasterDelta } = loadMasterCache();
  const { state, deps } = restanDeps([], [row('r1')]);
  deps.fetchDelta = async () => { throw new Error('Network Error'); };
  await assert.rejects(pullMasterDelta('user-1', deps), /Network/);
  assert.deepEqual(ids(state.restan), ['r1']);
  assert.equal(state.cursor, 'old');
});

test('a caller without the restan grant still gets an empty list, so it is not pulled from scratch every time', async () => {
  const { pullMasterDelta } = loadMasterCache();
  const { state, deps } = restanDeps([{ changed: {}, cursor: 'c1', has_more: false, skipped: ['restan'] }]);
  await pullMasterDelta('user-1', deps);
  assert.deepEqual(state.restan, []);
});
