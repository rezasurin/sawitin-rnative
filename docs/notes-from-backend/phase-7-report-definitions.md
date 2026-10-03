# Phase 7 frontend notes — report definitions

**Backend contract date:** 23 September 2026

**Audience:** Sawitin web and mobile maintainers
**Phase status:** First Phase 7 slice (7.1). Definitions only: **no report endpoint exists yet.** Endpoints arrive in slices 7.2–7.6, each with its own note.

## Why this changed

Laporan was deferred because nobody had said what a report should count. That is now written down in [Operational report definitions](../operational-reports.md): eleven reports, their sources, formulas, units, and which documents they include. The product owner made four decisions it depends on:

- estimated kilograms below trip level;
- approved and submitted figures in separate columns;
- a web dashboard plus a mobile summary;
- CSV as the only export.

Nothing needs building yet. Read this now because the display rules below apply to every report screen, and getting them wrong produces numbers that look right and aren't. Design the screens against these rules before the endpoints land.

## Contract

### What is coming

| ID  | Report                                                                                  | Web         | Mobile  | Slice     |
| --- | --------------------------------------------------------------------------------------- | ----------- | ------- | --------- |
| R01 | Production and yield by farm, block, parcel, TPH, worker                                | yes         | —       | 7.2       |
| R02 | Harvest interval (rotasi) and actual bunch weight                                       | yes         | —       | 7.2       |
| R03 | Grading and quality                                                                     | yes         | —       | 7.3       |
| R04 | Loaded vs weighed vs mill weight; shrinkage                                             | yes         | —       | 7.3       |
| R05 | Restan quantity and aging                                                               | yes         | —       | 7.3       |
| R06 | Worker productivity                                                                     | yes         | —       | 7.4       |
| R07 | Fertilizer/chemical per ha and tree (replaces `POST /bkmRawat/metrics` for new screens) | yes         | —       | 7.4       |
| R08 | Material stock, movements, count variance                                               | yes         | —       | 7.4       |
| R09 | Pending approvals                                                                       | yes         | via R11 | 7.5       |
| R10 | Sync failures and exceptions                                                            | yes (admin) | —       | 7.5       |
| R11 | Field summary: today's production, open restan, my pending approvals                    | —           | yes     | 7.3 / 7.5 |

All reports sit under `/laporan` and need `mod_laporan` read. Seeded Asisten and Manajer roles have it; **Mandor Panen does not** and needs an admin to grant it before R11 works on their handset. Hide the report menu when the permission is absent, and handle a `403` anyway.

Every response will carry the same envelope:

```json
{
  "definition": { "id": "R01", "version": 1 },
  "filters": {
    "tanggal_dari": "2026-09-01",
    "tanggal_sampai": "2026-09-30",
    "timezone": "Asia/Jakarta",
    "bjr_used": 15
  },
  "totals": { "approved": { "janjang": 1200 }, "submitted": { "janjang": 80 } },
  "data": [{ "blok_id": "…", "approved": { "janjang": 600 }, "submitted": { "janjang": 40 } }],
  "meta": { "page": 1, "limit": 100, "total": 12, "pages": 1 }
}
```

The exact fields per report come with each slice's note. The shape above — `definition`, `filters`, `totals`, `approved`/`submitted` pairs, `meta` — is fixed now.

### Six rules every report screen must follow

1. **Never add `approved` and `submitted` under one label.** They are separate on purpose: approved is final, submitted can still be rejected. Show approved as the headline figure and submitted beside it as "menunggu persetujuan". If a design really needs a combined figure, label it as including unapproved work.
2. **`kg_estimasi` is an estimate.** Below trip level, kilograms are bunches × BJR, because the weighbridge weighs a truck, not a block. Label it _"kg (estimasi)"_ and show the `bjr_used` from `filters`. Weighed and mill kilograms appear only in R02 and R04, and never under the same label as the estimate.
3. **`null` is not zero.** A rate is `null` when its denominator was never recorded. Render an em dash, never `0`.
4. **Days are the estate's days.** `tanggal_dari` and `tanggal_sampai` are local dates, both inclusive, in the timezone echoed in `filters.timezone`. Send plain `YYYY-MM-DD` dates. Don't convert them to UTC timestamps on the client, or the range will drift by a day.
5. **Totals come from `totals`,** not from summing the visible page. A page holds at most 500 rows, and the total covers the whole range.
6. **Show the definition ID and version** (for example "R01 v1") in the screen footer and in every export, so a printed number can be traced to the rule that produced it.

### Two report-specific traps worth knowing now

- **Grading has no single "rejected fruit" number.** R03 returns every grade column plus the authoritative bunch count, side by side, as the harvest trace does. Don't sum grades into a "reject" figure without naming which ones you added.
- **Counts and weights never meet.** Bunches (janjang) and kilograms are separate ledgers. Don't compute "kg per bunch" on the client from R01 and R04. R02 already returns `bjr_aktual` from the trips where both were actually measured.

## Web direction

1. **Build one shared report shell now:**

   - a filter bar with the date range first, then farm, block, parcel, and TPH;
   - a grain toggle (day, week, month);
   - an approved/submitted column pair component;
   - a footer with the definition, timezone, and BJR;
   - a CSV button.

   Every report in 7.2–7.5 is that shell plus a table.

2. **CSV comes from the server** via `?format=csv`, not from the table on screen, so exports include every row and carry the definition header.
3. **Limit the date picker to 366 days.** The server rejects longer ranges with `400`, and so does a reversed range.
4. **Keep the existing consumption-metrics screen** on `POST /bkmRawat/metrics` until R07 ships. It will keep working after that, but new work should target R07.

## Mobile direction

1. **One screen only: the R11 field summary**, for Mandor and Asisten. Don't port the web reports to the phone.
2. **It is online-only.** Cache the last response and show it offline with its `generated_at` time ("per 07:42"). Never queue anything for it, and never compute a summary from local SQLite. Local data doesn't include other users' documents, so it would disagree with the server.
3. **Gate the entry point on `mod_laporan` read.** The same rule as the web applies: approved and submitted are shown separately.
4. The endpoint and response arrive with slice 7.3; build nothing before then.

## What is deliberately not here

- **No endpoints yet.** This slice is the definitions the endpoints must match.
- **No XLSX or PDF export.** CSV only, by product decision.
- **No planned-versus-actual or attendance reports.** Both are deferred with Phase 3.
- **No issue, return, or transfer figures** in the material report. Those documents were deferred on 22 September 2026.
- **No historical BJR.** The organization has one current BJR. Changing it restates earlier estimates, which is why every response echoes `bjr_used`.

## Backend evidence

- [Operational report definitions](../operational-reports.md): R01–R11, DQ01–DQ06, and the shared rules above.
- [Product decisions — Laporan reactivated](../product-decisions.md#laporan-reactivated-23-september-2026).
- [Status tracker](../plantation-field-operations-status.md): Phase 7 item "Define every operational report…".
