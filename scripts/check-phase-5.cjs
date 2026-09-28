const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(path, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require: (name) => mocks[name] ?? require(name), console, Error, Date });
  return exports;
}
const ticketRules = load('utils/tiket-pks.ts');
const { checkerLoadConflict } = load('utils/transport.ts');
const support = load('utils/sync-support.ts');

function processor() {
  return load('services/sync-processor.ts', {
    axios: { isAxiosError: () => false },
    'expo-file-system/legacy': { documentDirectory: 'file:///docs/', deleteAsync: async () => {} },
    './api': { apiClient: {} },
    './bkm-panen.service': { bkmPanenApi: {} },
    './bkm-checker.service': { bkmCheckerApi: {} },
    './bkm-rawat.service': { bkmRawatApi: {} },
    './observasi.service': { observasiApi: {} },
    './vehicle-usage.service': { pemakaianKendaraanApi: {} },
    './krani-timbang.service': { kraniTimbangApi: {} },
    './tiket-pks.service': { tiketPksApi: {} },
    './staging.service': { stagingApi: {} },
    './upload.service': { uploadApi: {} },
    '@/stores/useSyncQueueStore': { useSyncQueueStore: { getState: () => ({ updatePayload: async () => {} }) } },
    '@/utils/tiket-pks': ticketRules,
    '@/utils/sync-support': support,
  }).processItem;
}

test('Checker rejects two registered trucks even when one row is RESTAN', () => {
  const rows = [
    { tipe_pengiriman: 'LANGSUNG', kendaraan_id: 'truck-a', nomor_truk: 'BK 1', nama_sopir: 'A', tujuan_kirim: 'Mill' },
    { tipe_pengiriman: 'RESTAN', kendaraan_id: 'truck-b', nomor_truk: 'BK 2' },
  ];
  assert.match(checkerLoadConflict(rows), /satu kendaraan/i);
  rows[1] = { ...rows[1], tipe_pengiriman: 'LANGSUNG', kendaraan_id: 'truck-a', nomor_truk: 'BK 1', nama_sopir: 'A', tujuan_kirim: 'Mill' };
  assert.equal(checkerLoadConflict(rows), null);
  rows[1].nomor_truk = 'BK 3';
  assert.match(checkerLoadConflict(rows), /Nomor truk berbeda/);
});

test('PKS weights use the mill net and one-kilogram tolerance', () => {
  assert.equal(ticketRules.ticketWeightsValid({ netto_pabrik: 100, bruto_pabrik: null, tara_pabrik: null }), true);
  assert.equal(ticketRules.ticketWeightsValid({ netto_pabrik: 100, bruto_pabrik: 150, tara_pabrik: 49 }), true);
  assert.equal(ticketRules.ticketWeightsValid({ netto_pabrik: 100, bruto_pabrik: 150, tara_pabrik: 47 }), false);
  assert.equal(ticketRules.ticketWeightsValid({ netto_pabrik: 0 }), false);
});

test('queued ticket checkpoints its photo and resolves a lost POST response once', async () => {
  const processItem = processor();
  const payload = { krani_timbang_id: 'trip-a', nomor_tiket: 'PKS-1', tanggal_tiket: '2026-09-24T06:00:00.000Z',
    netto_pabrik: 100, bruto_pabrik: null, tara_pabrik: null, foto_url: 'file:///docs/photo.jpg', local_photo_uri: 'file:///docs/photo.jpg' };
  const item = { id: 'queue-1', module: 'tiket_pks', action: 'CREATE', payload };
  let saved;
  let filed = null;
  let uploads = 0;
  let posts = 0;
  let posted;
  const deps = {
    upload: { uploadImage: async (_uri, folder) => { assert.equal(folder, 'tiket-pks'); uploads++; return { url: 'https://example.test/media/photo.jpg', hash: 'hash', bytes: 10 }; } },
    updateQueuePayload: async (_id, value) => { saved = value; },
    ticketApi: {
      byTrip: async () => filed,
      create: async (value) => { posts++; posted = value; filed = { id: 'ticket-1', ...value }; throw new Error('response lost'); },
    },
  };
  await assert.rejects(processItem(item, deps), /response lost/);
  assert.equal(saved.foto_url, 'https://example.test/media/photo.jpg');
  const resolved = await processItem({ ...item, payload: saved }, deps);
  assert.equal(resolved.id, 'ticket-1');
  assert.equal(uploads, 1);
  assert.equal(posts, 1);
  assert.equal(posted.foto_hash, undefined);
  assert.equal(posted.foto_bytes, undefined);
  assert.equal(posted.local_photo_uri, undefined);
});

