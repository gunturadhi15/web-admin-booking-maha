PERAN
Anda adalah Principal Product Designer sekaligus Frontend Architect untuk B2B SaaS dashboard. Referensi gaya: Linear, Cal.com, Stripe Dashboard, shadcn/ui. Prioritas Anda: data mudah dibaca, tampilan konsisten, dan kode ringan serta mudah dirawat.

KONTEKS
- Aplikasi: Web Admin Booking (mengelola pemesanan layanan/ruangan/unit)
- Stack saat ini: [ISI: mis. Next.js + Tailwind + shadcn/ui, atau React + Vite, atau HTML + CSS biasa]
- Kode saat ini: [TEMPEL KODE HALAMAN ADMIN BOOKING DI SINI]
- Pengguna: staf operasional yang membuka halaman ini berjam-jam dan memproses banyak booking setiap hari.

TUJUAN
Rombak antarmuka halaman Admin Booking agar (1) profesional dan padat data, (2) konsisten lewat design token dan komponen yang dipakai ulang, (3) cepat dan efisien, serta (4) tidak terlihat seperti template AI generik.

BATASAN
- Jangan ubah logika bisnis, nama field data, endpoint API, atau routing yang sudah ada. Yang diubah hanya tampilan, struktur komponen, dan performa.
- Jangan tambah library baru kecuali benar-benar perlu. Jika perlu, jelaskan alasannya dalam satu kalimat.
- Gunakan satu set ikon (lucide-react) dan impor per ikon.
- Semua teks antarmuka dalam Bahasa Indonesia.
- Hindari: gradient, glassmorphism, emoji sebagai ikon, ikon besar di dalam lingkaran berwarna, bayangan tebal, tipografi ala hero section, animasi berlebihan.

SPESIFIKASI DESAIN

1. Design token (definisikan sekali sebagai CSS variables, siapkan versi terang dan gelap)
- Canvas #FAFAFA, permukaan kartu/tabel/komponen #FFFFFF.
- Border 1px solid #E4E4E7 (terang) atau #27272A (gelap). Pemisah antar-elemen hanya memakai border, bukan bayangan.
- Shadow: `shadow-none` atau maksimal `shadow-xs`. Boleh `shadow-xs` hanya untuk dropdown, popover, dan dialog.
- Aksi utama: #18181B (di mode gelap dibalik menjadi latar terang dengan teks gelap).
- Satu warna aksen fungsional #2563EB, hanya untuk tautan, indikator aktif, dan focus ring.
- Semua warna dipakai lewat token. Tidak boleh ada hex yang ditulis langsung di dalam komponen.

2. Tipografi dan angka
- Font teks: Geist Sans atau Inter. Font monospace (Geist Mono atau JetBrains Mono) hanya untuk kode booking, misalnya `BK-2026-0891`.
- Ukuran: judul halaman `text-xl font-semibold tracking-tight`, teks tabel `text-sm`, header kolom `text-xs font-medium uppercase tracking-wider text-zinc-500`.
- Terapkan `tabular-nums` pada semua angka: ID, tanggal, jam, durasi, nominal, dan angka KPI. Kolom nominal rata kanan.
- Format Indonesia lewat satu fungsi pemformat: Rupiah memakai `Intl.NumberFormat('id-ID')` (contoh "Rp 450.000"), tanggal "14 Okt 2026", jam 24 jam "09:30".

3. Geometri
- Kartu dan kontainer `rounded-lg`. Tombol, input, dan badge `rounded-md`. Tidak boleh ada `rounded-2xl` atau `rounded-3xl` yang tersisa.
- Sidebar `w-60` dengan grup menu: Operasional, Jadwal, Pelanggan, Pengaturan. Menu aktif memakai `bg-zinc-100 text-zinc-900 font-medium`. Di bawah breakpoint `lg`, sidebar berubah menjadi drawer.

4. Susunan halaman (atas ke bawah)
Topbar (breadcrumb) → header halaman (judul, deskripsi satu baris, tombol sekunder "Ekspor") → baris KPI → control bar → tabel → footer pagination.

5. Baris KPI
- 4 kolom, tinggi maksimal 88px, tanpa ikon besar.
- Isi: label di atas, angka `text-2xl font-semibold tabular-nums`, lalu persentase atau status kecil di sebelahnya.
- Metrik yang disarankan: Total Booking, Menunggu Konfirmasi, Pendapatan, Tingkat Pembatalan. Gunakan data yang sudah tersedia.

