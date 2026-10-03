# UI/UX audit — 15 September 2026

> **Historical snapshot:** This audit predates the 20 September 2026 decision to defer Absensi and Laporan. Their mobile routes and entry points have since been removed. References below describe the earlier implementation; use `components/core/RoleTabs.tsx` and [documentation hub](README.md) for current behavior.

Source review by a separate agent, checked against the current implementation. No device walkthrough was performed. This report distinguishes remaining product issues from the navigation cleanup completed alongside the audit.

## Navigation cleanup

| Role | Visible tabs |
| --- | --- |
| Pemanen | Beranda · Absensi · Akun |
| Mandor | Beranda · BKM Panen · Checker · Akun |
| Krani | Beranda · Timbangan · Akun |
| Asisten | Beranda · BKM Panen · Akun |
| Admin | Beranda · BKM Panen · Menu · Akun |

- Shared `RoleTabs` owns the menu definitions and preserves existing role permission checks.
- Akun replaces the drawer and placeholder profile: actual user details, connection/pending status, manual sync, help, logout. No fictitious phone or group data.
- Admin's Menu tab provides Panen, Checker, Timbangan, Absensi, Rawat and Material within the Administrator route group. Administrator retains its existing superuser permissions. Shared module links preserve the opening role group. Master Data, Pengguna and Laporan are marked unavailable; the old settings link redirects to Akun.
- Timbangan owns history → scan → input and history → detail. Scan is replaced by input after verification; back/save returns to history. Legacy scan and query-parameter links redirect into this structure.
- Timbangan has one header. Camera unmounts when scanning loses focus; denied permission offers app settings when the OS will no longer prompt.
- Asisten/Krani duplicate quick actions removed. Mandor create shortcuts retained. Pending approval links update the list filter even when the tab is already mounted.
- Obsolete drawer components/store removed. Existing profile URLs remain valid through the shared account screen.

## Resolution

- **Offline Checker saving:** queue writes are awaited and SQLite failures propagate to the form. Failure preserves input; submission/edit controls are disabled while saving, duplicate taps are guarded, and leaving during a save is blocked.
- **Attendance verification:** removed simulated block coordinates and distance checks. Attendance records actual GPS with `UNVERIFIED` status and explains that block boundaries are unavailable. History no longer presents previous simulated results as verified. **Real verification remains dependent on authoritative block coordinates/boundaries and an agreed tolerance.**
- **Checker draft protection:** native navigation removal prompts before discarding dirty input. Successful saves and confirmed exits release the guard.
- **Failed sync records:** loading retains records after five failures. Akun lists exhausted records with identifiers and retry counts, and manual sync retries them. Automatic processing stops retrying exhausted records and awaits queue updates; manual and automatic sync share the processing lock.
- **Dashboard status:** attendance and document summaries refresh on screen focus. Read/query failures show unavailable data rather than zero counts or “Belum Absen.”
- **Calendar dates:** attendance saving and dashboard filtering share the WIB (UTC+7) estate date helper, independent of device timezone. Attendance time uses Asia/Pontianak. Multi-timezone estates would require an estate timezone setting.
- **Document cards:** Panen cards expose navigation and long-press accessibility actions/hints. Titles can shrink and wrap alongside the status badge.

## Automated verification

- `node --test scripts/check-audit.cjs scripts/check-navigation.cjs` — 10 passing checks, including deferred/failed persistence, exhausted records after reload, WIB midnight/year boundaries, and existing navigation checks.
- `node node_modules/typescript/bin/tsc --noEmit` — passed.
- No Android/iOS device walkthrough was performed. Native gestures, large text and screen-reader interactions still require device verification.

## Verification and device checklist

Automated structural check: `node --test scripts/check-navigation.cjs`. It checks visible role tabs against Expo's route tree, explicit registration of hidden routes, nested-screen tab visibility, the Timbangan stack, and preserved permission guards. It does not simulate native navigation gestures.

Before release, walk through on Android and iOS:

1. Each role sees the expected tabs and can open Akun, sync, get help, and log out.
2. Krani: history → scan → input → save → history; history → detail → back. Repeat using Android hardware Back and iOS gestures.
3. Deny camera permission permanently; open settings, grant permission, return and scan.
4. Tap Asisten's pending count after visiting BKM previously; verify the submitted filter appears.
5. Pemanen: attendance is discoverable; after clock-in verify dashboard freshness (including returning to an already mounted dashboard).
6. Check large text, long names, outdoor readability, keyboard overlap and offline/error states.

Prioritize reliable saving and draft protection, then truthful attendance/sync feedback, then dashboard dates/freshness and card accessibility.

7. Checker: leave from each step using header Back, hardware Back and gestures; cancel the discard prompt and verify input remains. Simulate SQLite write failure and verify no success message or reset occurs; retry successfully.
8. Restart with a queue record at five retries; verify Akun lists it and manual sync retries it. Verify automatic sync does not repeatedly retry exhausted records.
9. Attendance: verify saved GPS is labeled “Belum diverifikasi,” including older records with simulated statuses. Test clock-in and dashboard filtering before 07:00 WIB.

## Administrator menu follow-up

- Bottom tabs: Beranda, BKM Panen, Menu (grid icon), Akun. Material is accessible through Menu.
- Menu opens all implemented operational modules; nested input/detail screens return within Administrator navigation. Module list screens retain the bottom tabs, including Menu.
- Rawat list now links to its existing create form.
- Verify on Android/iOS: open every Menu entry; open Panen detail/edit/create; Checker detail/create; Timbangan history → scan → input → save → history; Rawat create; return to Menu and Akun. Check unavailable labels and enlarged text.

- Administrator Beranda includes permission-aware quick starts for Panen creation, Checker input, Timbangan scanning and personal attendance. Cards switch to one column on narrow screens or enlarged system text.
