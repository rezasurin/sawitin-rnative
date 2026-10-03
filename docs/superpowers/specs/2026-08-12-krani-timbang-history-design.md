# Design: Krani Timbangan History

Date: 2026-08-12
Status: Approved

## Problem

After a krani saves a timbang submission ("Simpan Timbangan"), the app returns them to
Beranda (home tab), which is a dead-end in the weighing workflow. The krani has no way to
review their own past submissions, spot inconsistencies, or reconcile later. Per palm-oil
practice, the jembatan timbang krani works in a cycle (weigh → log → next truck), so the
landing point after save should be their own log.

## Goal

- The 3rd tab "Timbangan" becomes the krani's own submission history (default view).
- After "Simpan Timbangan", the krani lands on that history.
- History rows are tappable and open a read-only detail view.

## Non-Goals

- No edit/delete from history for the krani role (corrections route through asisten/admin
  to keep the audit trail clean).
- No new tab / no new route group.

## Design

### Navigation (route changes only)

`timbangan.tsx` now has three states driven by params:

| Param state          | Rendered view                                   |
| -------------------- | ----------------------------------------------- |
| no `checkerId`       | History list (replaces current scan-prompt card) |
| `checkerId` present  | Existing weigh form (unchanged)                 |
| `detailId` present   | Read-only detail of a past submission           |

- `scan.tsx` flow unchanged — pushes `timbangan?checkerId=...` → form.
- After save success → `router.replace("/(krani)/timbangan")` with `checkerId` cleared
  → lands on history. (Today: `router.replace("/(krani)")` → Beranda.)

### New component: `components/krani/KraniTimbangHistory.tsx`

- Uses existing `useKraniTimbangList` + `kraniTimbangApi.getAll`.
- v1 filter: today's submissions only (client-side date filter on `tanggal`). A day-picker
  to browse older dates is deferred to a later iteration.
- FlatList rows: date, nama supir, nomor kendaraan, netto, status badge.
- Tap row → `router.push({ pathname: "/(krani)/timbangan", params: { detailId } })`.
- Header action / button "Timbang Baru" → `router.push("/(krani)/scan")`
  (replaces the old "Buka Kamera Scanner" prompt card).
- Loading / empty / error states, reusing existing list patterns from `components/bkm/`.

### Read-only detail view (in `timbangan.tsx` when `detailId` set)

- Uses `useKraniTimbangDetail(detailId)` (already exists in `hooks/useKraniTimbang.ts`).
- Renders the SPB summary card pattern (sopir, kendaraan, tujuan, blok/TPH,
  janjang/brondol) plus gross/tare/netto and status.
- Back button returns to history. No edit/delete.

### Files touched

- `app/(krani)/timbangan.tsx` — idle state → history list; `detailId` state → detail view;
  post-save navigation change.
- `components/krani/KraniTimbangHistory.tsx` — new history list component.
- `app/(krani)/_layout.tsx` — unchanged (no new tab).

## Data

- List: `GET /kraniTimbang` → `PaginatedResponse<KraniTimbang>` (existing).
- Detail: `GET /kraniTimbang/:id` → `KraniTimbang` with `details[]` (existing).
- Types already in `types/krani-timbang.ts`.

## Verification

- Typecheck passes (`npx tsc --noEmit`).
- Manual flow: scan → weigh → save → lands on history → tap row → detail → back.
- Empty/loading/error states render correctly.
