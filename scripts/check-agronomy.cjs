const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { exports, require: (name) => mocks[name] ?? require(name), console, JSON, Date, Error, Number, Math, Set, Map, Promise });
  return exports;
}

const maturity = load('utils/maturity.ts');
const plantation = load('utils/plantation.ts');
const observasi = load('utils/observasi.ts');

test('TM date: TBM the day before, TM on the day and after, whatever the planting year says', () => {
  const stand = { tahun_tanam: 2022, tanggal_tm: '2026-10-15' }; // planting year alone would say TM
  assert.equal(maturity.maturityOn(stand, '2026-10-14'), 'TBM');
  assert.equal(maturity.maturityOn(stand, '2026-10-15'), 'TM');
  assert.equal(maturity.maturityOn(stand, '2026-10-16'), 'TM');
  // The API serialises a date as a timestamp.
  assert.equal(maturity.maturityOn({ tanggal_tm: '2026-10-15T00:00:00.000Z' }, '2026-10-14'), 'TBM');
  assert.equal(maturity.maturityOn({ tanggal_tm: '2026-10-15T00:00:00.000Z' }, '2026-10-15'), 'TM');
  // Declared productive early.
  assert.equal(maturity.maturityOn({ tahun_tanam: 2026, tanggal_tm: '2026-09-01' }, '2026-09-22'), 'TM');
  // Old stand stays TUA once productive.
  assert.equal(maturity.maturityOn({ tahun_tanam: 1990, tanggal_tm: '2026-10-15' }, '2026-10-15'), 'TUA');
});

test('without a TM date the planting-year rule applies, and unknown stays unknown', () => {
  assert.equal(maturity.maturityOn({ tahun_tanam: 2023 }, '2026-09-22'), 'TBM');
  assert.equal(maturity.maturityOn({ tahun_tanam: 2022 }, '2026-09-22'), 'TM');
  assert.equal(maturity.maturityOn({ tahun_tanam: 2001 }, '2026-09-22'), 'TUA');
  assert.equal(maturity.maturityOn({ tahun_tanam: 2027 }, '2026-09-22'), null);
  assert.equal(maturity.maturityOn({}, '2026-09-22'), null);
  assert.equal(maturity.maturityOn(null, '2026-09-22'), null);
  assert.equal(maturity.maturityOn({ tahun_tanam: 2000 }, ''), null);
});

test('the parcel decides when it has planting data, otherwise the block', () => {
  const blok = { tahun_tanam: 2015 };
  assert.equal(maturity.standMaturityOn({ tahun_tanam: 2025 }, blok, '2026-09-22'), 'TBM');
  assert.equal(maturity.standMaturityOn({ tanggal_tm: '2026-12-01' }, blok, '2026-09-22'), 'TBM');
  assert.equal(maturity.standMaturityOn({ tahun_tanam: null }, blok, '2026-09-22'), 'TM');
  assert.equal(maturity.standMaturityOn(undefined, blok, '2026-09-22'), 'TM');
});

test('a reason is missing only on TBM land, and blank text is no reason', () => {
  const blok = { tahun_tanam: 2015, tanggal_tm: '2026-10-15' };
  const base = { blok, day: '2026-10-14' };
  assert.equal(maturity.tbmReasonMissing(base), true);
  assert.equal(maturity.tbmReasonMissing({ ...base, alasan: '   ' }), true);
  assert.equal(maturity.tbmReasonMissing({ ...base, alasan: 'Panen sanitasi' }), false);
  assert.equal(maturity.tbmReasonMissing({ ...base, day: '2026-10-15' }), false);
  assert.equal(maturity.tbmReasonMissing({ blok: { tahun_tanam: null }, day: '2026-10-14' }), false);
});

const native = { ScrollView: 'ScrollView', StyleSheet: { create: (s) => s }, Text: 'Text' };
const controls = { FormSelect: 'FormSelect', FormField: 'FormField', FormDateField: 'FormDateField' };
const children = (tree) => tree.props.children.flat().filter(Boolean);

