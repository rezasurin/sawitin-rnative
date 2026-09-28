# Sawitin Mobile — Panduan Uji Kasus Nyata (Real-Case E2E)

> **Disusun oleh:** Konsultan Kelapa Sawit (medium estate, 25–500 ha, Indonesia)
> **Tujuan:** Menguji aplikasi mobile Sawitin dengan skenario operasional **nyata di lapangan** — bukan sekadar "happy path" — sekaligus memvalidasi bahwa angka yang muncul **masuk akal secara agronomi** (bukan cuma berhasil tersimpan).

> **Status 25 September 2026:** Panduan ini dicocokkan dengan source saat ini: mobile branch `feat/rawat-detail-and-sync-idempotency` dan backend branch `feat/plantation-master-data-phase-2`, termasuk perubahan yang belum di-commit. Yang baru sejak versi 20 September: alur revisi (`REVISION_REQUESTED` → buka kembali → `DRAFT`), panel **Riwayat dokumen**, BKM Rawat lengkap dengan detail dan material, QR SPB yang diterbitkan server, validasi truk/sopir/tujuan saat timbang, **timbang offline**, dan tinjauan antrean di menu **Akun**. Absensi (Fase 3) tetap **ditunda** dari MVP; pekerjaan awalnya disimpan di branch `feat/phase-3-planning-attendance` dan **tidak ada di checkout ini** (lihat Skenario F). Uji lapangan konektivitas buruk (gerbang Fase 6) dan pilot lapangan (Fase 7) **belum dijalankan**. Semua ✅ di bawah berarti "sudah ada di source", bukan "lolos lapangan".
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
| Mandor Panen | `mandor1` | `password123` | `MDR001` | Input panen, checker & rawat; tampilkan SPB |
| Mandor Panen | `mandor2` | `password123` | `MDR002` | **Setujui / minta revisi Checker** buatan mandor1 (pembuat tidak boleh menyetujui sendiri) |
| Asisten Afdeling | `asisten1` | `password123` | `AST001` | Setujui / minta revisi **BKM Panen** |
| Krani Timbang | `krani1` | `password123` | `KRN001` | Pindai QR SPB, timbang |
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

**Siapa boleh menyetujui (seed role):** Panen → `asisten1`, `manajer1`, `admin`. Checker → `mandor1`, `manajer1`, `admin` (asisten hanya baca). Rawat → `manajer1`, `admin`, dengan aturan **penyetuju harus orang lain dari pembuat dokumen**. Timbangan hasil QR disetujui otomatis oleh server bila cocok.

> **Kontrol internal (maker-checker):** pembuat Checker atau BKM Rawat **tidak dapat menyetujui dokumennya sendiri**. Di mobile tombol **Setujui** tidak tampil bagi pembuat (tombol **Minta revisi** tetap ada), dan server menolak dengan 403. Checker buatan mandor1 disetujui oleh **mandor2**, manajer, atau admin. Catatan: tombol baru tersembunyi setelah login ulang, karena kode user (`user_code`) baru dikirim server sejak perubahan ini.

**Perangkat:** siapkan minimal **2 ponsel** (atau 1 ponsel + 1 simulator). Satu menampilkan QR SPB (Mandor), satu lagi memindai (Krani). Perangkat kedua juga dipakai untuk uji "aksi basi" (409).

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

| Status (badge) | Yang harus terlihat, bila pengguna punya izinnya |
|---|---|
| `DRAFT` ("Draft") | Edit/ubah detail, **Kirim untuk persetujuan** (hanya jika ada ≥ 1 detail), **Hapus draft** (izin delete) |
| `SUBMITTED` ("Submitted") | **Setujui** dan **Minta revisi**, dengan kolom *"Alasan revisi (opsional)"*. Keduanya hanya muncul saat **online** dan hanya bagi pemegang izin `approve`. **Buka kembali sebagai draft**. **Batalkan dokumen** (online). |
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
6. Login **asisten1** → **Setujui** → **Approved**.
7. **Riwayat dokumen** (online) berurutan: `CREATE`, `SUBMIT · DRAFT → SUBMITTED`, `REJECT · SUBMITTED → REVISION_REQUESTED` (alasan tercatat, `AST001`), `REVISE · REVISION_REQUESTED → DRAFT` (`MDR001`), `SUBMIT`, `APPROVE · SUBMITTED → APPROVED` (`AST001`).

