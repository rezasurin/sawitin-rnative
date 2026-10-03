# Phase 7 frontend notes — worker productivity, fertilizer and chemical use, material stock

**Backend contract date:** 23 September 2026

**Audience:** Sawitin web and mobile maintainers
**Phase status:** Fourth Phase 7 slice (7.4). This slice adds four web report endpoints and **changes the date handling of `POST /bkmRawat/metrics`**. Only the approval list and exception reports (R09, R10) are still to come.

## Why this changed

This slice answers three questions:

- Who produced how much per working day?
- How heavily was the ground dosed?
- Does the store's book agree with the shelf?

It also closes a bug in the Phase 4 consumption endpoint: a document timestamped late on the last day of the range was silently left out. The shared display rules ([phase-7-report-definitions](phase-7-report-definitions.md)) and query parameters ([phase-7-production-and-interval](phase-7-production-and-interval.md)) apply unchanged.

## Behaviour change — `POST /bkmRawat/metrics`

**Request and response shapes are unchanged.** What changed:

- `tanggal_dari` and `tanggal_sampai` are now read as **local calendar days in the organization's timezone, both inclusive**. Before, the end bound was a raw UTC instant, so anything after 00:00 UTC on the last day (07:00 in Jakarta) was dropped. Totals for a range that includes the latest day can therefore go **up** after this deploy. That's the fix working, not a regression.
- Timestamps are still accepted, but only their UTC calendar date is used. Send plain `YYYY-MM-DD`.
- `filters.tanggal_dari` and `filters.tanggal_sampai` in the response now echo those dates as `YYYY-MM-DD` rather than a full ISO timestamp.

No client change is required. If the web screen parses those two echoed fields as a `Date`, check that it still displays them correctly.

## Contract

### `GET /laporan/produktivitas-panen` — R06 harvest productivity

Parameters: the shared range, `grain`, `kelompok_lahan_id`, `blok_id`, `pekerja_id`. There is one row per worker, split further by period when `grain` is set.

```json
{
  "definition": { "id": "R06", "version": 1, "section": "panen" },
  "totals": {
    "approved": { "janjang": 260, "hari_kerja": 5, "…": "…" },
    "submitted": { "…": "…" }
  },
  "data": [
    {
      "pekerja_id": "…",
      "pekerja_nama": "Andi",
      "approved": {
        "janjang": 190,
        "brondol": 19,
        "brondol_tidak_dicatat": 0,
        "kg_estimasi": 3800,
        "kg_estimasi_total": 3819,
        "baris": 3,
        "hari_kerja": 3,
        "janjang_per_hari": 63.3333,
        "jumlah_tph": 2
      },
      "submitted": { "janjang": 0, "hari_kerja": 0, "janjang_per_hari": null, "…": "…" }
    }
  ]
}
```

- **`hari_kerja` is days with recorded harvest, not attendance.** Attendance is deferred. Label it "hari dengan hasil panen", never "hari hadir".
- In `totals`, `hari_kerja` is **person-days**: two workers on the same day count 2. Don't label the total as "calendar days".
- `kg_estimasi` is bunches × BJR, as in R01. Label it as estimated.

### `GET /laporan/produktivitas-rawat` — R06 maintenance productivity

The same parameters as the harvest section. There is one row per worker × work item × output unit (× period).

```json
{
  "definition": { "id": "R06", "version": 1, "section": "rawat" },
  "totals": {
    "approved": { "hk": 7, "baris": 4, "baris_tanpa_hasil": 1 },
    "submitted": { "…": "…" }
  },
  "data": [
    {
      "pekerja_id": "…",
      "pekerja_nama": "Andi",
      "item_pekerjaan_id": "…",
      "item_pekerjaan_nama": "Tabur pupuk",
      "satuan_hasil": "pokok",
      "pekerja_tidak_terhubung": false,
      "approved": {
        "hasil_pekerjaan": 250,
        "hk": 4,
        "baris": 3,
        "baris_tanpa_hasil": 1,
        "hasil_per_hk": 125
      },
      "submitted": {
        "hasil_pekerjaan": null,
        "hk": 0,
        "baris": 0,
        "baris_tanpa_hasil": 0,
        "hasil_per_hk": null
      }
    },
    {
      "pekerja_id": null,
      "pekerja_nama": "Tim Semprot",
      "satuan_hasil": "ha",
      "pekerja_tidak_terhubung": true,
      "approved": { "hasil_pekerjaan": 4.5, "hk": 3, "hasil_per_hk": 1.5, "…": "…" }
    }
  ]
}
```

- **HK = Σ `jumlah_pekerja`.** One BKM Rawat detail row is read as one day's work by that many people.
- **`hasil_per_hk` uses only the HK of rows that recorded an output.** Rows without `hasil_pekerjaan` still count in `hk` and in `baris_tanpa_hasil`. Show "1 baris tanpa hasil" beside the rate so a manager knows the rate covers less than all the labour.
- **Never add `hasil_pekerjaan` across rows with different `satuan_hasil` or work items.** That's why `totals` has no output figure. A column total of "hasil" on this screen is wrong by construction.
- `pekerja_tidak_terhubung: true` means the row was entered with a free-text name and no worker record. Show a badge ("belum terhubung ke data pekerja"). These rows can't be joined to payroll later.

### `GET /laporan/konsumsi-material` — R07 fertilizer and chemical use

Parameters: the shared range, `kelompok_lahan_id`, `blok_id`, `material_id`, `kategori` (`material.kategori`, for example `Pupuk` or `Herbisida`), and `group_by`, a comma list of `blok`, `kategori`, `item` (default `blok`). **`grain` returns `400`.**

