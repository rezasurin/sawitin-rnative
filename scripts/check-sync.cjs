const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const supportExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('utils/sync-support.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: supportExports });

const tripExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('utils/trip.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: tripExports });

function loadSyncProcessor(api = {}) {
  const exports = {};
  const mocks = {
    axios: { isAxiosError: () => false },
    'expo-file-system/legacy': { documentDirectory: null, deleteAsync: async () => {} },
    './api': { apiClient: api },
    './krani-timbang.service': { kraniTimbangApi: {} },
    './bkm-panen.service': { bkmPanenApi: {} },
    './bkm-checker.service': { bkmCheckerApi: {} },
    './bkm-rawat.service': { bkmRawatApi: {} },
    './observasi.service': { observasiApi: {} },
    './vehicle-usage.service': { pemakaianKendaraanApi: {} },
    './tiket-pks.service': { tiketPksApi: {} },
    './staging.service': { stagingApi: {} },
    './upload.service': { uploadApi: {} },
    '@/stores/useSyncQueueStore': { useSyncQueueStore: { getState: () => ({ updatePayload: async () => {} }) } },
    '@/utils/sync-support': supportExports,
    '@/utils/trip': tripExports,
    '@/utils/tiket-pks': { sameFiledTicket: () => false },
  };
  const compiled = ts.transpileModule(fs.readFileSync('services/sync-processor.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => mocks[name] ?? require(name),
    console,
    Error,
  });
  return exports;
}

function dependencies(overrides = {}) {
  return {
    panenApi: {},
    checkerApi: {},
    rawatApi: {},
    observasiApi: {},
    usageApi: {},
    ticketApi: {},
    upload: {},
    updateQueuePayload: async () => {},
    ...overrides,
  };
}

test('uploaded image URLs are checkpointed and reused after a failed queue attempt', async () => {
  const { uploadAndCheckpoint } = loadSyncProcessor();
  let uploadCount = 0;
  let persisted;
  const deps = dependencies({
    upload: {
      uploadImage: async () => {
        uploadCount += 1;
        return { url: 'https://cdn.example/photo.jpg' };
      },
    },
    updateQueuePayload: async (_id, payload) => { persisted = payload; },
  });
  const buildPayload = (details) => ({ header: { blok_id: 'block-1' }, details });

  await uploadAndCheckpoint('queue-1', [{ foto_url: 'file:///photo.jpg' }], buildPayload, deps);
  assert.equal(uploadCount, 1);
  assert.equal(persisted.details[0].foto_url, 'https://cdn.example/photo.jpg');

  await uploadAndCheckpoint('queue-1', persisted.details, buildPayload, deps);
  assert.equal(uploadCount, 1, 'retry must reuse the persisted remote URL');
});

test('observation replay checkpoints the uploaded photo and keeps its request key', async () => {
  const { processItem } = loadSyncProcessor();
  let uploads = 0;
  const folders = [];
  let persisted;
  const keys = [];
  const deps = dependencies({
    upload: { uploadImage: async (_uri, folder) => { uploads++; folders.push(folder); return { url: 'https://cdn.example/observation.jpg', hash: 'h1', bytes: 100 }; } },
    updateQueuePayload: async (_id, payload) => { persisted = payload; },
    observasiApi: { create: async (payload) => { keys.push(payload.client_request_id); if (keys.length === 1) throw new Error('timeout'); return { id: 'one-record' }; } },
  });
  const item = { id: 'q-observation', module: 'observasi', action: 'CREATE', payload: {
    client_request_id: 'stable-key', jenis: 'HAMA', kelompok_lahan_id: 'k1', tanggal: '2026-09-24', nama_pengamat: 'A', foto_url: 'file:///photo.jpg',
  } };
  await assert.rejects(processItem(item, deps), /timeout/);
  assert.equal(persisted.foto_url, 'https://cdn.example/observation.jpg');
  await processItem({ ...item, payload: persisted }, deps);
  assert.equal(uploads, 1);
  assert.deepEqual(folders, ['observasi']);
  assert.deepEqual(keys, ['stable-key', 'stable-key']);
});

test('vehicle create retry submits once after an interrupted response', async () => {
  const { processItem } = loadSyncProcessor();
  let status = 'DRAFT';
  let updates = 0;
  const deps = dependencies({
    usageApi: {
      create: async () => ({ id: 'usage-1', status }),
      update: async () => { updates++; status = 'SUBMITTED'; if (updates === 1) throw new Error('response lost'); return { status }; },
      getById: async () => ({ status }),
    },
  });
  const item = { id: 'q-usage', module: 'pemakaian_kendaraan', action: 'CREATE', payload: {
    data: { client_request_id: 'stable-usage', kendaraan_id: 'truck-1', tanggal: '2026-09-24' }, submit: true,
  } };
  await assert.rejects(processItem(item, deps), /response lost/);
  await processItem(item, deps);
  assert.equal(updates, 1);
  await processItem({ id: 'q-submit', module: 'pemakaian_kendaraan', action: 'UPDATE', payload: { id: 'usage-1', data: { status: 'SUBMITTED' } } }, deps);
  assert.equal(updates, 1);
});

test('Rawat create replay keeps stable idempotency keys and submits once', async () => {
  const { processItem } = loadSyncProcessor();
  const creates = [];
  const updates = [];
  const rawatApi = {
    create: async (payload) => {
      creates.push(payload);
      return { id: 'rawat-1', status: creates.length === 1 ? 'DRAFT' : 'SUBMITTED' };
    },
    update: async (id, payload) => { updates.push({ id, payload }); },
  };
  const item = {
    id: 'queue-rawat-1',
    module: 'bkm_rawat',
    action: 'CREATE',
    endpoint: '/bkmRawat',
    createdAt: 1,
    retryCount: 0,
    payload: {
      header: {
        kelompok_lahan_id: 'group-1',
        blok_id: 'block-1',
        tanggal: '2026-09-21T00:00:00.000Z',
        nama_pengawas: 'Mandor',
      },
      details: [{
        pekerja_id: 'worker-1',
        tipe_pekerjaan_id: 'type-1',
        kategori_pekerjaan_id: 'category-1',
        item_pekerjaan_id: 'item-1',
        nama_pekerja: 'Worker',
        jumlah_pekerja: 1,
      }],
      submit: true,
    },
  };
  const deps = dependencies({ rawatApi });

  await processItem(item, deps);
  await processItem(item, deps);

  assert.equal(creates.length, 2);
  assert.equal(creates[0].client_request_id, 'queue-rawat-1');
  assert.equal(creates[1].client_request_id, 'queue-rawat-1');
  assert.equal(creates[0].details[0].client_detail_id, 'queue-rawat-1:0');
  assert.equal(creates[1].details[0].client_detail_id, 'queue-rawat-1:0');
  assert.equal(creates[0].details[0].pekerja_id, 'worker-1');
  assert.equal(creates[1].details[0].pekerja_id, 'worker-1');
  assert.equal(updates.length, 1);
  assert.equal(updates[0].id, 'rawat-1');
  assert.equal(updates[0].payload.status, 'SUBMITTED');
});

test('Rawat detail replay preserves the linked worker ID', async () => {
  const { processItem } = loadSyncProcessor();
  const sent = [];
  await processItem({
    id: 'queued-detail', module: 'bkm_rawat_detail', action: 'CREATE',
    payload: { bkm_rawat_id: 'rawat-1', pekerja_id: 'worker-1', nama_pekerja: 'Andi', jumlah_pekerja: 1 },
  }, dependencies({ rawatApi: { addDetail: async (payload) => sent.push(payload) } }));
  assert.equal(sent[0].pekerja_id, 'worker-1');
  assert.equal(sent[0].client_detail_id, 'queued-detail');
});

test('Rawat offline draft remains DRAFT until submit is requested', async () => {
  const { processItem } = loadSyncProcessor();
  let updateCount = 0;
  const item = {
    id: 'queue-rawat-draft',
    module: 'bkm_rawat',
    action: 'CREATE',
    endpoint: '/bkmRawat',
    createdAt: 1,
    retryCount: 0,
    payload: { header: {}, details: [], submit: false },
  };
  await processItem(item, dependencies({
    rawatApi: {
      create: async () => ({ id: 'rawat-draft', status: 'DRAFT' }),
      update: async () => { updateCount += 1; },
    },
  }));
  assert.equal(updateCount, 0);
});

test('an upload finishing after another actor submits preserves a conflict instead of silently succeeding', async () => {
  let status = 'DRAFT';
  let persisted;
  let businessWrites = 0;
  const { processItem } = loadSyncProcessor({ get: async () => ({ data: { status } }) });
  const item = { id: 'late-upload', module: 'bkm_panen', action: 'UPDATE', payload: {
    id: 'panen-1', header: {}, details: [{ foto_url: 'file:///photo.jpg' }], deletedDetailIds: [],
  } };
  await assert.rejects(processItem(item, dependencies({
    upload: { uploadImage: async () => { status = 'SUBMITTED'; return { url: 'https://cdn/photo.jpg' }; } },
    updateQueuePayload: async (_id, payload) => { persisted = payload; },
    panenApi: { update: async () => { businessWrites++; } },
  })), (error) => error.status === 409);
  assert.equal(businessWrites, 0);
  assert.equal(persisted.details[0].foto_url, 'https://cdn/photo.jpg');
});

test('legacy queued cancellation is stopped for user resolution', async () => {
  const { processItem } = loadSyncProcessor();
  await assert.rejects(processItem({ module: 'bkm_panen', action: 'UPDATE', payload: { id: 'x', data: { status: 'CANCELLED' } } }, dependencies()), (error) => error.status === 409);
});

test('legacy unsupported work stops immediately for recovery', async () => {
  const { processItem } = loadSyncProcessor();
  await assert.rejects(processItem({ module: 'absensi', action: 'CREATE', payload: {} }, dependencies()), (error) => error.status === 422);
});

// ── SPB trips: restan claims and the 409 conflicts the Mandor resolves ──────

function loadPure(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require: (name) => mocks[name] ?? require(name), Date, Math, Set });
  return exports;
}
const plain = (value) => JSON.parse(JSON.stringify(value));
const tripRules = loadPure('utils/trip.ts');
const dispatchRules = loadPure('utils/dispatch.ts', { '@/utils/estateDate': loadPure('utils/estateDate.ts'), '@/utils/trip': tripRules });
const { classify } = (() => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('services/sync-errors.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require: (name) => (name === 'axios' ? { isAxiosError: () => false } : require(name)), Date, Math, Error });
  return exports;
})();

