# Phase 7 frontend notes — loose fruit (brondol) is kilograms

**Backend contract date:** 23 September 2026

**Audience:** Sawitin web and mobile maintainers
**Phase status:** A correction to the Phase 7 reports, between slices 7.4 and 7.5. It adds one field and bumps two report versions (R01 and R02 to v2). No endpoint was added or removed.

## Why this changed

The reports treated `brondol` as a figure of unknown unit, so they never added it to anything. The product owner has confirmed that **every `jumlah_brondol` is loose fruit in kilograms**, in whole kg. Two things follow from that:

1. Estimated harvest weight can now include loose fruit.
2. The actual bunch weight was overstated. A truck is weighed with its loose fruit aboard, so dividing the whole netto by the bunch count put the loose fruit's weight into every bunch.

## Contract

### New field `kg_estimasi_total` — R01, R06 harvest, R11

Wherever `kg_estimasi` appears in `/laporan/produksi`, `/laporan/produktivitas-panen`, and `/laporan/ringkasan`, it now has a sibling:

| Field               | Meaning                                                                             |
| ------------------- | ----------------------------------------------------------------------------------- |
| `kg_estimasi`       | **Unchanged.** Bunches only: `janjang` × BJR                                        |
| `kg_estimasi_total` | **New.** `kg_estimasi` + recorded `brondol`, or `null` when no row recorded brondol |

### R01 v2 — yield includes loose fruit

`/laporan/produksi` now returns `"definition": { "id": "R01", "version": 2 }`. `yield_kg_per_ha` = `kg_estimasi_total` ÷ area. For a group where no row recorded brondol, it falls back to `kg_estimasi` ÷ area rather than going `null`, so an estate that never weighs loose fruit still sees a yield. **Yields rise slightly compared with v1** wherever brondol was recorded. R06 and R11 only gain the new field and keep their versions.

### R02 v2 — `bjr_aktual` excludes loose fruit

`/laporan/bjr-aktual` (and `/laporan/rotasi`, which shares the report version) now returns `"definition": { "id": "R02", "version": 2, … }`. Each bucket gains `brondol_kg`:

```json
{ "trip": 2, "netto_kg": 2800, "brondol_kg": 90, "janjang_timbang": 140, "bjr_aktual": 19.3571 }
```

`bjr_aktual = (netto_kg − brondol_kg) ÷ janjang_timbang`. **For a period with weighed loose fruit it will be lower than what v1 returned.** That's the correction, not a data problem. The harvest-interval figures didn't change.

### Other reports

- **R05 restan** and **R03 grading**: `brondol` / `jumlah_brondol` figures are now labelled kg. The numbers are unchanged.
- **R04 shrinkage**: unchanged. Estate and mill netto both already include the loose fruit on the truck.

## Web direction

1. **Label every `brondol` column "brondol (kg)"** across the report screens.
2. **Production screens:** show `kg_estimasi` as "kg janjang (estimasi)" and add `kg_estimasi_total` as "kg total (estimasi, termasuk brondol)". If `kg_estimasi_total` is `null`, show "—" and the existing "n baris tanpa brondol" hint. Label yield "kg/ha (termasuk brondol)" and put "R01 v2" in the footer.
3. **Weighing screens (krani):** the brondol entered on a weighing must be **what was loaded on that truck**, not a copy of the Checker's figure. The bunch-weight report subtracts it from that truck's netto. Make the field label "Brondol di truk ini (kg)".
4. **Bunch-weight screen:** show `brondol_kg` next to `netto_kg`, and put the footer "R02 v2" on it. If anyone compared v1 figures in a spreadsheet, the drop is expected.
5. **Never add `brondol` to `janjang`.** They're a weight and a count.

## Mobile direction

1. **Field summary card:** the Panen tile can show `kg_estimasi_total` under the bunch figure, labelled "termasuk brondol". Keep `kg_estimasi` as the headline, because that's what the other screens compare against.
2. **Everywhere loose fruit is entered or shown** (BKM Panen, Checker, weighing, restan): label the input "Brondol (kg)" if it doesn't already say so. The backend stores whole kilograms, so the field should accept integers.

## What is deliberately not here

- **Decimal kilograms.** The columns are integers; no migration was made.
- **A combined bunches-plus-brondol figure in R04.** That report compares weighbridges, which already weigh both.

## Backend evidence

- `productionMeasures`, `finishWeight`, and `bunchWeightReport` in `src/services/ReportService.ts`
- `prisma/schema.prisma`: a `/// Loose fruit (brondolan), in kilograms.` doc comment on every brondol column (comment only, no migration)
- `tests/integration/laporan.integration.test.ts`: expectations updated for `kg_estimasi_total`, R01 v2 yields, and R02 v2, with 90 kg of weighed loose fruit on one trip, plus a test for the bunch-only yield fallback. The suite passes: 164 integration tests on 23 September 2026.
- [Operational report definitions](../operational-reports.md): units table, R01 v2, R02 v2 (including why only same-weighing brondol is subtracted), and the change log
