const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const supportExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('utils/sync-support.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: supportExports });

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
