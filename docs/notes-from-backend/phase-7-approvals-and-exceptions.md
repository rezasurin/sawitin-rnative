# Phase 7 frontend notes — pending approvals and exceptions

**Backend contract date:** 23 September 2026

**Audience:** Sawitin web and mobile maintainers
**Phase status:** Fifth Phase 7 slice (7.5). With this slice **every operational report is served**, and the Phase 7 reports checklist item is complete. The data-quality checks, a sixth section in the exceptions report, arrive in slice 7.6.

## Why this changed

Two questions were left:

- "What is waiting for me to decide?"
- "What went wrong that nobody has noticed?"

The second one needed something new. Phone sync telemetry used to be only logged, so nobody could see which handset in which organization was stuck. The server now keeps each device's latest report.

The shared rules from [phase-7-report-definitions](phase-7-report-definitions.md) still apply.

## Contract

### `GET /laporan/persetujuan` — R09 pending approvals

**No date range**: this report describes now. Parameters are `dokumen` (one of `BKM_PANEN`, `BKM_CHECKER`, `BKM_RAWAT`, `KRANI_TIMBANG`, `PEMAKAIAN_KENDARAAN`, `STOCK_OPNAME`, `PENJUALAN`), `page`, `limit`, and `format`.

```json
{
  "definition": { "id": "R09", "version": 1 },
  "filters": {
    "per": "2026-09-23T05:07:00.758Z",
    "timezone": "Asia/Jakarta",
    "dokumen": null,
    "inclusion": "…"
  },
  "ringkasan": [
    {
      "dokumen": "BKM_PANEN",
      "modul": "mod_bkm_panen",
      "menunggu": 2,
      "umur": { "<1": 1, "1-3": 0, ">3": 1 },
      "tertua_hari": 5,
      "dikembalikan": 1
    }
  ],
  "data": [
    {
      "dokumen": "BKM_PANEN",
      "id": "…",
      "nomor": null,
      "tanggal": "2026-08-12",
      "dibuat_oleh": "mandor01",
      "diajukan_pada": "2026-09-18T04:07:00.000Z",
      "umur_hari": 5
    }
  ],
  "meta": { "page": 1, "limit": 100, "total": 2, "pages": 1 }
}
```

- **Only document types the user can approve appear**, in both `ringkasan` and `data`. Sales count for users with `update` on the finance module, because a sale is approved by editing its status. Asking for a type the user can't approve returns empty lists, not `403`.
- `data` is **oldest first**. `umur_hari` counts from the latest submission, so a document rejected and resubmitted starts again.
- `ringkasan` has the same shape as the `persetujuan` array in the mobile field summary.
- `nomor` exists only for Krani Timbang (the trip number). Everything else shows `tanggal` and `dibuat_oleh`.
- `dibuat_oleh` is the maker's user code, as stored on the document.

### `GET /laporan/pengecualian` — R10 exceptions

Parameters:

- `tanggal_dari` and `tanggal_sampai`, used by the geofence and trip sections only;
- `bagian`: one of `staging`, `rekonsiliasi`, `perangkat`, `geofence`, `perjalanan`;
- `ambang_jam`: hours before pending work counts as stuck, default 24;
- `tiket_hari`: days a trip may wait for its mill ticket, default 3;
- `page`, `limit`, `format`.

`kelompok_lahan_id`, `blok_id`, and `grain` return `400`. **CSV needs `bagian`**; without it you get `400`.

**Without `bagian`** you get counts only, which is what a dashboard badge needs:

```json
{
  "definition": { "id": "R10", "version": 1 },
  "ringkasan": { "staging": 2, "rekonsiliasi": 1, "perangkat": 2, "geofence": 1, "perjalanan": 3 },
  "data": [],
  "meta": { "total": 0, "…": "…" }
}
```

**With `bagian`** you also get that section's rows, oldest first:

