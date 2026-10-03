const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
const React = require('react');
const { act, create } = require('react-test-renderer');

global.IS_REACT_ACT_ENVIRONMENT = true;

function load(file, mocks) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, require: (name) => mocks[name] ?? require(name), console, Date, Math });
  return exports;
}

const memberLabel = (member, fallback) => member?.kode ? `${member.nama} (${member.kode})` : member?.nama ?? fallback;
const worker = { id: 'worker-1', member: { nama: 'Andi', kode: 'K-01' } };
const detail = {
  id: 'detail-1', client_detail_id: 'detail-1', bkm_rawat_id: 'rawat-1',
  tipe_pekerjaan_id: 'type-1', kategori_pekerjaan_id: 'category-1', item_pekerjaan_id: 'item-1',
  pekerja_id: 'worker-1', nama_pekerja: 'Andi', jumlah_pekerja: 1, materials: [],
};

async function screen({ online = true, id = 'rawat-1', details = [], workers = [worker], queue = [] } = {}) {
  const calls = { created: [], updated: [], queued: [], changedQueue: [] };
  const document = { id, status: 'DRAFT', detail_rawat: details, tanggal: '2026-09-24T00:00:00Z', nama_pengawas: 'Mandor' };
  const { default: Screen } = load('app/(mandor)/rawat/[id].tsx', {
    'react-native': { ActivityIndicator: 'ActivityIndicator', Alert: { alert() {} }, ScrollView: 'ScrollView', StyleSheet: { create: (styles) => styles }, Text: 'Text', TouchableOpacity: 'TouchableOpacity' },
    'expo-router': { useLocalSearchParams: () => ({ id }), router: { back() {} } },
    '@tanstack/react-query': { useQueryClient: () => ({ setQueryData() {} }), useQuery: () => ({ data: undefined }) },
    '@/stores/useAuthStore': { useAuthStore: (selector) => selector({ hasPermission: () => false }) },
    '@/services/material.service': { materialApi: {} },
    '@/components/Themed': { View: 'View' },
    '@/components/home': { PageHeader: 'PageHeader' },
    '@/components/core/Button': { Button: 'Button' },
    '@/components/form': { FormField: 'FormField', FormSelect: 'FormSelect' },
    '@/components/bkm/DocStatusBadge': { DocStatusBadge: 'DocStatusBadge' },
    '@/components/bkm/OperationalActions': { OperationalActions: 'OperationalActions' },
    '@/components/bkm/OperationalHistory': { OperationalHistory: 'OperationalHistory' },
    '@/constants/Colors': { BrandColors: {} },
    '@/utils/plantation': { memberLabel },
    '@/hooks/useOperationalPolicy': { useOperationalPolicy: () => ({ edit: true, addDetail: true, deleteDetail: false, submit: false }) },
    '@/hooks/usePekerja': { usePekerjaList: () => ({ data: workers === null ? undefined : { data: workers } }) },
    '@/hooks/useBkmRawat': {
      bkmRawatKeys: { detail: (value) => ['rawat', value] },
      useBkmRawatDetail: () => ({ data: document }),
      useBkmRawatActions: () => ({
        addDetail: { mutateAsync: async (payload) => { calls.created.push(payload); } },
        updateDetail: { mutateAsync: async (payload) => { calls.updated.push(payload); } },
      }),
      useBkmRawatLookups: () => ({ data: {
        types: [{ id: 'type-1', nama: 'Rawat' }], categories: [{ id: 'category-1', nama: 'Pupuk' }],
        items: [{ id: 'item-1', nama: 'Tabur', kategori_pekerjaan_id: 'category-1' }], materials: [{ id: 'mat-1', nama: 'Urea', satuan: 'kg' }],
      } }),
    },
    '@/stores/useNetworkStore': { useNetworkStore: (selector) => selector({ isOnline: online }) },
    '@/stores/useSyncQueueStore': { useSyncQueueStore: (selector) => selector({
      queue,
      addToQueue: async (payload) => { calls.queued.push(payload); return { id: 'new-queue-item' }; },
      updatePayload: async (queueId, payload) => { calls.changedQueue.push({ queueId, payload }); },
      removeFromQueue: async () => {},
    }) },
  });
  let renderer;
  await act(async () => { renderer = create(React.createElement(Screen)); });
  const find = (type, label) => renderer.root.findAllByType(type).find((node) => node.props.title === label || node.props.label === label);
  const press = async (title) => { await act(async () => { await find('Button', title).props.onPress(); }); };
  const choose = async (label, value) => { await act(async () => { find('FormSelect', label).props.onSelect(value); }); };
  const fill = async (label, value) => { await act(async () => { find('FormField', label).props.onChangeText(value); }); };
  return { renderer, calls, find, press, choose, fill };
}

