# Mobile App (Sawitin) Documentation Hub

Welcome to the documentation hub for the `sawitin` React Native mobile application. This app is designed for role-based estate operations (harvesters, foremen, scribes, assistants, and administrators) with built-in offline synchronization and barcode capabilities.

---

## 👥 Persona Documentation Links

Access detailed breakdowns of features, routes, state management, and sequences for each user role:

### 1. [Authentication & Role Gate](persona-auth.md)
Maps standard login forms and the redirect middleware gate that routes users to their respective layouts.

### 2. [Harvester (Pemanen)](persona-harvester.md)
A simplified view for field workers to track target achievements, daily deposits, and check-in statuses.

### 3. [Foreman (Mandor)](persona-foreman.md)
The primary operational manager dashboard: includes crew attendance logs, BKM Panen (Harvest Log) stepper wizard, BKM Rawat (Upkeep Log), and BKM Checker truck loading.

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
* **[Technical Specifications: Upcoming Features](upcoming-features.md)**: Details upcoming implementations of offline database caching (SQLite), Vision Camera QR scanners, GPS Geofencing boundaries, and Bluetooth ESC/POS printing.
* **[General Frontend Guides](guides.md)**: Original developer brief covering router gates and local sync queues.
