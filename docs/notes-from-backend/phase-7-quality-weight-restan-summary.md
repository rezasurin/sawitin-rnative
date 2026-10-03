# Phase 7 frontend notes — grading, shrinkage, restan aging, and the field summary

**Backend contract date:** 23 September 2026

**Audience:** Sawitin web and mobile maintainers
**Phase status:** Third Phase 7 slice (7.3). This slice adds three web reports and the **first mobile report**: the field summary. Worker productivity, material, the full approval list, and exception reports follow later.

## Why this changed

These are the questions after "how much did we harvest":

- Was the fruit good?
- Did the mill receive what the estate weighed?
- What is still lying at the TPH?

The field summary puts three numbers in the mandor's hand at the start of the day. The shared display rules in [phase-7-report-definitions](phase-7-report-definitions.md) and the query parameters in [phase-7-production-and-interval](phase-7-production-and-interval.md) apply unchanged here: dates, `page`, `limit`, `format=csv`, and filter errors.

## Contract

### `GET /laporan/grading` — R03 grading and quality

Parameters: the shared range and farm/block filters, plus `tph_id`, `pekerja_id`, `grain`, and `group_by`, a comma list of `kelompok_lahan`, `blok`, `tph`, `pekerja` (default `blok`).

```json
{
  "definition": { "id": "R03", "version": 1 },
  "data": [
    {
      "blok_id": "…",
      "blok_nama": "B1",
      "approved": {
        "jumlah_janjang": 110,
        "janjang_normal": 98,
        "buah_mentah": 7,
        "over_ripe": 3,
        "tangkai_panjang": 2,
        "buah_abnormal": 0,
        "janjang_kosong": 0,
        "breakdown_total": 110,
        "pct_janjang_normal": 0.8909,
        "pct_buah_mentah": 0.0636,
        "pct_over_ripe": 0.0273,
        "pct_tangkai_panjang": 0.0182,
        "pct_buah_abnormal": 0,
        "pct_janjang_kosong": 0,
        "baris": 2,
        "baris_tidak_rekonsiliasi": 0
      },
      "submitted": { "…": "same shape" }
    }
  ]
}
```

- `jumlah_janjang` is the Checker's authoritative count. The six grade columns are the breakdown, and `pct_*` are **shares of the breakdown**, not of `jumlah_janjang`. When the two disagree, `baris_tidak_rekonsiliasi` counts the rows. Show it as a warning ("3 baris grading tidak cocok"), not as an error.
- **There is no "rejected fruit" figure.** If the design wants one, name the grades it adds together on screen, for example "mentah + kosong".
- Grouping by `pekerja` returns a `pekerja_id: null` row for Checker rows with no worker. Label it "tanpa pemanen".

### `GET /laporan/susut` — R04 loaded, weighed, and mill weight

Parameters: the shared range and farm filter, `grain`, and `group_by`:

| `group_by`                           | Rows                                                 |
| ------------------------------------ | ---------------------------------------------------- |
| `trip` (default)                     | One per trip, each with its own `status`             |
| `tujuan_kirim`, `kendaraan`, or both | Rolled up, split by `grain`                          |
| `periode`                            | Rolled up by `grain` alone, for example daily totals |

`trip` and `periode` cannot be combined with another value. `blok_id` returns `400`.

A trip row:

```json
{
  "krani_timbang_id": "…",
  "nomor_dokumen": "KT-0812",
  "tanggal": "2026-08-05",
  "status": "APPROVED",
  "tujuan_kirim": "PKS Sei Mangkei",
  "kendaraan_id": null,
  "nomor_kendaraan": "BK 1 XX",
  "kelompok_lahan_ids": ["…", "…"],
  "nomor_tiket": "T-3391",
  "janjang_dimuat": 50,
  "janjang_timbang": 75,
  "janjang_restan_terbawa": 20,
  "netto_internal": 1650,
  "netto_pks": 1690,
  "susut_kg": -40,
  "susut_pct": -0.0242
}
```

A rolled-up bucket, and the `totals`:

```json
{
  "trip": 4,
  "janjang_dimuat": 140,
  "janjang_timbang": 225,
  "janjang_restan_terbawa": 20,
  "netto_internal": 4450,
  "trip_tanpa_netto": 1,
  "trip_tanpa_tiket": 2,
  "trip_bertiket": 2,
  "netto_internal_bertiket": 3450,
  "netto_pks": 3440,
  "susut_kg": 10,
  "susut_pct": 0.0029
}
```

**Rendering rules specific to R04:**

1. **Two ledgers, two column groups.** Bunches (`janjang_*`) go under one heading and kilograms (`netto_*`, `susut_*`) under another. Never compute bunches minus kilograms.
2. **`janjang_restan_terbawa` is inside `janjang_timbang`.** It explains part of the weighed count and is not an extra load. Show it as "termasuk restan: 20", not as a separate column that invites adding.
3. **Shrinkage covers ticketed trips only.** `susut_kg` compares `netto_internal_bertiket` with `netto_pks`, never the full `netto_internal`. Put the ticketed internal netto next to the shrinkage, and show `trip_tanpa_tiket` as "2 trip belum ada tiket PKS" so a low shrinkage figure isn't read as complete.
4. **Positive `susut` means the mill weighed less.** Negative happens (scale drift, moisture). Show the sign; don't take the absolute value.
5. `kelompok_lahan_ids` with more than one entry marks a mixed-farm trip. With a farm filter, mixed trips are excluded and counted in `totals.trip_multi_kebun`.
6. **Link each trip row to the existing trace screen** (`GET /kraniTimbang/:id/trace`). Its figures use the same arithmetic.

### `GET /laporan/restan` — R05 restan quantity and aging

