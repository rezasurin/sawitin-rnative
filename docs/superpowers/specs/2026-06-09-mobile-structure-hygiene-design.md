# Mobile App Structure & Hygiene Overhaul

**Date:** 2026-06-09
**Status:** Approved

---

## Problem

The Sawitin mobile app has 165 source files but only 3 fully implemented features (BKM Panen, BKM Checker, Material). 13 screens are stubs. The codebase has heavy copy-paste duplication, cross-group navigation bugs, a dead drawer menu, and only 3/20 API modules have React Query hooks. The `mandor/bkm/[id].tsx` detail screen is 772 lines with 6 inline sub-components, 5 action handlers, and 4 modals all in one file.

## Sections

### 1. Screen Deduplication

**Current state:** 5 dashboard screens, 4 profile stubs, 2 absensi stubs — all identical copy-pastes of 25-34 lines each.

**Fix:**
- Extract `components/home/DashboardScreen.tsx` — the composite layout (PageHeader + UserGreeting + MenuGrid + AnnouncementSection + TodayTasksList)
- Extract `components/home/ProfileScreen.tsx` — shared profile placeholder
- Extract `components/home/AbsensiScreen.tsx` — shared absensi placeholder
- Replace each role group's `index.tsx`, `profile.tsx`, `absensi.tsx` with 1-liner exports that render the shared component
- **~150 lines of dead code removed**

**Verification:** Every role group's dashboard, profile, and absensi tab renders identically to before. `npx tsc --noEmit` passes.

### 2. Navigation Overhaul

**Current state:**
- `(asisten)/bkm.tsx` pushes card taps and FAB into `/(mandor)/bkm/*` — this swaps the tab bar from 4 tabs (asisten) to 6 tabs (mandor)
- MenuGrid's group-relative remapping can target routes that don't exist (e.g., `/(admin)/rawat`)
- DrawerMenu has 6 menu items with `// TODO: Navigate` — all dead
- Krani and Pemanen layouts have no DrawerMenu at all — no logout access
- No route-level permission guards exist

**Fix:**

**2a. BKM cross-group navigation:**
- Asisten users should only VIEW BKM data; clicking a card shows a read-only modal OR navigates within `(asisten)` to a proper detail screen
- Decision: Navigate within `(asisten)` group by creating `(asisten)/bkm/[id].tsx` as a read-only detail view (reuse sub-components from Section 3). FAB hidden for asisten.

**2b. MenuGrid route validation:**
- After resolving a group-relative route, check if it exists by attempting navigation wrapped in try/catch; on failure, show alert
- For items with no `pathAfterGroup` (whole-group routes like `(pemanen)`), always show "Coming Soon" alert when not in target group

**2c. DrawerMenu handlers:**
- "Perbarui data" → `queryClient.invalidateQueries()` (refresh all data)
- "Sinkronkan data" → trigger `useSyncProcessor` flush
- "Pengaturan" → navigate to `/(currentGroup)/profile`
- "Bantuan" → alert with contact info
- "Kelola tim", "Riwayat respon" → "Coming Soon" alert
- Logout already works — keep as-is

**2d. Krani & Pemanen drawers:**
- Add `<DrawerOverlay />` and `<DrawerMenu />` to `(krani)/_layout.tsx` and `(pemanen)/_layout.tsx`

**2e. Route guards:**
- Add `useEffect` in each `_layout.tsx` that checks `hasPermission(moduleId, 'read')` for the group's primary module
- If no permission → `router.replace('/(auth)/login')` or show "Access Denied" screen

**Verification:** No cross-group tab bar swaps when navigating BKM as asisten. Drawer menu items perform actions. Krani/pemanen have drawer with logout. Unauthorized role groups redirect. `npx tsc --noEmit` passes.

### 3. File Splitting

**Current state:**
- `mandor/bkm/[id].tsx` — 772 lines: detail view rendering, 5 action handlers (approve/reject/delete/revoke/cancel), 4 ConfirmModals, metrics calculation, 6 locally-defined sub-components (DocStatusBadge, Row, MetricCard, DetailCard, GradeItem)
- `mandor/bkm/index.tsx` and `asisten/bkm.tsx` — 308 lines each: list rendering, same DocStatusBadge and PanenCard sub-components defined locally

**Fix:**

**3a. Extract shared sub-components to `components/bkm/`:**
- `components/bkm/DocStatusBadge.tsx` — status badge (used in list + detail, mandor + asisten)
- `components/bkm/PanenCard.tsx` — list item card (used in mandor + asisten lists)
- `components/bkm/DetailCard.tsx` — per-worker detail card with grading grid
- `components/bkm/GradeItem.tsx` — individual grading field display
- `components/bkm/MetricCard.tsx` — summary metric card
- `components/bkm/Row.tsx` — label-value row
- `components/bkm/index.ts` — barrel export

