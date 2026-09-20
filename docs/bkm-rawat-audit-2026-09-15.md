# Audit — BKM Rawat screen

**Target:** `saweed-rnative/sawitin/app/(mandor)/rawat/`
**Date:** 2025 (report-only pass — no code modified)
**Typecheck at audit time:** `npx tsc --noEmit` → exit 0 (clean).

> **Headline:** BKM Rawat is an **unfinished feature**, not a buggy one. It implements roughly the first 40% of the workflow that BKM Panen already completes. The critical finding is a missing detail screen; the rest follows from that.

---

## 1. Scope

| Layer | Files inspected |
|---|---|
| Routes | `(mandor)/rawat/index.tsx` (192 ln), `add.tsx`, `_layout.tsx` |
| Role variants | `(admin)/rawat/index.tsx`, `add.tsx`, `_layout.tsx` (re-exports) |
| Components | `mandor/BKMRawatForm.tsx` (287 ln), `core/FAB`, `core/Card`, `core/ListEmptyState`, `core/Button`, `form/FormSelect`, `form/FormField`, `form/FormDateField`, `bkm/DocStatusBadge` |
| Data | `hooks/useBkmRawat.ts`, `stores/useBkmRawatStore.ts`, `services/bkm-rawat.service.ts`, `types/bkm-rawat.ts`, `hooks/useSyncProcessor.ts` |
| Reference | `Saweed-Reactjs/docs/bkm-rawat.md` (API contract) |

## 2. What exists vs. what the schema promises

The type layer and API service are **complete**; the UI consumes almost none of them.

| Capability | Type/API layer | Hook | UI wired |
|---|---|---|---|
| List | ✅ | ✅ | ✅ |
| Create header | ✅ | ✅ | ✅ |
| Delete | ✅ | ✅ | ✅ (long-press) |
| **Get detail** | ✅ `getById` | ✅ `useBkmRawatDetail` | ❌ **0 consumers** |
| **Update header** | ✅ `update` | ❌ no hook | ❌ |
| **Approve** | ✅ | ❌ no hook | ❌ |
| **Reject** | ✅ | ❌ no hook | ❌ |
| **Add/update/delete detail rows** | ✅ | ❌ no hook | ❌ |
| **Materials (child of detail)** | ✅ `types/bkm-rawat.ts:68` | ❌ | ❌ |
| **Submit (DRAFT → SUBMITTED)** | ✅ `UpdateBkmRawatPayload` has no `status` field | ❌ | ❌ |

`bkmRawatApi.approve`, `.reject`, `.addDetail`, `.updateDetail`, `.deleteDetail`, `.getAllDetails` have **zero callers anywhere in the app** (verified by grep).

---

## 3. CRITICAL — the detail screen does not exist

### C1. The list has no `onPress` at all
`app/(mandor)/rawat/index.tsx:81-109` — the card is a `TouchableOpacity` with **only** `onLongPress`, `delayLongPress` and `activeOpacity`. There is no `onPress` prop.

A user can create a BKM Rawat document and then **never open it**. There is no path to view, edit, submit, or approve a document from the list.

### C2. `_layout.tsx` declares a route that has no file
`app/(mandor)/rawat/_layout.tsx:8` registers `<Stack.Screen name="[id]" />`, but **no `app/(mandor)/rawat/[id].tsx` exists** (verified: directory contains only `_layout.tsx`, `add.tsx`, `index.tsx`). The intended detail screen was scaffolded and never built.

### C3. The admin group has no detail route either
`app/(admin)/rawat/_layout.tsx` registers only `index` and `add`; `(admin)/rawat/` contains only those plus `_layout.tsx`. So even if `[id].tsx` were added under mandor, admin would still be unable to reach it.

### C4. No route constant protects this
There is no `router.push` guard or test asserting that every declared `Stack.Screen` has a file. The `[id]` mismatch compiled clean because expo-router resolves `name` at runtime.

**Combined effect:** the BKM Rawat module is a *write-only* feature. Documents can be created and deleted, never read back. Given the row-level and material-level data model (`detail_bkm_rawat` with nested `materials`), the missing screen is where the majority of the product's value lives.

---

## 4. HIGH

