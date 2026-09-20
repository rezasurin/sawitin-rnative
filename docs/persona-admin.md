# Administrator (Admin) Persona Documentation

> **Historical design draft:** Absensi is deferred as of 20 September 2026. The current Admin Menu and quick actions do not expose Absensi. See [documentation hub](README.md) and `components/core/RoleTabs.tsx` for current navigation.

## 1. Overview & Purpose
The `Administrator` (Admin) persona governs configurations, settings, master data properties, and the materials/chemical inventories catalog. The interface runs on a Drawer layout system and grants root access bypasses to manage user roles and static databases.

---

## 2. Navigation & Page Routes
- **Root Route Group**: `app/(admin)/` (Uses Drawer layout declared in `app/(admin)/_layout.tsx`).
- **Main Drawer Screens**:
  - **Beranda**: `app/(admin)/index.tsx` (Renders `DashboardScreen`).
  - **Master Data**: `app/(admin)/master-data.tsx` (Configures system master tables).
  - **Users Database**: `app/(admin)/users.tsx` (Lists credentials profiles).
  - **Settings**: `app/(admin)/settings.tsx` (Controls sync options).
- **Material Catalog Stack**: `app/(admin)/material/`
  - List View: `index.tsx` (Shows material cards, categories, stock, and prices).
  - Add / Edit Form: `add.tsx` (Saves material parameters).

### Superuser Bypass
In `MenuGrid.tsx`, the Administrator has `isAdmin = true` status. This overrides granular permission checks, automatically displaying all menu items (Absensi, BKM, Approval, Muat, Rawat, Laporan) on the admin's home dashboard grid.

---

## 3. Core Tech Stack & State Contexts

### A. Queries & Mutations (`useMaterial`)
- **`useMaterialList`**: Retrieves the list of material records from the backend `/material` endpoint.
- **`useDeleteMaterial`**: Mutation that issues DELETE requests for material records.
- **State Badges Config**: Uses `StatusBadge` to map item statuses dynamically:
  - `ACTIVE` → Green badge (Label: "Aktif").
  - `INACTIVE` → Gray badge (Label: "Nonaktif").

### B. Router Parameters Routing
- Form navigation uses query param triggers: `router.push('/(admin)/material/add?id={id}')`.
- If an `id` is present in search params, `add.tsx` loads the existing material details to configure an Edit screen; otherwise, it defaults to a clean Add screen.

---

## 4. Complete Feature Specifications

### A. Material Catalog Management
- Renders item cards displaying: Code (`kode`), Category (`kategori`), Unit (`satuan`), Price (`harga_satuan`), and current Stock (`stok`).
- Triggers alert confirmation modals before performing mutations.

### B. User Accounts Monitor
- Logs active user credentials, status (ACTIVE/INACTIVE), and role permissions mapping.

### C. Upcoming Features roadmap
- **Device Sync Control Settings**: Allows setting local database size caps, clearing cache files, and manually overriding background syncing queues.
- **Mobile Crash Logger**: Visual terminal utility to inspect SQLite logs and upload system diagnostics report bundles.

---

## 5. Component Hierarchy

```plaintext
AdminLayout (Drawer navigator wrapper)
 ├── Drawer.Screen (Name: "index" - DashboardScreen)
 ├── Drawer.Screen (Name: "master-data" - Database tables stubs)
 ├── Drawer.Screen (Name: "users" - User accounts viewer)
 ├── Drawer.Screen (Name: "settings" - Sync & storage settings)
 └── Stack (Nested material catalog router stack)
      ├── MaterialScreen (material/index.tsx route)
      │    ├── FlatList
      │    │    └── MaterialCard (Shows code, category, stock, and price details)
      │    │         └── StatusBadge (Active/Inactive mapping)
      │    └── FAB (Float action button to create material)
      └── MaterialAddScreen (material/add.tsx form screen)
```
