# Panduan Uji Aplikasi Sawitin (Mobile)

**Untuk siapa:** penguji, mandor, asisten, krani, admin kebun, atau siapa saja yang ingin memastikan aplikasi bekerja benar. **Tidak perlu paham teknis.**

**Cara memakai panduan ini:**

1. Baca **Bagian 1–3** sekali saja (istilah, persiapan, gambaran satu hari kerja).
2. Kerjakan **Tes 1 sampai Tes 17** berurutan. Urutannya mengikuti hari kerja nyata di kebun.
3. Di setiap tes ada kotak **Hasil yang benar**. Centang `[x]` bila sesuai. Bila berbeda, tulis di **Lembar Temuan** (Bagian 5).
4. Tulisan **tebal** = nama tombol atau menu persis seperti di aplikasi. Tulisan _miring dalam tanda kutip_ = pesan yang muncul di layar.

> Jangan ragu mencatat hal kecil, misalnya tulisan terpotong, tombol sulit ditekan, atau angka yang terasa aneh. Catatan kecil sering menemukan masalah besar.

---

## Bagian 1. Kenali Istilahnya Dulu

| Istilah                     | Artinya dalam bahasa sehari-hari                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **BKM Panen**               | Catatan harian hasil panen: siapa memanen, di TPH mana, berapa janjang.                                            |
| **TPH**                     | Tempat Pengumpulan Hasil, titik di pinggir jalan kebun tempat buah dikumpulkan sebelum diangkut truk.              |
| **Janjang (jjg)**           | Tandan buah sawit. Dihitung per buah tandan.                                                                       |
| **Brondol / brondolan**     | Butir buah yang lepas dari tandan, ditimbang dalam kg.                                                             |
| **Grading**                 | Pemilahan mutu janjang: Normal, Buah Mentah, Over Ripe, Tangkai Panjang, Buah Abnormal, Janjang Kosong.            |
| **SPB**                     | Surat Pengantar Buah. **Satu SPB = satu truk.** Nomornya diambil dari buku SPB kertas.                             |
| **Muatan Langsung**         | Buah yang dipanen **hari ini** dan langsung naik truk.                                                             |
| **Restan**                  | Buah yang sudah dipanen tapi **belum terangkut** hari itu, tertinggal di TPH.                                      |
| **Muatan Titip**            | Restan dari hari sebelumnya yang diangkut hari ini.                                                                |
| **Tiket PKS**               | Struk timbangan dari pabrik (PKS). Berat bersihnya (netto) dipakai sebagai berat resmi truk.                       |
| **Tutup Harian**            | "Tutup buku" hari itu oleh Mandor: menghitung restan sore hari dan mengajukan seluruh panen + truk hari itu.       |
| **BJR**                     | Berat Janjang Rata-rata, misalnya 15 kg per janjang. Dipakai untuk memperkirakan berat (janjang × BJR).            |
| **BKM Rawat**               | Catatan pekerjaan perawatan: pemupukan, penyemprotan, dan sebagainya.                                              |
| **Observasi**               | Catatan kondisi kebun: hama, penyakit, curah hujan, sensus BJR, dan lainnya.                                       |
| **Offline / Online**        | Offline = tidak ada sinyal internet. Online = ada sinyal.                                                          |
| **Sinkron / sinkronisasi**  | Aplikasi mengirim data yang tersimpan di HP ke server begitu ada sinyal.                                           |
| **TM / TBM / TUA**          | Status umur tanaman. **TM** = Tanaman Menghasilkan (boleh dipanen). **TBM** = Belum Menghasilkan. **TUA** = tua.   |

### Arti status dokumen

| Status di layar | Artinya                                                                           |
| --------------- | --------------------------------------------------------------------------------- |
| **Draft**       | Masih disimpan, belum dikirim. Masih bisa diubah.                                 |
| **Diajukan**   | Sudah dikirim, menunggu persetujuan atasan.                                       |
| **Perlu Revisi** | Atasan meminta perbaikan. Harus **dibuka kembali** dulu sebelum bisa diubah.      |
| **Disetujui**    | Sudah disetujui. Tidak bisa diubah lagi.                                          |

---

## Bagian 2. Persiapan

### 2.1 Yang perlu disiapkan

- [ ] **Minimal 2 HP Android**: HP A untuk Mandor/Asisten, HP B untuk Krani. Satu HP tambahan akan sangat membantu.
- [ ] Aplikasi **Sawitin** versi UAT sudah terpasang di setiap HP. Minta link pemasangan ke tim teknis. Saat memasang, izinkan "pasang aplikasi dari sumber tidak dikenal" bila diminta.
- [ ] Internet aktif saat **pertama kali masuk**. Aplikasi menyimpan data kebun (blok, TPH, pekerja) ke HP saat itu, supaya nanti bisa dipakai tanpa sinyal.
- [ ] **Beberapa lembar SPB kertas** bernomor seri dengan barcode (atau cetakan barcode berisi nomor seperti `0012345`). Dipakai di Tes 11.
- [ ] Pulpen dan **Lembar Temuan** (Bagian 5), atau salinan digitalnya.
- [ ] Tim teknis sudah memastikan: server uji menyala, data contoh sudah dimuat, dan pengaturan kebun **BJR = 15 kg**, **jembatan timbang = tidak aktif**.

### 2.2 Akun uji

Semua akun memakai kata sandi `bAngkit@100x`, kecuali admin.