test('Panen step 1 asks for a reason on TBM land and will not continue without it', () => {
  const header = { blok_id: 'b', lahan_id: '', tanggal_laporan: '2026-10-14', alasan_tbm: '' };
  const sets = [];
  const bloks = [{ id: 'b', nama: 'B', tahun_tanam: 2015, tanggal_tm: '2026-10-15', maturitas: 'TM' }];
  const { BKMPanenFormStep1 } = load('components/mandor/BKMPanenFormStep1.tsx', {
    'react-native': native,
    '@/components/form': controls,
    '@/components/core/Button': { Button: 'Button' },
    '@/utils/plantation': plantation,
    '@/utils/maturity': maturity,
    '@/services': {},
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    '@/stores/useBkmPanenStore': { useBkmPanenStore: () => ({ header, setHeader: (p) => sets.push(p) }) },
    '@tanstack/react-query': { useQuery: ({ queryKey }) => ({ data: { data: ({ blok: bloks })[queryKey[0]] ?? [] } }) },
  });
  const view = () => children(BKMPanenFormStep1({ onNext() {} }));
  const find = (nodes, label) => nodes.find((n) => n.props?.label === label);

  // The cached server value says TM today; on the Panen date the TM date says TBM.
  let nodes = view();
  assert.ok(find(nodes, 'Alasan Panen di Lahan TBM'), 'reason field shown');
  assert.equal(nodes.find((n) => n.type === 'Button').props.disabled, true, 'cannot continue without a reason');
  find(nodes, 'Alasan Panen di Lahan TBM').props.onChangeText('Panen sanitasi');
  assert.equal(sets.at(-1).alasan_tbm, 'Panen sanitasi');

  header.alasan_tbm = 'Panen sanitasi';
  assert.equal(view().find((n) => n.type === 'Button').props.disabled, false);

  // From the TM date on there is nothing to explain.
  header.alasan_tbm = '';
  header.tanggal_laporan = '2026-10-15';
  nodes = view();
  assert.equal(find(nodes, 'Alasan Panen di Lahan TBM'), undefined);
  assert.equal(nodes.find((n) => n.type === 'Button').props.disabled, false);
});

for (const online of [false, true]) {
  test(`Panen on TBM land cannot be ${online ? 'submitted' : 'queued'} without a reason, and carries it once given`, async () => {
    const React = require('react');
    const { act, create } = require('react-test-renderer');
    global.IS_REACT_ACT_ENVIRONMENT = true;
    const header = { blok_id: 'b', lahan_id: '', tanggal_laporan: '2026-10-14', alasan_tbm: '' };
    const detail = {
      _tempId: 't1', pekerja_id: 'p', tph_id: 'tph', jenis_pekerjaan: 'PANEN', janjang_normal: 10, buah_mentah: 0, over_ripe: 0,
      tangkai_panjang: 0, buah_abnormal: 0, janjang_kosong: 0, jumlah_janjang: 10, jumlah_brondol: 5,
    };
    const queued = [];
    const mutated = [];
    const alerts = [];
    const bloks = [{ id: 'b', nama: 'B', tahun_tanam: 2015, tanggal_tm: '2026-10-15' }];
    const { BKMPanenFormStep4 } = load('components/mandor/BKMPanenFormStep4.tsx', {
      react: React,
      'react-native': { ...native, View: 'View', Alert: { alert: (...args) => alerts.push(args) }, TouchableOpacity: 'TouchableOpacity' },
      '@/components/Themed': { Text: 'Text', View: 'View' },
      '@/components/core/Button': { Button: 'Button' },
      '@/constants/Colors': { BrandColors: new Proxy({}, { get: () => '#000' }) },
      '@/hooks/useOperationalPolicy': { useOperationalPolicy: () => ({ create: true, edit: true, submit: true }) },
      '@/hooks/useBkmPanen': { useSubmitBkmPanen: () => ({ mutate: (...args) => mutated.push(args), isPending: false }) },
      '@/hooks/useOrgConfig': { useOrgConfig: () => ({ data: { bjr: 15 } }) },
      '@/services': {},
      '@/utils/plantation': plantation,
      '@/utils/maturity': maturity,
      'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
      '@/stores/useBkmPanenStore': { useBkmPanenStore: () => ({ header, details: [detail], isEditing: false, editingId: null, editingModifiedAt: null, deletedDetailIds: [], reset() {} }) },
      '@/stores/useNetworkStore': { useNetworkStore: (select) => select({ isOnline: online }) },
      '@/stores/useSyncQueueStore': { useSyncQueueStore: (select) => select({ addToQueue: async (item) => { queued.push(item); return { id: 'q' }; } }) },
      '@tanstack/react-query': { useQuery: ({ queryKey }) => ({ data: { data: ({ blok: bloks })[queryKey[0]] ?? [] } }) },
    });
    let tree;
    await act(async () => { tree = create(React.createElement(BKMPanenFormStep4, { onBack() {}, onSuccess() {} })); });
    // The first touchable is the "data is correct" confirmation row.
    await act(async () => tree.root.findAllByType('TouchableOpacity')[0].props.onPress());
    const submit = () => tree.root.findAllByType('Button')[0];
    assert.equal(submit().props.disabled, false);

    await act(async () => submit().props.onPress());
    assert.equal(queued.length + mutated.length, 0, 'nothing queued or sent without a reason');
    assert.match(alerts.at(-1)[0], /Alasan panen TBM/);

    header.alasan_tbm = '  Panen sanitasi  ';
    await act(async () => submit().props.onPress());
    if (online) {
      assert.equal(mutated.length, 1);
    } else {
      assert.equal(queued.length, 1);
      assert.equal(queued[0].payload.header.alasan_tbm, 'Panen sanitasi');
      assert.equal(queued[0].payload.header.tanggal_laporan, '2026-10-14');
    }
    await act(async () => tree.unmount());
  });
}

