const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, require: (name) => mocks[name] ?? require(name), console, JSON, Date, Error });
  return exports;
}

const plantation = load('utils/plantation.ts');
const lands = [
  { id: 'valid', nama: 'Parcel', blok_id: 'b', user_pic_id: null, luas_lahan: null, nama_dokumen: null, maturitas: null, umur_tanam: null },
  { id: 'unassigned', nama: 'Unassigned', blok_id: null },
  { id: 'other', nama: 'Other block', blok_id: 'other' },
];
const tphs = lands.map((land) => ({ id: `tph-${land.id}`, lahan_id: land.id, nama: land.nama }));
const ids = (rows) => Array.from(rows, (row) => row.id);

test('operational sources require a matching block, never a PIC or land documents', () => {
  assert.deepEqual(ids(plantation.operationalLands(lands, 'b')), ['valid']);
  assert.deepEqual(ids(plantation.operationalLands(lands, '')), []);
  assert.deepEqual(ids(plantation.operationalTphs(tphs, lands, 'b')), ['tph-valid']);
  assert.deepEqual(ids(plantation.operationalTphs(tphs, lands, 'b', 'unassigned')), []);
  assert.deepEqual(ids(plantation.operationalTphs(tphs, [], 'b')), []);
});

test('agronomy labels preserve unknown and zero ages and never derive maturity', () => {
  assert.equal(plantation.agronomyLabel(lands[0]), 'Parcel · — · —');
  assert.equal(plantation.agronomyLabel({ nama: 'Old cache', tahun_tanam: 2000 }), 'Old cache · — · —');
  assert.equal(plantation.agronomyLabel({ nama: 'B', maturitas: 'TBM', umur_tanam: 0 }), 'B · TBM · 0 th');
  assert.equal(plantation.agronomyLabel({ nama: 'B', maturitas: 'TM', umur_tanam: 11, tahun_tanam: 1900 }), 'B · TM · 11 th');
});