| Peran        | Username   | Kata sandi          | Tugas dalam uji                                                 |
| ------------ | ---------- | ------------------- | --------------------------------------------------------------- |
| Mandor 1     | `mandor1`  | `bAngkit@100x`      | Catat panen, buat SPB truk, BKM Rawat, observasi, Tutup Harian  |
| Mandor 2     | `mandor2`  | `bAngkit@100x`      | Mandor kedua (uji dua HP sekaligus)                             |
| Asisten      | `asisten1` | `bAngkit@100x`      | Minta revisi, setujui / tolak Tutup Harian                      |
| Krani Timbang | `krani1`  | `bAngkit@100x`      | Input tiket PKS                                                 |
| Pemanen      | `pemanen1` | `bAngkit@100x`      | Hanya melihat Beranda dan Akun                                  |
| Admin        | `admin`    | `bAngkit@100xAdmin` | Menyetujui BKM Rawat, cek stok barang                           |

### 2.3 Data kebun contoh

| Blok    | Lahan        | TPH            | Status tanaman | Catatan                           |
| ------- | ------------ | -------------- | -------------- | --------------------------------- |
| Blok A1 | Lahan Blok A | TPH 01, TPH 02 | TM, 11 tahun   | Dipakai untuk panen normal        |
| Blok A2 | Lahan Blok B | TPH 03         | **TBM**, 1 th  | Tanaman muda, **tidak boleh dipanen** |
| Blok B1 | Lahan Blok C | TPH 04         | TUA            |                                   |

- **Pekerja:** Budi Santoso, Siti Aminah, Ahmad Dahlan, Dewi Sartika, Joko Widodo
- **Kendaraan:** B 1234 AB, B 5678 CD, B 9012 EF, B 3456 GH
- **Sopir:** Supir Satu, Supir Dua, Supir Tiga
- **Barang:** Pupuk Urea (karung 50 kg), Herbisida A (liter), Solar (liter)

### 2.4 Cara membuat HP "tanpa sinyal"

Nyalakan **Mode Pesawat**, lalu pastikan **Wi-Fi juga mati**. Di menu **Akun** harus tertulis **Offline**.

---

## Bagian 3. Gambaran Satu Hari Kerja

Semua tes mengikuti alur ini:

```text
PAGI        Pemanen memanen buah, dikumpulkan di TPH
   │
   ▼
SIANG       Mandor mencatat BKM Panen di aplikasi             (Tes 2)
   │
   ▼
            Truk dimuat. Mandor membuat SPB truk               (Tes 4)
   │
   ▼
            Truk tiba di pabrik (PKS). Krani memasukkan
            tiket timbang PKS berdasarkan nomor SPB            (Tes 5)
   │
   ▼
SORE        Mandor menghitung buah yang tertinggal (restan)
            dan mengajukan Tutup Harian                         (Tes 8)
   │
   ▼
BESOK       Asisten menyetujui Tutup Harian, paling lambat
  (≤12.00)  pukul 12.00. Semua panen & SPB hari itu
            otomatis menjadi Disetujui                          (Tes 9)
   │
   ▼
            Restan kemarin diangkut truk hari ini (Titip)      (Tes 10)
```

> **Penting:** Panen dan SPB **tidak disetujui satu per satu**. Keduanya disetujui sekaligus lewat **Tutup Harian**.

---

## Bagian 4. Daftar Tes

### Tes 1 — Masuk, Menu, dan Keluar

**Siapa:** semua akun · **HP:** HP A

**Langkah:**

1. Buka aplikasi. Isi **Email atau Username** `mandor1` dan **Kata sandi** yang salah, misalnya `salah123`, lalu tekan **Masuk**.
2. Ulangi dengan kata sandi yang benar.
3. Lihat menu di bagian bawah layar.
4. Buka **Akun**, tekan **Keluar**.
5. Ulangi langkah 2–4 untuk setiap akun di tabel 2.2.

**Hasil yang benar:**

- [ ] Kata sandi salah → muncul pesan gagal masuk, tidak masuk ke aplikasi.
- [ ] Kata sandi benar → masuk ke **Beranda**.
- [ ] Menu bawah sesuai peran:

| Akun        | Menu bawah yang harus terlihat           |
| ----------- | ---------------------------------------- |
| `mandor1`   | Beranda · BKM Panen · Checker · Akun     |
| `asisten1`  | Beranda · BKM Panen · Akun               |
| `krani1`    | Beranda · Timbangan · Akun               |
| `admin`     | Beranda · BKM Panen · Menu · Akun        |
| `pemanen1`  | Beranda · Akun                           |

- [ ] Tombol pintasan di Beranda (**Aksi Cepat**) sesuai peran:
  - Mandor: **Buat BKM Panen**, **Input Checker**, **Tutup Harian**, **Buat BKM Rawat**, **BKM Rawat**, **Catat Observasi**, **Riwayat Observasi**, **Pemakaian Kendaraan**
  - Asisten: **Persetujuan Tutup Harian**, **Observasi Lapangan**, **Pemakaian Kendaraan**, **Stok Opname**
- [ ] Setelah **Keluar**, kembali ke layar masuk.

**Tambahan — Ubah kata sandi** (pakai `mandor2` saja, supaya akun lain tidak terganggu):

1. **Akun** → **Ubah kata sandi**. Isi **Kata sandi lama**, **Kata sandi baru**, dan **Ulangi kata sandi baru**.
2. Coba juga dalam keadaan **Offline**.

- [ ] Online → muncul _"Kata sandi diubah"_, lalu diminta masuk ulang dengan kata sandi baru.
- [ ] Offline → muncul _"Tidak ada sinyal"_ — _"Hubungkan internet untuk mengubah kata sandi."_
- [ ] **Kembalikan kata sandi** ke `bAngkit@100x` setelah tes.

---

### Tes 2 — Mencatat Panen (BKM Panen)

**Siapa:** `mandor1` · **HP:** HP A · **Online**

**Cerita:** Hari ini Budi dan Siti memanen di Blok A1.

