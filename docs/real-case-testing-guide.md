# Sawitin Mobile — Panduan Uji Kasus Nyata (Real-Case E2E)

> **Disusun oleh:** Konsultan Kelapa Sawit (medium estate, 25–500 ha, Indonesia)
> **Tujuan:** Menguji aplikasi mobile Sawitin dengan skenario operasional **nyata di lapangan** — bukan sekadar "happy path" — sekaligus memvalidasi bahwa angka yang muncul **masuk akal secara agronomi** (bukan cuma berhasil tersimpan).

> **Status 3 Oktober 2026 (SPB per truk dan tutup harian):** Sejak fase 2–6 rencana *trip-level SPB and daily close* (`docs/plans/2026-09-28-trip-spb-and-daily-close-*` di root workspace), satu **SPB = satu truk**: Mandor mengisi nomor SPB dari buku SPB, truk, sopir, dan tujuan, lalu menambah **muatan per TPH** (`Langsung` dari Panen hari itu atau `Titip` dari restan terbuka). Truk ditimbang **berdasarkan nomor SPB** lewat tiket PKS dan/atau jembatan timbang. Panen dan SPB **tidak disetujui satu per satu** lagi: Mandor mengajukan **Tutup Harian** dengan hitungan restan sore hari, Asisten menyetujuinya paling lambat pukul 12.00 hari berikutnya. Skenario baru ada di **Skenario S (S1–S8)**. Skenario C.3–D lama (QR V3, satu Checker per TPH) hanya berlaku untuk dokumen bentuk lama selama masa transisi. Dicocokkan dengan source branch `feat/trip-spb` (backend, web, mobile) plus fase 6 (`feat/trip-spb-phase-6*`). **Belum satu pun skenario S dijalankan di UAT dengan ponsel nyata.**
>
> **Status 25 September 2026 (riwayat):** Panduan ini dicocokkan dengan source saat ini: mobile branch `feat/rawat-detail-and-sync-idempotency` dan backend branch `feat/plantation-master-data-phase-2`, termasuk perubahan yang belum di-commit. Yang baru sejak versi 20 September: alur revisi (`REVISION_REQUESTED` → buka kembali → `DRAFT`), panel **Riwayat dokumen**, BKM Rawat lengkap dengan detail dan material, QR SPB yang diterbitkan server, validasi truk/sopir/tujuan saat timbang, **timbang offline**, dan tinjauan antrean di menu **Akun**. Absensi (Fase 3) tetap **ditunda** dari MVP; pekerjaan awalnya disimpan di branch `feat/phase-3-planning-attendance` dan **tidak ada di checkout ini** (lihat Skenario F). Uji lapangan konektivitas buruk (gerbang Fase 6) dan pilot lapangan (Fase 7) **belum dijalankan**. Semua ✅ di bawah berarti "sudah ada di source", bukan "lolos lapangan".
>
> Tanda **[perlu verifikasi di perangkat]** menandai hal yang tidak bisa dipastikan dari source saja.

---

## 1. Profil Kebun Uji (dari seed)

| Parameter | Nilai Seed | Benchmark Industri |
|---|---|---|
| Jenis usaha | Enterprise (`plan_type: ENTERPRISE`, `default_org`) | — |
| Kepadatan tanam | **140 pokok/ha** (Blok A1 700 pokok/5 ha, Blok A2 770/5,5 ha) | 136–148 pokok/ha (segitiga 9 m) |
| Umur sawit (2026) | Blok A1/A2 tanam 2015 → **TM, 11 th**; Blok B1 tanam 2018 → **TM, 8 th** | Puncak produksi 7–18 tahun |
| BJR (Berat Janjang Rata-rata) | **15 kg/janjang** (`organization.settings.bjr`) | 10–20 kg tergantung umur/klon |
| Rotasi panen (HI) | Asumsi skenario 10–14 hari | HI 10–14 hari |
| Norma pemanen | 70–100 janjang/hari/pemanen ≈ 1,0–1,5 ton | 1,0–1,5 ton TBS/pemanen/hari |

Kematangan tanaman dihitung server dari tahun tanam: umur < 4 th = **TBM**, 4–24 th = **TM**, ≥ 25 th = **TUA** (`src/utils/maturity.ts`). Label blok/lahan di form memakai format `Nama · Maturitas · Umur th`, misalnya `Blok A1 · TM · 11 th` [perlu verifikasi di perangkat].

### Data Master yang Tersedia
Semua blok berada di kebun **Kelompok Tani Maju**.

| Blok | Lahan (luas, pokok, tahun tanam → status 2026) | TPH (basis jjg/hari) | PIC Lahan |
|---|---|---|---|
| Blok A1 (5 ha, 700 pokok) | Lahan Blok A (4,5 ha, 630 pokok, 2015 → TM 11 th) | TPH 01 (35), TPH 02 (35) | `mandor1` |
| Blok A2 (5,5 ha, 770 pokok) | Lahan Blok B (5,0 ha, 700 pokok, **tahun lalu → TBM 1 th**, replanting) | TPH 03 (35) | `mandor2` |
| Blok B1 (15 ha, 2000 pokok) | Lahan Blok C (8,2 ha, 1150 pokok, **1998 → TUA 28 th**) | TPH 04 (70) | `asisten1` |

> **Catatan konsultan (master data):**
> - **Lahan Blok B berstatus TBM.** Tanaman umur 1 tahun belum boleh dipanen. Aplikasi **tidak** memblokir BKM Panen di lahan TBM, jadi penguji dan asisten wajib menolak panen di lahan ini.
> - **Lahan Blok C (TUA, 1998) berada di Blok B1 (tanam 2018).** Umur lahan dan blok tidak konsisten. Ini kandidat perbaikan data master sebelum pilot.

Master pendukung: pekerja (anggota) **Budi Santoso, Siti Aminah, Ahmad Dahlan, Dewi Sartika, Joko Widodo**; tipe pekerjaan **Pemanen, Pemuat, Supir, Perawat**; kendaraan **B 1234 AB, B 5678 CD, B 9012 EF, B 3456 GH**; sopir **Supir Satu/Dua/Tiga**; material **Pupuk Urea** (Karung 50kg, stok 100), **Herbisida A** (Liter, stok 50), **Solar** (Liter, stok 1000).

### Data Skenario Real (`SCENARIO-REAL`, dibuat otomatis oleh seeder)
Sebuah **rantai panen lengkap yang koheren** sudah disiapkan (`prisma/seeder/realisticHarvestScenario.ts`). **H-2 dan H-1 dihitung dari hari seeder dijalankan**, bukan dari hari uji.

| Dokumen | Tanggal | Isi | Status |
|---|---|---|---|
| BKM Panen | H-2 | 4 pemanen × 2 TPH = **319 janjang** (TPH 01: 81 + 76 = 157; TPH 02: 86 + 76 = 162), brondol 44 kg | `APPROVED` |
| BKM Checker 1 | H-1 | Truk **B 9401 AB**, sopir Budi Santoso, **157 jjg** (TPH 01), brondol 22 kg, `LANGSUNG` | `APPROVED`, **sudah ditimbang** |
| BKM Checker 2 | H-1 | Truk **B 9402 CD**, sopir Ahmad Dahlan, **162 jjg** (TPH 02), brondol 22 kg, `LANGSUNG` | `APPROVED`, **belum ditimbang** → dipakai di Skenario G |
| Krani Timbang | H-1 | Truk B 9401 AB: isi 7.600 − kosong 5.200 = netto **2.400 kg** | `APPROVED` |

**Poin validasi:**
- Janjang checker **persis sama** dengan panen per TPH (selisih 0,0%). Karena itulah rekonsiliasi lolos.
- Fraksi matang (normal) = 288/319 = **90,3%**; buah mentah = 11/319 = **3,4%**.
- Netto 2.400 kg vs estimasi janjang 157 × 15 = 2.355 kg (+1,9%). Netto truk **sudah termasuk brondolan di bak** (22 kg), jadi pembanding yang adil adalah 2.355 + 22 = 2.377 kg (selisih +1,0%). Wajar.

Seeder lain juga membuat data contoh (panen, checker, rawat, timbangan) tanpa label `SCENARIO-REAL`. Salah satunya berguna untuk uji negatif: Checker berketerangan **"Checker hari ini - menunggu approval"** (`SUBMITTED`) berisi satu baris `LANGSUNG` (B 5678 CD) dan satu baris `RESTAN` (B 9012 EF). Dokumen seeder dibuat langsung ke database, jadi panel **Riwayat dokumen** untuknya menampilkan *"Belum ada riwayat."*

