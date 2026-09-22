const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadSyncProcessor() {
  const exports = {};
  const mocks = {
    axios: { isAxiosError: () => false },
    './api': { apiClient: {} },
    './bkm-panen.service': { bkmPanenApi: {} },
    './bkm-checker.service': { bkmCheckerApi: {} },
    './bkm-rawat.service': { bkmRawatApi: {} },
    './upload.service': { uploadApi: {} },
    '@/stores/useSyncQueueStore': { useSyncQueueStore: { getState: () => ({ updatePayload: async () => {} }) } },
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
  assert.equal(updates.length, 1);
  assert.equal(updates[0].id, 'rawat-1');
  assert.equal(updates[0].payload.status, 'SUBMITTED');
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