| `bagian`       | What it catches                                                                                   | Row fields                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `staging`      | Weighbridge scans that failed to reconcile, or are still pending after `ambang_jam`               | `id`, `unique_transaction_id`, `status`, `error_message`, `nomor_kendaraan`, `jumlah_janjang_timbang`, `created_at`, `umur_jam`                 |
| `rekonsiliasi` | Reconciliation jobs that could not be dispatched to the worker                                    | `id`, `bkm_checker_id`, `attempts`, `last_error`, `trace_id`, `available_at`, `created_at`                                                      |
| `perangkat`    | Handsets holding a dead-lettered item, or with queued work at least `ambang_jam` old **now**      | `user_id`, `username`, `device_id`, `app_version`, `queued`, `dead_lettered`, `antrean_tertua_jam`, `terakhir_lapor`                            |
| `geofence`     | Harvest rows filed outside their parcel or block boundary (approved and submitted, in range)      | `bkm_panen_detail_id`, `bkm_panen_id`, `status`, `tanggal`, `blok_nama`, `tph_nama`, `pekerja_nama`, `gps_accuracy`, `geofence_override_reason` |
| `perjalanan`   | Approved trips in range with no mill ticket after `tiket_hari`, or a vehicle entered as free text | `krani_timbang_id`, `nomor_dokumen`, `tanggal`, `nomor_kendaraan`, `tanpa_tiket`, `kendaraan_teks_bebas`                                        |

- `antrean_tertua_jam` is the reported age of the oldest queued item **plus the hours since the device last reported**. A phone that went quiet with work on it keeps getting older here until it syncs again. `terakhir_lapor` shows when that was.
- **Error strings (`error_message`, `last_error`) are for administrators.** Show them in a detail drawer, not on a manager's main screen.

## Web direction

1. **Approvals inbox:** a single list across document types from R09, grouped or filterable by `dokumen`. Sort oldest first, highlight `umur_hari > 3`, and link each row to that document's existing detail screen, where the approve/reject buttons already are. The count badges come from `ringkasan`.
2. **Exceptions page (administrators):** five tabs, one per `bagian`, each tab badge taken from the counts-only call. Load a tab's rows only when it's opened.
   - **Staging:** the retry action already exists (`POST /staging/krani-timbang/:id/retry`); put it on the row.
   - **Devices:** show `username` and `terakhir_lapor`. The action is a phone call to the worker, not a button.
   - **Trips:** link to the trace screen and to entering the mill ticket.
3. Expose `ambang_jam` and `tiket_hari` as small settings on the page, defaulting to 24 and 3. Don't hard-code them.
4. **R10 needs `mod_laporan` read**, which the Asisten and Manajer roles have. If only administrators should see this page, hide it in the web client by role. The API does not distinguish it from the other reports.

## Mobile direction

1. **Keep posting `POST /sync/telemetry` after every sync attempt.** No payload change. It now also feeds the devices tab, so **`device_id` must be stable per installation**. `services/device.ts` already keeps it in SecureStore. The exception is its fallback when the keystore is unavailable, which mints an in-memory id for each run: such a phone appears as a new device every time the app restarts. That's acceptable as a rare fallback, but don't widen it.
2. **Optional, but it fits the field summary:** tapping the approvals tile may open a list from `GET /laporan/persetujuan?dokumen=<type>` rather than a per-module screen. It's online-only, like the summary: show the last response offline with its `filters.per` time, and never queue anything.

## What is deliberately not here

- **No data-quality section yet.** It arrives with slice 7.6, as a sixth `bagian`.
- **No device history.** The server keeps each device's latest report only; history lives in logs and metrics.
- **No retry or discard of a phone's dead items from the web.** Those items exist only on the phone, and the person holding it decides.
- **No farm filter on exceptions.** A stuck queue or a failed dispatch belongs to the organization, not to a farm.

## Backend evidence

- `approvalReport`, `exceptionReport`, and `pendingApprovalCounts` in `src/services/ReportService.ts`
- `sync_device_status` in `prisma/schema.prisma`, migration `20260923100000_sync_device_status`, and the upsert in `postSyncTelemetry` (`src/controllers/syncController.ts`)
- `tests/integration/laporan.integration.test.ts`, 58 tests. This slice added:
  - approvals narrowed to what the caller may approve, ages from the audit log and from `modified_at`, and CSV as of a moment;
  - every exception section, with healthy rows next to caught ones;
  - a quiet device's age judged now;
  - telemetry that replaces a device's previous report rather than adding rows;
  - refused filters.
- [Operational report definitions](../operational-reports.md): R09, R10, and the recorded performance measurements