#### C.2 Aksi basi (409) dan aksi online-only
1. **Aksi basi:** buat panen baru berstatus Submitted. Buka dokumen itu di **ponsel A (asisten1)** tanpa menekan apa pun. Di **ponsel B (mandor1)** tekan **Buka kembali sebagai draft**. Kembali ke ponsel A → **Setujui** → harus muncul *"Tindakan gagal"* — *"Dokumen telah berubah. Data terbaru dimuat; periksa sebelum mencoba kembali."* Layar lalu memuat status terbaru (Draft).
2. **Online-only:** di ponsel asisten aktifkan Mode Pesawat lalu buka dokumen Submitted. Tombol **Setujui** dan **Minta revisi** **tidak tampil**. Panel riwayat menampilkan *"Riwayat tersedia saat online dengan izin baca."*

#### C.3 Checker & SPB (Mandor)
1. Login **mandor1** → tab **Checker** → `+`:
   - **Step 1:** BKM Panen (Opsional) = panen Skenario B yang sudah **Approved** (label `Blok A1 — <tanggal>`), Blok `Blok A1`, TPH `TPH 01`, Tanggal Laporan hari ini → **Lanjutkan ke Truk & Grading**.
   - **Step 2:** Tipe Pengiriman `Langsung`. Kendaraan **Ketik manual** → Nomor Truk `B 1234 XY`. Sopir **Ketik manual** → `Ahmad Dahlan`. Tujuan Kirim `PKS Sumber Makmur`. Tekan **Tambah Detail**. Grading **sama dengan panen TPH 01** (70/2/3/1/0/1 = 77 janjang, Brondol (kg) 11) → **Review & Konfirmasi**.
   - **Step 3:** banner hijau *"✓ Sesuai BKM Panen (selisih 0.0%)"* dan *"Estimasi Tonase: 1.16 t (15 kg/janjang)"*. Centang konfirmasi → **Submit Checker**.
2. **Cek maker-checker:** sebagai mandor1, buka Checker tersebut. Tombol **Setujui** **tidak tampil**, sedangkan **Minta revisi** tetap ada. API sebagai mandor1: `POST $API/bkmChecker/<id>/approve` → `HTTP 403` `{"error":"BKM Checker must be approved by someone other than the person who filed it"}`.
   Login **mandor2** → tab **Checker** → buka Checker tersebut → **Setujui** → **Approved**. Kartu **SPB** dengan QR muncul. QR ini **diterbitkan server** (`GET /bkmChecker/:id/spb`) dan berlaku **48 jam sejak diterbitkan** (`QR_EXPIRY_MS`). Setiap kali layar detail dibuka, server menerbitkan QR baru dengan waktu terbit baru.
3. **Bagikan Tiket SPB (Gambar)** → simpan gambar. Inilah "SPB kertas" untuk Krani (berisi No. Truk, Sopir, Tujuan).

#### C.4 Uji negatif rekonsiliasi (penting)
1. Buat Checker baru: panen yang sama, TPH 01, grading **82 janjang** (75/2/3/1/0/1), selisih 5/77 = 6,5%.
   - **Cek oranye:** *"⚠️ Jumlah janjang tidak sesuai BKM Panen (selisih 6.5%). Checker: 82, Panen: 77. Submit akan ditolak."* Tombol **Submit Checker nonaktif**.
