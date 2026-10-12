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

## 4. Task Breakdown & Backlog Pekerjaan

Berikut adalah rincian tahapan tugas yang harus diselesaikan:

### **Tahap 1: Konfigurasi Database & Keamanan Supabase**
- [ ] Buat proyek baru di dashboard Supabase.
- [ ] Buat tabel `bookings` beserta kolom-kolomnya sesuai skema di atas.
- [ ] Konfigurasi *Row Level Security (RLS)* pada tabel `bookings`:
  - Buat policy `INSERT` untuk role `anon` (agar form publik bisa mengirim data).
  - Buat policy `SELECT` dan `UPDATE` untuk role `authenticated` (agar hanya admin yang login yang bisa membaca/mengubah data).
- [ ] Buat akun user admin di menu *Authentication > Users* Supabase.

### **Tahap 2: Integrasi Frontend Booking Online**
- [ ] Install pustaka client Supabase di proyek (`npm install @supabase/supabase-js`).
- [ ] Buat file konfigurasi koneksi Supabase (`src/supabaseClient.js`).
- [ ] Ubah kode penanganan form di halaman booking frontend (`src/pages/booking.js`) agar menjalankan fungsi `supabase.from('bookings').insert([...])` saat tombol submit diklik.
- [ ] Tambahkan indikator loading dan penanganan error (*error handling*) ketika data gagal dikirim.

### **Tahap 3: Pembuatan Halaman Web Admin**
- [ ] Buat file halaman admin baru (misal: `admin.html` atau folder `/admin/`).
- [ ] Buat tata letak (*layout*) dashboard admin yang berisi tabel daftar pesanan.
- [ ] Tulis kode JavaScript untuk mengambil data (`SELECT`) dari tabel `bookings` dan merendernya ke dalam tabel HTML.
- [ ] Tambahkan tombol aksi interaktif di tabel admin untuk mengubah status pesanan (`UPDATE`).

### **Tahap 4: Deployment & Pengujian Akhir**
- [ ] Uji coba form *booking* secara lokal untuk memastikan data masuk ke Supabase.
- [ ] Uji coba halaman *Web Admin* untuk memastikan data tampil dan status bisa diperbarui.
- [ ] Lakukan `git add .`, `git commit`, dan `git push` untuk mengirim pembaruan kode ke GitHub.
- [ ] Verifikasi hasil akhir secara *live* melalui platform hosting (Vercel).