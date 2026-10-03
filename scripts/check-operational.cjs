const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText,
    { exports, require: (name) => mocks[name] ?? require(name), console, Error, Date });
  return exports;
}

const { operationalPolicy } = load('utils/operational-policy.ts');
const statuses = ['DRAFT', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED', 'CANCELLED'];
const allPermissions = { read: true, write: true, update: true, delete: true, approve: true };

test('workflow permissions and statuses are enforced for all 32 permission combinations', () => {
  const flags = Object.keys(allPermissions);
  for (let mask = 0; mask < 32; mask++) {
    const permissions = Object.fromEntries(flags.map((flag, index) => [flag, !!(mask & (1 << index))]));
    for (const status of statuses) {
      const p = operationalPolicy(status, permissions, true, 1);
      assert.equal(p.approve, permissions.approve && status === 'SUBMITTED');
      assert.equal(p.reject, permissions.approve && status === 'SUBMITTED');
      assert.equal(p.edit, permissions.update && status === 'DRAFT');
      assert.equal(p.addDetail, permissions.write && status === 'DRAFT');
      assert.equal(p.deleteDetail, permissions.delete && status === 'DRAFT');
      assert.equal(p.delete, permissions.delete && status === 'DRAFT');
      assert.equal(p.reopen, permissions.update && ['REVISION_REQUESTED', 'SUBMITTED'].includes(status));
      assert.equal(p.submit, permissions.update && status === 'DRAFT');
      assert.equal(p.cancel, permissions.update && status === 'SUBMITTED');
      assert.equal(p.create, permissions.write);
      assert.equal(p.history, permissions.read);
    }
  }
});

test('empty drafts cannot submit and decisions/history are unavailable offline', () => {
  assert.equal(operationalPolicy('DRAFT', allPermissions, true, 0).submit, false);
  for (const status of statuses) {
    const p = operationalPolicy(status, allPermissions, false, 1);
    for (const action of ['approve', 'reject', 'cancel', 'history']) assert.equal(p[action], false);
  }
});

test('approve alone grants approval; write alone never grants approval', () => {
  assert.equal(operationalPolicy('SUBMITTED', { approve: true }, true).approve, true);
  assert.equal(operationalPolicy('SUBMITTED', { write: true }, true).approve, false);
  // Maker-checker: the author may still request revision, never approve.
  const own = operationalPolicy('SUBMITTED', { approve: true }, true, 1, true);
  assert.equal(own.approve, false);
  assert.equal(own.reject, true);
});

test('document cache preserves revision metadata and refuses cached data on permission errors', async () => {
  const cache = new Map();
  let failure;
  const document = { id: 'x', status: 'REVISION_REQUESTED', rejection_note: 'Correct weight', rejected_by: 'reviewer', rejected_at: '2026-09-22T01:00:00Z' };
  const { readOperational } = load('services/operational.service.ts', {
    './api': { apiClient: { get: async () => { if (failure) throw failure; return { data: document }; } } },
    './database': { lookupCacheDb: { save: async (key, data) => cache.set(key, JSON.parse(JSON.stringify(data))), get: async (key) => cache.get(key) } },
    '@/stores/useAuthStore': { useAuthStore: { getState: () => ({ user: { id: 'user' }, hasPermission: () => true }) } },
    '@/utils/operational-policy': load('utils/operational-policy.ts'),
    '@/utils/close': load('utils/close.ts'),
    '@/stores/useNetworkStore': { useNetworkStore: { getState: () => ({ isOnline: true }) } },
  });
  await readOperational('bkmPanen', '/bkmPanen/x');
  failure = new Error('offline');
  assert.deepEqual(await readOperational('bkmPanen', '/bkmPanen/x'), document);
  failure = { status: 403 };
  await assert.rejects(readOperational('bkmPanen', '/bkmPanen/x'), (e) => e.status === 403);
});

test('audit reads are online-only and cache only server events', async () => {
  let online = true;
  const stored = [];
  const events = [{ id: 'audit-1', action: 'REJECT', status_from: 'SUBMITTED', status_to: 'REVISION_REQUESTED', created_by: 'reviewer' }];
  const { readHistory } = load('services/operational.service.ts', {
    './api': { apiClient: { get: async () => ({ data: events }) } },
    './database': { lookupCacheDb: { save: async (_key, data) => stored.push(data) } },
    '@/stores/useAuthStore': { useAuthStore: { getState: () => ({ user: { id: 'user' }, hasPermission: () => true }) } },
    '@/utils/operational-policy': load('utils/operational-policy.ts'),
    '@/stores/useNetworkStore': { useNetworkStore: { getState: () => ({ isOnline: online }) } },
  });
  assert.equal(await readHistory('bkmChecker', 'x'), events);
  assert.equal(stored[0], events);
  online = false;
  await assert.rejects(readHistory('bkmChecker', 'x'), /internet/);
  assert.equal(stored.length, 1);
});

test('audit UI renders loading, error, empty and the actual backend event contract', () => {
  let result = { isLoading: true };
  const { OperationalHistory } = load('components/bkm/OperationalHistory.tsx', {
    'react-native': { ActivityIndicator: 'ActivityIndicator', Text: 'Text', View: 'View', Button: 'Button' },
    '@tanstack/react-query': { useQuery: () => result },
    '@/services/operational.service': { readHistory: async () => [] },
    '@/hooks/useOperationalPolicy': { useOperationalPolicy: () => ({ history: true }) },
    '@/stores/useAuthStore': { useAuthStore: (selector) => selector({ user: { id: 'user' } }) },
  });
  const render = () => JSON.stringify(OperationalHistory({ module: 'bkmChecker', id: 'deleted-document' }));
  assert.match(render(), /Memuat riwayat/);
  result = { isError: true, refetch: () => {} };
  assert.match(render(), /Riwayat gagal dimuat/);
  result = { data: [] };
  assert.match(render(), /Belum ada riwayat/);
  result = { data: [{ id: 'event', action: 'REJECT', status_from: 'SUBMITTED', status_to: 'REVISION_REQUESTED', created_by: 'ASISTEN-1', reason: 'Periksa berat', created_at: '2026-09-22T01:00:00Z' }] };
  for (const text of ['REJECT', 'SUBMITTED', 'REVISION_REQUESTED', 'ASISTEN-1', 'Periksa berat']) assert.ok(render().includes(text));
});

test('Checker reject UI sends rejection_note and refreshes on a stale decision', async () => {
  const React = require('react');
  const { create, act } = require('react-test-renderer');
  global.IS_REACT_ACT_ENVIRONMENT = true;
  let policy = operationalPolicy('SUBMITTED', { approve: true }, true, 1);
  const alerts = [];
  const writes = [];
  let refreshes = 0;
  let conflict = false;
  const { OperationalActions } = load('components/bkm/OperationalActions.tsx', {
    'react-native': { Text: 'Text', TextInput: 'TextInput', View: 'View', Button: 'Button', Alert: { alert: (...args) => alerts.push(args) } },
    '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: async () => { refreshes++; } }) },
    '@/services/api': { apiClient: { post: async (path, payload) => { writes.push({ path, payload }); if (conflict) throw { status: 409 }; } } },
    '@/services/operational.service': { requireOnline: () => {} },
    '@/services/database': { lookupCacheDb: {} },
    '@/stores/useAuthStore': {},
    '@/hooks/useOperationalPolicy': { useOperationalPolicy: () => policy },
    '@/utils/close': load('utils/close.ts'),
    '@/stores/useNetworkStore': { useNetworkStore: { getState: () => ({ isOnline: true }) } },
    '@/stores/useSyncQueueStore': { useSyncQueueStore: { getState: () => ({ queue: [] }) } },
  });
  let tree;
  const element = () => React.createElement(OperationalActions, { module: 'bkmChecker', document: { id: 'checker', status: 'SUBMITTED', tph_id: 'tph-1', details: [{}] } });
  await act(async () => { tree = create(element()); });
  await act(async () => { tree.root.findByType('TextInput').props.onChangeText('Periksa janjang'); });
  await act(async () => { tree.root.findAllByType('Button').find((b) => b.props.title === 'Minta revisi').props.onPress(); });
  await act(async () => { alerts.at(-1)[2][1].onPress(); });
  assert.equal(writes[0].path, '/bkmChecker/checker/reject');
  assert.equal(writes[0].payload.rejection_note, 'Periksa janjang');
  conflict = true;
  await act(async () => { tree.root.findAllByType('Button').find((b) => b.props.title === 'Setujui').props.onPress(); });
  await act(async () => { alerts.at(-1)[2][1].onPress(); });
  assert.equal(refreshes, 2);
  assert.match(alerts.at(-1)[1], /Dokumen telah berubah/);
  policy = operationalPolicy('SUBMITTED', { write: true }, true, 1);
  await act(async () => { tree.update(element()); });
  assert.equal(tree.root.findAllByType('Button').length, 0);
  await act(async () => tree.unmount());
});

test('a trip has no approve action, an old single-TPH document still does', async () => {
  const React = require('react');
  const { create, act } = require('react-test-renderer');
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const policy = operationalPolicy('SUBMITTED', { approve: true }, true, 1);
  const { OperationalActions } = load('components/bkm/OperationalActions.tsx', {
    'react-native': { Text: 'Text', TextInput: 'TextInput', View: 'View', Button: 'Button', Alert: { alert() {} } },
    '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: async () => {} }) },
    '@/services/api': { apiClient: {} },
    '@/services/operational.service': { requireOnline: () => {} },
    '@/services/database': { lookupCacheDb: {} },
    '@/stores/useAuthStore': {},
    '@/hooks/useOperationalPolicy': { useOperationalPolicy: () => policy },
    '@/utils/close': load('utils/close.ts'),
    '@/stores/useNetworkStore': { useNetworkStore: { getState: () => ({ isOnline: true }) } },
    '@/stores/useSyncQueueStore': { useSyncQueueStore: { getState: () => ({ queue: [] }) } },
  });
  const titles = async (doc) => {
    let tree;
    await act(async () => { tree = create(React.createElement(OperationalActions, { module: 'bkmChecker',
      document: { id: 'checker', status: 'SUBMITTED', details: [{}], ...doc } })); });
    const names = tree.root.findAllByType('Button').map((b) => b.props.title);
    await act(async () => tree.unmount());
    return names;
  };
  const trip = await titles({ tph_id: null, nomor_spb: '0012345' });
  assert.equal(trip.includes('Setujui'), false);
  assert.equal(trip.includes('Minta revisi'), true);
  assert.equal((await titles({ tph_id: 'tph-1' })).includes('Setujui'), true);
});

test('recovery includes blocked descendants so inspect/retry/discard cannot strand work', () => {
  const { recoveryItems } = load('utils/queue-recovery.ts');
  const items = [{ id: 'reopen', status: 'DEAD' }, { id: 'edit', status: 'PENDING', dependsOn: 'reopen' }, { id: 'submit', status: 'PENDING', dependsOn: 'edit' }, { id: 'unrelated', status: 'PENDING' }];
  assert.deepEqual(Array.from(recoveryItems(items), (item) => item.id), ['reopen', 'edit', 'submit']);
});

test('inspection shows the retained payload alongside the fetched server version', async () => {
  const React = require('react');
  const { create, act } = require('react-test-renderer');
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const payload = { id: 'doc', data: { keterangan: 'local correction' } };
  const item = { id: 'queue', payload, status: 'DEAD', errorClass: 'CONFLICT' };
  const { QueueInspection } = load('components/bkm/QueueInspection.tsx', {
    'react-native': Object.fromEntries(['ActivityIndicator', 'Alert', 'Button', 'Modal', 'ScrollView', 'Text', 'TextInput', 'View'].map((name) => [name, name])),
    'expo-router': { useRouter: () => ({ push: () => {} }) },
    '@/services/queue-recovery': { latestQueueDocument: async () => ({ id: 'doc', status: 'SUBMITTED', keterangan: 'server correction' }) },
    '@/stores/useAuthStore': { useAuthStore: (selector) => selector({ hasPermission: () => false }) },
    '@/stores/useSyncQueueStore': { useSyncQueueStore: (selector) => selector({ updatePayload: async () => {}, retryItem: async () => {} }) },
    '@/utils/trip': load('utils/trip.ts'),
  });
  let tree;
  await act(async () => { tree = create(React.createElement(QueueInspection, { item, onClose: () => {} })); });
  const output = JSON.stringify(tree.toJSON());
  assert.match(output, /local correction/);
  assert.match(output, /server correction/);
  assert.match(output, /SUBMITTED/);
  assert.equal(item.payload, payload);
  await act(async () => tree.unmount());
});

test('Checker corrections are draft-only and offline detail edits retain their document dependency', async () => {
  const React = require('react');
  const { create, act } = require('react-test-renderer');
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const queued = [];
  const { OperationalDraftEditor } = load('components/bkm/OperationalDraftEditor.tsx', {
    'react-native': { Alert: { alert: () => {} }, Text: 'Text', View: 'View' },
    '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: async () => {} }) },
    '@/components/core/Button': { Button: 'Button' },
    '@/components/form': { FormField: 'FormField', FormSelect: 'FormSelect' },
    '@/hooks/useFleetChoices': { useFleetChoices: () => ({ vehicles: [], drivers: [] }) },
    '@/hooks/useOperationalPolicy': { useOperationalPolicy: (_module, status, count) => operationalPolicy(status, allPermissions, false, count) },
    '@/stores/useNetworkStore': { useNetworkStore: (selector) => selector({ isOnline: false }) },
    '@/stores/useSyncQueueStore': { useSyncQueueStore: (selector) => selector({ queue: [], addToQueue: async (item) => queued.push(item) }) },
    '@/services/api': { apiClient: { put: async () => { throw new Error('must queue offline'); } } },
    '@/services/precondition': { withPrecondition: () => ({}) },
    '@/utils/field-summary': load('utils/field-summary.ts'),
  });
  const document = { id: 'checker', status: 'REVISION_REQUESTED', modified_at: 'header-time', details: [{ id: 'row', modified_at: 'detail-time', nama_sopir: 'Driver', nomor_truk: 'Truck', tujuan_kirim: 'Mill', janjang_normal: 1, jumlah_brondol: 0, buah_mentah: 0, over_ripe: 0, tangkai_panjang: 0, buah_abnormal: 0, janjang_kosong: 0, jumlah_janjang: 1 }] };
  let tree;
  await act(async () => { tree = create(React.createElement(OperationalDraftEditor, { module: 'bkmChecker', document })); });
  assert.equal(tree.toJSON(), null);
  await act(async () => { tree.update(React.createElement(OperationalDraftEditor, { module: 'bkmChecker', document: { ...document, status: 'DRAFT' } })); });
  await act(async () => { tree.root.findAllByType('Button').find((button) => button.props.title === 'Ubah detail 1').props.onPress(); });
  await act(async () => { tree.root.findAllByType('FormField').find((field) => field.props.label === 'Jumlah janjang').props.onChangeText('2'); });
  await act(async () => { tree.root.findAllByType('Button').find((button) => button.props.title === 'Simpan perubahan').props.onPress(); });
  assert.equal(queued.length, 1);
  assert.equal(queued[0].payload.documentId, 'checker');
  assert.equal(queued[0].payload.expectedStatus, 'DRAFT');
  assert.equal(queued[0].payload.data.jumlah_janjang, 2);
  assert.equal(queued[0].precondition, 'detail-time');
  await act(async () => tree.unmount());
});