**Langkah:**

1. Beranda → **Buat BKM Panen** (atau menu **BKM Panen** → tombol `+`).
2. **Langkah 1 – Detail Dokumen:** **Blok** `Blok A1`, **Lahan** `Lahan Blok A`, **Tanggal Laporan** hari ini → **Lanjutkan ke Pekerja & TPH**.
3. **Langkah 2 – Pekerja & TPH:** tekan **Tambah Pekerja & TPH** dua kali:
   - `Budi Santoso` → **TPH** `TPH 01` → **Jenis Pekerjaan** `Pemanen`
   - `Siti Aminah` → **TPH** `TPH 02` → **Jenis Pekerjaan** `Pemanen`

   Tekan **Lanjutkan ke Grading**.
4. **Langkah 3 – Grading:** isi angka berikut:

| Pekerja | Normal | Buah Mentah | Over Ripe | Tangkai Panjang | Buah Abnormal | Janjang Kosong | Brondol (kg) |
| ------- | ------ | ----------- | --------- | --------------- | ------------- | -------------- | ------------ |
| Budi    | 70     | 2           | 3         | 1               | 0             | 1              | 11           |
| Siti    | 65     | 3           | 2         | 2               | 1             | 0              | 9            |

   Tekan **Review & Konfirmasi**.
5. **Langkah 4 – Review:** centang _"Saya mengkonfirmasi data yang diinput sudah benar"_ → **Submit BKM**.

**Hasil yang benar:**

- [ ] Di langkah 2, pilihan TPH hanya **TPH 01** dan **TPH 02** (TPH milik Blok A1 saja).
- [ ] Pilihan **Jenis Pekerjaan**: Pemanen, Pembrondol, Pemuat, Driver, Lainnya.
- [ ] Total janjang Budi **77**, Siti **73**.
- [ ] Di layar Review: **Total Janjang 150**, **Brondol 20 kg**, **Estimasi Tonase 2.25 t** (150 × 15 kg).
- [ ] Setelah dikirim muncul _"Tersimpan"_ — _"Data sedang dikirim ke server. Jika ditolak, periksa di menu Akun."_
- [ ] Dokumen muncul di daftar dengan status **Diajukan**.
- [ ] Buka dokumennya. Bagian **Riwayat** mencatat dibuat dan dikirim oleh `MDR001`.

**Cek kewajaran angka (untuk orang kebun):** Normal 135 dari 150 = 90% (bagus, target ≥ 85%). Buah mentah 5 dari 150 = 3,3% (bagus, maksimal 5%).

**Tes tambahan — panen di lahan muda (TBM):**

1. Buat BKM Panen baru: **Blok** `Blok A2`, **Lahan** `Lahan Blok B`. Setelah dicek, **batalkan** formulirnya. Jangan tinggalkan sebagai draft, karena draft akan menghalangi Tutup Harian di Tes 8.

- [ ] Muncul peringatan TBM dan kolom **Alasan Panen di Lahan TBM** wajib diisi.
- [ ] Selama alasan masih kosong, tombol **Lanjutkan ke Pekerja & TPH** tidak bisa ditekan.

---

### Tes 3 — Peringatan Saat Keluar dari Formulir

**Siapa:** `mandor1` · **HP:** HP A

1. Buka **Buat BKM Panen**, pilih **Blok** saja, lalu tekan tombol kembali (←) di HP.
2. Ulangi di **Input Checker** (SPB Truk Baru).
3. Buka formulir lagi, **jangan isi apa pun**, lalu tekan kembali.

**Hasil yang benar:**

- [ ] Muncul _"Batal Mengisi Form?"_ — _"Perubahan yang belum disimpan akan hilang."_
- [ ] **Lanjutkan** = tetap di formulir. **Keluar** = kembali ke daftar tanpa menyimpan.
- [ ] Formulir kosong langsung tertutup tanpa peringatan.

---

### Tes 4 — Membuat SPB untuk Satu Truk

**Siapa:** `mandor1` · **HP:** HP A · **Online**

**Cerita:** Truk B 1234 AB mengangkut buah dari TPH 01 dan TPH 02 (dari panen Tes 2) ke pabrik.

**Langkah:**

1. Beranda → **Input Checker** (atau menu **Checker** → `+`).
2. **Langkah 1:** **Nomor SPB** `0012345`, **Kendaraan** `B 1234 AB`, **Sopir** `Supir Satu`, **Tujuan Kirim** `PKS Sumber Makmur`, **Tanggal Berangkat** hari ini → **Lanjutkan ke Muatan TPH**.
3. **Langkah 2:** di bagian **Tambah Muatan dari TPH**, isi muatan pertama:
   - **Blok** `Blok A1` → **TPH** `TPH 01` → **Sumber Muatan** `Langsung (Panen hari ini)` → **BKM Panen hari berangkat** pilih panen dari Tes 2 → tekan **Tambah Muatan**.
   - Kartu muatan TPH 01 muncul. Isi **Normal** `77` (kolom mutu lain biarkan 0) dan **Brondol (kg)** `11`.

   Ulangi untuk muatan kedua: `TPH 02`, **Normal** `73`, **Brondol (kg)** `9`. Tekan **Review & Konfirmasi**.
4. **Langkah 3:** periksa **Ringkasan SPB**, centang _"Saya mengkonfirmasi data SPB sudah sesuai surat jalan kertas"_, lalu tekan **Kirim SPB**.

**Hasil yang benar:**

