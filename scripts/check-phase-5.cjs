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
const tripRules = load('utils/trip.ts');

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
    '@/utils/trip': tripRules,
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

// ---- Phase 3: mill ticket by SPB number -------------------------------------
const spbTicket = () => ({ nomor_spb: '0012345', nomor_tiket: 'T-889', tanggal_tiket: '2026-09-30T03:00:00.000Z',
  netto_pabrik: 3000, bruto_pabrik: 5000, tara_pabrik: 2000, foto_url: 'file:///docs/t.jpg', local_photo_uri: 'file:///docs/t.jpg' });
const spbDeps = (over) => ({
  upload: { uploadImage: async () => ({ url: 'https://example.test/t.jpg', hash: 'h', bytes: 1 }) },
  updateQueuePayload: async () => {}, ...over,
});
const conflictError = (status, code) => Object.assign(new Error(code), { status, data: { code } });

test('SPB-number ticket posts by nomor_spb, uploads its photo, and treats 202 menunggu SPB as success', async () => {
  const processItem = processor();
  let posted; let byTripCalls = 0;
  const waiting = { menunggu_spb: true, reconciled: false, nomor_spb: '0012345', staging_id: 's1' };
  const result = await processItem({ id: 'q-spb', module: 'tiket_pks', action: 'CREATE', payload: spbTicket() }, spbDeps({
    ticketApi: { byTrip: async () => { byTripCalls++; return null; }, createBySpb: async (data) => { posted = data; return waiting; } },
  }));
  assert.equal(result, undefined);
  assert.equal(posted.nomor_spb, '0012345');
  assert.equal(posted.krani_timbang_id, undefined);
  assert.equal(posted.foto_url, 'https://example.test/t.jpg');
  assert.equal(posted.local_photo_uri, undefined);
  assert.equal(byTripCalls, 0, 'no weighing id to look up');
});

test('SPB-number ticket conflicts are kept on the payload for the Krani, never retried or dropped', async () => {
  const processItem = processor();
  for (const code of ['SPB_TICKET_EXISTS', 'TICKET_NUMBER_TAKEN']) {
    let saved;
    await assert.rejects(processItem({ id: 'q-c', module: 'tiket_pks', action: 'CREATE', payload: spbTicket() }, spbDeps({
      updateQueuePayload: async (_id, value) => { saved = value; },
      ticketApi: { createBySpb: async () => { throw conflictError(409, code); }, byNumber: async () => null },
    })), (error) => error.status === 409 && error.code === code);
    assert.equal(saved.conflict.code, code);
    assert.equal(saved.foto_url, 'https://example.test/t.jpg', 'the uploaded photo survives the conflict');
  }
});

test('a lost response on an SPB-number ticket resolves to the ticket already filed, a different one stays a conflict', async () => {
  const processItem = processor();
  const draft = { ...spbTicket(), foto_url: 'https://example.test/t.jpg' };
  const filed = { id: 'tk', krani_timbang_id: 'w1', nomor_tiket: 'T-889', tanggal_tiket: draft.tanggal_tiket, netto_pabrik: '3000',
    bruto_pabrik: '5000', tara_pabrik: '2000', foto_url: 'https://example.test/t.jpg' };
  const deps = (server) => spbDeps({ ticketApi: { createBySpb: async () => { throw conflictError(409, 'SPB_TICKET_EXISTS'); }, byNumber: async () => server } });
  await processItem({ id: 'q-r', module: 'tiket_pks', action: 'CREATE', payload: draft }, deps(filed));
  await assert.rejects(processItem({ id: 'q-r', module: 'tiket_pks', action: 'CREATE', payload: draft },
    deps({ ...filed, netto_pabrik: '2900' })), (error) => error.code === 'SPB_TICKET_EXISTS');
});

test('resolving a ticket conflict needs a new ticket number or a new SPB number, and clears the conflict', () => {
  const taken = { nomor_spb: '1', nomor_tiket: 'T-1', conflict: { code: 'TICKET_NUMBER_TAKEN' } };
  assert.equal(tripRules.resolveSpbConflict(taken, {}), null);
  assert.equal(tripRules.resolveSpbConflict(taken, { nomor_tiket: ' T-1 ' }), null);
  const fixed = tripRules.resolveSpbConflict(taken, { nomor_tiket: ' T-2 ' });
  assert.equal(fixed.nomor_tiket, 'T-2');
  assert.equal(fixed.conflict, undefined);
  const exists = { nomor_spb: '1', nomor_tiket: 'T-1', conflict: { code: 'SPB_TICKET_EXISTS' } };
  assert.equal(tripRules.resolveSpbConflict(exists, { nomor_tiket: 'T-9' }), null, 'a new ticket number does not fix a second ticket for the SPB');
  assert.equal(tripRules.resolveSpbConflict(exists, { nomor_spb: '2' }).nomor_spb, '2');
});

test('the ticket time is read on the estate (WIB) clock whatever the device timezone', () => {
  assert.equal(ticketRules.parseEstateStamp('2026-09-30 10:00').toISOString(), '2026-09-30T03:00:00.000Z');
  assert.equal(ticketRules.parseEstateStamp('2026-09-30T10:00').toISOString(), '2026-09-30T03:00:00.000Z');
  assert.equal(ticketRules.parseEstateStamp('30/09/2026 10:00'), null);
  assert.equal(ticketRules.parseEstateStamp('2026-13-40 10:00'), null);
  assert.equal(ticketRules.estateStamp(new Date('2026-09-30T20:30:00.000Z')), '2026-10-01 03:30');
});
