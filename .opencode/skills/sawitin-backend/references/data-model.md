# Data Model — Prisma schema (41 models, 8 enums)

Source of truth: `sawitin/sawitin-backend/prisma/schema.prisma`. All PKs are `String @id @default(uuid())`. Most
models carry audit columns: `created_at` (default now), `created_by`, `modified_at` (@updatedAt), `modified_by?`.
Everything below is org-scoped unless marked **global**.

## Enums

| Enum | Values |
|---|---|
| `GlobalStatus` | `ACTIVE`, `INACTIVE` |
| `DocumentStatus` | `DRAFT`, `SUBMITTED`, `REVISION_REQUESTED`, `APPROVED`, `CANCELLED` |
| `TransactionType` | `IN`, `OUT`, `ADJUSTMENT` |
| `LogActionType` | `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`, `OTHER` |
| `PendingStatus` | `PENDING`, `MATCHED`, `FAILED` |
| `PlanType` | `PERSONAL`, `ENTERPRISE` |
| `TipePengiriman` | `LANGSUNG` (direct to mill), `TITIP` (entrusted), `RESTAN` (left behind → restan) |
| `OriginSource` | `MANUAL` (krani entry), `BKM_CHECKER` (auto from checker), `STAGING` (from reconciliation), `RESTAN` (restan hauling) |

## Groups

### Identity & RBAC (9)
- **organization** — `name`, `plan_type` (default PERSONAL), `settings Json?`, `status`. The tenant root (no org_id).
- **user** — `user_code` @unique, `username` @unique, `password_hash`, `member_id` @unique→member, `org_id?`
  (nullable for system admins), `status`.
- **role** — **global** — `nama` @unique, `deskripsi?`, `status`. Seeded: Administrator, Mandor Panen, Asisten
  Afdeling, Krani Timbang, Manajer Kebun, …
- **permission** — **global** — boolean flags `read/write/update/delete/select`, `approve` (default false),
  `mod_app_id`→mod_app.
- **mod_app** — **global** — `nama` @unique (e.g. `mod_bkm_panen`, `mod_keuangan`), `status`. Seeded.
- **user_role** — junction `[user_id, role_id]` `@@unique`.
- **role_permission** — junction `[role_id, permission_id]` `@@unique`.
- **user_organization** — M2M user↔org (separate from user_role) `[user_id, org_id]` `@@unique`; `role_id?`,
  `role_name?` (display cache — can be stale).
- **log_user** — audit: `user_id`, `deskripsi`, `action_type`, `created_at`.

### Spatial hierarchy (4) — org → kelompok_lahan → blok → lahan → tph
- **kelompok_lahan** — `nama`, `deskripsi?`, `status`. `@@unique([org_id, nama])`.
- **blok** — `kelompok_lahan_id`, `nama`, `luas_blok`, `luas_planted`, `luas_unplanted` (Decimal(10,2)),
  `jumlah_pokok`, `tahun_tanam`, `tahun_panen`. `@@unique([org_id, nama])`.
- **lahan** — `user_pic_id`→user (PIC!), `member_id`→member, `blok_id?`, `nama`, `luas_lahan`,
  `koordinat_lokasi Float[]`, `status_pemilik`, `tanggal_dokumen`, `url_dokumen?`. `@@unique([org_id, nama])`.
- **tph** — `lahan_id`, `nama`, `basis_jjg_perbulan`, `basis_jjg_perhari` (Int). `@@unique([org_id, nama])`.

### Workforce (8)
- **member** — person master: `nama`, `nik?`, `email?`, `phone_number`, `birth_date`, `join_date`, `status`.
  `@@unique([org_id, nik])`, `@@unique([org_id, email])`. 1:1 with user and pekerja via member_id.
- **pekerja** — `member_id` @unique→member, `join_date`, `status`. Many-to-many with tipe_pekerjaan and grup_pekerja.
- **tipe_pekerjaan** — **global** — `nama` @unique, `deskripsi?`, `status`.
- **grup_pekerja** — `blok_id?`, `mandor_id`→user, `nama`, `status`. `@@unique([org_id, nama])`.
- **kategori_pekerjaan** — **global** — `nama` @unique.
- **item_pekerjaan** — **global** — `nama` @unique, `kategori_pekerjaan_id`.
- **log_lahan** — audit: `lahan_id`, `deskripsi`, `action_type`, `created_at`.

### Operational documents (12)
- **bkm_panen** — `blok_id`, `lahan_id?` (nullable for Personal mode), `grup_pekerja_id?`, `tanggal_laporan`,
  `keterangan?`, `status` + `approved_by/at`, `rejected_by/at`, `rejection_note`. Indexes `[org_id, status]`,
  `[org_id, tanggal_laporan]`, `[lahan_id, tanggal_laporan]`.
- **bkm_panen_detail** — `bkm_panen_id` (Cascade), `pekerja_id` (Restrict), `tph_id` (Restrict), `jenis_pekerjaan`,
  grading columns (below), `foto_url?`, `lat?`, `lng?` (GPS).
- **bkm_checker** — `blok_id`, `tph_id`, `lahan_id?`, `bkm_panen_id?` (nullable for manual entry), `tanggal_laporan`,
  `keterangan?`, status block.
- **bkm_checker_detail** — `bkm_checker_id` (Cascade), `pekerja_id?`, `nomor_truk?`, `nama_sopir?`,
  `tipe_pengiriman`, `tujuan_kirim?`, grading columns.
- **krani_timbang** — see below.
- **detail_krani_timbang** — `krani_timbang_id` (Cascade), `kelompok_lahan_id`, `tph_id`, `jumlah_brondol`,
  `jumlah_janjang` (Int).