- [ ] Pilihan **BKM Panen hari berangkat** hanya berisi panen tanggal itu di TPH yang dipilih. Bila tidak ada, tertulis _"Tidak ada Panen tanggal … di TPH ini"_.
- [ ] **Total Janjang** di kartu muatan dihitung otomatis dari kolom mutu.
- [ ] Setelah dikirim muncul _"SPB Dikirim ke Antrian"_ — _"Data tersimpan di perangkat dan dikirim otomatis saat ada sinyal. Jika ada konflik, periksa di menu Akun."_ Pesan ini memang muncul juga saat online.
- [ ] **Muatan per TPH** menampilkan 2 baris, **Total Muatan 150 janjang**, brondol 20 kg.
- [ ] SPB berstatus **Diajukan**. Artinya truk sudah berangkat.
- [ ] **Tidak ada** tombol **Setujui** di SPB (disetujui nanti lewat Tutup Harian).

---

### Tes 5 — Krani Memasukkan Tiket Timbang Pabrik

**Siapa:** `krani1` · **HP:** HP B · **Online**

**Cerita:** Truk dari Tes 4 sudah ditimbang di pabrik. Krani memegang tiket PKS dengan netto 2.300 kg.

**Langkah:**

1. Menu **Timbangan** → **Input tiket PKS (nomor SPB)**.
2. Isi **Nomor SPB** `0012345`, **Nomor tiket** `T-1001`, **Waktu di PKS** hari ini jam `14:30` (format `2026-11-22 14:30`), **Netto pabrik (kg)** `2300`.
3. Ambil **Foto tiket PKS** (boleh sampai 5 foto).
4. Tekan **Simpan tiket**.
5. Buka catatan timbangan yang baru muncul → **Lihat jejak panen**.

**Hasil yang benar:**

- [ ] **Waktu di PKS** otomatis terisi jam sekarang. Ubah sesuai jam di tiket.
- [ ] Muncul _"Tiket tersimpan"_ — _"Tiket PKS tersimpan dan menjadi berat acuan SPB ini."_
- [ ] Bila **Bruto** dan **Tara** diisi tapi Bruto − Tara ≠ Netto, muncul _"Tiket belum valid"_.
- [ ] Format waktu yang salah memunculkan _"Waktu tidak valid"_.
- [ ] **Jejak panen** menampilkan TPH 01 dan TPH 02 dari Blok A1, masing-masing dengan jumlah janjangnya.

**Cek kewajaran angka:** perkiraan = 150 janjang × 15 kg + 20 kg brondol = 2.270 kg. Netto 2.300 kg hanya beda sekitar 1%, **wajar**. Beda lebih dari 5% perlu dicatat dan ditanyakan.

---

### Tes 6 — Satu TPH Diangkut Dua Truk

**Siapa:** `mandor1` (HP A) dan `krani1` (HP B)

**Cerita:** TPH 01 menghasilkan 100 janjang, terlalu banyak untuk satu truk.

1. Buat BKM Panen baru: Blok A1, `Joko Widodo` di **TPH 01**, Normal `100`, Brondol `8` → **Submit BKM**.
2. Buat SPB `0012346`, truk `B 5678 CD`: Langsung dari TPH 01, **60** janjang, brondol 5.
3. Buat SPB `0012347`, truk `B 9012 EF`: Langsung dari TPH 01, **40** janjang, brondol 3.
4. Krani memasukkan tiket untuk kedua SPB (misalnya netto 930 kg dan 610 kg).

**Hasil yang benar:**

- [ ] Kedua SPB berhasil disimpan, tanpa pesan "selisih dengan BKM Panen".
- [ ] Jejak panen tiap SPB menampilkan panen TPH 01 sebanyak **100 janjang** (bukan 200), dengan muatan 60 dan 40.

---

### Tes 7 — Asisten Meminta Revisi

**Siapa:** `asisten1` (HP A) lalu `mandor1` (HP B) · **Online**

1. **asisten1** → menu **BKM Panen** → buka panen dari **Tes 2** (status Diajukan).
2. Isi **Alasan revisi**: `Brondol Siti terlalu rendah, cek ulang di TPH 02` → **Minta revisi** → **Lanjutkan**.
3. **mandor1** → buka panen yang sama.
4. Tekan **Buka kembali sebagai draft** → **Edit** → di langkah Grading ubah brondol Siti menjadi `10` → kirim ulang (**Submit BKM**).

**Hasil yang benar:**

- [ ] Di HP Asisten, status berubah menjadi **Perlu Revisi**.
- [ ] Di HP Mandor terlihat alasan revisi, _"Diminta oleh: AST001"_, dan waktunya.
- [ ] Sebelum dibuka kembali, **tidak ada tombol Edit**.
- [ ] Setelah dibuka kembali, status **Draft** dan tombol **Edit** muncul.
- [ ] Setelah dikirim ulang, status **Diajukan**. **Riwayat** mencatat semua langkah: dibuat, dikirim, diminta revisi, dibuka kembali, dikirim lagi.

**Tes tambahan — dua HP bersamaan:**

1. Buat panen baru dan kirim (Diajukan).
2. Buka dokumen itu di HP Asisten, **jangan tekan apa pun**.
3. Di HP Mandor tekan **Buka kembali sebagai draft**.
4. Kembali ke HP Asisten, tekan **Minta revisi**.

- [ ] Muncul _"Tindakan gagal"_ — _"Dokumen telah berubah. Data terbaru dimuat; periksa sebelum mencoba kembali."_ Layar Asisten lalu menampilkan status terbaru (Draft).

**Tes tambahan — Asisten tanpa sinyal:** buka dokumen berstatus Diajukan dalam keadaan Offline.

- [ ] Tombol **Minta revisi** tidak tampil. Riwayat menampilkan pesan bahwa riwayat hanya tersedia saat online.

---

### Tes 8 — Tutup Harian oleh Mandor

