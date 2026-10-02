const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

/**
 * The claim/lease behaviour is the mutual exclusion between the automatic and
 * manual sync passes, and it lives entirely in SQL. Mocking the database would
 * test nothing, so these run the real statements against an in-memory SQLite
 * through a thin shim with the expo-sqlite surface `database.ts` uses.
 */
function sqliteShim() {
  const db = new DatabaseSync(':memory:');
  return {
    db,
    api: {
      execAsync: async (sql) => db.exec(sql),
      runAsync: async (sql, params = []) => db.prepare(sql).run(...params),
      getAllAsync: async (sql, params = []) => db.prepare(sql).all(...params),
      getFirstAsync: async (sql, params = []) => db.prepare(sql).get(...params) ?? null,
      withTransactionAsync: async (fn) => {
        db.exec('BEGIN');
        try {
          await fn();
          db.exec('COMMIT');
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
      },
    },
  };
}

function loadQueueDb() {
  const { db, api } = sqliteShim();
  db.exec(`
    CREATE TABLE sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      payload TEXT,
      created_at INTEGER NOT NULL,
      retry_count INTEGER DEFAULT 0,
      user_id TEXT,
      device_id TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      error_class TEXT,
      last_error TEXT,
      next_attempt_at INTEGER NOT NULL DEFAULT 0,
      lease_until INTEGER,
      precondition TEXT
    );
  `);

  const exports = {};
  const compiled = ts.transpileModule(fs.readFileSync('services/database.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(compiled, {
    exports,
    require: (name) =>
      name === 'expo-sqlite'
        ? { openDatabaseAsync: async () => api }
        : require(name),
    console,
    Date,
    Math,
    JSON,
    Object,
  });
  // getDb() would re-run initDb against our pre-made table; hand it the shim.
  return { queue: exports.syncQueueDb, raw: db, api };
}

const owner = (userId) => ({ userId, deviceId: `device-${userId}` });

/**
 * The module under test runs in a VM sandbox, so arrays it returns belong to a
 * different realm and strict deep-equality rejects them even when identical.
 * Rebuilding the ids here puts the comparison back in this realm.
 */
const ids = (rows) => Array.from(rows, (row) => row.id);

async function seed(queue, userId, ids, createdBase = 1000) {
  for (const [index, id] of ids.entries()) {
    await queue.add({
      id,
      module: 'bkm_panen',
      action: 'CREATE',
      endpoint: '/bkmPanen',
      payload: { n: index },
      createdAt: createdBase + index,
      owner: owner(userId),
    });
  }
}

test('a claimed item is invisible to a second pass until its lease expires', async () => {
  const { queue } = loadQueueDb();
  await seed(queue, 'user-a', ['a1', 'a2']);

  const first = await queue.claim(owner('user-a'), 10, 5_000);
  assert.deepEqual(ids(first), ['a1', 'a2']);

  // The other sync pass runs while the first is still working.
  const second = await queue.claim(owner('user-a'), 10, 5_000);
  assert.deepEqual(ids(second), [], 'two passes must never hold the same item');
});

test('work abandoned by a crash comes back once the lease runs out', async () => {
  const { queue } = loadQueueDb();
  await seed(queue, 'user-a', ['a1']);

  await queue.claim(owner('user-a'), 10, 5_000);
  // The app was force-quit mid-upload; nothing released the row.
  const stillHeld = await queue.claim(owner('user-a'), 10, 6_000);
  assert.deepEqual(ids(stillHeld), []);

  const reclaimed = await queue.claim(owner('user-a'), 10, 5_000 + 3 * 60 * 1000);
  assert.deepEqual(ids(reclaimed), ['a1'], 'an expired lease must not strand work');
});

test('another user on the same handset can neither see nor claim the work', async () => {
  const { queue } = loadQueueDb();
  await seed(queue, 'user-a', ['a1']);

  assert.deepEqual(ids(await queue.getAll(owner('user-b'))), []);
  assert.deepEqual(ids(await queue.claim(owner('user-b'), 10, 5_000)), []);
  // And it is still there for the worker who created it.
  assert.equal((await queue.getAll(owner('user-a'))).length, 1);
});

test('a backed-off item is skipped until its time comes', async () => {
  const { queue } = loadQueueDb();
  await seed(queue, 'user-a', ['a1']);

  const [item] = await queue.claim(owner('user-a'), 10, 1_000);
  await queue.markFailed(item.id, {
    errorClass: 'RETRYABLE',
    lastError: 'Network Error',
    nextAttemptAt: 60_000,
    dead: false,
  });

  assert.deepEqual(ids(await queue.claim(owner('user-a'), 10, 30_000)), [], 'backoff must be respected');
  const ready = await queue.claim(owner('user-a'), 10, 61_000);
  assert.deepEqual(ids(ready), ['a1']);
  assert.equal(ready[0].retryCount, 1);
});

test('a dead item is never picked up automatically, only by an explicit retry', async () => {
  const { queue } = loadQueueDb();
  await seed(queue, 'user-a', ['a1']);

  const [item] = await queue.claim(owner('user-a'), 10, 1_000);
  await queue.markFailed(item.id, {
    errorClass: 'VALIDATION',
    lastError: 'jumlah_janjang is required',
    nextAttemptAt: 0,
    dead: true,
  });

  assert.deepEqual(ids(await queue.claim(owner('user-a'), 10, 999_999)), [], 'dead work waits for a person');
  // It is still on the device, with its reason, for the recovery screen.
  const [stored] = await queue.getAll(owner('user-a'));
  assert.equal(stored.status, 'DEAD');
  assert.equal(stored.errorClass, 'VALIDATION');
  assert.match(stored.lastError, /jumlah_janjang/);

  await queue.retryNow('a1');
  const retried = await queue.claim(owner('user-a'), 10, 1_000_000);
  assert.deepEqual(ids(retried), ['a1']);
});

test('items are claimed oldest first, which is the dependency order', async () => {
  const { queue } = loadQueueDb();
  await seed(queue, 'user-a', ['newest'], 9_000);
  await seed(queue, 'user-a', ['oldest'], 1_000);

  const claimed = await queue.claim(owner('user-a'), 10, 20_000);
  assert.deepEqual(ids(claimed), ['oldest', 'newest']);
});

test('clearing the queue only ever touches the signed-in user rows', async () => {
  const { queue } = loadQueueDb();
  await seed(queue, 'user-a', ['a1']);
  await seed(queue, 'user-b', ['b1']);

  await queue.clear(owner('user-a'));
  assert.deepEqual(ids(await queue.getAll(owner('user-a'))), []);
  assert.equal((await queue.getAll(owner('user-b'))).length, 1, "another worker's work survives");
});

test('the precondition is stored with the item so a replay can send it', async () => {
  const { queue } = loadQueueDb();
  await queue.add({
    id: 'u1',
    module: 'bkm_panen',
    action: 'UPDATE',
    endpoint: '/bkmPanen/x',
    payload: { id: 'x' },
    createdAt: 1,
    owner: owner('user-a'),
    precondition: '2026-09-22T11:04:17.318Z',
  });

  const [claimed] = await queue.claim(owner('user-a'), 10, 5_000);
  assert.equal(claimed.precondition, '2026-09-22T11:04:17.318Z');
});

test('reopen, edits, detail/media and submit dependencies survive restart and a conflict', async () => {
  const { queue } = loadQueueDb();
  const stages = ['reopen', 'edit', 'detail', 'submit'];
  for (const [index, id] of stages.entries()) await queue.add({
    id, module: 'bkm_panen', action: 'UPDATE', endpoint: '/bkmPanen/x',
    payload: { stage: id }, createdAt: index, owner: owner('user-a'),
    dependsOn: index ? stages[index - 1] : null,
    precondition: 'old-revision-time',
  });
  assert.deepEqual(ids(await queue.claim(owner('user-a'), 25, 1000)), ['reopen']);
  // A restart reclaims only the expired parent, never its dependent edits.
  assert.deepEqual(ids(await queue.claim(owner('user-a'), 25, 200000)), ['reopen']);
  await queue.markFailed('reopen', { errorClass: 'CONFLICT', lastError: 'changed', dead: true, nextAttemptAt: 0 });
  assert.deepEqual(ids(await queue.claim(owner('user-a'), 25, 400000)), []);
  assert.equal((await queue.getAll(owner('user-a')))[0].payload.stage, 'reopen');
  await queue.retryNow('reopen');
  assert.deepEqual(ids(await queue.claim(owner('user-a'), 25, 500000)), ['reopen']);
  await queue.complete('reopen', 'new-draft-time');
  const [edit] = await queue.claim(owner('user-a'), 25, 500001);
  assert.equal(edit.id, 'edit');
  assert.equal(edit.precondition, 'new-draft-time');
  await queue.complete('edit');
  assert.deepEqual(ids(await queue.claim(owner('user-a'), 25, 500002)), ['detail']);
  await queue.complete('detail');
  assert.deepEqual(ids(await queue.claim(owner('user-a'), 25, 500003)), ['submit']);
});

test('a deferred item waits for its time without spending an attempt or going DEAD', async () => {
  const { queue, raw } = loadQueueDb();
  await seed(queue, 'user-a', ['a1']);
  await queue.claim(owner('user-a'), 10, 5_000);

  await queue.defer('a1', 35_000, 'Menunggu Panen terkirim');
  const row = raw.prepare('SELECT status, retry_count, next_attempt_at, lease_until FROM sync_queue WHERE id = ?').get('a1');
  assert.deepEqual({ ...row }, { status: 'PENDING', retry_count: 0, next_attempt_at: 35_000, lease_until: null });
  assert.deepEqual(ids(await queue.claim(owner('user-a'), 10, 6_000)), [], 'not in a hot loop');
  assert.deepEqual(ids(await queue.claim(owner('user-a'), 10, 35_000)), ['a1']);
});

test('statusOf tells a queued item from a synced one, for the owner only', async () => {
  const { queue } = loadQueueDb();
  await seed(queue, 'user-a', ['a1', 'a2']);
  await queue.claim(owner('user-a'), 1, 5_000);
  await queue.markFailed('a2', { errorClass: 'VALIDATION', lastError: 'x', nextAttemptAt: 0, dead: true });
  assert.equal(await queue.statusOf(owner('user-a'), 'a1'), 'IN_FLIGHT');
  assert.equal(await queue.statusOf(owner('user-a'), 'a2'), 'DEAD');
  assert.equal(await queue.statusOf(owner('user-b'), 'a1'), null, 'another worker\'s row is invisible');
  await queue.complete('a1');
  assert.equal(await queue.statusOf(owner('user-a'), 'a1'), null, 'synced means gone');
});