---

## 2. Akun Uji & Prasyarat

| Peran | Username | Password | Kode user (tampil di riwayat) | Peran dalam uji |
|---|---|---|---|---|
| Mandor Panen | `mandor1` | `password123` | `MDR001` | Input panen, **SPB truk**, rawat; ajukan **Tutup Harian** |
| Mandor Panen | `mandor2` | `password123` | `MDR002` | Mandor kedua (uji SPB dari dua ponsel, uji aksi basi) |
| Asisten Afdeling | `asisten1` | `password123` | `AST001` | **Setujui / tolak Tutup Harian**; minta revisi BKM Panen dan SPB per dokumen |
| Krani Timbang | `krani1` | `password123` | `KRN001` | Input **tiket PKS** per nomor SPB; timbang di jembatan timbang (hanya bila `jembatan_timbang` aktif) |
| Manajer Kebun | `manajer1` | `password123` | `MNJ001` | Penyetuju kedua BKM Rawat (**lewat web**; lihat Skenario E) |
| Pemanen | `pemanen1` | `password123` | `PMN001` | Hanya Beranda dan Akun |
| Admin | `admin` | `admin` | `admin` | BKM Rawat di mobile (Menu), fallback / cek data |

**Tab yang terlihat per peran (sesuai `components/core/RoleTabs.tsx`):**

| Peran | Tab | Catatan |
|---|---|---|
| Mandor | Beranda · BKM Panen · Checker · Akun | **Tidak ada tab maupun Aksi Cepat untuk BKM Rawat.** Route-nya ada tetapi tersembunyi. |
| Asisten / Manajer | Beranda · BKM Panen · Akun | Tidak ada tab Checker dan tidak ada layar Rawat |
| Krani | Beranda · Timbangan · Akun | Pindai QR lewat tombol `+` di tab Timbangan |
| Admin | Beranda · BKM Panen · Menu · Akun | Menu → BKM Panen, Checker, Timbangan, **BKM Rawat**, Material, dll. |
| Pemanen | Beranda · Akun | — |

**Siapa boleh menyetujui (seed role, sejak fase 5):** Panen dan SPB disetujui **lewat Tutup Harian**, yang membutuhkan izin `approve` pada **BKM Checker dan BKM Panen sekaligus**: `asisten1`, `manajer1`, `admin`. Organisasi lama perlu migrasi `20261002120000_asisten_checker_approve_grant` (atau editor peran) agar Asisten Afdeling mendapat `approve` Checker. Pengaju Tutup Harian tidak boleh menyetujuinya sendiri. Tombol **Setujui** per dokumen untuk Panen dan SPB sudah dihapus; **Minta revisi** per dokumen tetap ada. Rawat → `manajer1`, `admin`, dengan aturan **penyetuju harus orang lain dari pembuat dokumen**. Timbangan dan tiket PKS disetujui otomatis saat tercatat.

> **Kontrol internal (maker-checker):** pembuat Checker atau BKM Rawat **tidak dapat menyetujui dokumennya sendiri**. Di mobile tombol **Setujui** tidak tampil bagi pembuat (tombol **Minta revisi** tetap ada), dan server menolak dengan 403. Checker buatan mandor1 disetujui oleh **mandor2**, manajer, atau admin. Catatan: tombol baru tersembunyi setelah login ulang, karena kode user (`user_code`) baru dikirim server sejak perubahan ini.

**Perangkat:** siapkan minimal **2 ponsel** (atau 1 ponsel + 1 simulator): satu untuk Mandor (SPB, Tutup Harian), satu untuk Krani (tiket PKS, timbang). Siapkan juga **buku SPB bernomor seri dengan barcode** (atau cetak beberapa barcode Code 128 berisi nomor seri, mis. `0012345`) untuk Skenario S6. Perangkat kedua juga dipakai untuk uji "aksi basi" (409).

**Pengaturan organisasi (web → Setup → Pengaturan Organisasi):** BJR organisasi `15`, pita brondol `3–8 %`, `bjr_band_pct` `25`, batas persetujuan `12`, `tiket_hari` `3`. **Jembatan timbang** = *tidak* untuk pilot (layar timbang Krani tersembunyi, hanya tiket PKS). Aktifkan hanya untuk bagian S yang menyebut jembatan timbang.

**Prasyarat (jalankan dari root workspace `SAWEED-PROJECT`):**
```bash
# Terminal 1 — API
cd sawitin/sawitin-backend && yarn dev:server
# Terminal 2 — worker (rekonsiliasi/outbox)
cd sawitin/sawitin-backend && yarn dev:worker
# Terminal 3 — aplikasi mobile
cd saweed-rnative/sawitin && npm run ios   # atau: npm run android
```
Aplikasi membaca alamat API dari `EXPO_PUBLIC_API_URL` di `saweed-rnative/sawitin/.env.local`. Backend default di port `3000`. Untuk ponsel fisik gunakan IP LAN laptop, bukan `localhost`.

**Sebelum mulai (sekali saja):**
```bash
cd sawitin/sawitin-backend
npx prisma migrate dev          # terapkan migrasi terbaru (termasuk 20260924150000_staging_transport_identity yang belum di-commit)
yarn prisma db seed
redis-cli KEYS "permissions:*" | xargs redis-cli DEL   # reset cache permission (prefix permissions:v2)
```
Contoh `curl` di bawah memakai `jq`. Endpoint login mengembalikan field `token` yang **sudah berawalan `Bearer `**, jadi jangan tambahkan "Bearer" lagi:
```bash
API=http://localhost:3000
TOKEN=$(curl -s -X POST $API/login -H "Content-Type: application/json" \
  -d '{"username":"mandor1","password":"password123"}' | jq -r .token)
```

**Login pertama per pengguna harus online.** Master data (blok, lahan, TPH, pekerja, tipe pekerjaan) di-cache per pengguna saat itu. Cache **dihapus saat Keluar**.

### Aturan alur dokumen (berlaku untuk Panen, Checker, Rawat, Timbangan manual)

```text
DRAFT → SUBMITTED → APPROVED
                  → REVISION_REQUESTED (Minta revisi) → DRAFT (Buka kembali) → SUBMITTED
                  → CANCELLED
```

Untuk **Panen dan SPB**, langkah `SUBMITTED → APPROVED` hanya terjadi lewat **Tutup Harian** (kebun × hari). Mengirim SPB = truk berangkat (tanpa menunggu persetujuan). Hari yang tutup harian-nya sudah disetujui **tidak menerima dokumen baru** (`DAY_CLOSED`) sampai dibuka kembali (web).

| Status (badge) | Yang harus terlihat, bila pengguna punya izinnya |
|---|---|
| `DRAFT` ("Draft") | Edit/ubah detail, **Kirim untuk persetujuan** (hanya jika ada ≥ 1 detail), **Hapus draft** (izin delete) |
| `SUBMITTED` ("Submitted") | **Setujui** (Rawat, dokumen lain; **bukan** Panen/SPB) dan **Minta revisi**, dengan kolom *"Alasan revisi (opsional)"*. Keduanya hanya muncul saat **online** dan hanya bagi pemegang izin `approve`. **Buka kembali sebagai draft**. **Batalkan dokumen** (online). |
| `REVISION_REQUESTED` ("Revisi") | Teks *"Buka kembali sebagai draft sebelum mengubah dokumen."*, *"Alasan revisi: …"*, *"Diminta oleh: <kode user>"*, dan waktu permintaan. Tombol **Buka kembali sebagai draft**. Form **tidak bisa diedit** sebelum dibuka kembali. |
| `APPROVED` ("Approved") | Tidak ada aksi. Hanya riwayat. |

Setiap aksi meminta konfirmasi *"Lanjutkan tindakan ini?"*. Panel **Riwayat dokumen** hanya dimuat saat online. Saat offline muncul *"Riwayat tersedia saat online dengan izin baca."* Setiap entri berformat `AKSI · status_asal → status_tujuan`, lalu kode user, alasan (jika ada), dan waktu.

---

## 3. Skenario Uji (Urutan seperti hari kerja nyata)

### Skenario A — Validasi Data Rantai Real (Tanpa Input)

*Buktikan bahwa data seed koheren dan tampil benar di aplikasi.*