**Siapa:** `mandor1` · **HP:** HP A · **Online** · Lakukan **sore hari** setelah Tes 2–7.

**Cerita:** Sore hari, Mandor menghitung buah yang masih tertinggal di TPH.

**Langkah:**

1. Siapkan restan: buat BKM Panen baru di **TPH 02** sebanyak **80 janjang**, lalu buat SPB yang memuat **60 janjang** saja dari TPH 02. Sisa 20 janjang = restan.
2. Beranda → **Tutup Harian** → pilih **Kelompok lahan** dan **Tanggal** hari ini.
3. Periksa pratinjau: **Keseimbangan per TPH**, **Trip**, **Brondol dan BJR per blok**, dan bagian pengecualian.
4. Di TPH 02, ubah hitungan restan dari **20** menjadi **18**.
5. Coba tekan **Ajukan tutup harian** tanpa mengisi catatan.
6. Isi catatan `2 janjang jatuh ke parit` → **Ajukan tutup harian** → konfirmasi.

**Hasil yang benar:**

- [ ] Pratinjau TPH 02 mengusulkan restan **20** janjang. (Bila di Tes 7 Anda membuat panen tambahan yang tidak diangkut truk, usulan restan ikut bertambah. Itu wajar.)
- [ ] Setelah diubah ke 18, muncul bagian **Perlu catatan** dengan kolom _"Catatan wajib"_. Tanpa catatan, tombol **Ajukan tutup harian** tidak bisa ditekan dan tertulis _"Isi catatan untuk 1 pengecualian"_.
- [ ] Saat Offline, layar Tutup Harian menampilkan _"Tutup harian butuh koneksi"_. Tutup Harian tidak bisa diajukan tanpa sinyal.
- [ ] Setelah diajukan, muncul _"Ajukan tutup harian?"_ — _"Restan yang dihitung langsung tersedia untuk truk."_

**Tes tambahan — dokumen yang menghalangi:**

1. Sebelum mengajukan, buat BKM Panen baru hari ini dan **simpan sebagai draft saja** (jangan dikirim).

- [ ] Pratinjau menampilkan bagian **Menghalangi penutupan**, dan tombol **Ajukan tutup harian** tidak bisa ditekan.
- [ ] Setelah draft itu dikirim atau dihapus, tombol bisa ditekan lagi.

---

### Tes 9 — Asisten Menyetujui atau Menolak Tutup Harian

**Siapa:** `asisten1` (HP B), `mandor1` (HP A) · **Online**

**Langkah:**

1. **mandor1** membuka tutup harian yang baru diajukan di Tes 8.
2. **asisten1** → Beranda → **Persetujuan Tutup Harian** → pilih tutup harian hari ini.
3. Coba **Tolak** dulu: isi alasan, misalnya `Hitungan restan TPH 02 perlu dicek ulang` → konfirmasi.
4. **mandor1** memperbaiki lalu mengajukan ulang (ulangi Tes 8 langkah 2–6).
5. **asisten1** → **Setujui** → konfirmasi.
6. Lihat status semua BKM Panen dan SPB hari ini.
7. **mandor1** mencoba membuat BKM Panen baru bertanggal **hari ini**.

**Hasil yang benar:**

- [ ] Mandor **tidak punya** menu persetujuan. Di layar **Tutup Harian** Mandor tertulis _"Tutup harian ini sudah diajukan dan menunggu Asisten"_.
- [ ] **Tolak** tidak bisa tanpa alasan. Setelah ditolak, muncul _"Tolak tutup harian?"_ — _"Mandor harus memperbaiki dan mengajukan ulang."_
- [ ] **Setujui** memunculkan _"Setujui tutup harian?"_ — _"Semua Panen dan trip hari itu disetujui sekaligus."_
- [ ] Setelah disetujui, **semua** BKM Panen dan SPB hari itu berstatus **Disetujui**.
- [ ] Bila disetujui setelah pukul 12.00 keesokan harinya, muncul label **Terlambat** (tetap bisa disetujui).
- [ ] Panen baru untuk hari yang sudah ditutup **ditolak**, dan muncul di **Akun** sebagai perubahan yang perlu ditinjau.

> Membuka kembali hari yang sudah ditutup hanya bisa dari **aplikasi web**, oleh Asisten atau Manajer. Itu di luar panduan mobile ini.

---

### Tes 10 — Mengangkut Restan Keesokan Hari (Muatan Titip)

**Siapa:** `mandor1` · **HP:** HP A · **Hari berikutnya**, setelah Tes 8

1. Buat SPB baru, nomor `0012349`.
2. Di langkah 2, **Sumber Muatan** pilih `Titip` → lihat daftar **Restan terbuka**.
3. Pilih restan TPH 02 → **Tambah Muatan**. Kartu muatan otomatis terisi seluruh restan di kolom **Normal**. Ubah **Normal** menjadi `12` → **Review & Konfirmasi** → **Kirim SPB**.
4. Buat SPB lain dan lihat lagi daftar **Restan terbuka**.

**Hasil yang benar:**

- [ ] **Restan terbuka** menampilkan restan TPH 02 dari panen kemarin, sesuai jumlah yang dihitung di Tutup Harian (18 janjang).
- [ ] Setelah diambil 12, sisa restan TPH 02 menjadi **6 janjang**, dengan tanggal panen **tetap kemarin**.
- [ ] Bila dua HP mencoba mengambil restan yang sama, HP kedua mendapat penolakan yang tampil di **Akun**, bukan hilang diam-diam.

---

### Tes 11 — Memindai Barcode Nomor SPB

**Siapa:** `mandor1` (HP A), `krani1` (HP B)