2. **Backend harus menolak juga (400).** Mobile tidak bisa membuat draft yang selisih, jadi buat lewat API dengan token mandor1:
   ```bash
   # ambil blok_id, tph_id, bkm_panen_id dari Checker C.3 (dokumen terbaru)
   curl -s "$API/bkmChecker?limit=5&sort=created_at:desc" -H "Authorization: $TOKEN" | jq '.data[] | {id, blok_id, tph_id, bkm_panen_id, status}'
   CHK=$(curl -s -X POST $API/bkmChecker -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
     -d '{"blok_id":"<BLOK_ID>","tph_id":"<TPH01_ID>","tanggal_laporan":"2026-09-25","bkm_panen_id":"<PANEN_ID>"}' | jq -r .id)
   curl -s -X POST $API/bkmChecker/detail -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
     -d "{\"bkm_checker_id\":\"$CHK\",\"tipe_pengiriman\":\"LANGSUNG\",\"nomor_truk\":\"B 1234 XY\",\"nama_sopir\":\"Ahmad Dahlan\",\"tujuan_kirim\":\"PKS Sumber Makmur\",\"janjang_normal\":75,\"buah_mentah\":2,\"over_ripe\":3,\"tangkai_panjang\":1,\"buah_abnormal\":0,\"janjang_kosong\":1,\"jumlah_janjang\":82,\"jumlah_brondol\":11}"
   curl -s -w "\nHTTP %{http_code}\n" -X PUT $API/bkmChecker/$CHK -H "Authorization: $TOKEN" \
     -H "Content-Type: application/json" -d '{"status":"SUBMITTED"}'
   ```
   Harapan: `HTTP 400`, `{"error":"Jumlah janjang tidak sesuai BKM Panen (selisih 6.5%). Checker: 82, Panen: 77."}`. Hapus draft ini setelahnya.

**Arti agronomi:** kontrol ini mencegah **kehilangan TBS antar tahap** (panen → muat) dan mencegah janjang fiktif. Toleransi **2%** (`DISCREPANCY_TOLERANCE_PCT` di backend; di mobile nilainya tertanam 2) wajar untuk selisih hitung di lapangan.

#### C.5 Uji negatif SPB: satu SPB = satu truk `LANGSUNG`
1. **Muatan campuran:** buat Checker (TPH 01, tautkan panen Skenario B) dengan **dua baris truk yang sama**: `Langsung` 50 jjg (45/1/2/1/0/1) + `Titip` 27 jjg (25/1/1/0/0/0). Nomor truk, sopir, dan tujuan identik: `B 1234 XY` / `Ahmad Dahlan` / `PKS Sumber Makmur`. Total 77 → banner ✓. Submit → login **mandor2** → **Setujui**.
   - **Cek:** kartu SPB **tidak** muncul. Yang tampil adalah teks *"SPB tidak dapat diterbitkan: satu SPB hanya untuk satu truk pengiriman Langsung. …"* (server 409). Teks ini **tidak** berulang-ulang mencoba memuat.
   - API: `curl -s -w "\nHTTP %{http_code}\n" $API/bkmChecker/<id>/spb -H "Authorization: $TOKEN"` → `HTTP 409` `{"error":"One SPB must contain one direct-shipment truck; split mixed or multi-truck Checkers"}`.
2. **Data seed campuran:** Checker *"Checker hari ini - menunggu approval"* (Langsung + Restan) → sebagai **mandor2** → **Setujui** → pesan 409 yang sama [perlu verifikasi di perangkat].
3. **Dua truk berbeda dalam satu Checker:** di Step 2 tambahkan baris kedua dengan Nomor Truk `B 5678 CD` → **Tambah Detail** ditolak: *"Muatan berbeda"* — *"Nomor truk berbeda. Buat dokumen Checker baru untuk truk lain."*
4. **Sudah ditimbang:** setelah Skenario D selesai, buka lagi Checker C.3 → pesan 409 yang sama. SPB tidak bisa diterbitkan ulang.

> **Catatan konsultan (desain yang perlu keputusan produk):** Rekonsiliasi membandingkan **satu dokumen Checker** dengan **seluruh janjang panen di TPH itu**. Hasil satu TPH yang dimuat ke dua truk (dua Checker yang sama-sama menautkan panen) akan gagal rekonsiliasi di kedua dokumen. Sebaliknya, satu truk yang menjemput beberapa TPH membutuhkan satu Checker dan satu SPB per TPH, padahal jembatan timbang hanya menimbang truk itu sekali. Pastikan pola muat kebun pilot cocok dengan model ini sebelum pilot.

