# Foreman (Mandor) Persona Documentation

> **Historical design draft:** Absensi is deferred as of 20 September 2026. The current Mandor app has Beranda, BKM Panen, Checker, and Akun tabs; the Absensi route described below was removed. See [documentation hub](README.md) for current status.

## 1. Overview & Purpose
The `Foreman` (Mandor) is the core operational user in the field. Foremen register daily crew check-ins, record harvested bunches per worker per TPH block, register upkeep maintenance, and generate cargo check transport documents (BKM Checker) utilizing offline queues and hardware-agnostic barcode payloads.

---

## 2. Navigation & Page Routes
- **Root Layout**: `app/(mandor)/_layout.tsx` (Bottom tab navigation showing: Dashboard, Absensi, BKM, Checker, Rawat, Profil).
- **Tab Hiding Mechanism**: Tab screens toggle visibility of the bottom tab bar on nested wizard/creation views (`app/(mandor)/bkm/add.tsx`, `app/(mandor)/bkm/[id].tsx`, etc.) to provide an focused form environment.
- **Main Routes**:
  - **Dashboard**: `app/(mandor)/index.tsx` (Greetings, quick metrics, menu icons).
  - **Attendance**: `app/(mandor)/absensi.tsx` (Crew attendance register).
  - **BKM Panen List**: `app/(mandor)/bkm/index.tsx` (Displays harvest cards list; supports long-press deletes for drafts).
  - **BKM Panen Add/Edit/View**:
    - Add: `app/(mandor)/bkm/add.tsx`
    - Edit: `app/(mandor)/bkm/edit.tsx`
    - View Details: `app/(mandor)/bkm/[id].tsx`
  - **BKM Rawat (Upkeep)**: `app/(mandor)/rawat.tsx` (Placeholder, upcoming upkeep log entry).
  - **BKM Checker (Fruit Cargo Dispatch)**:
    - List: `app/(mandor)/checker/index.tsx`
    - Add: `app/(mandor)/checker/add.tsx`
    - View: `app/(mandor)/checker/[id].tsx`

---

## 3. Core Tech Stack & State Contexts

### A. State Management Stores (Zustand)
1. **`useBkmPanenStore`**:
   - Manages active document drafts (`header` and `details` arrays).
   - Tracks `deletedDetailIds` of existing server details for updates.
   - Automatically computes `jumlah_janjang` by aggregating grading items (`janjang_normal`, `buah_mentah`, `over_ripe`, `tangkai_panjang`, `buah_abnormal`, `janjang_kosong`).
2. **`useBkmCheckerStore`**:
   - Manages checker documents and FFB cargo validation parameters.
   - **Flat Payload Generator (`buildQrPayload`)**: Outputs a signed flat string payload (`V2|<checkerId>|<tphId>|<quantity>|<timestamp>|<signature>`) where signature is HMAC-SHA256 of the first five fields using `EXPO_PUBLIC_QR_SECRET_KEY` (base64url).
3. **`useSyncQueueStore`**:
   - Holds pending offline mutation actions (CREATE/UPDATE/DELETE) with endpoints and payloads.

### B. Background Sync Processor (`useSyncProcessor`)
- Automatically triggers on app launch and monitors `isOnline` network state changes.
- Intercepts local image paths starting with `file://`, triggers `uploadApi.uploadImage(foto_url, 'bkm-panen')`, and replaces details paths with server URL paths before dispatching the payload transaction.

---

## 4. Complete Feature Specifications

### A. Dynamic BKM Panen Flow
- **Infinite Scroll List (`useBkmPanenInfinite`)**: Loads page segments using cursor pagination.
- **Draft Deletion**: Long-presses on cards trigger validation alerts. If offline, the delete action is queued; if online, `useDeleteBkmPanen` is executed immediately.

### B. Fruit Cargo Dispatches (BKM Checker)
- Logs transporter details, driver identity, afdeling, block, and grading check details.
- Generates a local QR Code graphic utilizing `react-native-qrcode-svg` containing the flat string signature for krani timbang to scan.

---

## 5. Component Hierarchy

```plaintext
MandorLayout (Segments routing layout)
 ├── Tabs Navigator (FLOATING_TAB_BAR_STYLE)
 │    ├── Tabs.Screen (Name: "index" - greetings & announcements)
 │    ├── Tabs.Screen (Name: "absensi" - attendance check sheet)
 │    ├── Tabs.Screen (Name: "bkm" - BkmScreen)
 │    │    ├── FlatList (Renders PanenCard list with infinite scroll)
 │    │    ├── FilterSortSheet (Slide drawer for filters)
 │    │    └── FAB (Float button directing to add.tsx)
 │    ├── Tabs.Screen (Name: "checker" - loading documents list)
 │    ├── Tabs.Screen (Name: "rawat" - upkeep inputs)
 │    └── Tabs.Screen (Name: "profile" - user info)
 ├── DrawerOverlay
 └── DrawerMenu
```