1. Login **mandor1** → tab **BKM Panen**. Cari kartu `Blok A1` dengan keterangan *"SCENARIO-REAL: panen Blok A1 hari ke-2 (HI 10-14 hari)"*, badge **Approved**, *"4 detail"*.
2. Buka detail → **Ringkasan Produksi**: Pekerja **4**, TPH **2**, Total Janjang **319**, Brondol (kg) **44 kg**.
   - Layar detail **tidak** menampilkan Estimasi Tonase. Hitung manual: 319 × 15 = 4.785 kg ≈ **4,79 t**. Pada 4 pemanen itu berarti rata-rata 1,2 t/pemanen. Masuk norma.
   - **Riwayat dokumen:** *"Belum ada riwayat."* (dokumen seeder).
3. Tab **Checker** → kartu truk **B 9401 AB**: *"1 truk · 157 janjang"*. Buka detail. Karena Checker ini **sudah ditimbang**, di atas kartu harus muncul:
   > *"SPB tidak dapat diterbitkan: satu SPB hanya untuk satu truk pengiriman Langsung. Checker ini berisi beberapa truk atau jenis pengiriman campuran, atau sudah ditimbang. Buat Checker terpisah per truk."*
4. Buka Checker **B 9402 CD** (162 jjg, belum ditimbang). Kartu **Surat Pengantar Buah (SPB)** dengan QR harus muncul, bertuliskan *"Tunjukkan kode QR ini ke Krani Timbang di Mill Gate"* dan *"… · Total: 162 jjg"*, plus tombol **Bagikan Tiket SPB (Gambar)**. **Jangan timbang dulu.** Checker ini dipakai di Skenario G4.
5. Cek timbangan seed lewat API. Daftar Timbangan di aplikasi hanya menampilkan timbangan **hari ini**, sedangkan timbangan seed bertanggal H-1:
   ```bash
   TOKEN=$(curl -s -X POST $API/login -H "Content-Type: application/json" -d '{"username":"krani1","password":"password123"}' | jq -r .token)
   curl -s "$API/kraniTimbang?limit=20" -H "Authorization: $TOKEN" | jq '.data[] | select(.keterangan|test("SCENARIO-REAL")) | {nomor_kendaraan, netto, keterangan}'
   ```
   Harapan: `B 9401 AB`, `netto 2400`, keterangan *"SCENARIO-REAL: 157 jjg × BJR 15 kg ≈ 2355 kg (netto 2400 kg)"*.

**Hasil yang diharapkan:** Semua angka koheren. Checker yang sudah ditimbang tidak bisa menerbitkan SPB lagi. Checker yang belum ditimbang menerbitkan QR.

---

### Skenario B — Input Panen Baru yang Realistis (Mandor)

*Simulasikan hari panen Blok A1. Angka harus masuk akal: 70–100 jjg/pemanen, fraksi matang ≥ 85%.*

1. Login **mandor1** → tab **BKM Panen** → `+` (atau Beranda → Aksi Cepat **Buat BKM Panen**).
2. **Step 1 — Detail Dokumen:** Blok = `Blok A1 · TM · 11 th`, Lahan = `Lahan Blok A`, Tanggal Laporan = hari ini → **Lanjutkan ke Pekerja & TPH**.
3. **Step 2 — Pilih Pekerja & TPH:** tambahkan 2 baris lewat **Tambah Detail**:
   - `Budi Santoso` → TPH `TPH 01 · Basis/hari: 35 · Basis/bulan: 1000`, Jenis Pekerjaan `Pemanen`
   - `Siti Aminah` → TPH `TPH 02 · …`, Jenis Pekerjaan `Pemanen`
   - Opsional: tekan **Ambil Lokasi GPS** di TPH. Tombol berubah menjadi `GPS: <lat>, <lng> · ±N m` [perlu verifikasi di perangkat].
   - **Cek filter:** pilihan TPH hanya TPH milik lahan di Blok A1 (TPH 01, TPH 02).
4. **Step 3 — Grading Janjang (total 150 janjang):**
   | Pekerja | Normal | Buah Mentah | Over Ripe | Tangkai Panjang | Buah Abnormal | Janjang Kosong | Total | Brondol (kg) |
   |---|---|---|---|---|---|---|---|---|
   | Budi | 70 | 2 | 3 | 1 | 0 | 1 | **77** | 11 |
   | Siti | 65 | 3 | 2 | 2 | 1 | 0 | **73** | 9 |
   - **Cek agronomi:** Normal = 135/150 = **90%** (target Fraksi 2+3 ≥ 85% ✓). Mentah = 5/150 = 3,3% (≤ 5% ✓). Produktivitas 77 dan 73 jjg/pemanen ✓.
   - Kolom Brondol hanya menerima **kg bulat**.
5. **Step 4 — Review & Konfirmasi:** Total Janjang **150**, Brondol (kg) **20 kg**, **Estimasi Tonase 2.25 t** (150 × 15 kg). Centang *"Saya mengkonfirmasi data yang diinput sudah benar"* → **Submit BKM**.
6. **Cek:** kartu baru berstatus **Submitted**. Buka detail. Riwayat berisi `CREATE · — → DRAFT` dan `SUBMIT · DRAFT → SUBMITTED` oleh `MDR001`.

**Uji agronomi negatif (opsional):** buat BKM Panen di `Blok A2` → `Lahan Blok B · TBM · 1 th`. Aplikasi **mengizinkan** penyimpanan. Catat sebagai temuan: panen di lahan TBM harus ditolak Asisten.

---

### Skenario C — Persetujuan, Revisi & Rekonsiliasi Checker

*Validasi siklus persetujuan, revisi, jejak audit, dan kontrol kualitas muatan.*

#### C.1 Minta revisi → buka kembali → kirim ulang (BKM Panen)
1. Login **asisten1**. Di Beranda, kartu **Ringkasan Lapangan → Menunggu persetujuan** menampilkan `BKM Panen ›` dengan jumlah menunggu. Ketuk untuk membuka daftar yang terfilter `SUBMITTED` [perlu verifikasi di perangkat].
2. Buka BKM Panen dari Skenario B. Isi *Alasan revisi*: `Brondol Siti terlalu rendah, cek ulang di TPH 02` → **Minta revisi** → **Lanjutkan**.
3. **Cek asisten:** badge **Revisi**. Tombol Setujui/Minta revisi hilang.
4. Login **mandor1** → buka dokumen yang sama. **Cek:**
   - Kotak *"Alasan Revisi: Brondol Siti terlalu rendah, cek ulang di TPH 02"*.
   - *"Buka kembali sebagai draft sebelum mengubah dokumen."*, *"Diminta oleh: AST001"*, dan waktu permintaan.
   - **Tidak ada tombol Edit** sebelum dibuka kembali.
5. **Buka kembali sebagai draft** → badge **Draft**, tombol **Edit** muncul. Edit → Step 3 → ubah brondol Siti menjadi `10` → Step 4 → centang → **Submit BKM** → **Submitted**.
6. Panen ini disetujui lewat **Tutup Harian** hari itu (Skenario S5), bukan dari layar dokumen. Tombol **Setujui** tidak ada di layar Panen.
7. **Riwayat dokumen** (online) berurutan: `CREATE`, `SUBMIT · DRAFT → SUBMITTED`, `REJECT · SUBMITTED → REVISION_REQUESTED` (alasan tercatat, `AST001`), `REVISE · REVISION_REQUESTED → DRAFT` (`MDR001`), `SUBMIT`, lalu setelah tutup harian disetujui `APPROVE · SUBMITTED → APPROVED` (`AST001`).

#### C.2 Aksi basi (409) dan aksi online-only
1. **Aksi basi:** buat panen baru berstatus Submitted. Buka dokumen itu di **ponsel A (asisten1)** tanpa menekan apa pun. Di **ponsel B (mandor1)** tekan **Buka kembali sebagai draft**. Kembali ke ponsel A → **Minta revisi** → harus muncul *"Tindakan gagal"* — *"Dokumen telah berubah. Data terbaru dimuat; periksa sebelum mencoba kembali."* Layar lalu memuat status terbaru (Draft).
2. **Online-only:** di ponsel asisten aktifkan Mode Pesawat lalu buka dokumen Submitted. Tombol **Minta revisi** **tidak tampil**. Panel riwayat menampilkan *"Riwayat tersedia saat online dengan izin baca."*

#### C.3 Dokumen bentuk lama (QR V3) — hanya masa transisi

Skenario lama C.3–C.5 dan D (satu Checker per TPH, QR SPB bertanda tangan server, rekonsiliasi Panen↔Checker 2% saat submit) **tidak lagi menggambarkan alur lapangan**. Dokumen bentuk lama dari build lama tetap diterima server sampai `V3_QR_ACCEPT_UNTIL` (akhir 2026 WIB) agar antrean lama bisa terkirim; lihat versi panduan di commit `4eb222b` bila perlu mengujinya. Pemeriksaan Panen↔Checker per dokumen **dihapus**: satu TPH boleh dimuat ke beberapa truk, dan keseimbangan per TPH kini diperiksa di **Tutup Harian** (S2, S5).

