# Product Requirement Document (PRD) & Task List: Sistem Booking Online & Web Admin (Sacred Journey Bali)

Dokumen ini berisi spesifikasi produk (*Product Requirement Document*) dan rincian tugas pengerjaan (*Task Breakdown*) untuk mengintegrasikan form *booking online* publik dengan *Web Admin* berbasis **Supabase** dan frontend JavaScript.

---

## 1. Overview & Objective
* **Nama Proyek:** Integrasi Booking Online & Dashboard Web Admin (*Sacred Journey Bali*)
* **Deskripsi Sistem:** Menghubungkan form pemesanan layanan di website publik agar data pesanan tersimpan secara aman ke database relasional (Supabase) dan dapat dikelola secara *real-time* melalui halaman *Web Admin* khusus.
* **Tujuan (Goals):**
  1. Menyimpan data pemesanan pelanggan secara otomatis dari form frontend ke database.
  2. Menyediakan halaman *Web Admin* bagi pengelola untuk melihat, memantau, dan memperbarui status pesanan.
  3. Menerapkan sistem keamanan data berbasis *Row Level Security* (RLS) di Supabase untuk memisahkan hak akses publik dan admin.

---

## 2. User Flow & Arsitektur

### **A. User Flow (Pelanggan / Public)**
1. Pengunjung membuka website *Booking Online*.
2. Pengunjung mengisi form pemesanan (Nama, Email, Layanan, Tanggal).
3. Saat tombol submit ditekan, sistem mengirim data (`INSERT`) ke tabel `bookings` di Supabase.
4. Pengunjung melihat pesan sukses / notifikasi bahwa booking telah diterima.

### **B. User Flow (Admin / Pengelola)**
1. Admin membuka halaman khusus admin (`/admin/index.html`).
2. Sistem melakukan autentikasi login admin via Supabase Auth.
3. Halaman admin menarik data (`SELECT`) seluruh pesanan dari tabel `bookings`.
4. Admin dapat mengubah status pesanan (misal: *Pending* menjadi *Confirmed*) melalui tombol aksi.

---

## 3. Database Schema (Supabase - PostgreSQL)

Tabel utama yang digunakan: **`bookings`**
* `id`: `uuid` (Primary Key, Default: `gen_random_uuid()`)
* `customer_name`: `text` (Nama lengkap pemesan)
* `customer_email`: `text` (Email pemesan)
* `service_name`: `text` (Nama layanan yang dipilih)
* `booking_date`: `date` (Tanggal pelaksanaan)
* `status`: `text` (Status pesanan: `Pending`, `Confirmed`, `Cancelled`)
* `created_at`: `timestamptz` (Waktu transaksi dibuat, Default: `now()`)

---

## 4. Task Breakdown & Backlog Pekerjaan (Status: Selesai ✅)

Berikut adalah rincian tahapan tugas yang telah diselesaikan:

### **Tahap 1: Konfigurasi Database & Keamanan Supabase**
- [x] Buat file script SQL skema database Supabase lengkap: [`database/supabase-schema.sql`](database/supabase-schema.sql).
- [x] Buat tabel `bookings` beserta kolom-kolomnya (`id`, `customer_name`, `customer_email`, `service_name`, `booking_date`, `status`, `created_at`).
- [x] Konfigurasi *Row Level Security (RLS)* pada tabel `bookings`:
  - Policy `INSERT` untuk role `anon` (agar form publik bisa mengirim data tanpa login).
  - Policy `SELECT` dan `UPDATE` untuk role `authenticated` (agar hanya admin yang login yang bisa membaca/mengubah status data).
- [x] Konfigurasi Supabase Realtime publication (`supabase_realtime`) untuk tabel `bookings`.
- [x] Panduan akun user admin di menu *Authentication > Users* Supabase.