### H1. Delete has no permission check
`app/(mandor)/rawat/index.tsx:37-65` and `:82-84` — long-press deletes any DRAFT with no `hasPermission('mod_bkm_rawat', 'delete')` gate. Compare `useBkmPanenActions.ts`, which at least checks `approve`. Long-press-only deletion is also undiscoverable: the hint at `:119-123` appears only when a DRAFT is *already loaded*, and there is no `accessibilityHint` naming the action.

### H2. No offline support whatsoever
`BKMRawatForm.tsx` never imports `useNetworkStore` or `useSyncQueueStore`, unlike `BKMPanenFormStep4` (`:29-30`, `:105-152`). Offline behaviour:
- **Create** → `createMutation.mutate` → axios rejects → generic *"Terjadi kesalahan saat menyimpan BKM Rawat"*. The user's entire form entry is lost with no retry.
- **Delete** → same; the document silently stays.

`hooks/useSyncProcessor.ts` contains branches for `bkm_panen` and `bkm_checker` **only** — there is no `bkm_rawat` module branch.

**Cross-ref:** `offline-sync-audit-2026-09-15.md` (C3) finds this is *worse* than "dropped": `processItem` has no fallthrough guard, resolves successfully for any unrecognised module or action, and the orchestrator then **removes the item from the queue**. So simply adding the `addToQueue` call to `BKMRawatForm` without also fixing C3 would queue rawat data that is silently deleted on first sync attempt. C3 and the `bkm_rawat` branch must land together.

### H3. The form cannot enter detail rows or materials
`BKMRawatForm.tsx` collects 5 header fields and submits. Per `docs/bkm-rawat.md`, a BKM Rawat is *"tasks performed by workers, and materials/fertilizers used in the field"* — the detail payload (`tipe_pekerjaan_id`, `item_pekerjaan_id`, `kategori_pekerjaan_id`, `jumlah_pekerja`, `hasil_pekerjaan`, `satuan_hasil`, plus a `materials[]` array) is never collected.

A created document therefore has an **empty body**. Combined with C1 it is unreadable, and with no submit action (H4) it cannot progress.

### H4. There is no submit action, and the type forbids one
`UpdateBkmRawatPayload` (`types/bkm-rawat.ts:32`) is `Partial<CreateBkmRawatPayload>` — it **omits `status`**, unlike `UpdateBkmPanenPayload` which explicitly adds `status?: DocumentStatus`. So a rawat document can never leave `DRAFT` through this client. The `DocStatusBadge` on each card will read "Draft" forever.

---

## 5. MEDIUM

### M1. `useBkmRawatStore` is entirely dead code
`stores/useBkmRawatStore.ts` (112 lines) exports a fully-formed Zustand store — `header`, `details`, `materials`, `addDetail`, `updateDetail`, `removeDetail`, `addMaterial`, `removeMaterial`, `startEditing`, `reset`. It is exported from `stores/index.ts:5` and **imported by zero files**. `BKMRawatForm` holds its five fields in local `useState` instead.

