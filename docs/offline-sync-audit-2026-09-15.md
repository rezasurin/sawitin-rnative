# Audit — Offline sync pipeline (`useSyncProcessor`)

**Target:** `saweed-rnative/sawitin/hooks/useSyncProcessor.ts`
**Date:** 2025 (report-only pass — no code modified)
**Typecheck at audit time:** `npx tsc --noEmit` → exit 0 (clean).

> **Headline:** the pipeline is correct for the *happy path* of one offline BKM Panen with no photos. Every other path either duplicates data on the server, silently discards it, or leaks it across users. The single most important defect is the absence of idempotency in the `CREATE` flow **(C1)** — it produces duplicate documents on the server whenever a partial failure occurs, and there is no recovery UI.

---

## 1. Scope

| File | Role |
|---|---|
| `hooks/useSyncProcessor.ts` (180 ln) | `processItem` (the executor) + `useSyncProcessor` (automatic orchestrator #1) |
| `stores/useSyncQueueStore.ts` (107 ln) | in-memory queue + SQLite persistence, `MAX_RETRIES = 5` |
| `services/database.ts:83-127` | `syncQueueDb` — the `sync_queue` table |
| `services/sync.service.ts` (95 ln) | `performSync` — **manual orchestrator #2** |
| `hooks/useSync.ts` (78 ln) | `triggerSync` — manual entry point, guard flags |
| `app/_layout.tsx:35` | mounts `useSyncProcessor()` globally |
| `components/home/AccountScreen.tsx` | the only manual-sync UI, failed-item display |
| Producers | `hooks/useBkmPanenActions.ts`, `components/bkm/BkmPanenList.tsx`, `components/mandor/BKMPanenFormStep4.tsx`, `components/mandor/BKMCheckerFormStep3.tsx` |

### Queue lifecycle

```
producer (offline branch) → addToQueue → SQLite sync_queue + zustand queue[]
                                   ↓
        ┌──────────────────────────┴──────────────────────────┐
   useSyncProcessor()  [automatic, app/_layout.tsx:35]   useSync()→performSync()  [manual, AccountScreen]
        │  filter retryCount < 5                                │  NO retry filter
        │  guard: processingRef + isProcessing                  │  guard: isSyncingRef + isProcessing
        └───────────────────────→ processItem ←───────────────┘
                                   ↓ ok → removeFromQueue
                                   ↓ throw → incrementRetry
```

---

## 2. CRITICAL

### C1. No idempotency: partial failure duplicates the document
`useSyncProcessor.ts:58-70` (BKM Panen CREATE) and `:115-123` (BKM Checker CREATE) each run **four sequential HTTP calls**:

```
1. POST /bkmPanen                 ← server assigns a new id
2. POST /bkmPanen/detail  (×N, Promise.all)
3. PUT  /bkmPanen/:id  { status: SUBMITTED }
```

Steps 2 and 3 are *after* the document already exists server-side. If **any** of them throws — flaky network, a 400 on one detail row, the 10 s axios timeout at `services/api.ts:14` — `processItem` rejects, the orchestrator calls `incrementRetry`, and the row **stays in the queue**. On the next attempt step 1 runs again and **creates a second document**. The first, partially-populated document is orphaned server-side with no client reference to it.

The same shape applies to the UPDATE branch (`:71-107`), though with lower impact: a retry re-runs `PUT` + delete + upsert, which is closer to idempotent (the detail upserts use `serverId`), but `deletedDetailIds.map(deleteDetail)` will 404 on the second pass and abort the whole retry, so deletes can never complete after one partial failure.

`uploadLocalImages` (`:37-52`) uses bare `Promise.all` and is called at `:62` and `:78` — one failed photo upload rejects the entire item, so the retry re-uploads photos that already succeeded, leaving orphaned files in storage on every attempt.

**This is the defect that turns a network blip into duplicated production records.** It is also silently invisible to the user — the Account screen will show "Sinkronisasi Berhasil" as long as no throw escapes.

**Direction:** give queued creates a client-generated idempotency key (or send a client-side `client_ref`) that the server de-duplicates on, or make the queued CREATE a single atomic endpoint call. Server-side support is required; a client-only fix cannot close this.

### C2. Two independent orchestrators can process the same item concurrently
Both paths iterate the same SQLite queue and both claim to guard against re-entry, but the guards are **separate flags with a check-then-set race**:

- Automatic: `processingRef.current` (`:139`) and `isProcessing` (`:148`)
- Manual: `isSyncingRef.current` (`hooks/useSync.ts:22`) and `isProcessing` (`:25`)

`useSync.ts:25` reads `isProcessing` **before** `setProcessing(true)` at `:30`. The automatic processor re-fires on every `queue` identity change (`:174` dependency, plus `addToQueue` at `BKMPanenFormStep4.tsx:126`), so a queue mutation landing in that window wakes it up while the manual run is starting. Nothing serialises the queue at the storage layer — `syncQueueDb.getAll`/`remove`/`incrementRetry` are unguarded full-table operations, and there is no `SELECT ... FOR UPDATE`-equivalent or in-flight marker row.

The consequence of concurrent execution on the same item is exactly C1's duplicate create, but triggered by a user tapping "Sinkronkan sekarang" rather than by a network error. The completion path at `sync.service.ts:37-37` also has no cross-check that the item is still queued before `removeFromQueue`.

### C3. Unknown modules and unknown actions silently succeed and are deleted from the queue
`processItem` (`:54-132`) dispatches on `module`, then on `action`, with **no `else` branch at any level and no final throw**. The orchestrator treats a resolved promise as success (`:160-161`, `sync.service.ts:34-35`) and removes the item.

Concretely:
- `module = 'bkm_rawat'` → no branch matches → the function falls through → **item silently deleted, data lost**.
- `action = 'SUBMIT'` (or any typo / future action) → falls through → **silently deleted**.
- `module = 'krani_timbang'`, or any module added later → **silently deleted**.

Right now no producer queues those, so this is latent — but the failure mode is *silent permanent data loss*, which is the worst possible default for a sync queue. `endpoint` is already stored on every item (`useSyncQueueStore.ts:10`) and is never read by the executor; it is dead metadata.

### C4. The queue is device-global, survives logout, and is never cleared — cross-user leak
- The `sync_queue` table (`services/database.ts:18-26`) has **no `user_id` and no `org_id`** column.
- `useAuthStore.logout` (`stores/useAuthStore.ts:36-53`) deletes the secure-store token and clears in-memory auth state. It **never touches the queue.**
- `useSyncQueueStore.clearQueue` (`:97-104`) is defined and **called from exactly zero places** (verified by grep).
- `app/_layout.tsx:35` mounts `useSyncProcessor()` unconditionally in `RootLayoutNav`, and `loadQueue()` (`:142-144`) fires on mount regardless of auth state.

So on a shared field device: worker A queues offline BKM documents → logs out → worker B logs in → `loadQueue` restores A's items → the processor pushes them **under B's bearer token** (`services/api.ts:33-38` reads whatever token is in secure store). A's documents are attributed to B, and B sees A's queue in the Account screen (`AccountScreen.tsx:16-17`). The reverse also holds: A's pending work is uploaded with B's identity.

**Direction:** scope the queue by user/org (add columns, filter on load), and clear or park it on logout.

### C5. "Coba ulang & sinkronkan" cannot retry anything — failed items are permanently dead
Two mechanisms collide:

1. The automatic processor **skips** items at the cap: `:148` — `queue.some((item) => item.retryCount < MAX_RETRIES)`. Once an item reaches 5, the automatic path stops considering it entirely.
2. The manual path has **no retry filter**: `sync.service.ts:36` iterates the whole `syncQueue` array.

The UI (`AccountScreen.tsx:65-81`) shows "N perubahan gagal dikirim" with per-item `retryCount` and a button labelled **"Coba ulang & sinkronkan"**, telling the user "Data tetap tersimpan. Sinkronkan untuk mencoba kembali". Pressing it *does* re-run those items — so the intent works — but:

- If it fails again, `incrementRetry` pushes the count past the cap, so the automatic path will **never** pick it up again. The item can now only ever be retried by a human repeatedly tapping the button.
- There is **no per-item retry, no dismiss, no delete, no way to inspect the payload.** `AccountScreen` renders only `module · action · item.id · N percobaan` — the user cannot see *what* failed, so "hubungi admin bila masih gagal" is unactionable.
- The only escape hatch is `clearQueue`, which is unwired (C4).

A validation failure (permanent, e.g. a 400 on malformed detail) and a network failure (transient) are treated identically and both consume the same retry budget. A permanently-invalid item clogs the panel forever.

---

## 3. HIGH

### H1. `if (!item.payload) return;` silently discards the item
`:55` — an item with a `null`/empty payload resolves successfully, so the orchestrator removes it. The `DELETE` action queues `payload: { id }` (`useBkmPanenActions.ts:57-62`), and a future producer that queues a bodyless action (a pure path-based `POST /approve`) would have its payload written as `null` by `syncQueueDb.add` (`services/database.ts:107`) and then be **silently deleted** rather than executed.
**Fix:** `if (!item.payload) throw new Error(...)` — an empty payload is a bug, not a success.

### H2. No ordering guarantee between queued actions on the same document
`syncQueueDb.getAll` orders by `created_at ASC` (`services/database.ts:86`) and the manual path respects it, but the automatic processor **re-fires on every queue mutation** and processes whatever is present at that instant. `createdAt` is `Date.now()` (`useSyncQueueStore.ts:31,52`), so two items queued in the same millisecond tie and order is a SQLite coin flip.

Concrete: create a BKM Panen offline, then immediately open it and Submit while still offline → `UPDATE {status: SUBMITTED}` and `CREATE` are both queued (`useBkmPanenActions.ts:128-136`, `BKMPanenFormStep4.tsx:138-144`). If the UPDATE lands first it targets a document that does not exist server-side yet, fails, and burns a retry.

### H3. The manual sync path burns retry attempts without bound
`sync.service.ts:36-44` has no `retryCount` check, unlike the automatic path. Repeatedly tapping the sync button on a permanently-failing item increments `retryCount` forever. Combined with C5 this makes the "failed" state a one-way trap.

### H4. All errors are treated as transient
`:162-164` and `sync.service.ts:41-43` `catch {}` and increment the retry counter identically whether the server returned **401** (session expired — retrying will never help), **400/422** (payload invalid — retrying will never help), or a **network timeout** (retry is correct). No classification, no backoff. `services/api.ts:44-49` already surfaces a typed `ApiError` with a `status` field, so the information needed to classify is present and discarded.

### H5. Every module except BKM Panen loses offline work on create
Concrete consequences of the module coverage as it stands today:

| Producer | Queues | `processItem` handles | Result offline |
|---|---|---|---|
| `BKMPanenFormStep4.tsx:126,138` | ✅ `bkm_panen` | ✅ | works (subject to C1) |
| `BKMCheckerFormStep3.tsx:126` | ✅ `bkm_checker` | ✅ CREATE only | create works; the UPDATE gap is currently unreachable — see §2 note under C3 |

**Note on the `bkm_checker` UPDATE gap.** `processItem` has no `action === 'UPDATE'` handler for `bkm_checker`, which under C3's silent-success rule would *delete* a queued checker update. This is **latent, not live**: `app/(mandor)/checker/_layout.tsx` registers only `index`, `add`, `[id]` — there is no `edit` route and no update UI, so no producer can enqueue a checker UPDATE today. It becomes a live bug the moment an edit screen is added, which is the explicit remedy for **CHK-05** in `checker-audit-2026-09-15.md`. Fix C3 and add the `bkm_checker` UPDATE branch **before** building that edit screen.

| `BKMRawatForm.tsx` | ❌ never calls `addToQueue` | ❌ no branch | **hard failure**, form data lost (see `bkm-rawat-audit-2026-09-15.md` H2) |
| `BKMPanenFormStep4.tsx:98,119` photo path | ✅ `bkm_panen` | ❌ CREATE branch never calls `uploadLocalImages` | **broken `file://` URLs synced permanently** (see `bkm-panen-audit-2026-09-15.md` H2) |

That last row is the sharpest: the UPDATE branch calls `uploadLocalImages` at `:78`, the CREATE branch at `:62` does not. Photos are only ever correct on the edit path.

---

## 4. MEDIUM

| # | Finding |
|---|---|
| M1 | `sync.service.ts` duplicates the entire push loop from `useSyncProcessor` (`:151-169` vs `sync.service.ts:36-45`) — same `processItem` + `removeFromQueue` + `incrementRetry` triad, divergent retry policy (C5), divergent ordering (H2). Two implementations of one algorithm is how they drift. |
| M2 | The pull phase (`sync.service.ts:52-63`) reports success misleadingly: it does `invalidateQueries()`, sleeps a hardcoded `setTimeout(1000)`, and sets `pulled = true`. It never awaits the refetches and the `try/catch` can only catch a synchronous throw from `invalidateQueries` — a failing refetch still reports "Data terbaru berhasil diunduh". |
| M3 | The pull phase invalidates **every** query in the app including the auth/permission-bearing ones. There is no scoping to the modules that actually synced. |
| M4 | No backoff and no connectivity gate beyond `isOnline`. On a captive-portal / "connected but no internet" network the processor fires immediately on every queue change, fails, and can exhaust all 5 attempts within a second or two. |
| M5 | `processQueue()` is called without `await` and without `.catch()` (`:171`). `setProcessing(false)`/`processingRef.current = false` live at the end of the function body rather than in a `finally`, so an unexpected throw inside the loop leaves `isProcessing` stuck `true` — which then makes the manual path's guard at `useSync.ts:25` reject every future sync attempt. |
| M6 | Photos are hardcoded to the `'bkm-panen'` folder (`:42`) with no module parameter — harmless while only one module uploads, a naming bug the moment Checker or Rawat adds photos. |
| M7 | `hooks/index.ts:4` re-exports `useSyncProcessor`, but `useSyncProcessor.ts:3` imports `MAX_RETRIES` from the store, and `services/sync.service.ts:2` imports `processItem` **from a hooks file**. A service importing a React hook module is an inverted dependency that also drags React into the service layer. |
| M8 | No telemetry. Failures increment a counter and log nothing; there is no record of which items failed how many times, or why. Diagnosing a field device's failed queue requires the device. |

---

## 5. LOW

| # | Finding |
|---|---|
| L1 | `queueIdCounter` (`useSyncQueueStore.ts:30`) is module-local and resets on reload; `Date.now()` + counter is fine for uniqueness but the counter is pointless since the timestamp already disambiguates. |
| L2 | `loadQueue` swallows all errors silently (`:43-45`) — a corrupt DB means the user silently believes they have no pending work. |
| L3 | `clearQueue` is dead code (C4); `pendingCount` on the store (`:37`) is also unused since `useSync` and `AccountScreen` both compute `queue.length` themselves. |
| L4 | `SyncQueueItem` is declared three times: `useSyncQueueStore.ts:6`, `services/sync.service.ts:17`, and structurally in `useSyncProcessor.ts`'s parameter type. |
| L5 | `uploadLocalImages` is typed `T extends { foto_url?: string }` and returns `T[]`; the `as any` casts at `:72` and `:93` show the payload types are not actually modelled. |
| L6 | The `endpoint` field is stored on every queue item and never used — either wire it (drive a generic HTTP executor from it) or drop it. |
| L7 | `AccountScreen` keys failed items by `item.id` and renders a raw internal id (`sync_<ts>_<n>`) to end users; that identifier means nothing to a mandor in the field. |

---

## 6. Verified NOT a bug

- **Missing `Bearer` prefix on the auth header.** `services/api.ts:35` sets `config.headers.Authorization = token` verbatim. This looks wrong but is correct: the login response body's `token` field already includes the literal `Bearer ` prefix (confirmed in `saweed-rnative/sawitin/docs/persona-auth.md:26` and the backend reference skill's `auth-rbac.md`). The stored value is a complete header value, not a bare JWT.
- **Photos on the timestamp/`createdAt` fields.** `created_at INTEGER` with `Date.now()` is consistent across the store and the DB mapping at `services/database.ts:93`.

---

## 7. Suggested fix order

1. **C1** — idempotency for queued creates. Requires a server-side de-duplication key; this is the only item that needs backend work, so start it first.
2. **C3** — make `processItem` throw on anything it does not handle, and remove `endpoint` or use it. Cheap, removes a whole class of silent data loss.
3. **C5 + H3** — a real dead-letter model: stop incrementing past the cap, expose per-item retry/discard/inspect, and give the manual path the same cap as the automatic one.
4. **C4** — scope the queue by user/org and clear-or-park on logout. Independent of everything else; make sure to migrate the table.
5. **C2** — serialise the queue: one orchestrator, or a DB-level claim/lease on items so two runners cannot overlap.
6. **H2, H4, H5** — ordering within a document, error classification (retry vs fail-fast on 4xx), and the `uploadLocalImages` call in the CREATE branch.
7. **M1** — collapse the two orchestrators into one implementation with an explicit retry policy.
8. **M5, M2** — `finally` around the processing loop; make the pull phase await or stop claiming success.

**Note on sequencing:** C3 and C5 are self-contained and make the system stop losing data silently; C1 and C4 both need schema/API changes and should be planned rather than patched.
