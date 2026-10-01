const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const exports = {};
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(compiled, { exports, require: (name) => mocks[name] ?? require(name), console, Error, Date, Math, JSON, Object, Set, Map });
  return exports;
}

// Values built inside the sandbox have another realm's prototypes; compare them as JSON.
const plain = (value) => JSON.parse(JSON.stringify(value));

const estate = load('utils/estateDate.ts');
const trip = load('utils/trip.ts');
const dispatch = load('utils/dispatch.ts', { '@/utils/estateDate': estate, '@/utils/trip': trip });
const support = load('utils/sync-support.ts');
const processItem = load('services/sync-processor.ts', {
  axios: { isAxiosError: () => false },
  'expo-file-system/legacy': { documentDirectory: null, deleteAsync: async () => {} },
  './api': { apiClient: {} },
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
  '@/utils/sync-support': support,
  '@/utils/tiket-pks': { sameFiledTicket: () => false },
  '@/utils/trip': trip,
}).processItem;

function queueStore(saved) {
  return load('stores/useSyncQueueStore.ts', {
    '@/utils/sync-support': support,
    '@/services/database': { syncQueueDb: { add: async (item) => saved.push(item) } },
    '@/services/device': { getDeviceId: async () => 'device-1' },
    '@/stores/useAuthStore': { useAuthStore: { getState: () => ({ user: { id: 'user-1' } }), subscribe: () => () => {} } },
  }).useSyncQueueStore;
}

const header = {
  nomor_spb: ' 0012345 ', tanggal: '2026-09-30', kendaraan_id: 'truck-1', supir_id: '', nomor_truk: 'BK 1234 AB',
  nama_sopir: 'Pak Budi', tujuan_kirim: 'PKS Mitra', keterangan: '',
};
const grading = { janjang_normal: 0, buah_mentah: 0, over_ripe: 0, tangkai_panjang: 0, buah_abnormal: 0, janjang_kosong: 0 };
const langsung = {
  client_detail_id: 'line-a', tipe_pengiriman: 'LANGSUNG', tph_id: 'tph-1', tph_nama: 'TPH 1',
  bkm_panen_id: 'panen-1', panen_day: '2026-09-30', ...grading, janjang_normal: 40, jumlah_janjang: 40, jumlah_brondol: 6,
};
const titip = {
  client_detail_id: 'line-b', tipe_pengiriman: 'TITIP', tph_id: 'tph-2', tph_nama: 'TPH 2',
  restan_id: 'restan-1', restan_max: 30, ...grading, janjang_normal: 20, jumlah_janjang: 20, jumlah_brondol: 3,
};
const now = new Date('2026-09-30T01:00:00Z'); // 08:00 WIB

/** A server that enforces what the contract says: unique SPB per org, restan claimed once. */
function fakeServer({ collected = [], taken = [] } = {}) {
  const calls = [];
  const lines = [];
  const api = {
    calls, lines,
    create: async (body) => {
      calls.push(['create', body]);
      if (taken.includes(body.nomor_spb)) throw Object.assign(new Error('taken'), { status: 409, data: { code: 'SPB_NUMBER_TAKEN' } });
      return { id: 'trip-server', status: 'DRAFT', details: [] };
    },
    getById: async () => ({ id: 'trip-server', status: 'DRAFT', details: [...lines] }),
    addDetail: async (body) => {
      calls.push(['addDetail', body]);
      if (lines.some((line) => line.client_detail_id === body.client_detail_id)) return lines.find((line) => line.client_detail_id === body.client_detail_id);
      if (body.restan_id && collected.includes(body.restan_id)) {
        throw Object.assign(new Error('collected'), { status: 409, data: { code: 'RESTAN_COLLECTED', restan_id: body.restan_id } });
      }
      const row = { id: `detail-${lines.length + 1}`, ...body };
      lines.push(row);
      return row;
    },
    deleteDetail: async (id) => { calls.push(['deleteDetail', id]); lines.splice(lines.findIndex((line) => line.id === id), 1); },
    update: async (_id, body) => { calls.push(['update', body]); },
  };
  return api;
}

const deps = (checkerApi, persisted = []) => ({ checkerApi, updateQueuePayload: async (_id, payload) => { persisted.push(payload); } });

