# Phase 4 frontend notes — field observations

**Backend contract date:** 22 September 2026

**Audience:** Sawitin web and mobile maintainers
**Phase status:** In progress; this note covers the field-observation slice. Stock count, vehicle and fuel usage, and consumption metrics are later Phase 4 slices.

## Why this changed

Pest scouting, disease findings, a tree census, rainfall, and a washed-out road were all things the field saw and had nowhere to put. They are not maintenance work — nobody is paid a man-day and no material leaves the store — so forcing them into a BKM Rawat would have made every consumption report wrong.

They are all the same record: a place, a date, a measurement, a severity, and evidence. One endpoint covers all five.

## Contract shared by web and mobile

### `POST /observasi`

| Field | Required | Notes |
| --- | --- | --- |
| `jenis` | yes | `HAMA`, `PENYAKIT`, `SENSUS_POKOK`, `CURAH_HUJAN`, `INFRASTRUKTUR`, `LAINNYA` |
| `kelompok_lahan_id` | yes | The kebun. This is the only required location |
| `blok_id`, `lahan_id`, `tph_id` | no | Narrow the location when it is known |
| `tanggal` | yes | Observation date |
| `nilai` | no | The measurement, ≥ 0 |
| `satuan` | no | Its unit, for example `mm` or `pokok` |
| `tingkat` | no | `RINGAN`, `SEDANG`, `BERAT` |
| `nama_pengamat` | yes | Who observed it |
| `catatan` | no | Free text, ≤ 2000 characters |
| `foto_url` | no | Evidence URL, uploaded before this call |
| `geometry` | no | GeoJSON, same contract as Phase 2 |
| `client_request_id` | no | Offline replay key |

Also available: `GET /observasi` (list, with `queryParser` filters on `jenis`, `tingkat`, and the four location ids; sortable by `tanggal`, `jenis`, `created_at`), `POST /observasi/list`, `GET /observasi/:id`, `PUT /observasi/:id`, `DELETE /observasi/:id`, and `GET /observasi/:id/history`.

### One measurement field, not several

`nilai` + `satuan` carries every kind: rainfall is `42.5 mm`, a census is `136 pokok`, a pest finding is `18 pokok` affected. Do **not** add per-kind numeric fields in the client and map them onto `nilai` differently — render one labelled number input whose label and unit default from `jenis`, and let the user change the unit.

Suggested defaults, which the user may override:

| `jenis` | Label | Default `satuan` |
| --- | --- | --- |
| `CURAH_HUJAN` | Curah hujan | `mm` |
| `SENSUS_POKOK` | Jumlah pokok | `pokok` |
| `HAMA`, `PENYAKIT` | Pokok terdampak | `pokok` |
| `INFRASTRUKTUR` | Panjang/volume | *(empty)* |

### Permissions

`/observasi` is authorized through the **BKM Rawat module** (`mod_bkm_rawat`). Anyone who can write a Rawat can record an observation; anyone who can read one can read observations. No new permission needs granting, and no new module appears in the role editor. If the role editor lists modules explicitly, do not add an "Observasi" row — it would imply a grant that does not exist.

### No approval

An observation has no `status`, no submit, and no approve or reject. Do not render a workflow bar, a status chip, or an approve button. Corrections are a plain `PUT`; every create, correction, and deletion is written to the audit log and readable at `GET /observasi/:id/history` as `CREATE`, `REVISE`, `DELETE`.

### Errors worth handling distinctly

| Status | Meaning |
| --- | --- |
| `400 Blok not found` | The block is not in this organization |
| `400 Blok must belong to selected kelompok lahan` | The block belongs to a different kebun — the location pickers are out of step |
| `400` on `geometry` | Positions are `[longitude, latitude]`; the legacy `[latitude, longitude]` order is rejected |
| `409` | The `client_request_id` belongs to a different user, which means a shared device reused a key |

## Web direction

1. **New list screen under Operations**, beside BKM Rawat. Default the filter to the last 30 days, and offer `jenis` and `tingkat` as filter chips.
2. **One create form** whose visible fields react to `jenis`: severity is meaningful for `HAMA`, `PENYAKIT`, and `INFRASTRUKTUR`, and pointless for `CURAH_HUJAN`. Hide rather than disable, and never send a hidden field's stale value.
3. **Rainfall is the high-frequency case** — a daily number for the kebun. Give it a fast path: date, number, save, with the location prefilled from the user's kebun.
4. **Detail view** shows the audit history inline, since there is no status to show instead.
5. **Map rendering** can reuse the Phase 2 GeoJSON component unchanged.

## Mobile direction

1. **This is an offline-first form.** Send `client_request_id` on every create, generated once when the user opens the form and reused across retries. A replay returns `200` with the stored record instead of creating a second one; treat `200` and `201` as the same success.
2. **Queue reuse, not a new processor.** The mutation is a plain create with no dependency on another document, so it goes in the existing queue as a standalone item — unlike a Rawat detail, it never has to wait for a parent.
3. **Photo before record.** `foto_url` must already be uploaded when the create runs. Reuse the existing upload-checkpoint path from the Panen flow, so a retry does not re-upload the image.
4. **GPS is the point of this form.** Capture `geometry` as a `Point` from the device automatically, and let the user proceed without it rather than blocking on a fix — a pest finding without coordinates still beats no record.
5. **Severity as three large buttons**, not a dropdown. This is filled one-handed in the field.
6. **Cache the kebun/blok list** — already cached from Phase 2, nothing new needed.

## What is deliberately not here

- **No approval workflow.** Added only if a supervisor must sign observations before they reach a report.
- **No separate permission module.** Split from `mod_bkm_rawat` when a scouting-only role exists.
- **No per-kind tables or per-kind endpoints.** One shape, one endpoint, filtered by `jenis`.

## Backend evidence

- Migration `20260922210000_field_observations`
- `src/schemas/observasi.schema.ts`, `src/controllers/observasiController.ts`, `src/routes/observasiRoute.ts`
- `src/utils/routeAuthorization.ts` (module mapping), `src/utils/queryHandlers.ts` (list contract)
- `tests/integration/observasi.integration.test.ts` — 6 tests covering kebun-level rainfall, a block-level pest finding with severity/photo/GPS, rejection of the legacy coordinate order, offline replay, cross-organization and cross-kebun block rejection, and audit history surviving deletion
