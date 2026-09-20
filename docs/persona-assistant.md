# Assistant & Manager (Asisten) Persona Documentation

> **Historical design draft:** Absensi is deferred as of 20 September 2026 and is not available in the current mobile app. See [documentation hub](README.md) for current navigation.

## 1. Overview & Purpose
The `Assistant & Manager` (Asisten) mobile module serves as the oversight and validation interface for estate managers. It focuses on validating block-level harvests, reviewing worker productivity parameters, approving BKM logs, and reviewing yield graphs.

---

## 2. Navigation & Page Routes
- **Root Route Group**: `app/(asisten)/` (Tab and Drawer hybrid layout declared in `app/(asisten)/_layout.tsx`).
- **Main Tab Screens**:
  - **Beranda**: `app/(asisten)/index.tsx` (Dashboard greetings and memos).
  - **BKM Reviews List**: `app/(asisten)/bkm.tsx` (Lists pending or approved harvest logs).
  - **Laporan (Yield Reports)**: `app/(asisten)/laporan.tsx` (Visual summaries of estate yields).
  - **Profil**: `app/(asisten)/profile.tsx` (Account controls).
- **Nested Detail Screen**:
  - **BKM Approval detail**: `app/(asisten)/bkm/[id].tsx` (Renders document states, metrics grids, and worker lists).

### Menu Grid Relevance
When logging in as an `Asisten`, the dashboard `MenuGrid` renders:
- **`Absensi`** (Read access to `mod_absensi`)
- **`Approval`** (Approve access to `mod_bkm_panen` - redirects to `(asisten)` reviews)
- **`Laporan`** (Read access to `mod_laporan` - redirects to `laporan.tsx`)

---

## 3. Core Tech Stack & State Contexts

### A. Queries & API Integration (`useBkmPanen`)
- **Detail query (`useBkmPanenDetail(id)`)**: Fetches single document record containing:
  - Header data (Block, Date, Lahan, Group, Keterangan).
  - Rejection details (`rejection_note` with warning indicators).
  - Details array (Specific workers grading records).
- **Zod Schemas**: Shares type structures with backend models (`BkmPanen`, `DetailBkmPanen`).

### B. Summary Calculations (React useMemo)
- The app computes yield metrics from child rows on the fly:
  - **Total Janjang**: Aggregate sum of Normal, Mentah, Over Ripe, Tangkai Panjang, Abnormal, and Janjang Kosong bunches.
  - **Total Brondol**: Combined loose fruit weight (in kg).
  - **TPH Count**: Quantity of unique TPH coordinates where fruit was loaded.

---

## 4. Complete Feature Specifications

### A. Real-time Yield Monitoring
- Allows managers to view afdeling-level daily output summaries.
- Supports filtering BKM lists by block, field, date range, or status.

### B. Verification & Revision Tracking
- Displays active statuses like `SUBMITTED` or `DRAFT`.
- Displays red rejection warning banners detailing revision instructions from managers.

### C. Upcoming Features specs
- **Approve / Reject Action Triggers**: Direct buttons on `bkm/[id].tsx` executing API calls (`PUT /bkmPanen/:id/approve` or `PUT /bkmPanen/:id/reject` with inline text notes).
- **Offline Chart Caching**: Caches SVG yield graphs for offline review during field visits.

---

## 5. Component Hierarchy

```plaintext
AsistenLayout (Tab & Drawer hybrid container)
 ├── Tab Navigator
 │    ├── Tabs.Screen (Name: "index" - DashboardScreen)
 │    ├── Tabs.Screen (Name: "bkm" - BkmScreen)
 │    ├── Tabs.Screen (Name: "laporan" - Yield report stubs)
 │    └── Tabs.Screen (Name: "profile" - Logout buttons)
 └── Nested Details
      └── AsistenBkmDetailScreen (bkm/[id].tsx route)
           ├── PageHeader (With BackButton navigation triggers)
           ├── ScrollView
           │    ├── Header Info Card (Block, Date, status, group)
           │    ├── RejectionNoteBox (Conditional warn card)
           │    ├── MetricCard Grid (Pekerja count, TPH count, Janjang, Brondolan)
           │    └── DetailCard list (Worker details list wrapper)
           └── ActivityIndicator (Centered loading wheel)
```
