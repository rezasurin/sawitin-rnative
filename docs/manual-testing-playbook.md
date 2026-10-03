# Sawitin Mobile App - Manual & E2E Testing Playbook

Buku panduan ini dirancang untuk memandu proses pengujian manual dan *end-to-end* (E2E) pada aplikasi mobile **Sawitin** (React Native Expo). Panduan ini mencakup alur BKM Panen, BKM Checker + QR SPB, jembatan timbang (krani), persetujuan asisten, estimasi tonase BJR, rekonsiliasi janjang Checker↔Panen, BKM Rawat, dan sinkronisasi luring SQLite.

> **Keputusan produk (20 September 2026):** Absensi ditunda dan tidak tersedia di aplikasi mobile. Jangan gunakan skenario Absensi lama sebagai kriteria rilis. Catatan modul 5 di bawah hanya menjelaskan status penundaan.

> **Catatan versi:** Playbook ini sudah diselaraskan dengan seed data terbaru dan perubahan data-model mobile (lahan → `blok_id`, blok → `kelompok_lahan_id`, tph → `lahan_id`).

---

## 📋 Daftar Isi
1. [Prasyarat & Persiapan Lingkungan](#1-prasyarat--persiapan-lingkungan)
2. [Matriks Akun Uji Coba](#2-matriks-akun-uji-coba)
3. [Modul 1: Wizard BKM Panen 4-Langkah (Mandor)](#modul-1-wizard-bkm-panen-4-langkah-mandor)
4. [Modul 2: BKM Checker, QR SPB & Rekonsiliasi Janjang (Mandor)](#modul-2-bkm-checker-qr-spb--rekonsiliasi-janjang-mandor)
5. [Modul 3: Pemindaian Kamera & Jembatan Timbang (Krani Timbang)](#modul-3-pemindaian-kamera--jembatan-timbang-krani-timbang)
6. [Modul 4: Aksi Persetujuan & Penolakan BKM (Asisten)](#modul-4-aksi-persetujuan--penolakan-bkm-asisten)
7. [Modul 5: Absensi ditunda](#modul-5-absensi-ditunda)
8. [Modul 6: Pencatatan Log Perawatan Kebun / BKM Rawat (Mandor)](#modul-6-pencatatan-log-perawatan-kebun--bkm-rawat-mandor)
9. [Modul 7: Simulasi Cache Luring & Sinkronisasi SQLite (Semua Peran)](#modul-7-simulasi-cache-luring--sinkronisasi-sqlite-semua-peran)

---

## 1. Prasyarat & Persiapan Lingkungan

### Jalankan Backend & Workers
Pastikan API backend aktif di port `:3000` dan worker antrean BullMQ berjalan (agar jembatan timbang/staging sinkron):
```bash
# Terminal 1 - API Backend
cd ../sawitin/sawitin-backend
yarn dev:server

# Terminal 2 - BullMQ Worker (Penting untuk pencocokan timbangan)
yarn dev:worker
```

### Seeder (Wajib jika DB sudah pernah dipakai)
Seeder terbaru menambahkan user `pemanen1`, role `Pemanen`, PIC lahan untuk user uji, dan permission `approve` untuk Asisten. Jalankan ulang agar data uji lengkap:

```bash
cd ../sawitin/sawitin-backend
yarn prisma db seed
```

> ⚠️ Jika user yang login sebelumnya masih mendapat "Akses ditolak" / 403 setelah seed, hapus cache permission di Redis: `redis-cli KEYS "permissions:*" | xargs redis-cli DEL`.

### Jalankan Aplikasi Mobile (Expo)
```bash
cd saweed-rnative/sawitin
npm run ios # Untuk iOS Simulator
# ATAU
npm run android # Untuk Android Emulator/Device
```

---

## 2. Matriks Akun Uji Coba

Gunakan kredensial berikut untuk login sesuai dengan skenario peran. Password semua akun uji: `password123` (kecuali admin: `admin`).

| Peran (Role) | Username | Password | Lahan PIC (Blok) | Modul Utama yang Diuji |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin` | Semua | Setup, fallback approve, pembersihan data |
| **Mandor Panen** | `mandor1` | `password123` | Lahan Blok A (Blok A1) | BKM Panen, BKM Checker, BKM Rawat |
| **Mandor Panen 2** | `mandor2` | `password123` | Lahan Blok B (Blok A2) | (opsional) |
| **Asisten Afdeling** | `asisten1` | `password123` | Lahan Blok C (Blok B1) | Persetujuan (Approve/Reject) BKM Panen |
| **Krani Timbang** | `krani1` | `password123` | – | Pemindai QR SPB, Form Jembatan Timbang |
| **Pemanen** | `pemanen1` | `password123` | – | Beranda dan Akun; tidak ada alur Absensi saat ini |

### Master Data Tersedia (dari seed)
| Entitas | Nilai |
| :--- | :--- |
| Kelompok Lahan | `Kelompok Tani Maju`, `Koperasi Sawit Sejahtera`, dll. |
| Blok | `Blok A1`, `Blok A2`, `Blok B1` |
| Lahan | `Lahan Blok A` (→ Blok A1), `Lahan Blok B` (→ Blok A2), `Lahan Blok C` (→ Blok B1) |
| TPH | `TPH 01`, `TPH 02`, `TPH 03` (semua di Lahan Blok A) |
| Pekerja | `Budi Santoso`, `Siti Aminah`, `Ahmad Dahlan`, `Dewi Sartika`, `Joko Widodo` |

---

## Modul 1: Wizard BKM Panen 4-Langkah (Mandor)

*Tujuan: Memastikan alur pengisian log panen harian berjalan tanpa kendala, termasuk estimasi tonase BJR.*

*   **Aktor Uji Coba**: Login sebagai Mandor Panen (`username: mandor1`, `password: password123`).
*   **Pilihan Data Valid (Happy Path)**:
    *   **Step 1**: Pilih Blok = `Blok A1`. Verifikasi dropdown Lahan hanya menampilkan `Lahan Blok A` (filter by blok bekerja). Pilih `Lahan Blok A`. Isikan Tanggal Laporan = hari ini, Keterangan = "Uji coba panen happy path".
    *   **Step 2**: Pilih Pekerja = `Budi Santoso` atau `Siti Aminah`. Pilih TPH = `TPH 01`. Pilih Jenis Pekerjaan = `Pemanen`. Klik **Tambah Detail**. (Opsional: ambil GPS.)
    *   **Step 3**: Atur janjang normal = `50`, buah mentah = `2`, over ripe = `3`, buah abnormal = `1`. Total janjang otomatis terhitung `56` janjang.
    *   **Step 4 (BARU: Estimasi Tonase BJR)**: Verifikasi kartu **Estimasi Tonase** menampilkan `(56 × 15 kg) / 1000 = 0.84 t` (BJR default 15 kg/janjang, diambil dari `GET /orgConfig`). Centang kotak persetujuan, lalu ketuk **Kirim BKM**. Status dokumen di daftar BKM Panen harus berubah menjadi `SUBMITTED`.
*   **Pilihan Data Tidak Valid (Unhappy Path)**:
    *   **Step 1**: Kosongkan dropdown Blok atau Tanggal Laporan. Verifikasi tombol "Lanjutkan ke Pekerja & TPH" terkunci (disabled).
    *   **Step 2**: Ketuk "Tambah Detail" tanpa memilih Pekerja atau nomor TPH. Verifikasi aplikasi memunculkan dialog peringatan pengisian.
    *   **Step 4**: Coba kirim data tanpa mencentang kotak persetujuan. Verifikasi tombol "Kirim BKM" tidak dapat ditekan.

---

## Modul 2: BKM Checker, QR SPB & Rekonsiliasi Janjang (Mandor)

*Tujuan: Membuat Surat Pengantar Barang (SPB) muatan TBS, menghasilkan Kode QR, dan memastikan rekonsiliasi janjang Checker↔Panen berjalan.*

### Prasyarat
Pastikan sudah ada **BKM Panen berstatus `APPROVED`** yang dibuat di Modul 1 dan disetujui via Modul 4 (atau gunakan panen seeded `2026-08-08 / Blok A1` yang sudah APPROVED). Catat jumlah janjang panen tersebut untuk TPH yang dipakai.

### Happy Path (Janjang Sesuai)
*   **Aktor Uji Coba**: Login sebagai Mandor Panen (`mandor1`).
*   **Step 1**: Pilih **BKM Panen** yang sudah disetujui (dropdown "BKM Panen (Opsional)"). Pilih Blok = `Blok A1`, TPH = `TPH 01`, Tanggal = hari ini.
*   **Step 2**: Tambah Detail Pengiriman: Tipe Pengiriman = `Langsung`, No Plat = `B 5678 CD`, Nama Sopir = `Ahmad Dahlan`, Tujuan Kirim = `PKS Sumber Makmur`. Isi grading janjang **sama persis dengan jumlah janjang panen** untuk TPH 01 (misal 56 janjang normal).
*   **Step 3 (BARU: Rekonsiliasi & Estimasi)**:
    *   Verifikasi banner hijau **"✓ Sesuai BKM Panen (selisih 0.0%)"**.
    *   Verifikasi **Estimasi Tonase** menampilkan `(56 × 15 kg)/1000 = 0.84 t (15 kg/janjang)`.
    *   Centang konfirmasi, ketuk **Submit Checker** → status `SUBMITTED`. Buka detail dan ketuk **Setujui Checker** → status `APPROVED`, QR SPB muncul.

### Unhappy Path (Janjang Tidak Sesuai > 2%)
*   **Step 3**: Buat checker baru yang menautkan panen yang sama tetapi isi jumlah janjang **lebih banyak/lebih sedikit >2%** dari janjang panen (misal panen 56 → checker 60).
    *   Verifikasi banner oranye **"⚠️ Jumlah janjang tidak sesuai BKM Panen (selisih X.X%). Checker: 60, Panen: 56. Submit akan ditolak."**
    *   Verifikasi tombol **Submit Checker nonaktif** dan muncul alert saat dipaksa.
*   **Verifikasi sisi backend (otoritas)**: coba submit mismatch langsung via API:
    ```bash
    curl -s -X PUT http://localhost:3000/bkmChecker/<checkerId> \
      -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
      -d '{"status":"SUBMITTED"}'
    ```
    Harap muncul `400` dengan pesan `Jumlah janjang tidak sesuai BKM Panen (selisih ...%)`.
*   **Uji lain**:
    *   Coba kirim dengan mengosongkan plat nomor / nama sopir / jumlah janjang `0` → validasi gagal.
    *   Buka checker berstatus `DRAFT` → QR tidak digenerasikan.

---

## Modul 3: Pemindaian Kamera & Jembatan Timbang (Krani Timbang)

*Tujuan: Memindai QR SPB milik mandor di jembatan timbang, mencatat berat, dan membandingkan estimasi BJR dengan netto aktual.*

*   **Aktor Uji Coba**: Login sebagai Krani Timbang (`username: krani1`, `password: password123`).
*   **Pilihan Data Valid (Happy Path)**:
    *   Arahkan kamera scanner ke kode QR SPB yang berstatus `APPROVED` milik Mandor dari Modul 2.
    *   Setelah pemindaian sukses, isi formulir timbangan: Berat Isi = `8500` kg, Berat Kosong = `3200` kg.
    *   Verifikasi bahwa Netto otomatis terhitung `5300` kg secara instan (`8500 - 3200`).
    *   **(BARU)** Verifikasi teks **"Estimasi dari janjang: X kg (56 jjg × 15 kg)"** tampil di bawah Netto. Contoh: jika checker 56 janjang → estimasi `840 kg`; bandingkan dengan netto aktual `5300 kg` (selisih wajar karena estimasi hanya dari janjang).
    *   Ketuk **Simpan Hasil Timbang**.
*   **Pilihan Data Tidak Valid (Unhappy Path)**:
    *   **Scan Barcode Acak**: Arahkan pemindai ke barcode barang belanjaan / QR eksternal yang bukan SPB Sawitin. Verifikasi error "Format Tidak Valid" / "QR Code tidak valid".
    *   **Validasi Berat**: Masukkan Berat Isi = `3000` kg dan Berat Kosong = `3500` kg. Ketuk simpan. Verifikasi sistem menolak dengan peringatan "Timbang isi harus lebih besar daripada timbang kosong".

---

## Modul 4: Aksi Persetujuan & Penolakan BKM (Asisten)

*Tujuan: Menguji alur verifikasi berkas oleh Asisten Afdeling/Kebun. Pastikan role Asisten kini memiliki permission `approve`.*

*   **Aktor Uji Coba**: Login sebagai Asisten Afdeling (`username: asisten1`, `password: password123`).
*   **Pilihan Data Valid (Happy Path)**:
    *   **Skenario Penolakan**: Cari dokumen BKM Panen `SUBMITTED`. Buka detail, ketuk **Minta Revisi** (Reject), isi catatan "Jumlah janjang di TPH 01 tidak akurat". Kirim revisi → status `REVISION_REQUESTED` (atau `DRAFT` sesuai status machine).
    *   **Skenario Persetujuan**: Pilih dokumen BKM Panen `SUBMITTED` lain. Ketuk **Setujui** (Approve), konfirmasi modal → status berubah real-time menjadi `APPROVED` dan tombol persetujuan menghilang.
*   **Pilihan Data Tidak Valid (Unhappy Path)**:
    *   Ketuk tombol persetujuan pada dokumen berstatus `APPROVED`/`CANCELLED` → backend menolak dan memunculkan error.

---

## Modul 5: Absensi ditunda

Absensi tidak memiliki route mobile atau API backend. Tidak ada pengujian clock-in, geofence, atau sinkronisasi absensi untuk rilis ini. Tabel SQLite lokal dan komponen layar lama dipertahankan sebagai bahan implementasi mendatang.

---

## Modul 6: Pencatatan Log Perawatan Kebun / BKM Rawat (Mandor)

*Tujuan: Memastikan log perawatan dapat diinput dengan kaskade kelompok → blok → lahan (sesuai data-model backend).*

*   **Aktor Uji Coba**: Login sebagai Mandor Panen (`mandor1`, `password: password123`).
*   **Pilihan Data Valid (Happy Path)**:
    *   Ketuk tombol bulat `+` di pojok kanan bawah.
    *   **Kelompok Lahan** = `Kelompok Tani Maju` → dropdown **Blok** menampilkan blok pada kelompok tersebut (misal `Blok A1`). Pilih `Blok A1` → dropdown **Lahan (Opsional)** menampilkan `Lahan Blok A`.
    *   Masukkan Nama Pengawas = "Mandor Anto", Tanggal Pelaksanaan = hari ini.
    *   Ketuk **Buat BKM Rawat**. Verifikasi data tersimpan dan muncul paling atas pada daftar.
*   **Pilihan Data Tidak Valid (Unhappy Path)**:
    *   Kirim tanpa Kelompok Lahan atau Blok → peringatan "Kelompok lahan wajib dipilih" / "Blok wajib dipilih".

---

## Modul 7: Simulasi Cache Luring & Sinkronisasi SQLite (Semua Peran)

*Tujuan: Memvalidasi ketangguhan aplikasi saat terputus dari jaringan internet.*

*   **Aktor Uji Coba**: Gunakan akun Mandor (`mandor1`).
*   **Pilihan Data Valid (Happy Path)**:
    *   Saat online, buka menu **Panen** untuk memastikan data ter-cache.
    *   Aktifkan **Mode Pesawat (Airplane Mode)**.
    *   Buka kembali daftar **Panen**. Pastikan data BKM Panen ter-cache tetap bisa dibaca (offline fallback).
    *   Buat atau ubah dokumen BKM yang mendukung antrean luring. Pastikan perubahan tersimpan di `sync_queue`.
    *   Aktifkan kembali internet → periksa antrean terkirim dan dokumen muncul di backend.
*   **Pilihan Data Tidak Valid (Unhappy Path)**:
    *   Lakukan sinkronisasi paksa saat jaringan masih mati → sistem tidak crash dan mempertahankan data antrean luring dengan aman hingga koneksi pulih.

---

## Lampiran A: Referensi Endpoint Baru

| Endpoint | Deskripsi |
| :--- | :--- |
| `GET /orgConfig` | Mengembalikan `{ "bjr": 15 }` — BJR (Berat Janjang Rata-rata) organisasi. Sumber estimasi tonase di mobile. |
| `PUT /bkmChecker/:id` `{status:"SUBMITTED"}` | Saat `bkm_panen_id` tertaut, backend menolak (400) bila selisih janjang > `DISCREPANCY_TOLERANCE_PCT` (2%). |

## Lampiran B: Perubahan Data-Model Mobile (per rilis ini)

Agar sesuai backend, field mobile diselaraskan:

- `Lahan.blok_id` (bukan `kelompok_lahan_id`) — lahan milik blok
- `Blok.kelompok_lahan_id` (bukan `lahan_id`) — blok milik kelompok lahan
- `Tph.lahan_id` (bukan `blok_id`) — TPH milik lahan
- Filter BKM Panen Step 1 (lahan by blok), BKM Checker Step 1 (TPH by blok via lahan), dan kaskade BKM Rawat (kelompok → blok → lahan) diperbaiki mengikuti model ini.
