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
  vm.runInNewContext(source, { exports, require: (name) => mocks[name] ?? require(name), console });
  return exports;
}

const display = load('utils/field-summary.ts');

test('R11 display keeps missing measures distinct and links only usable approval lists', () => {
  assert.equal(display.displayMeasure(null), '—');
  assert.equal(display.displayMeasure(0), '0');
  assert.equal(display.approvalTarget('BKM_PANEN', '(asisten)', (module) => module === 'mod_bkm_panen'), '/(asisten)/bkm');
  assert.equal(display.approvalTarget('BKM_CHECKER', '(mandor)', (module) => module === 'mod_bkm_checker'), '/(mandor)/checker');
  assert.equal(display.approvalTarget('BKM_CHECKER', '(asisten)', () => true), null);
  assert.equal(display.approvalTarget('BKM_RAWAT', '(mandor)', () => true), null);
  assert.equal(display.approvalTarget('BKM_PANEN', '(mandor)', () => false), null);
});

test('brondol entry only accepts safe whole kilograms, including zero', () => {
  for (const valid of ['0', '18', '205']) assert.equal(display.isWholeKg(valid), true);
  for (const invalid of ['', '-1', '1.5', '1,5', '3kg', '9007199254740992']) {
    assert.equal(display.isWholeKg(invalid), false, invalid);
  }
  // The truck can be measured independently of the Checker's 25 kg.
  const truckInput = '18';
  assert.equal(display.isWholeKg(truckInput), true);
  assert.notEqual(Number(truckInput), 25);
});

const sample = {
  definition: { id: 'R11', version: 1 }, generated_at: '2026-09-24T00:42:10.512Z',
  tanggal: '2026-09-24', timezone: 'Asia/Jakarta', bjr_used: 15, kelompok_lahan_id: null,
  produksi: { approved: { janjang: 7, kg_estimasi: 105, kg_estimasi_total: null },
    submitted: { janjang: 3, kg_estimasi: 45, kg_estimasi_total: 47 } },
  restan: { approved: { janjang: 39, baris: 3, umur_tertua_hari: 26 },
    submitted: { janjang: 15, baris: 1 } }, persetujuan: [],
};

test('R11 service sends only an authoritative farm filter and isolates saved responses by user', async () => {
  const rows = new Map();
  const requests = [];
  const service = load('services/field-summary.service.ts', {
    '@/services/api': { apiClient: { get: async (url, options) => {
      requests.push({ url, params: options.params });
      return { data: sample };
    } } },
    '@/services/database': { lookupCacheDb: {
      get: async (key) => rows.get(key) ?? null,
      save: async (key, value) => { rows.set(key, value); },
      clearResource: async (userId, resource) => {
        for (const key of rows.keys()) if (key.startsWith(`${userId}:${resource}:`)) rows.delete(key);
      },
    } },
  }).fieldSummaryApi;
  await service.fetch();
  await service.fetch('farm-1');
  assert.equal(requests[0].url, '/laporan/ringkasan');
  assert.equal(requests[0].params, undefined);
  assert.equal(requests[1].params.kelompok_lahan_id, 'farm-1');
  await service.saveLast('user-a', sample);
  await service.saveLast('user-b', { ...sample, tanggal: '2026-09-25' });
  await service.saveLast('user-a', { ...sample, tanggal: '2026-09-23' }, 'farm-1');
  assert.equal((await service.readLast('user-a')).tanggal, '2026-09-24');
  assert.equal((await service.readLast('user-a', 'farm-1')).tanggal, '2026-09-23');
  assert.equal((await service.readLast('user-b')).tanggal, '2026-09-25');
  await service.clearUser('user-a');
  assert.equal(await service.readLast('user-a'), null);
  assert.equal((await service.readLast('user-b')).tanggal, '2026-09-25');
  rows.set('user-a:laporan-r11:all', { ...sample, produksi: { approved: sample.produksi.approved } });
  assert.equal(await service.readLast('user-a'), null);
});

