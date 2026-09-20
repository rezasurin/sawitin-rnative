# Weighbridge Scribe (Krani Timbang) Persona Documentation

> **Historical design draft:** Absensi is deferred as of 20 September 2026 and is not available in the current mobile app. See [documentation hub](README.md) for current navigation.

## 1. Overview & Purpose
The `Weighbridge Scribe` (Krani Timbang) is stationed at the mill gate where the physical weighbridge scale resides. Scribes scan the incoming driver's QR code (representing the BKM Checker Surat Pengantar Buah / SPB), auto-populate driver and vehicle metadata, log scale weights, and print receipt slips.

---

## 2. Navigation & Page Routes
- **Root Route Group**: `app/(krani)/` (Configures navigation tabs in `app/(krani)/_layout.tsx`).
- **Main Tab Screens**:
  - **Beranda**: `app/(krani)/index.tsx` (Renders unified greetings, announcements, and task actions).
  - **Scan Screen**: `app/(krani)/scan.tsx` (Target view for Vision Camera scanner integrations).
  - **Timbangan Form**: `app/(krani)/timbangan.tsx` (Target view for weight log entries).
  - **Profil**: `app/(krani)/profile.tsx` (Logout triggers).
  - **Checker Document Review**: `app/(krani)/checker/`
    - List View: `index.tsx`
    - Detail View: `[id].tsx`

### Menu Grid Relevance
When logging in as a `Krani Timbang`, the dashboard `MenuGrid` renders:
- **`Absensi`** (Read access to `mod_absensi`)
- **`Muat`** (Write access to `mod_krani_timbang` - redirects to `(krani)` group)

---

## 3. Core Tech Stack & State Contexts

### A. State Management Store (`useKraniTimbangStore`)
- **Library**: `Zustand`
- **Attributes**:
  - `header`: Object containing the current weighing ticket properties:
    - `nama_supir` (Driver's name).
    - `nomor_kendaraan` (Truck plate license number).
    - `tujuan_kirim` (Mill destination route).
    - `tanggal` (Log date).
    - `timbang_isi` (Gross weight - loaded truck).
    - `timbang_kosong` (Tare weight - empty truck).
    - `netto` (Net crop weight).
  - `details`: Child detail rows list mapping block and TPH yield origins.
  - `isEditing`: Boolean editing flag.
  - `editingId`: Active server record ID being updated.
- **Auto-Calculations**: Setting `timbang_kosong` or `timbang_isi` via `setHeader` automatically calculates the cargo weight:
  `netto = timbang_isi - timbang_kosong`
  Also exposes `calculateNetto()` helper.

---

## 4. Complete Feature Specifications

### A. QR Code Parsing Workflow
- Driver presents the printed/digital QR code containing the flat string payload (`${tphId}|${quantity}|${timestamp}|${signature}`).
- App decodes the flat payload, runs signature verification locally, extracts parameters, and calls `GET /bkmChecker/ready-for-weighing?id={checkerId}` to populate weight forms.

### B. Weight Recording Forms
- Scribe enters scale weight measurements.
- Real-time netto weight updating prevents calculations errors before saving.
- Syncs mutations using the offline queue if connectivity at the mill scale drops.

### C. Upcoming Features Specs
- ** Vision Camera QR Scanner (`scan.tsx`)**: Integrates `react-native-vision-camera` to scan physical cargo sheets.
- **Bluetooth ESC/POS Thermal Printing**: Connects via BLE to hand-held thermal printers to print physical dispatch receipts for the truck driver.

---

## 5. Component Hierarchy

```plaintext
KraniLayout (Permissions layout wrapper)
 └── Tabs Navigator
      ├── Tabs.Screen (Name: "index" - DashboardScreen component)
      ├── Tabs.Screen (Name: "scan" - Barcode reader)
      ├── Tabs.Screen (Name: "timbangan" - Weight input fields)
      ├── Tabs.Screen (Name: "checker" - BKM Checker dispatches)
      └── Tabs.Screen (Name: "profile" - Logout triggers)
```
