# Audit — BKM Panen screen

**Target:** `saweed-rnative/sawitin/app/(mandor)/bkm/`
**Date:** 2025 (report-only pass — no code modified)
**Typecheck at audit time:** `npx tsc --noEmit` → exit 0 (clean). Every finding below is a runtime, logic, or UX defect, not a compile error.

---

## 1. Scope

Route files plus every shared module they depend on:

| Layer | Files inspected |
|---|---|
| Routes | `(mandor)/bkm/index.tsx`, `add.tsx`, `edit.tsx`, `[id].tsx`, `_layout.tsx` |
| Role variants | `(admin)/bkm/*` (1-line re-exports), `(asisten)/bkm/index.tsx`, `(asisten)/bkm/[id].tsx` |
| Components | `bkm/BkmPanenList`, `bkm/PanenCard`, `bkm/DetailCard`, `bkm/MetricCard`, `bkm/DocStatusBadge`, `bkm/FilterSortSheet`, `mandor/BKMPanenForm` + Steps 1–4, `core/ConfirmModal`, `core/ListEmptyState`, `core/FAB`, `core/Stepper` |
| Data | `hooks/useBkmPanen.ts`, `hooks/useBkmPanenActions.ts`, `hooks/useModuleGroup.ts`, `stores/useBkmPanenStore.ts`, `services/bkm-panen.service.ts`, `hooks/useSyncProcessor.ts`, `types/bkm-panen.ts` |

## 2. Screen map

| Route | Wrapper | Body |
|---|---|---|
| `(mandor)/bkm/index` | thin | `BkmPanenList` + FAB + long-press delete |
| `(mandor)/bkm/add` | thin | `BKMPanenForm` (4 steps) |
| `(mandor)/bkm/edit` | thin | hydrate store from detail → `BKMPanenForm` |
| `(mandor)/bkm/[id]` | thick, 249 lines | detail + metrics + 6 actions + 4 modals |
| `(admin)/bkm/index,add,edit,[id]` | 1-line re-exports of the mandor files | correct — `useModuleGroup` resolves `(admin)` |
| `(asisten)/bkm/[id]` | **duplicate**, 266 lines, of `(mandor)/bkm/[id]` | divergence risk — see M1 |

**Structural verdict:** layering is sound. Shared list component, real offline support, accessibility labels on cards, and `(admin)` reuse via re-export all work as intended. The defects cluster in the reject flow, the delete permission/cache path, and the asisten detail duplication.

---

## 3. HIGH — functional bugs

### H1. "Tolak" submits an empty `rejection_note`
- `components/core/ConfirmModal.tsx:44` — `onConfirm(showInput ? inputText : undefined)`
- `app/(mandor)/bkm/[id].tsx:205` — `onConfirm={handleReject}`
- `hooks/useBkmPanenActions.ts:36-39` — `handleReject` accepts **no parameters** and reads `rejectReason` state

The typed rejection reason is silently discarded; the document is rejected with `note: ""`. `ConfirmModal` also clears its internal `inputText` on confirm, so the text is unrecoverable. This breaks the asisten's core workflow.

**Fix:** `onConfirm={() => handleReject()}` (or give `handleReject` an optional `note` parameter and pass `inputText` through).

### H2. Offline CREATE never uploads photos
- `components/mandor/BKMPanenFormStep3.tsx:206` — when upload fails/offline, stores the raw local `result.uri` (`file:///...`) as `foto_url`
- `hooks/useSyncProcessor.ts:58-70` — the `CREATE` branch calls `bkmPanenApi.create(header)` + `addDetail(...)` **without** `uploadLocalImages`
- `hooks/useSyncProcessor.ts:78` — only the `UPDATE` branch calls `uploadLocalImages`

Result: any BKM Panen created offline **with photos** syncs permanently broken `file://` URLs to the server. The UPDATE path is correct, which makes this an oversight rather than a design choice.

**Fix:** wrap the CREATE branch's details in `uploadLocalImages(details)` and send the returned array.

**Cross-ref:** audited in full depth in `offline-sync-audit-2026-09-15.md` (H5). That report also finds that the failure mode is worse than a bad URL — see C1 there, where a partial failure in the same four-call sequence causes the *next* retry to create a **duplicate document** on the server.

### H3. Delete permission enforced only by "is a FAB rendered"
- `components/bkm/BkmPanenList.tsx:128` — `onLongPress={onCreatePress ? () => handleLongPress(item) : undefined}`
- No `hasPermission` call exists anywhere in the list or delete path
- `hooks/useBkmPanenActions.ts:150` checks `approve` only; `delete` is never checked

The "mandor-only delete" rule is implemented as *"does the host screen render a create button"*. A mandor-group user lacking `mod_bkm_panen:delete` still gets the destructive affordance and it succeeds.

### H4. Offline delete is invisible to the cache layer
Two compounding problems when `isOnline === false`:
1. `BkmPanenList.tsx:97-109` and `useBkmPanenActions.ts:56-66` queue the delete but never touch the React Query cache — the deleted row stays on screen behind the "Antrian Offline" alert.
2. `services/bkm-panen.service.ts:16-33` catches **any** error and returns the SQLite cache as a normal page; nothing ever evicts the row from `bkmPanenCacheDb`. After an app restart while offline, **the deleted DRAFT resurrects** and can be deleted again.

