# PRD & Development Task — Dasbor Untung Usaha

> Dokumen kebutuhan produk dan checklist implementasi untuk membangun web admin **Dasbor Untung Usaha**, berdasarkan diagram fitur yang diberikan. Dokumen ini dapat digunakan sebagai acuan product owner, UI/UX designer, frontend developer, backend developer, QA, dan deployment.

- **Nama produk:** Dasbor Untung Usaha
- **Jenis aplikasi:** Web admin internal untuk pengelolaan pesanan, pelanggan, modal/biaya, keuntungan, pembukuan, serta sinkronisasi data dari website utama
- **Status dokumen:** Draft PRD — siap dijadikan dasar diskusi dan estimasi teknis
- **Bahasa antarmuka:** Bahasa Indonesia
- **Zona waktu dan mata uang default:** Asia/Makassar (WITA) dan Rupiah (IDR), dapat diubah sesuai kebutuhan bisnis
- **Sumber kebutuhan:** Diagram fitur dari pengguna. Detail yang belum dijelaskan ditandai sebagai asumsi atau keputusan yang perlu dikonfirmasi.

---

## Daftar Isi

1. [Ringkasan Produk](#1-ringkasan-produk)
2. [Latar Belakang dan Masalah](#2-latar-belakang-dan-masalah)
3. [Tujuan dan Indikator Keberhasilan](#3-tujuan-dan-indikator-keberhasilan)
4. [Pengguna dan Hak Akses](#4-pengguna-dan-hak-akses)
5. [Ruang Lingkup](#5-ruang-lingkup)
6. [Peta Fitur dan Fase](#6-peta-fitur-dan-fase)
7. [Kebutuhan Fungsional per Modul](#7-kebutuhan-fungsional-per-modul)
8. [Alur Bisnis Utama](#8-alur-bisnis-utama)
9. [Aturan Perhitungan Keuntungan](#9-aturan-perhitungan-keuntungan)
10. [Kebutuhan UI/UX](#10-kebutuhan-uiux)
11. [Rancangan Data](#11-rancangan-data)
12. [Rancangan API](#12-rancangan-api)
13. [Kebutuhan Nonfungsional](#13-kebutuhan-nonfungsional)
14. [Keamanan dan Audit](#14-keamanan-dan-audit)
15. [Task Breakdown / Backlog](#15-task-breakdown--backlog)
16. [Acceptance Criteria](#16-acceptance-criteria)
17. [Strategi Pengujian](#17-strategi-pengujian)
18. [Rencana Rilis](#18-rencana-rilis)
19. [Definition of Ready dan Definition of Done](#19-definition-of-ready-dan-definition-of-done)
20. [Risiko dan Ketergantungan](#20-risiko-dan-ketergantungan)
21. [Pertanyaan yang Perlu Diputuskan](#21-pertanyaan-yang-perlu-diputuskan)
22. [Panduan Mulai Implementasi](#22-panduan-mulai-implementasi)

---

## 1. Ringkasan Produk

**Dasbor Untung Usaha** adalah sistem administrasi berbasis web untuk membantu pemilik usaha/admin melihat kondisi usaha, mengelola pesanan yang berasal dari website atau WhatsApp, mencatat modal dan biaya, mengetahui keuntungan per pesanan dan per periode, mengelola data pelanggan, serta membuat rekap pembukuan.

Aplikasi direncanakan berkembang bertahap melalui lima fase bisnis:

- **Fase 1 — Dashboard Ringkas:** ringkasan keuntungan harian, pesanan terbaru, dan status pesanan.
- **Fase 2 — Operasional Pesanan dan Keuntungan:** daftar/booking, pencatatan pesanan WhatsApp, edit pesanan, pengelolaan modal/biaya, serta perhitungan keuntungan.
- **Fase 3 — Analisis dan Pembukuan:** data pelanggan, grafik keuntungan, pencatatan pemasukan/pengeluaran, tutup buku, dan ekspor laporan.
- **Fase 4 — Integrasi Website Utama:** sinkronisasi pesanan, status sinkronisasi, dan pengaturan jadwal penarikan data.
- **Fase 5 — Akun Admin:** pengelolaan akun admin dan reset kata sandi.

**Catatan dependensi penting:** meskipun modul “Masuk & Akun” ditandai sebagai Fase 5 di diagram, autentikasi dasar sebaiknya dibuat sejak fondasi teknis sebelum dashboard digunakan dengan data bisnis sungguhan. Fase 5 dapat menjadi fase penyempurnaan pengelolaan akun dan reset password.

---

## 2. Latar Belakang dan Masalah

Masalah yang ingin diselesaikan:

1. Data pesanan berpotensi tersebar di website, WhatsApp, dan catatan manual.
2. Pemilik usaha membutuhkan cara cepat melihat pesanan terbaru dan statusnya.
3. Modal, biaya operasional, dan pemasukan perlu dicatat secara konsisten agar keuntungan tidak sekadar diperkirakan.
4. Data pelanggan dan riwayat pesanannya perlu mudah dicari.
5. Pemilik usaha membutuhkan ringkasan dan grafik keuntungan berdasarkan periode.
6. Data dari website utama perlu masuk ke admin tanpa pencatatan ulang yang berlebihan.
7. Rekap harian/periode perlu dapat ditutup dan diekspor untuk pemeriksaan atau arsip.

### Prinsip Produk

- **Satu sumber data utama:** hindari data pesanan ganda dari input admin dan sinkronisasi website.
- **Angka dapat ditelusuri:** ringkasan keuntungan harus bisa ditelusuri ke transaksi, pesanan, modal, dan biaya yang membentuknya.
- **Perubahan tercatat:** perubahan penting pada data keuangan dan pesanan dicatat dalam audit log.
- **Bertahap:** modul dikembangkan sesuai prioritas bisnis, tetapi fondasi keamanan, database, dan pengujian dibangun sejak awal.

---

## 3. Tujuan dan Indikator Keberhasilan

### Tujuan

- Memusatkan pengelolaan pesanan, pelanggan, dan data finansial dalam satu admin.
- Mempercepat pengecekan pesanan baru dan status operasional.
- Menghitung keuntungan berdasarkan aturan bisnis yang jelas.
- Memudahkan pencatatan harian dan rekap per periode.
- Mengurangi input ulang melalui sinkronisasi website utama.

### KPI yang Disarankan

| KPI | Definisi / pengukuran | Target awal yang disarankan |
|---|---|---|
| Kelengkapan data pesanan | Persentase pesanan aktif dengan pelanggan, nilai, status, dan tanggal yang valid | ≥ 95% |
| Keakuratan perhitungan | Hasil sistem sama dengan sampel hitung manual yang telah disetujui | 100% pada skenario uji |
| Keberhasilan sinkronisasi | Pesanan valid dari sumber berhasil diproses tanpa duplikasi | ≥ 99% pada uji penerimaan |
| Waktu memuat dashboard | Waktu hingga ringkasan utama tampil pada volume awal yang disepakati | ≤ 3 detik pada kondisi normal |
| Keberhasilan ekspor laporan | File laporan yang diunduh dapat dibuka dan nilainya sesuai filter | 100% pada skenario uji |

Target di atas merupakan **target awal**, bukan jaminan performa. Target final harus disesuaikan dengan volume data, hosting, dan kondisi penggunaan.

---

## 4. Pengguna dan Hak Akses

### Peran MVP

| Peran | Hak akses utama |
|---|---|
| Admin/Pemilik | Mengakses dashboard, mengelola pesanan dan pelanggan, melihat/mengubah data finansial, melihat grafik, membuat laporan, mengatur integrasi, dan mengelola akun sesuai otorisasi |
| Staf Operasional *(opsional, jika dibutuhkan)* | Membuat/memperbarui pesanan dan data pelanggan; tidak otomatis mendapat akses mengubah konfigurasi atau menghapus data finansial |
| Viewer/Akuntansi *(opsional, jika dibutuhkan)* | Melihat data serta mengekspor laporan, tanpa hak mengubah transaksi |

Untuk versi pertama, aplikasi dapat dimulai dengan satu peran **Admin**. Peran tambahan dibuat bila kebutuhan pemisahan akses sudah dikonfirmasi.

### Kebijakan akses minimum

- Pengunjung tanpa login tidak dapat mengakses halaman admin atau endpoint admin.
- Hak akses diperiksa di backend, bukan hanya dengan menyembunyikan menu di frontend.
- Operasi sensitif seperti menghapus data, mengubah transaksi yang telah ditutup, dan mengelola akun perlu pembatasan khusus.

---

## 5. Ruang Lingkup

### Termasuk dalam Ruang Lingkup

- Dashboard ringkas usaha.
- CRUD pesanan/booking dan pencatatan pesanan dari WhatsApp.
- Pencatatan modal dan biaya yang berkaitan dengan pesanan.
- Perhitungan keuntungan otomatis berdasarkan aturan yang disetujui.
- Data pelanggan dan riwayat pesanan.
- Grafik keuntungan berdasarkan rentang waktu dan perbandingan periode.
- Pembukuan pemasukan/pengeluaran, proses tutup buku, dan ekspor laporan.
- Sinkronisasi pesanan dari website utama.
- Login, akun admin, dan reset password.
- Validasi data, pencatatan aktivitas penting, pengujian, dan dokumentasi operasional.

### Tidak Termasuk Sampai Dikonfirmasi

- Pembayaran online atau payment gateway.
- Pengiriman pesan otomatis melalui WhatsApp API.
- Faktur pajak atau modul perpajakan resmi.
- Payroll/gaji, persediaan gudang yang kompleks, multi-cabang, dan multi-mata-uang.
- Aplikasi mobile native.
- Integrasi ke marketplace atau sistem akuntansi eksternal.
- Fitur penghapusan permanen/rekayasa data transaksi yang sudah tutup buku.

---

## 6. Peta Fitur dan Fase

| Fase pada diagram | Modul | Subfitur yang terlihat pada gambar | Hasil yang diharapkan |
|---|---|---|---|
| Fase 1 | **Dashboard Ringkas** | Ringkasan Untung Hari Ini; Pesanan Terbaru; Status Pesanan; satu fitur tambahan perlu dikonfirmasi karena diagram menunjukkan total 4 | Pemilik dapat melihat keadaan usaha hari ini tanpa membuka setiap menu |
| Fase 2 | **Kelola Pesanan** | Daftar Pesanan & Booking; Catat Pesanan dari WA; Edit Pesanan; satu fitur tambahan perlu dikonfirmasi karena diagram menunjukkan total 4 | Pesanan dari kanal yang berbeda dapat dikelola dalam satu tempat |
| Fase 2 | **Hitung Untung Otomatis** | Kelola Modal & Biaya; Untung per Pesanan; Untung Bersih Otomatis | Biaya dan pendapatan menghasilkan kalkulasi keuntungan yang dapat ditelusuri |
| Fase 3 | **Data Pelanggan** | Daftar Pelanggan; Riwayat Pesanan Pelanggan; Cari Pelanggan | Admin dapat menemukan pelanggan dan memahami riwayat transaksinya |
| Fase 3 | **Grafik Keuntungan** | Grafik Untung per Periode; Bandingkan Periode; Filter Tampilan Grafik | Tren keuntungan dapat dipantau pada rentang waktu berbeda |
| Fase 3 | **Pembukuan Harian** | Catat Pemasukan & Pengeluaran; Rekap Tutup Buku; Ekspor Laporan | Transaksi finansial dicatat dan direkap per periode |
| Fase 4 | **Tarik Data Web Utama** *(nama sementara, perlu konfirmasi)* | Sinkron Pesanan Baru; Status Sinkronisasi; Atur Jadwal Tarik Data | Pesanan dari website utama masuk dengan aman dan tidak terduplikasi |
| Fase 5 | **Masuk & Akun** | Login; Kelola Akun Admin; Reset Password | Akun dapat dikelola dengan aman |

> **Keterangan:** pada dua kartu fitur pertama, diagram memperlihatkan “Lihat semua (4)” tetapi hanya tiga subfitur terbaca. Satu subfitur masing-masing modul belum dapat ditentukan dari gambar, sehingga tidak diasumsikan di dokumen ini.

---

## 7. Kebutuhan Fungsional per Modul

### 7.1 Dashboard Ringkas — Fase 1

**Tujuan:** memberikan gambaran cepat tentang performa usaha dan pekerjaan yang perlu ditangani.

**Fitur:**

- Menampilkan ringkasan keuntungan hari ini.
- Menampilkan daftar pesanan terbaru.
- Menampilkan jumlah/persentase pesanan menurut status.
- Menyediakan navigasi ke daftar pesanan dan rincian transaksi.
- Menampilkan rentang tanggal dan waktu pembaruan data secara jelas.
- Menampilkan keadaan kosong, loading, dan pesan kesalahan jika data tidak tersedia.

**Kebutuhan detail:**

- Pengguna dapat memilih tanggal atau periode yang didukung.
- Nilai ringkasan mengikuti definisi keuntungan di bagian [Aturan Perhitungan Keuntungan](#9-aturan-perhitungan-keuntungan).
- Pesanan yang dibatalkan tidak dianggap sebagai pendapatan aktif; refund atau koreksi harus direpresentasikan sebagai pembalik transaksi sesuai kebijakan keuangan.
- Setiap kartu ringkasan dapat diklik untuk membuka data sumber jika relevan.

### 7.2 Kelola Pesanan — Fase 2

**Daftar Pesanan & Booking**

- Menampilkan ID/kode pesanan, tanggal, nama pelanggan, sumber pesanan, nilai, status, dan status pembayaran bila digunakan.
- Mendukung pencarian berdasarkan kode pesanan/nama/nomor kontak.
- Mendukung filter tanggal, status, dan sumber pesanan.
- Mendukung pagination atau pemuatan bertahap.
- Menyediakan halaman/detail pesanan.

**Catat Pesanan dari WhatsApp**

- Admin dapat membuat pesanan manual dengan sumber `WhatsApp`.
- Admin dapat memilih pelanggan yang sudah ada atau membuat pelanggan baru.
- Admin dapat memasukkan ringkasan barang/layanan, nilai pesanan, tanggal, biaya/modal, catatan, dan status.
- Nomor/kode pesanan dibuat secara unik oleh server.
- Sistem menandai pesanan sebagai input manual agar berbeda dari data yang disinkronkan.

**Edit Pesanan**

- Admin dapat memperbarui detail pesanan sesuai hak akses.
- Sistem memvalidasi perubahan nilai dan status.
- Perubahan penting disimpan dalam riwayat audit.
- Pesanan yang telah masuk periode tutup buku tidak boleh diubah tanpa prosedur koreksi/reopen yang berwenang.

**Status pesanan awal yang disarankan:** `Baru`, `Dikonfirmasi`, `Diproses`, `Selesai`, `Dibatalkan`. Status pembayaran—jika digunakan—dipisahkan menjadi `Belum Dibayar`, `DP`, `Lunas`, `Refund`. Daftar final wajib dikonfirmasi oleh pemilik usaha.

### 7.3 Hitung Untung Otomatis — Fase 2

**Kelola Modal & Biaya**

- Admin dapat menambahkan satu atau lebih komponen modal/biaya pada pesanan.
- Setiap komponen menyimpan kategori, nominal, tanggal, catatan, dan pembuat.
- Sistem memvalidasi nominal tidak negatif kecuali jenis transaksi tertentu memang mendukung nilai koreksi.
- Perubahan komponen biaya memperbarui keuntungan terkait secara konsisten.

**Untung per Pesanan**

- Menampilkan pendapatan/nilai pesanan, diskon, pengembalian dana, modal/biaya langsung, biaya lain yang relevan, dan hasil keuntungan.
- Memiliki rincian yang menjelaskan komponen pembentuk angka.
- Pesanan batal tidak menghasilkan keuntungan aktif; pengembalian dana diperlakukan sesuai aturan akuntansi yang disepakati.

**Untung Bersih Otomatis**

- Menghitung total keuntungan untuk periode terpilih.
- Memisahkan pendapatan, biaya langsung/modal, dan biaya operasional.
- Mencegah biaya atau pendapatan yang sama dihitung dua kali ketika transaksi berasal dari pesanan.
- Menampilkan cara hitung atau tautan rincian transaksi sumber.

### 7.4 Data Pelanggan — Fase 3

- Menampilkan daftar pelanggan dengan nama, nomor kontak, tanggal tercatat, dan ringkasan jumlah/nilai pesanan bila tersedia.
- Mendukung pencarian nama, nomor telepon, atau ID pelanggan.
- Menampilkan profil pelanggan dan riwayat pesanan.
- Mencegah duplikasi pelanggan berdasarkan aturan pencocokan yang disepakati (misalnya nomor telepon yang telah dinormalisasi).
- Memungkinkan admin memperbaiki data pelanggan tanpa menghilangkan jejak pesanan historis.
- Data kontak pelanggan hanya ditampilkan kepada pengguna yang berhak.

### 7.5 Grafik Keuntungan — Fase 3

- Menampilkan grafik keuntungan berdasarkan periode harian, mingguan, bulanan, atau rentang tanggal khusus.
- Memungkinkan perbandingan dua rentang periode yang sebanding.
- Memiliki filter periode serta metrik yang ditampilkan.
- Menampilkan nilai detail ketika titik/kolom grafik dipilih jika library grafik mendukungnya.
- Menyediakan ringkasan total dan perubahan nominal/persentase terhadap periode pembanding.
- Memastikan periode tanpa transaksi tetap ditangani dengan konsisten, misalnya ditampilkan sebagai nol dan bukan menghilang tanpa keterangan.

### 7.6 Pembukuan Harian — Fase 3

**Catat Pemasukan & Pengeluaran**

- Admin dapat mencatat pemasukan/pengeluaran manual dengan tanggal, kategori, deskripsi, nominal, metode/catatan pembayaran opsional, serta lampiran opsional bila dibutuhkan.
- Pemasukan yang dihasilkan dari pesanan disimpan sebagai transaksi tertaut, bukan dicatat lagi sebagai transaksi manual tanpa hubungan.
- Sistem dapat membedakan transaksi otomatis dari pesanan dan transaksi manual.
- Sistem memvalidasi tanggal, kategori, dan nominal.

**Rekap Tutup Buku**

- Admin memilih tanggal/periode untuk ditutup.
- Sistem menampilkan rekap pendapatan, biaya, koreksi/refund, dan hasil bersih sebelum penutupan.
- Admin mengonfirmasi penutupan dan sistem menyimpan siapa yang menutup serta kapan.
- Periode yang sudah ditutup menjadi read-only untuk perubahan normal.
- Koreksi setelah tutup buku harus menggunakan mekanisme reopen dengan izin atau jurnal koreksi. Perilaku persisnya harus diputuskan sebelum implementasi.

**Ekspor Laporan**

- Pengguna memilih periode dan jenis laporan.
- Laporan minimal mencakup rekap pemasukan/pengeluaran dan keuntungan; rincian pesanan dapat disediakan sebagai laporan terpisah.
- Format awal disarankan CSV dan/atau XLSX; PDF dapat ditambahkan jika dibutuhkan.
- Nama file memuat jenis laporan dan rentang tanggal.
- Hasil ekspor mengikuti filter dan hak akses pengguna.

### 7.7 Tarik Data Web Utama — Fase 4

**Ketergantungan:** akses API atau metode resmi dari website utama harus tersedia. Struktur endpoint, autentikasi, payload, batas permintaan, dan cara membaca status pesanan perlu disepakati sebelum integrasi.

- Mengambil pesanan baru atau pesanan yang berubah dari website utama.
- Menyimpan ID sumber eksternal pada record lokal.
- Menggunakan kunci idempotensi/unique constraint agar proses tarik ulang tidak membuat duplikat.
- Menampilkan status sinkronisasi terakhir, waktu terakhir berhasil, jumlah record diproses, dan pesan kegagalan yang aman.
- Mendukung sinkronisasi manual oleh admin yang berwenang.
- Menyediakan jadwal otomatis dan mencatat hasil setiap eksekusi.
- Menerapkan retry terbatas untuk kegagalan sementara dan mencatat kegagalan permanen.
- Tidak menimpa perubahan manual secara diam-diam. Aturan konflik antar-data sumber dan data lokal harus ditentukan.

**Status sinkronisasi yang disarankan:** `Menunggu`, `Berjalan`, `Berhasil`, `Berhasil dengan Peringatan`, `Gagal`.

### 7.8 Masuk & Akun — Fase 5 (penyempurnaan; autentikasi dasar sejak fondasi)

**Login**

- Login menggunakan kredensial yang dipilih saat discovery (misalnya email/username dan password).
- Pesan kegagalan tidak membocorkan apakah akun tertentu terdaftar.
- Sesi kedaluwarsa dan logout ditangani dengan aman.
- Upaya login berulang dibatasi sesuai konfigurasi keamanan.

**Kelola Akun Admin**

- Admin berwenang dapat membuat atau menonaktifkan akun jika fitur multi-admin disetujui.
- Mengatur nama tampilan, username/email, role, dan status aktif.
- Perubahan role/status hanya dilakukan oleh pengguna yang berwenang.
- Akun yang sedang digunakan tidak boleh dinonaktifkan secara tidak sengaja tanpa konfirmasi yang tepat.

**Reset Password**

- Menyediakan proses reset dengan token sekali pakai dan masa berlaku terbatas jika reset mandiri via email dipilih.
- Jika belum ada layanan email, admin utama dapat melakukan reset terkontrol dengan prosedur yang aman.
- Password tidak pernah disimpan atau dicatat dalam bentuk plaintext.
- Token reset dan tautan reset tidak dimasukkan ke log aplikasi.

---

## 8. Alur Bisnis Utama

### 8.1 Pesanan dari Website Utama

1. Pelanggan membuat pesanan pada website utama.
2. Website utama menyimpan ID pesanan eksternal dan data pesanan.
3. Job sinkronisasi mengambil pesanan yang baru/berubah.
4. Backend memvalidasi payload dan mengecek ID eksternal.
5. Bila belum ada, sistem membuat pesanan lokal; bila sudah ada, sistem memperbarui field yang memang dimiliki sumber sesuai kebijakan konflik.
6. Perubahan status sinkronisasi dicatat.
7. Pesanan tampil dalam daftar dan dashboard admin.
8. Komponen pendapatan/biaya yang relevan masuk ke perhitungan hanya sekali.

### 8.2 Pesanan dari WhatsApp

1. Admin membuka menu **Kelola Pesanan** dan memilih **Catat Pesanan dari WA**.
2. Admin memilih/membuat pelanggan.
3. Admin memasukkan detail pesanan, tanggal, nominal, status, dan catatan.
4. Sistem memvalidasi input dan membuat kode pesanan unik.
5. Sistem menyimpan audit event dan transaksi keuangan terkait sesuai aturan bisnis.
6. Dashboard, profil pelanggan, grafik, serta pembukuan diperbarui dari sumber data tersebut.

### 8.3 Perubahan Modal atau Biaya

1. Admin membuka rincian pesanan.
2. Admin menambah atau mengubah komponen biaya.
3. Sistem memvalidasi nominal dan hak akses.
4. Keuntungan pesanan dan agregasi periode dihitung ulang atau diperbarui secara konsisten.
5. Perubahan dicatat untuk audit.

### 8.4 Tutup Buku

1. Admin memilih periode.
2. Sistem menampilkan ringkasan dan transaksi yang akan tercakup.
3. Admin memeriksa data lalu mengonfirmasi tutup buku.
4. Sistem menyimpan snapshot/referensi periode dan identitas pengguna yang menutup buku.
5. Transaksi dalam periode tersebut terkunci untuk perubahan biasa.
6. Koreksi berikutnya dicatat melalui prosedur khusus.

---

## 9. Aturan Perhitungan Keuntungan

Definisi final harus disetujui pemilik usaha sebelum coding modul keuangan. Rekomendasi awal:

### 9.1 Perhitungan per Pesanan

```text
Pendapatan Bersih Pesanan
= Nilai Item/Layanan
- Diskon
+ Biaya Tambahan yang menjadi pendapatan
- Refund

Laba Kotor Pesanan
= Pendapatan Bersih Pesanan
- Modal/HPP
- Biaya Langsung Pesanan

Laba Bersih Periode
= Total Pendapatan Bersih
- Total Modal/HPP dan Biaya Langsung
- Biaya Operasional Periode
- Biaya Lain yang diakui
```

Keterangan:

- **Modal/HPP** adalah biaya yang secara langsung berkaitan dengan produk/layanan yang dijual. Definisi perlu disesuaikan dengan model bisnis.
- **Biaya langsung** dapat mencakup komponen khusus pesanan yang tidak termasuk HPP.
- **Biaya operasional** dicatat pada pembukuan periode dan tidak boleh dibebankan dua kali pada pesanan sekaligus pada periode yang sama.
- Jika nilai pesanan mencakup DP/pelunasan, status pembayaran dan pengakuan pendapatan harus dibedakan sesuai kebijakan bisnis. Nilai pesanan tidak otomatis sama dengan uang yang sudah diterima.
- Pesanan batal, diskon, refund, dan koreksi harus mengikuti aturan yang konsisten.

### 9.2 Contoh Uji Hitung

| Komponen | Contoh nilai |
|---|---:|
| Nilai item/layanan | Rp500.000 |
| Diskon | Rp25.000 |
| Biaya tambahan yang menjadi pendapatan | Rp10.000 |
| Refund | Rp0 |
| Modal/HPP | Rp250.000 |
| Biaya langsung pesanan | Rp35.000 |
| **Pendapatan bersih** | **Rp485.000** |
| **Laba kotor pesanan** | **Rp200.000** |

Contoh tersebut hanya untuk memvalidasi logika matematika; bukan data transaksi nyata. Biaya operasional umum periode belum dimasukkan ke laba kotor pesanan di atas.

### 9.3 Ketentuan Teknis Perhitungan

- Gunakan tipe data uang berbasis integer dalam satuan rupiah terkecil yang relevan atau tipe `DECIMAL` dengan presisi yang ditetapkan. Hindari floating point untuk nilai finansial.
- Lakukan kalkulasi utama di backend/service domain, bukan hanya di browser.
- Total dashboard, grafik, dan laporan harus berasal dari definisi serta query agregasi yang konsisten.
- Simpan komponen pembentuk angka agar hasil dapat dijelaskan dan diaudit.
- Pastikan pesanan/transaksi sumber tidak dihitung dua kali saat sinkronisasi dijalankan kembali.
- Gunakan tanggal transaksi yang disepakati sebagai acuan laporan dan zona waktu yang konsisten.

---

## 10. Kebutuhan UI/UX

### Struktur Navigasi yang Disarankan

1. Dashboard
2. Kelola Pesanan
3. Hitung Untung
4. Data Pelanggan
5. Grafik Keuntungan
6. Pembukuan Harian
7. Sinkronisasi Website
8. Masuk & Akun / Pengaturan

### Halaman Minimal

- Login
- Dashboard
- Daftar pesanan
- Tambah pesanan manual
- Detail/edit pesanan
- Modal dan biaya pesanan
- Daftar pelanggan
- Detail pelanggan dan riwayat pesanan
- Grafik keuntungan
- Daftar pemasukan/pengeluaran
- Form transaksi finansial
- Tutup buku dan riwayat penutupan
- Ekspor laporan
- Status dan konfigurasi sinkronisasi
- Daftar/pengaturan akun admin

### Prinsip UX

- Layout responsif untuk desktop, tablet, dan layar ponsel.
- Ringkasan finansial harus menyebut rentang tanggal secara eksplisit.
- Format Rupiah konsisten, contoh: `Rp1.250.000`.
- Tabel menyediakan loading, empty state, error state, filter aktif, dan navigasi halaman.
- Form memiliki label, validasi yang jelas, konfirmasi untuk tindakan berisiko, dan pencegahan klik submit berulang.
- Status pesanan menggunakan label teks yang jelas; jangan hanya membedakan dengan warna.
- Warna visual mengikuti desain produk yang disepakati dan menjaga kontras/aksesibilitas.
- Gunakan komponen UI yang konsisten untuk tombol, dialog, tabel, badge status, filter, dan form.

---

## 11. Rancangan Data

Skema berikut merupakan **rancangan awal**. Nama kolom, relasi, dan kebutuhan indeks harus disesuaikan dengan stack serta aturan bisnis final.

### 11.1 Entitas yang Disarankan

#### `admins`

- `id`
- `name`
- `email` atau `username` (unik)
- `password_hash`
- `role`
- `is_active`
- `last_login_at`
- `created_at`, `updated_at`

#### `customers`

- `id`
- `name`
- `phone_normalized` (opsional, indeks pencarian)
- `email` (opsional)
- `address` (opsional)
- `notes` (opsional)
- `created_at`, `updated_at`

#### `orders`

- `id`
- `order_code` (unik dan dapat dibaca manusia)
- `customer_id`
- `source` (`website`, `whatsapp`, atau `manual`)
- `external_order_id` (nullable; unik bersama `source` jika tersedia)
- `order_date`
- `status`
- `payment_status` (jika digunakan)
- `subtotal_amount`
- `discount_amount`
- `additional_income_amount`
- `refund_amount`
- `notes`
- `created_by`, `updated_by`
- `created_at`, `updated_at`

#### `order_items` *(jika satu pesanan dapat terdiri dari banyak item/layanan)*

- `id`
- `order_id`
- `name_or_description`
- `quantity`
- `unit_price`
- `discount_amount`
- `cost_amount` (opsional, bila modal dicatat per item)

#### `order_costs`

- `id`
- `order_id`
- `category`
- `description`
- `amount`
- `cost_date`
- `created_by`
- `created_at`, `updated_at`

#### `financial_transactions`

- `id`
- `transaction_code`
- `transaction_date`
- `type` (`income` atau `expense`)
- `category`
- `description`
- `amount`
- `source_type` (misalnya `order`, `manual`, `refund`)
- `source_id` (nullable)
- `payment_method` (opsional)
- `created_by`
- `created_at`, `updated_at`

> Untuk transaksi yang dibuat otomatis dari pesanan, tetapkan kunci unik yang sesuai pada `source_type` + `source_id` + jenis transaksi agar proses sinkronisasi atau perhitungan ulang tidak menciptakan transaksi ganda.

#### `closing_periods`

- `id`
- `period_start`
- `period_end`
- `status` (`open`, `closed`, `reopened` bila prosedur reopen digunakan)
- `summary_json` atau kolom snapshot yang terstruktur
- `closed_by`
- `closed_at`
- `reopened_by`, `reopened_at` (opsional)
- `notes`

#### `sync_runs`

- `id`
- `source_name`
- `started_at`
- `finished_at`
- `status`
- `records_seen`
- `records_created`
- `records_updated`
- `records_skipped`
- `error_summary` (hindari menyimpan rahasia/token)
- `triggered_by` (admin atau scheduler)

#### `audit_logs`

- `id`
- `actor_admin_id`
- `action`
- `entity_type`
- `entity_id`
- `before_data` dan `after_data` yang aman (jika diperlukan)
- `ip_address` / metadata request sesuai kebijakan privasi
- `created_at`

#### `app_settings` / `integration_settings`

- Menyimpan preferensi bisnis, zona waktu, pengaturan periode, endpoint integrasi, jadwal sinkronisasi, dan konfigurasi non-rahasia.
- Secret/token integrasi harus disimpan menggunakan mekanisme secret/env yang aman, bukan dipaparkan ke frontend atau disimpan sebagai teks biasa tanpa perlindungan.

### 11.2 Relasi Utama

- Satu `customer` dapat mempunyai banyak `orders`.
- Satu `order` dapat mempunyai banyak `order_items` dan `order_costs`.
- `financial_transactions` dapat terkait dengan order atau dibuat manual.
- `closing_periods` menutup rentang transaksi berdasarkan tanggal dan aturan bisnis yang ditentukan.
- Setiap proses integrasi menciptakan satu `sync_runs` dan dapat menciptakan/memperbarui banyak `orders`.
- Perubahan penting pada entitas bisnis tercatat dalam `audit_logs`.

### 11.3 Indeks dan Integritas

- Unique: `orders.order_code`.
- Unique jika tersedia: pasangan `orders.source` + `orders.external_order_id`.
- Unique: `admins.email` atau `admins.username`.
- Index: `orders.order_date`, `orders.status`, `orders.customer_id`.
- Index: `customers.phone_normalized`, `customers.name` sesuai kebutuhan pencarian.
- Index: `financial_transactions.transaction_date`, `type`, `category`.
- Gunakan foreign key serta transaksi database untuk operasi yang memperbarui beberapa entitas terkait.

---

## 12. Rancangan API

Contoh berikut menggambarkan API REST. Bentuk final mengikuti framework backend dan kontrak integrasi website utama.

### Authentication

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password` *(jika reset mandiri via email digunakan)*
- `POST /api/auth/reset-password`

### Dashboard

- `GET /api/dashboard/summary?date=YYYY-MM-DD`
- `GET /api/dashboard/recent-orders?limit=10`
- `GET /api/dashboard/order-statuses?from=YYYY-MM-DD&to=YYYY-MM-DD`

### Orders

- `GET /api/orders?search=&status=&source=&from=&to=&page=`
- `POST /api/orders`
- `GET /api/orders/:id`
- `PATCH /api/orders/:id`
- `POST /api/orders/:id/costs`
- `PATCH /api/orders/:id/costs/:costId`
- `GET /api/orders/:id/profit`

### Customers

- `GET /api/customers?search=&page=`
- `POST /api/customers`
- `GET /api/customers/:id`
- `PATCH /api/customers/:id`
- `GET /api/customers/:id/orders`

### Finance and Reports

- `GET /api/finance/transactions?type=&from=&to=&category=&page=`
- `POST /api/finance/transactions`
- `PATCH /api/finance/transactions/:id`
- `GET /api/finance/profit?from=&to=&groupBy=day|week|month`
- `GET /api/finance/compare?from=&to=&compareFrom=&compareTo=`
- `POST /api/finance/closing-periods`
- `GET /api/finance/closing-periods`
- `POST /api/reports/export` atau endpoint unduh sesuai mekanisme framework

### Integration

- `GET /api/integrations/website/status`
- `POST /api/integrations/website/sync` *(otorisasi admin; batasi frekuensi)*
- `GET /api/integrations/website/runs`
- `PATCH /api/integrations/website/schedule`

### API Standards

- Gunakan respons error yang konsisten (`code`, `message`, `details` bila aman).
- Validasi payload di backend.
- Gunakan pagination untuk endpoint daftar.
- Terapkan autentikasi dan otorisasi di semua endpoint admin.
- Gunakan idempotency key atau unique constraint pada proses yang mungkin diulang.
- Hindari mengembalikan `password_hash`, secret integrasi, token reset, atau data sensitif yang tidak dibutuhkan.
- Dokumentasikan API dengan OpenAPI/Swagger atau dokumentasi setara.

---

## 13. Kebutuhan Nonfungsional

### Performa

- Dashboard mengagregasi data secara efisien dan tidak mengambil seluruh tabel transaksi jika tidak diperlukan.
- Daftar panjang memakai pagination dan indeks database.
- Ekspor laporan besar dapat diproses melalui background job bila volume data memerlukannya.
- Tetapkan target performa berdasarkan volume data uji yang realistis.

### Reliabilitas

- Proses sinkronisasi harus aman ketika dijalankan ulang.
- Job gagal harus mencatat pesan yang dapat ditindaklanjuti tanpa membocorkan secret.
- Operasi multi-tabel yang saling terkait menggunakan database transaction.
- Siapkan backup database dan prosedur pemulihan yang pernah diuji.

### Usability dan Aksesibilitas

- Antarmuka dapat digunakan pada desktop dan layar kecil.
- Form dan tabel memiliki label yang jelas.
- Status tidak bergantung pada warna saja.
- Navigasi keyboard dan kontras warna layak dijaga.

### Maintainability

- Pisahkan UI, business logic, data access, dan integrasi eksternal.
- Tetapkan linting, formatting, aturan penamaan, dan struktur folder.
- Simpan konfigurasi environment secara terpisah dari source code.
- Tambahkan automated tests pada logika keuntungan, status pesanan, hak akses, dan sinkronisasi.

---

## 14. Keamanan dan Audit

- Simpan password menggunakan algoritme hash yang sesuai (misalnya Argon2id atau bcrypt melalui library tepercaya).
- Gunakan HTTPS di lingkungan produksi.
- Lindungi sesi/cookie dengan konfigurasi yang aman dan terapkan CSRF protection bila relevan dengan mekanisme autentikasi.
- Validasi serta normalisasi seluruh input; gunakan query parameter terikat/ORM untuk mengurangi risiko SQL injection.
- Escape output untuk mencegah XSS.
- Batasi percobaan login dan endpoint sinkronisasi manual.
- Terapkan otorisasi server-side untuk semua operasi sensitif.
- Jangan menyimpan secret, password, token reset, atau informasi pembayaran sensitif dalam log.
- Catat audit untuk: pembuatan/edit pesanan, perubahan biaya, pencatatan/koreksi transaksi, tutup/reopen buku, perubahan akun, perubahan konfigurasi integrasi, dan eksekusi sinkronisasi.
- Terapkan kebijakan retensi dan akses atas data pelanggan sesuai kebutuhan privasi usaha.
- Backup database dienkripsi bila fasilitas mendukung dan akses backup dibatasi.

---

## 15. Task Breakdown / Backlog

Gunakan daftar ini sebagai checklist GitHub Issues, GitLab Issues, Jira, Trello, atau project board lainnya. Pecah lagi menjadi task lebih kecil sesuai ukuran sprint dan tim.

**Prioritas:**

- `P0` = wajib untuk fondasi/MVP atau keamanan.
- `P1` = fitur inti pada fase yang direncanakan.
- `P2` = peningkatan atau fitur yang menunggu konfirmasi.

### EPIC 0 — Discovery dan Persiapan Produk

- [ ] **T0.1 — Konfirmasi proses bisnis** (`P0`)
  - [ ] Konfirmasi jenis produk/layanan dan isi sebuah pesanan.
  - [ ] Konfirmasi sumber pesanan yang aktif: website, WhatsApp, atau kanal lain.
  - [ ] Konfirmasi status pesanan, status pembayaran, DP, pelunasan, pembatalan, dan refund.
  - [ ] Konfirmasi definisi modal/HPP, biaya langsung, biaya operasional, dan “untung bersih”.
  - [ ] Konfirmasi tanggal acuan pelaporan (tanggal pesanan, tanggal selesai, tanggal transaksi, atau tanggal pembayaran).
  - [ ] Konfirmasi aturan tutup buku dan prosedur koreksi setelah penutupan.
- [ ] **T0.2 — Konfirmasi integrasi website utama** (`P0` untuk Fase 4)
  - [ ] Identifikasi teknologi dan pemilik website utama.
  - [ ] Periksa ketersediaan API, autentikasi, dokumentasi, rate limit, dan sandbox.
  - [ ] Tentukan pemetaan field pesanan serta aturan sumber data yang berwenang.
- [ ] **T0.3 — Tetapkan kebutuhan nonfungsional** (`P1`)
  - [ ] Estimasikan pengguna admin, jumlah pesanan, serta pertumbuhan data.
  - [ ] Tentukan kebutuhan hosting, backup, pemulihan, dan pemantauan.
- [ ] **T0.4 — Buat backlog dan kriteria penerimaan** (`P0`)
  - [ ] Konversi task dalam dokumen ini menjadi issues.
  - [ ] Tambahkan owner, estimasi, dependensi, dan kriteria selesai pada setiap issue.

### EPIC 1 — Fondasi Proyek dan Arsitektur

- [ ] **T1.1 — Pilih stack dan struktur aplikasi** (`P0`)
  - [ ] Pilih framework frontend, backend, database, dan library UI/grafik.
  - [ ] Tetapkan monolith/modular monolith atau arsitektur lain sesuai ukuran proyek.
  - [ ] Tetapkan struktur folder dan batas modul domain.
- [ ] **T1.2 — Setup repository dan workflow tim** (`P0`)
  - [ ] Buat repository Git.
  - [ ] Tambahkan branch strategy dan pull request template.
  - [ ] Tambahkan `.gitignore`, formatter, linter, dan aturan commit.
- [ ] **T1.3 — Setup environment** (`P0`)
  - [ ] Siapkan environment local, test/staging, dan production.
  - [ ] Buat `.env.example` tanpa secret asli.
  - [ ] Konfigurasikan koneksi database dan migration.
- [ ] **T1.4 — Setup desain dan komponen dasar** (`P0`)
  - [ ] Tetapkan layout admin, sidebar, header, breadcrumb, dan area konten.
  - [ ] Buat komponen button, input, select, date picker, table, dialog, badge status, toast, dan skeleton.
  - [ ] Definisikan token warna, tipografi, spacing, radius, dan breakpoint.
- [ ] **T1.5 — Setup quality gate** (`P0`)
  - [ ] Jalankan lint dan test otomatis pada pull request.
  - [ ] Tambahkan pemeriksaan build.
  - [ ] Tentukan aturan review dan standar merge.

### EPIC 2 — Database dan Model Domain

- [ ] **T2.1 — Desain ERD** (`P0`)
  - [ ] Petakan `admins`, `customers`, `orders`, `order_items`, `order_costs`, `financial_transactions`, `closing_periods`, `sync_runs`, dan `audit_logs` sesuai kebutuhan.
  - [ ] Tentukan foreign key, unique constraint, index, dan kebijakan soft delete bila diperlukan.
- [ ] **T2.2 — Implementasi migration** (`P0`)
  - [ ] Buat migration untuk tabel yang disetujui.
  - [ ] Terapkan constraint untuk mencegah kode pesanan dan ID eksternal ganda.
  - [ ] Tetapkan format nominal uang dan presisi kolom tanggal/waktu.
- [ ] **T2.3 — Model, relasi, dan data akses** (`P0`)
  - [ ] Implementasikan model/entity dan relasi.
  - [ ] Buat repository/service sesuai arsitektur.
  - [ ] Tambahkan pagination, filter, dan sorting yang tervalidasi.
- [ ] **T2.4 — Seed data development** (`P1`)
  - [ ] Buat data dummy pelanggan, pesanan, biaya, dan transaksi untuk pengujian UI.
  - [ ] Pastikan seed tidak memuat data pribadi/rahasia sungguhan.

### EPIC 3 — Autentikasi dan Otorisasi Dasar

> Kerjakan sejak fondasi sebelum data bisnis produksi digunakan, walaupun modul akun pada diagram berada di Fase 5.

- [ ] **T3.1 — Login dan logout** (`P0`)
  - [ ] Buat UI login.
  - [ ] Buat endpoint login/logout dan validasi kredensial.
  - [ ] Implementasikan sesi/token yang aman sesuai arsitektur.
  - [ ] Tambahkan redirect pengguna belum login ke halaman login.
- [ ] **T3.2 — Middleware proteksi admin** (`P0`)
  - [ ] Lindungi seluruh halaman admin.
  - [ ] Lindungi seluruh endpoint API admin.
  - [ ] Uji akses tanpa token/sesi dan sesi yang kedaluwarsa.
- [ ] **T3.3 — Role dan otorisasi** (`P0`)
  - [ ] Implementasikan role Admin minimal.
  - [ ] Pisahkan policy akses untuk operasi sensitif.
  - [ ] Jika staf/viewer dibutuhkan, tambahkan role dan matriks izin.
- [ ] **T3.4 — Audit dasar** (`P1`)
  - [ ] Buat utility/service audit log.
  - [ ] Catat login penting dan tindakan perubahan data.

### EPIC 4 — Fase 1: Dashboard Ringkas

- [ ] **T4.1 — API ringkasan dashboard** (`P1`)
  - [ ] Definisikan metrik dan rentang tanggal default.
  - [ ] Implementasikan endpoint agregasi yang efisien.
  - [ ] Tambahkan pengujian batas tanggal, transaksi batal, refund, dan data kosong.
- [ ] **T4.2 — API pesanan terbaru dan status** (`P1`)
  - [ ] Buat endpoint pesanan terbaru.
  - [ ] Buat endpoint jumlah/status pesanan.
  - [ ] Pastikan filter tanggal/status konsisten.
- [ ] **T4.3 — UI dashboard** (`P1`)
  - [ ] Buat kartu ringkasan keuntungan.
  - [ ] Buat daftar pesanan terbaru.
  - [ ] Buat ringkasan status pesanan.
  - [ ] Tambahkan loading, empty, error, dan timestamp pembaruan.
  - [ ] Tambahkan tautan dari kartu/list menuju rincian sumber.
- [ ] **T4.4 — Verifikasi angka dashboard** (`P0`)
  - [ ] Bandingkan hasil endpoint dengan contoh hitung manual yang telah disepakati.
  - [ ] Pastikan metrik mengacu pada layanan perhitungan keuntungan yang sama dengan laporan.

### EPIC 5 — Fase 2: Kelola Pesanan

- [ ] **T5.1 — API daftar dan detail pesanan** (`P1`)
  - [ ] Implementasikan daftar, detail, search, filter, sort, dan pagination.
  - [ ] Tambahkan validasi input serta error handling.
- [ ] **T5.2 — Buat pesanan manual/WhatsApp** (`P1`)
  - [ ] Buat form tambah pesanan.
  - [ ] Buat pemilihan atau pembuatan pelanggan.
  - [ ] Buat generator kode pesanan unik di backend.
  - [ ] Simpan sumber pesanan dan pembuat record.
- [ ] **T5.3 — Edit pesanan dan status** (`P1`)
  - [ ] Implementasikan update field yang diizinkan.
  - [ ] Validasi transisi status.
  - [ ] Simpan audit log before/after untuk field penting.
  - [ ] Blokir perubahan normal pada periode yang sudah ditutup.
- [ ] **T5.4 — UI daftar dan detail pesanan** (`P1`)
  - [ ] Buat tabel pesanan dengan search/filter.
  - [ ] Buat form tambah/edit.
  - [ ] Buat halaman/detail drawer pesanan.
  - [ ] Tambahkan konfirmasi untuk pembatalan/perubahan penting.
- [ ] **T5.5 — Tes pesanan** (`P0`)
  - [ ] Tes validasi nominal dan tanggal.
  - [ ] Tes status tidak valid.
  - [ ] Tes duplikasi submit.
  - [ ] Tes akses role tidak berwenang.

### EPIC 6 — Fase 2: Hitung Untung Otomatis

- [ ] **T6.1 — Finalisasi rumus keuntungan** (`P0`)
  - [ ] Dokumentasikan definisi pendapatan, modal/HPP, biaya langsung, biaya operasional, refund, dan laba bersih.
  - [ ] Persetujuan pemilik usaha atas contoh perhitungan.
- [ ] **T6.2 — Service perhitungan keuntungan** (`P0`)
  - [ ] Implementasikan fungsi perhitungan di backend/domain layer.
  - [ ] Hindari perhitungan floating point untuk nominal uang.
  - [ ] Tangani pembatalan, diskon, refund, dan perubahan biaya.
  - [ ] Pastikan transaksi yang sama tidak dihitung dua kali.
- [ ] **T6.3 — CRUD modal dan biaya pesanan** (`P1`)
  - [ ] Buat endpoint tambah/edit biaya.
  - [ ] Buat daftar kategori biaya yang dapat dikonfigurasi.
  - [ ] Catat pembuat, tanggal, dan perubahan biaya.
- [ ] **T6.4 — UI modal/biaya dan rincian untung** (`P1`)
  - [ ] Buat form dan daftar biaya per pesanan.
  - [ ] Tampilkan pendapatan bersih, modal, biaya langsung, serta laba.
  - [ ] Jelaskan item perhitungan dengan rincian yang dapat dibuka.
- [ ] **T6.5 — Pengujian kalkulasi** (`P0`)
  - [ ] Unit test contoh hitung normal.
  - [ ] Unit test diskon, biaya tambahan, refund, pesanan batal, dan nilai nol.
  - [ ] Integration test perubahan biaya terhadap ringkasan periode.

### EPIC 7 — Fase 3: Data Pelanggan

- [ ] **T7.1 — API pelanggan** (`P1`)
  - [ ] Implementasikan daftar, detail, tambah, edit, cari, dan pagination.
  - [ ] Normalisasi nomor telepon bila digunakan sebagai kunci pencocokan.
  - [ ] Tambahkan kebijakan deteksi duplikasi.
- [ ] **T7.2 — Riwayat pesanan pelanggan** (`P1`)
  - [ ] Buat endpoint riwayat pesanan dan ringkasan pelanggan.
  - [ ] Pastikan transaksi historis tetap terhubung jika data kontak diperbarui.
- [ ] **T7.3 — UI pelanggan** (`P1`)
  - [ ] Buat daftar pelanggan dan search.
  - [ ] Buat form tambah/edit.
  - [ ] Buat profil serta tabel riwayat pesanan.
- [ ] **T7.4 — Tes data pelanggan** (`P1`)
  - [ ] Uji pencarian nama dan nomor.
  - [ ] Uji input duplikat.
  - [ ] Uji validasi dan perlindungan data kontak.

### EPIC 8 — Fase 3: Grafik Keuntungan

- [ ] **T8.1 — API agregasi grafik** (`P1`)
  - [ ] Tambahkan group by harian/mingguan/bulanan.
  - [ ] Implementasikan rentang tanggal khusus.
  - [ ] Pastikan aturan angka sama dengan dashboard dan pembukuan.
- [ ] **T8.2 — API perbandingan periode** (`P1`)
  - [ ] Tentukan aturan periode pembanding.
  - [ ] Hitung selisih nominal dan persentase; tangani periode pembanding bernilai nol.
- [ ] **T8.3 — UI grafik dan filter** (`P1`)
  - [ ] Implementasikan grafik sesuai library yang dipilih.
  - [ ] Tambahkan filter waktu dan metrik.
  - [ ] Tampilkan ringkasan, tooltip, dan empty state.
- [ ] **T8.4 — Tes laporan grafik** (`P1`)
  - [ ] Uji batas tanggal dan zona waktu.
  - [ ] Cocokkan nilai grafik dengan agregasi transaksi sumber.

### EPIC 9 — Fase 3: Pembukuan Harian

- [ ] **T9.1 — Kategori transaksi finansial** (`P1`)
  - [ ] Tetapkan kategori pemasukan dan pengeluaran.
  - [ ] Tetapkan relasi transaksi otomatis terhadap pesanan.
- [ ] **T9.2 — API pemasukan/pengeluaran** (`P1`)
  - [ ] Implementasikan daftar, tambah, edit, filter, dan pagination.
  - [ ] Validasi transaksi dan periode tertutup.
  - [ ] Cegah transaksi sumber ganda.
- [ ] **T9.3 — UI catatan transaksi** (`P1`)
  - [ ] Buat tabel transaksi, filter periode/jenis/kategori, dan form input.
  - [ ] Bedakan transaksi manual dari transaksi otomatis tanpa mengandalkan warna saja.
- [ ] **T9.4 — Tutup buku** (`P1`)
  - [ ] Buat ringkasan pratinjau sebelum penutupan.
  - [ ] Implementasikan konfirmasi tutup buku dan snapshot/rekap.
  - [ ] Terapkan penguncian data pada periode tertutup.
  - [ ] Tentukan dan implementasikan alur reopen/koreksi jika disetujui.
- [ ] **T9.5 — Ekspor laporan** (`P1`)
  - [ ] Implementasikan ekspor sesuai format yang disepakati.
  - [ ] Samakan filter ekspor dengan filter UI.
  - [ ] Amankan nama file, encoding, format tanggal, dan angka.
- [ ] **T9.6 — Tes pembukuan** (`P0`)
  - [ ] Uji transaksi manual vs otomatis.
  - [ ] Uji penutupan periode dan larangan edit.
  - [ ] Uji ekspor dan cocokkan total dengan layar.

### EPIC 10 — Fase 4: Sinkronisasi Website Utama

- [ ] **T10.1 — Kontrak integrasi** (`P0` untuk memulai Fase 4)
  - [ ] Dokumentasikan endpoint/format sumber dan skema data.
  - [ ] Tetapkan metode autentikasi aman.
  - [ ] Petakan status pesanan sumber ke status admin.
  - [ ] Sepakati aturan konflik dan field yang boleh diperbarui.
- [ ] **T10.2 — Konektor sumber** (`P1`)
  - [ ] Implementasikan client API dengan timeout dan penanganan error.
  - [ ] Simpan konfigurasi rahasia di environment/secret store.
  - [ ] Validasi payload yang diterima.
- [ ] **T10.3 — Job sinkronisasi idempotent** (`P1`)
  - [ ] Implementasikan pengambilan pesanan baru/berubah.
  - [ ] Terapkan unique external ID dan upsert yang aman.
  - [ ] Tambahkan retry/backoff terbatas dan pencegahan job tumpang tindih.
  - [ ] Catat jumlah dibuat, diperbarui, dilewati, dan gagal.
- [ ] **T10.4 — Jadwal sinkronisasi** (`P1`)
  - [ ] Buat scheduler berdasarkan interval yang disepakati.
  - [ ] Sediakan pemicu sinkronisasi manual dengan otorisasi.
  - [ ] Pastikan job tidak berjalan bersamaan secara tak terkendali.
- [ ] **T10.5 — UI status dan riwayat sinkronisasi** (`P1`)
  - [ ] Tampilkan status terakhir, waktu berhasil/gagal, dan ringkasan hasil.
  - [ ] Tampilkan pesan kesalahan yang aman dan berguna.
  - [ ] Sediakan tombol sinkronisasi manual dan konfirmasi bila diperlukan.
- [ ] **T10.6 — Tes integrasi** (`P0`)
  - [ ] Uji pesanan baru, pesanan berubah, payload tidak valid, timeout, rate limit, dan sumber tidak tersedia.
  - [ ] Uji menjalankan sinkronisasi yang sama berulang kali tanpa duplikasi.
  - [ ] Uji agar error integrasi tidak membocorkan kredensial.

### EPIC 11 — Fase 5: Akun Admin dan Reset Password

- [ ] **T11.1 — Kelola akun admin** (`P1`)
  - [ ] Buat daftar akun, tambah/edit, ubah role, aktif/nonaktif sesuai kebijakan.
  - [ ] Cegah admin menghapus/menonaktifkan akun terakhir yang masih diperlukan.
  - [ ] Catat perubahan akun ke audit log.
- [ ] **T11.2 — Reset password** (`P1`)
  - [ ] Pilih jalur reset (email atau reset oleh admin utama).
  - [ ] Implementasikan token sekali pakai dan masa berlaku bila menggunakan email.
  - [ ] Invalidasi sesi lama jika diperlukan setelah reset.
- [ ] **T11.3 — Hardening autentikasi** (`P0` sebelum rilis produksi)
  - [ ] Tinjau kebijakan sesi dan cookie.
  - [ ] Tinjau rate limit login dan pesan error.
  - [ ] Pastikan password tidak masuk ke log.
- [ ] **T11.4 — Tes akun** (`P0`)
  - [ ] Uji hak akses lintas role.
  - [ ] Uji akun nonaktif.
  - [ ] Uji token reset kedaluwarsa/digunakan ulang jika fitur terkait tersedia.

### EPIC 12 — QA, UAT, Dokumentasi, dan Rilis

- [ ] **T12.1 — Regression test** (`P0`)
  - [ ] Jalankan seluruh test unit/integrasi.
  - [ ] Tes alur pesanan dari awal sampai dashboard, keuntungan, dan pembukuan.
  - [ ] Tes integrasi website jika fase tersebut sudah aktif.
- [ ] **T12.2 — UAT bersama pemilik usaha** (`P0`)
  - [ ] Siapkan skenario menggunakan data dummy yang mewakili kasus bisnis.
  - [ ] Verifikasi angka keuntungan dan contoh laporan.
  - [ ] Catat masalah dan persetujuan fitur sebelum rilis.
- [ ] **T12.3 — Observability dan backup** (`P0`)
  - [ ] Siapkan logging terstruktur dan pemantauan error.
  - [ ] Atur backup terjadwal.
  - [ ] Uji prosedur restore.
- [ ] **T12.4 — Deployment staging dan production** (`P0`)
  - [ ] Siapkan domain, HTTPS, environment variable, database, serta scheduler/worker.
  - [ ] Jalankan migration dengan prosedur aman.
  - [ ] Validasi health check dan akses login.
  - [ ] Siapkan prosedur rollback.
- [ ] **T12.5 — Dokumentasi pengguna dan teknis** (`P1`)
  - [ ] Dokumentasikan cara login dan penggunaan modul.
  - [ ] Dokumentasikan backup/restore dan konfigurasi environment.
  - [ ] Dokumentasikan API/integrasi serta prosedur menangani sinkronisasi gagal.

---

## 16. Acceptance Criteria

Kriteria berikut menjadi acuan minimal untuk penerimaan modul. Setiap acceptance test dapat diturunkan menjadi kasus uji rinci.

### Dashboard

- [ ] Pengguna yang sudah login dapat melihat ringkasan untuk tanggal/periode yang dipilih.
- [ ] Angka sesuai dengan transaksi sumber dan rumus keuntungan yang telah disetujui.
- [ ] Pesanan terbaru menampilkan informasi penting dan dapat dibuka.
- [ ] Status pesanan mempunyai total yang konsisten dengan filter periode.
- [ ] Ketika belum ada data, UI menampilkan empty state, bukan angka error atau halaman kosong.

### Kelola Pesanan

- [ ] Admin dapat membuat pesanan manual/WhatsApp dengan field wajib lengkap.
- [ ] Sistem menolak input invalid dan tidak menciptakan pesanan ganda akibat submit berulang.
- [ ] Admin dapat mencari dan memfilter pesanan sesuai kriteria yang tersedia.
- [ ] Perubahan status mengikuti transisi yang diperbolehkan.
- [ ] Perubahan penting terekam dalam audit log.

### Hitung Untung

- [ ] Admin dapat mencatat modal/biaya yang terkait dengan pesanan.
- [ ] Sistem menghitung ulang keuntungan sesuai formula ketika nominal relevan berubah.
- [ ] Rincian angka menjelaskan sumber pendapatan dan biaya.
- [ ] Pembatalan, diskon, refund, dan biaya nol memiliki hasil yang telah diuji.
- [ ] Tidak ada double count antara nilai pesanan dan transaksi pembukuan tertaut.

### Data Pelanggan

- [ ] Pengguna dapat menambah, mencari, melihat, dan memperbarui pelanggan sesuai izin.
- [ ] Riwayat pesanan yang terkait ditampilkan pada profil pelanggan.
- [ ] Aturan deteksi duplikasi berfungsi sesuai kebijakan yang dipilih.

### Grafik Keuntungan

- [ ] Filter periode mengubah hasil grafik dan ringkasan.
- [ ] Perbandingan periode menampilkan nilai kedua periode serta selisih yang benar.
- [ ] Nilai grafik cocok dengan agregasi sumber dalam sampel uji.
- [ ] Periode kosong dan nilai pembanding nol ditangani tanpa pembagian nol atau hasil menyesatkan.

### Pembukuan Harian

- [ ] Admin dapat menambah dan mencari transaksi pemasukan/pengeluaran.
- [ ] Transaksi otomatis yang berasal dari pesanan memiliki referensi sumber dan tidak dibuat dua kali.
- [ ] Setelah periode ditutup, perubahan normal pada transaksi periode tersebut ditolak.
- [ ] Laporan ekspor terbuka dan totalnya cocok dengan filter/periode di UI.

### Integrasi Website

- [ ] Sinkronisasi menarik data sesuai kontrak integrasi.
- [ ] Menjalankan job yang sama berulang kali tidak menghasilkan pesanan duplikat.
- [ ] Status dan ringkasan proses dapat dilihat admin.
- [ ] Error tercatat dengan aman dan dapat ditindaklanjuti.
- [ ] Jadwal otomatis bekerja sesuai interval yang dikonfigurasi.

### Login dan Akun

- [ ] Halaman dan API admin tidak dapat diakses tanpa autentikasi.
- [ ] Pengguna hanya dapat melakukan tindakan sesuai haknya.
- [ ] Password tidak disimpan dalam bentuk plaintext.
- [ ] Reset password, jika aktif, memakai token/flow yang dibatasi masa berlaku dan tidak dapat digunakan ulang.

---

## 17. Strategi Pengujian

### Jenis Pengujian

- **Unit test:** rumus keuntungan, normalisasi nomor telepon, validasi status, perbandingan periode, serta aturan idempotensi.
- **Integration test:** endpoint dengan database, transaksi multi-tabel, autentikasi, ekspor, dan sinkronisasi.
- **End-to-end test:** login → buat pesanan → tambah biaya → lihat keuntungan → lihat grafik → tutup buku/ekspor.
- **Security test:** akses endpoint tanpa login, akses role salah, injection/XSS dasar, rate limit login, dan kebocoran secret.
- **Performance test:** dashboard, daftar pesanan, pencarian, grafik, dan ekspor dengan volume data uji yang disepakati.
- **UAT:** pemilik usaha memeriksa bahwa istilah, alur kerja, dan angka sesuai kebiasaan operasional.

### Data Kasus Uji Finansial Minimum

1. Pesanan normal dengan modal dan biaya langsung.
2. Pesanan dengan diskon.
3. Pesanan dengan biaya tambahan.
4. Pesanan yang menerima DP lalu pelunasan.
5. Pesanan dibatalkan.
6. Pesanan dengan refund sebagian/penuh.
7. Pengeluaran operasional manual.
8. Sinkronisasi pesanan yang sama lebih dari satu kali.
9. Perubahan biaya setelah laporan dibuat.
10. Perubahan transaksi setelah periode ditutup.

---

## 18. Rencana Rilis

| Rilis | Cakupan | Prasyarat sebelum lanjut |
|---|---|---|
| **Fondasi Teknis** | Repository, database, layout admin, autentikasi dasar, otorisasi, logging/error handling | Login dan proteksi endpoint lulus uji |
| **Rilis 1 / Fase 1** | Dashboard ringkas | Definisi angka dashboard telah disetujui dan dapat ditelusuri |
| **Rilis 2 / Fase 2** | Kelola pesanan dan hitung keuntungan | Form pesanan, aturan status, modal/biaya, dan formula keuntungan lulus uji |
| **Rilis 3 / Fase 3** | Data pelanggan, grafik, pembukuan, tutup buku, ekspor | Rekonsiliasi angka laporan dan aturan periode tutup buku disetujui |
| **Rilis 4 / Fase 4** | Integrasi dan jadwal sinkronisasi website utama | API/akses sumber tersedia, mapping disetujui, dan idempotensi teruji |
| **Rilis 5 / Fase 5** | Manajemen akun admin dan reset password lengkap | Kebijakan role serta mekanisme reset disetujui |

Jangan menunggu Fase 5 untuk menambahkan login dasar. Rilis bisnis boleh tetap mengikuti urutan diagram, tetapi keamanan fondasi wajib ada sejak awal.

---

## 19. Definition of Ready dan Definition of Done

### Definition of Ready (task siap dikerjakan)

- [ ] Tujuan task dan pengguna yang dibantu sudah jelas.
- [ ] Kriteria penerimaan dapat diuji.
- [ ] Desain, data, endpoint, atau dependensi yang diperlukan tersedia atau sudah disepakati.
- [ ] Risiko serta dampak terhadap data finansial telah dipertimbangkan.
- [ ] Task cukup kecil untuk diselesaikan dan direview dalam satu siklus kerja.

### Definition of Done (task dianggap selesai)

- [ ] Implementasi memenuhi acceptance criteria.
- [ ] Validasi dan penanganan error tersedia.
- [ ] Test yang relevan lulus.
- [ ] Tidak ada secret atau data pribadi sensitif yang masuk ke repository/log.
- [ ] Perubahan direview dan lulus lint/build.
- [ ] Dokumentasi API/UI/configuration diperbarui bila relevan.
- [ ] Perubahan dapat diuji di staging dan tidak merusak fitur yang sudah ada.

---

## 20. Risiko dan Ketergantungan

| Risiko/ketergantungan | Dampak | Mitigasi |
|---|---|---|
| Definisi keuntungan belum jelas | Dashboard/grafik/laporan bisa berbeda angkanya | Setujui formula dan kasus uji sebelum implementasi finansial |
| API website utama belum tersedia | Fase sinkronisasi tertunda | Lakukan discovery integrasi sejak awal; gunakan mock API untuk pengembangan sementara |
| Duplikasi pesanan/transaksi | Laporan keuangan tidak akurat | Unique constraint, idempotency, referensi sumber, dan integration test |
| Perubahan transaksi setelah tutup buku | Rekap historis berubah tanpa jejak | Kunci periode dan sediakan prosedur koreksi/reopen berizin |
| Scope bertambah selama pengembangan | Jadwal dan kualitas terdampak | Tandai fitur di luar scope, gunakan change request, prioritaskan P0/P1 |
| Hak akses terlalu luas | Kebocoran atau perubahan data tak sah | Otorisasi server-side dan audit log |
| Backup tidak pernah diuji | Pemulihan gagal saat insiden | Jadwalkan backup dan uji restore berkala |

---

## 21. Pertanyaan yang Perlu Diputuskan

Pertanyaan ini tidak menghalangi pembuatan fondasi, tetapi jawabannya diperlukan sebelum modul terkait dikunci:

1. **Jenis bisnis:** pesanan mewakili produk, jasa, booking jadwal, atau kombinasi?
2. **Sumber website utama:** domain/teknologi apa yang digunakan dan apakah tersedia API?
3. **Satuan pendapatan:** angka pada dashboard menggunakan nilai pesanan, pendapatan yang sudah diterima, atau pendapatan saat pesanan selesai?
4. **Definisi modal dan biaya:** komponen mana yang dianggap modal/HPP, biaya langsung, biaya operasional, dan biaya lain?
5. **DP/refund/pembatalan:** bagaimana dampaknya terhadap status dan perhitungan keuntungan?
6. **Penutupan buku:** siapa yang dapat menutup buku dan apakah periode dapat dibuka kembali?
7. **Role pengguna:** hanya satu admin atau diperlukan staf operasional dan viewer/akuntansi?
8. **Format laporan:** CSV, XLSX, PDF, atau kombinasi?
9. **Jadwal sinkronisasi:** seberapa sering data ditarik dan apakah perlu webhook selain penarikan terjadwal?
10. **Subfitur belum terbaca:** apa subfitur keempat pada kartu Dashboard Ringkas dan Kelola Pesanan yang ditunjukkan “Lihat semua (4)” di diagram?

---

## 22. Panduan Mulai Implementasi

Urutan eksekusi yang disarankan:

1. **Selesaikan discovery minimum:** pertanyaan tentang jenis pesanan, rumus keuntungan, status, dan sumber data.
2. **Buat repository dan fondasi:** layout admin, environment, database, autentikasi dasar, otorisasi, logging, serta migration.
3. **Bangun model pesanan dan pelanggan:** data dummy digunakan untuk memvalidasi halaman awal.
4. **Implementasikan perhitungan keuntungan sebagai service teruji:** jangan mulai dari angka kartu dashboard tanpa definisi yang disepakati.
5. **Bangun Fase 1 dan Fase 2:** dashboard, pesanan, biaya, rincian untung, lalu cocokkan hasil terhadap hitung manual.
6. **Lanjutkan Fase 3:** pelanggan, grafik, pembukuan, tutup buku, dan ekspor.
7. **Kerjakan Fase 4 setelah kontrak integrasi tersedia:** mock API boleh dipakai sementara, tetapi rilis integrasi menunggu pengujian dengan sumber sebenarnya.
8. **Sempurnakan pengelolaan akun pada Fase 5:** role, akun admin, reset password, dan hardening keamanan.
9. **Lakukan UAT, backup/restore test, dan deployment bertahap:** jangan rilis perubahan finansial tanpa rekonsiliasi angka.

### Rekomendasi Praktis untuk Sprint Pertama

- [ ] Finalisasi formula keuntungan dan daftar status pesanan.
- [ ] Konfirmasi stack dan struktur database.
- [ ] Buat ERD awal dan migration inti.
- [ ] Buat layout admin berdasarkan navigasi modul pada diagram.
- [ ] Implementasikan login serta proteksi route/API.
- [ ] Buat seed data dummy untuk pesanan, pelanggan, modal, dan biaya.
- [ ] Siapkan test unit awal untuk rumus keuntungan.

---

## Catatan Akhir

Dokumen ini merupakan PRD awal yang diturunkan dari diagram fitur. Sebelum diperlakukan sebagai spesifikasi final, konfirmasikan keputusan bisnis pada bagian 21—terutama definisi keuntungan, perilaku booking/pembayaran, aturan tutup buku, dan kontrak integrasi website utama. Dengan keputusan itu, task dapat diprioritaskan dan dipecah menjadi issue implementasi tanpa membuat asumsi yang berisiko terhadap data keuangan.