**3b. Extract action logic to custom hook:**
- `hooks/useBkmPanenActions.ts` — `useBkmPanenActions(id)` hook returning `{ handleApprove, handleReject, handleDelete, handleRevoke, handleCancel, handleSubmit, modalState, setModalState }`
- Detail screen imports the hook + sub-components, drops from 772→~250 lines

**3c. Refactor list screens:**
- `mandor/bkm/index.tsx` and `asisten/bkm.tsx` import `DocStatusBadge` + `PanenCard` from `components/bkm/`, removing ~100 lines of duplication each

**Verification:** All existing functionality preserved. Detail view renders identically. All action flows (approve, reject, revoke, cancel, delete, submit) work as before. `npx tsc --noEmit` passes.

### 4. Data Layer Completion

**Current state:**
- 20 service modules exist wrapping all API endpoints
- Only 3/20 have query key factories: `bkmPanenKeys`, `materialKeys`, `bkmCheckerKeys`
- Only 3/20 have React Query hooks: `useBkmPanen`, `useBkmChecker`, `useMaterial`
- `bkmCheckerApi` missing `reject()` method (backend has reject endpoint)
- `bkmChecker` hooks missing detail CRUD (`useAddBkmCheckerDetail`, etc.)
- `useUpdateBkmPanenDetail` and `useDeleteBkmPanenDetail` have no cache invalidation
- `hooks/index.ts` barrel only exports 2 of 9 hooks

**Fix:**

**4a. Add query key factories** for modules actively consumed by screens:
- `lahanKeys`, `blokKeys`, `tphKeys`, `pekerjaKeys`, `grupPekerjaKeys`, `tipePekerjaanKeys`, `kelompokLahanKeys`
- These power the dropdown selects in BKM Panen Form Step1/Step2 and BKM Checker Form Step1

**4b. Add React Query hooks** for the same modules:
- `hooks/useLahan.ts` — `useLahanList`, `useLahanDetail`
- `hooks/useBlok.ts` — `useBlokList`, `useBlokDetail`
- `hooks/useTph.ts` — `useTphList`, `useTphDetail`
- `hooks/usePekerja.ts` — `usePekerjaList`, `usePekerjaDetail`
- `hooks/useGrupPekerja.ts` — `useGrupPekerjaList`, `useGrupPekerjaDetail`
- `hooks/useTipePekerjaan.ts` — `useTipePekerjaanList`, `useTipePekerjaanDetail`
- `hooks/useKelompokLahan.ts` — `useKelompokLahanList`, `useKelompokLahanDetail`

**4c. Fix bkmChecker gaps:**
- Add `bkmCheckerApi.reject(id, note?)` — POST `/bkmChecker/:id/reject`
- Add `useRejectBkmChecker` hook with cache invalidation
- Add `useAddBkmCheckerDetail`, `useUpdateBkmCheckerDetail`, `useDeleteBkmCheckerDetail` hooks

**4d. Fix mutation cache invalidation:**
- `useUpdateBkmPanenDetail` — invalidate `bkmPanenKeys.detail(bkm_panen_id)` on success
- `useDeleteBkmPanenDetail` — invalidate `bkmPanenKeys.detail(bkm_panen_id)` on success

**4e. Fix barrel exports:**
- `hooks/index.ts` — export all 9 existing hooks + 7 new hooks

**4f. Deferred (not in this spec):**
- Modules not consumed by any existing screen: staging, restan, penjualan, hargaTbs, modApp, filterOptions, upload, member
- These get hooks when their screens are built

**Verification:** All existing form dropdowns use proper React Query hooks. `useRejectBkmChecker` works with backend. Detail mutations properly invalidate cache. `npx tsc --noEmit` passes.

---

## Execution Order

```
Section 1 (Dedup) → Section 3 (Split files) → Section 4 (Data layer) → Section 2 (Navigation)
```

**Rationale:** Section 3 depends on Section 1 (sub-components need clean imports). Section 4 is independent but best done before Section 2 (navigation cleanup may reference new hooks). Section 2 is last because it touches the most files and benefits from the clean structure created by 1+3.

## Verification

After ALL sections:
1. `npx tsc --noEmit` — zero errors
2. Every screen renders identically to pre-overhaul
3. No cross-group tab bar swaps
4. Drawer menu items produce actions (not dead)
5. All BKM Panen/Checker workflows work (create, edit, approve, reject, revoke, cancel, submit, delete)
