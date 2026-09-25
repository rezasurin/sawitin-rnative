# Phase 2 frontend notes — mapped locations (GeoJSON)

**Backend contract date:** 22 September 2026

**Audience:** Sawitin web and mobile maintainers
**Phase status:** In progress; this note covers the GPS geometry slice. It follows [Phase 2 master data](phase-2-master-data.md). Bulk import and the offline master cache are separate slices.

## The decision

Mapped locations are stored as **GeoJSON (RFC 7946) in a JSONB column**, not PostGIS. No field workflow needs the database to answer a spatial question, so area and containment stay in application code and the database image is unchanged.

## Contract shared by web and mobile

`kelompok_lahan`, `blok`, `lahan`, and `tph` each gained one optional field:

```json
"geometry": {
  "type": "Polygon",
  "coordinates": [[[102.345, 1.234], [102.355, 1.234],
                   [102.355, 1.244], [102.345, 1.244], [102.345, 1.234]]]
}
```

- Accepted types: `Point`, `Polygon`, `MultiPolygon`. Nothing else.
- **Positions are `[longitude, latitude]`** — the GeoJSON order, and the opposite of the legacy `lahan.koordinat_lokasi` array. This is the single most likely thing to get wrong.
- Polygon rings must be closed: at least four positions, the last repeating the first. A map-drawing control that returns an open ring must close it before sending.
- `geometry` is `null` when no location has been mapped.

### Update semantics

| You send | Result |
| --- | --- |
| `geometry` omitted | stored geometry is left unchanged |
| `geometry: null` | stored geometry is cleared |
| `geometry: { ... }` | stored geometry is replaced |

A form that serializes its whole state on every save will **wipe a mapped boundary** if it sends `geometry: null` for an untouched field. Send the field only when the user actually changed it, or send the value you loaded.

### Validation errors

Invalid GeoJSON is rejected by request validation with `400` and the standard `{ error: [{ field, message }] }` shape before the controller runs. Rejected cases include an out-of-range longitude or latitude, an unclosed or too-short ring, an unsupported type such as `LineString`, and a bare coordinate array with no `type`.

Because latitude is capped at ±90, a pair accidentally sent as `[latitude, longitude]` is rejected outright for most plantations — but **not** for a location where both values happen to fall within ±90. Do not rely on the backend to catch a swap; get the order right on the client.

### The legacy field

`lahan.koordinat_lokasi` still exists and still holds `[latitude, longitude]`. The migration copied every valid pair into `geometry` as a `Point`, swapping the order. Treat `koordinat_lokasi` as read-only legacy data:

- read location from `geometry`;
- write location to `geometry`;
- do not write `koordinat_lokasi` in new code.

Rows whose legacy pair was missing, the wrong length, or out of range were left with `geometry: null` and their original array untouched, so a farm may have a `koordinat_lokasi` value and no `geometry`. Surface those for correction rather than auto-converting them client-side.

## Web implementation checklist

- Add a map control to the kelompok lahan, blok, lahan, and TPH forms: a point picker for TPH, a polygon drawer for the three area levels.
- Convert between your map library's coordinate order and GeoJSON explicitly at the boundary. Leaflet uses `[lat, lng]` for its own LatLng type while GeoJSON uses `[lng, lat]`; write one conversion helper and use it everywhere rather than inline swaps.
- Close polygon rings before submitting. Most drawing controls return an open ring.
- Only include `geometry` in the request body when the user edited it, so an unrelated save cannot clear a boundary.
- Render a "not mapped" state for `geometry: null`, and flag a parcel that has a legacy `koordinat_lokasi` but no `geometry` as needing review.
- Add tests for round-tripping a drawn polygon, clearing a geometry, submitting a form that never touched the map, and rendering the `400` validation error.

## Mobile implementation checklist

- Add `geometry` to the master-data types and the local cache schema as a nullable JSON blob. It does not need parsing to be cached.
- Capturing a TPH point from the device: build `{ "type": "Point", "coordinates": [longitude, latitude] }`. Expo Location returns `coords.latitude` and `coords.longitude` as named fields, so read them by name and never by position.
- Do not send `geometry` on any offline mutation that did not capture a location. An omitted field leaves the stored value alone; a null clears it, and a queued mutation that clears a boundary is very hard to notice after the fact.
- Geometry is reference data for field forms. Nothing in this slice requires offline geofencing or point-in-polygon checks; that is Phase 6 scope.
- Add a parser test for a cached record with `geometry: null` and one with a polygon, and a queue test proving a mutation without a location does not carry a `geometry` key.

## Compatibility notes

- Fully backward compatible. `geometry` is optional everywhere, and a client that ignores it keeps working.
- Migration `20260922160000_geojson_geometry` must be deployed before clients send `geometry`. It adds nullable columns and backfills only from valid legacy pairs, so it is safe on a populated database.
- A shared `Geometry` OpenAPI component now exists at `#/components/schemas/Geometry`; regenerated clients will pick it up.
- One unrelated fix rides along: `PUT /tph/:id` previously discarded `basis_jjg_perbulan` and `basis_jjg_perhari` because the controller never read them from the body. Editing a TPH silently reverted its harvest basis. Both fields are now persisted, so a client that has been resending them will finally see them take effect.
