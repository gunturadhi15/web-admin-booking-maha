# Kebijakan Keamanan (Security Policy) — Mahawellnessjourney Admin

Dokumen ini menjelaskan kebijakan keamanan dan prosedur pelaporan kerentanan untuk sistem **Web Admin Booking & Reservasi Mahawellnessjourney**.

---

## 1. Versi yang Didukung (Supported Versions)

Pembaruan keamanan aktif diterapkan pada versi berikut:

| Versi | Didukung | Keterangan |
| :--- | :---: | :--- |
| `1.0.x` (Main / Latest) | :white_check_mark: | Menggunakan Vite, Supabase Auth, & PBKDF2 Password Hashing |
| `< 1.0.0` | :x: | Versi rintisan lama tanpa pengamanan 20 poin |

---

## 2. Standar & Arsitektur Keamanan yang Diterapkan

Sistem telah diaudit dan memenuhi **20 Standar Keamanan Aplikasi Web**:

1. **Perlindungan Kunci API**: Hanya Anon Public Key yang diizinkan di frontend browser; Service Role Key diblokir otomatis.
2. **Kerahasiaan Lingkungan (`.env`)**: File kredensial dikecualikan secara agresif oleh `.gitignore`.
3. **Bebas Secret Hardcode**: Tidak ada password plaintext atau secret API dalam kode sumber (diverifikasi lewat `npm run scan:secrets`).
4. **Debug Mode Nonaktif**: Seluruh statement `console.log` dan `debugger` dihilangkan otomatis saat build produksi (`npm run build`).
5. **Pencegahan Kebocoran Error**: Error database disanitasi sehingga nama tabel/kolom tidak terekspos ke pengguna.
6. **Validasi Input Terpusat**: Format email, nomor telepon, tanggal, jam, dan harga divalidasi sebelum diproses.
7. **Sanitasi Input**: Karakter kontrol non-printable dan whitespace berlebih dipangkas.
8. **Anti-SQL Injection**: Menggunakan parameterized query via `@supabase/supabase-js` dan `SECURITY DEFINER` dengan search_path eksplisit di PostgreSQL.
9. **Anti-XSS**: Pembersihan string via `escapeHtml()` dan Content Security Policy (CSP).
10. **Autentikasi Server-Side**: Menggunakan token JWT Supabase Auth dengan verifikasi kriptografis.
11. **Role-Based Access Control (RBAC)**: Pemisahan hak akses antara `Admin` dan `Staff`.
12. **Database Tertutup (RLS Aktif)**: Row Level Security diterapkan di seluruh tabel database (`bookings`, `orders`, `financial_transactions`, `order_costs`, `audit_logs`).
13. **Hak Akses Database Minimum**: Izin tabel publik dicabut (`REVOKE ALL`) dan hanya diberikan sesuai otorisasi JWT.
14. **Keamanan Sesi**: Timeout inaktivitas 30 menit dan batas kedaluwarsa sesi absolut 8 jam.
15. **Verifikasi Integritas File Upload**: Deteksi magic bytes header file untuk mencegah upload file berbahaya tersamar.
16. **Pemindai Rahasia Git Otomatis**: Dilengkapi script `scripts/scan-secrets.js` terintegrasi.
17. **Hashing Password**: Menggunakan algoritma hash kriptografis PBKDF2-SHA256 (100.000 iterasi) dan bcrypt.
18. **Pembatasan Ukuran File Upload**: Maksimal 2MB untuk avatar dan 5MB untuk dokumen, dengan penamaan acak UUID.
19. **Proteksi Role Admin**: Mutasi role admin dan penghapusan pesanan hanya diizinkan melalui server-side policy.
20. **Reset Password Aman**: Token reset sekali pakai dengan pencegahan enumerasi akun.

> Rincian teknis lengkap tersedia pada dokumen [`KEAMANAN.md`](file:///c:/Users/Guntur/OneDrive/Documents/web%20Admin%20Booking/KEAMANAN.md).

---

## 3. Pelaporan Kerentanan (Reporting a Vulnerability)

Jika Anda menemukan potensi celah keamanan atau kerentanan:

1. **Jangan Laporkan Melalui Publik Issue GitHub.**
2. Kirimkan laporan secara rahasia melalui email ke:  
   📧 **security@mahawellnessjourney.com** / **gunturadhi15@gmail.com**
3. Sertakan rincian:
   - Langkah reproduksi celah (Proof of Concept)
   - Dampak yang teridentifikasi
   - Komponen/modul yang terdampak
4. **Waktu Tanggap:** Kami akan meninjau dan merespons laporan dalam waktu **1x24 jam kerja**.
