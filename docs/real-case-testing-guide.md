# Sawitin Mobile — Panduan Uji Kasus Nyata (Real-Case E2E)

> **Disusun oleh:** Konsultan Kelapa Sawit (medium estate, 25–500 ha, Indonesia)
> **Tujuan:** Menguji aplikasi mobile Sawitin dengan skenario operasional **nyata di lapangan** — bukan sekadar "happy path" — sekaligus memvalidasi bahwa angka yang muncul **masuk akal secara agronomi** (bukan cuma berhasil tersimpan).

---

## 1. Profil Kebun Uji (dari seed)

| Parameter | Nilai Seed | Benchmark Industri |
|---|---|---|
| Jenis usaha | Enterprise (koperasi/perusahaan) | — |
| Kepadatan tanam | **140 pokok/ha** (Blok A1, A2) | 136–148 pokok/ha (segitiga 9m) |
| Umur sawit | Blok A1/A2: tanam 2015 (produktif), Blok B1: tanam 2018 | Puncak produksi 7–18 tahun |
| BJR (Berat Janjang Rata-rata) | **15 kg/janjang** (`org.settings.bjr`) | 10–20 kg tergantung umur/klon |
| Rotasi panen (HI) | Skenario asumsi 10–14 hari | HI 10–14 hari |
| Norma pemanen | 70–100 janjang/hari/pemanen ≈ 1.0–1.5 ton | 1.0–1.5 ton TBS/pemanen/hari |

### Data Master yang Tersedia
| Blok | Lahan | TPH | PIC |
|---|---|---|---|
| Blok A1 (5 ha, 700 pokok) | Lahan Blok A | TPH 01, TPH 02 | `mandor1` |
| Blok A2 (5.5 ha, 770 pokok) | Lahan Blok B | TPH 03 | `mandor2` |
| Blok B1 (15 ha, 2000 pokok) | Lahan Blok C | TPH 04 | `asisten1` |

### Data Skenario Real (`SCENARIO-REAL`, dibuat otomatis oleh seeder)
Sebuah **rantai panen lengkap yang koheren** sudah disiapkan agar Anda bisa langsung menguji tanpa input manual:

| Dokumen | Tanggal | Isi | Status |
|---|---|---|---|
| BKM Panen | H-2 | 4 pemanen × 2 TPH = **319 janjang** | `APPROVED` |
| BKM Checker 1 | H-1 | Truk B 9401 AB = **157 jjg** (TPH 01) | `APPROVED` |
| BKM Checker 2 | H-1 | Truk B 9402 CD = **162 jjg** (TPH 02) | `APPROVED` |
| Krani Timbang | H-1 | Truk 1 → netto **2.400 kg** (est. 157×15 = 2.355 kg) | `APPROVED` |

**Poin validasi:** jumlah janjang checker **persis sama** dengan panen per TPH (selisih 0.0%) — inilah yang membuat rekonsiliasi lolos. Berat krani 2.400 kg ≈ estimasi BJR 2.355 kg (selisih wajar ~2%).

---

## 2. Akun Uji & Prasyarat

| Peran | Username | Password | Peran dalam uji |
|---|---|---|---|
| Mandor Panen | `mandor1` | `password123` | Input panen, checker, rawat, absensi |
| Asisten Afdeling | `asisten1` | `password123` | Approve/reject BKM |
| Krani Timbang | `krani1` | `password123` | Scan QR, timbang |
| Pemanen | `pemanen1` | `password123` | Absensi |
| Admin | `admin` | `admin` | Fallback / cek data |

**Prasyarat:**
```bash
# Terminal 1
cd ../sawitin/sawitin-backend && yarn dev:server
# Terminal 2
cd ../sawitin/sawitin-backend && yarn dev:worker
# Terminal 3
cd saweed-rnative/sawitin && npm run ios   # atau android
```

**Sebelum mulai (sekali saja):**
```bash
cd ../sawitin/sawitin-backend
yarn prisma db seed
redis-cli KEYS "permissions:*" | xargs redis-cli DEL   # reset cache permission
```

---

## 3. Skenario Uji (Urutan seperti hari kerja nyata)

### Skenario A — Validasi Data Rantai Real (Tanpa Input)

*Buktikan bahwa data seed koheren dan tampil benar di aplikasi.*

1. Login sebagai **mandor1**. Buka tab **BKM**.
2. **Cek:** daftar menampilkan BKM Panen `SCENARIO-REAL` (H-2) dengan status `APPROVED`, total **319 janjang**.
3. Buka detail → verifikasi **4 pekerja** tercatat, 2 TPH berbeda, dan **Estimasi Tonase ≈ 4.79 t** (319 × 15 kg = 4.785 kg).
4. Buka tab **Checker** → buka checker truk **B 9401 AB**.
   - **Cek hijau:** banner *"✓ Sesuai BKM Panen (selisih 0.0%)"*.
   - Estimasi tonase truk: **157 × 15 = 2.36 t**.
