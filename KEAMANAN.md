# Panduan & Checklist Keamanan Sistem — Dasbor Untung Usaha (Mahawellnessjourney)

Dokumen ini mendokumentasikan secara rinci arsitektur keamanan, implementasi teknis, dan verifikasi kepatuhan 20 poin keamanan web yang telah diterapkan pada aplikasi **Web Admin Booking & Reservasi Mahawellnessjourney**.

---

## Ringkasan Status 20 Poin Keamanan

| No | Kategori / Poin Keamanan | Status Implementasi | Lokasi File / Konfigurasi |
|:---|:---|:---:|:---|
| 1 | **API Key Aman** | ✅ Terverifikasi | `src/supabaseClient.js`, `.env.example` |
| 2 | **Env Jangan Publik** | ✅ Terverifikasi | `.gitignore`, `vite.config.js` |
| 3 | **No Hardcode Secret** | ✅ Terverifikasi | `src/services/auth.js`, `scripts/scan-secrets.js` |
| 4 | **Debug Mode Off** | ✅ Terverifikasi | `vite.config.js`, `src/utils/logger.js` |
| 5 | **Error Jangan Bocor** | ✅ Terverifikasi | `src/utils/security.js` (`sanitizeErrorMessage`) |
| 6 | **Validasi Input** | ✅ Terverifikasi | `src/utils/validation.js` |
| 7 | **Sanitasi Input** | ✅ Terverifikasi | `src/utils/security.js` (`sanitizeText`, `sanitizePhone`) |
| 8 | **Anti SQL Injection** | ✅ Terverifikasi | `database/supabase-schema.sql`, `@supabase/supabase-js` |
| 9 | **Anti XSS (Cross-Site Scripting)** | ✅ Terverifikasi | `src/utils/security.js` (`escapeHtml`), `vite.config.js` CSP |
| 10 | **Server-Side Auth** | ✅ Terverifikasi | Supabase Auth JWT, PostgreSQL RLS Functions |
| 11 | **Cek Akses User (RBAC)** | ✅ Terverifikasi | `src/services/auth.js`, `database/supabase-schema.sql` |
| 12 | **DB Jangan Publik** | ✅ Terverifikasi | Row Level Security (RLS) di semua tabel |
| 13 | **DB Permission Ketat** | ✅ Terverifikasi | `REVOKE ALL`, `GRANT` minimum eksplisit |
| 14 | **Session Aman** | ✅ Terverifikasi | Timeout 30 menit, Max 8 jam, `SameSite=Strict` |
| 15 | **Scan Upload File** | ✅ Terverifikasi | `src/utils/fileSecurity.js` (Magic Bytes Signature) |
| 16 | **Cek Secret di Git** | ✅ Terverifikasi | `scripts/scan-secrets.js`, `.gitignore` ketat |
| 17 | **Hash Password** | ✅ Terverifikasi | PBKDF2-SHA256 (100.000 iterasi) & Supabase Auth bcrypt |
| 18 | **Batasi Upload File** | ✅ Terverifikasi | Batas 2MB/5MB, Whitelist MIME, UUID Safe Renaming |
| 19 | **Role Admin Aman** | ✅ Terverifikasi | RLS `is_admin()` Function, Immutability Audit Logs |
| 20 | **Reset Password Aman** | ✅ Terverifikasi | Anti-Enumeration, One-time token Supabase Auth |

---

## Rincian Teknis & Cara Kerja per Poin

