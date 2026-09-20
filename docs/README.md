# Mobile App (Sawitin) Documentation Hub

Welcome to the documentation hub for the `sawitin` React Native mobile application. This app is designed for role-based estate operations (harvesters, foremen, scribes, assistants, and administrators) with built-in offline synchronization and barcode capabilities.

> **Current feature decision (20 September 2026):** Absensi is deferred. No mobile role has an Absensi route, tab, menu item, quick action, or dashboard attendance card. The local SQLite attendance table and dormant `AbsensiScreen` are retained for a later implementation, but there is no backend Absensi API or attendance synchronization. Older persona and audit documents below are historical design notes; use the current route tree and `components/core/RoleTabs.tsx` for current navigation.

---

## 👥 Persona Documentation Links

Access detailed breakdowns of features, routes, state management, and sequences for each user role:

### 1. [Authentication & Role Gate](persona-auth.md)
Maps standard login forms and the redirect middleware gate that routes users to their respective layouts.

### 2. [Harvester (Pemanen)](persona-harvester.md)
A simplified field-worker view with Beranda and Akun tabs.

### 3. [Foreman (Mandor)](persona-foreman.md)
The primary operational manager dashboard includes BKM Panen, BKM Rawat, and BKM Checker workflows.

### 4. [Weighbridge Scribe (Krani Timbang)](persona-scribe.md)
Gate weighbridge log: handles SPB QR scanning, gross/tare/netto weight logging, and cargo status tracking.

### 5. [Assistant & Manager (Asisten)](persona-assistant.md)
Division oversight panel: provides FFB harvest validation, document review/approval pipelines, and yield reports.

### 6. [Administrator (Admin)](persona-admin.md)
System configurations dashboard: manages master data settings and the materials database catalog.

---

## 🛠️ Technical Design & Upcoming Roadmap

Explore design frameworks and planned development specs:

* **[Design Brief: BKM Panen Digital](bkm-panen-guides.md)**: Color tokens (Olive Green, Gold), Inter typography, padding guidelines, and 4-step wizard UI specifications.
* **[Panduan Uji Kasus Nyata (Real-Case E2E)](real-case-testing-guide.md)**: Palm-oil agronomic test scenarios with the `SCENARIO-REAL` seed chain, per-role workflows, and an agronomic validation matrix (Fraksi 2+3 ≥ 85%, BJR estimate accuracy, reconciliation tolerance).
* **[Technical Specifications: Upcoming Features](upcoming-features.md)**: Details upcoming implementations of offline database caching (SQLite), Vision Camera QR scanners, GPS Geofencing boundaries, and Bluetooth ESC/POS printing.
* **[General Frontend Guides](guides.md)**: Original developer brief covering router gates and local sync queues.