5. Login sebagai **krani1** → tab timbangan / scan.
   - **Cek:** estimasi dari janjang "157 jjg × 15 kg = **2.355 kg**" vs netto aktual **2.400 kg** (selisih ~2% → wajar, karena ada brondolan).

**Hasil yang diharapkan:** Semua angka koheren; tidak ada warning rekonsiliasi.

---

### Skenario B — Input Panen Baru yang Realistis (Mandor)

*Simulasikan hari panen Blok A1. Angka harus masuk akal: 70–100 jjg/pemanen, fraksi matang ≥ 85%.*

1. Login **mandor1** → BKM → `+` → **Tambah BKM**.
2. **Step 1:** Blok = `Blok A1`, Lahan = `Lahan Blok A`, tanggal = hari ini.
3. **Step 2:** Tambah 2 pemanen:
   - `Budi Santoso` → TPH `TPH 01`, jenis `Pemanen`
   - `Siti Aminah` → TPH `TPH 02`, jenis `Pemanen`
4. **Step 3 — grading (realistis, total ≈ 150 janjang):**
   | Pekerja | Normal | Mentah | Over Ripe | Tangkai Panjang | Abnormal | Kosong |
   |---|---|---|---|---|---|---|
   | Budi | 70 | 2 | 3 | 1 | 0 | 1 = **77** |
   | Siti | 65 | 3 | 2 | 2 | 1 | 0 = **73** |
   - **Cek:** Normal = 87% dari total → **memenuhi target Fraksi 2+3 ≥ 85%** ✓
   - Brondolan: Budi 11 kg, Siti 9 kg.
5. **Step 4:** Verifikasi **Estimasi Tonase ≈ 2.25 t** (150 × 15 kg). Centang konfirmasi → **Kirim BKM**.
6. **Cek:** status berubah `SUBMITTED`.

---

### Skenario C — Persetujuan (Asisten) & Rekonsiliasi Checker

*Validasi siklus persetujuan dan kontrol kualitas muatan.*

1. Login **asisten1** → tab Approval/BKM → buka BKM `SUBMITTED` dari Skenario B → **Setujui** → status `APPROVED`.
2. Login **mandor1** → tab **Checker** → `+` → buat checker:
   - **Step 1:** tautkan **BKM Panen** yang barusan disetujui, Blok `Blok A1`, TPH `TPH 01`.
   - **Step 2:** Truk `B 1234 XY`, sopir `Ahmad Dahlan`, tujuan `PKS Sumber Makmur`. Grading **sama dengan panen TPH 01** (77 janjang: 70/2/3/1/0/1, brondol 11).
   - **Step 3:** **Cek hijau** "✓ Sesuai" → submit → **Setujui Checker** → **QR SPB muncul**.

3. **Uji negatif rekonsiliasi (penting):**
   - Buat checker baru yang menautkan panen yang sama, TPH 01, tapi grading diubah menjadi **82 janjang** (selisih ~6.5% dari 77).
   - **Cek oranye:** banner *"⚠️ Jumlah janjang tidak sesuai BKM Panen (selisih 6.5%)..."* dan tombol submit **nonaktif**.
   - Verifikasi backend menolak via API (harus `400`):
     ```bash
     curl -s -X PUT http://localhost:3000/bkmChecker/<id> \
       -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
       -d '{"status":"SUBMITTED"}'
     ```

**Arti agronomi:** ini mencegah **kehilangan TBS antar tahap** (panen → muat) dan mencegah pemanen/checker "menambah" janjang fiktif. Toleransi 2% = wajar untuk selisih hitung di lapangan.

---

### Skenario D — Jembatan Timbang (Krani) dengan Validasi Berat

*Simulasikan truk datang ke PKS. Berat harus konsisten dengan janjang.*

1. Login **krani1** → tab Scan → pindai QR SPB dari Skenario C (truk 77 janjang).
2. Masukkan timbangan realistis:
   - **Timbang isi (gross):** `6.355` kg (tare 5.200 + muatan ~1.155 kg)
   - **Timbang kosong (tare):** `5.200` kg
3. **Cek:** Netto otomatis **1.155 kg**; estimasi dari janjang menampilkan **"77 jjg × 15 kg = 1.155 kg"** — **persis sama** dengan netto. Inilah bukti data lapangan konsisten.
4. **Uji negatif:** timbang isi `5.000` < kosong `5.200` → sistem **menolak** ("Timbang isi harus lebih besar dari timbang kosong").
5. **Uji berat tidak masuk akal:** isi `8.200`, kosong `5.200` → netto `3.000` kg vs estimasi `1.155` kg (selisih 160%). Sistem **tidak menghalangi** (berat dari PKS adalah otoritas), tapi Anda **wajib mempertanyakan** selisih ini secara agronomi — kemungkinan kesalahan input atau muatan lebih.