1. **mandor1** → **Input Checker** → langkah 1 → **Pindai barcode SPB** → arahkan kamera ke barcode di lembar SPB.
2. Tolak izin kamera (di pengaturan HP), lalu coba lagi.
3. Buat SPB baru dengan **nomor yang sudah dipakai** sebelumnya, misalnya `0012345`.
4. **krani1** → **Input tiket PKS (nomor SPB)** → **Pindai barcode SPB** pada lembar yang sama.

**Hasil yang benar:**

- [ ] Kolom **Nomor SPB** terisi otomatis dari barcode.
- [ ] Tanpa izin kamera muncul _"Izin kamera diperlukan untuk memindai barcode SPB. Nomor SPB juga bisa diketik."_ Nomor tetap bisa diketik di kolom **Nomor SPB**.
- [ ] Layar pemindai punya tombol **Nyalakan senter** dan **Ketik manual**.
- [ ] Nomor ganda **ditolak**, muncul di **Akun** untuk diperbaiki (tidak dikirim ulang terus-menerus).
- [ ] Bila yang dipindai QR SPB lama, muncul _"Itu QR SPB lama, bukan nomor SPB. Pindai barcode nomor SPB atau ketik nomornya."_

---

### Tes 12 — BKM Rawat (Pemupukan)

**Siapa:** `mandor1` (membuat), `admin` (menyetujui) · **Online**

**Cerita:** Regu pupuk menabur Urea di Lahan Blok A.

**Langkah:**

1. **mandor1** → Beranda → **Buat BKM Rawat**.
2. **Kebun** `Kelompok Tani Maju` → **Blok** `Blok A1` → **Lahan (Opsional)** `Lahan Blok A` → **Tanggal Pelaksanaan** hari ini. Periksa kolom **Pengawas** → **Simpan BKM Rawat**.
3. Di layar detail, tekan **Tambah pekerjaan** dan isi:

| Kolom                     | Isi                             |
| ------------------------- | ------------------------------- |
| Tipe pekerjaan            | `Perawat`                       |
| Kategori pekerjaan        | `Pemupukan`                     |
| Item pekerjaan            | `Tabur Pupuk`                   |
| Nama pekerja / kelompok   | `Regu Pupuk 1`                  |
| Jumlah pekerja            | `4`                             |
| Hasil pekerjaan / Satuan  | `4,5` / `ha`                    |
| Luas dirawat (ha)         | `4,5`                           |
| Jumlah pokok dirawat      | `630`                           |
| Metode                    | `Tabur di piringan`             |
| Kondisi lapangan          | `Piringan bersih, tanah lembap` |
| Pilih barang              | `Pupuk Urea`                    |
| Jumlah barang             | `19`                            |
| Dosis / Satuan dosis      | `1,5` / `kg/pokok`              |

   Tekan **Tambahkan barang**, lalu **Simpan pekerjaan**.
4. Tekan **Kirim untuk persetujuan**.
5. **admin** → **Menu** → **BKM Rawat** → buka dokumen tadi → **Setujui**.
6. **admin** → **Menu** → **Stok Barang** → lihat stok Pupuk Urea.

**Hasil yang benar:**

- [ ] **Blok** baru bisa dipilih setelah **Kebun** dipilih. **Lahan** hanya menampilkan lahan di blok itu.
- [ ] Kolom **Pengawas** otomatis terisi nama Mandor yang sedang masuk.
- [ ] Setelah disimpan muncul _"Berhasil"_ — _"Dokumen BKM Rawat berhasil dibuat."_, lalu layar pindah ke detail dengan status **Draft**.
- [ ] Angka dengan koma (`4,5`) diterima.
- [ ] Sebelum ada pekerjaan, tertulis _"Belum ada pekerjaan. Tambahkan detail sebelum mengirim dokumen."_ dan tombol kirim tidak ada.
- [ ] Setelah dikirim, status **Diajukan**. Mandor sendiri **tidak** bisa menyetujui dokumennya.
- [ ] Setelah admin menyetujui, status **Disetujui** dan stok Pupuk Urea **berkurang 19 karung**.

**Tes kesalahan isian:**

- [ ] **Luas dirawat** `0` → _"Agronomi tidak valid"_.
- [ ] **Jumlah barang** `0` → _"Barang belum lengkap"_.

**Cek kewajaran angka:** 19 karung × 50 kg = 950 kg. 950 kg ÷ 630 pokok = 1,5 kg/pokok (cocok dengan dosis). Aplikasi **tidak** memeriksa kecocokan ini, jadi penguji yang memeriksanya.

---

### Tes 13 — Observasi Lapangan

**Siapa:** `mandor1` (mencatat), `asisten1` (melihat) · **Online**

1. **mandor1** → Beranda → **Catat Observasi**.
2. **Jenis** `Sensus BJR`, **Kebun** `Kelompok Tani Maju`, **Blok** `Blok A1`, **TPH** `TPH 01`, **Jumlah sampel (janjang ditimbang)** `15`, nilai total berat `270` kg. Tambahkan 2–3 **Foto** → **Simpan observasi**.
3. Buat observasi kedua: **Jenis** `Hama`, isi jumlah pokok terdampak dan **Tingkat**, lalu simpan.
4. **mandor1** → **Riwayat Observasi**. Coba saring berdasarkan **Jenis** dan **Tingkat**.
5. **asisten1** → Beranda → **Observasi Lapangan**.

**Hasil yang benar:**

- [ ] Untuk Sensus BJR, kolom **Blok** wajib. Untuk jenis lain, Blok boleh kosong.
- [ ] Bisa menambah sampai **5 foto**.
- [ ] Data tidak lengkap memunculkan _"Data belum valid"_.
- [ ] Kedua observasi muncul di riwayat Mandor dan di daftar Asisten.