---

### Skenario S — SPB per Truk, Tiket PKS, Tutup Harian (8 skenario lapangan)

*Delapan skenario dari rencana (bagian Validation). Jalankan berurutan seperti hari kerja nyata: hari **D** lalu **D+1**. Semua angka di bawah memakai BJR organisasi 15 kg dan pita brondol 3–8 % kecuali disebut lain. Status verifikasi lapangan: ⏳ semua.*

**Rumus acuan.** Estimasi kg = janjang × BJR blok (atau BJR organisasi). Porsi brondol = brondol kg ÷ (janjang × BJR + brondol kg). BJR aktual trip = (netto acuan − brondol trip) ÷ janjang, hanya untuk trip dari **satu blok**. Netto acuan = netto internal bila ada, selain itu netto tiket PKS.

#### S1 — Satu truk dari tiga TPH
1. Hari D, **mandor1** membuat BKM Panen Blok A1: TPH 01 **60 jjg** (brondol 4 kg), TPH 02 **50 jjg** (brondol 3 kg) → Submit. **admin** (atau PIC Lahan Blok C) membuat Panen Blok B1: TPH 04 **40 jjg** (brondol 3 kg) → Submit.
2. **mandor1** → Beranda → Aksi Cepat **Input Checker** (atau tab Checker → `+`) → layar **SPB Truk Baru**:
   - **Step 1:** **Nomor SPB** `0012345` (ketik, atau **Pindai barcode SPB**, lihat S6), **Kendaraan** `B 9401 AB`, **Nama Sopir** `Budi Santoso`, **Tujuan Kirim** `PKS Sumber Makmur`, **Tanggal Berangkat** D → **Lanjutkan ke Muatan TPH**.
   - **Step 2 — Muatan TPH:** **Tambah Muatan dari TPH** tiga kali, **Sumber Muatan** `Langsung (Panen hari ini)`, pilih *BKM Panen hari berangkat*: TPH 01 60 jjg (brondol 4), TPH 02 50 jjg (brondol 3), TPH 04 40 jjg (brondol 3). Grading: semua Normal kecuali bila ingin menguji grading.
   - **Step 3 — Ringkasan SPB:** *Muatan per TPH* menampilkan 3 baris, **Total Muatan 150 janjang**, brondol 10 kg. Centang *"Saya mengkonfirmasi data SPB sudah sesuai surat jalan kertas"* → simpan.
3. **Cek:** SPB berstatus **Submitted** (= truk berangkat). Tidak ada tombol Setujui. Tidak ada QR untuk SPB bentuk baru.
4. **krani1** → tab Timbangan → **Input tiket PKS (nomor SPB)** → Nomor SPB `0012345`, Nomor tiket `T-1001`, Waktu di PKS (WIB) `D 14:30`, Netto pabrik **2.300** (Bruto/Tara opsional; bila diisi, bruto − tara harus = netto ± 1 kg), foto tiket → **Simpan tiket** → *"Tiket PKS tersimpan dan menjadi berat acuan SPB ini."*
5. **Validasi agronomi:** estimasi = 60×15 + 50×15 + 40×15 = **2.250 kg** + brondol 10 kg = 2.260 kg. Netto 2.300 kg (+1,8 %) wajar. SPB tiga blok/dua blok **tidak** punya BJR aktual (campuran blok); itu benar, bukan error.
6. **Jejak panen** (Timbangan → detail → **Lihat jejak panen**, online): bagian *Sumber: baris SPB dan Panen* menampilkan **3 baris** `TPH 01 · Blok A1`, `TPH 02 · Blok A1`, `TPH 04 · Blok B1`, masing-masing *"Langsung · Panen D · N jjg dipanen di TPH ini"*. **Netto acuan 2300**, *Sumber netto acuan: tiket PKS*, **Susut —** (tidak ada timbangan internal, bukan 0).

#### S2 — Satu TPH dimuat ke dua truk
1. Hari D, Panen Blok A1 TPH 01 **100 jjg** (brondol 8 kg) → Submit.
2. SPB `0012346`: TPH 01 **60 jjg** (brondol 5). SPB `0012347` (truk lain `B 5678 CD`): TPH 01 **40 jjg** (brondol 3). **Kedua SPB berhasil dikirim**: tidak ada lagi tolakan "selisih dengan BKM Panen" per dokumen.
3. Tiket PKS kedua SPB (mis. 930 kg dan 610 kg).
4. **Tutup Harian D** (S5): baris *Keseimbangan per TPH* TPH 01 = Panen 100, Langsung 100, usulan restan 0, selisih 0.
5. **Jejak panen** masing-masing SPB: pasangan *Panen D / TPH 01* tampil **100 jjg** satu kali di tiap jejak (bukan 200), *Janjang Panen 100*, *Janjang di baris SPB* 60 dan 40.

#### S3 — Tiket PKS masuk sebelum SPB tersinkron
1. **mandor1**, **Mode Pesawat**: buat SPB `0012348` (TPH 02, 50 jjg) → *"Data tersimpan di perangkat dan dikirim otomatis saat ada sinyal."* Akun: 1 perubahan menunggu.
2. **krani1** (online) input tiket untuk `0012348`, netto 760 → server menjawab **menunggu SPB**. Daftar Timbangan menampilkan *"Diterima server; dicocokkan otomatis setelah SPB-nya dikirim Mandor. Tarik layar untuk memperbarui."*
3. **mandor1** online → SPB tersinkron (Submitted). Dalam beberapa detik worker mencocokkan tiket → catatan timbang muncul dengan sumber `PKS`, netto internal kosong.
4. **Negatif:** tiket kedua untuk SPB yang sama → ditolak `SPB_TICKET_EXISTS` (409), masuk daftar tinjauan Akun bila dikirim offline. Nomor SPB salah ketik yang tidak pernah punya SPB tetap menunggu; setelah 24 jam ia muncul di web **Laporan → Pengecualian → Menunggu SPB** (R10 `menunggu_spb`).
5. *(Opsional, `jembatan_timbang` aktif)* Krani **Pindai SPB untuk timbangan baru** → `0012348` → Isi 6.050 / Kosong 5.300 → netto internal 750 **mengisi** catatan yang sama (bukan 409). Jejak: netto acuan 750 (internal), susut 750 − 760 = **−10 kg**.

#### S4 — Restan diambil keesokan harinya
1. Hari D: Panen TPH 02 **80 jjg**, SPB D memuat 60 jjg. **Tutup Harian D**: usulan restan TPH 02 = **20**; Mandor mengonfirmasi 20 (brondol 2 kg) → Ajukan. *"Restan yang dihitung langsung tersedia untuk truk."*
2. Hari D+1, **mandor1** SPB `0012349` → **Sumber Muatan** `Titip (restan hari sebelumnya)` → **Restan terbuka** menampilkan *"Panen D · 1 hari · 20 janjang"* (TPH 02). Ambil **12 jjg** saja → simpan → Submitted.
3. **Cek:** daftar restan terbuka kini berisi **8 jjg** di TPH 02 dengan tanggal panen **D** (umurnya tetap dihitung dari D, bukan dari D+1). Ponsel kedua yang mencoba mengambil restan 20 yang sama mendapat konflik `RESTAN_COLLECTED` (409) di Akun, tidak hilang diam-diam.
4. **Tutup Harian D+1:** muatan Titip tampil terpisah sebagai restan diambil dan **tidak** dihitung dalam keseimbangan TPH hari D+1.
5. **Jejak panen** SPB D+1: baris *"Titip · restan panen D"*, *Restan dari hari sebelumnya 12 janjang* (sudah termasuk dalam janjang ditimbang), *Restan tertinggal* 0.
6. Web **Laporan → Restan (R05 v2)** per TPH per D+3: 8 jjg terbuka, umur 3 hari (kelompok 2–3), kolom *disetujui* setelah tutup harian D disetujui.

