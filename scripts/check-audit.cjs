const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const exports = {};
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(compiled, { exports, require: (name) => mocks[name] ?? require(name), console, Date });
  return exports;
}
test('estate dates cross midnight at WIB, including month/year boundaries', () => {
  const { estateDate } = load('utils/estateDate.ts');
  assert.equal(estateDate(new Date('2026-09-14T16:59:59Z')), '2026-09-14');
  assert.equal(estateDate(new Date('2026-09-14T17:00:00Z')), '2026-09-15');
  assert.equal(estateDate(new Date('2026-12-31T17:00:00Z')), '2027-01-01');
});
test('queue waits for storage, propagates failure, and retains exhausted records on reload', async () => {
  let finish;
  const db = { add: () => new Promise((resolve) => { finish = resolve; }), getAll: async () => [{ id: 'failed', retryCount: 5 }] };
  const { useSyncQueueStore: store } = load('stores/useSyncQueueStore.ts', { '@/services/database': { syncQueueDb: db } });
  const item = { module: 'bkm_checker', action: 'CREATE', endpoint: '/bkmChecker', payload: {} };
  const saving = store.getState().addToQueue(item);
  assert.equal(store.getState().queue.length, 0);
  finish();
  await saving;
  assert.equal(store.getState().queue.length, 1);
  db.add = async () => { throw new Error('disk full'); };
  await assert.rejects(store.getState().addToQueue(item), /disk full/);
  assert.equal(store.getState().queue.length, 1);
  await store.getState().loadQueue();
  assert.equal(store.getState().queue[0].id, 'failed');
  assert.equal(store.getState().pendingCount(), 1);
});