test('actual SQLite JSON parser preserves sparse and older records after close/reopen offline', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'plantation-cache-'));
  const filename = path.join(directory, 'cache.db');
  let raw;
  function open() {
    raw = new DatabaseSync(filename);
    const api = {
      execAsync: async (sql) => raw.exec(sql),
      runAsync: async (sql, params = []) => raw.prepare(sql).run(...params),
      getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
      getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    };
    return load('services/database.ts', { 'expo-sqlite': { openDatabaseAsync: async () => api } }).lookupCacheDb;
  }
  const pages = {
    kelompokLahan: { data: [{ id: 'farm', geometry: { type: 'MultiPolygon', coordinates: [[[[110, 0], [111, 0], [111, 1], [110, 0]]]] } }] },
    tph: { data: [{ id: 'unmapped', geometry: null, basis_jjg_perhari: 0, basis_jjg_perbulan: 0 }, { id: 'point', geometry: { type: 'Point', coordinates: [110, -1] } }] },
    member: { data: [{ id: 'owner', nama: 'Owner', kode: 'KTJ.1' }, { id: 'old-owner', nama: 'Legacy' }] },
    blok: { data: [{ id: 'b', nama: 'B', luas_blok: null, luas_planted: null, luas_unplanted: null, jumlah_pokok: null, tahun_tanam: null, tahun_panen: null, varietas: null, umur_tanam: null, maturitas: null }, { id: 'old', luas_blok: 12, tahun_tanam: 2010 }, { id: 'server', tahun_tanam: 1900, maturitas: 'TM', umur_tanam: 11 }] },
    lahan: { data: [{ ...lands[0], nama_pemilik: null, alamat: null, tipe_dokumen: null, tanggal_dokumen: null, status_pemilik: null, koordinat_lokasi: null, tahun_tanam: null, jumlah_pokok: null, varietas: null }] },
    pekerja: { data: [{ id: 'p', join_date: null, member: { nama: 'Owner', kode: 'KTJ.1', phone_number: null, address: null, birth_date: null, join_date: null } }] },
  };
  pages.blok.data[0].geometry = null;
  pages.lahan.data[0].geometry = { type: 'Polygon', coordinates: [[[110, 0], [111, 0], [111, 1], [110, 0]]] };
  const { readThroughCache, masterCacheKey } = load('services/master-cache.ts');
  try {
    let cache = open();
    const deps = () => ({ getUserId: () => 'u', save: cache.save, read: cache.get });
    for (const [resource, page] of Object.entries(pages)) {
      await readThroughCache(deps(), resource, { limit: 200 }, async () => page);
    }
    assert.equal(masterCacheKey('u', 'blok', { limit: 200 }), 'u:blok:[["limit",200]]');
    raw.close();
    cache = open();
    const offline = async () => { throw new Error('offline'); };
    for (const [resource, page] of Object.entries(pages)) {
      assert.deepEqual(await readThroughCache(deps(), resource, { limit: 200 }, offline), page);
    }
    await assert.rejects(readThroughCache({ ...deps(), getUserId: () => 'other-user' }, 'lahan', { limit: 200 }, offline), /offline/);
  } finally {
    raw?.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

const native = { ScrollView: 'ScrollView', StyleSheet: { create: (s) => s } };
const controls = { FormSelect: 'FormSelect', FormField: 'FormField', FormDateField: 'FormDateField' };
function children(tree) { return tree.props.children.flat().filter(Boolean); }

test('Panen and Checker pickers exclude block-less sources and allow sparse parcels', () => {
  const header = { blok_id: 'b', lahan_id: 'valid', tph_id: 'tph-valid', tanggal_laporan: '2026-09-23' };
  const mocks = {
    'react-native': native,
    '@/components/form': controls,
    '@/components/core/Button': { Button: 'Button' },
    '@/utils/plantation': plantation,
    '@/services': {},
    './TphLocation': { TphLocation: 'TphLocation' },
    '@/services/bkm-panen.service': {},
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    '@/stores/useBkmPanenStore': { useBkmPanenStore: () => ({ header, setHeader: () => {} }) },
    '@/stores/useBkmCheckerStore': { useBkmCheckerStore: () => ({ header, setHeader: () => {} }) },
    '@tanstack/react-query': { useQuery: ({ queryKey }) => ({ data: { data: ({ blok: [{ id: 'b', nama: 'B' }], lahan: lands, tph: tphs })[queryKey[0]] ?? [] } }) },
  };
  const { BKMPanenFormStep1 } = load('components/mandor/BKMPanenFormStep1.tsx', mocks);
  const { BKMCheckerFormStep1 } = load('components/mandor/BKMCheckerFormStep1.tsx', mocks);
  for (const [Component, label, expected] of [[BKMPanenFormStep1, 'Lahan', 'valid'], [BKMCheckerFormStep1, 'TPH', 'tph-valid']]) {
    const nodes = children(Component({ onNext() {} }));
    assert.deepEqual(Array.from(nodes.find((n) => n.props.label === label).props.options, (o) => o.value), [expected]);
    assert.equal(nodes.find((n) => n.type === 'Button').props.disabled, false);
    header.blok_id = '';
    assert.equal(children(Component({ onNext() {} })).find((n) => n.props.label === label).props.options.length, 0);
    header.blok_id = 'b';
  }
});

test('Rawat submits a sparse parcel online and queues it offline with the same hierarchy', async () => {
  const React = require('react');
  const { act, create } = require('react-test-renderer');
  global.IS_REACT_ACT_ENVIRONMENT = true;
  for (const online of [true, false]) {
    const sent = [];
    const queued = [];
    const { BKMRawatForm } = load('components/mandor/BKMRawatForm.tsx', {
      'react-native': { ...native, View: 'View', KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: 'android' }, Alert: { alert() {} } },
      'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
      '@/components/form': controls, '@/components/core/Button': { Button: 'Button' },
      '@/utils/plantation': plantation,
      '@/hooks': {
        useKelompokLahanList: () => ({ data: { data: [{ id: 'estate', nama: 'Existing farm name' }] } }),
        useBlokList: () => ({ data: { data: [{ id: 'b', nama: 'B', kelompok_lahan_id: 'estate' }] } }),
        useLahanList: () => ({ data: online ? { data: lands } : undefined }),
      },
      '@/hooks/useBkmRawat': {
        useCreateBkmRawat: () => ({ mutate: (p) => sent.push(p) }),
        useBkmRawatLookups: () => ({ data: { lands } }),
      },
      '@/stores/useNetworkStore': { useNetworkStore: (selector) => selector({ isOnline: online }) },
      '@/stores/useSyncQueueStore': { useSyncQueueStore: (selector) => selector({ addToQueue: async (p) => { queued.push(p); return { id: 'q' }; } }) },
    });
    let tree;
    await act(async () => { tree = create(React.createElement(BKMRawatForm, { onSuccess() {} })); });
    const select = (label) => tree.root.findAllByType('FormSelect').find((n) => n.props.label === label);
    await act(async () => select('Kebun').props.onSelect('estate'));
    await act(async () => select('Blok').props.onSelect('b'));
    assert.deepEqual(Array.from(select('Lahan (Opsional)').props.options, (o) => o.value), ['', 'valid']);
    await act(async () => select('Lahan (Opsional)').props.onSelect('valid'));
    await act(async () => tree.root.findByType('FormField').props.onChangeText('Supervisor'));
    assert.equal(tree.root.findByType('Button').props.disabled, false);
    await act(async () => tree.root.findByType('Button').props.onPress());
    const payload = online ? sent[0] : queued[0].payload.header;
    assert.equal(payload.lahan_id, 'valid');
    assert.equal(payload.blok_id, 'b');
    assert.equal(payload.kelompok_lahan_id, 'estate');
    assert.equal('user_pic_id' in payload, false);
    assert.equal('geometry' in payload, false, 'untouched geometry must not be added to online or queued headers');
    if (!online) assert.equal(JSON.stringify(queued[0]).includes('"geometry"'), false);
    await act(async () => tree.unmount());
  }
});