---

### Skenario D — Jembatan Timbang (Krani) dengan Validasi Berat

*Simulasikan truk datang ke PKS. Berat harus konsisten dengan janjang **plus brondolan di bak**.*

1. Login **krani1** → tab **Timbangan** → `+` (**Pindai QR untuk timbangan baru**) → pindai QR SPB dari C.3 (77 janjang).
   - Dialog *"QR SPB Terbaca"*: *"ID Checker: …"*, *"Total Janjang: 77 janjang"*, *"Keaslian SPB akan diverifikasi oleh server saat hasil timbang disimpan."* → **Lanjutkan Timbangan**.
2. **Informasi Dokumen SPB:** Nama Sopir `Ahmad Dahlan`, Nomor Kendaraan `B 1234 XY`, Tujuan Kirim `PKS Sumber Makmur`, Blok / TPH Asal `Blok A1 / TPH 01`, *"77 Janjang / 11 kg"*.
3. Isi timbangan realistis:
   - **Brondol di truk ini (kg):** `11` (wajib, kg bulat, `0` jika tidak ada)
   - **Timbang Isi (Gross) - kg:** `6366`. Titik ribuan juga diterima: `6.366` dibaca 6366.
   - **Timbang Kosong (Tare) - kg:** `5200`
4. **Cek:** **Berat Bersih (Netto) 1.166 kg**. *"Estimasi dari janjang: 1.155 kg (77 jjg × 15 kg)"*. Selisih 11 kg = brondolan di bak, sehingga netto ≈ estimasi + brondol. Tidak ada peringatan.
5. **Simpan Timbangan** → *"Berhasil"* — *"Data timbangan berhasil disimpan."* Kartu baru di daftar: `Ahmad Dahlan`, `Kendaraan: B 1234 XY`, `Netto: 1.166 kg`, badge **Approved**. Timbangan QR yang cocok disetujui otomatis dan tidak punya tombol Setujui/Minta revisi. Header daftar: *"1 penimbangan hari ini"*.
6. Buka detail: *"Janjang / Brondol ditimbang (kg)"* = `77 Janjang / 11 kg`. Opsional: **Lihat jejak panen** (hanya online) → bagian *Temuan* dan *"Grading cocok"* [perlu verifikasi di perangkat].

**Uji negatif:**
- **Isi < kosong:** isi `5000`, kosong `5200` → pesan di kolom *"Timbang isi harus lebih besar daripada timbang kosong"*, Netto 0, **Simpan Timbangan nonaktif**. Server juga menolak dengan pesan yang sama (400).
- **Brondol kosong:** kosongkan kolom brondol → Simpan → *"Brondol belum valid"* — *"Masukkan brondol di truk ini dalam kilogram bulat, termasuk 0 jika tidak ada."*
- **Berat tidak masuk akal:** isi `8200`, kosong `5200` → netto 3.000 kg vs estimasi 1.155 kg. Muncul *"⚠️ Selisih 160% dari estimasi janjang (1.155 kg). Periksa kembali kemungkinan kesalahan input atau muatan berlebih."* Peringatan ini **tidak memblokir** simpan, karena berat PKS adalah otoritas. Anda **wajib mempertanyakan** selisih ini secara agronomi.
- **Selisih "diam" 5–20%:** isi `6470`, kosong `5200` → netto 1.270 kg (+10% dari estimasi). **Tidak ada peringatan**, karena layar baru memperingatkan jika selisih **> 20%**. Konsultan tetap menandai ini, karena ambang kebun ±5% (lihat Matriks).
- **Timbang ganda:** setelah langkah 5, pindai QR yang sama lagi, isi, lalu simpan → *"Gagal"* — `Duplicate transaction` (server 409). Checker yang sudah ditimbang tidak bisa ditimbang lagi, dan QR baru juga tidak bisa diterbitkan (C.5 no. 4).
- **QR kedaluwarsa:** pindai gambar SPB yang terbit lebih dari 48 jam lalu → *"QR Kadaluarsa"* — *"SPB ini sudah melewati masa berlaku (48 jam). Silakan minta SPB baru dari Mandor."* Pemeriksaan 48 jam di ponsel tertanam di kode dan tidak mengikuti `QR_EXPIRY_MS` server.
- **Bukan QR Sawitin:** *"Format Tidak Valid"* — *"QR Code yang dipindai bukan merupakan Surat Pengantar Buah (SPB) Sawitin."*

