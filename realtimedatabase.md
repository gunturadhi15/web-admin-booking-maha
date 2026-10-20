# ⚡ PROMPT TAMBAHAN: AKTIFKAN REAL-TIME AUTO-UPDATE TANPA REFRESH HALAMAN

Tolong perbaiki alur pengambilan data (data fetching) di Web Admin ini agar setiap ada booking baru masuk, perubahan status, reschedule, atau hapus data, tampilan tabel dan kartu KPI langsung ter-update otomatis secara real-time TANPA perlu refresh halaman (F5) dan TANPA mengubah desain/layout yang sudah ada.

Terapkan mekanisme ganda (Hybrid Real-Time) berikut pada halaman Dashboard / Tabel Booking:

### 1. Supabase Realtime WebSocket Listener (Utama)
Jika komponen terhubung ke Supabase Client, pasang subscription `postgres_changes` di dalam `useEffect`:
```javascript
const channel = supabase
  .channel('admin-realtime-bookings')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'bookings' },
    (payload) => {
      // Panggil ulang fungsi fetchBookings() / update state secara langsung
      fetchBookingsSilently();
    }
  )
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'payments' },
    () => {
      fetchBookingsSilently();
    }
  )
  .subscribe();

return () => {
  supabase.removeChannel(channel);
};
```

### 2. Silent Background Polling & Window Focus Sync (Cadangan Anti-Gagal)
Jika Web Admin mengambil data murni lewat REST API (`/api/admin/bookings`) atau jika koneksi WebSocket terputus sementara:
- Tambahkan background polling (`setInterval`) setiap **5–10 detik** yang memanggil fungsi `fetchBookingsSilently()` di latar belakang.
- Tambahkan event listener `focus` dan `visibilitychange` agar saat admin berpindah tab lalu kembali ke tab Web Admin, data langsung disinkronkan ulang.
- **PENTING:** Saat melakukan silent refresh di latar belakang, **JANGAN** tampilkan loading spinner layar penuh (skeleton/loading state utama) agar layar admin tidak berkedip (flicker) saat sedang digunakan bekerja. Cukup perbarui state datanya saja di balik layar.

### 3. Optimistic UI Update pada Tombol Aksi Admin
Saat admin menekan tombol **Konfirmasi/Lunas**, **Reschedule**, atau **Hapus**, langsung perbarui state tabel di layar detik itu juga (Optimistic UI) sekaligus memanggil ulang fungsi fetch data setelah request API selesai.