test('the online submit sends the reason in the header, and an edited draft keeps it', () => {
  const hook = fs.readFileSync('hooks/useBkmPanen.ts', 'utf8');
  assert.match(hook, /alasan_tbm: header\.alasan_tbm\?\.trim\(\) \|\| undefined/);
  assert.match(fs.readFileSync('app/(mandor)/bkm/edit.tsx', 'utf8'), /alasan_tbm: panen\.alasan_tbm \?\? undefined/);
});

test('SENSUS_BJR needs a block, a whole sample count above 0 and a total in kg', () => {
  const ok = { blockId: 'b', sampleCount: '15', totalKg: '240' };
  assert.equal(observasi.sensusBjrError(ok), null);
  assert.equal(observasi.sensusBjrError({ ...ok, totalKg: '240,5' }) !== null, true, 'a decimal comma is not a number');
  assert.equal(observasi.sensusBjrError({ ...ok, totalKg: '240.5' }), null);
  for (const bad of [{ blockId: '' }, { sampleCount: '' }, { sampleCount: '0' }, { sampleCount: '-2' }, { sampleCount: '2.5' }, { sampleCount: 'abc' }, { totalKg: '' }, { totalKg: '0' }, { totalKg: '-1' }]) {
    assert.notEqual(observasi.sensusBjrError({ ...ok, ...bad }), null, JSON.stringify(bad));
  }
  assert.equal(observasi.parseSampleCount(' 12 '), 12);
  assert.equal(observasi.parseSampleCount('1e1'), 10);
  assert.equal(observasi.SENSUS_BJR_UNIT, 'kg');
  assert.equal(observasi.sampleBjr(240, 15), 16);
  assert.equal(observasi.sampleBjr(100, 7), 14.3);
});

test('the observation form offers SENSUS_BJR and sends the sample count with kg', () => {
  const source = fs.readFileSync('components/phase4/ObservationScreens.tsx', 'utf8');
  assert.match(source, /value: 'SENSUS_BJR', label: 'Sensus BJR'[^}]*unit: SENSUS_BJR_UNIT/);
  assert.match(source, /sensusBjrError\(\{ blockId, sampleCount, totalKg: value \}\)/);
  assert.match(source, /census \? \{ jumlah_sampel: parseSampleCount\(sampleCount\) \}/);
});