test('person codes remain distinct from national IDs and zero TPH targets are unconfigured', () => {
  assert.equal(plantation.memberLabel({ nama: 'Owner', kode: 'KTJ.1', nik: 'private-id' }, 'fallback'), 'Owner (KTJ.1)');
  assert.equal(plantation.memberLabel({ nama: 'Owner', kode: null }, 'fallback'), 'Owner');
  assert.equal(plantation.memberLabel(undefined, 'worker-id'), 'worker-id');
  for (const value of [0, -1, null, undefined, NaN, Infinity]) assert.equal(plantation.configuredBasis(value), null);
  assert.equal(plantation.configuredBasis(100), 100);
  assert.match(plantation.tphLabel({ nama: 'TPH', basis_jjg_perhari: 0, basis_jjg_perbulan: 300 }), /Basis\/hari: belum diatur · Basis\/bulan: 300/);
});

test('geometry conversion preserves named coordinate order and distinguishes untouched from clear', () => {
  const point = plantation.pointFromLocation({ latitude: -1.2, longitude: 110.5 });
  assert.equal(JSON.stringify(point), '{"type":"Point","coordinates":[110.5,-1.2]}');
  assert.equal(JSON.stringify(plantation.geometryPatch()), '{}');
  assert.equal(JSON.stringify(plantation.geometryPatch(null)), '{"geometry":null}');
  assert.equal(plantation.geometryPatch(point).geometry, point);
  assert.throws(() => plantation.pointFromLocation({ latitude: 110.5, longitude: -1.2 }), /GPS/);
  assert.throws(() => plantation.pointFromLocation({ latitude: NaN, longitude: 0 }), /GPS/);
  assert.equal(plantation.geometryLabel({ geometry: null, koordinat_lokasi: [-1.2, 110.5] }), 'Koordinat lama perlu ditinjau');
  assert.equal(plantation.geometryLabel({ geometry: null }), 'Belum dipetakan');
  assert.match(plantation.geometryLabel({ geometry: point }), /-1.20000, 110.50000/);
});