test('an SPB header with mixed Langsung and Titip lines is queued offline and replays create, lines, submit', async () => {
  const saved = [];
  const store = queueStore(saved);
  const payload = dispatch.buildTripPayload(header, [langsung, titip], true, now);
  await store.getState().addToQueue({ module: 'bkm_checker', action: 'CREATE', endpoint: '/bkmChecker', payload });
  assert.equal(saved.length, 1, 'one item: nothing after it can be reordered ahead of the header');

  // Header: SPB identity, truck, driver, destination, dispatch time. No header TPH.
  const sent = saved[0].payload;
  assert.equal(sent.header.nomor_spb, '0012345');
  assert.equal(sent.header.dispatched_at, '2026-09-30T01:00:00.000Z');
  assert.equal(sent.header.kendaraan_id, 'truck-1');
  assert.equal(sent.header.nomor_truk, 'BK 1234 AB');
  assert.equal(sent.header.supir_id, undefined);
  for (const key of ['tph_id', 'blok_id', 'lahan_id', 'bkm_panen_id']) assert.equal(key in sent.header, false);

  const server = fakeServer();
  await processItem({ id: 'q1', module: 'bkm_checker', action: 'CREATE', endpoint: '/bkmChecker', payload: sent }, deps(server));
  assert.deepEqual(plain(server.calls).map(([name, body]) => name === 'update' ? 'submit' : name === 'addDetail' ? `line:${body.tipe_pengiriman}` : name),
    ['create', 'line:LANGSUNG', 'line:TITIP', 'submit']);
  assert.equal(server.calls[0][1].client_request_id, 'q1');
  const [a, b] = server.lines;
  assert.equal(a.client_detail_id, 'line-a');
  assert.deepEqual([a.tph_id, a.bkm_panen_id, a.restan_id], ['tph-1', 'panen-1', undefined]);
  assert.deepEqual([b.tph_id, b.bkm_panen_id, b.restan_id], ['tph-2', undefined, 'restan-1']);
  assert.deepEqual([a.jumlah_brondol, b.jumlah_brondol], [6, 3], 'brondol stays in kilograms');
  for (const line of server.lines) for (const key of ['nomor_truk', 'nama_sopir', 'tujuan_kirim', 'kendaraan_id']) assert.equal(key in line, false, `${key} belongs to the header`);
  assert.deepEqual(plain(server.calls[3][1]), { status: 'SUBMITTED' });
});

test('a replay after a lost response reuses the server draft and the same line keys', async () => {
  const payload = dispatch.buildTripPayload(header, [langsung, titip], true, now);
  const server = fakeServer();
  const persisted = [];
  let fail = true;
  const flaky = { ...server, addDetail: async (body) => { if (body.client_detail_id === 'line-b' && fail) { fail = false; throw new Error('Network Error'); } return server.addDetail(body); } };
  await assert.rejects(processItem({ id: 'q2', module: 'bkm_checker', action: 'CREATE', payload }, deps(flaky, persisted)), /Network/);
  assert.equal(persisted[0].server_id, 'trip-server');
  await processItem({ id: 'q2', module: 'bkm_checker', action: 'CREATE', payload: persisted[0] }, deps(flaky, persisted));
  assert.equal(server.calls.filter(([name]) => name === 'create').length, 1);
  assert.equal(server.lines.length, 2, 'line-a is replayed idempotently, not duplicated');
});

test('submit is for the Mandor with update rights; without it the trip stays a draft', async () => {
  const payload = dispatch.buildTripPayload(header, [langsung], false, now);
  const server = fakeServer();
  await processItem({ id: 'q3', module: 'bkm_checker', action: 'CREATE', payload }, deps(server));
  assert.equal(server.calls.some(([name]) => name === 'update'), false);
});

test('what the phone can already see is wrong is caught before the trip is queued', () => {
  assert.deepEqual(plain(dispatch.tripProblems(header, [langsung, titip])), []);
  const problems = dispatch.tripProblems({ ...header, nomor_spb: ' ', nomor_truk: '', nama_sopir: '' }, []);
  assert.equal(problems.length, 4);
  // Partial pickup is fine, more than the restan holds is not.
  assert.match(dispatch.tripProblems(header, [{ ...titip, jumlah_janjang: 31 }]).join(), /melebihi sisa restan \(30/);
  assert.deepEqual(plain(dispatch.tripProblems(header, [{ ...titip, jumlah_janjang: 12 }])), []);
  // A Langsung line is only valid on the dispatch day.
  assert.match(dispatch.tripProblems(header, [{ ...langsung, panen_day: '2026-09-29' }]).join(), /bukan hari berangkat/);
});

test('dispatch time and restan age are estate-day arithmetic, not device-time', () => {
  assert.equal(dispatch.dispatchedAtFor('2026-09-30', now), '2026-09-30T01:00:00.000Z');
  assert.equal(dispatch.dispatchedAtFor('2026-09-28', now), '2026-09-28T05:00:00.000Z', 'a backdated trip is stamped midday WIB');
  // Harvested 2026-09-27 07:30 WIB; on the 30th it is three days old.
  assert.equal(dispatch.restanAgeDays('2026-09-27T00:30:00.000Z', '2026-09-30'), 3);
  // 23:30 UTC on the 29th is already the 30th in WIB, so it is not "yesterday's" restan.
  assert.equal(dispatch.restanAgeDays('2026-09-29T23:30:00.000Z', '2026-09-30'), 0);
});

test('a line removed during recovery keeps every other line key', () => {
  const payload = dispatch.buildTripPayload(header, [langsung, titip], true, now);
  assert.deepEqual(plain(payload.details).map((line) => line.client_detail_id), ['line-a', 'line-b']);
  const fixed = trip.resolveTripConflict({ ...payload, conflict: { code: 'RESTAN_COLLECTED', restan_id: 'restan-1' } });
  assert.deepEqual(plain(fixed.details).map((line) => line.client_detail_id), ['line-a']);
});
