# 📊 Sacred Journey Bali - Dedicated Web Admin Dashboard

Repository ini adalah **Web Admin Dashboard** terpusat yang berdiri sendiri (*decoupled/standalone*). Dashboard ini dirancang khusus bagi pengelola untuk memantau seluruh operasional bisnis secara real-time, mulai dari data pemesanan pelanggan, rincian harga, jadwal (hari, tanggal, jam), grafik perhitungan pendapatan bulanan, hingga kotak masuk pesan/kendala dari customer.

---

## 🚀 Fitur Utama Web Admin
1. **Manajemen Booking & Jadwal:** Tabel interaktif untuk melihat siapa yang memesan, layanan yang dipilih, rincian harga (*pricing*), serta slot hari, tanggal, dan jam secara akurat.
2. **Dashboard Keuangan & Grafik Pendapatan:** Visualisasi grafik bulanan (menggunakan Chart.js / ApexCharts) untuk memantau total omzet dan tren pemasukan secara otomatis dari database.
3. **Inbox Pesan & Kontak Pelanggan:** Modul khusus untuk membaca pesan, pertanyaan, atau kendala yang dikirimkan customer, lengkap dengan tombol akses cepat untuk menghubungi via WhatsApp/Telepon.
4. **Sistem Autentikasi Admin:** Login aman berbasis Supabase Auth yang memastikan halaman admin hanya bisa diakses oleh pengelola yang berwenang.

---

## 🛠️ Tech Stack
* **Frontend:** HTML5, CSS3 / Tailwind CSS, JavaScript (Vanilla JS / Vite)
* **Grafik / Chart:** Chart.js
* **Backend & Database:** Supabase (PostgreSQL, Supabase Auth, & Realtime Listener)

---

## 🗄️ Skema Database Supabase (Database Setup)
Pastikan tabel-tabel berikut sudah dibuat di database Supabase Anda:

### 1. Tabel `bookings` (Data Pemesanan & Harga)
* `id` : `uuid` (Primary Key, Default: `gen_random_uuid()`)
* `customer_name` : `text` (Nama pemesan)
* `customer_email` : `text` (Email pemesan)
* `customer_phone` : `text` (Nomor WhatsApp/Telepon untuk komunikasi kendala)
* `service_name` : `text` (Nama layanan)
* `total_price` : `numeric` / `integer` (Rincian harga / nominal pembayaran)
* `booking_date` : `date` (Tanggal pelaksanaan)
* `booking_time` : `time` / `text` (Jam pelaksanaan)
* `status` : `text` (`Pending`, `Confirmed`, `Cancelled`)
* `created_at` : `timestamptz` (Waktu transaksi dibuat)

### 2. Tabel `messages` (Pesan & Kendala dari Customer)
* `id` : `uuid` (Primary Key)
* `sender_name` : `text`
* `sender_email` / `sender_phone` : `text`
* `message_content` : `text` (Isi pesan atau keluhan)
* `is_resolved` : `boolean` (Status penanganan: true/false)
* `created_at` : `timestamptz`

---

## ⚙️ Panduan Instalasi & Menjalankan Project

### Langkah 1: Clone & Install Dependencies
```bash
# Clone repository ini
git clone [https://github.com/USERNAME/sacred-journey-admin.git](https://github.com/USERNAME/sacred-journey-admin.git)
cd sacred-journey-admin

# Install package (jika menggunakan Vite/Node)
npm install