test('direct Rawat creation links a selected worker and keeps explicit free text unlinked', async () => {
  const ui = await screen();
  await ui.press('Tambah pekerjaan');
  await ui.choose('Tipe pekerjaan', 'type-1');
  await ui.choose('Kategori pekerjaan', 'category-1');
  await ui.choose('Item pekerjaan', 'item-1');
  assert.equal(ui.find('FormSelect', 'Pekerja terdaftar (opsional)').props.options.find((option) => option.value === 'worker-1').label, 'Andi (K-01)');
  await ui.choose('Pekerja terdaftar (opsional)', 'worker-1');
  await ui.press('Simpan pekerjaan');
  assert.equal(ui.calls.created[0].pekerja_id, 'worker-1');
  assert.equal(ui.calls.created[0].nama_pekerja, 'Andi');
  await ui.press('Tambah pekerjaan');
  await ui.choose('Tipe pekerjaan', 'type-1');
  await ui.choose('Kategori pekerjaan', 'category-1');
  await ui.choose('Item pekerjaan', 'item-1');
  await ui.choose('Pekerja terdaftar (opsional)', 'worker-1');
  await ui.choose('Pekerja terdaftar (opsional)', '');
  await ui.fill('Nama pekerja / kelompok', 'Tim Semprot');
  await ui.press('Simpan pekerjaan');
  assert.equal(ui.calls.created[1].pekerja_id, undefined);
  assert.equal(ui.calls.created[1].nama_pekerja, 'Tim Semprot');
  await act(async () => ui.renderer.unmount());
});

test('editing a linked Rawat detail keeps its worker ID without a cached worker list', async () => {
  const ui = await screen({ details: [detail], workers: null });
  await ui.press('Ubah');
  assert.equal(ui.find('FormSelect', 'Pekerja terdaftar (opsional)').props.value, 'worker-1');
  await ui.fill('Hasil pekerjaan', '50');
  await ui.press('Simpan pekerjaan');
  assert.equal(ui.calls.updated[0].data.pekerja_id, 'worker-1');
  await act(async () => ui.renderer.unmount());
});

test('linked worker survives local-draft save and queued detail edits; free text stays unlinked', async () => {
  const queue = [{ id: 'q1', module: 'bkm_rawat', action: 'CREATE', createdAt: Date.now(), payload: {
    header: { kelompok_lahan_id: 'estate', blok_id: 'block', tanggal: '2026-09-24', nama_pengawas: 'Mandor' },
    details: [{ ...detail }], submit: false,
  } }];
  const local = await screen({ id: 'local:q1', queue, workers: null });
  await local.press('Ubah');
  await local.press('Simpan pekerjaan');
  assert.equal(local.calls.changedQueue[0].payload.details[0].pekerja_id, 'worker-1');
  await act(async () => local.renderer.unmount());

  const offline = await screen({ online: false, details: [detail] });
  await offline.press('Ubah');
  await offline.press('Simpan pekerjaan');
  assert.equal(offline.calls.queued[0].payload.data.pekerja_id, 'worker-1');
  await offline.press('Tambah pekerjaan');
  await offline.choose('Tipe pekerjaan', 'type-1');
  await offline.choose('Kategori pekerjaan', 'category-1');
  await offline.choose('Item pekerjaan', 'item-1');
  await offline.fill('Nama pekerja / kelompok', 'Tim Semprot');
  await offline.press('Simpan pekerjaan');
  assert.equal(offline.calls.queued[1].payload.pekerja_id, undefined);
  assert.equal(offline.calls.queued[1].payload.nama_pekerja, 'Tim Semprot');
  await act(async () => offline.renderer.unmount());

  const linkedOffline = await screen({ online: false });
  await linkedOffline.press('Tambah pekerjaan');
  await linkedOffline.choose('Tipe pekerjaan', 'type-1');
  await linkedOffline.choose('Kategori pekerjaan', 'category-1');
  await linkedOffline.choose('Item pekerjaan', 'item-1');
  await linkedOffline.choose('Pekerja terdaftar (opsional)', 'worker-1');
  await linkedOffline.press('Simpan pekerjaan');
  assert.equal(linkedOffline.calls.queued[0].payload.pekerja_id, 'worker-1');
  await act(async () => linkedOffline.renderer.unmount());
});

