# Harvester (Pemanen) Persona Documentation

## 1. Overview & Purpose
The `Harvester` (Pemanen) persona interface is tailored for physical field workers who harvest Fresh Fruit Bunches (FFB) and pick loose fruit. It offers a simplified, high-contrast, offline-compatible dashboard to review personal daily target counts, log attendance, and manage profile configurations.

---

## 2. Router & Routing Layout
- **Root Route Group**: `app/(pemanen)/` (Uses bottom tab navigator setup in `app/(pemanen)/_layout.tsx`).
- **Main Screens**:
  - **Beranda (Home)**: `app/(pemanen)/index.tsx` (Renders `DashboardScreen`).
  - **Absensi (Attendance)**: `app/(pemanen)/absensi.tsx` (Renders check-in log calendar).
  - **Profil (Profile)**: `app/(pemanen)/profile.tsx` (Renders account profile cards and sign-out controls).

### Menu Grid Relevance
When logging in as a `Pemanen`, the dynamic `MenuGrid` filters out management and admin functions, displaying:
- **`Absensi`** (Read access to `mod_absensi`)
- **`Panen`** (Read access to `mod_bkm_panen`)

---

## 3. Core Tech Stack & State Contexts

### A. Core Global State (`useAuthStore`)
- Tracks current harvester profile name (`user.nama`), unique member code (`user.username`), and role permissions validation.
- Verifies modular access gate `mod_bkm_panen` with action `read` before mounting tabs.

### B. Network Status Tracking (`useNetworkStore`)
- Hooks into device connectivity to display a connection status dot (green for online, amber for offline) so harvesters know if check-in records have synchronized with the server.

---

## 4. Complete Feature Specifications

### A. Unified agritech dashboard (`DashboardScreen`)
- **UserGreeting**: Displays a customized greeting depending on current local time (e.g. "Selamat Pagi, Pemanen Ahmad").
- **MenuGrid**: Displays a compact 2-button grid containing **Absensi** and **Panen** options.
- **AnnouncementSection**: Visual card listing push alerts and announcements published by plantation managers.
- **TodayTasksList**: Vertical card layout mapping the worker's assigned block for today.

### B. Daily Attendance Tracking
- Logs checks-ins, displaying clock-in timestamps.
- Stores attendance data locally inside state contexts before transmitting to backend APIs.

### C. Upcoming Features Roadmap
- **Self-Attendance with GPS Geofencing**: Automatically scans the device location coordinates via `useLocation` hook and compares them to download block boundaries polygons, validating if the worker is physically present inside the designated block before clocking in.
- **Biometric/Selfie Authentication**: Integrates front-facing camera captures (`useImageCapture` hook) for face recognition check-ins to prevent proxy attendance records.
- **Personal Harvest Ledger History**: An offline-cached ledger screen displaying verified fruit janjang counts deposited at TPHs.

---

## 5. Component Hierarchy

```plaintext
PemanenLayout (Permissions validation wrapper)
 ├── Tabs Navigator
 │    ├── Tabs.Screen (Name: "index" - DashboardScreen component)
 │    │    └── ScrollView
 │    │         ├── UserGreeting
 │    │         ├── MenuGrid (Filtered to Absensi & Panen)
 │    │         ├── AnnouncementSection
 │    │         └── TodayTasksList
 │    ├── Tabs.Screen (Name: "absensi" - Check-in calendar)
 │    └── Tabs.Screen (Name: "profile" - Logout / account card)
 ├── DrawerOverlay (Background overlay)
 └── DrawerMenu (Settings drawer container)
```