#### S5 — Tutup harian dengan catatan pengecualian, lalu dibuka kembali
1. Hari D (setelah S1–S4), **mandor1** → Beranda → **Tutup Harian** → pilih Kelompok lahan dan Tanggal D. Pratinjau menampilkan *Keseimbangan per TPH*, trip berangkat, *Brondol dan BJR per blok*, dan pengecualian.
2. Ubah hitungan restan TPH 02 dari usulan 20 menjadi **18** → muncul pengecualian *selisih restan* dengan kolom catatan; tanpa catatan tombol tidak bisa mengirim (*"Catatan wajib"*). Isi `2 janjang jatuh ke parit` → **Ajukan tutup harian**.
3. **Pengecualian pemblokir:** buat Panen D baru dan biarkan **Draft** → pratinjau menampilkan pengecualian pemblokir dan **Ajukan** nonaktif. Hapus atau kirim Panen itu dulu.
4. **asisten1** → Beranda → **Persetujuan Tutup Harian** → pilih tutup harian D → **Setujui** → *"Setujui tutup harian?"* → *"Panen dan trip hari itu kini disetujui."* Status Panen dan SPB hari D menjadi **Approved** sekaligus. Bila ditekan setelah pukul 12.00 D+1, label **Terlambat** tampil (tetap bisa disetujui).
5. **Maker-checker:** mandor yang mengajukan tidak melihat tombol Setujui (*"Anda yang mengajukan tutup harian ini, jadi tidak dapat menyetujuinya."*).
6. **Hari tertutup:** **mandor1** membuat Panen baru bertanggal D → ditolak `DAY_CLOSED` (409), tampil sebagai konflik di Akun, tidak dikirim ulang.
7. **Buka kembali (web):** asisten1/manajer1 di web **Transaksi → Tutup harian** → **Buka kembali** dengan alasan `Panen susulan TPH 01` → status Draft; Panen/SPB hari D kembali Submitted. Kirim ulang Panen susulan → Mandor ajukan ulang → Asisten setujui lagi. Riwayat tutup harian: `SUBMIT`, `APPROVE`, `REVISE` (event REOPEN, alasan), `SUBMIT`, `APPROVE`.
8. **Negatif:** buka kembali ditolak `RESTAN_COLLECTED` bila restan hari D sudah diambil truk D+1 (S4). Jalankan langkah 7 sebelum S4 langkah 2, atau terima penolakan itu sebagai hasil yang benar.

#### S6 — Nomor SPB dipindai dari buku
1. **mandor1** → SPB Truk Baru → Step 1 → **Pindai barcode SPB** → arahkan ke barcode Code 128 pada lembar SPB → kolom **Nomor SPB** terisi (mis. `0012350`). Ulangi dengan EAN/Code 39 bila buku memakai format itu [perlu verifikasi di perangkat].
2. Izin kamera ditolak → tetap bisa **mengetik** nomor.
3. **Nomor dipakai dua kali:** SPB baru dengan nomor yang sama → ditolak `SPB_NUMBER_TAKEN` (409), tampil di Akun untuk diperbaiki (tidak dikirim ulang otomatis).
4. **krani1** → **Input tiket PKS** → **Pindai barcode SPB** pada lembar kembali dari PKS → nomor yang sama terisi. Memindai QR SPB lama di sini memberi pesan *"Itu QR SPB lama, bukan nomor SPB. Pindai barcode nomor SPB atau ketik nomornya."*

#### S7 — Sensus BJR bulanan dan menerima saran BJR blok
1. **mandor1** → Beranda → Aksi Cepat **Catat Observasi** → jenis **Sensus BJR**, Blok A1, TPH 01, **Jumlah sampel (janjang ditimbang)** `15`, Nilai `270` (kg total sampel), Satuan `kg` → **Simpan observasi**. Arti: 270 ÷ 15 = **18 kg/janjang**.
2. Web → **Manajemen Kebun → Blok** → Blok A1 → panel BJR: BJR blok saat ini *(kosong → BJR organisasi 15)*, **Saran 18,00 kg** dengan sumber *Sensus BJR* dan *15 janjang sampel*. Saran **tidak** diterapkan otomatis.
3. Tekan **Terima saran** → BJR blok = 18; riwayat perubahan tercatat (audit). Tanpa sensus 3 bulan terakhir, saran memakai trip satu blok, selain itu BJR organisasi.
4. **Akibatnya:** web **Laporan → Produksi (R01 v3)** per blok: Blok A1 `bjr_sumber` BLOK, estimasi = janjang × 18; kebun berisi blok campuran berlabel CAMPURAN. Tutup harian D berikutnya menilai porsi brondol Blok A1 dengan BJR 18.
5. **Alokasi bulanan:** R01 menampilkan **kg alokasi** dan **faktor koreksi** per kebun per bulan di samping estimasi. Jumlah kg alokasi per kebun per bulan = total netto acuan yang ditimbang bulan itu. Label harus tertulis *alokasi*, bukan *timbang*.

#### S8 — Netto PKS di luar pita BJR
1. Setelah S7 (BJR Blok A1 = 18). Hari D, SPB `0012351` **hanya dari Blok A1**: TPH 01 **100 jjg**, brondol 10 kg.
2. Tiket PKS netto **2.600 kg** → BJR aktual = (2.600 − 10) ÷ 100 = **25,9 kg** vs BJR blok 18 → deviasi **+43,9 %**, di luar pita ±25 %.
3. **Tutup Harian** hari timbangan tercatat: pengecualian **BJR di luar pita** (perlu catatan) menyebut nomor SPB, BJR aktual 25,9, BJR blok 18. Isi catatan (mis. `Truk juga memuat buah kebun tetangga? cek dengan sopir`) sebelum mengajukan.
4. Web **Laporan → BJR aktual (R02)** dengan pengelompokan **per blok**: Blok A1 BJR aktual 25,9 dari 1 trip (sumber netto: tiket PKS).
5. **Arti agronomi:** tanpa jembatan timbang, satu-satunya pemeriksaan fisik muatan adalah netto PKS vs janjang × BJR. Penyimpangan berulang pada truk/sopir yang sama adalah tanda untuk pemeriksaan acak.

---

### Skenario E — BKM Rawat (Pemeliharaan) — Kasus Nyata Pemupukan

*Sesuai benchmark, pemupukan adalah pendorong hasil terbesar kedua setelah panen.*

> **Akses di mobile:** Mandor membuka BKM Rawat lewat **Aksi Cepat** di Beranda: **Buat BKM Rawat** dan **BKM Rawat** [perlu verifikasi di perangkat]. Admin tetap lewat **Menu → BKM Rawat**. Mandor tidak memegang izin approve Rawat, dan penyetuju **harus orang lain** dari pembuat, jadi Rawat buatan mandor disetujui oleh **admin** (Menu) atau **manajer1 lewat web**. Skenario di bawah memakai admin sebagai pembuat supaya uji penyetuju-sama-dengan-pembuat (langkah 8) bisa dijalankan. Ulangi langkah 1–7 sebagai mandor1 untuk memastikan jalur Mandor.

1. Login **admin** → tab **Menu** → **BKM Rawat** → `+` (**Tambah BKM Rawat**).
2. **Kebun** = `Kelompok Tani Maju` → **Blok** = `Blok A1 · TM · 11 th` → **Lahan (Opsional)** = `Lahan Blok A`. **Cek cascade:** Blok baru aktif setelah Kebun dipilih. Lahan hanya menampilkan lahan milik blok itu, plus opsi `Tanpa Lahan`.
3. **Tanggal Pelaksanaan** = hari ini, **Nama Pengawas** = `Mandor Anto` → **Simpan BKM Rawat** → *"Berhasil"* — *"Dokumen BKM Rawat berhasil dibuat."* Layar langsung pindah ke **Detail BKM Rawat** (status **Draft**, *"Belum ada pekerjaan. Tambahkan detail sebelum mengirim dokumen."*). Tanggal default diambil dari jam UTC; jika uji dilakukan sebelum pukul 07.00 WIB, pastikan tanggal yang terpilih benar.
4. **Tambah pekerjaan:**
   | Kolom | Isi |
   |---|---|
   | Tipe pekerjaan | `Perawat` |
   | Kategori pekerjaan | `Pemupukan` |
   | Item pekerjaan | `Tabur Pupuk` |
   | Pekerja terdaftar (opsional) | `Tanpa pekerja terdaftar` |
   | Nama pekerja / kelompok | `Regu Pupuk 1` |
   | Jumlah pekerja | `4` |
   | Hasil pekerjaan / Satuan hasil | `4.5` / `ha` |
   | Luas dirawat (ha) / Jumlah pokok dirawat | `4.5` / `630` |
   | Metode / Kondisi lapangan | `Tabur di piringan` / `Piringan bersih, tanah lembap` |
   | Material | `Pupuk Urea`, Jumlah material `19`, Dosis `1.5`, Satuan dosis `kg/pokok` → **Tambahkan material** |

   Tekan **Simpan pekerjaan**. Kolom desimal di Rawat dibaca dengan **titik** (`4.5`). Nilai `4,5` ditolak dengan *"Data belum lengkap"* atau *"Agronomi tidak valid"*. Periksa apakah keyboard desimal ponsel berbahasa Indonesia hanya menyediakan koma [perlu verifikasi di perangkat].
