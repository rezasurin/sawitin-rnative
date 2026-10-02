// Run with: node --test scripts/check-close-policy.cjs
// Daily close (tutup harian): online-only, blocking exceptions, notes, self-approval, DAY_CLOSED.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { create, act } = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;

function load(file, mocks = {}) {
  const exports = {};
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(compiled, { exports, require: (name) => mocks[name] ?? require(name), console, Error, Date, Math, JSON, Object, Set, Map, Promise });
  return exports;
}
const plain = (value) => JSON.parse(JSON.stringify(value));

const close = load('utils/close.ts');
const trip = load('utils/trip.ts');
const support = load('utils/sync-support.ts');

// --- fixtures -------------------------------------------------------------
const tph = (extra = {}) => ({
  tph_id: 't1', nama: 'TPH 1', blok_id: 'b1', panen_janjang: 100, panen_brondol_kg: 10, langsung_janjang: 70, langsung_brondol_kg: 7,
  titip_janjang: 0, restan_usulan_janjang: 30, restan_usulan_brondol_kg: 3, restan_hitung_janjang: null, restan_hitung_brondol_kg: null, selisih_janjang: 0, ...extra,
});
const exception = (code, severity, id, extra = {}) => ({ code, severity, key: `${code}:${id}`, message: `${code} ${id}`, ref: {}, catatan: null, ...extra });
const preview = (extra = {}) => ({
  source: 'LIVE', kelompok_lahan_id: 'f1', tanggal: '2026-09-30', batas_approval_at: '2026-10-01T05:00:00.000Z', terlambat: false,
  tutup_harian: null, tph: [tph()], restan_diambil: [], trips: [], restan: [], brondol: [], exceptions: [],
  ringkasan: { blocking: 0, perlu_catatan: 0, bisa_diajukan: true }, ...extra,
});
const blockedPreview = () => preview({
  exceptions: [exception('PANEN_NOT_SUBMITTED', 'BLOCKING', 'p1', { message: 'Ada BKM Panen yang belum diajukan atau sedang direvisi' })],
  ringkasan: { blocking: 1, perlu_catatan: 0, bisa_diajukan: false },
});
const notedPreview = () => preview({
  exceptions: [exception('TRIP_NOT_WEIGHED', 'NOTE', 'trip-1', { message: 'SPB 001 belum ditimbang' })],
  ringkasan: { blocking: 0, perlu_catatan: 1, bisa_diajukan: true },
});
const submitted = (by = 'U1') => preview({ tutup_harian: { id: 'c1', status: 'SUBMITTED', submitted_by: by, catatan: null, rejection_note: null }, terlambat: true });

// --- pure rules -----------------------------------------------------------
const block = (p, over = {}) => close.submitBlock({ online: true, preview: p, counts: close.initialCounts(p.tph), notes: {}, tolerancePct: 2, ...over });

test('online-only: offline disables submit with the contract message, even for a clean preview', () => {
  assert.equal(close.CLOSE_OFFLINE_TEXT, 'Tutup harian butuh koneksi');
  assert.equal(block(preview(), { online: false }), 'Tutup harian butuh koneksi');
  assert.equal(block(preview()), null);
});

test('a blocking exception disables submit and says why', () => {
  assert.match(block(blockedPreview()), /belum diajukan atau sedang direvisi/);
  // the server flag alone is enough
  assert.match(block(preview({ ringkasan: { blocking: 0, perlu_catatan: 0, bisa_diajukan: false } })), /DRAFT/);
});

test('every needs-a-note exception needs a note before submit', () => {
  const p = notedPreview();
  assert.match(block(p), /Isi catatan untuk 1 pengecualian/);
  assert.match(block(p, { notes: { 'TRIP_NOT_WEIGHED:trip-1': '   ' } }), /Isi catatan/);
  assert.equal(block(p, { notes: { 'TRIP_NOT_WEIGHED:trip-1': 'Timbangan rusak' } }), null);
  // a note already filed on the server counts
  const filed = preview({ exceptions: [exception('TRIP_NOT_WEIGHED', 'NOTE', 'trip-1', { catatan: 'Sudah' })] });
  assert.equal(block(filed), null);
});

