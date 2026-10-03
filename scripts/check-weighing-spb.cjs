// Run with: node --test scripts/check-weighing-spb.cjs
// Phase 3 weighing by SPB number: content-based scan decision, queue replay, 409/410 handling,
// the "menunggu SPB" list, and the jembatan_timbang flag.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(path, mocks = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => mocks[name] ?? require(name), console, Error, Date });
  return exports;
}
const trip = load('utils/trip.ts');
const ticketRules = load('utils/tiket-pks.ts');
const support = load('utils/sync-support.ts');

function processor() {
  return load('services/sync-processor.ts', {
    axios: { isAxiosError: () => false },
    'expo-file-system/legacy': { documentDirectory: 'file:///docs/', deleteAsync: async () => {} },
    './api': { apiClient: {} }, './bkm-panen.service': { bkmPanenApi: {} }, './bkm-checker.service': { bkmCheckerApi: {} },
    './bkm-rawat.service': { bkmRawatApi: {} }, './observasi.service': { observasiApi: {} },
    './vehicle-usage.service': { pemakaianKendaraanApi: {} }, './krani-timbang.service': { kraniTimbangApi: {} },
    './tiket-pks.service': { tiketPksApi: {} }, './staging.service': { stagingApi: {} }, './upload.service': { uploadApi: {} },
    '@/stores/useSyncQueueStore': { useSyncQueueStore: { getState: () => ({ updatePayload: async () => {} }) } },
    '@/utils/tiket-pks': ticketRules, '@/utils/sync-support': support, '@/utils/trip': trip,
  }).processItem;
}
const apiError = (status, body) => Object.assign(new Error(body.code ?? 'error'), { status, data: body });
const weighing = () => ({ nomor_spb: '0012345', timbang_isi: 5200, timbang_kosong: 2000, weighed_at: '2026-09-30T02:10:00.000Z' });

test('the scanned content decides: V3| is the legacy QR, anything else is an SPB number', () => {
  assert.equal(trip.isV3Qr('V3|c|t|10|1700000000000|sig'), true);
  assert.equal(trip.isV3Qr('  V3|c|t|10|1|sig '), true);
  for (const spb of ['0012345', 'SPB-77', 'v3|lower', 'V1|c|t|10|1|sig', '']) assert.equal(trip.isV3Qr(spb), false, spb);
});

test('SPB-number weighing is queueable and replays by nomor_spb; 202 menunggu SPB is success, not resent', async () => {
  assert.equal(support.isSupportedSyncAction('krani_timbang', 'CREATE'), true);
  assert.equal(support.isSupportedSyncAction('tiket_pks', 'CREATE'), true);
  const processItem = processor();
  const sent = [];
  const waiting = { menunggu_spb: true, reconciled: false, nomor_spb: '0012345', staging_id: 's' };
  const result = await processItem({ id: 'w1', module: 'krani_timbang', action: 'CREATE', payload: { ...weighing(), conflict: { code: 'QR_V3_RETIRED' } } },
    { staging: { submitPayload: async (data) => { sent.push(data); return waiting; } }, updateQueuePayload: async () => {} });
  assert.equal(result, undefined);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].nomor_spb, '0012345');
  assert.equal(sent[0].qr_payload, undefined);
  assert.equal(sent[0].conflict, undefined, 'a stale conflict is never sent to the server');
});