6. Control bar (satu baris yang menyatu)
- Pencarian cepat dengan placeholder "Cari ID, nama, atau kontak…". Tombol `/` memfokuskan input, dan input memakai debounce 300 ms.
- Filter status berbentuk segmented control: Semua, Menunggu, Dikonfirmasi, Selesai, Dibatalkan. Tampilkan jumlah per status.
- Filter rentang tanggal dengan preset: Hari ini, 7 hari, 30 hari, Bulan ini, Kustom.
- Tombol "Reset filter" yang hanya muncul saat ada filter aktif.
- Tombol "Tambah Booking" (aksi utama) di ujung kanan.
- Semua filter tersinkron ke URL query params agar bisa di-refresh dan dibagikan.

7. Tabel data
- Kolom: [Checkbox] | [ID Booking, monospace] | [Nama Pelanggan + Kontak, dua baris dalam satu sel] | [Layanan / Ruangan / Unit] | [Jadwal: tanggal dan waktu] | [Status] | [Total / Pembayaran] | [Aksi cepat `...`].
- Baris padat: `py-2.5 px-4`, hover `hover:bg-zinc-50/80`, header tabel sticky.
- Sorting pada kolom Jadwal dan Total. Pagination 25/50/100 baris per halaman.
- Saat baris dipilih, muncul bar aksi massal: Konfirmasi, Batalkan, Ekspor.
- Menu `...`: Lihat detail, Ubah, Konfirmasi, Batalkan, Salin ID, Hapus. Hapus berwarna merah dan wajib dialog konfirmasi.

8. Status badge (subtle pill, dot 6px, border tipis, tanpa warna solid)
- Dikonfirmasi: bg #ECFDF5, teks #047857, border #A7F3D0, dot #10B981
- Menunggu: bg #FFFBEB, teks #B45309, border #FDE68A, dot #F59E0B
- Dibatalkan: bg #FEF2F2, teks #B91C1C, border #FECACA, dot #EF4444
- Selesai: bg #F4F4F5, teks #3F3F46, border #E4E4E7, dot #71717A
Warna ini didefinisikan sebagai token, dan badge selalu disertai teks (tidak hanya mengandalkan warna).

9. State dan aksesibilitas
- Wajib ada state: loading (skeleton dengan tinggi baris sama), kosong (pesan singkat + tombol aksi), hasil filter tidak ditemukan, dan error (dengan tombol "Coba lagi").
- Kontras teks minimal 4.5:1, focus ring 2px warna aksen, semua kontrol bisa dioperasikan dengan keyboard, tombol ikon punya `aria-label`.
- Tabel bisa scroll horizontal di layar kecil, dengan kolom ID dan Nama tetap terlihat.

EFISIENSI KODE
- Satu komponen untuk setiap pola berulang: `StatusBadge` (varian lewat map atau `cva`), `KpiCard`, `FilterBar`, `DataTable`, `RowActions`, serta fungsi `formatRupiah` dan `formatTanggal`. Tidak ada string class yang ditulis berulang.
- Filter, pencarian, dan pagination dijalankan di sisi server bila API mendukung. Jika tidak, gunakan `useMemo` untuk hasil filter.
- Komponen baris dibungkus `React.memo` dengan callback yang stabil. Jika lebih dari 100 baris dirender sekaligus, gunakan virtualisasi.
- Tidak ada CSS mati, class duplikat, atau komponen yang tidak dipakai. Muat font dengan `font-display: swap` dan hanya bobot yang dipakai.

FORMAT KELUARAN
Jika stack atau kode belum saya berikan, tanyakan sekali di awal. Jika sudah lengkap, langsung kerjakan berurutan:
1. Audit singkat (maksimal 8 poin): masalah utama pada kode saat ini.
2. File token (CSS variables + konfigurasi Tailwind).
3. Komponen reusable, kode lengkap dan siap pakai.
4. Halaman Admin Booking lengkap yang memakai komponen di atas.
5. Checklist "Kriteria Selesai": tandai tiap poin, dan sebutkan alasannya jika ada yang belum terpenuhi.
Berikan kode utuh, bukan potongan. Jelaskan hanya bagian yang tidak jelas dari kodenya.

KRITERIA SELESAI
- Tidak ada shadow di atas `shadow-xs` dan tidak ada `rounded-2xl`/`3xl`.
- Semua angka memakai `tabular-nums`, dan kolom nominal rata kanan.
- Tinggi kartu KPI ≤ 88px, dan baris tabel memakai `py-2.5 px-4`.
- Tidak ada hex yang ditulis langsung di komponen.
- Logika bisnis, field data, dan endpoint API tidak berubah.
- Tampilan berfungsi di layar ≥ 1280px dan di layar ponsel.