test('changing the restan count adds the notes the server will ask for', () => {
  const p = preview();
  const counts = close.initialCounts(p.tph);
  assert.deepEqual(plain(counts), { t1: { janjang: '30', brondol: '3' } }, 'default is the computed remainder');
  counts.t1.janjang = '25';
  const keys = plain(close.noteItems(p, counts, 2).map((item) => item.key).sort());
  assert.deepEqual(keys, ['RESTAN_DIFFERENCE:t1', 'TPH_BALANCE:t1']);
  const body = close.submitPayload(p, counts, { 'RESTAN_DIFFERENCE:t1': 'Jatuh', 'TPH_BALANCE:t1': 'Jatuh' }, 2, ' ok ');
  assert.deepEqual(plain(body), {
    kelompok_lahan_id: 'f1', tanggal: '2026-09-30', restan: [{ tph_id: 't1', jumlah_janjang: 25, jumlah_brondol: 3 }], catatan: 'ok',
    catatan_pengecualian: { 'RESTAN_DIFFERENCE:t1': 'Jatuh', 'TPH_BALANCE:t1': 'Jatuh' },
  });
  counts.t1.janjang = '2.5';
  assert.equal(close.countRows(counts, p.tph), null);
  assert.match(block(p, { counts }), /bilangan bulat/);
});

test('a submitted or approved close cannot be submitted again; the contract 409s explain themselves', () => {
  assert.match(block(submitted()), /sudah diajukan/);
  assert.match(block(preview({ tutup_harian: { status: 'APPROVED' } })), /membuka kembali/);
  const failure = (status, code, extra = {}) => close.closeFailure({ status, message: 'x', data: { code, ...extra } });
  assert.match(failure(409, 'CLOSE_ALREADY_SUBMITTED').text, /sudah diajukan/);
  assert.match(failure(409, 'CLOSE_ALREADY_APPROVED').text, /membuka kembali/);
  assert.match(failure(409, 'RESTAN_COLLECTED').text, /diambil truk/);
  assert.match(failure(409, 'CLOSE_BLOCKED', { exceptions: [{ message: 'masih ada dokumen DRAFT' }] }).text, /masih ada dokumen DRAFT/);
  assert.equal(failure(409, 'CLOSE_NOT_SUBMITTED').refetch, true);
  assert.deepEqual(plain(failure(400, 'NOTE_REQUIRED', { missing: ['TBM_HARVEST:p1'] }).missing), ['TBM_HARVEST:p1']);
});