test('409 SPB_ALREADY_WEIGHED stays a conflict on the payload; a lost response with the same weights resolves', async () => {
  const processItem = processor();
  let saved;
  const refuse = apiError(409, { code: 'SPB_ALREADY_WEIGHED', existing_id: 'k1' });
  const deps = (filed) => ({
    staging: { submitPayload: async () => { throw refuse; }, getPendingLogById: async () => { if (!filed) throw apiError(404, {}); return filed; } },
    updateQueuePayload: async (_id, value) => { saved = value; },
  });
  await assert.rejects(processItem({ id: 'w2', module: 'krani_timbang', action: 'CREATE', payload: weighing() }, deps(null)),
    (error) => error.status === 409 && error.code === 'SPB_ALREADY_WEIGHED' && /sudah ditimbang/.test(error.message));
  assert.equal(saved.conflict.code, 'SPB_ALREADY_WEIGHED');
  assert.equal(saved.nomor_spb, '0012345');
  await processItem({ id: 'w2', module: 'krani_timbang', action: 'CREATE', payload: weighing() }, deps({ timbang_isi: '5200.00', timbang_kosong: '2000.00' }));
  await assert.rejects(processItem({ id: 'w2', module: 'krani_timbang', action: 'CREATE', payload: weighing() }, deps({ timbang_isi: '5300.00', timbang_kosong: '2000.00' })),
    (error) => error.code === 'SPB_ALREADY_WEIGHED');
});

test('410 QR_V3_RETIRED gives a clear message, is kept as a conflict, and typing the SPB number turns the item into an SPB weighing', async () => {
  const processItem = processor();
  const qrItem = { id: 'w3', module: 'krani_timbang', action: 'CREATE', payload: { qr_payload: 'V3|c|t|10|1|sig', nama_supir: 'A', nomor_kendaraan: 'BK 1', tujuan_kirim: 'PKS', timbang_isi: 5200, timbang_kosong: 2000 } };
  let saved;
  await assert.rejects(processItem(qrItem, {
    staging: { submitPayload: async () => { throw apiError(410, { code: 'QR_V3_RETIRED' }); } },
    updateQueuePayload: async (_id, value) => { saved = value; },
  }), (error) => error.status === 410 && /nomor SPB/.test(error.message));
  assert.equal(saved.conflict.code, 'QR_V3_RETIRED');
  assert.equal(trip.resolveSpbConflict(saved, {}), null, 'no fix without an SPB number');
  const fixed = trip.resolveSpbConflict(saved, { nomor_spb: ' 0012345 ' });
  assert.equal(fixed.nomor_spb, '0012345');
  assert.equal(fixed.qr_payload, undefined);
  assert.equal(fixed.conflict, undefined);
  assert.equal(fixed.timbang_isi, 5200);
});

test('a plain 409 such as a replayed QR is not an SPB conflict and is rethrown as it was', async () => {
  const processItem = processor();
  const error = apiError(409, { code: 'DUPLICATE_TRANSACTION' });
  assert.equal(trip.spbConflictOf(error), null);
  assert.equal(trip.spbConflictOf(apiError(409, { error: 'Trip number already used in this organization' })), null);
  assert.equal(trip.spbConflictOf(apiError(500, { code: 'SPB_ALREADY_WEIGHED' })), null);
  await assert.rejects(processItem({ id: 'w4', module: 'krani_timbang', action: 'CREATE', payload: weighing() },
    { staging: { submitPayload: async () => { throw error; } }, updateQueuePayload: async () => { throw new Error('must not save'); } }),
    (thrown) => thrown === error);
});

test('conflict messages name the SPB and say what to do', () => {
  assert.match(trip.spbConflictText({ code: 'SPB_ALREADY_WEIGHED' }, '77'), /SPB 77 sudah ditimbang/);
  assert.match(trip.spbConflictText({ code: 'SPB_TICKET_EXISTS' }, '77'), /SPB 77 sudah memiliki tiket/);
  assert.match(trip.spbConflictText({ code: 'TICKET_NUMBER_TAKEN' }), /nomor tiket/i);
  assert.match(trip.spbConflictText({ code: 'QR_V3_RETIRED' }), /nomor SPB/);
});

