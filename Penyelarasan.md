# 🏛️ MASTER SYSTEM PROMPT: PENYELARASAN ALUR (FLOW) & REBRANDING WEB ADMIN "MAHAWELLNESSJOURNEY"

Halo AI / Tim Developer,
Tugas Anda adalah menyesuaikan **Aplikasi Web Admin (Standalone)** yang sudah ada agar terintegrasi penuh dengan sistem reservasi wisata spiritual dan kesehatan Bali **"Mahawellnessjourney"**.

> **⚠️ ATURAN UTAMA & BATASAN PERUBAHAN (WAJIB DIIKUTI):**
> 1. **JANGAN UBAH LAYOUT & STRUKTUR KOMPONEN:** Pertahankan tata letak halaman (*page layout*), struktur tabel, *card*, *sidebar*, dan komponen UI yang sudah ada di Web Admin saat ini. Jangan membangun ulang desain antarmuka dari nol.
> 2. **FOKUS PADA PERUBAHAN ALUR (FLOW SAJA):** Ubah dan sesuaikan hanya pada bagian alur data (*data flow*), integrasi endpoint API, pemetaan *field* database, serta aturan logika bisnis agar mengikuti alur sistem *Mahawellnessjourney*.
> 3. **PERUBAHAN VISUAL HANYA WARNA, LOGO, & IKON:** Untuk sisi tampilan (UI), Anda **hanya diperbolehkan** mengganti **Palet Warna (*Color Theme*)**, **Logo Brand**, dan **Ikon (*Icons*)** agar relevan dengan identitas *Mahawellnessjourney*.
> 4. **JANGAN UBAH DATABASE UTAMA:** Aplikasi Web Admin ini berdiri terpisah dari website pemesanan pelanggan (*Public Booking Engine*). Jangan mengubah struktur tabel database utama yang sudah berjalan.

Berikut adalah spesifikasi alur data, skema database, payload JSON, endpoint API, serta logika bisnis yang **WAJIB** diterapkan ke dalam kerangka Web Admin yang sudah ada:

---

## 1. 🎨 ATURAN PENYESUAIAN VISUAL (HANYA WARNA, LOGO, & IKON)

Tanpa mengubah bentuk atau posisi komponen yang sudah ada, lakukan penyesuaian ringan berikut:
1. **Logo & Nama Aplikasi:** Ganti aset logo dan judul pada *header/sidebar* serta halaman login menjadi **Mahawellnessjourney Admin**.
2. **Palet Warna (*Theme Colors*):** Sesuaikan variabel warna utama (*primary/secondary/accent* pada CSS/Tailwind config) ke nuansa *wellness & spiritual sanctuary* yang tenang dan bersih, sambil mempertahankan warna indikator status standar (*Pending* = Kuning/Oranye, *Paid/Confirmed* = Hijau, *Cancelled/Failed* = Merah).
3. **Ikonografi (*Icons*):** Ganti ikon pada *metric cards*, menu navigasi, dan kategori layanan agar sesuai dengan konteks reservasi tur spiritual, *retreat*, *numerology*, dan *healing*.

---

## 2. 📦 STANDAR FORMAT KODE UNIK (DALAM ALUR DATA)

Pastikan alur pencarian, filter, dan tampilan tabel pada Web Admin mengenali format ID berikut dari *Frontend Booking Engine*:

1. **Kode Booking (`booking_id`):**
   - Format: `MWJ-{NAMA-PRODUK}-{YYYYMMDD}-{4_DIGIT_RANDOM}`
   - Contoh: `MWJ-SACRED-DISCOVERY-20261020-7491`
2. **Nomor Invoice (`invoice_number`):**
   - Format: `INV-{8_DIGIT_TIMESTAMP}`
   - Contoh: `INV-46289160`
3. **Order ID & Idempotency Key Transaksi (`order_id`):**
   - Format: `TRX-{USER_ID}-{YYYYMMDDHHMMSS}-{RANDOM}`
   - Contoh: `TRX-102-20261020113000-A9F2`

---

## 3. 🧾 STRUKTUR JSON PAYLOAD DARI FRONTEND BOOKING

Alur penerimaan data di Web Admin harus memproses objek JSON dengan struktur berikut:

```json
{
  "booking_id": "MWJ-SACRED-DISCOVERY-20261020-7491",
  "invoice_number": "INV-46289160",
  "order_id": "TRX-102-20261020113000-A9F2",
  "service_id": "SRV001",
  "service_name": "Spiritual Temple Tour",
  "package_id": "PKG001",
  "package_name": "Sacred Discovery",
  "booking_date": "2026-10-25",
  "booking_time": "09:00",
  "pax": 2,
  "customer": {
    "name": "Sarah Jenkins",
    "email": "sarah.jenkins@example.com",
    "phone": "6281234567890",
    "country_code": "+62",
    "nationality": "Australia",
    "dob": "1992-06-14"
  },
  "pricing": {
    "price_per_pax": 350000,
    "subtotal": 700000,
    "tax": 0,
    "tax_note": "100% Tax-Free Nett",
    "total_amount": 700000,
    "currency": "IDR"
  },
  "payment": {
    "method": "qris",
    "status": "pending",
    "expired_at": "2026-10-21T11:30:00.000Z"
  },
  "notes": "[Origin: Australia] | [Category: Tour] | [Pax: 2] | [Time: 09:00 WITA] | [DOB: 1992-06-14] | [Payment: QRIS] | User Notes: Mohon disiapkan sarung sembahyang ukuran M.",
  "status": "pending",
  "created_at": "2026-10-20T11:30:00.000Z"
}
```

---

## 4. 🗄️ PEMETAAN SKEMA DATABASE KE KOMPONEN YANG ADA

Hubungkan komponen tabel dan kartu yang sudah ada di Web Admin ke skema database **Supabase (PostgreSQL)** / **REST API** berikut:

### A. Tabel Utama: `bookings`
| Kolom Database | Mapping JSON / Fallback Alias | Tipe Data | Alur Penanganan di Komponen Admin |
| :--- | :--- | :--- | :--- |
| `booking_id` | `id` / `booking_id` | `VARCHAR(50)` | Primary Key (`MWJ-SACRED-DISCOVERY-20261020-7491`) |
| `invoice_number` | `invoice_number` | `VARCHAR(50)` | Referensi nomor invoice (`INV-46289160`) |
| `customer_name` | `customer.name` | `VARCHAR(150)` | Ditampilkan pada kolom Nama Tamu |
| `customer_phone` | `customer.phone` | `VARCHAR(30)` | Format E.164 tanpa `+` (`6281234567890`) untuk alur klik WhatsApp |
| `customer_email` | `customer.email` | `VARCHAR(150)` | Email aktif tamu |
| `service_id` | `service_id` | `VARCHAR(20)` | `SRV001` (Tour), `SRV002` (Retreat), `SRV003` (Numerology), `SRV004` (Healing) |
| `package_name` | `package_name` | `VARCHAR(150)` | Nama paket yang dipilih |
| `booking_date` | `tour_date` / `booking_date` | `DATE` | Tanggal kunjungan (`YYYY-MM-DD`). *Mapper harus mengenali `tour_date` maupun `booking_date`.* |
| `booking_time` | `booking_time` | `VARCHAR(15)` | Jam sesi WITA (`09:00` atau `09:00 WITA`) |
| `pax` | `pax` | `INTEGER` | Jumlah peserta (default: `1`) |
| `total_amount` | `total_price` / `pricing.total_amount` | `NUMERIC(12,2)` | Total harga nett tanpa pajak. *Mapper harus mengenali `total_price` atau `total_amount`.* |
| `tax` | `pricing.tax` | `NUMERIC` | Selalu `0` (100% Tax-Free Nett) |
| `status` | `status` | `VARCHAR(20)` | `pending`, `confirmed`, `paid`, `completed`, `cancelled` |
| `notes` | `notes` | `TEXT` | String berformat: `[Origin: ...] \| [Category: ...] \| [Pax: ...] \| [Time: ...] \| [DOB: ...] \| [Payment: ...] \| User Notes: ...` |
| `created_at` | `created_at` | `TIMESTAMP` | Waktu reservasi dibuat |

> **💡 Alur Parsing Kolom `notes`:**
> Tambahkan fungsi *parser* pada alur pengambilan data untuk memecah string `notes` (mengambil data *Origin*, *Category*, *DOB/Tanggal Lahir*, *Payment*, dan *User Notes*) lalu masukkan nilainya ke dalam *field* yang sudah ada pada modal/drawer detail pesanan.

### B. Tabel Pembayaran: `payments`
| Kolom Database | Tipe Data | Constraint | Alur Penanganan |
| :--- | :--- | :--- | :--- |
| `payment_id` | `VARCHAR(50)` | PRIMARY KEY | ID unik pembayaran |
| `booking_id` | `VARCHAR(50)` | FOREIGN KEY | Relasi ke `bookings.booking_id` |
| `order_id` | `VARCHAR(64)` | UNIQUE | ID transaksi unik pencegah *double charge* |
| `idempotency_key` | `VARCHAR(64)` | UNIQUE | Kunci pencegah pemrosesan bayar ganda |
| `payment_method` | `VARCHAR(50)` | NOT NULL | `qris`, `bca_va`, `mandiri_va`, `credit_card`, `cash` |
| `amount` | `DECIMAL(12,2)` | NOT NULL | Nominal pembayaran |
| `status` | `VARCHAR(20)` | NOT NULL | `pending`, `paid`, `expired`, `failed` |
| `paid_at` | `TIMESTAMP` | NULL | Waktu pembayaran lunas |
| `expired_at` | `TIMESTAMP` | NOT NULL | Batas waktu pembayaran (24 jam dari order) |