5. **Cek kartu pekerjaan:** `Tabur Pupuk`, `Regu Pupuk 1 · 4 pekerja`, `Perawat · Pemupukan`, `Hasil: 4.5 ha`, `Luas dirawat: 4.5 ha`, `Pokok dirawat: 630`, `Material: Pupuk Urea · 19 · dosis 1.5 kg/pokok`.
6. **Validasi agronomi:** satuan Urea adalah *Karung 50kg*, jadi 19 karung = 950 kg. 950 kg / 630 pokok = **1,51 kg/pokok** (cocok dengan dosis 1,5 yang dicatat). 950 kg / 4,5 ha = **211 kg/ha**. 630/4,5 = 140 pokok/ha (cocok dengan master). Aplikasi **tidak** memeriksa kecocokan jumlah material, dosis, dan pokok, jadi konsultan yang harus memeriksanya. Besaran dosis mengikuti rekomendasi pemupukan kebun Anda. Yang diuji di sini adalah konsistensinya.
7. **Kirim untuk persetujuan** → **Submitted**. Riwayat: `CREATE`, `SUBMIT · DRAFT → SUBMITTED` oleh `admin`.
8. **Uji penyetuju sama dengan pembuat:** masih sebagai admin, buka dokumen **Submitted** buatan admin → tombol **Setujui** **tidak tampil** (tombol **Minta revisi** tetap ada). API sebagai admin: `POST $API/bkmRawat/<id>/approve` → `HTTP 403` `BKM Rawat must be approved by someone other than the person who filed it`.
9. **Revisi (manajer1 di web):** manajer1 menekan **Minta revisi** dengan alasan `Dosis tidak sesuai rekomendasi LSU`. Di mobile, admin membuka dokumen dan harus melihat *"Catatan penolakan: …"* di kartu atas, lalu *"Alasan revisi: …"* dan *"Diminta oleh: MNJ001"*. Tombol **Ubah/Hapus/Tambah pekerjaan tidak ada** sampai **Buka kembali sebagai draft** ditekan. Buka kembali → ubah dosis → kirim ulang.
10. **Persetujuan (manajer1 di web)** → **Approved**. Cek stok di admin → Menu → **Material**: `Pupuk Urea` turun 19 karung (100 → 81 pada seed baru) [perlu verifikasi di perangkat].

**Uji negatif:** tambah pekerjaan dengan Luas `0` → *"Agronomi tidak valid"* — *"Luas dan jumlah pokok harus lebih dari nol; periksa panjang metode dan kondisi."* Tambah material dengan jumlah `0` → *"Material belum lengkap"* — *"Pilih material, isi jumlah lebih dari nol, dan periksa dosis serta satuannya."* Dokumen tanpa pekerjaan tidak menampilkan tombol **Kirim untuk persetujuan**.

> **Catatan konsultan:** Rawat kini mencatat pekerja, luas, pokok, metode, kondisi, hasil, serta material dan dosis. Data ini cukup untuk menghitung kg/ha dan kg/pokok (laporan R07 ada di web, bukan di mobile). Yang masih kurang untuk pilot adalah jalur mobile bagi Mandor, pembuat dokumen Rawat yang sesungguhnya di lapangan.

---

### Skenario F — Belum Dapat Diuji: Absensi Lapangan

Fase 3 (perencanaan, penugasan, absensi) tetap **ditunda** dari MVP (`DEFERRED` di tracker). Pekerjaan awal yang belum selesai dan belum divalidasi disimpan di branch `feat/phase-3-planning-attendance` untuk dilanjutkan bila diperlukan. **Checkout ini belum berisi** API backend, route mobile, maupun geofence otoritatif untuk absensi. Uji regresi navigasi bahkan memastikan absensi/planning tidak muncul meskipun izinnya diberikan. Skenario ini akan ditulis ulang setelah branch Fase 3 digabung.

---

### Skenario G — Offline-First (Kebun & Jembatan Timbang Tanpa Sinyal)

**Mekanisme yang diuji (dari source):** antrean sinkronisasi disimpan di SQLite **per pengguna yang login di perangkat itu**. Antrean terkirim otomatis begitu perangkat online, dan bisa juga dikirim manual lewat **Akun → Sinkronkan sekarang**. Item yang tidak mungkin berhasil bila dicoba ulang (400/404/409) berhenti dan masuk daftar **"N perubahan perlu ditinjau"** dengan tombol **Periksa**, **Coba lagi**, dan **Buang**. Item seperti itu tidak pernah hilang sendiri. Pengiriman ulang tidak menggandakan dokumen karena setiap item membawa `client_request_id`/kunci SPB yang stabil.

**G0 — Persiapan (online):** login sebagai **mandor1**, **admin**, dan **krani1**, masing-masing sekali di perangkat uji. Sebagai mandor1, buka form Panen sampai Step 2, form Checker sampai Step 1, dan detail BKM Panen Skenario B, supaya master data, daftar panen *Approved*, dan detail panen tersimpan di cache. Mode Pesawat = mematikan Wi-Fi **dan** data seluler.

**G1 — Panen offline.** mandor1, Mode Pesawat aktif. Akun menampilkan **Offline**. Buat BKM Panen: Blok A1 / Lahan Blok A / hari ini, 1 pemanen `Dewi Sartika` di TPH 02, grading 72/2/3/1/1/1 = **80 jjg**, Brondol 10 → **Submit BKM**.
- **Cek:** *"Antrian Offline"* — *"Data tersimpan dan akan dikirim saat online."* Akun: *"1 perubahan menunggu dikirim"*.
- Matikan Mode Pesawat. Sinkronisasi berjalan otomatis → Akun: *"Tidak ada perubahan yang menunggu dikirim"*. Dokumen muncul sebagai **Submitted** dengan 1 detail, **satu dokumen saja**.

**G2 — Checker offline.** mandor1, Mode Pesawat. Checker: tautkan panen Skenario B, TPH 02, `Langsung`, Nomor Truk `B 7788 KL`, Sopir `Rudi Hartono`, Tujuan `PKS Sumber Makmur`, grading **sama dengan Siti** (65/3/2/2/1/0 = 73, Brondol 9).
- Banner *"✓ Sesuai BKM Panen (selisih 0.0%)"* hanya muncul jika detail panen sudah ada di cache (G0) [perlu verifikasi di perangkat].
- **Submit Checker** → *"Antrian Offline"* — *"Data tersimpan dan akan dikirim saat online."* Online kembali → dokumen tersinkron sebagai **Submitted**. Server menjalankan ulang rekonsiliasi 2%. Jika selisih, item masuk daftar tinjauan Akun dengan pesan server.
- Online, login **mandor2** → **Setujui** → QR SPB terbit. Checker ini dipakai di G5/G6. **Jangan buka Checker ini di ponsel krani.**

**G3 — Rawat offline (admin, atau mandor1 lewat Aksi Cepat **Buat BKM Rawat**).** Mode Pesawat → Menu → BKM Rawat → `+` → isi header seperti Skenario E → **Simpan BKM Rawat** → *"Tersimpan offline"* — *"Tambahkan pekerjaan lalu kirim dokumen. Data akan disinkronkan saat online."*
- Detail menampilkan pita *"Draft offline · perubahan tersimpan di perangkat"*. Tambah pekerjaan `Penyemprotan` → `Semprot Gulma`, 3 pekerja, luas `4.5`, pokok `630`, material `Herbisida A` jumlah `9`, dosis `2`, satuan `l/ha` (9 L / 4,5 ha = 2 L/ha ✓) → **Kirim untuk persetujuan** → konfirmasi *"Kirim BKM Rawat?"*.
- Online → tepat **satu** dokumen Rawat **Submitted** di server, berisi detail dan materialnya. Lookup Rawat (kebun, blok, material) saat offline berasal dari cache [perlu verifikasi di perangkat].