### 1. API Key Aman
- **Tingkat Bahaya:** Kunci admin (`service_role`) bocor ke browser publik.
- **Implementasi:**
  - Hanya kunci anon publik (`VITE_SUPABASE_ANON_KEY`) yang diperbolehkan di frontend browser.
  - Ditambahkan fungsi pendeteksi `isServiceRoleKey(key)` di [`src/supabaseClient.js`](file:///c:/Users/Guntur/OneDrive/Documents/web%20Admin%20Booking/src/supabaseClient.js). Jika pengguna atau pengembang secara tidak sengaja memasukkan token dengan payload `role: "service_role"`, sistem langsung menolak dan memblokir inisialisasi dengan peringatan keras:
    > *"BAHAYA KEAMANAN: Kunci yang Anda masukkan adalah Service Role Key (Admin Secret). Jangan pernah memasukkan Service Role Key ke aplikasi frontend browser!"*
  - Logging URL proyek dan credential ke `console.log` telah digantikan oleh `logger` yang dibungkam saat build produksi.

### 2. Env Jangan Publik
- **Tingkat Bahaya:** File `.env` ter-commit ke repositori Git publik atau tersaji sebagai file statis di web server.
- **Implementasi:**
  - File [`.gitignore`](file:///c:/Users/Guntur/OneDrive/Documents/web%20Admin%20Booking/.gitignore) dikonfigurasi secara agresif mengecualikan `.env`, `.env.*`, `*.local`, `credentials.json`, `*.pem`, `*.key`.
  - Hanya [`.env.example`](file:///c:/Users/Guntur/OneDrive/Documents/web%20Admin%20Booking/.env.example) yang dipertahankan sebagai template dengan nilai dummy/placeholder yang aman (`your-project-id.supabase.co`).
  - [`vite.config.js`](file:///c:/Users/Guntur/OneDrive/Documents/web%20Admin%20Booking/vite.config.js) hanya mengekspos environment variables yang secara spesifik diawali dengan `VITE_` atau `NEXT_PUBLIC_`.

### 3. No Hardcode Secret
- **Tingkat Bahaya:** Password default atau token API tersimpan dalam kode JavaScript yang dapat diintip lewat Developer Tools.
- **Implementasi:**
  - Pintu belakang (backdoor) dummy login `password.length >= 4` telah dihapus total.
  - Teks petunjuk demo yang sebelumnya mencantumkan password plaintext (`Admin12345!`) di antarmuka halaman login telah dihapus dan diganti dengan banner pengamanan resmi.
  - Pengguna seed demo disimpan menggunakan hash kriptografis PBKDF2 (SHA-256) dengan salt unik (`mahawellness_salt_2026`).

### 4. Debug Mode Off
- **Tingkat Bahaya:** `console.log` dan `debugger` di browser menampilkan alur query, struktur objek database, dan credential.
- **Implementasi:**
  - Dalam [`vite.config.js`](file:///c:/Users/Guntur/OneDrive/Documents/web%20Admin%20Booking/vite.config.js), build esbuild dikonfigurasi dengan:
    ```javascript
    esbuild: {
      drop: isProd ? ['console', 'debugger'] : []
    }
    ```
    Seluruh statement `console.*` dan `debugger` akan dihapus otomatis dari file bundel produksi (`dist/`).
  - Disediakan modul [`src/utils/logger.js`](file:///c:/Users/Guntur/OneDrive/Documents/web%20Admin%20Booking/src/utils/logger.js) yang membungkam log non-kritis jika `import.meta.env.PROD` bernilai `true`.

### 5. Error Jangan Bocor (Anti-Information Leakage)
- **Tingkat Bahaya:** Pesan error Postgres (seperti nama tabel, nama kolom, foreign key violation) membocorkan arsitektur backend ke penyerang.
- **Implementasi:**
  - Diterapkan fungsi `sanitizeErrorMessage(err)` di [`src/utils/security.js`](file:///c:/Users/Guntur/OneDrive/Documents/web%20Admin%20Booking/src/utils/security.js).
  - Pesan error database diganti menjadi pesan ramah pengguna: *"Gagal memproses data karena pembatasan hak akses atau validasi sistem."*
  - Error login diubah menjadi pesan generik tanpa memberitahu apakah email atau password yang salah (mencegah enumerasi akun).

### 6. Validasi Input Terpusat
- **Tingkat Bahaya:** Input malformed memicu kerusakan state, error database, atau bypass logika bisnis.
- **Implementasi:**
  - Dibuat modul [`src/utils/validation.js`](file:///c:/Users/Guntur/OneDrive/Documents/web%20Admin%20Booking/src/utils/validation.js).
  - Memeriksa:
    - Format RFC alamat email.
    - Format nomor telepon (minimal 8 digit angka, standar WhatsApp/E.164).
    - Format ISO tanggal dan jam (24 jam `HH:mm`).
    - Validasi rentang harga (bukan `NaN`, bukan angka negatif, nilai wajar).
    - Whitelist status pesanan (`Baru`, `Dikonfirmasi`, `Diproses`, `Selesai`, `Dibatalkan`).

### 7. Sanitasi Input
- **Tingkat Bahaya:** Masuknya karakter kontrol, tag tersembunyi, atau spasi berlebih.
- **Implementasi:**
  - `sanitizeText(str, maxLength)`: Memotong karakter kontrol ASCII non-printable, memangkas spasi, dan membatasi panjang teks.
  - `sanitizePhone(phone)`: Menstandarkan format `08...` menjadi `628...` dan menghapus karakter non-digit.
  - `sanitizeNumeric(val, min, max, defaultVal)`: Menjamin nilai float/int aman dari `Infinity`/`NaN`.

### 8. Anti SQL Injection
- **Tingkat Bahaya:** Manipulasi query database melalui input pengguna.
- **Implementasi:**
  - Aplikasi menggunakan query builder resmi `@supabase/supabase-js` (`.select()`, `.eq()`, `.ilike()`) yang secara otomatis menggunakan parameterized query PostgREST.
  - Pada [`database/supabase-schema.sql`](file:///c:/Users/Guntur/OneDrive/Documents/web%20Admin%20Booking/database/supabase-schema.sql), fungsi database seperti `is_admin()` dideklarasikan dengan `SECURITY DEFINER` dan `SET search_path = public` untuk mencegah pencurian konteks eksekusi (Search Path Hijacking).

### 9. Anti XSS (Cross-Site Scripting)
- **Tingkat Bahaya:** Penyisipan skrip `<script>alert(1)</script>` atau atribut `onload`/`onerror` ke dalam template literal HTML.
- **Implementasi:**
  - Seluruh data dinamis yang dirender ke antarmuka wajib melewati `escapeHtml()` dari [`src/utils/security.js`](file:///c:/Users/Guntur/OneDrive/Documents/web%20Admin%20Booking/src/utils/security.js).
  - Header HTTP **Content-Security-Policy (CSP)** ditambahkan pada [`vite.config.js`](file:///c:/Users/Guntur/OneDrive/Documents/web%20Admin%20Booking/vite.config.js) dan meta tag pada [`index.html`](file:///c:/Users/Guntur/OneDrive/Documents/web%20Admin%20Booking/index.html), membatasi sumber script, style, font, dan koneksi hanya ke domain resmi Supabase.
  - Header `X-Content-Type-Options: nosniff` dan `X-Frame-Options: DENY` aktif untuk mencegah MIME sniffing dan Clickjacking.

### 10. Server-Side Auth
- **Tingkat Bahaya:** Otentikasi yang hanya bergantung pada JavaScript di sisi klien dapat dipalsukan lewat DevTools.
- **Implementasi:**
  - Pertahanan utama berada di server Supabase via JWT Bearer Token.
  - Setiap query ke tabel database diverifikasi oleh engine Row Level Security (RLS) PostgreSQL. Manipulasi `localStorage` di peramban tidak akan mengizinkan akses data nyata tanpa token JWT Supabase yang ditandatangani secara kriptografis oleh server.

### 11. Cek Akses User (Role-Based Access Control)
- **Tingkat Bahaya:** Staf biasa mengeksekusi aksi administratif (seperti menghapus pesanan atau mengubah akun pengguna).
- **Implementasi:**
  - Sisi Klien: Fungsi `isAdmin()` dan `isStaff()` mengontrol visibilitas tombol Hapus, menu Pengguna, dan menu Tutup Buku.
  - Sisi Server (RLS): Policy `DELETE` pada tabel `orders`, `customers`, `order_costs`, `financial_transactions`, serta `admins` dikunci dengan syarat `USING (public.is_admin())`.

### 12. DB Jangan Publik
- **Tingkat Bahaya:** REST API Supabase terbuka bebas untuk pembacaan data tanpa otentikasi.
- **Implementasi:**
  - RLS diaktifkan (`ENABLE ROW LEVEL SECURITY`) pada seluruh 8 tabel utama.
  - Akses `anon` (publik/tamu tanpa login) hanya diizinkan untuk melakukan `INSERT` ke formulir pesanan dan formulir data kontak pelanggan. Seluruh pembacaan (`SELECT`), pengubahan (`UPDATE`), dan penghapusan (`DELETE`) pada data pesanan, biaya HPP, transaksi keuangan, laporan tutup buku, dan audit log ditutup rapat untuk publik.

### 13. DB Permission Ketat (Least Privilege)
- **Tingkat Bahaya:** Peran database default memiliki hak akses `ALL` secara berlebihan.
- **Implementasi:**
  - Perintah `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;` dan `REVOKE ALL ... FROM authenticated;` dijalankan di awal skema.
  - Hak diberikan secara spesifik:
    - `anon`: hanya `GRANT INSERT ON public.orders, public.customers`.
    - `authenticated`: `GRANT SELECT, INSERT, UPDATE`. Izin `DELETE` dikontrol ketat melalui RLS filter.
    - `audit_logs`: hanya `GRANT INSERT` dan `SELECT` untuk admin. Tidak ada user yang memiliki izin `UPDATE` atau `DELETE` (audit trail permanen anti-manipulasi).

### 14. Session Aman
- **Tingkat Bahaya:** Sesi tidak pernah kedaluwarsa sehingga akun tetap terbuka pada komputer bersama.
- **Implementasi:**
  - **Inactivity Timeout:** Sesi otomatis dibatalkan jika tidak ada interaksi mouse/keyboard selama 30 menit (`SESSION_CONFIG.INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000`).
  - **Absolute Lifetime:** Sesi otomatis berakhir setelah 8 jam sejak login awal (`8 * 60 * 60 * 1000`).
  - **Heartbeat Listener:** Pemantauan aktivitas (`mousemove`, `keydown`, `touchstart`, `scroll`) yang di-throttle setiap 30 detik.
  - **Cookie Security:** Cookie sesi disetel dengan atribut `SameSite=Strict; max-age=28800` dan flag `Secure` jika berjalan di protokol HTTPS.

### 15. Scan Upload File & 18. Batasi Upload File
- **Tingkat Bahaya:** Pengunggahan malware, webshell, script berbahaya (`.php`, `.exe`), atau file berukuran raksasa yang menghabiskan kuota server.
- **Implementasi:**
  - Dibuat modul [`src/utils/fileSecurity.js`](file:///c:/Users/Guntur/OneDrive/Documents/web%20Admin%20Booking/src/utils/fileSecurity.js).
  - **Magic Bytes Binary Inspection:** Memeriksa 16 byte pertama berkas secara biner menggunakan `ArrayBuffer`:
    - JPEG: `0xFF, 0xD8, 0xFF`
    - PNG: `0x89, 0x50, 0x4E, 0x47`
    - WEBP: `RIFF .... WEBP`
    - PDF: `%PDF-` (`0x25, 0x50, 0x44, 0x46`)
  - **Batas Ukuran:** Maksimal 2 MB untuk gambar (JPG, PNG, WEBP) dan 5 MB untuk dokumen PDF.
  - **Anti Double-Extension:** Mendeteksi dan menolak ekstensi ganda seperti `invoice.php.png` atau `file.exe.jpg`.
  - **Safe Renaming:** File yang diunggah ke storage otomatis diubah namanya menjadi UUID acak kriptografis (`attachment_c28f...jpg`), mencegah serangan Path Traversal (`../`) dan eksekusi nama asli file.

### 16. Cek Secret di Git
- **Tingkat Bahaya:** Token, credential, atau kunci privat tersimpan di riwayat commit Git.
- **Implementasi:**
  - Dibuat script scanner otomatis [`scripts/scan-secrets.js`](file:///c:/Users/Guntur/OneDrive/Documents/web%20Admin%20Booking/scripts/scan-secrets.js).
  - Dapat dijalankan sewaktu-waktu dengan perintah:
    ```bash
    npm run scan:secrets
    ```
  - Memeriksa ekspresi reguler untuk: Kunci privat PEM, JWT service role, AWS keys, Stripe secret, token GitHub, password hardcoded, dan koneksi URL Postgres dengan password.
  - Status pemindaian repositori saat ini: **BERSIH (0 Temuan Bocor)**.

### 17. Hash Password
- **Tingkat Bahaya:** Kata sandi disimpan sebagai teks biasa (plaintext) di database.
- **Implementasi:**
  - Pada mode produksi Supabase Auth: Kata sandi diproses dan di-hash oleh Supabase Auth menggunakan algoritma standar industri **bcrypt / Argon2**.
  - Pada mode offline / fallback lokal: Diterapkan algoritma **PBKDF2** via browser Web Crypto API (`crypto.subtle`) dengan derivasi kunci SHA-256 dan 100.000 iterasi putaran dengan cryptographic salt. Kata sandi tidak pernah disimpan dalam format teks mentah.
  - Kebijakan kekuatan kata sandi: minimal 10 karakter, memuat kombinasi huruf besar, huruf kecil, angka, dan simbol khusus.

### 19. Role Admin Aman & Anti-Privilege Escalation
- **Tingkat Bahaya:** Staf biasa menaikkan perannya sendiri menjadi admin via query API.
- **Implementasi:**
  - Fungsi PostgreSQL `public.is_admin()` memvalidasi klaim role langsung dari tabel `public.admins` atau JWT token yang ditandatangani Supabase Auth.
  - Kolom `role` pada tabel `admins` tidak dapat dimodifikasi oleh pengguna non-admin karena diproteksi oleh RLS policy `Allow only admin update admins`.
  - Seluruh perubahan data penting (login sukses, login gagal, tambah pengguna, ganti password, ubah status booking) dicatat ke dalam tabel `audit_logs` yang bersifat append-only.

### 20. Reset Password Aman
- **Tingkat Bahaya:** Fitur reset password yang mengizinkan pergantian password sepihak tanpa verifikasi kepemilikan email atau membocorkan daftar email pengguna.
- **Implementasi:**
  - Diterapkan fungsi `requestPasswordReset(email)` di [`src/services/auth.js`](file:///c:/Users/Guntur/OneDrive/Documents/web%20Admin%20Booking/src/services/auth.js).
  - Menggunakan API resmi Supabase Auth `resetPasswordForEmail()` yang mengirimkan link berisi token satu kali pakai (one-time token) dengan masa kedaluwarsa singkat (15 menit).
  - Respon yang diberikan ke antarmuka bersifat **generik** (anti-user enumeration):
    > *"Jika alamat email terdaftar di sistem, tautan pemulihan kata sandi telah dikirimkan ke kotak masuk Anda."*
  - Dilengkapi rate limiting (cooldown 60 detik) untuk mencegah spam permintaan email reset.

---

## Panduan Perawatan Keamanan untuk Tim Pengembang

1. **Sebelum Melakukan Git Commit / Push:**
   Jalankan pemeriksaan berkala:
   ```bash
   npm run scan:secrets
   npm run build
   ```
2. **Saat Menghubungkan ke Supabase Cloud Baru:**
   - Ambil hanya `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dari Dashboard Supabase (*Project Settings > API*).
   - Jangan pernah menyalin `service_role` (secret) key ke file `.env` yang dipakai frontend.
   - Jalankan script SQL yang ada di [`database/supabase-schema.sql`](file:///c:/Users/Guntur/OneDrive/Documents/web%20Admin%20Booking/database/supabase-schema.sql) pada Supabase SQL Editor untuk menerapkan RLS, permission, dan storage bucket yang aman.
3. **Penyimpanan Berkas (Upload):**
   Gunakan selalu fungsi `validateUploadedFile(file)` dari `src/utils/fileSecurity.js` sebelum mengunggah dokumen atau bukti pembayaran ke storage Supabase.