**Arti Sensus BJR:** 270 kg ÷ 15 janjang = **18 kg per janjang**. Angka ini nanti dipakai di web sebagai saran BJR Blok A1.

---

### Tes 14 — Pemakaian Kendaraan

**Siapa:** `mandor1` (mencatat), `asisten1` (menyetujui) · **Online**

1. **mandor1** → Beranda → **Pemakaian Kendaraan** → **Catat pemakaian**.
2. Pilih **Kendaraan / alat** `B 1234 AB`, **Tanggal** hari ini. Perhatikan **Meter awal**.
3. Isi **Meter akhir** sedikit lebih besar dari meter awal (misalnya +40). Isi **Barang BBM** `Solar` dan **Jumlah BBM** `20`.
4. Coba juga isi meter akhir yang sangat besar (misalnya +5.000).
5. Tekan **Simpan dan kirim**.
6. **asisten1** → **Pemakaian Kendaraan** → buka dokumen tadi. Coba **Kembalikan untuk revisi** dulu, lalu setelah Mandor mengirim ulang, **Setujui**.
7. Catat pemakaian kedua untuk kendaraan yang sama.

**Hasil yang benar:**

- [ ] **Meter awal** otomatis terisi dari meter akhir terakhir kendaraan itu.
- [ ] Kenaikan meter yang sangat besar memunculkan _"Kenaikan meter terlihat besar. Periksa kembali sebelum menyimpan."_
- [ ] Saat menyetujui, muncul _"Setujui pemakaian?"_ dengan keterangan jumlah Solar yang akan dikurangi dari stok.
- [ ] Pada pemakaian kedua, meter awal = meter akhir pemakaian pertama.

---

### Tes 15 — Stok Opname (Asisten)

**Siapa:** `asisten1` · **Online**

1. Beranda → **Stok Opname** → buka salah satu data (bila ada).

**Hasil yang benar:**

- [ ] Daftar hasil hitung fisik tampil. Bila belum ada data, tertulis _"Belum ada stok opname."_
- [ ] Saat Offline, tertulis _"Hasil hitung fisik dapat dilihat saat terhubung."_

---

### Tes 16 — Bekerja Tanpa Sinyal (Offline)

Bagian ini **paling penting** untuk kebun, karena sinyal sering hilang.

> **Kapan dijalankan:** di hari yang **belum** ditutup, misalnya hari setelah Tes 10. Hari yang Tutup Harian-nya sudah disetujui menolak panen dan SPB baru.

**Persiapan (Online):** masuk sekali sebagai `mandor1`, `krani1`, dan `admin` di HP masing-masing. Buka formulir BKM Panen sampai langkah 2 dan formulir SPB sampai langkah 1, supaya data kebun tersimpan di HP.

#### 16a. Panen tanpa sinyal

1. HP Mandor → **Mode Pesawat**. Pastikan **Akun** tertulis **Offline**.
2. Buat BKM Panen: Blok A1, `Dewi Sartika` di TPH 02, total 80 janjang, brondol 10 → **Submit BKM**.
3. Buka **Akun**.
4. Matikan Mode Pesawat. Tunggu sebentar, lalu buka **Akun** lagi.

- [ ] Saat menyimpan: _"Antrian Offline"_ — _"Data tersimpan dan akan dikirim saat online."_
- [ ] **Akun**: _"1 perubahan menunggu dikirim"_.
- [ ] Setelah online, otomatis terkirim: _"Tidak ada perubahan yang menunggu dikirim"_.
- [ ] Dokumen muncul **satu kali saja** (tidak dobel) dengan status **Diajukan**.

#### 16b. SPB tanpa sinyal, tiket PKS lebih dulu masuk

1. HP Mandor **Offline** → buat SPB `0012348` (TPH 02, 50 janjang).
2. HP Krani **Online** → masukkan tiket PKS untuk `0012348`, netto 760.
3. HP Mandor → **Online** kembali.

- [ ] Mandor melihat _"Data tersimpan di perangkat dan dikirim otomatis saat ada sinyal."_
- [ ] Saat Krani menyimpan tiket muncul _"Menunggu SPB"_ — _"SPB 0012348 belum dikirim Mandor. Tiket sudah diterima server dan dilekatkan otomatis saat SPB dikirim."_
- [ ] Daftar Timbangan Krani menampilkan _"Diterima server; dicocokkan otomatis setelah SPB-nya dikirim Mandor. Tarik layar untuk memperbarui."_
- [ ] Setelah SPB Mandor terkirim, beberapa detik kemudian tiket dan SPB tercocokkan. Tarik layar Timbangan ke bawah untuk memperbarui.

#### 16c. Tiket PKS tanpa sinyal

1. HP Krani **Offline** → masukkan tiket PKS untuk SPB yang ada.
2. Coba simpan tiket untuk SPB yang sama sekali lagi.
3. HP Krani **Online**.

- [ ] Di atas formulir tertulis _"Offline. Tiket akan dikirim saat tersambung."_
- [ ] Setelah disimpan muncul _"Tersimpan di perangkat"_ — _"Tiket dikirim otomatis saat online. Jika ditolak server, periksa di menu Akun."_
- [ ] Simpan kedua → _"Sudah tersimpan"_ — _"Tiket untuk SPB ini sudah menunggu sinkronisasi."_
- [ ] Setelah online, tiket terkirim satu kali.

#### 16d. Data yang ditolak server

1. HP Mandor **Offline** → buat SPB dengan **nomor yang sudah dipakai** (misalnya `0012345`).
2. **Online** kembali → buka **Akun**.
3. Tekan **Periksa**, lalu tutup. Tekan **Coba lagi**. Terakhir tekan **Buang** → konfirmasi.