---

### Skenario E — BKM Rawat (Pemeliharaan) — Kasus Nyata Pemupukan

*Sesuai benchmark, pemupukan adalah pendorong hasil terbesar kedua setelah panen.*

1. Login **mandor1** → tab **Rawat** → `+`.
2. **Kelompok Lahan** = `Kelompok Tani Maju` → **Blok** = `Blok A1` → **Lahan (Opsional)** = `Lahan Blok A`.
3. Nama Pengawas = `Mandor Anto`, tanggal = hari ini → **Buat BKM Rawat**.
4. **Cek:** daftar Rawat menampilkan `Kelompok: Kelompok Tani Maju`, `Blok: Blok A1`, `Lahan: Lahan Blok A`.

> **Catatan konsultan:** Modul Rawat saat ini masih **header-only** (belum input dosis pupuk per pokok, jumlah pokok diaplikasi, dsb). Untuk MVP ini cukup validasi cascadenya; detail pemupukan (kg/pokok, jenis pupuk N-P-K-Mg-B) adalah penyempurnaan berikutnya.

---

### Skenario F — Absensi Lapangan (Pemanen) + Geofence

1. Login **pemanen1** → tab **Absensi**.
2. Pilih **Blok A1** → **CLOCK IN** → badge **"Sesuai"** (simulasi dalam 100m).
3. Pilih **Blok A2** → **CLOCK IN** → muncul **"Peringatan Geofencing"** (simulasi 160m di luar) → tulis alasan → **Kirim Absen** → badge **"Luar Blok"**.

> ⚠️ Geofence masih **simulasi** (koordinat blok belum punya polygon). Untuk MVP, cukup validasi bahwa alur warning + alasan tersimpan.

---

### Skenario G — Offline-First (Pemanen di Kebun Tanpa Sinyal)

1. Login **mandor1**, buka **Panen** (data ter-cache).
2. Aktifkan **Mode Pesawat**.
3. Buat BKM Panen baru (boleh data kecil, misal 1 pemanen 10 janjang) → submit → **Cek:** muncul *"Antrian Offline — data tersimpan dan akan dikirim saat online"*.
4. Nonaktifkan Mode Pesawat → tunggu sinkronisasi → **Cek:** dokumen muncul sebagai `SUBMITTED` di backend.

---

## 4. Matriks Validasi Agronomi (acuan cepat)

Gunakan tabel ini sebagai *checklist* saat menguji — nilai yang tampil harus masuk rentang ini:

| Metrik | Rumus / Standar | Nilai Wajar |
|---|---|---|
| Estimasi tonase | `janjang × BJR / 1000` | Akurat ±5% vs netto PKS |
| Produktivitas pemanen | `janjang/hari` | 70–100 (≈1.0–1.5 ton) |
| Komposisi matang (Fraksi 2+3) | `janjang_normal / total` | **≥ 85%** |
| Buah mentah | `buah_mentah / total` | ≤ 5% (lebih → ditolak PKS) |
| Brondolan | `kg brondol / (janjang × BJR)` | 10–15% berat janjang |
| Rekonsiliasi panen↔checker | selisih janjang per TPH | ≤ 2% (auto-lolos) |
| Berat vs estimasi (krani) | `netto vs janjang×BJR` | ±5% normal |

---

## 5. Hasil yang Diharapkan / Kriteria Lolos MVP

| Kriteria | Status MVP |
|---|---|
| Rantai `SCENARIO-REAL` (panen→checker→krani) tampil koheren | ✅ Perlu diverifikasi manual |
| Rekonsiliasi checker↔panen memblokir selisih > 2% (mobile + backend 400) | ✅ Backend teruji API |
| Estimasi tonase BJR muncul di Panen, Checker, dan Timbangan | ✅ Terpasang |
| Cascade Rawat kelompok→blok→lahan benar | ✅ Terpasang |
| Lahan/TPH filter per blok benar | ✅ Terpasang |
| Geofence absensi (simulasi) berjalan | ✅ Terpasang |
| Offline queue → sync | ✅ Terpasang |

---

## 6. Data yang Perlu Disiapkan Ulang / Catatan

- **Seeder idempotent** — menjalankan `yarn prisma db seed` berulang kali aman; skenario `SCENARIO-REAL` hanya dibuat sekali.
- **Untuk reset bersih** (jika data uji menumpuk):
  ```bash
  cd ../sawitin/sawitin-backend
  npx prisma migrate reset --force   # hapus & buat ulang skema + seed
  redis-cli FLUSHALL
  ```
- **BJR bisa diubah** per organisasi di kolom `organization.settings` (JSON `{ "bjr": 15 }`), misalnya jika ingin menguji kebun dengan janjang lebih kecil (10 kg) atau lebih besar (20 kg).
