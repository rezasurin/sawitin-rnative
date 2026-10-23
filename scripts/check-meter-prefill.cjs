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
  vm.runInNewContext(source, { exports, require: (name) => mocks[name] ?? require(name), console });
  return exports;
}

const masterCache = load('services/master-cache.ts');
const prefill = load('utils/meter-prefill.ts', { '@/utils/estateDate': load('utils/estateDate.ts'), '@/utils/field-summary': load('utils/field-summary.ts') });

const reading = { kendaraan_id: 'truk-1', meter_akhir: '1480', satuan_meter: 'km',
  tanggal: '2026-10-07T17:00:00.000Z', pemakaian_kendaraan_id: 'usage-1' };

/** The usage service against an in-memory lookup cache and a switchable network. */
function usageService(rows, network) {
  const calls = [];
  const service = load('services/vehicle-usage.service.ts', {
    './api': { apiClient: { get: async (url, options) => {
      calls.push({ url, params: options.params });
      if (!network.online) throw new Error('Network Error');
      return { data: network.answer };
    } } },
    './database': { lookupCacheDb: {
      save: async (key, value) => { rows.set(key, JSON.parse(JSON.stringify(value))); },
      get: async (key) => rows.get(key) ?? null,
    } },
    './master-cache': masterCache,
    '@/stores/useAuthStore': { useAuthStore: { getState: () => ({ user: { id: 'user-1' } }) } },
    './operational.service': { requireOnline: () => {} },
  });
  return { api: service.pemakaianKendaraanApi, calls };
}

test('meter-terakhir: fresh online, the stored copy offline marked cached, nothing without one', async () => {
  const rows = new Map();
  const network = { online: true, answer: reading };
  const { api, calls } = usageService(rows, network);

  const fresh = await api.getMeterTerakhir('truk-1', 'km');
  assert.equal(fresh.meter_akhir, '1480');
  assert.equal(fresh.cached, false);
  assert.equal(calls[0].url, '/pemakaianKendaraan/meter-terakhir');
  assert.deepEqual({ ...calls[0].params }, { kendaraan_id: 'truk-1', satuan_meter: 'km' });

  network.online = false;
  const cached = await api.getMeterTerakhir('truk-1', 'km');
  assert.equal(cached.meter_akhir, '1480');
  assert.equal(cached.cached, true);

  // Another unit or vehicle was never fetched on this handset: the form shows nothing.
  await assert.rejects(api.getMeterTerakhir('truk-1', 'jam'));
  await assert.rejects(api.getMeterTerakhir('traktor-1', 'jam'));
});

test('prefill fills an empty field and replaces only its own earlier value', () => {
  const fresh = { ...reading, cached: false };
  assert.equal(prefill.nextMeterStart('', null, fresh), '1480');
  // Another vehicle's reading replaces the previous prefill...
  assert.equal(prefill.nextMeterStart('1480', '1480', { ...fresh, meter_akhir: '90' }), '90');
  // ...and a vehicle with no reading, or none reachable, clears it.
  assert.equal(prefill.nextMeterStart('1480', '1480', { ...fresh, meter_akhir: null, tanggal: null }), '');
  assert.equal(prefill.nextMeterStart('1480', '1480', undefined), '');
  // A typed value is never overwritten.
  assert.equal(prefill.nextMeterStart('1500', '1480', { ...fresh, meter_akhir: '90' }), '1500');
  assert.equal(prefill.nextMeterStart('1500', null, undefined), '1500');
});

test('hint informs on a match, warns on a difference, names a cached source, and is silent without a reading', () => {
  const fresh = { ...reading, cached: false };
  // 17:00 UTC on 7 October is 8 October on the estate calendar.
  assert.deepEqual({ ...prefill.meterHint(fresh, '1480') },
    { warn: false, text: 'Meter terakhir yang disetujui: 1.480 km (8 Okt 2026).' });
  const differs = prefill.meterHint(fresh, '1500');
  assert.equal(differs.warn, true);
  assert.match(differs.text, /^Meter awal berbeda dari meter akhir terakhir yang disetujui \(1\.480 km, 8 Okt 2026\)\./);
  assert.match(prefill.meterHint({ ...fresh, cached: true }, '1480').text, /dari data terakhir di perangkat/);
  assert.equal(prefill.meterHint(undefined, '1480'), null);
  assert.equal(prefill.meterHint({ ...fresh, meter_akhir: null, tanggal: null }, ''), null);
});