const restanRow = (id, tph = 'tph-1', extra = {}) => ({ id, tph_id: tph, tanggal: '2026-09-27T00:30:00.000Z', jumlah_janjang: 40, jumlah_brondol: 6, sudah_dikirim: false, ...extra });
const tripItem = (id, restanIds) => ({ id, module: 'bkm_checker', action: 'CREATE', status: 'PENDING', payload: {
  header: { nomor_spb: id, tanggal_laporan: '2026-09-30', dispatched_at: '2026-09-30T01:00:00.000Z' },
  details: restanIds.map((restan_id, index) => ({ client_detail_id: `${id}-${index}`, tipe_pengiriman: 'TITIP', tph_id: 'tph-1', restan_id, jumlah_janjang: 10, jumlah_brondol: 0 })),
  submit: true,
} });

test('a restan a queued, unsynced trip claims is hidden from the next trip', () => {
  const cache = [restanRow('r1'), restanRow('r2'), restanRow('r3', 'tph-1', { sudah_dikirim: true })];
  const queue = [tripItem('0001', ['r1']), { module: 'bkm_panen', action: 'CREATE', payload: { details: [{ restan_id: 'r2' }] } }];
  // r1 is claimed by the queued trip, r2 by an unrelated item type (not a claim), r3 is already collected.
  assert.deepEqual(plain(dispatchRules.visibleRestan(cache, queue)).map((row) => row.id), ['r2']);
  // A line already on the draft being built hides it too, and a dead (conflicted) item keeps its claim.
  assert.deepEqual(plain(dispatchRules.visibleRestan(cache, queue, [{ restan_id: 'r2' }])), []);
  assert.deepEqual(plain(dispatchRules.visibleRestan(cache, [{ ...tripItem('0002', ['r2']), status: 'DEAD' }])).map((row) => row.id), ['r1']);
  // Once the trip synced it leaves the queue, and the claim goes with it.
  assert.deepEqual(plain(dispatchRules.visibleRestan(cache, [])).map((row) => row.id), ['r1', 'r2']);
});