> Truk, sopir, dan tujuan yang disimpan harus **sama persis** dengan Checker (server hanya memotong spasi di ujung, huruf besar/kecil tetap dibedakan). Jika berbeda, server menolak dengan `Truck, driver, or destination does not match the approved Checker` (409). Lihat Skenario G6.

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
| Estimasi tonase | `janjang × BJR / 1000` | — | Tampil di review Panen (Step 4), review Checker (Step 3), dan input Timbangan. **Tidak** tampil di layar detail |
| Berat vs estimasi (krani) | `netto` vs `janjang × BJR + brondol di truk` | **±5%** (ambang konsultan) | Layar hanya memperingatkan jika selisih netto vs `janjang × BJR` **> 20%**, dan tidak memblokir. Selisih 5–20% harus diperiksa manual |
| Produktivitas pemanen | `janjang/hari` | 70–100 (≈ 1,0–1,5 ton) | Tidak divalidasi |
| Komposisi matang (Fraksi 2+3) | `janjang_normal / total` | **≥ 85%** | Tidak divalidasi |
| Buah mentah | `buah_mentah / total` | ≤ 5% (lebih → ditolak PKS) | Tidak divalidasi |
| Brondolan | `kg brondol / (janjang × BJR)` | Tetapkan acuan kebun sebelum uji. Versi lama panduan memakai 10–15%, tetapi seed hanya ≈ 0,9% (44 kg / 4.785 kg) | Brondol wajib kg bulat, diisi per pemanen (Panen), per Checker, dan per truk (Timbangan) |
| Rekonsiliasi panen↔checker | selisih janjang per TPH | **≤ 2%** | Mobile menonaktifkan submit. Backend menolak dengan 400 (`DISCREPANCY_TOLERANCE_PCT`, default 2; di mobile tertanam 2) |
| Rekonsiliasi SPB↔Checker (krani) | janjang di QR vs Checker | harus sama | Server menolak 409 jika beda. Jika cocok, timbangan langsung **Approved** |
| Masa berlaku SPB | sejak QR diterbitkan server | 48 jam (`QR_EXPIRY_MS`) | Dinilai pada waktu timbang (`weighed_at`) |
| Umur timbang offline | `weighed_at` vs waktu sinkron | ≤ 7 hari (`OFFLINE_WEIGHING_MAX_AGE_MS`) | Lebih tua → ditolak, masuk tinjauan Akun |
| Pemupukan | `jumlah material × isi kemasan / pokok` dan `/ ha` | Konsisten dengan dosis yang dicatat dan rekomendasi kebun | Tidak divalidasi silang |
| Kematangan blok/lahan | tahun tanam | Panen hanya di TM | Label TBM/TM/TUA tampil. Panen di TBM **tidak** diblokir |

---

## 5. Hasil yang Diharapkan / Kriteria Lolos MVP (per 25 September 2026)

Legenda: ✅ = ada di source saat ini (lolos lapangan **belum** dibuktikan) · ⚠️ = ada, dengan catatan · ❌ = tidak tersedia di mobile · ⏳ = belum dijalankan.