test('offline restart restores only the last authenticated profile, then logout removes it', async () => {
  const secure = new Map();
  let cleared = 0;
  const secureStore = {
    getItemAsync: async (key) => secure.get(key) ?? null,
    setItemAsync: async (key, value) => { secure.set(key, value); },
    deleteItemAsync: async (key) => { secure.delete(key); },
  };
  const profile = { user: { id: 'user-a', username: 'mandor', member: null }, roles: [{ id: 'r1', nama: 'mandor' }],
    permissions: [{ id: 'mod_laporan', nama: 'Laporan', read: true }] };
  const auth = { login: async () => ({ ...profile, token: 'access', refresh_token: 'refresh' }),
    getProfile: async () => { throw new Error('offline'); }, logout: async () => {} };
  const makeStore = () => load('stores/useAuthStore.ts', {
    zustand: { create: (initialize) => {
      let state;
      const set = (change) => { state = { ...state, ...change }; };
      state = initialize(set, () => state);
      return { getState: () => state };
    } },
    'expo-secure-store': secureStore,
    '@/services/auth': { authApi: auth },
    '@/services/api': { ApiError: class ApiError extends Error {}, TOKEN_KEY: 'auth_token', REFRESH_TOKEN_KEY: 'auth_refresh_token' },
    '@/services/database': { lookupCacheDb: { clearAll: async () => { cleared++; } } },
  }).useAuthStore;
  await makeStore().getState().login('mandor', 'password');
  const restarted = makeStore();
  await restarted.getState().restoreToken();
  assert.equal(restarted.getState().isAuthenticated, true);
  assert.equal(restarted.getState().user.id, 'user-a');
  assert.equal(restarted.getState().hasPermission('mod_laporan', 'read'), true);
  assert.equal(secure.get('auth_token'), 'access', 'no signal keeps the access token');
  assert.equal(restarted.getState().token, 'access');
  await restarted.getState().logout();
  assert.equal(secure.has('auth_last_profile'), false);
  assert.equal(cleared, 1);
});

test('R11 hook shows a saved response offline and hides it after a server 403', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const React = require('react');
  const { act, create } = require('react-test-renderer');
  const authState = { user: { id: 'user-a' }, hasPermission: () => true };
  const networkState = { isOnline: false };
  const authStore = (select) => select(authState);
  authStore.getState = () => authState;
  const networkStore = (select) => select(networkState);
  networkStore.getState = () => networkState;
  let clears = 0;
  let fetches = 0;
  const api = { readLast: async () => sample, fetch: async () => {
    fetches++;
    throw { status: 403 };
  }, saveLast: async () => {}, clearUser: async () => { clears++; } };
  const hook = load('hooks/useFieldSummary.ts', {
    react: React,
    '@/services/field-summary.service': { fieldSummaryApi: api },
    '@/stores/useAuthStore': { useAuthStore: authStore },
    '@/stores/useNetworkStore': { useNetworkStore: networkStore },
  }).useFieldSummary;
  let current;
  function Probe() { current = hook(true); return null; }
  let renderer;
  await act(async () => { renderer = create(React.createElement(Probe)); });
  assert.equal(current.data.tanggal, '2026-09-24');
  assert.equal(current.stale, true);
  assert.equal(current.offline, true);
  assert.equal(fetches, 0);
  networkState.isOnline = true;
  await act(async () => { renderer.update(React.createElement(Probe)); });
  assert.equal(fetches, 1, 'reconnecting refreshes once');
  assert.equal(clears, 1);
  assert.equal(current.available, false);
  assert.equal(current.data, null);
  await act(async () => { renderer.unmount(); });
});

test('QR weighing submits the krani-entered truck brondol instead of Checker brondol', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const React = require('react');
  const { act, create } = require('react-test-renderer');
  let posted;
  const checker = { id: 'checker-1', details: [{ jumlah_janjang: 10, jumlah_brondol: 25,
    nomor_truk: 'BK 1', nama_sopir: 'Sopir', tujuan_kirim: 'PKS' }], blok: { nama: 'B1' }, tph: { nama: 'TPH 1' } };
  const { default: TimbanganScreen } = load('components/krani/TimbanganScreen.tsx', {
    react: React,
    'react-native': {
      ActivityIndicator: 'ActivityIndicator', KeyboardAvoidingView: 'KeyboardAvoidingView',
      Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View',
      StyleSheet: { create: (value) => value }, Platform: { OS: 'android' },
      Alert: { alert: () => {} }, Keyboard: { addListener: () => ({ remove: () => {} }) },
    },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    '@/components/bkm/OperationalActions': { OperationalActions: 'OperationalActions' },
    '@/components/bkm/OperationalHistory': { OperationalHistory: 'OperationalHistory' },
    '@/components/bkm/OperationalDraftEditor': { OperationalDraftEditor: 'OperationalDraftEditor' },
    '@/components/core/Button': { Button: 'Button' },
    '@/components/form': { FormField: 'FormField', FormSelect: 'FormSelect' },
    '@/components/home': { PageHeader: 'PageHeader' },
    '@/constants/Colors': { BrandColors: { primary: '#654', error: 'red', textMuted: '#aaa' } },
    '@/hooks/useOperationalPolicy': { useOperationalPolicy: () => ({ create: true }) },
    '@/hooks/useModuleGroup': { useModuleGroup: () => '(krani)' },
    '@/hooks/useKraniTimbang': { useKraniTimbangDetail: () => ({}) },
    '@/hooks/useFleetChoices': { useFleetChoices: () => ({ vehicles: [], drivers: [] }) },
    '@/hooks/useOrgConfig': { useOrgConfig: () => ({ data: { bjr: 15 } }) },
    '@/services/bkm-checker.service': { bkmCheckerApi: { getById: async () => checker } },
    '@/services/staging.service': { stagingApi: { submitPayload: async () => {} } },
    '@/utils/field-summary': display,
    '@/types': {},
    '@expo/vector-icons/FontAwesome': 'FontAwesome',
    '@tanstack/react-query': {
      useQuery: () => ({ data: checker, isLoading: false, isError: false, refetch: async () => {} }),
      useMutation: () => ({ mutate: (value) => { posted = value; }, isPending: false }),
      useQueryClient: () => ({ invalidateQueries: async () => {} }),
    },
    'expo-router': { Redirect: 'Redirect', useLocalSearchParams: () => ({ checkerId: 'checker-1', qrPayload: 'qr' }),
      useRouter: () => ({ dismissTo: () => {} }) },
  });
  let tree;
  await act(async () => { tree = create(React.createElement(TimbanganScreen)); });
  const field = (label) => tree.root.findAllByType('FormField').find((node) => node.props.label === label);
  await act(async () => {
    field('Brondol di truk ini (kg)').props.onChangeText('18');
    field('Timbang Isi (Gross) - kg').props.onChangeText('100');
    field('Timbang Kosong (Tare) - kg').props.onChangeText('10');
  });
  await act(async () => { tree.root.findAllByType('Button').find((node) => node.props.title === 'Simpan Timbangan').props.onPress(); });
  assert.equal(posted.jumlah_brondol, 18);
  assert.notEqual(posted.jumlah_brondol, checker.details[0].jumlah_brondol);
  await act(async () => { tree.unmount(); });
});