test('Rawat agronomy and dose fields survive a local draft without changing material quantity', async () => {
  const queue = [{ id: 'q-agro', module: 'bkm_rawat', action: 'CREATE', createdAt: Date.now(), payload: {
    header: { kelompok_lahan_id: 'estate', blok_id: 'block', tanggal: '2026-09-24', nama_pengawas: 'Mandor' },
    details: [], submit: false,
  } }];
  const ui = await screen({ id: 'local:q-agro', queue, online: false });
  await ui.press('Tambah pekerjaan');
  await ui.choose('Tipe pekerjaan', 'type-1');
  await ui.choose('Kategori pekerjaan', 'category-1');
  await ui.choose('Item pekerjaan', 'item-1');
  await ui.fill('Nama pekerja / kelompok', 'Tim Pupuk');
  await ui.fill('Luas dirawat (ha)', '2.5');
  await ui.fill('Jumlah pokok dirawat', '120');
  await ui.fill('Metode', 'Tabur manual');
  await ui.fill('Kondisi lapangan', 'Cerah');
  await ui.choose('Pilih material', 'mat-1');
  await ui.fill('Jumlah material', '120');
  await ui.fill('Dosis (opsional)', '1');
  await ui.fill('Satuan dosis', 'kg/pokok');
  await ui.press('Tambahkan material');
  await ui.press('Simpan pekerjaan');
  const saved = ui.calls.changedQueue[0].payload.details[0];
  assert.equal(saved.luas_ha, 2.5);
  assert.equal(saved.jumlah_pokok, 120);
  assert.equal(saved.metode, 'Tabur manual');
  assert.equal(saved.kondisi, 'Cerah');
  assert.equal(saved.materials[0].jumlah, 120);
  assert.equal(saved.materials[0].dosis, 1);
  assert.equal(saved.materials[0].satuan_dosis, 'kg/pokok');
  await act(async () => ui.renderer.unmount());
});

test('dormant attendance records survive database reopen without creating sync work', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-3-attendance-'));
  const filename = path.join(directory, 'local.db');
  let native;
  const open = () => {
    native = new DatabaseSync(filename);
    return {
      execAsync: async (sql) => native.exec(sql),
      runAsync: async (sql, params = []) => native.prepare(sql).run(...params),
      getAllAsync: async (sql, params = []) => native.prepare(sql).all(...params),
      getFirstAsync: async (sql, params = []) => native.prepare(sql).get(...params) ?? null,
    };
  };
  const database = () => load('services/database.ts', { 'expo-sqlite': { openDatabaseAsync: async () => open() } });
  try {
    const first = database();
    await first.attendanceDb.saveRecord({
      id: 'old-attendance', user_code: 'worker-a', date: '2026-09-20', time: '07:00',
      latitude: null, longitude: null, block_id: null, block_name: null, status: 'HADIR', note: null,
    });
    native.close();
    const second = database();
    const rows = await second.attendanceDb.getAll('worker-a');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, 'old-attendance');
    assert.equal(native.prepare('SELECT COUNT(*) AS total FROM sync_queue').get().total, 0);
  } finally {
    native?.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