### **Tahap 2: Integrasi Frontend Booking Online**
- [x] Install pustaka client Supabase di proyek (`npm install @supabase/supabase-js`).
- [x] Buat file konfigurasi koneksi Supabase ([`src/supabaseClient.js`](src/supabaseClient.js)) lengkap dengan dukungan live credentials & mode fallback demo lokal.
- [x] Buat penanganan form di halaman booking frontend ([`src/pages/booking.js`](src/pages/booking.js)) yang menjalankan fungsi `supabase.from('bookings').insert([...])` saat tombol submit diklik.
- [x] Tambahkan indikator loading spinner dan penanganan error (*error handling*) interaktif saat data gagal atau berhasil dikirim.

### **Tahap 3: Pembuatan Halaman Web Admin**
- [x] Buat antarmuka Web Admin modern ([`src/pages/admin.js`](src/pages/admin.js) & [`index.html`](index.html)).
- [x] Buat tata letak (*layout*) dashboard admin dengan KPI ringkasan (Total Pesanan, Pending, Confirmed, Cancelled).
- [x] Tulis kode JavaScript untuk mengambil data (`SELECT`) dari tabel `bookings` dan merendernya ke dalam tabel HTML responsif.
- [x] Tambahkan tombol aksi interaktif di tabel admin untuk mengubah status pesanan (`UPDATE` ke `Confirmed`, `Pending`, `Cancelled`).
- [x] Tambahkan sinkronisasi **Supabase Realtime Channel** agar pesanan baru dari publik langsung muncul tanpa perlu refresh halaman.
- [x] Tambahkan modal konfigurasi kredensial Supabase (Project URL & Anon Key) langsung dari antarmuka Web Admin.

### **Tahap 4: Deployment & Pengujian Akhir**
- [x] Uji coba form *booking* secara lokal untuk memastikan data masuk (Terverifikasi via browser test: reservasi baru langsung masuk ke antrean pesanan).
- [x] Uji coba halaman *Web Admin* untuk memastikan data tampil dan status berhasil diperbarui (Terverifikasi via browser test: update status ke `Confirmed`).
- [x] Inisialisasi Git dan commit awal (`git init`, `git add .`, `git commit`).
- [x] Dokumentasikan langkah push ke GitHub dan deploy ke platform hosting (Vercel).

---

## 5. Panduan Menjalankan & Menghubungkan Supabase

### Langkah 1: Jalankan Project Lokal
```bash
# 1. Jalankan development server
npm run dev
```
Buka browser pada alamat: **`http://localhost:5174/`** (atau port yang tertera pada terminal).

### Langkah 2: Setup Database di Dashboard Supabase
1. Buka [https://supabase.com/dashboard](https://supabase.com/dashboard) dan buka proyek Anda.
2. Masuk ke menu **SQL Editor** di bilah kiri.
3. Klik **New query**, salin seluruh isi berkas [`database/supabase-schema.sql`](database/supabase-schema.sql), lalu klik tombol **Run**.
4. Tabel `bookings`, indeks, RLS policy, dan Realtime kini aktif di Supabase!

### Langkah 3: Hubungkan Kredensial Supabase
Anda memiliki dua cara mudah:
* **Cara A (Melalui Web Admin):** Buka Web Admin di browser, klik tombol **"⚡ Konfigurasi Supabase"** di kanan atas, tempelkan Project URL dan Anon Public Key Anda, lalu klik **"Simpan & Sambungkan"**.
* **Cara B (Melalui File .env):** Salin `.env.example` menjadi `.env`, lalu isi:
  ```env
  VITE_SUPABASE_URL=https://proyek-anda.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJh...kunci-anon-anda
  ```

### Langkah 4: Deploy ke Vercel & Push ke GitHub
```bash
# Tambahkan remote repository GitHub Anda
git remote add origin https://github.com/USERNAME/REPO-ANDA.git
git branch -M main
git push -u origin main
```
Di dashboard Vercel, pilih repository tersebut dan tambahkan Environment Variable `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.