| Kriteria | Status source | Skenario | Verifikasi lapangan |
|---|---|---|---|
| Rantai `SCENARIO-REAL` (panen→checker→krani) koheren | ✅ Seed | A | Perlu |
| Alur DRAFT→SUBMITTED→APPROVED; Minta revisi → `REVISION_REQUESTED`; buka kembali → DRAFT; form terkunci di luar DRAFT | ✅ | C.1, E | Perlu |
| Tombol aksi mengikuti status + izin (`utils/operational-policy.ts`); Setujui/Minta revisi hanya online | ✅ | C.1–C.2 | Perlu |
| Alasan revisi, peminta, dan waktu ditampilkan | ✅ | C.1, E | Perlu |
| Panel **Riwayat dokumen** (online-only) | ✅ | C.1, E | Perlu |
| Aksi basi → 409 + pesan muat ulang | ✅ | C.2 | Perlu (2 perangkat) |
| Rekonsiliasi checker↔panen memblokir selisih > 2% (mobile + backend 400) | ✅ | C.4 | Perlu |
| SPB diterbitkan server, 48 jam, satu truk `LANGSUNG`; 409 + pesan penjelas untuk multi-truk/campuran/sudah ditimbang | ✅ | A, C.3, C.5 | Perlu |
| Krani: cocokkan truk/sopir/tujuan, tolak timbang ganda (409), brondol per truk (kg) | ✅ | D, G6 | Perlu |
| Peringatan berat vs estimasi | ⚠️ Hanya > 20%, tidak memblokir; ambang ±5% manual | D | Perlu |
| Estimasi tonase BJR | ⚠️ Di form Panen, Checker, dan Timbangan; tidak di layar detail | A, B, C.3, D | Perlu |
| BKM Rawat: detail, material/dosis, submit, approve, revisi, offline | ✅ Source | E, G3 | Perlu |
| Akses BKM Rawat untuk Mandor di mobile | ✅ Aksi Cepat Beranda (belum di-commit). Persetujuan oleh orang lain (admin atau manajer1 lewat web) | E | Perlu |
| Maker-checker Checker & Rawat: pembuat tidak dapat menyetujui (tombol disembunyikan, server 403) | ✅ Source (belum di-commit) | C.3, E | Perlu |
| Cascade Rawat kebun→blok→lahan; filter Lahan/TPH per blok | ✅ | B, E | Perlu |
| Antrean offline per pengguna, sinkron otomatis/manual, daftar tinjauan (Periksa/Coba lagi/Buang) | ✅ | G1–G8 | ⏳ |
| Replay tanpa duplikat (`client_request_id`, kunci SPB) | ✅ | G7 | ⏳ |
| Timbang offline (Checker ter-cache / belum ter-cache, `weighed_at`, batas 7 hari) | ✅ | G4–G6, G9 | ⏳ |
| Daftar Timbangan "hari ini" menampilkan timbangan tersimpan (perbaikan tanggal WIB, belum di-commit) | ✅ | D, G4 | Perlu |
| Ringkasan Beranda Krani "Timbangan Hari Ini" (perbaikan tanggal WIB, belum di-commit) | ✅ | D | Perlu |
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
- **Kenop lingkungan backend** (`src/config/config.ts`): `QR_EXPIRY_MS` (default 48 jam), `QR_CLOCK_SKEW_MS` (5 menit), `OFFLINE_WEIGHING_MAX_AGE_MS` (7 hari), `DISCREPANCY_TOLERANCE_PCT` (2). Pemeriksaan kedaluwarsa QR di ponsel (48 jam) dan toleransi rekonsiliasi di form Checker (2%) tertanam di kode mobile, sehingga tidak ikut berubah bila env server diubah.
- **Temuan yang perlu ditindaklanjuti sebelum pilot:**
  1. Kolom desimal Rawat menolak koma.
  2. Tanggal default Rawat berbasis UTC.
  3. Panen di lahan TBM tidak diblokir.
  4. Model satu Checker per TPH versus pola muat truk di lapangan (C.5).
  5. Rentang acuan brondolan belum disepakati.
  6. Penyetuju Checker: saat ini sesama Mandor (atau manajer/admin). Audit Checker (§10b) menyarankan Asisten Afdeling sebagai penyetuju; ini keputusan produk.

  Sudah diperbaiki 25 September 2026 (belum di-commit): jalur Mandor ke BKM Rawat (Aksi Cepat), tanggal di ringkasan Beranda Krani, teks alasan Akun untuk timbangan yang ditolak, dan maker-checker pada Checker.
