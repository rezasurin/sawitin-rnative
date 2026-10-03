
## 🛠 Panduan Pengembangan: Frontend (React Native)

> **Status:** Dokumen ini adalah rancangan awal. Absensi ditunda dan tidak tersedia di navigasi mobile. Definisi tab saat ini ada di `components/core/RoleTabs.tsx`.

Fokus utama frontend adalah memberikan pengalaman pengguna yang mulus di lapangan, penanganan data lokal secara mandiri, dan kontrol penuh terhadap integrasi hardware perangkat mobile.

### 1. Arsitektur Navigasi Berbasis Peran

Implementasikan gerbang peran (_Role Gate_) menggunakan _Root Navigator_ untuk mengarahkan pengguna ke antarmuka yang sesuai:

-   **Pemanen**: Menggunakan _Bottom Tab_ dengan 2 tab: Beranda dan Akun.
    
-   **Mandor**: Menggunakan _Bottom Tab_ dengan 4 tab: Beranda, BKM Panen, Checker, dan Akun. Rawat dapat dibuka lewat menu yang tersedia.
    
-   **Asisten**: Menggunakan tab Beranda, BKM Panen, dan Akun.
    
-   **Admin**: Menggunakan tab Beranda, BKM Panen, Menu, dan Akun.
    

### 2. Implementasi QR Code & Integrasi Kamera

Gunakan library native untuk memastikan performa maksimal di area terbuka dengan cahaya ekstrem:

-   **Generator (Modul Checker)**: Gunakan library `react-native-qrcode-svg` agar kode tetap tajam dan terbaca saat diperbesar di layar.
    
-   **Scanner (Modul Krani Timbang)**: Gunakan `react-native-vision-camera` untuk pemindaian instan tanpa jeda.
    
-   **Kontrol Hardware**: Implementasikan fitur _Auto-Brightness_ (layar otomatis 100% terang saat QR terbuka) dan _Toggle Torch_ (lampu senter) untuk membantu pemindaian di malam hari atau kondisi gelap.
    

### 3. Manajemen Data Lokal (Offline-First)

Karena lokasi kebun seringkali merupakan titik buta sinyal (_blank spot_), frontend wajib mengelola datanya sendiri secara mandiri:

-   **Penyimpanan Lokal**: Gunakan **WatermelonDB** atau **SQLite** untuk menangani ribuan data transaksi secara lokal di dalam perangkat.
    
-   **Payload QR Efisien**: Gunakan format _Flat String_ dengan delimiter (contoh: `ID|TPH|QTY|TS|SIGN`) untuk menjaga kepadatan QR tetap rendah agar mudah dipindai oleh kamera resolusi rendah.
    
-   **Sync Queue**: Implementasikan antrean sinkronisasi latar belakang agar data tetap tersimpan dan siap dikirim otomatis saat sinyal tersedia, meskipun aplikasi tertutup.