**G4 — Timbang offline, Checker sudah ter-cache.** Gunakan Checker seed **B 9402 CD** (162 jjg, lihat Skenario A no. 4).
1. **Online:** krani1 memindai QR → **Lanjutkan Timbangan** → form menampilkan Ahmad Dahlan / B 9402 CD / PKS Sumber Makmur / *"162 Janjang / 22 kg"* → tekan **kembali tanpa menyimpan**. Checker kini ada di cache ponsel krani.
2. **Mode Pesawat** → pindai QR yang sama → form **tetap menampilkan data Checker**. Isi Brondol `22`, Isi `7650`, Kosong `5200` → Netto **2.450 kg**. Estimasi *"2.430 kg (162 jjg × 15 kg)"*, tanpa peringatan.
3. **Simpan Timbangan** → *"Tersimpan di perangkat"* — *"Netto 2.450 kg dikirim otomatis saat online. Jika ditolak server, periksa di menu Akun."*
4. Simpan lagi SPB yang sama saat masih offline → *"Sudah tersimpan"* — *"Timbangan untuk SPB ini sudah menunggu sinkronisasi."*
5. Online → timbangan tersinkron, muncul di daftar hari ini dengan badge **Approved**.
6. **Agronomi:** (2.450 − 22) / 162 = **14,99 kg/janjang**, BJR aktual ≈ BJR standar ✓.

**G5 — Timbang offline, Checker belum pernah dibuka di ponsel krani.** Checker G2 (**B 7788 KL**, 73 jjg). Mode Pesawat → pindai QR.
- **Cek:** *"Data Checker belum tersimpan di perangkat. Isi kendaraan, sopir, dan tujuan sesuai SPB fisik; server mencocokkannya dengan Checker saat sinkronisasi."* Kartu SPB menampilkan `-` untuk sopir/kendaraan/tujuan dan *"73 Janjang / 0 kg"* (janjang dibaca dari QR). Kolom **Tujuan kirim** muncul. Daftar kendaraan/sopir kemungkinan kosong saat offline, jadi isian manual yang muncul [perlu verifikasi di perangkat].
- Lanjut ke G6 dengan data yang sengaja salah.

**G6 — Truk tidak cocok → ditinjau di Akun.**
1. Isi dari "SPB kertas" dengan satu salah ketik: Nomor kendaraan `B 7788 KI`, Nama sopir `Rudi Hartono`, Tujuan kirim `PKS Sumber Makmur`, Brondol `9`, Isi `6255`, Kosong `5150` → Netto 1.105 kg (estimasi 1.095 kg). **Simpan Timbangan** → *"Tersimpan di perangkat"*.
2. Online → sinkron → server menolak (409). **Akun** menampilkan *"1 perubahan perlu ditinjau"*, item `Timbangan · CREATE`, alasan *"Timbangan ditolak server: truk, sopir, atau tujuan tidak cocok dengan Checker, SPB sudah ditimbang, atau jumlah janjang berbeda. Buang item ini lalu input ulang timbangan sesuai SPB."*, dan pesan server `Truck, driver, or destination does not match the approved Checker`. **Coba lagi** akan ditolak dengan alasan yang sama. Yang benar: **Buang**, lalu input ulang timbangan dengan data SPB yang benar.
3. **Periksa** → modal *"Periksa perubahan"* berisi data perangkat. **Coba lagi** mengirim ulang data yang sama dan akan gagal lagi, karena isi antrean tidak bisa diedit.
4. Selama item gagal masih ada, pindai QR yang sama → simpan → *"Sudah tersimpan"*. **Buang** item → konfirmasi *"Buang perubahan ini?"* → **Buang**.
5. Pindai ulang, isi **persis** `B 7788 KL` → simpan → sinkron → berhasil, badge **Approved**.

**G7 — Sinkron setelah tersambung kembali & tidak ada duplikat.** Antrekan 2–3 item (panen, checker, timbangan). Nyalakan koneksi, lalu **tutup paksa aplikasi** saat Akun menampilkan *"Sinkronisasi berlangsung…"*. Buka lagi aplikasi. Sisa antrean harus terkirim, dan di server setiap item menjadi **tepat satu** dokumen. Untuk timbangan yang respons pertamanya hilang, kiriman ulang dengan berat isi/kosong yang sama dianggap berhasil, bukan konflik [perlu verifikasi di perangkat].

**G8 — Perangkat bersama / ganti pengguna.**
1. mandor1, offline: buat 1 BKM Panen → *"1 perubahan menunggu dikirim"*. **Keluar**.
2. Online, login **asisten1** di perangkat yang sama. Akun asisten: *"Tidak ada perubahan yang menunggu dikirim"*. Panen milik mandor1 **tidak** terkirim atas nama asisten (cek di server: tidak ada dokumen baru).
3. Keluar → login **mandor1** → antrean mandor1 kembali (*"1 perubahan menunggu dikirim"*) lalu terkirim. Riwayat dokumen mencatat `MDR001` [perlu verifikasi di perangkat].
4. **Cache ikut terhapus saat Keluar:** krani1 yang keluar lalu login lagi harus membuka Checker online dulu. Tanpa itu, pemindaian offline berperilaku seperti G5 (Checker belum ter-cache).

**G9 (opsional, lingkungan dev) — Batas waktu timbang offline.** Server menilai masa berlaku SPB pada **waktu timbang** (`weighed_at` dari ponsel), bukan waktu sinkron. Tanggal trip = tanggal timbang. Timbangan offline yang lebih tua dari `OFFLINE_WEIGHING_MAX_AGE_MS` (default 7 hari) ditolak.
- Jalankan server dengan `OFFLINE_WEIGHING_MAX_AGE_MS=120000`. Timbang offline, tunggu > 2 menit, lalu online. Hasilnya item tinjauan dengan alasan *"Data ditolak server. Mengirim ulang tidak akan berhasil tanpa perbaikan."* dan pesan server `Waktu timbang tidak valid atau terlalu lama untuk disinkronkan.`
- Jalankan server dengan `QR_EXPIRY_MS=180000`. Terbitkan SPB, timbang offline dalam 3 menit, lalu online setelah menit ke-3. Timbangan **diterima**, karena dinilai pada waktu timbang.
- Jam ponsel yang lebih dari 5 menit di depan server juga ditolak. Kembalikan env ke default setelah uji.

---

## 4. Matriks Validasi Agronomi (acuan cepat)

Gunakan tabel ini sebagai *checklist* saat menguji. Kolom "Perilaku aplikasi" menjelaskan apa yang **benar-benar** dilakukan source. Selebihnya menjadi tugas penguji.

| Metrik | Rumus / Standar | Nilai Wajar | Perilaku aplikasi |
|---|---|---|---|
| Estimasi tonase | `janjang × BJR blok / 1000` (BJR organisasi bila blok belum punya) | — | Tampil di review Panen (Step 4). Laporan R01 v3 memakai BJR blok dan menampilkan sumbernya |
| BJR blok | sensus BJR 3 bulan → trip satu blok → BJR organisasi | sesuai umur/klon | Saran di web, **diterima manual** (S7) |
| Alokasi netto | netto acuan kebun per bulan × (janjang × BJR blok) ÷ estimasi kebun | jumlahnya = total ditimbang | R01 `kg_alokasi` + faktor koreksi, berlabel *alokasi* (S7) |
| BJR aktual trip | (netto acuan − brondol trip) ÷ janjang, trip satu blok | dalam ±`bjr_band_pct` (25 %) dari BJR blok | Pengecualian tutup harian `BJR_BAND`, perlu catatan (S8) |
| Berat vs estimasi (krani) | `netto` vs `janjang × BJR + brondol di truk` | **±5%** (ambang konsultan) | Layar hanya memperingatkan jika selisih netto vs `janjang × BJR` **> 20%**, dan tidak memblokir. Selisih 5–20% harus diperiksa manual |
| Produktivitas pemanen | `janjang/hari` | 70–100 (≈ 1,0–1,5 ton) | Tidak divalidasi |
| Komposisi matang (Fraksi 2+3) | `janjang_normal / total` | **≥ 85%** | Tidak divalidasi |
| Buah mentah | `buah_mentah / total` | ≤ 5% (lebih → ditolak PKS) | Tidak divalidasi |
| Brondolan | `kg brondol / (janjang × BJR blok + kg brondol)` | pita organisasi, default **3–8 %** | Pengecualian tutup harian per blok (perlu catatan, tidak menolak); R01 `brondol_pct` dan `brondol_band` |
| Keseimbangan TPH (tutup harian) | Panen = muatan Langsung + restan dihitung; Titip tidak dihitung | selisih ≤ `discrepancy_tolerance_pct` (2 %) | Pengecualian perlu catatan; **tidak** lagi diperiksa saat submit SPB (S2, S5) |
| Nomor SPB | unik per organisasi | — | 409 `SPB_NUMBER_TAKEN`; timbangan/tiket tanpa SPB menunggu, tampil di R10 setelah 24 jam (S3, S6) |
| Batas persetujuan tutup harian | pukul 12.00 hari D+1 | — | Label **Terlambat**, tetap bisa disetujui; R09 `terlambat` |
| Umur timbang offline | `weighed_at` vs waktu sinkron | ≤ 7 hari (`OFFLINE_WEIGHING_MAX_AGE_MS`) | Lebih tua → ditolak, masuk tinjauan Akun |
| Pemupukan | `jumlah material × isi kemasan / pokok` dan `/ ha` | Konsisten dengan dosis yang dicatat dan rekomendasi kebun | Tidak divalidasi silang |
| Kematangan blok/lahan | `tanggal_tm` bila diisi, selain itu tahun tanam | Panen hanya di TM | Panen di lahan TBM **wajib alasan** (`alasan_tbm`) sebelum masuk antrean; tampil sebagai pengecualian tutup harian |