---

## 4. MEDIUM

### M1. `(asisten)/bkm/[id].tsx` is a full copy of the mandor detail screen, already diverged
Identical: `metrics` reducer, `DocStatusBadge`/`DetailCard` blocks, ~30 styles, loading/error shells. Diverged: asisten uses an absolute bottom action bar with `scrollContent.paddingBottom: 100`; mandor uses in-flow buttons with `paddingBottom: 20` and a `#E67E22` revoke button. Any fix to H1 must be applied twice. Note this is the same anti-pattern already refactored away for the list in commit `88279f2` — the detail screen was left behind.

### M2. `edit.tsx` swallows a load failure as an infinite spinner
`app/(mandor)/bkm/edit.tsx:50-63` — if `useBkmPanenDetail` errors, `panen` stays `undefined` and `!panen` matches the **loading** branch: permanent spinner, no message, no retry. `isError` and `refetch` are never destructured from the hook.

### M3. `edit.tsx` triggers the unsaved-changes guard on open
`startEditing` populates the store → `isDirty` becomes true (`BKMPanenForm.tsx:34-38`) → pressing back immediately prompts *"Perubahan yang belum disimpan akan hilang"* although the user changed nothing. Needs a baseline snapshot compared field-by-field, not a non-empty test.

### M4. `PanenCard` always renders "0 detail"
`components/bkm/PanenCard.tsx:41` — `item.details?.length ?? 0`. The list endpoint returns headers, so `details` is undefined and **every** card claims "0 detail". Misleading in both directions; the card never shows a real detail count.

### M5. Offline cache short-circuits real errors
`services/bkm-panen.service.ts:16` treats 401 / 404 / 500 identically to "no network" and serves stale SQLite rows. An expired session silently renders the offline cache instead of surfacing an auth error.

### M6. `useSubmitBkmPanen` matches payloads to drafts by array index
`hooks/useBkmPanen.ts:204-215` — `detailPayloads.map((payload, i) => { const detail = details[i]; … })`. Cannot diverge today (same source array), but the coupling is positional and breaks the moment one list is filtered. Map over `details` directly.

### M7. `useModuleGroup` return type is unsound
`hooks/useModuleGroup.ts` is typed `T | '(admin)'` and the admin branch returns `'(admin)'` regardless of the `T` inferred from the call site. Callers pass `'(mandor)'`, so TS believes the group is `'(mandor)'` under admin while runtime produces `/(admin)/…`. Harmless today; a trap for the next module that adds a group.

---

## 5. LOW / consistency

| # | Finding |
|---|---|
| L1 | `add.tsx:14-16` resets the store in a `useEffect` **after** first render — a stale draft flashes for one frame on re-entry. |
| L2 | Triple reset on submit: `handleSuccess`, `Step4.handleSubmit`, and the unmount effect all reset. Three owners, no single source of truth; the unmount one also runs during the `beforeRemove` path. |
| L3 | `(asisten)/bkm/[id].tsx:64-69` — empty-reason validation fires *after* `ConfirmModal` cleared its input, so the user sees a blank field under the error. |
| L4 | `BkmPanenList.tsx:79` — `hasDraft` scans only loaded pages, so the "Tekan lama untuk menghapus DRAFT" hint is wrong in both directions on long lists. |
| L5 | `hooks/useSyncProcessor.ts` has **no** `bkm_rawat` branch, though `stores/useBkmRawatStore.ts` and `hooks/useBkmRawat.ts` exist. BKM Panen is the only module with complete offline parity. |
| L6 | Guard vocabulary is inconsistent: admin needs `mod_bkm_panen:read`, approve needs `:approve`, while delete/update/submit need nothing. |
| L7 | `[id].tsx:165-172` — the "Tolak" button uses bare text while every sibling action button has an icon. |
| L8 | `[id].tsx:136` and `:188` both gate on `data?.status === "DRAFT"` after `data` is non-nullable at line 80 — dead optional chaining, and one logical DRAFT action block split across two distant JSX blocks. |
| L9 | `(asisten)/bkm/[id].tsx` calls `refetch()` on approve/reject success instead of relying on the mutation's `invalidateQueries`, causing a redundant round-trip. |
| L10 | Double source of truth for the reject reason: `rejectReason` state is written by `onInputChange` while `ConfirmModal` independently owns an identical `inputText`. Whichever way H1 is fixed, one of the two must be deleted. |

---

## 6. Suggested fix order

1. **H1** — reject flow (ship-blocker, asisten's core job)
2. **H2** — offline photo upload on CREATE (silent permanent data loss)
3. **H4** — offline delete cache eviction (resurrecting documents)
4. **H3** — real permission check for delete
5. **M1** — extract a shared `BkmPanenDetail` component (unblocks applying H1 once)
6. **M2, M3** — `edit.tsx` error and dirty-baseline handling
7. Remainder as cleanup.

**Note:** items 1–4 each touch more than one role's screen. M1 should land before or with H1 so the reject fix is not written twice.