test('menunggu SPB: the 202 body is recognised and the waiting list shows pending and failed SPB logs only', () => {
  assert.equal(trip.isMenungguSpb({ menunggu_spb: true, nomor_spb: '1' }), true);
  assert.equal(trip.isMenungguSpb({ reconciled: true }), false);
  assert.equal(trip.isMenungguSpb(null), false);
  const log = (over) => ({ id: 'i', unique_transaction_id: '1', nomor_spb: '1', status: 'PENDING', error_message: null, created_at: '2026-09-30T00:00:00Z', ...over });
  const rows = trip.waitingSpbRows([
    log({ id: 'a' }),
    log({ id: 'b', unique_transaction_id: 'PKS|1' }),
    log({ id: 'c', status: 'FAILED', error_message: 'Nomor tiket sudah dipakai' }),
    log({ id: 'd', status: 'MATCHED' }),
    log({ id: 'e', nomor_spb: null }),
  ]);
  assert.deepEqual(rows.map((row) => [row.id, row.kind, row.failed]), [['a', 'TIMBANGAN', false], ['b', 'TIKET', false], ['c', 'TIMBANGAN', true]]);
  assert.equal(rows[2].message, 'Nomor tiket sudah dipakai');
});

// ---- jembatan_timbang flag -------------------------------------------------------
const React = require('react');
const { act, create } = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;

const orgConfig = load('services/org-config.service.ts', { './api': { apiClient: {} } });
function gateWith(state) {
  // useOrgSetting is the real one, fed by a mocked useQuery, so the default and the flag are both exercised.
  const hooks = load('hooks/useOrgConfig.ts', {
    '@tanstack/react-query': { useQuery: () => state },
    '@/services/org-config.service': orgConfig,
  });
  return load('components/krani/WeighbridgeGate.tsx', {
    react: React,
    'expo-router': { Redirect: 'Redirect' },
    '@/hooks/useModuleGroup': { useModuleGroup: () => '(krani)' },
    '@/hooks/useOrgConfig': hooks,
  }).WeighbridgeGate;
}
async function render(Gate) {
  let tree;
  await act(async () => { tree = create(React.createElement(Gate, null, React.createElement('Weighbridge'))); });
  const json = JSON.stringify(tree.toJSON());
  await act(async () => { tree.unmount(); });
  return json;
}

test('jembatan_timbang = true shows the weighbridge screens', async () => {
  const out = await render(gateWith({ isLoading: false, data: { bjr: 15, jembatan_timbang: true } }));
  assert.match(out, /Weighbridge/);
  assert.doesNotMatch(out, /Redirect/);
});

test('jembatan_timbang = false hides them and sends the Krani back to the Timbangan list', async () => {
  const gate = gateWith({ isLoading: false, data: { bjr: 15, jembatan_timbang: false } });
  let tree;
  await act(async () => { tree = create(React.createElement(gate, null, React.createElement('Weighbridge'))); });
  assert.equal(tree.root.findAllByType('Redirect')[0].props.href, '/(krani)/timbangan');
  assert.equal(tree.root.findAllByType('Weighbridge').length, 0);
  await act(async () => { tree.unmount(); });
});

test('a config that never loaded falls back to the server default (off); while loading nothing flashes', async () => {
  assert.match(await render(gateWith({ isLoading: false, data: undefined })), /Redirect/);
  assert.equal(await render(gateWith({ isLoading: true, data: undefined })), 'null');
});

test('the Timbangan list hides the scan entry without a weighbridge but always offers the mill ticket', () => {
  const source = fs.readFileSync('components/krani/KraniTimbangHistory.tsx', 'utf8');
  assert.match(source, /policy\.create && weighbridge && <FAB/);
  assert.match(source, /policy\.create && <Button title="Input tiket PKS \(nomor SPB\)"/);
  const quick = fs.readFileSync('components/home/QuickActions.tsx', 'utf8');
  assert.match(quick, /needsWeighbridge: true/);
  assert.match(quick, /weighbridge \|\| !action\.needsWeighbridge/);
});

