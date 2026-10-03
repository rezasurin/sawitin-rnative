# Phase 6 frontend notes — the offline sync contract

**Backend contract date:** 22 September 2026

**Audience:** Sawitin web and mobile maintainers
**Phase status:** Every Phase 6 implementation item is complete; the gate is a real-device field test and is outstanding. **The mobile app already implements everything in the "Mobile direction" table below** — it is kept here as the record of what changed and why. The **web work in the table above it has not been done** and is what this note is asking for.

## Why this changed

Five things were missing or broken, and each one costs real work in a bad-signal block:

1. **Two devices editing one draft silently last-write-wins.** Nothing detected it.
2. **Every sync refetched every master list.** `queryClient.invalidateQueries()` over a 2G link.
3. **A photograph had a `lat`/`lng` but no accuracy, no capture time, and no way to check the stored file still matched the row pointing at it.**
4. **There was no upload endpoint.** The app POSTs to `/upload/bkm-panen-photo`; that route did not exist in this backend. Every photo upload 404'd, and the queue dutifully checkpointed the failure.
5. **Nothing on the server knew a device's queue was stuck.**

## 1. Conflict detection — `If-Unmodified-Since`

Panen, Checker and Rawat **headers and details** accept an optional request header carrying the `modified_at` you last read:

```
PUT /bkmPanen/:id
If-Unmodified-Since: 2026-09-22T11:04:17.318Z
```

| Response | Meaning |
| --- | --- |
| `200` | Applied |
| `409` | Someone changed it first. Body is `{ error, current }` where `current` is the row **as it now stands** |
| `404` | It is gone |
| `400` | The header was not a parseable timestamp |

**Sending no header keeps the old behaviour exactly.** Nothing you have shipped breaks. Adopt it per screen.

The same precondition guards status transitions, so submitting a document somebody else edited is refused rather than silently applied.

### What to build on the 409

`current` exists so you can show both sides. This is the "supervisor resolution workflow" — the server holds **no conflict state**, it just refuses and hands back the truth. On mobile, a 409 is a **queue conflict, not a retryable failure**: do not retry it, move the item to a state a human resolves. Offer "keep mine" (re-send with the new `modified_at`) or "take theirs" (drop the queued item).

## 2. Incremental pull — `POST /sync/delta`

```jsonc
// request
{ "since": "2026-09-22T09:00:00.000Z", "limit": 500 }   // both optional

// response
{
  "changed": { "blok": [...], "lahan": [...], "tph": [...], ... },
  "cursor": "2026-09-22T11:30:02.771Z",
  "has_more": false,
  "skipped": ["material"]
}
```

Covers `kelompok_lahan`, `blok`, `lahan`, `tph`, `pekerja`, `material`, `kendaraan`, `supir` — the lists cached in SQLite that field forms cannot open without.

- **Loop while `has_more` is true**, passing the returned `cursor` each time. Do not assume one call catches you up.
- **`skipped` names models left out** because the role cannot read that module. An empty array for a model you expected is a permissions fact, not an error — do not clear your cache for it.
- **Persist the cursor** next to the cache, per user. Omitting `since` is a full pull.
- **Rows may repeat across pages.** Upsert by `id`; never append.
- **Deletions are not in here.** A timestamp cursor cannot describe a row that is gone. Keep a periodic full list (daily is plenty) and drop anything absent from it.

Operational documents are unchanged — keep using React Query refetch for those.

## 3. Evidence metadata

`bkm_panen_detail` and `observasi_lapangan` accept four new optional fields:

| Field | Notes |
| --- | --- |
| `gps_accuracy` | Metres. The fix's radius, from the platform location API |
| `captured_at` | **When the device took the reading**, not when it synced. An offline item can arrive days later |
| `foto_hash` | SHA-256 of the uploaded bytes — returned to you by `/upload`, just pass it through |
| `foto_bytes` | Size, same source |

`bkm_panen_detail` additionally returns a server-computed **`geofence_status`**: `INSIDE`, `OUTSIDE`, or `UNKNOWN`, evaluated against the parcel's mapped `geometry` and falling back to the block's.

**Geofencing records; it never rejects.** A detail from outside the boundary is stored with `OUTSIDE` and filed normally. `UNKNOWN` means nothing was mapped or no position was captured — it is not a failure.

Send `geofence_override_reason` when you know the user is outside and you asked them why. It is **optional**: making it mandatory would turn an old client's detail into a permanent validation failure, which in the field is lost work. Prompt for it, but never block the save on it.

## 4. Upload — `POST /upload`

Multipart, field name `file`, plus a `folder` from the whitelist `bkm-panen | bkm-checker | bkm-rawat | observasi | tiket-pks`.

```jsonc
// 201 stored, or 200 when identical content was already there
{ "url": "/media/<org>/bkm-panen/<sha256>.jpg", "hash": "…", "bytes": 184320 }
```

**The path changed.** The old `/upload/bkm-panen-photo` never existed here; use `POST /upload` with a `folder`.

- **`200` is success, not a no-op to retry.** It means the same bytes were already stored and you are getting the original URL back. This is the whole resumability story: a dropped upload is retried whole and costs one object, not two.
- **Keep persisting the returned URL into the queue before the next API call.** That existing checkpoint plus content addressing is what prevents orphaned objects.
- **Pass `hash` and `bytes` straight into the detail row** — that is what makes the evidence checkable later.
- Errors: `415` unsupported type (jpeg/png/webp/pdf only), `413` too large (10 MB default), `400` unknown folder or no file.

There is **no chunked/resumable protocol**. A field photo is a few megabytes over a link that is either up or not; re-sending beats the machinery to resume. Say so if someone asks why a 90%-complete upload restarts.

