# Sawitin Mobile App - Manual & E2E Testing Playbook

Buku panduan ini dirancang untuk memandu proses pengujian manual dan *end-to-end* (E2E) pada aplikasi mobile **Sawitin** (React Native Expo). Panduan ini mencakup seluruh fitur yang baru ditambahkan/diperbarui, termasuk geofencing absensi, pemindaian Vision Camera, kalkulasi jembatan timbang, persetujuan asisten, dan simulasi sinkronisasi luring (offline) menggunakan SQLite.

---

## 📋 Daftar Isi
1. [Prasyarat & Persiapan Lingkungan](#1-prasyarat--persiapan-lingkungan)
2. [Matriks Akun Uji Coba](#2-matriks-akun-uji-coba)
3. [Modul 1: Wizard BKM Panen 4-Langkah (Mandor)](#modul-1-wizard-bkm-panen-4-langkah-mandor)
4. [Modul 2: BKM Checker & Pembuatan Kode QR (Mandor)](#modul-2-bkm-checker--pembuatan-kode-qr-mandor)
5. [Modul 3: Pemindaian Kamera & Jembatan Timbang (Krani Timbang)](#modul-3-pemindaian-kamera--jembatan-timbang-krani-timbang)
6. [Modul 4: Aksi Persetujuan & Penolakan BKM (Asisten)](#modul-4-aksi-persetujuan--penolakan-bkm-asisten)
7. [Modul 5: Absensi Mandiri & Validasi Geofence GPS (Mandor / Pemanen)](#modul-5-absensi-mandiri--validasi-geofence-gps-mandor--pemanen)
8. [Modul 6: Pencatatan Log Perawatan Kebun / BKM Rawat (Mandor)](#modul-6-pencatatan-log-perawatan-kebun--bkm-rawat-mandor)
9. [Modul 7: Simulasi Cache Luring & Sinkronisasi SQLite (Semua Peran)](#modul-7-simulasi-cache-luring--sinkronisasi-sqlite-semua-peran)

---

## 1. Prasyarat & Persiapan Lingkungan

### Jalankan Backend & Workers
Pastikan API backend aktif di port `:3000` dan worker antrean antrean BullMQ berjalan (agar jembatan timbang/staging sinkron):
```bash
# Terminal 1 - API Backend
cd ../sawitin/sawitin-backend
yarn dev:server

# Terminal 2 - BullMQ Worker (Penting untuk pencocokan timbangan)
yarn dev:worker
```

### Jalankan Aplikasi Mobile (Expo)
```bash
cd saweed-rnative/sawitin
npm run ios # Untuk iOS Simulator
# ATAU
npm run android # Untuk Android Emulator/Device
```

---

## 2. Matriks Akun Uji Coba

Gunakan kredensial berikut untuk login sesuai dengan skenario peran:

| Peran (Role) | Username | Password | Modul Utama yang Diuji |
| :--- | :--- | :--- | :--- |
| **Mandor Panen** | `mandor1` | `password123` | BKM Panen, BKM Checker, Absensi, BKM Rawat |
| **Krani Timbang** | `krani1` | `password123` | Pemindai QR SPB, Form Jembatan Timbang |
| **Asisten Afdeling**| `asisten1`| `password123` | Persetujuan (Approve/Reject) BKM Panen |
| **Pemanen** | `pemanen1`| `password123` | Absensi Harian |

---

## Modul 1: Wizard BKM Panen 4-Langkah (Mandor)

*Tujuan: Memastikan alur pengisian log panen harian berjalan tanpa kendala.*

*   **Aktor Uji Coba**: Login sebagai Mandor Panen (`username: mandor1`, `password: password123`).
*   **Pilihan Data Valid (Happy Path)**:
    *   **Langkah 2 (Step 1)**: Pilih Blok = `Blok A1`, Lahan = `Lahan A1-1`. Isikan Tanggal Laporan = hari ini, Keterangan = "Uji coba panen happy path".
    *   **Langkah 3 (Step 2)**: Pilih Pekerja = `Budi Santoso` atau `Siti Aminah`. Pilih TPH = `TPH 01`. Pilih Jenis Pekerjaan = `Pemanen`. Klik **Tambah Detail**.
    *   **Langkah 4 (Step 3)**: Atur janjang normal = `50`, buah mentah = `2`, over ripe = `3`, buah abnormal = `1`. Total janjang otomatis terhitung `56` janjang.
    *   **Langkah 5 (Step 4)**: Centang kotak persetujuan, lalu ketuk **Kirim BKM**. Status dokumen di daftar BKM Panen harus berubah menjadi `SUBMITTED`.
*   **Pilihan Data Tidak Valid (Unhappy Path)**:
    *   **Langkah 2 (Step 1)**: Kosongkan dropdown Blok atau Tanggal Laporan. Verifikasi tombol "Lanjutkan ke Pekerja & TPH" terkunci (disabled).
    *   **Langkah 3 (Step 2)**: Ketuk "Tambah Detail" tanpa memilih Pekerja atau nomor TPH. Verifikasi aplikasi memunculkan dialog peringatan pengisian.
    *   **Langkah 5 (Step 4)**: Coba kirim data tanpa mencentang kotak persetujuan. Verifikasi tombol "Kirim BKM" tidak dapat ditekan.

---

## Modul 2: BKM Checker & Pembuatan Kode QR (Mandor)

*Tujuan: Membuat Surat Pengantar Barang (SPB) muatan TBS dan menghasilkan Kode QR.*

*   **Aktor Uji Coba**: Login sebagai Mandor Panen (`username: mandor1`, `password: password123`).
*   **Pilihan Data Valid (Happy Path)**:
    *   Pilih Blok = `Blok A1`, Lahan = `Lahan A1-1`, TPH = `TPH 01`, Tanggal = hari ini.
    *   Detail Pengiriman: Pilih Kendaraan/No Plat = `B 5678 CD`, Nama Sopir = `Ahmad Dahlan`, Tujuan Kirim = `PKS Sumber Makmur`, Jumlah Janjang = `150` janjang.
    *   Ketuk **Kirim/Ajukan**. Setelah status berubah menjadi `SUBMITTED`, buka detail dokumen tersebut dan ketuk **Setujui Checker** untuk mengubah statusnya menjadi `APPROVED` dan memunculkan kode QR SPB.
*   **Pilihan Data Tidak Valid (Unhappy Path)**:
    *   Coba kirim formulir dengan mengosongkan plat nomor kendaraan, nama sopir, atau dengan mengisi Jumlah Janjang = `0`. Verifikasi sistem memunculkan kesalahan validasi.
    *   Buka dokumen Checker yang masih berstatus `DRAFT`. Verifikasi kode QR tidak digenerasikan di dalam kartu detail.

---

## Modul 3: Pemindaian Kamera & Jembatan Timbang (Krani Timbang)

*Tujuan: Memindai QR SPB milik mandor di jembatan timbang menggunakan kamera aktif.*

*   **Aktor Uji Coba**: Login sebagai Krani Timbang (`username: krani1`, `password: password123`).
*   **Pilihan Data Valid (Happy Path)**:
    *   Arahkan kamera scanner ke kode QR SPB yang berstatus `APPROVED` milik Mandor dari Modul 2.
    *   Setelah pemindaian sukses, isi formulir timbangan: Berat Isi = `8500` kg, Berat Kosong = `3200` kg.
    *   Verifikasi bahwa Netto otomatis terhitung `5300` kg secara instan (`8500 - 3200`). Ketuk **Simpan Hasil Timbang**.
*   **Pilihan Data Tidak Valid (Unhappy Path)**:
    *   **Scan Barcode Acak**: Arahkan pemindai ke barcode barang belanjaan atau QR code eksternal yang bukan SPB Sawitin. Verifikasi muncul error: "QR Code tidak valid" atau "Signature gagal diverifikasi".
    *   **Validasi Berat Timbangan**: Pada formulir pencatatan timbangan, masukkan Berat Isi = `3000` kg dan Berat Kosong = `3500` kg (berat kosong lebih besar). Ketuk simpan. Verifikasi sistem menolak dengan peringatan "Timbang isi harus lebih besar daripada timbang kosong".

---

## Modul 4: Aksi Persetujuan & Penolakan BKM (Asisten)

*Tujuan: Menguji alur verifikasi berkas oleh Asisten Afdeling/Kebun.*

*   **Aktor Uji Coba**: Login sebagai Asisten Afdeling (`username: asisten1`, `password: password123`).
*   **Pilihan Data Valid (Happy Path)**:
    *   **Skenario Penolakan**: Cari dokumen BKM Panen milik Mandor yang berstatus `SUBMITTED`. Buka detailnya, ketuk **Minta Revisi** (Reject), ketik catatan alasan revisi: "Jumlah janjang di TPH 01 tidak akurat". Kirim revisi. Verifikasi status dokumen berubah menjadi `REVISION_REQUESTED`.
    *   **Skenario Persetujuan**: Pilih dokumen BKM Panen `SUBMITTED` lainnya. Ketuk **Setujui** (Approve). Konfirmasi pada modal pop-up. Verifikasi status dokumen berubah secara *real-time* menjadi `APPROVED` dan tombol persetujuan menghilang.
*   **Pilihan Data Tidak Valid (Unhappy Path)**:
    *   Coba ketuk tombol persetujuan pada dokumen yang statusnya sudah `APPROVED` atau `CANCELLED`. Verifikasi backend menolak aksi tersebut dan memunculkan error.

---

## Modul 5: Absensi Mandiri & Validasi Geofence GPS (Mandor / Pemanen)

*Tujuan: Memvalidasi verifikasi wilayah kerja (GPS Geofencing) saat absen masuk.*

*   **Aktor Uji Coba**: Login sebagai Mandor Panen (`username: mandor1`, `password: password123`) atau Pemanen (`username: pemanen1`, `password: password123`).
*   **Pilihan Data Valid (Happy Path)**:
    *   **Data Pilihan**: Pilih **Blok pertama** di daftar lokasi (biasanya *Blok A1*).
    *   Ketuk tombol lingkaran besar **CLOCK IN**.
    *   **Hasil**: Koordinat *Blok A1* disimulasikan sama dengan koordinat GPS Anda (Jarak 0m / dalam batas 100m). Absen berhasil disimpan dengan badge hijau bertuliskan **"Sesuai"**.
*   **Pilihan Data Tidak Valid (Unhappy Path / Peringatan)**:
    *   **Data Pilihan**: Pilih **Blok kedua atau blok lainnya** (seperti *Blok A2* atau *Blok B1*).
    *   Ketuk tombol lingkaran besar **CLOCK IN**.
    *   **Hasil**: Koordinat blok lain disimulasikan berjarak ~160m dari GPS Anda (di luar batas 100m). Sistem akan memunculkan modal dialog **⚠️ Peringatan Geofencing**.
    *   Ketik alasan absensi (misal: "Absen di pos afdeling dekat gerbang") dan ketuk **Kirim Absen**. Verifikasi data absen berhasil disimpan dengan badge jingga bertuliskan **"Luar Blok"**.

---

## Modul 6: Pencatatan Log Perawatan Kebun / BKM Rawat (Mandor)

*Tujuan: Memastikan log perawatan (pemupukan/semprot kimia) dapat diinput.*

*   **Aktor Uji Coba**: Login sebagai Mandor Panen (`username: mandor1`, `password: password123`).
*   **Pilihan Data Valid (Happy Path)**:
    *   Ketuk tombol bulat `+` di pojok kanan bawah.
    *   Di modal pop-up yang muncul (sekarang tampil penuh tanpa terpotong), pilih Kelompok Lahan = `Kelompok Tani Maju`, Lahan = `Lahan A1-1`, dan Blok = `Blok A1 (Opsional)`.
    *   Masukkan Nama Pengawas = "Mandor Anto" dan tentukan tanggal pelaksanaan hari ini.
    *   Ketuk **Buat BKM Rawat**. Verifikasi data log tersimpan dan muncul paling atas pada daftar.
*   **Pilihan Data Tidak Valid (Unhappy Path)**:
    *   Coba kirim formulir BKM Rawat baru dengan mengosongkan pilihan Kelompok Lahan, Lahan, atau Nama Pengawas. Verifikasi sistem menampilkan peringatan "Form Belum Lengkap".

---

## Modul 7: Simulasi Cache Luring & Sinkronisasi SQLite (Semua Peran)

*Tujuan: Memvalidasi ketangguhan aplikasi saat terputus dari jaringan internet.*

*   **Aktor Uji Coba**: Dapat menggunakan akun Mandor (`mandor1`) atau Pemanen (`pemanen1`).
*   **Pilihan Data Valid (Happy Path)**:
    *   Saat perangkat online, buka menu **Panen** dan **Absensi** untuk memastikan data ter-cache.
    *   Aktifkan **Mode Pesawat (Airplane Mode)** pada emulator/HP untuk memutus internet.
    *   Buka kembali daftar **Panen**. Pastikan data BKM Panen yang ter-cache tetap bisa dibaca secara luring (offline fallback).
    *   Lakukan Absen Masuk (Modul 5) saat offline. Transaksi akan langsung disimpan ke database SQLite lokal (`sync_queue`).
    *   Aktifkan kembali internet. Verifikasi antrean offline otomatis tersinkronisasi kembali ke backend API dan daftar histori absen ter-update.
*   **Pilihan Data Tidak Valid (Unhappy Path)**:
    *   Coba lakukan sinkronisasi paksa saat jaringan internet Anda masih mati atau bermasalah. Verifikasi sistem tidak crash dan mempertahankan data antrean luring di SQLite dengan aman hingga koneksi pulih kembali.