---

## 5. 🌐 ALUR INTEGRASI ENDPOINT REST API

Hubungkan fungsi *fetching* dan tombol aksi pada UI yang sudah ada ke endpoint berikut:

1. **`GET /api/admin/bookings`**
   - *Query Params:* `?status=all|pending|confirmed|paid|completed|cancelled&date=YYYY-MM-DD&search=...`
   - *Alur:* Menyuplai data ke komponen kartu metrik (KPI) dan tabel daftar pemesanan yang sudah ada.
2. **`GET /api/admin/availability?date=YYYY-MM-DD`**
   - *Alur:* Menyuplai status ketersediaan slot jam, kuota peserta (maksimal 8–10 pax per sesi), dan status kunci slot 2 jam ke tampilan jadwal/kalender yang ada.
3. **`GET /api/admin/payments`**
   - *Query Params:* `?status=paid|pending|expired|failed&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
   - *Alur:* Menyuplai data rekapitulasi pendapatan (*revenue analytics*) dan riwayat mutasi pembayaran.
4. **`GET /api/admin/customers`**
   - *Alur:* Menyuplai daftar pelanggan, nomor WhatsApp, kebangsaan, tanggal lahir (DOB), dan riwayat transaksi ke bagian data pelanggan.
5. **`PATCH /api/admin/bookings/:booking_id/status`**
   - *Body:* `{ "status": "confirmed" | "paid" | "completed" | "cancelled", "payment_method": "..." }`
   - *Alur:* Dipanggil saat admin menekan tombol **Konfirmasi / Tandai Lunas** atau **Batalkan Booking** pada baris tabel yang ada.
6. **`PATCH /api/admin/bookings/:booking_id/reschedule`**
   - *Body:* `{ "booking_date": "YYYY-MM-DD", "booking_time": "HH:mm" }`
   - *Alur:* Dipanggil saat admin mengubah jadwal kunjungan tamu setelah lolos validasi ketersediaan slot.
7. **`POST /api/admin/customers/notify`** (atau *Direct WhatsApp Action*)
   - *Alur:* Saat tombol hubungi/WhatsApp diklik, arahkan ke `https://wa.me/{customer_phone}?text={encoded_message}` dengan pesan otomatis berisi Nama Tamu, Kode Booking, Paket, Tanggal, dan Jam Sesi.
8. **`POST /api/payments/webhook`**
   - *Alur:* Menerima notifikasi pembayaran otomatis dengan validasi `idempotency_key`.

---

## 6. 🔄 PENYESUAIAN ALUR KERJA (BUSINESS FLOW) PADA FITUR YANG ADA

Tanpa mengubah bentuk desain komponen, pastikan alur kerja (*workflow*) pada komponen yang ada berjalan sebagai berikut:

1. **Alur Kartu Ringkasan (KPI Cards):**
   - Hitung dan tampilkan data: **Total Pendapatan Bulan Ini (Rp Nett)**, **Booking Hari Ini & Besok**, **Pesanan Menunggu Konfirmasi (`pending`)**, serta **Tamu Aktif Hari Ini**.
2. **Alur Tabel & Tombol Aksi Cepat:**
   - Filter dan kolom pencarian terhubung langsung ke parameter `status`, `date`, dan `search` (`MWJ-...`, `INV-...`, nama, atau nomor WA).
   - Tombol aksi yang ada dihubungkan ke fungsi: **Konfirmasi/Lunas**, **Kirim WA**, **Reschedule**, dan **Batalkan**.
3. **Alur Detail Pesanan & Invoice:**
   - Komponen modal/detail yang ada harus menampilkan hasil *parsing* data `notes` (terutama **Tanggal Lahir/DOB** untuk sesi Numerologi/Healing dan **Catatan Khusus Tamu**).
   - Perhitungan rincian tagihan menampilkan **0% Pajak (100% Tax-Free)**, di mana `subtotal` sama persis dengan `total_amount`.
4. **Alur Kunci Jadwal 2 Jam (*2-Hour Booking Lock*) & Idempotensi:**
   - Setiap pesanan aktif pada jam `T` (misal `09:00`) otomatis mengunci ketersediaan slot dari `T` hingga `T + 2 jam` (`09:00 - 11:00 WITA`).
   - Jika status pesanan diubah menjadi `cancelled` atau `expired`, lepaskan kunci slot waktu tersebut secara otomatis (*auto-release*).
   - Cegah pemrosesan status `paid` ganda pada `order_id` yang sama agar perhitungan total pendapatan di dashboard tidak terduplikasi.