function tripServer({ taken = [], collectedAtSubmit = [] } = {}) {
  const calls = [];
  const lines = [];
  return {
    calls, lines,
    create: async (body) => {
      calls.push(['create', body.nomor_spb]);
      if (taken.includes(body.nomor_spb)) throw Object.assign(new Error('taken'), { status: 409, data: { code: 'SPB_NUMBER_TAKEN', error: 'Nomor SPB sudah dipakai' } });
      return { id: 'trip-server', status: 'DRAFT', details: [] };
    },
    getById: async () => ({ id: 'trip-server', status: 'DRAFT', details: [...lines] }),
    addDetail: async (body) => {
      calls.push(['addDetail', body.client_detail_id]);
      if (!lines.some((line) => line.client_detail_id === body.client_detail_id)) lines.push({ id: `d-${lines.length + 1}`, ...body });
    },
    deleteDetail: async (id) => { calls.push(['deleteDetail', id]); lines.splice(lines.findIndex((line) => line.id === id), 1); },
    update: async () => {
      calls.push(['submit']);
      const hit = lines.find((line) => collectedAtSubmit.includes(line.restan_id));
      if (hit) throw Object.assign(new Error('collected'), { status: 409, data: { code: 'RESTAN_COLLECTED', restan_id: hit.restan_id } });
    },
  };
}