test('old text-only Checker queue creates its header once and replays details after a partial response', async () => {
  const processItem = processor();
  const item = { id: 'old-checker', module: 'bkm_checker', action: 'CREATE', endpoint: '/bkmChecker',
    payload: { header: { blok_id: 'block', tph_id: 'tph', tanggal_laporan: '2026-09-24' },
      details: [{ nomor_truk: 'BK 1', nama_sopir: 'A', tujuan_kirim: 'PKS', tipe_pengiriman: 'LANGSUNG' }] } };
  let checkpoint;
  let headerCreates = 0;
  let detailCalls = 0;
  const checkerApi = {
    create: async () => { headerCreates++; return { id: 'checker-server', status: 'DRAFT' }; },
    getById: async () => ({ id: 'checker-server', status: 'DRAFT' }),
    addDetail: async (detail) => { detailCalls++; assert.equal(detail.kendaraan_id, undefined);
      assert.equal(detail.client_detail_id, 'old-checker:0');
      if (detailCalls === 1) throw new Error('response lost'); },
    update: async () => {},
  };
  const deps = { checkerApi, updateQueuePayload: async (_id, value) => { checkpoint = value; } };
  await assert.rejects(processItem(item, deps), /response lost/);
  assert.equal(checkpoint.server_id, 'checker-server');
  await processItem({ ...item, payload: checkpoint }, deps);
  assert.equal(headerCreates, 1);
  assert.equal(detailCalls, 2);
});

test('a different ticket on the same trip remains a terminal queue conflict', async () => {
  const processItem = processor();
  const payload = { krani_timbang_id: 'trip-a', nomor_tiket: 'LOCAL', tanggal_tiket: '2026-09-24T06:00:00.000Z', netto_pabrik: 100 };
  await assert.rejects(processItem({ id: 'queue-2', module: 'tiket_pks', action: 'CREATE', payload }, {
    upload: {}, updateQueuePayload: async () => {},
    ticketApi: { byTrip: async () => ({ ...payload, nomor_tiket: 'SERVER' }) },
  }), (error) => error.status === 409);
});

test('offline weighing replays once: a lost response resolves, a different weighing stays a conflict', async () => {
  const processItem = processor();
  const payload = { qr_payload: 'V1|c|t|10|1|sig', nama_supir: 'A', nomor_kendaraan: 'BK 1', tujuan_kirim: 'PKS',
    timbang_isi: 6355, timbang_kosong: 5200, jumlah_brondol: 0 };
  const item = { id: 'queue-w', module: 'krani_timbang', action: 'CREATE', payload };
  const duplicate = Object.assign(new Error('Duplicate transaction'), { status: 409, data: { existing_id: 'log-1' } });
  const deps = (filed) => ({ staging: { submitPayload: async () => { throw duplicate; }, getPendingLogById: async () => filed } });
  await processItem(item, deps({ timbang_isi: '6355.00', timbang_kosong: '5200.00' }));
  await assert.rejects(processItem(item, deps({ timbang_isi: '7000.00', timbang_kosong: '5200.00' })), (error) => error.status === 409);
  let posted;
  await processItem(item, { staging: { submitPayload: async (data) => { posted = data; } } });
  assert.equal(posted.qr_payload, payload.qr_payload);
});