Each row carries the Phase 4 metrics object twice:

```json
{
  "blok_id": "…",
  "blok_nama": "B1",
  "approved": {
    "luas_ha": 8.5,
    "jumlah_pokok": 520,
    "hasil_pekerjaan": 254.5,
    "hasil_per_ha": 29.9412,
    "jumlah_pekerja": 5,
    "jumlah_dokumen": 2,
    "materials": [
      {
        "material_id": "…",
        "nama": "Urea",
        "satuan": "kg",
        "jumlah": 110,
        "per_ha": 12.9412,
        "per_pokok": 0.2115
      }
    ]
  },
  "submitted": { "luas_ha": 1.5, "jumlah_dokumen": 1, "materials": ["…"] }
}
```

- The rendering rules from [phase-4-consumption-metrics](phase-4-consumption-metrics.md) still apply: the denominator is treated area, `null` isn't zero, and material rows stay nested under their group.
- **`kategori` and `material_id` filter the material rows, not the area.** Filtering to `Pupuk` still divides by all treated area in the group. Keep the label "per ha dirawat".
- A group with nothing in one status has `jumlah_dokumen: 0` and `materials: []` on that side. Render "—".
- No `totals`: rates don't add across blocks.
- CSV has one row per group × status × material, with a `status` column.
- **Migration:** new screens should use this endpoint. The existing screen can stay on `POST /bkmRawat/metrics`, which returns the same approved figures.

### `GET /laporan/material` — R08 material stock

Parameters: the shared range, `material_id`, `kategori`. **`kelompok_lahan_id`, `blok_id`, and `grain` all return `400`**, because there is one store.

```json
{
  "definition": { "id": "R08", "version": 1 },
  "filters": { "stok_snapshot": "current balance", "…": "…" },
  "data": [
    {
      "material_id": "…",
      "kode": "UREA",
      "nama": "Urea",
      "kategori": "Pupuk",
      "satuan": "kg",
      "approved": {
        "saldo_awal": 500,
        "masuk": 200,
        "keluar": 130,
        "penyesuaian": -5,
        "saldo_akhir": 565,
        "stok_snapshot": 565,
        "ledger_sesuai": true,
        "opname": [
          {
            "stock_opname_id": "…",
            "tanggal": "2026-08-25",
            "stok_sistem": 575,
            "stok_fisik": 570,
            "selisih": -5,
            "selisih_pct": -0.0087
          }
        ]
      },
      "submitted": { "keluar_rawat": 40, "keluar_bbm": 0, "selisih_opname": 0 }
    }
  ]
}
```

- **Every figure is in the row's own `satuan`.** There are no totals, and the screen must never add kilograms and litres.
- **`stok_snapshot` and `ledger_sesuai` are `null` unless the range ends today or later.** The snapshot is the balance now, not on `tanggal_sampai`. `filters.stok_snapshot` says which case applies.
- **`ledger_sesuai: false`** means the balance on record doesn't match its movements: stock written without a ledger row, usually from before opening balances were recorded. Highlight it, and suggest a stock count to fix it.
- `submitted` is what would move on approval: maintenance materials, fuel, and the net variance of submitted counts. Show it as "menunggu persetujuan", never added into `saldo_akhir`.
- Issue, return, and transfer columns don't exist; those documents are deferred.
- CSV collapses `opname` into `approved_opname_jumlah` and `approved_opname_selisih`.

## Web direction

1. **Productivity** gets two tabs, Panen and Rawat, on the shared report shell.
   - The Panen tab defaults to one row per worker, sorted by `janjang_per_hari`.
   - The Rawat tab groups rows visually by work item and unit, never totals the output column, and shows `baris_tanpa_hasil` and the unlinked-worker badge.
2. **Consumption:** switch new work to R07. A `kategori` selector (Pupuk / Herbisida / all) is the main addition over the Phase 4 screen.
3. **Material stock:** a table per material with opening → in → out → adjustment → closing, a detail drawer listing the counts, and a warning chip on `ledger_sesuai: false`. Default `tanggal_sampai` to today so the snapshot comparison is shown.
4. **Check the Phase 4 consumption screen** after this deploy for the date-echo change described above.

## Mobile direction

**Nothing to build.** These are management reports for the desk. The field summary (R11) is still the only mobile report.

## What is deliberately not here

- **No attendance-based productivity.** Attendance is deferred with Phase 3.
- **No output totals across units, and no stock totals across materials.**
- **No per-activity area filter in R07.** Filtering materials doesn't change the denominator, and that stays true to the Phase 4 definition.
- **No month-by-month stock trend.** Request consecutive ranges if a trend is needed.
- **No historical balance snapshot.** Stock "on date X" is `saldo_akhir` for a range ending on X, computed from the ledger.

## Backend evidence

- `harvestProductivityReport`, `maintenanceProductivityReport`, `consumptionReport`, `materialReport` in `src/services/ReportService.ts`; `src/services/ConsumptionMetricsService.ts` and `src/utils/reportDates.ts` for the date fix; `src/controllers/laporanController.ts`, `src/routes/laporanRoute.ts`, `src/schemas/laporan.schema.ts`
- `tests/integration/laporan.integration.test.ts`: 48 tests, 12 of them new in this slice, with hand-worked figures for person-days, output per HK with unmeasured rows, treated-area rates, category filtering, ledger walk-through, snapshot comparison, pending movements, CSV shapes, and refused filters
- `tests/integration/consumptionMetrics.integration.test.ts`: a new test pins the last-day fix, covering a document on the last local day and one just after it
- [Operational report definitions](../operational-reports.md): R06, R07, R08, and the recorded performance measurements