test('a taken SPB number stops as a conflict the Mandor can fix, then replays with the new number', async () => {
  const { processItem } = loadSyncProcessor();
  const server = tripServer({ taken: ['0001'] });
  const saved = [];
  const item = tripItem('0001', ['r1']);
  let thrown;
  await processItem(item, dependencies({ checkerApi: server, updateQueuePayload: async (_id, payload) => saved.push(payload) })).catch((error) => { thrown = error; });
  assert.ok(thrown && thrown.code === 'SPB_NUMBER_TAKEN' && /0001/.test(thrown.message));
  // Held for a person, never retried into the dead-letter by attempts: it is DEAD at once, with its reason.
  const failure = classify(thrown, 0, 5);
  assert.equal(failure.errorClass, 'CONFLICT');
  assert.equal(failure.dead, true);
  assert.match(failure.message, /Ganti nomor SPB/);
  assert.equal(saved.at(-1).conflict.code, 'SPB_NUMBER_TAKEN');
  assert.equal(saved.at(-1).details.length, 1, 'the work is kept');
  assert.equal(tripRules.resolveTripConflict(saved.at(-1), {}), null, 'the same number is not a fix');

  const fixed = tripRules.resolveTripConflict(saved.at(-1), { nomor_spb: ' 0002 ' });
  assert.equal(fixed.header.nomor_spb, '0002');
  assert.equal('conflict' in fixed, false);
  await processItem({ ...item, payload: plain(fixed) }, dependencies({ checkerApi: server }));
  assert.deepEqual(plain(server.calls).slice(-3), [['create', '0002'], ['addDetail', '0001-0'], ['submit']]);
});

test('a restan collected by another trip at submit keeps the draft and the other lines, and can be dropped', async () => {
  const { processItem } = loadSyncProcessor();
  const server = tripServer({ collectedAtSubmit: ['r2'] });
  const saved = [];
  const item = tripItem('0003', ['r1', 'r2']);
  await assert.rejects(processItem(item, dependencies({ checkerApi: server, updateQueuePayload: async (_id, payload) => saved.push(payload) })),
    (error) => error.status === 409 && error.code === 'RESTAN_COLLECTED');
  const stuck = saved.at(-1);
  // The conflict write must not lose the server id checkpointed earlier in the same attempt.
  assert.equal(stuck.server_id, 'trip-server');
  assert.deepEqual(plain(stuck.conflict), { code: 'RESTAN_COLLECTED', restan_id: 'r2' });
  assert.equal(server.lines.length, 2, 'both lines are on the server draft');

  const fixed = plain(tripRules.resolveTripConflict(stuck));
  assert.deepEqual(fixed.details.map((line) => line.restan_id), ['r1']);
  server.update = async () => { server.calls.push(['submit']); };
  await processItem({ ...item, payload: fixed }, dependencies({ checkerApi: server }));
  assert.equal(server.lines.length, 1, 'the collected restan line is removed from the server draft too');
  assert.equal(server.lines[0].restan_id, 'r1');
  assert.equal(plain(server.calls).filter(([name]) => name === 'create').length, 1, 'the draft is reused, not recreated');
  assert.deepEqual(plain(server.calls).at(-1), ['submit']);
});

test('dropping the only line leaves nothing to send, so the Mandor discards instead', () => {
  const payload = { ...tripItem('0004', ['r1']).payload, conflict: { code: 'RESTAN_COLLECTED', restan_id: 'r1' } };
  assert.equal(tripRules.resolveTripConflict(payload), null);
});

test('a 409 on an old-shape document is not turned into a trip conflict', async () => {
  const { processItem } = loadSyncProcessor();
  const saved = [];
  const conflict = Object.assign(new Error('one truck per document'), { status: 409, data: { code: 'RESTAN_COLLECTED', restan_id: 'r1' } });
  const item = { id: 'old', module: 'bkm_checker', action: 'CREATE', payload: { header: { blok_id: 'b', tph_id: 't', tanggal_laporan: '2026-09-24' }, details: [] } };
  await assert.rejects(processItem(item, dependencies({
    checkerApi: { create: async () => { throw conflict; } }, updateQueuePayload: async (_id, payload) => saved.push(payload),
  })), (error) => error === conflict);
  assert.equal(saved.length, 0);
});
