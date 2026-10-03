# Phase 4 frontend notes — consumption and result metrics

**Backend contract date:** 22 September 2026

**Audience:** Sawitin web and mobile maintainers
**Phase status:** This is the final Phase 4 slice. All nine implementation items are delivered; the phase awaits product and QA sign-off.

## Why this changed

The structured fields added in the first Phase 4 slice — treated area, tree count, dosage — existed so this question could be answered: *how much fertilizer did that block actually get per hectare?* This endpoint answers it, once, on the server, so every screen and export agrees.

## Contract

`POST /bkmRawat/metrics`, under the BKM Rawat module's read permission.

```json
{
  "tanggal_dari": "2026-09-01",
  "tanggal_sampai": "2026-09-30",
  "group_by": ["blok"],
  "blok_id": null,
  "kelompok_lahan_id": null,
  "kategori_pekerjaan_id": null,
  "item_pekerjaan_id": null,
  "material_id": null
}
```

`group_by` accepts one to three of `blok`, `kategori`, `item`, with no repeats, and defaults to `["blok"]`. The date range is **required** — an unbounded aggregation over every document an organization has ever approved is the one shape of this query that gets slow, and no screen needs it. A reversed range returns `400`.

Response:

```json
{
  "filters": { "status": "APPROVED", "denominator": "recorded treated area and tree count", "...": "..." },
  "groups": [
    {
      "blok_id": "…", "blok_nama": "B01",
      "luas_ha": 15, "jumlah_pokok": 750,
      "hasil_pekerjaan": 750, "hasil_per_ha": 50,
      "jumlah_pekerja": 8, "jumlah_dokumen": 2,
      "materials": [
        { "material_id": "…", "nama": "Urea", "satuan": "kg",
          "jumlah": 1400, "per_ha": 93.3333, "per_pokok": 1.8667 }
      ]
    }
  ]
}
```

### Three rules to render correctly

1. **Only approved work is counted.** Drafts and rejected documents contribute nothing. If a user asks why a number looks low, the answer is usually an unapproved document — consider linking to the pending-approval list from this screen.
2. **The denominator is the area recorded as treated,** not the block's master area. `per_ha` answers "how heavily was the ground that was worked dosed", not "how much did this block receive across its full size". Label it accordingly — *"per ha dirawat"* rather than a bare *"per ha"*. If a coverage figure against the block's planted area is ever wanted, that is a different number and a separate request; do not compute it client-side from `blok.luas_planted` and present it under the same label.
3. **`null` is not zero.** A rate is `null` when the area or tree count was never recorded. Render an em dash, never `0`. `0.00 kg/ha` reads as "we applied nothing", which is the opposite of "nobody wrote down the area".

## Web direction

1. **This is a report screen**, so give it the filter bar the other report screens will use: date range first, then kebun, block, activity, material.
2. **Two useful default views**: *by block* for "where did the fertilizer go", and *by work item* for "what did each activity consume". Both are one request with a different `group_by`; make it a toggle, not two screens.
3. **Nest the material rows under their group.** The shape already does this, and flattening it invites the double-counting mistake the backend is careful to avoid — a material row's `per_ha` is only meaningful against its own group's area.
4. **Show `jumlah_dokumen`** beside each group. It is the fastest way for a manager to sense whether a surprising number comes from one odd document or a real trend.
5. **Export to CSV** at the row grain of group × material.

## Mobile direction

**Skip this one.** It is a management question asked at a desk, not in the field, and nothing in the mobile workflows needs it. If a summary is ever wanted on mobile, ask for the specific question first — a full report screen ported to a phone is the kind of thing nobody opens twice.

## What is deliberately not here

- **No `mod_laporan` route.** Reporting as a module stays deferred; this endpoint lives under BKM Rawat because it reports on maintenance consumption specifically. General operational reporting is Phase 7.
- **No fuel-per-hectare.** Vehicle fuel is recorded against `pemakaian_kendaraan`, a different grain. Combining the two is a Phase 7 report with its own definition.
- **No caching or read models.** One query pair over a bounded date range. Add a read model when a real dataset makes it slow, not before.

## Backend evidence

- `src/services/ConsumptionMetricsService.ts`, `src/schemas/consumptionMetrics.schema.ts`, `getBkmRawatMetrics` in `src/controllers/bkmRawatController.ts`, `src/routes/bkmRawatRoute.ts`
- `tests/integration/consumptionMetrics.integration.test.ts` — 6 tests covering the two-materials-one-area trap, approved-only counting, null rates, grouping by work item, cross-tenant exclusion, and date-range handling
- `tests/integration/phase4Gate.integration.test.ts` — the phase gate, running one fertilizing round from an empty block through approval, fuel, observation, metrics, and a reconciling stock count
