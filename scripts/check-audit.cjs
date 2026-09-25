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
function queueStore(db, userId = 'user-1') {
  return load('stores/useSyncQueueStore.ts', {
    '@/utils/sync-support': load('utils/sync-support.ts'),
    '@/services/database': { syncQueueDb: db },
    '@/services/device': { getDeviceId: async () => 'device-1' },
    '@/stores/useAuthStore': {
      useAuthStore: {
        getState: () => ({ user: userId ? { id: userId } : null }),
        // The queue drops its in-memory rows on sign-out through this.
        subscribe: () => () => {},
      },
    },
  });
}

test('queue waits for storage, propagates failure, and retains exhausted records on reload', async () => {
  let finish;
  const db = {
    add: () => new Promise((resolve) => { finish = resolve; }),
    getAll: async () => [{ id: 'failed', retryCount: 5, status: 'PENDING' }],
  };
  const { useSyncQueueStore: store } = queueStore(db);
  const item = { module: 'bkm_checker', action: 'CREATE', endpoint: '/bkmChecker', payload: {} };
  const saving = store.getState().addToQueue(item);
  // Resolving the owner is itself async now, so let it reach the storage call.
  while (!finish) await new Promise((resolve) => setImmediate(resolve));
  assert.equal(store.getState().queue.length, 0, 'nothing is queued until storage confirms');
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

test('unsupported attendance and planning work never reaches SQLite', async () => {
  const saved = [];
  const { useSyncQueueStore: store } = queueStore({ add: async (item) => saved.push(item) });
  for (const module of ['absensi', 'attendance', 'planning']) {
    await assert.rejects(store.getState().addToQueue({ module, action: 'CREATE', endpoint: `/${module}`, payload: {} }), /belum didukung/);
  }
  await assert.rejects(store.getState().addToQueue({ module: 'krani_timbang', action: 'CREATE', endpoint: '/kraniTimbang', payload: {} }), /belum didukung/);
  assert.equal(saved.length, 0);
  for (const [module, action] of [
    ['bkm_panen', 'CREATE'], ['bkm_checker', 'CREATE'], ['bkm_rawat', 'CREATE'],
    ['bkm_rawat_detail', 'CREATE'], ['bkm_checker_detail', 'UPDATE'],
    ['krani_timbang_detail', 'UPDATE'], ['krani_timbang', 'UPDATE'],
  ]) {
    const payload = module.endsWith('_detail') ? { documentId: 'doc', expectedStatus: 'DRAFT' } : {};
    await store.getState().addToQueue({ module, action, endpoint: `/${module}`, payload });
  }
  assert.equal(saved.length, 7);
});

test('queued work is scoped to the signed-in user on a shared handset', async () => {
  const added = [];
  const rows = {
    'user-a': [{ id: 'a1', retryCount: 0, status: 'PENDING' }],
    'user-b': [],
  };
  const db = {
    add: async (item) => { added.push(item); },
    getAll: async (owner) => rows[owner.userId] ?? [],
  };

  const { useSyncQueueStore: asA } = queueStore(db, 'user-a');
  await asA.getState().addToQueue({ module: 'bkm_panen', action: 'CREATE', endpoint: '/bkmPanen', payload: {} });
  assert.equal(added[0].owner.userId, 'user-a');
  assert.equal(added[0].owner.deviceId, 'device-1');

  // The next worker signs in on the same handset. The first worker's unsent
  // item is still on disk, and must be invisible and unsendable here.
  const { useSyncQueueStore: asB } = queueStore(db, 'user-b');
  await asB.getState().loadQueue();
  assert.equal(asB.getState().queue.length, 0, "another user's work must never load");
});

test('a signed-out app has no queue and refuses to take new work', async () => {
  const db = { add: async () => {}, getAll: async () => { throw new Error('must not be read'); } };
  const { useSyncQueueStore: store } = queueStore(db, null);
  await store.getState().loadQueue();
  assert.equal(store.getState().queue.length, 0);
  await assert.rejects(
    store.getState().addToQueue({ module: 'bkm_panen', action: 'CREATE', endpoint: '/bkmPanen', payload: {} }),
    /signed out/
  );
});

test('dead items are counted apart from work still waiting to go', async () => {
  const db = {
    add: async () => {},
    getAll: async () => [
      { id: 'a', retryCount: 0, status: 'PENDING' },
      { id: 'b', retryCount: 5, status: 'DEAD', error_class: 'VALIDATION' },
    ],
  };
  const { useSyncQueueStore: store } = queueStore(db);
  await store.getState().loadQueue();
  assert.equal(store.getState().pendingCount(), 1, 'a dead item is not pending work');
  assert.equal(store.getState().deadCount(), 1);
});

test('new detail mutations require a draft and cancellation can never enter the queue', async () => {
  const saved = [];
  const { useSyncQueueStore: store } = queueStore({ add: async (item) => saved.push(item) });
  for (const status of ['SUBMITTED', 'APPROVED', 'CANCELLED', 'REVISION_REQUESTED']) {
    await assert.rejects(store.getState().addToQueue({ module: 'bkm_rawat_detail', action: 'CREATE', endpoint: '/bkmRawat/detail', payload: { bkm_rawat_id: 'doc', expectedStatus: status } }), /DRAFT/);
  }
  await assert.rejects(store.getState().addToQueue({ module: 'bkm_panen', action: 'UPDATE', endpoint: '/bkmPanen/doc', payload: { id: 'doc', data: { status: 'CANCELLED' } } }), /online/);
  assert.equal(saved.length, 0);
});

test('concurrent queue saves preserve the reopen dependency and block edits after queued submit', async () => {
  const { useSyncQueueStore: store } = queueStore({ add: async () => {} });
  const [reopen, edit] = await Promise.all([
    store.getState().addToQueue({ module: 'bkm_checker', action: 'UPDATE', endpoint: '/bkmChecker/doc', payload: { id: 'doc', data: { status: 'DRAFT' } } }),
    store.getState().addToQueue({ module: 'bkm_checker_detail', action: 'UPDATE', endpoint: '/bkmChecker/detail/d', payload: { id: 'd', documentId: 'doc', expectedStatus: 'DRAFT', data: { jumlah_janjang: 3 } } }),
  ]);
  assert.equal(edit.dependsOn, reopen.id);
  await store.getState().addToQueue({ module: 'bkm_checker', action: 'UPDATE', endpoint: '/bkmChecker/doc', payload: { id: 'doc', data: { status: 'SUBMITTED' } } });
  await assert.rejects(store.getState().addToQueue({ module: 'bkm_checker_detail', action: 'UPDATE', endpoint: '/bkmChecker/detail/d', payload: { id: 'd', documentId: 'doc', expectedStatus: 'DRAFT', data: { jumlah_janjang: 4 } } }), /pengiriman/);
});