Parameters: the shared range, farm and block filters (block works through the TPH's parcel), `tph_id`, and `group_by` of `kelompok_lahan` (default), `tph`, or both. **`grain` returns `400`.**

```json
{
  "definition": { "id": "R05", "version": 1 },
  "filters": { "as_of": "2026-08-31", "…": "…" },
  "data": [
    {
      "kelompok_lahan_id": "…",
      "kelompok_lahan_nama": "Kebun Satu",
      "approved": {
        "terbuka": {
          "janjang": 40,
          "brondol": 4,
          "baris": 2,
          "umur_tertua_hari": 11,
          "umur": {
            "0-1": { "janjang": 0, "baris": 0 },
            "2-3": { "janjang": 30, "baris": 1 },
            ">3": { "janjang": 10, "baris": 1 }
          }
        },
        "aliran": {
          "janjang_baru": 60,
          "baris_baru": 3,
          "janjang_terangkut": 20,
          "baris_terangkut": 1,
          "rata_hari_angkut": 2
        }
      },
      "submitted": { "janjang": 15, "brondol": 1, "baris": 1 }
    }
  ]
}
```

- **`terbuka` is a snapshot as of `tanggal_sampai`**, shown in `filters.as_of`. Restan collected after that date still counts as waiting on it. Label the section "per 31 Agu".
- **`aliran` is the whole range:** what was left behind and what was collected.
- **`submitted` is RESTAN on Checkers still awaiting approval.** It isn't restan yet. Show it as "menunggu persetujuan Checker", never added into `terbuka`.
- `umur_tertua_hari: null` means nothing is open.

CSV export flattens the nesting into columns such as `approved_terbuka_umur_2-3_janjang`.

### `GET /laporan/ringkasan` — R11 field summary (mobile)

One optional parameter, `kelompok_lahan_id`. The date is always **today in the organization's timezone**.

```json
{
  "definition": { "id": "R11", "version": 1 },
  "generated_at": "2026-09-23T00:42:10.512Z",
  "tanggal": "2026-09-23",
  "timezone": "Asia/Jakarta",
  "bjr_used": 15,
  "kelompok_lahan_id": null,
  "produksi": {
    "approved": { "janjang": 7, "kg_estimasi": 105, "kg_estimasi_total": 106 },
    "submitted": { "janjang": 3, "kg_estimasi": 45, "kg_estimasi_total": 45 }
  },
  "restan": {
    "approved": { "janjang": 39, "baris": 3, "umur_tertua_hari": 26 },
    "submitted": { "janjang": 15, "baris": 1 }
  },
  "persetujuan": [
    {
      "dokumen": "BKM_PANEN",
      "modul": "mod_bkm_panen",
      "menunggu": 2,
      "umur": { "<1": 1, "1-3": 0, ">3": 1 },
      "tertua_hari": 5,
      "dikembalikan": 1
    }
  ]
}
```

- **`persetujuan` lists only document types the user can approve.** An empty array means there is nothing for this user to decide, not an error. `dikembalikan` counts documents rejected back to their maker, which don't wait on the approver. The farm filter doesn't narrow approvals; they cover the whole organization.
- Needs `mod_laporan` read. The seed now grants it to Mandor Panen, but **organizations seeded before 23 September 2026 need an administrator to grant it**. Handle `403` by hiding the card, not by showing an error screen.

## Web direction

1. **Grading:** a stacked bar per block or per week built from the six grade columns, with `jumlah_janjang` as a separate line or label. The bars are shares of the breakdown. Show the `baris_tidak_rekonsiliasi` warning under the chart.
2. **Shrinkage:** default to `group_by=periode&grain=day` for the trend. Use the trip list for drill-down, where each row links to the trace. A year of trip rows is the slowest shape here (about 1 s at twice pilot scale), so land on the grouped view and page the trip list.
3. **Restan:** an aging table by farm with the three buckets. The `>3` bucket is the one to highlight. Put a TPH toggle (`group_by=tph`) on the same screen. Default `tanggal_sampai` to today so the snapshot is current.
4. Every screen keeps the shared shell, CSV button, and definition footer.

## Mobile direction

Build **one screen, the field summary**, as the first card on the Mandor and Asisten home.

1. **Three tiles:**
   - Panen hari ini: approved janjang, with submitted shown as "+3 menunggu", and kg labelled "estimasi";
   - Restan terbuka: janjang, number of TPH rows, and the oldest age in days;
   - Menunggu persetujuan: a total, plus one row per document type with the oldest age.
2. **Online-only, with a cached last result.** On success, store the whole response. Offline, show the stored response under a banner: "Data per 07:42, offline". Build it from `generated_at` in local time. **Do not queue anything**, and do not compute any of these numbers from local SQLite. The device holds only its own user's documents, so a local figure would silently disagree with the server.
3. **Refresh** on pull-to-refresh and when the app returns to the foreground. No background polling.
4. **Farm filter:** if the user's work is tied to one farm, pass `kelompok_lahan_id`; otherwise omit it. Say on screen that approvals are organization-wide.
5. **Gate the card on `mod_laporan` read.** On `403`, hide it silently: the permission is new, and many existing users won't have it yet.
6. **Tapping** the approvals tile should open the existing approval list for that document type. There is no new mobile approval screen.

## What is deliberately not here

- **No "rejected fruit" total and no grade weighting.** The schema doesn't say which grades are inside `jumlah_janjang`, so the server reports and doesn't derive.
- **No shrinkage for trips without a mill ticket**, and no estimate for them.
- **No restan trend by day.** Open restan is a snapshot. For a trend, request consecutive `tanggal_sampai` values.
- **No full approval list yet.** R11 returns counts only. The document-by-document list is R09, in slice 7.5.
- **No push notification for the summary.** The existing approval notifications still fire; the summary is pull-only.

## Backend evidence

- `gradingReport`, `shrinkageReport`, `restanReport`, `pendingApprovalCounts`, `fieldSummary` in `src/services/ReportService.ts`; `src/controllers/laporanController.ts`, `src/routes/laporanRoute.ts`, `src/schemas/laporan.schema.ts`
- `tests/integration/laporan.integration.test.ts`: 36 tests, 15 of them new in this slice, covering grading reconciliation, the trace-matching trip arithmetic, ticketed-only shrinkage, restan open as of a date versus collected later, pending RESTAN, the caller-scoped approval counts with audit-log and `modified_at` ages, and the farm filter
- `prisma/seeder/roleSeeder.ts`: Mandor Panen gains `mod_laporan` read
- [Operational report definitions](../operational-reports.md): R03, R04, R05, R11, and the recorded performance measurements
