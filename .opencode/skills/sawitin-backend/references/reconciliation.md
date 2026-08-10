# Offline Sync, QR Payloads, and Staging Reconciliation

This is the most frontend-relevant backend subsystem: mobile field devices work offline, and weighbridge
(krani timbang) data can arrive at the server **before** the BKM Checker data that produced it. The staging system
absorbs that out-of-order arrival.

## The flow

```
Mobile checker (offline)          Mobile krani (offline)            Server
─────────────────────             ──────────────────────            ──────
Generates QR payload     ──→      Scans QR, submit via      ──→     POST /staging/krani-timbang
(V2|<checkerId>|<tphId>|                                      │
 <qty>|<ts>|<sig>)                                            ├─ fast path: matching APPROVED checker
                                                              │   exists & unlinked → create krani
                                                              └─ slow path: no checker yet → save
                                                                  pending_timbangan_log (PENDING)
When checker syncs later ──→ BKM Checker approve ──→ enqueue "reconcile-checker" BullMQ job
                                                              │
                                                              └─ worker matches pending log by
                                                                  unique_transaction_id, computes
                                                                  discrepancy, creates krani_timbang
                                                                  or marks REVISION_REQUESTED
```

## QR payload format (V2 — `src/utils/qrHandler.ts`)

```
V2|<checkerId>|<tphId>|<qty>|<ts>|<sig>
```

- `checkerId` — bkm_checker document id (source of truth)
- `tphId` — TPH being harvested
- `qty` — number of janjang (integer string)
- `ts` — unix timestamp **ms** at generation
- `sig` — HMAC-SHA256 over `V2|<checkerId>|<tphId>|<qty>|<ts>` keyed with `QR_SECRET_KEY`, **base64url**, full
  signature (NOT truncated — the old docs describe SHA-256 hex truncation, that is wrong)

Verification (`verifySignature`): timing-safe compare of expected vs received base64url bytes. Length mismatch →
false.

Timestamp validity (`isTimestampFresh`): `ageMs = now - ts` must satisfy `-QR_CLOCK_SKEW_MS <= ageMs <= QR_EXPIRY_MS`
(defaults: 5 minutes future-skew allowance, 48 hours expiry).

`buildUniqueTransactionId` → `V2|<checkerId>|<tphId>|<qty>|<ts>` (same string minus signature) — this is the dedup
key in `pending_timbangan_log.unique_transaction_id`.

## POST /staging/krani-timbang (body via submitStagingPayloadSchema)

Body contains at least `{ qr_payload, nama_supir?, nomor_kendaraan?, tujuan_kirim? }`. Behavior:

1. Parse QR (`parseQrPayload`) → 400 on format errors.
2. Verify signature → `403 { error: "Invalid QR signature. Payload mungkin telah dimanipulasi." }`.
3. Check timestamp → `400 { error: "QR payload sudah kadaluarsa atau timestamp tidak valid." }`.
4. Resolve TPH within org → `400 { error: "TPH di dalam QR tidak ditemukan untuk organisasi ini." }`.
5. Look for an existing APPROVED, unlinked bkm_checker with that id:
   - **Fast path (found):** compute `discrepancyPct = |parsed.qty − Σ details.jumlah_janjang| / checkerTotal × 100`
     (string, 1 decimal, e.g. `"3.2"`). In a `$transaction`: create `krani_timbang` (status APPROVED if
     `discrepancyPct <= tolerance` else REVISION_REQUESTED, `origin_source: "BKM_CHECKER"`), create
     `detail_timbang` + `source_checkers`, write `bkm_status_log`. Return **201**:
     ```json
     { "message": "Direct match — krani_timbang created", "reconciled": true,
       "discrepancy_pct": "1.8", "data": { ...kraniTimbang... } }
     ```
   - **Slow path (not found):** create `pending_timbangan_log` (status PENDING). Return **202**:
     ```json
     { "message": "Payload diterima. Menunggu data Checker untuk rekonsiliasi.",
       "reconciled": false, "staging_id": "...", "data": { ...pendingLog... } }
     ```
   - Duplicate `unique_transaction_id` → **409** `{ error: "Duplicate transaction", message, existing_id }`.

## Reconciliation worker (`src/workers/reconciliationWorker.ts` + `src/job/reconciliationJob.ts`)

- Dispatched by `approveBkmChecker` → `reconciliationQueue.add("reconcile-checker", { bkmCheckerId, orgId }, {
  attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: 1000, removeOnFail: 1000 })`.
- **The worker process must be running** (`yarn dev:worker`) — the server alone cannot reconcile.
- Worker flow: load checker + details → sum `jumlah_janjang` → find PENDING `pending_timbangan_log` rows (same org
  + tph) → discrepancy % vs `DISCREPANCY_TOLERANCE_PCT` (default 2) → `$transaction`:
  - atomically claim the log (`updateMany where status=PENDING`; 0 rows claimed = another job won → skip)
  - create `krani_timbang` (APPROVED or REVISION_REQUESTED, `origin_source: STAGING`), `source_checkers` +
    `detail_timbang`, write `bkm_status_log`
  - if out of tolerance → `notifyRevisionRequired` (currently a console.log stub — notificationService is TODO)
- On job failure after retries: remaining PENDING logs for that checker → FAILED with `error_message`.
- P2002 on `pending_log_id` is treated as already-processed (skip).

## Statuses to expect

- `pending_timbangan_log.status`: PENDING (waiting for checker), MATCHED (reconciled), FAILED.
- Resulting `krani_timbang.origin_source`: `STAGING` (reconciled from pending log), `BKM_CHECKER` (fast path),
  `MANUAL` (desktop entry), `RESTAN`.
- `krani_timbang.status`: APPROVED (within tolerance) or REVISION_REQUESTED (over tolerance) when created from the
  staging pipeline; DRAFT when created manually.

## Frontend implications

- **Mobile krani flow**: scan the checker's QR, POST to `/staging/krani-timbang` with the raw payload string. Do
  NOT call `POST /kraniTimbang` for QR-scanned entries.
- **Mobile checker flow**: after approving/syncing a checker, the QR payload is generated with the secret key —
  signing happens where the secret lives; the backend verifies with the same `QR_SECRET_KEY`.
- **Web admin flow**: watch `staging/krani-timbang` logs and `restan/pending`; REVISION_REQUESTED checkers need a
  human follow-up (note notifyRevisionRequired is a stub — no real push notification yet).
- **Unique transaction id** is the dedup key — retrying a submit returns 409, not a duplicate insert.