test('plantation update services omit untouched geometry and preserve explicit replacement/clear', async () => {
  const sent = [];
  let online = true;
  let permitted = true;
  const mocks = {
    './api': { apiClient: { put: async (url, payload) => { sent.push({ url, payload: JSON.parse(JSON.stringify(payload)) }); return { data: payload }; } } },
    './database': { lookupCacheDb: {} },
    './master-cache': {},
    '@/utils/plantation': plantation,
    '@/stores/useAuthStore': { useAuthStore: { getState: () => ({ user: { id: 'u' }, hasPermission: (module, action) => permitted && module === 'mod_tph' && action === 'update' }) } },
    '@/stores/useNetworkStore': { useNetworkStore: { getState: () => ({ isOnline: online }) } },
  };
  for (const [file, api] of [['blok', 'blokApi'], ['lahan', 'lahanApi'], ['kelompok-lahan', 'kelompokLahanApi'], ['tph', 'tphApi']]) {
    const service = load(`services/${file}.service.ts`, mocks)[api];
    await service.update('id', { nama: 'Rename only' });
    assert.equal('geometry' in sent.at(-1).payload, false);
    await service.update('id', { geometry: null });
    assert.equal(sent.at(-1).payload.geometry, null);
    const polygon = { type: 'Polygon', coordinates: [[[110, 0], [111, 0], [111, 1], [110, 0]]] };
    await service.update('id', { geometry: polygon });
    assert.deepEqual(sent.at(-1).payload.geometry, polygon);
  }
  const { tphApi } = load('services/tph.service.ts', mocks);
  const location = { latitude: -1.2, longitude: 110.5 };
  await tphApi.updateLocation('tph-1', location);
  assert.deepEqual(sent.at(-1), { url: '/tph/tph-1', payload: { geometry: { type: 'Point', coordinates: [110.5, -1.2] } } });
  const count = sent.length;
  online = false;
  await assert.rejects(tphApi.updateLocation('tph-1', location), /internet/);
  online = true;
  permitted = false;
  await assert.rejects(tphApi.updateLocation('tph-1', location), /izin/);
  assert.equal(sent.length, count);
});

test('TPH location action needs permission, connectivity, GPS and explicit confirmation; errors stay visible', async () => {
  const React = require('react');
  const { act, create } = require('react-test-renderer');
  global.IS_REACT_ACT_ENVIRONMENT = true;
  let permitted = false;
  let online = true;
  let denied = false;
  let fail = false;
  const alerts = [];
  const writes = [];
  const invalidated = [];
  const auth = { user: { id: 'u' }, hasPermission: () => permitted };
  const useAuthStore = () => auth;
  useAuthStore.getState = () => auth;
  const { TphLocation } = load('components/mandor/TphLocation.tsx', {
    'react-native': { StyleSheet: native.StyleSheet, Alert: { alert: (...args) => alerts.push(args) } },
    '@/components/Themed': { Text: 'Text', View: 'View' },
    '@/components/core/Button': { Button: 'Button' },
    '@/hooks/useLocation': { useLocation: () => ({ loading: false, error: denied ? 'Izin lokasi ditolak' : null, captureLocation: async () => denied ? null : { latitude: -1, longitude: 110 } }) },
    '@/stores/useAuthStore': { useAuthStore },
    '@/stores/useNetworkStore': { useNetworkStore: (select) => select({ isOnline: online }) },
    '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: async (key) => invalidated.push(key) }) },
    '@/services/tph.service': { tphApi: { updateLocation: async (...args) => { if (fail) throw new Error('server rejected'); writes.push(args); } } },
    '@/utils/plantation': plantation,
  });
  const tph = { id: 't', nama: 'TPH', geometry: null };
  let tree;
  const render = async () => act(async () => { const element = React.createElement(TphLocation, { tph }); if (tree) tree.update(element); else tree = create(element); });
  await render();
  assert.equal(tree.root.findAllByType('Button').length, 0);
  permitted = true;
  online = false;
  await render();
  assert.equal(tree.root.findByType('Button').props.disabled, true);
  online = true;
  denied = true;
  await render();
  await act(async () => tree.root.findByType('Button').props.onPress());
  assert.equal(alerts.length, 0);
  assert.match(JSON.stringify(tree.toJSON()), /Izin lokasi ditolak/);
  denied = false;
  await render();
  await act(async () => tree.root.findByType('Button').props.onPress());
  assert.equal(writes.length, 0);
  assert.equal(alerts.at(-1)[2][0].style, 'cancel');
  await act(async () => alerts.at(-1)[2][1].onPress());
  assert.equal(writes[0][0], 't');
  assert.equal(invalidated.length, 1);
  fail = true;
  await act(async () => tree.root.findByType('Button').props.onPress());
  await act(async () => alerts.at(-1)[2][1].onPress());
  assert.equal(alerts.at(-1)[1], 'server rejected');
  assert.equal(tree.root.findByType('Button').props.loading, false);
  await act(async () => tree.unmount());
});