- [ ] **Akun** menampilkan _"1 perubahan perlu ditinjau"_ beserta alasannya.
- [ ] **Periksa** menampilkan isi data di HP dan data terbaru di server.
- [ ] **Coba lagi** tanpa perbaikan tetap gagal (wajar).
- [ ] **Buang** meminta konfirmasi _"Buang perubahan ini?"_, lalu item hilang dari daftar.
- [ ] Data yang ditolak **tidak pernah hilang sendiri** tanpa ditinjau.

#### 16e. Aplikasi ditutup paksa saat mengirim

1. Buat 2–3 data saat Offline (panen, SPB, tiket).
2. Online-kan HP. Saat **Akun** menampilkan _"Sinkronisasi berlangsung…"_, **tutup paksa** aplikasi.
3. Buka lagi aplikasinya.

- [ ] Sisa data tetap terkirim.
- [ ] Setiap data hanya muncul **satu kali** di server (tidak dobel).

#### 16f. Satu HP dipakai bergantian

1. `mandor1` **Offline** → buat 1 BKM Panen → _"1 perubahan menunggu dikirim"_ → **Keluar**.
2. Muncul peringatan _"Keluar dengan data belum terkirim?"_. Tetap keluar.
3. **Online** → masuk sebagai `asisten1` di HP yang sama → buka **Akun**.
4. **Keluar** → masuk lagi sebagai `mandor1`.

- [ ] Akun Asisten: _"Tidak ada perubahan yang menunggu dikirim"_. Panen Mandor **tidak** terkirim atas nama Asisten.
- [ ] Setelah `mandor1` masuk lagi, data panen yang tertunda muncul lagi dan terkirim atas nama Mandor.

---

### Tes 17 — Akun Pemanen

**Siapa:** `pemanen1`

1. Masuk sebagai `pemanen1`. Lihat Beranda dan Akun.

**Hasil yang benar:**

- [ ] Hanya ada menu **Beranda** dan **Akun**.
- [ ] Tidak ada tombol untuk membuat, mengubah, atau menyetujui dokumen.

---

## Bagian 5. Lembar Temuan

Salin tabel ini untuk setiap masalah yang ditemukan. Sertakan **tangkapan layar** bila bisa.

| No | Tes | Akun | Langkah ke- | Yang terjadi | Yang seharusnya | Online/Offline | Foto/Screenshot |
| -- | --- | ---- | ----------- | ------------ | --------------- | -------------- | --------------- |
| 1  |     |      |             |              |                 |                |                 |
| 2  |     |      |             |              |                 |                |                 |
| 3  |     |      |             |              |                 |                |                 |

**Tingkat masalah** (tulis di kolom "Yang terjadi"):

- **Berat:** data hilang, angka salah, dokumen dobel, aplikasi tertutup sendiri.
- **Sedang:** fitur tidak jalan tapi ada jalan lain.
- **Ringan:** tulisan salah, tampilan kurang rapi, tombol sulit ditekan.

---

## Bagian 6. Ringkasan Hasil Uji

| No | Tes                               | Lolos | Gagal | Catatan |
| -- | --------------------------------- | :---: | :---: | ------- |
| 1  | Masuk, menu, keluar               |       |       |         |
| 2  | BKM Panen                         |       |       |         |
| 3  | Peringatan keluar formulir        |       |       |         |
| 4  | SPB satu truk                     |       |       |         |
| 5  | Tiket PKS                         |       |       |         |
| 6  | Satu TPH dua truk                 |       |       |         |
| 7  | Minta revisi                      |       |       |         |
| 8  | Tutup Harian (Mandor)             |       |       |         |
| 9  | Persetujuan Tutup Harian          |       |       |         |
| 10 | Restan diangkut esok hari         |       |       |         |
| 11 | Pindai barcode SPB                |       |       |         |
| 12 | BKM Rawat                         |       |       |         |
| 13 | Observasi lapangan                |       |       |         |
| 14 | Pemakaian kendaraan               |       |       |         |
| 15 | Stok opname                       |       |       |         |
| 16 | Bekerja tanpa sinyal              |       |       |         |
| 17 | Akun pemanen                      |       |       |         |

**Penguji:** ____________________ **Tanggal:** ____________ **Versi aplikasi:** ________

---

## Bagian 7. Pertanyaan yang Sering Muncul

**Data saya tidak muncul di daftar.**
Buka **Akun**. Bila ada _"perubahan menunggu dikirim"_, data masih di HP. Sambungkan internet lalu tekan **Sinkronkan sekarang**.

**Ada tulisan "perubahan perlu ditinjau" di Akun.**
Server menolak data itu, biasanya karena nomor SPB ganda, hari sudah ditutup, atau data tidak cocok. Tekan **Periksa** untuk melihat alasannya. Bila datanya memang salah, tekan **Buang** lalu buat ulang dengan data yang benar.

**Tombol Setujui tidak muncul.**
Kemungkinan: (1) HP sedang offline, (2) Anda sendiri yang membuat atau mengajukan dokumen itu, atau (3) akun Anda tidak punya hak menyetujui. Panen dan SPB memang tidak punya tombol Setujui, karena disetujui lewat Tutup Harian.

**Pilihan blok, TPH, atau pekerja kosong saat offline.**
HP belum pernah menyimpan data kebun. Sambungkan internet, masuk, lalu buka formulirnya sekali.

**Apakah boleh keluar akun saat ada data belum terkirim?**
Boleh, data tetap tersimpan di HP. Data itu baru terkirim setelah **akun yang sama** masuk lagi **di HP yang sama**. Lebih aman sinkronkan dulu sebelum keluar.

**Butuh bantuan lain?**
**Akun** → **Bantuan**, atau hubungi admin kebun.
