# Phase 2 mobile — master-data compatibility and hierarchy

Implemented 23 September 2026. This is the first mobile slice, not Phase 2 sign-off.

## Delivered

- `types/master-data.ts` accepts nullable block/parcel agronomy, PIC and land-document fields, member contact/dates, and worker joining date. Create types require only the backend's mandatory fields; optional writes remain optional rather than sending null where the backend does not accept it.
- Block and parcel types carry server `varietas`, `umur_tanam`, and `maturitas`. New fields can be absent in old caches. Picker labels show server maturity and age, using an em dash for unknown values and retaining a real zero age. There is no offline maturity calculation. Existing mobile screens have no area/tree denominator calculations to migrate.
- `utils/plantation.ts` centralizes operational source filtering. Panen parcel and detail-TPH pickers, Checker TPH picker, and Rawat parcel picker require a matching, non-empty block. Panen TPH selection also respects a selected parcel. Invalid retained selections disable progression; existing details are not silently removed.
- Rawat applies filtering to both list responses and its offline lookup fallback, and permits a parcel without PIC or land documents. Optional no-parcel operation remains available when a block is selected.
- Rawat labels the physical estate **Kebun**. API keys and operator-supplied names are unchanged. No afdeling level was introduced.

## Cache, permissions, and compatibility

The existing SQLite `lookup_cache.payload` JSON column and parser preserve nullable and additional fields already. No SQLite migration, lookup-key change, queue migration, or destructive backfill is necessary. Values are not normalized to zero. Existing user-scoped cache keys and backend-derived tenant/permission enforcement are unchanged; no new PIC gate was added.

Legacy `koordinat_lokasi` is correctly typed as a nullable array and excluded from new write payload types. It is never auto-converted by the client.

## Imported people, targets, and mapped locations

The remaining code slices were implemented on 23 September 2026:

- `member.kode` is optional/nullable and travels through nested `Pekerja.member` records. Worker pickers, grading/review rows, and harvest detail cards show `Name (code)` when present, without confusing it with `nik`. Uncoded/older records keep their normal names.
- TPH pickers distinguish positive daily/monthly basis from `belum diatur` for zero, missing, negative or non-finite values. No pre-existing mobile basis division or basis-based validation was found; none was added. Zero targets do not block field entry.
- `types/geometry.ts` defines nullable/optional GeoJSON Point, Polygon, and MultiPolygon data for kebun, blok, lahan, and TPH response/write types. Existing JSON persistence preserves these without schema changes. Estate/member list services now also use the user-scoped read-through cache; estate lists are warmed with field lookups.
- Panen and Checker display the selected TPH's mapped/unmapped state. Included parcel coordinates with legacy data but no geometry are flagged for review. Polygon boundaries are identified, not converted into points or used for geofencing.
- An explicit location action uses the existing device-location hook and writes a Point as `[longitude, latitude]` only after confirmation. It requires `mod_tph.update` and connectivity, checks session ownership before saving, surfaces capture/API failures, and refreshes TPH queries. This is a separate master-data update, not automatic conversion of operational GPS evidence. Master-location edits are online-only; no new unsupported master queue module was introduced.
- Untouched geometry stays omitted; explicit null clears and an explicit object replaces. All four update services preserve these semantics. Ordinary queued operational headers carry no geometry key.
- Mobile UX guidance informed the confirmation, loading/error feedback, semantic button labels, disabled states, and minimum touch-target size. No visual redesign or new UI library was introduced.

## Verification

`scripts/check-plantation.cjs` adds five tests:

1. Block-less/wrong-block sources are excluded; sparse parcels remain eligible.
2. Unknown/zero/server-provided maturity values render without client calculation.
3. Real SQLite JSON persistence survives database close/reopen and offline fallback, preserving both sparse and old records and excluding another user's cache.
4. Panen and Checker component picker options exclude invalid sources and accept sparse records.
5. Rawat component saves a sparse parcel online and queues the equivalent header offline, covering both list and lookup-fallback sources.

Additional tests cover person-code labels, zero-target guards, longitude-first conversion, legacy review labels, omission/clear/replacement in all four services, and location-action permission/connectivity/confirmation/error states. The SQLite restart fixtures now include member codes, null geometry, Point, Polygon, and MultiPolygon.

Validation: `npm run typecheck`, `npm test` (69 passing, no skips), and `git diff --check` passed.

Not run: physical-device connectivity/restart UAT or live-backend Panen/Checker/Rawat submission. Confirm against deployed Phase 2 migrations with a block-assigned parcel whose PIC and land documents are null, then repeat offline/reconnect. Also verify an unassigned parcel never appears and existing KUD/smallholder names stay unchanged.

The central phase tracker is unchanged: automated mobile evidence is not product/QA sign-off, and Phase 1 device UAT remains open. Device/live-backend UAT was explicitly excluded from this follow-up request. No import UI, afdeling hierarchy, polygon editor, or geofencing was built.