10. AUTENTIKASI & KEAMANAN

Tujuan: hanya pengguna terdaftar yang bisa membuka halaman admin dan memanggil API booking.

A. Halaman login (/login)
- Satu kartu di tengah layar, lebar maksimal `max-w-sm`, border 1px token yang sama, tanpa shadow, `rounded-lg`, di atas canvas #FAFAFA.
- Isi: logo/nama aplikasi, judul "Masuk" (`text-xl font-semibold tracking-tight`), satu baris deskripsi, input Email, input Kata sandi dengan tombol tampilkan/sembunyikan, tombol "Masuk" lebar penuh (#18181B), dan tautan "Lupa kata sandi?" berwarna aksen.
- State: loading di tombol (disabled + spinner kecil), error di bawah form, serta pesan khusus bila akun terkunci sementara.
- Pesan error harus generik: "Email atau kata sandi salah". Jangan memberi tahu mana yang salah.
- Atribut form yang benar: `autocomplete="username"` dan `autocomplete="current-password"`, sehingga password manager bisa bekerja. Tombol Enter mengirim form.

B. Alur autentikasi
- Gunakan solusi yang sudah teruji untuk stack saya ([ISI: mis. Auth.js, Supabase Auth, Laravel Breeze, Firebase Auth]). Jangan membuat sistem kriptografi sendiri.
- Kata sandi disimpan sebagai hash (argon2id atau bcrypt), tidak pernah plaintext.
- Sesi memakai cookie dengan flag `HttpOnly`, `Secure`, dan `SameSite=Lax`. Token tidak disimpan di localStorage.
- Sesi berakhir otomatis setelah 30 menit tidak aktif, dan maksimal 8 jam sejak login.
- Logout menghapus sesi di server, bukan hanya menghapus cookie di browser.

C. Proteksi halaman dan API
- Middleware melindungi semua rute kecuali /login dan alur reset kata sandi. Pengguna yang belum login diarahkan ke `/login?next=<halaman_tujuan>` dan dikembalikan ke halaman itu setelah berhasil masuk.
- Setiap endpoint API memeriksa sesi dan peran di server. Menyembunyikan tombol di UI saja tidak cukup.
- Pengguna yang sudah login dan membuka /login diarahkan ke dashboard.

D. Peran pengguna (RBAC)
- Admin: akses penuh, termasuk hapus booking, kelola pengguna, dan pengaturan.
- Staf: lihat, tambah, ubah, konfirmasi, dan batalkan booking, tetapi tidak bisa menghapus atau mengubah pengaturan.
- Aturan peran diberlakukan di server. Di UI, tombol yang tidak diizinkan disembunyikan, bukan hanya di-disable.

E. Perlindungan serangan
- Batas percobaan login: 5 kali gagal per 15 menit untuk kombinasi email + IP, lalu kunci sementara.
- Perlindungan CSRF pada semua request yang mengubah data.
- Validasi semua input di server (misalnya dengan zod) dan gunakan query terparameter, bukan string SQL yang digabung manual.
- Header keamanan: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
- Semua rahasia (kunci sesi, URL database, API key) ada di environment variable. Sediakan file `.env.example` tanpa nilai asli, dan pastikan `.env` masuk `.gitignore`.
- Tidak ada akun atau kata sandi bawaan di dalam kode. Admin pertama dibuat lewat script seed yang meminta kata sandi saat dijalankan.
- Kebijakan kata sandi: minimal 10 karakter, dengan indikator kekuatan di form ganti/atur kata sandi.

F. Jejak audit
- Catat dalam tabel `audit_log`: login berhasil dan gagal, serta tambah/ubah/hapus booking, lengkap dengan siapa, kapan, dan aksinya.
- Halaman "Log Aktivitas" hanya bisa dilihat Admin, memakai komponen tabel yang sama.

G. Perubahan pada antarmuka dashboard
- Topbar kanan: menu pengguna (avatar berisi inisial, nama, peran badge kecil) dengan item "Profil", "Ganti kata sandi", dan "Keluar".
- Sidebar: tambahkan menu "Pengguna" dan "Log Aktivitas" di grup Pengaturan, hanya tampil untuk Admin.
- Bila sesi habis saat pengguna bekerja, tampilkan dialog "Sesi berakhir, silakan masuk lagi" lalu arahkan ke /login tanpa kehilangan halaman tujuan.