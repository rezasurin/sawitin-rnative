// Run with: node --test scripts/check-trace.cjs
// P6-MOB-01: the harvest trace reads per trip line, and R11 points the close at the Asisten's list.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(path, mocks = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => mocks[name] ?? require(name), console, Date, Map });
  return exports;
}
const trace = load('utils/harvest-trace.ts', { '@/utils/estateDate': load('utils/estateDate.ts') });
const summary = load('utils/field-summary.ts');

const line = (over) => ({
  id: 'l1', bkm_checker_id: 'c1', nomor_spb: 'SPB-1', tipe_pengiriman: 'LANGSUNG',
  tph: { id: 't1', nama: 'TPH 01' }, blok: { id: 'b1', nama: 'Blok A' }, jumlah_janjang: 80, jumlah_brondol: 4,
  bkm_panen_id: 'p1', panen_pair: 'p1|t1', restan_diambil: null, ...over,
});

test('a LANGSUNG line joins its Panen pair; the pair harvest is shown once per pair', () => {
  // 23:30 WIB on 29 September is still the 29th on the estate calendar.
  const rows = trace.traceLineRows({
    lines: [line(), line({ id: 'l2', jumlah_janjang: 20 })],
    panen: [{ pair: 'p1|t1', bkm_panen_id: 'p1', tph: { id: 't1', nama: 'TPH 01' }, tanggal_laporan: '2026-09-29T16:30:00.000Z', status: 'APPROVED', jumlah_janjang: 100 }],
  });
  assert.deepEqual(rows.map((row) => [row.key, row.tempat, row.janjang]), [['l1', 'TPH 01 · Blok A', 80], ['l2', 'TPH 01 · Blok A', 20]]);
  assert.equal(rows[0].sumber, 'Langsung · Panen 2026-09-29 · 100 jjg dipanen di TPH ini');
  assert.equal(rows[0].spb, 'SPB-1');
});

test('a TITIP line names the restan and its harvest day; a missing pair says so instead of guessing', () => {
  const [titip, orphan] = trace.traceLineRows({
    lines: [
      line({ id: 'l3', tipe_pengiriman: 'TITIP', bkm_panen_id: null, panen_pair: null, restan_diambil: { id: 'r1', tanggal: '2026-09-28T01:00:00.000Z' } }),
      line({ id: 'l4', panen_pair: 'gone|t1' }),
    ],
    panen: [],
  });
  assert.equal(titip.sumber, 'Titip · restan panen 2026-09-28');
  assert.equal(orphan.sumber, 'Langsung · Panen tidak ditemukan');
});

test('a server without lines yields no rows, so the screen keeps its per-Checker view', () => {
  assert.equal(trace.traceLineRows({}).length, 0);
});

test('the weight of record names its source', () => {
  assert.equal(trace.nettoSumberLabel('INTERNAL'), 'timbangan internal');
  assert.equal(trace.nettoSumberLabel('PKS'), 'tiket PKS');
  assert.equal(trace.nettoSumberLabel(null), '—');
});

test('R11 v2: the daily close is labelled and opens the Asisten close list, nowhere else', () => {
  assert.equal(summary.approvalLabel('TUTUP_HARIAN'), 'Tutup Harian');
  assert.equal(summary.approvalTarget('TUTUP_HARIAN', '(asisten)', (module) => module === 'mod_bkm_checker'), '/(asisten)/tutup-harian');
  assert.equal(summary.approvalTarget('TUTUP_HARIAN', '(mandor)', () => true), null);
  assert.equal(summary.approvalTarget('TUTUP_HARIAN', '(asisten)', () => false), null);
});