// ---- the SPB-number weighing form --------------------------------------------------
async function weighingForm({ online = true, submit }) {
  const alerts = []; const queued = [];
  const Screen = load('components/krani/TimbanganSpbScreen.tsx', {
    react: React,
    'react-native': { Alert: { alert: (...args) => alerts.push(args) }, KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: 'android' },
      ScrollView: 'ScrollView', Text: 'Text', View: 'View' },
    'expo-router': { useRouter: () => ({ dismissTo: () => {} }) },
    '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: async () => {} }) },
    '@/components/core/Button': { Button: 'Button' }, '@/components/form': { FormField: 'FormField' }, '@/components/home': { PageHeader: 'PageHeader' },
    '@/constants/Colors': { BrandColors: {} },
    '@/hooks/useModuleGroup': { useModuleGroup: () => '(krani)' },
    '@/hooks/useOperationalPolicy': { useOperationalPolicy: () => ({ create: true }) },
    '@/services/staging.service': { stagingApi: { submitPayload: submit ?? (async () => ({})) } },
    '@/stores/useNetworkStore': { useNetworkStore: { getState: () => ({ isOnline: online }) } },
    '@/stores/useSyncQueueStore': { useSyncQueueStore: { getState: () => ({ queue: [], addToQueue: async (item) => { queued.push(item); } }) } },
    '@/utils/trip': trip,
  }).default;
  let tree;
  await act(async () => { tree = create(React.createElement(Screen, { nomorSpb: '0012345' })); });
  const field = (label) => tree.root.findAllByType('FormField').find((node) => node.props.label === label);
  await act(async () => { field('Timbang Isi (Gross) - kg').props.onChangeText('5.200'); field('Timbang Kosong (Tare) - kg').props.onChangeText('2000'); });
  const press = async () => act(async () => { await tree.root.findAllByType('Button').find((node) => node.props.title === 'Simpan Timbangan').props.onPress(); });
  return { alerts, queued, press, tree };
}

test('SPB-number weighing form sends nomor_spb with the two weights, and shows Menunggu SPB on 202', async () => {
  let posted;
  const form = await weighingForm({ submit: async (data) => { posted = data; return { menunggu_spb: true, nomor_spb: '0012345', staging_id: 's' }; } });
  await form.press();
  assert.equal(posted.nomor_spb, '0012345');
  assert.equal(posted.qr_payload, undefined);
  assert.equal(posted.timbang_isi, 5200);
  assert.equal(posted.timbang_kosong, 2000);
  assert.ok(posted.weighed_at);
  assert.equal(form.alerts[0][0], 'Menunggu SPB');
});

test('SPB-number weighing form: 409 and 410 explain themselves, nothing is queued silently', async () => {
  for (const [status, code, pattern] of [[409, 'SPB_ALREADY_WEIGHED', /sudah ditimbang/], [410, 'QR_V3_RETIRED', /nomor SPB/]]) {
    const form = await weighingForm({ submit: async () => { throw apiError(status, { code }); } });
    await form.press();
    assert.match(form.alerts[0][1], pattern);
    assert.equal(form.queued.length, 0);
  }
});

test('SPB-number weighing form queues offline and on a lost connection, and rejects gross not above tare', async () => {
  const offline = await weighingForm({ online: false });
  await offline.press();
  assert.equal(offline.queued[0].module, 'krani_timbang');
  assert.equal(offline.queued[0].endpoint, '/staging/krani-timbang');
  assert.equal(offline.queued[0].payload.nomor_spb, '0012345');
  const dropped = await weighingForm({ submit: async () => { throw new Error('Network Error'); } });
  await dropped.press();
  assert.equal(dropped.queued.length, 1);
  const bad = await weighingForm({});
  await act(async () => { bad.tree.root.findAllByType('FormField').find((node) => node.props.label === 'Timbang Kosong (Tare) - kg').props.onChangeText('9000'); });
  assert.equal(bad.tree.root.findAllByType('Button').find((node) => node.props.title === 'Simpan Timbangan').props.disabled, true);
});
