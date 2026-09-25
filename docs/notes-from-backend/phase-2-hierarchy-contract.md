# Phase 2 frontend notes — plantation hierarchy contract

**Backend contract date:** 22 September 2026

**Audience:** Sawitin web and mobile maintainers
**Phase status:** In progress; this note closes the Phase 2 master-data work. No API changed.

## Nothing to implement, two things to stop assuming

This slice added no endpoint and no column. It settles what the hierarchy *means*, because both clients currently show labels that do not match what the data is.

### 1. `kelompok_lahan` is the farm or estate — the kebun

It is not a grouping of people, despite the name. A grower's parcels routinely sit in several blocks, and one block holds parcels owned by many people, so the level is physical. Any screen labelling it "Kelompok Tani", "Farmer Group", or similar is mislabelling a farm.

Recommended label: **Kebun** (Indonesian) / **Estate** (English). The table is not being renamed — that touches four foreign keys and both clients while buying clarity rather than capability — so the API field stays `kelompok_lahan_id`. Only the label changes.

### 2. A small farm does not skip the block level

```text
KUD or cooperative   kebun -> blok -> member parcel -> TPH
Small private farm   kebun -> one blok covering the farm -> parcel -> TPH
```

The level a small farm skips is division/afdeling, which is deferred and has no table at all. Do not build a UI affordance for it.

A setup flow for a smallholder should therefore still create one block, named after the farm, rather than offering to skip the step.

## The constraint worth knowing

`lahan.blok_id` is optional, so a parcel can be created without a block. **That parcel cannot be used for any operational document.** `bkm_panen`, `bkm_checker`, and `bkm_rawat` all require `blok_id`, so a harvest, checker, or maintenance record against a block-less parcel is impossible.

This matters after a register import, which can produce parcels faster than blocks are assigned.

- Web: show a parcel with no block as incomplete, and route to assigning one. Do not let it appear as a selectable source in a harvest or maintenance form.
- Mobile: filter block-less parcels out of the pickers in the Panen, Checker, and Rawat forms, or the user will pick one and the submit will fail with a validation error they cannot act on in the field.

Relaxing that requirement is a Phase 5 decision about operational documents, not a master-data change.

## Compatibility for existing organizations

- Existing `kelompok_lahan` rows are already farm/estate units. Nothing re-parents, nothing migrates, no document changes parent.
- Rows named after farmer groups are not renamed automatically; `nama` is the operator-facing identifier, so renaming is a deliberate action through `PUT /kelompokLahan/:id`.
- Nothing enforces one farm per organization. An organization using the level as a regional grouping can keep doing so.

## Verification

`tests/integration/plantationHierarchy.integration.test.ts` pins all of it against PostgreSQL: a KUD shape and a small-farm shape both build end to end, one organization's parcels are invisible to the other in both list and detail, a create that references another organization's kebun, member, or parcel is rejected with `400`, the same block name is allowed in two organizations, and a block-less parcel cannot back a BKM document.
