# Phase 2 frontend notes — plantation master data

**Backend contract date:** 22 September 2026

**Audience:** Sawitin web and mobile maintainers
**Phase status:** In progress; this note covers the master-data attribute and nullability slice. Farm/estate, division, GPS geometry, and bulk import are separate slices and are not covered here.

## Why this changed

A real farm register carries a block code, a parcel number, and an owner name. It does not carry planted area, tree counts, land-document evidence, or an employee's birth date. The backend previously required all of them, so an existing farm could not be entered without inventing data. Those fields are now optional.

## Contract shared by web and mobile

### Fields that are no longer required

| Endpoint | Now optional |
| --- | --- |
| `POST /blok` | `luas_blok`, `luas_planted`, `luas_unplanted`, `jumlah_pokok`, `tahun_tanam`, `tahun_panen` |
| `POST /lahan` | `user_pic_id`, `luas_lahan`, `nama_pemilik`, `alamat`, `tipe_dokumen`, `nama_dokumen`, `tanggal_dokumen`, `status_pemilik`, `koordinat_lokasi` |
| `POST /member` | `phone_number`, `address` (`birth_date` and `join_date` were already optional in the request and are now nullable in storage) |
| `POST /pekerja` | `join_date` |

Still mandatory: `blok` needs `kelompok_lahan_id` and `nama`; `lahan` needs `member_id` and `nama`; `member` needs `nama`; `pekerja` needs `member_id`.

All of these fields are now **nullable in responses**. Any client that types them as non-null, or renders them without a null check, will break.

### New attributes

- `blok`: `varietas` (string).
- `lahan`: `tahun_tanam` (integer), `jumlah_pokok` (integer), `varietas` (string).

Validation applies only when a value is sent: `tahun_tanam` must be between 1900 and next year, `jumlah_pokok` must be a non-negative integer, and areas must be non-negative. A rejected value returns `400` from request validation.

### Derived maturity — do not compute this on the client

Every `blok` and `lahan` response — list, detail, create, and update — now carries two server-derived fields:

```json
{ "tahun_tanam": 2015, "umur_tanam": 11, "maturitas": "TM" }
```

- `maturitas` is `TBM` (under 4 years), `TM` (4 to 24 years), or `TUA` (25 years and over).
- Both are `null` when `tahun_tanam` is unset or in the future.

The thresholds are backend constants so that screens, exports, and reports agree. Do not reimplement the calculation in either client; read `maturitas` and render it.

### New list filters

`GET /blok` accepts `varietas`. `GET /lahan` accepts `tahun_tanam` and `varietas`, and supports sorting by `tahun_tanam`.

### Access-rule change on parcels without a person in charge

`lahan.user_pic_id` is optional. The detail-access rule on Panen, Checker, and Rawat now reads:

- parcel names a PIC -> only that user or a privileged role may change details (unchanged);
- parcel names no PIC -> no PIC restriction; access falls back to the module permission the route already enforces;
- document has no parcel -> unchanged.

A parcel with no PIC is therefore not locked down. If a farm wants the restriction, it must assign a PIC.

## Web implementation checklist

- Make every field in the table above optional in forms, types, and table columns. Remove client-side `required` on them.
- Render an explicit empty state (an em dash, not `0` and not `-`) for null area, tree count, planting year, and land-document values. A null area must never be shown or summed as zero.
- Add `varietas` to blok and lahan forms and detail views; add `tahun_tanam` and `jumlah_pokok` to the lahan form.
- Show `maturitas` as a badge on blok and lahan lists and detail pages. Read it from the response; do not derive it from `tahun_tanam`.
- Add `varietas` and `tahun_tanam` filters and a `tahun_tanam` sort to the lahan list, and a `varietas` filter to the blok list.
- Drop any "person in charge is required" validation on the lahan form, and stop hiding detail actions purely because a parcel has no PIC — send the request and handle `403`.
- Update fixtures and component tests to cover a fully sparse record: a blok and a lahan whose optional fields are all null.

## Mobile implementation checklist

- Update the local master-data cache schema and TypeScript types so the fields above are nullable. A cached record written by an older build may still hold non-null values; the parser must accept both.
- Render null agronomic values as empty, never as `0`. Any per-hectare or per-tree display must hide itself when its denominator is null rather than divide.
- Store and display `maturitas` and `umur_tanam` as read-through server data. Do not compute them offline; a cached `maturitas` may be one year stale after a year boundary and that is acceptable until the next sync.
- Keep the lookup cache keys unchanged; only the record shape widened, so a cache refresh on next sync is enough. No migration of queued mutations is needed because no mutation payload field was removed.
- Verify the harvest and maintenance forms still submit when the selected parcel has no PIC and no land-document data.
- Add parser tests for a master-data payload whose optional fields are all null, and a restart test proving the widened cache reads back.

## Compatibility notes

- This slice is **backward compatible for writes**. A client that still sends every field keeps working; nothing was removed or renamed.
- It is **not backward compatible for reads** in a strictly typed client. Fields that could never be null before can be null now.
- Two OpenAPI corrections ride along: `CreateBlok` previously documented a non-existent `lahan_id` as its required parent (the real column is `kelompok_lahan_id`), and the `Lahan` schemas documented a non-existent `kelompok_lahan_id` (the real column is `blok_id`). Any generated client built from the old spec had these wrong.
- Migration `20260922140000_master_data_optional_and_agronomy` must be deployed before clients send the new attributes. It only widens columns, so it is safe to apply to a populated database and requires no backfill.
- Not in this slice, and still unavailable: farm/estate and division levels, GPS polygons, and bulk import. Continue to create master data one record at a time.