- **krani_timbang_checker** — junction `[krani_timbang_id, bkm_checker_id]` `@@unique`, both Cascade.
- **bkm_rawat** — `kelompok_lahan_id`, `blok_id`, `lahan_id?`, `tanggal`, `nama_pengawas`, status block.
- **detail_bkm_rawat** — `bkm_rawat_id` (Cascade), `pekerja_id?`, `nama_pekerja`, `jumlah_pekerja`,
  `tipe_pekerjaan_id`, `item_pekerjaan_id`, `kategori_pekerjaan_id`, `satuan_hasil?`, `hasil_pekerjaan?`, `keterangan?`.
- **detail_bkm_rawat_material** — `detail_bkm_rawat_id` (Cascade), `material_id` (Restrict), `jumlah`.
- **restan** — `kelompok_lahan_id`, `tph_id`, `bkm_checker_detail_id?` (origin trace), `tanggal`, `jumlah_brondol`,
  `jumlah_janjang`, `sudah_dikirim` (default false), `tanggal_kirim?`, `dokumen_kirim_id?`→krani_timbang, `status`.
- **bkm_status_log** — audit: `bkm_panen_id?` / `bkm_checker_id?` (**polymorphic — exactly one filled**),
  `status_from?`, `status_to`, `catatan?`, `created_by`.

### Finance & logistics (6)
- **harga_tbs** — `tanggal`, `harga` Decimal(15,2), `keterangan?`, `status`. `@@unique([org_id, tanggal])`.
- **penjualan** — see below.
- **material** — `kode`, `nama`, `kategori`, `satuan`, `harga_satuan?`, `stok?`, `status`. `@@unique([org_id, kode])`.
- **material_transaction** — `material_id` (Restrict), `quantity`, `type`, `reference_id?`, `keterangan?`, `status`.
- **kendaraan** — `nomor_kendaraan`, `jenis_kendaraan`, `kapasitas?`, `status`. `@@unique([org_id, nomor_kendaraan])`.
- **supir** — `nama`, `kontak?`, `ktp?`, `alamat?`, `status`. `@@unique([org_id, ktp])`.

### Staging (1)
- **pending_timbangan_log** — `unique_transaction_id`, `qr_payload` (raw scan), `nama_supir?`, `nomor_kendaraan?`,
  `tujuan_kirim?`, `jumlah_janjang_timbang`, `jumlah_brondol_timbang` (default 0), `tph_id?`, `kelompok_lahan_id?`,
  `status` (PendingStatus), `error_message?`, `matched_at?`. `@@unique([org_id, unique_transaction_id])`,
  `@@index([org_id, status])`.

## Document relationships

```
bkm_panen 1 ─── N bkm_panen_detail                  (Cascade)
bkm_panen 1 ─── N bkm_checker                       (per-TPH verifications; bkm_checker.bkm_panen_id nullable)
bkm_checker N ─── N krani_timbang                   (junction krani_timbang_checker)
krani_timbang 1 ─── N penjualan                     (penjualan.krani_timbang_id)
krani_timbang 1 ─── N restan                        (restan.dokumen_kirim_id = shipping krani doc)
bkm_checker_detail 1 ─── N restan                   (restan.bkm_checker_detail_id = origin trace)
krani_timbang 1 ─── 1 pending_timbangan_log         (krani_timbang.pending_log_id @unique, after reconciliation)
harga_tbs 1 ─── N penjualan                         (penjualan.harga_tbs_id)
bkm_status_log ◇── bkm_panen_id | bkm_checker_id    (polymorphic)
```

## krani_timbang (weighbridge header) — key fields

`nomor_dokumen?` (`@@unique([org_id, nomor_dokumen])`), `nama_supir`, `nomor_kendaraan` (denormalized fallback),
`supir_id?`, `kendaraan_id?`, `pending_log_id?` @unique, `tujuan_kirim`, `tanggal`, `timbang_kosong?` (**tara**),
`timbang_isi?` (**gross/bruto**), `netto?`, `status`, `origin_source`, `keterangan?`.

Note: there are no columns literally named tara/gross/bruto — they are `timbang_kosong`, `timbang_isi`, `netto`.

## penjualan — key fields

`krani_timbang_id`, `tanggal`, `netto_kebun` (estate netto), `netto_pabrik` (mill netto), `selisih_susut`
(= netto_kebun − netto_pabrik), `grading_deduction_pct`, `harga_tbs_id`, `total_bruto` (= netto_pabrik × harga),
`total_potongan` (= total_bruto × deduction_pct), `total_netto` (= total_bruto − total_potongan), `status`,
`keterangan?`.

## Grading columns (bkm_panen_detail and bkm_checker_detail)

`janjang_normal`, `buah_mentah`, `over_ripe`, `tangkai_panjang`, `buah_abnormal`, `janjang_kosong`,
`jumlah_janjang` (should equal the sum of grading categories), `jumlah_brondol` (Int? on panen detail, Int on
checker detail).

## Status machine (`src/utils/statusMachine.ts`)

```
bkmTransitions  (bkm_panen, bkm_checker, bkm_rawat):
  DRAFT:              ["DRAFT", "SUBMITTED"]
  SUBMITTED:          ["DRAFT", "CANCELLED"]
  REVISION_REQUESTED: ["DRAFT", "SUBMITTED"]

kraniTransitions (krani_timbang, penjualan):
  DRAFT:              ["DRAFT", "SUBMITTED"]
  SUBMITTED:          ["APPROVED", "CANCELLED"]
  REVISION_REQUESTED: ["DRAFT", "SUBMITTED"]
```

- `APPROVED` and `CANCELLED` have no outgoing transitions; APPROVED/REVISION_REQUESTED are only reachable via
  approve/reject endpoints, not client PUTs.
- Self-transitions (current === requested) always allowed.
