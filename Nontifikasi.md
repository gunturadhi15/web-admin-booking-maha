# 🔔 PROMPT TAMBAHAN: SOUND ALERT (BUNYI NOTIFIKASI) & POP-UP TOAST SAAT BOOKING BARU MASUK

Tolong tambahkan fitur **Bunyi Notifikasi (Sound Alert)** dan **Pop-up Toast Real-Time** setiap kali ada data pesanan baru yang masuk ke Web Admin Mahawellnessjourney.

> **⚠️ ATURAN PENTING:**
> 1. **JANGAN UBAH LAYOUT UTAMA:** Jangan mengubah struktur tabel, sidebar, atau kartu KPI yang sudah ada. Cukup tambahkan komponen *floating toast* di pojok kanan atas dan tombol kecil *Mute/Unmute* di header.
> 2. **TANPA FILE MP3 EKSTERNAL:** Gunakan **Web Audio API (`AudioContext`)** bawaan browser untuk menghasilkan suara *chime/lonceng* yang jernih agar tidak pernah gagal *load* atau terkena error `404` file audio.
> 3. **HANYA BUNYI UNTUK PESANAN BARU:** Pastikan bunyi dan toast **TIDAK** terpicu saat halaman pertama kali dimuat (*initial load*), melainkan hanya saat ada penambahan data baru (`INSERT` dari Supabase Realtime atau pertambahan `booking_id` baru dari hasil *silent polling*).

---

### 1. Kode Helper Suara Notifikasi (Web Audio API Chime)
Tambahkan fungsi generator suara lonceng *wellness* dua nada berikut (tidak butuh file `.mp3`):

```javascript
export const playBookingNotificationSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.25, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Nada lonceng dua tingkat (C6 -> G6) yang bersih dan elegan
    playTone(1046.5, now, 0.35);
    playTone(1567.98, now + 0.16, 0.65);
  } catch (err) {
    console.warn('Audio play diblokir browser sebelum ada interaksi klik:', err);
  }
};
```

---

### 2. Logika Deteksi Pesanan Baru (Anti-Spam saat Refresh)
Gunakan `useRef` untuk menyimpan daftar `booking_id` yang sudah ada agar sistem bisa membedakan mana data lama dan mana pesanan yang benar-benar baru masuk:

```javascript
const knownBookingIdsRef = useRef(new Set());
const isInitialLoadRef = useRef(true);
const [soundEnabled, setSoundEnabled] = useState(true);
const [activeToast, setActiveToast] = useState(null);

const handleIncomingBookings = (latestBookingsList) => {
  if (!Array.isArray(latestBookingsList)) return;

  // Saat pertama kali buka halaman, catat semua ID tanpa membunyikan alarm
  if (isInitialLoadRef.current) {
    latestBookingsList.forEach((b) => {
      const id = b.booking_id || b.id;
      if (id) knownBookingIdsRef.current.add(id);
    });
    isInitialLoadRef.current = false;
    return;
  }

  // Cek apakah ada booking_id yang belum pernah tercatat sebelumnya
  const newEntries = latestBookingsList.filter((b) => {
    const id = b.booking_id || b.id;
    return id && !knownBookingIdsRef.current.has(id);
  });

  if (newEntries.length > 0) {
    newEntries.forEach((b) => {
      const id = b.booking_id || b.id;
      if (id) knownBookingIdsRef.current.add(id);
    });

    const newest = newEntries[0];

    // 1. Bunyikan suara jika fitur suara aktif
    if (soundEnabled) {
      playBookingNotificationSound();
    }

    // 2. Tampilkan Pop-up Toast di pojok kanan atas selama 6 detik
    setActiveToast({
      booking_id: newest.booking_id || newest.id,
      customer_name: newest.customer_name || newest.customer?.name || 'Tamu Baru',
      package_name: newest.package_name || 'Paket Wellness',
      booking_date: newest.booking_date || newest.tour_date || '-',
      booking_time: newest.booking_time || '-',
      pax: newest.pax || 1,
      total_amount: newest.total_amount || newest.total_price || 0,
    });

    setTimeout(() => {
      setActiveToast(null);
    }, 6000);
  }
};
```

*(Hubungkan juga ke listener Supabase Realtime `event: 'INSERT'` pada tabel `bookings` agar langsung memicu `playBookingNotificationSound()` dan `setActiveToast(...)` detik itu juga).*

---

### 3. Spesifikasi Tampilan Pop-up Toast & Tombol Mute
1. **Pop-up Toast (Floating Pojok Kanan Atas - `fixed top-5 right-5 z-50`):**
   - Tampilkan *badge* **"🔔 Booking Baru Masuk!"**
   - Tampilkan **Nama Tamu**, **Nama Paket (`pax` orang)**, **Tanggal & Jam Kunjungan**, serta **Kode Booking (`MWJ-...`)**.
   - Sediakan tombol **"Tutup (X)"** pada toast tersebut.
2. **Tombol Toggle Suara di Header:**
   - Tambahkan satu tombol ikon kecil `🔊 Suara Aktif` / `🔇 Bisu` di bagian atas dashboard.
   - Saat admin mengeklik tombol `🔊`, jalankan `playBookingNotificationSound()` satu kali sebagai tes suara sekaligus membuka kunci izin *Autoplay Audio* pada browser Chrome/Safari/Edge.