test('dashboard refreshes R11 on pull and on return to foreground', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const React = require('react');
  const { act, create } = require('react-test-renderer');
  let refreshes = 0;
  let onAppState;
  const refresh = async () => { refreshes++; };
  const { DashboardScreen } = load('components/home/DashboardScreen.tsx', {
    react: React,
    'react-native': { ScrollView: 'ScrollView', View: 'View', RefreshControl: 'RefreshControl',
      StyleSheet: { create: (value) => value }, AppState: { currentState: 'active',
        addEventListener: (_event, callback) => { onAppState = callback; return { remove: () => {} }; } } },
    '@/components/home': { HargaTbsCard: 'HargaTbsCard', PageHeader: 'PageHeader',
      QuickActions: 'QuickActions', TodaySummary: 'TodaySummary', UserGreeting: 'UserGreeting' },
    '@/constants/Colors': { BrandColors: { primary: '#654' } },
    '@/hooks/useFieldSummary': { useFieldSummary: () => ({ refresh }) },
    'expo-router': { useSegments: () => ['(mandor)'] },
  });
  let tree;
  await act(async () => { tree = create(React.createElement(DashboardScreen)); });
  await act(async () => { tree.root.findByType('ScrollView').props.refreshControl.props.onRefresh(); });
  await act(async () => { onAppState('background'); onAppState('active'); });
  assert.equal(refreshes, 2);
  await act(async () => { tree.unmount(); });
});

test('field summary renders approved, submitted, missing kilograms, and empty approvals separately', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const React = require('react');
  const { act, create } = require('react-test-renderer');
  const { TodaySummary } = load('components/home/TodaySummary.tsx', {
    react: React,
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable',
      ActivityIndicator: 'ActivityIndicator', StyleSheet: { create: (value) => value } },
    '@/utils/estateDate': { estateDate: () => '2026-09-24' },
    '@/utils/field-summary': display,
    '@/constants/Colors': { BrandColors: { primary: '#654', textPrimary: '#333', textSecondary: '#666',
      textMuted: '#999', cardBg: '#fff', white: '#fff', inputBorder: '#ddd' } },
    '@/hooks/useKraniTimbang': { useKraniTimbangList: () => ({}) },
    '@/stores/useAuthStore': { useAuthStore: (select) => select({ hasPermission: () => true }) },
    '@expo/vector-icons/FontAwesome': 'FontAwesome',
    'expo-router': { useSegments: () => ['(mandor)'], useRouter: () => ({ push: () => {} }),
      useFocusEffect: () => {} },
  });
  let tree;
  await act(async () => { tree = create(React.createElement(TodaySummary, { fieldSummary: {
    available: true, data: sample, loading: false, refreshing: false, stale: false,
    offline: false, error: null, refresh: async () => {},
  } })); });
  const textNodes = (node) => {
    if (typeof node === 'string') return [];
    if (node.type === 'Text') return [(node.children ?? []).filter((part) => typeof part === 'string').join('')];
    return (node.children ?? []).flatMap(textNodes);
  };
  const output = textNodes(tree.toJSON()).join('\n');
  assert.match(output, /7 janjang disetujui/);
  assert.match(output, /3 janjang.*menunggu persetujuan/);
  assert.match(output, /— kg total \(estimasi, termasuk brondol\)/);
  assert.match(output, /Tidak ada keputusan yang menunggu Anda/);
  assert.match(output, /R11 v1/);
  await act(async () => { tree.unmount(); });
});