test('status labels and the late flag', () => {
  assert.deepEqual(['DRAFT', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED'].map(close.closeStatusLabel), ['Draft', 'Diajukan', 'Disetujui', 'Ditolak']);
  assert.equal(close.closeStatusLabel(null), 'Draft');
  // 12:00 WIB on 2026-10-01 is 05:00Z
  assert.equal(close.pastDeadline('2026-09-30', 12, 'Asia/Jakarta', Date.parse('2026-10-01T04:59:00Z')), false);
  assert.equal(close.pastDeadline('2026-09-30', 12, 'Asia/Jakarta', Date.parse('2026-10-01T05:01:00Z')), true);
});

test('self-approval: the submitter is recognised by user code; other people are not', () => {
  assert.equal(close.isOwnClose(submitted('U1'), 'U1'), true);
  assert.equal(close.isOwnClose(submitted('U1'), 'U2'), false);
  assert.equal(close.isOwnClose(preview(), 'U1'), false);
  assert.equal(close.isOwnClose(submitted('U1'), undefined), false);
});

test('per-document approve is retired for Panen and trips; an old single-TPH Checker keeps it until the window ends', () => {
  const before = Date.parse('2026-12-01T00:00:00Z');
  const after = Date.parse('2027-01-01T00:00:00Z');
  assert.equal(close.approvesViaClose('bkmPanen', { tph_id: 'x' }, before), true);
  assert.equal(close.approvesViaClose('bkmChecker', { tph_id: null }, before), true, 'a trip has no header TPH');
  assert.equal(close.approvesViaClose('bkmChecker', { tph_id: 'tph-1' }, before), false);
  assert.equal(close.approvesViaClose('bkmChecker', { tph_id: 'tph-1' }, after), true, 'window over');
  assert.equal(close.approvesViaClose('bkmRawat', {}, before), false);
});

// --- screens --------------------------------------------------------------
const env = { online: true, preview: null, user: { user_code: 'U2' }, permissions: true, submitted: [], approved: [], rejected: [], refetches: 0, approveError: null };
const alerts = [];
const rn = {
  StyleSheet: { create: (value) => value },
  Alert: { alert: (...args) => alerts.push(args) },
  ...Object.fromEntries(['ActivityIndicator', 'ScrollView', 'Text', 'TextInput', 'View', 'FlatList', 'RefreshControl', 'TouchableOpacity', 'Button'].map((name) => [name, name])),
};
const query = () => ({ data: env.preview, isLoading: false, isError: false, isRefetching: false, refetch: async () => { env.refetches++; } });
const sharedMocks = () => ({
  'react-native': rn,
  'expo-router': { useRouter: () => ({ back() {}, push() {} }), useLocalSearchParams: () => ({ id: 'c1' }) },
  '@tanstack/react-query': { useQueryClient: () => ({ setQueryData() {}, invalidateQueries: async () => {} }) },
  '@/components/home': { PageHeader: 'PageHeader' },
  '@/components/core/Button': { Button: 'Button' },
  '@/components/core/Badge': { Badge: 'Badge' },
  '@/components/form': { FormDateField: 'FormDateField', FormSelect: 'FormSelect' },
  '@/constants/Colors': { BrandColors: {} },
  '@/hooks/useKelompokLahan': { useKelompokLahanList: () => ({ data: { data: [] } }) },
  '@/hooks/useOrgConfig': { useOrgSetting: (key) => ({ discrepancy_tolerance_pct: 2, batas_approval_jam: 12, timezone: 'Asia/Jakarta' })[key] },
  '@/hooks/useTutupHarian': { useClosePreview: query, useCloseDetail: query, usePendingCloses: query },
  '@/services/tutup-harian.service': { tutupHarianApi: {
    submit: async (body) => { env.submitted.push(plain(body)); return env.preview; },
    approve: async () => { if (env.approveError) throw env.approveError; env.approved.push(true); return env.preview; },
    reject: async (id, note) => { env.rejected.push(note); return env.preview; },
  } },
  '@/services/queryKeys': { tutupHarianKeys: { preview: () => ['p'], detail: () => ['d'], pending: () => ['l'] } },
  '@/stores/useAuthStore': { useAuthStore: Object.assign((selector) => selector({ hasPermission: () => env.permissions }), { getState: () => ({}) }) },
  '@/stores/useNetworkStore': { useNetworkStore: (selector) => selector({ isOnline: env.online }) },
  '@/utils/close': close,
  '@/utils/estateDate': load('utils/estateDate.ts'),
});
const mocks = sharedMocks();
const { ClosePreview, Section } = load('components/close/ClosePreview.tsx', mocks);
mocks['@/components/close/ClosePreview'] = { ClosePreview, Section };
const Mandor = load('components/close/TutupHarianScreen.tsx', mocks).default;
const { CloseDetailScreen } = load('components/close/AsistenCloseScreens.tsx', {
  ...mocks,
  '@/stores/useAuthStore': { useAuthStore: () => ({ hasPermission: () => env.permissions, user: env.user }) },
});

const render = async (element) => { let tree; await act(async () => { tree = create(element); }); return tree; };
const button = (tree, title) => tree.root.findAllByType('Button').find((b) => b.props.title === title);
const typeInto = async (tree, label, text) => act(async () => tree.root.findAll((n) => n.props.accessibilityLabel === label)[0].props.onChangeText(text));
const texts = (tree) => JSON.stringify(tree.toJSON());

test('Mandor screen offline: message shown, form disabled, nothing queued', async () => {
  Object.assign(env, { online: false, preview: preview(), submitted: [] });
  const tree = await render(React.createElement(Mandor));
  assert.match(texts(tree), /Tutup harian butuh koneksi/);
  assert.equal(button(tree, 'Ajukan tutup harian'), undefined, 'no preview, so no submit button to press offline');
  assert.equal(tree.root.findAllByType('TextInput').length, 0);
  assert.deepEqual(env.submitted, []);
  await act(async () => tree.unmount());
});

test('Mandor screen: blocking disables submit and explains; notes gate it; then it submits the count and notes', async () => {
  Object.assign(env, { online: true, preview: blockedPreview(), submitted: [] });
  let tree = await render(React.createElement(Mandor));
  assert.equal(button(tree, 'Ajukan tutup harian').props.disabled, true);
  assert.match(texts(tree), /belum diajukan atau sedang direvisi/);
  await act(async () => tree.unmount());

  Object.assign(env, { preview: notedPreview() });
  tree = await render(React.createElement(Mandor));
  assert.equal(button(tree, 'Ajukan tutup harian').props.disabled, true);
  assert.match(texts(tree), /Isi catatan untuk 1 pengecualian/);
  await typeInto(tree, 'Catatan TRIP_NOT_WEIGHED:trip-1', 'Timbangan rusak');
  assert.equal(button(tree, 'Ajukan tutup harian').props.disabled, false);
  await act(async () => button(tree, 'Ajukan tutup harian').props.onPress());
  await act(async () => alerts.at(-1)[2][1].onPress());
  assert.deepEqual(env.submitted.map((b) => [b.restan, b.catatan_pengecualian]), [[
    [{ tph_id: 't1', jumlah_janjang: 30, jumlah_brondol: 3 }], { 'TRIP_NOT_WEIGHED:trip-1': 'Timbangan rusak' },
  ]]);
  assert.match(texts(tree), /sudah bisa diambil truk/);
  await act(async () => tree.unmount());
});

test('Mandor screen: editing the restan count asks for a note on the difference', async () => {
  Object.assign(env, { online: true, preview: preview(), submitted: [] });
  const tree = await render(React.createElement(Mandor));
  assert.equal(button(tree, 'Ajukan tutup harian').props.disabled, false);
  await typeInto(tree, 'Restan janjang TPH 1', '25');
  assert.equal(button(tree, 'Ajukan tutup harian').props.disabled, true);
  await typeInto(tree, 'Catatan RESTAN_DIFFERENCE:t1', 'Jatuh');
  await typeInto(tree, 'Catatan TPH_BALANCE:t1', 'Jatuh');
  assert.equal(button(tree, 'Ajukan tutup harian').props.disabled, false);
  await act(async () => tree.unmount());
});

test('Asisten detail hides approve on the close the user submitted; reject needs a reason', async () => {
  Object.assign(env, { online: true, preview: submitted('U1'), user: { user_code: 'U1' }, approved: [], rejected: [] });
  let tree = await render(React.createElement(CloseDetailScreen));
  assert.equal(button(tree, 'Setujui'), undefined, 'own close: no approve');
  assert.match(texts(tree), /tidak dapat menyetujuinya/);
  assert.match(texts(tree), /Terlambat/, 'late flag shown');
  assert.equal(button(tree, 'Tolak').props.disabled, true);
  await typeInto(tree, 'Alasan penolakan', 'Hitung ulang');
  assert.equal(button(tree, 'Tolak').props.disabled, false);
  await act(async () => tree.unmount());

  env.user = { user_code: 'U2' };
  tree = await render(React.createElement(CloseDetailScreen));
  assert.equal(button(tree, 'Setujui').props.disabled, false);
  await act(async () => tree.unmount());

  env.preview = { ...submitted('U1'), exceptions: blockedPreview().exceptions };
  tree = await render(React.createElement(CloseDetailScreen));
  assert.equal(button(tree, 'Setujui').props.disabled, true, 'a blocker sent back since the submit stops approval');
  await act(async () => tree.unmount());
});

test('Asisten approve: a concurrent-approve 409 refetches and explains', async () => {
  Object.assign(env, { online: true, preview: submitted('U1'), user: { user_code: 'U2' }, refetches: 0,
    approveError: Object.assign(new Error('x'), { status: 409, data: { code: 'CLOSE_NOT_SUBMITTED' } }) });
  const tree = await render(React.createElement(CloseDetailScreen));
  await act(async () => button(tree, 'Setujui').props.onPress());
  await act(async () => alerts.at(-1)[2][1].onPress());
  assert.equal(env.refetches, 1);
  assert.match(alerts.at(-1)[1], /sudah diproses orang lain/);
  env.approveError = Object.assign(new Error('x'), { status: 409, data: { code: 'CLOSE_BLOCKED', exceptions: [{ message: 'SPB 1 minta revisi' }] } });
  await act(async () => button(tree, 'Setujui').props.onPress());
  await act(async () => alerts.at(-1)[2][1].onPress());
  assert.equal(env.refetches, 2);
  assert.match(alerts.at(-1)[1], /SPB 1 minta revisi/);
  env.approveError = null;
  await act(async () => tree.unmount());
});

test('the Panen, trip and old-shape approve buttons on a submitted document', async () => {
  const policy = load('utils/operational-policy.ts').operationalPolicy('SUBMITTED', { approve: true, read: true }, true, 1);
  const { OperationalActions } = load('components/bkm/OperationalActions.tsx', {
    'react-native': { Text: 'Text', TextInput: 'TextInput', View: 'View', Button: 'Button', Alert: { alert() {} } },
    '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: async () => {} }) },
    '@/services/api': { apiClient: {} },
    '@/services/operational.service': { requireOnline: () => {} },
    '@/services/database': { lookupCacheDb: {} },
    '@/stores/useAuthStore': {},
    '@/hooks/useOperationalPolicy': { useOperationalPolicy: () => policy },
    '@/utils/close': close,
    '@/stores/useNetworkStore': { useNetworkStore: { getState: () => ({ isOnline: true }) } },
    '@/stores/useSyncQueueStore': { useSyncQueueStore: { getState: () => ({ queue: [] }) } },
  });
  const titles = async (module, doc) => {
    const tree = await render(React.createElement(OperationalActions, { module, document: { id: 'd', status: 'SUBMITTED', details: [{}], ...doc } }));
    const names = tree.root.findAllByType('Button').map((b) => b.props.title);
    await act(async () => tree.unmount());
    return names;
  };
  const panen = await titles('bkmPanen', {});
  assert.equal(panen.includes('Setujui'), false);
  assert.equal(panen.includes('Minta revisi'), true, 'request-revision stays');
  assert.equal((await titles('bkmChecker', { tph_id: null })).includes('Setujui'), false);
  assert.equal((await titles('bkmChecker', { tph_id: null })).includes('Minta revisi'), true);
  assert.equal((await titles('bkmChecker', { tph_id: 'tph-1' })).includes('Setujui'), true, 'old shape keeps approve');
});

// --- DAY_CLOSED on queued items ------------------------------------------
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
const { classify } = load('services/sync-errors.ts', { axios: { isAxiosError: () => false } });
const dayClosed = () => Object.assign(new Error('Hari ditutup'), { status: 409, data: { error: 'Hari ditutup', code: 'DAY_CLOSED', tutup_harian_id: 'c1', tanggal: '2026-09-30' } });

async function dayClosedFor(item, apis) {
  const persisted = [];
  const deps = { ...apis, updateQueuePayload: async (_id, payload) => { persisted.push(payload); }, panenState: async () => null };
  const error = await processItem(item, deps).then(() => assert.fail('should not succeed'), (reason) => reason);
  return { error, persisted };
}

test('DAY_CLOSED on a queued Panen is kept as a resolvable conflict, never dropped or retried blind', async () => {
  const payload = { header: { blok_id: 'b1', tanggal_laporan: '2026-09-30' }, details: [] };
  const { error, persisted } = await dayClosedFor({ id: 'q1', module: 'bkm_panen', action: 'CREATE', payload },
    { panenApi: { create: async () => { throw dayClosed(); } } });
  assert.equal(error.message, 'Hari sudah ditutup — minta Asisten membuka kembali');
  assert.equal(error.status, 409);
  assert.deepEqual(plain(persisted[0].conflict), { code: 'DAY_CLOSED' });
  assert.deepEqual(plain(persisted[0].header), payload.header, 'the work on the phone is untouched');
  // 409 -> a conflict that waits for a person: not RETRYABLE, not discarded
  assert.deepEqual(plain(classify(error, 0, 5)), { errorClass: 'CONFLICT', dead: true, message: error.message });
  // once the Asisten reopens the day, "kirim ulang" sends the same payload without the stale conflict
  assert.deepEqual(plain(trip.resolveTripConflict(persisted[0])), plain(payload));
});

test('DAY_CLOSED on a queued trip line or submit, and on an old-shape Checker, is the same conflict', async () => {
  const tripPayload = { header: { nomor_spb: '001', dispatched_at: '2026-09-30T01:00:00Z' }, details: [{ client_detail_id: 'a', tph_id: 't1' }] };
  const { error, persisted } = await dayClosedFor({ id: 'q2', module: 'bkm_checker', action: 'CREATE', payload: tripPayload }, { checkerApi: {
    create: async () => ({ id: 'srv', status: 'DRAFT', details: [] }), getById: async () => ({ id: 'srv', status: 'DRAFT', details: [] }),
    addDetail: async () => { throw dayClosed(); },
  } });
  assert.equal(error.message, 'Hari sudah ditutup — minta Asisten membuka kembali');
  assert.equal(persisted.at(-1).conflict.code, 'DAY_CLOSED');
  assert.equal(persisted.at(-1).server_id, 'srv', 'the server draft is remembered, so the retry reuses it');

  const old = await dayClosedFor({ id: 'q3', module: 'bkm_checker', action: 'CREATE', payload: { header: { tph_id: 't1' }, details: [] } },
    { checkerApi: { create: async () => { throw dayClosed(); } } });
  assert.equal(old.persisted[0].conflict.code, 'DAY_CLOSED');

  const submit = await dayClosedFor({ id: 'q4', module: 'bkm_checker', action: 'UPDATE', payload: { id: 'srv', data: { status: 'SUBMITTED' } } },
    { checkerApi: { update: async () => { throw dayClosed(); } } });
  assert.equal(submit.persisted[0].conflict.code, 'DAY_CLOSED');
  assert.equal(submit.error.status, 409);
});

test('a 409 that is not DAY_CLOSED keeps its own handling', async () => {
  const other = Object.assign(new Error('x'), { status: 409, data: { code: 'SOMETHING_ELSE' } });
  const { error, persisted } = await dayClosedFor({ id: 'q5', module: 'bkm_panen', action: 'CREATE', payload: { header: {}, details: [] } },
    { panenApi: { create: async () => { throw other; } } });
  assert.equal(error, other);
  assert.deepEqual(persisted, []);
});