---

## 5. Hasil yang Diharapkan / Kriteria Lolos MVP (per 3 Oktober 2026)

Legenda: ✅ = ada di source saat ini (lolos lapangan **belum** dibuktikan) · ⚠️ = ada, dengan catatan · ❌ = tidak tersedia di mobile · ⏳ = belum dijalankan.

| Kriteria | Status source | Skenario | Verifikasi lapangan |
|---|---|---|---|
| Rantai `SCENARIO-REAL` (panen→checker→krani) koheren | ✅ Seed | A | Perlu |
| Alur DRAFT→SUBMITTED→APPROVED; Minta revisi → `REVISION_REQUESTED`; buka kembali → DRAFT; form terkunci di luar DRAFT | ✅ | C.1, E | Perlu |
| Tombol aksi mengikuti status + izin (`utils/operational-policy.ts`); Setujui/Minta revisi hanya online | ✅ | C.1–C.2 | Perlu |
| Alasan revisi, peminta, dan waktu ditampilkan | ✅ | C.1, E | Perlu |
| Panel **Riwayat dokumen** (online-only) | ✅ | C.1, E | Perlu |
| Aksi basi → 409 + pesan muat ulang | ✅ | C.2 | Perlu (2 perangkat) |
| SPB per truk: nomor dari buku (pindai/ketik), muatan per TPH Langsung/Titip, offline | ✅ Source | S1, S2, S6 | ⏳ |
| Tiket PKS per nomor SPB sebagai berat acuan; menunggu SPB; jembatan timbang opsional mengisi catatan yang sama | ✅ Source | S1, S3 | ⏳ |
| Restan dari tutup harian, diambil Titip (sebagian, tanggal asal tetap) | ✅ Source | S4 | ⏳ |
| Tutup harian: pratinjau, pengecualian + catatan, ajukan, setujui, tolak, buka kembali (web), hari tertutup | ✅ Source | S5 | ⏳ |
| BJR blok dari sensus, saran diterima manual; alokasi netto bulanan R01 | ✅ Source | S7 | ⏳ |
| Pengecualian BJR di luar pita pada netto PKS | ✅ Source | S8 | ⏳ |
| Jejak panen per baris SPB (P6-MOB-01) | ✅ Source | S1, S2, S4 | ⏳ |
| Dokumen bentuk lama (QR V3) selama masa transisi | ✅ Source | C.3 | Opsional |
| Estimasi tonase BJR | ⚠️ Di form Panen; tidak di layar detail. Laporan memakai BJR blok | A, B, S7 | Perlu |
| BKM Rawat: detail, material/dosis, submit, approve, revisi, offline | ✅ Source | E, G3 | Perlu |
| Akses BKM Rawat untuk Mandor di mobile | ✅ Aksi Cepat Beranda (belum di-commit). Persetujuan oleh orang lain (admin atau manajer1 lewat web) | E | Perlu |
| Maker-checker Checker & Rawat: pembuat tidak dapat menyetujui (tombol disembunyikan, server 403) | ✅ Source (belum di-commit) | C.3, E | Perlu |
| Cascade Rawat kebun→blok→lahan; filter Lahan/TPH per blok | ✅ | B, E | Perlu |
| Antrean offline per pengguna, sinkron otomatis/manual, daftar tinjauan (Periksa/Coba lagi/Buang) | ✅ | G1–G8 | ⏳ |
| Replay tanpa duplikat (`client_request_id`, kunci SPB) | ✅ | G7 | ⏳ |
| Timbang offline (Checker ter-cache / belum ter-cache, `weighed_at`, batas 7 hari) | ✅ | G4–G6, G9 | ⏳ |
| Daftar Timbangan "hari ini" menampilkan timbangan tersimpan (tanggal WIB) | ✅ | S1, G4 | Perlu |
| Absensi Lapangan | ❌ Ditunda (Fase 3; pekerjaan awal di branch terpisah) | F | — |
| Gerbang Fase 6: uji lapangan konektivitas buruk dengan ponsel nyata | ⏳ Belum dijalankan | G | Wajib |
| Fase 7: UAT per peran + pilot lapangan | ⏳ Belum dijalankan | Semua | Wajib |

**MVP belum boleh dinyatakan lolos** sebelum gerbang Fase 6 dan pilot Fase 7 selesai (lihat `sawitin/sawitin-backend/docs/plantation-field-operations-status.md`).

---

## 6. Data yang Perlu Disiapkan Ulang / Catatan

- **Idempotensi seeder:** `SCENARIO-REAL` dilewati hanya jika skenario **dengan tanggal H-2 yang sama** sudah ada. Menjalankan seed di hari lain membuat **rantai baru** (panen + 2 checker + 1 timbangan) dengan tanggal baru. Filter kartu berdasarkan tanggal dan keterangan `SCENARIO-REAL`.
- **Menguji ulang offline weighing (G4)** butuh Checker `APPROVED` yang belum ditimbang. Checker B 9402 CD hanya bisa ditimbang sekali. Buat Checker baru (C.3) atau jalankan seed di hari lain.
- **Reset bersih** (jika data uji menumpuk):
  ```bash
  cd sawitin/sawitin-backend
  npx prisma migrate reset --force   # hapus & buat ulang skema + seed
  redis-cli FLUSHALL
  ```
  Keluar dari semua akun di ponsel setelah reset. Antrean lama di perangkat merujuk ke dokumen yang sudah tidak ada dan akan muncul sebagai item tinjauan (404/409).
- **BJR bisa diubah** per organisasi di kolom `organization.settings` (JSON `{ "bjr": 15 }`), misalnya untuk menguji kebun dengan janjang lebih kecil (10 kg) atau lebih besar (20 kg).
- **Kenop lingkungan backend** (`src/config/config.ts`): `QR_EXPIRY_MS` (default 48 jam), `QR_CLOCK_SKEW_MS` (5 menit), `OFFLINE_WEIGHING_MAX_AGE_MS` (7 hari), `DISCREPANCY_TOLERANCE_PCT` (2). Masa berlaku QR saat pindai dan toleransi rekonsiliasi di form Checker kini mengikuti server lewat `/orgConfig` (`qr_expiry_ms`, `discrepancy_tolerance_pct`). Nilai 48 jam dan 2% di ponsel hanya dipakai bila ponsel belum pernah menjangkau server. Uji: ubah `QR_EXPIRY_MS` di server, login ulang di ponsel krani, lalu pastikan pesan kedaluwarsa menyebut jumlah jam yang baru [perlu verifikasi di perangkat].
- **Temuan yang perlu ditindaklanjuti sebelum pilot:**
  1. ~~Model satu Checker per TPH versus pola muat truk~~ → diselesaikan oleh SPB per truk (D1, S1–S2).
  2. ~~Rentang acuan brondolan~~ → pita organisasi 3–8 % (D3), dapat diubah di Pengaturan Organisasi.
  3. ~~Penyetuju Checker sesama Mandor~~ → Asisten menyetujui lewat Tutup Harian (D2).
  4. ~~Panen di lahan TBM~~ → wajib alasan (D4), tampil sebagai pengecualian tutup harian.
  5. Data seed `SCENARIO-REAL` masih bentuk lama (Checker per TPH). Skenario S membuat datanya sendiri; seed bentuk trip belum ada.
  6. Rentang seri buku SPB per kebun belum didaftarkan (opsional, bila audit memintanya).

  Sudah diperbaiki (25–28 September 2026):
  - jalur Mandor ke BKM Rawat (Aksi Cepat);
  - tanggal di ringkasan Beranda Krani;
  - teks alasan di Akun untuk timbangan yang ditolak;
  - maker-checker pada Checker;
  - koma desimal di form Rawat (mis. `4,5`);
  - tanggal default hari kebun (WIB) di form Rawat, Observasi, dan Pemakaian Kendaraan;
  - peringatan TBM di langkah 1 BKM Panen.