This is scaffolding for the multi-step wizard that BKM Panen has and Rawat never got. It should either be wired up (with C1's detail screen) or deleted — dead state machines rot and mislead.

### M2. `useBkmRawatDetail` is defined and never called
`hooks/useBkmRawat.ts:21-27`. Same story: correct implementation, zero consumers. Evidence that the detail screen was planned and abandoned.

### M3. No unsaved-changes guard on the form
`BKMPanenForm.tsx:54-84` registers a `beforeRemove` listener that warns before discarding a dirty draft. `BKMRawatForm` has no equivalent, so backing out of a half-filled form silently discards `nama_pengawas`, block, group, and date.

### M4. Date is serialized with a UTC shift and accepts any date
`BKMRawatForm.tsx:150` — `new Date(tanggal).toISOString()`. `tanggal` is a local `YYYY-MM-DD` string, so this converts local midnight to UTC and may land on the **previous day** for positive-UTC-offset users (WIB is UTC+7, so `2025-01-15` → `2025-01-14T17:00:00.000Z`). There is also no `minimumDate`/`maximumDate` on `FormDateField`, so a maintenance record can be dated in the future.

### M5. List is capped at 50 with no pagination
`app/(mandor)/rawat/index.tsx:30` — `useBkmRawatList({ limit: 50 })`, no `useInfiniteQuery`, no `onEndReached`. `BkmPanenList` uses `useBkmPanenInfinite`. Once an estate exceeds 50 rawat documents, older ones become permanently unreachable. The "N dokumen perawatan kebun" count shows `pagination.total`, so the header will advertise a number the list can never display.

### M6. No filter or sort controls
`BkmPanenList` exposes `FilterSortSheet` (status / blok / lahan / sort). Rawat has a static header with a title and hint only. `ApiListParams` supports arbitrary params, and the API supports `filters`/`sorts`, so the capability exists on both sides and is simply unused.

### M7. `bkmRawatApi.getAll` assumes `page`/`limit`, the API docs say `offset`
`services/bkm-rawat.service.ts:7` forwards `{ limit: 50 }` and `docs/bkm-rawat.md` documents `limit` + **`offset`**. The BKM Panen path uses `page`, and `useBkmPanenInfinite` reads `pagination.totalPages` (`useBkmPanen.ts:33-39`). Whichever convention the server actually implements, one of the two modules is paginating incorrectly. Worth confirming against the live API before building Rawat pagination on top of it.

---

## 6. LOW / consistency

| # | Finding |
|---|---|
| L1 | `index.tsx:74-78` formats the date inline with `toLocaleDateString`; `FormDateField.tsx` has a private `formatDisplay` doing the same job with a different format. Two date formatters, no shared util. |
| L2 | `index.tsx:82-84` — `onLongPress={() => item.status === 'DRAFT' && handleDelete(item.id)}`: on a non-DRAFT the expression evaluates to `false` and the long press does nothing silently. |
| L3 | Rawat cards have **no** `accessibilityRole`/`accessibilityLabel`/`accessibilityHint`/`accessibilityActions`, while `PanenCard.tsx:21-28` implements all four. The accessibility work was done for one module and not the other. |
| L4 | The whole card is the long-press target with `delayLongPress={600}` — no visible affordance, and a destructive action lives behind an undiscoverable gesture. |
| L5 | `useDeleteBkmRawat` invalidates the list but the screen also calls `refetch()` in `onSuccess` (`index.tsx:48-51`) — the redundant round-trip pattern also present in `(asisten)/bkm/[id].tsx` (L9 there). |
| L6 | `index.tsx:145` — FAB has no `label` prop while `add.tsx` other modules pass descriptive labels; the default "Tambah data" is generic. |
| L7 | `types/bkm-rawat.ts:70` — `DetailBkmRawatMaterial.detail_bkm_rawat_id` vs `DetailBkmRawat.bkm_rawat_id`: the parent FK is named inconsistently across the two levels, which will cause mistakes when the detail screen is finally written. |
| L8 | `app/(admin)/rawat/index.tsx` re-exports the mandor screen; combined with C2/C3 this means admin inherits the same missing detail route rather than surfacing a clearer "not implemented" state. |

---

## 7. Suggested fix order

This screen needs **build work**, not cleanup. Sequence:

1. **C1–C3** — create `(mandor)/rawat/[id].tsx` (+ `(admin)/rawat/[id].tsx` re-export), add `onPress` to the list card. Nothing else is usable until this exists.
2. **H4** — add `status?: DocumentStatus` to `UpdateBkmRawatPayload`; add `useUpdateBkmRawat` / `useApproveBkmRawat` / `useRejectBkmRawat` hooks and wire submit/approve/reject on the new detail screen.
3. **H3** — add detail-row + material editing. `useBkmRawatStore` (M1) is already built for exactly this; wire it rather than writing a third state container.
4. **H1** — permission gate on delete; add `accessibilityHint`.
5. **H2** — offline parity: network branch in the form + a `bkm_rawat` branch in `useSyncProcessor.processItem`.
6. **M3, M4** — dirty guard; fix date serialization and bound the picker.
7. **M5–M7** — infinite pagination, filter sheet, confirm the `offset` vs `page` contract.
8. **H3/H1 follow-up** — reuse the shared-component pattern from BKM Panen rather than duplicating (see M1 in `bkm-panen-audit-2026-09-15.md`).

**Recommendation:** treat step 1 as the unblocker. Until `[id].tsx` exists, BKM Rawat should be considered unfinished rather than shipped, and the module should be hidden from the admin menu or labelled as beta if it is reachable in production.