## 5. Telemetry — `POST /sync/telemetry`

```jsonc
{ "device_id": "…", "app_version": "1.4.0", "queued": 12, "pushed": 30,
  "failed": 2, "dead_lettered": 1, "conflicts": 0, "oldest_queued_age_seconds": 3600 }
```

Counters only, and the schema is **strict**: any key it does not name gets the whole request rejected with `400`. That is deliberate — it is what guarantees a document body, a photo path or a coordinate can never reach the server log through this endpoint. Do not try to attach a `last_error` string or a failing payload; it will be refused.

Post it after each sync attempt. `202` means recorded.

## Web — `Saweed-Reactjs` (to do)

What to change, and where:

| # | Change | Where |
| --- | --- | --- |
| 1 | **Send `If-Unmodified-Since` on every update.** Keep the `modified_at` from the detail fetch in form state and set the header on submit. Cleanest as an opt-in per call rather than a blanket interceptor, so a deliberate force-overwrite stays possible | `src/services/transaction/bkmPanen.service.ts`, `bkmChecker.service.ts`, `bkmRawat.service.ts`; header plumbing in `src/services/baseApi.ts` |
| 2 | **Handle `409` as a dialog, not a toast.** The body's `current` is the stored row — show it beside the user's unsaved edit with "keep mine" (re-submit with `current.modified_at`) and "discard mine" | Edit forms under `src/components/forms`, shared conflict dialog in `src/components/core` |
| 3 | **Show `geofence_status` on the Panen detail row and in the approval view.** `OUTSIDE` plus `geofence_override_reason` is precisely the case a supervisor is meant to stop on; `UNKNOWN` is not a warning | Panen views under `src/components/views` |
| 4 | **Show `gps_accuracy` as a qualifier**, never as pass/fail. "±30 m" next to the position. A wide fix says where the worker could have been, not that they cheated | Same views |
| 5 | **Move uploads to `POST /upload`** with a `folder`, and store the returned `hash`/`bytes` on the detail. There is no upload service in the web app yet — this is new | New `src/services/general/upload.service.ts` |
| 6 | **Do not use `/sync/delta`.** It exists for the device's SQLite cache. The web app is online and React Query already covers this | — |

## Mobile — `saweed-rnative/sawitin` (done)

All of this is implemented. It is listed so the contract is complete in one place and so the web side can see how the same server behaviour was consumed.

| # | Change | Where |
| --- | --- | --- |
| 1 | **Persist the `modified_at` you last read with the queued item** and send it as `If-Unmodified-Since` when the item replays. Without it, a queued edit from Tuesday silently overwrites Wednesday's correction | new `precondition` column in `services/database.ts`; sent from `services/sync-processor.ts` |
| 2 | **Treat `409` as a conflict state, not a retry.** Retrying cannot help — it will fail identically forever. Route it to a resolution screen holding `current` | error classification in `services/sync.service.ts` |
| 3 | **Replace the master-cache refetch with `POST /sync/delta`**, persisting the cursor per user beside the cache. Keep a daily full pull so deletions are reconciled | `services/master-cache.ts`, `services/sync.service.ts` (the `queryClient.invalidateQueries()` pull phase) |
| 4 | **Capture `gps_accuracy` and `captured_at` at capture time**, not at sync time — that they differ is the entire point of recording them | the Panen detail capture screens under `app/` |
| 5 | **Switch `uploadApi` to `POST /upload`** with a `folder`, treat `200` and `201` alike, and pass the returned `hash`/`bytes` into the detail payload | `services/upload.service.ts` — currently posts to `/upload/bkm-panen-photo`, which **does not exist** and has been 404ing |
| 6 | **Post telemetry after each sync attempt.** Counters only; the endpoint rejects anything else. This is how a handset stuck in a retry loop becomes visible without someone walking out to the block | `services/sync.service.ts` |
| 7 | **Scope the queue by user and device** and drop the second processing loop | `services/database.ts`, `hooks/useSyncProcessor.ts`, `services/sync.service.ts` |

Two things worth knowing if you touch this code:

- **The queue survives sign-out on purpose.** Rows stay on disk and simply become invisible; they belong to the worker who created them and reappear when that person signs in again. Never "clean up" another user's rows.
- **A dead item is never retried automatically.** That is the point — it waits on the account screen for a person to retry or discard it, because silently dropping a morning's work is the failure the whole queue exists to prevent.

## What is deliberately not here

- **No version column.** Concurrency rides on the existing `modified_at`. Two writes inside the same millisecond are indistinguishable; that is accepted for field documents.
- **No delete feed.** See `/sync/delta` above.
- **No server-side conflict state or resolution queue.** The server refuses and returns the truth; resolution is a client workflow.
- **No mandatory geofence.** See above.
- **No chunked upload.** See above.
- **No object storage.** Local disk behind a two-function seam. A deployment with more than one node swaps it for S3/MinIO; `MEDIA_ROOT` must be a mounted volume in Docker until then.

## Backend evidence

- `src/utils/optimisticLock.ts`, and the six updated controllers under `src/controllers/bkm*`
- `src/services/DeltaSyncService.ts`, `src/controllers/syncController.ts`, `src/routes/syncRoute.ts`
- `src/services/MediaStorageService.ts`, `src/controllers/uploadController.ts`, `src/routes/uploadRoute.ts`
- `containsPoint` in `src/utils/geometry.ts`; migration `20260922260000_field_evidence_metadata`
- Tests: `tests/integration/optimisticConcurrency.integration.test.ts` (5), `deltaSync.integration.test.ts` (4), `fieldEvidence.integration.test.ts` (6), `mediaUpload.integration.test.ts` (6), `tests/syncTelemetry.test.ts` (4)
