/**
 * Sound Alert & Real-Time Pop-Up Toast Service — Mahawellnessjourney Web Admin
 * Sesuai Spesifikasi Nontifikasi.md:
 * 1. Web Audio API Chime (Nada lonceng dua tingkat C6 -> G6) tanpa file .mp3 eksternal
 * 2. Floating Pop-up Toast di pojok kanan atas (top-5 right-5 z-50) selama 6 detik
 * 3. Manajemen status Mute/Unmute audio tersimpan di localStorage
 */

const STORAGE_SOUND_KEY = 'mwj_sound_enabled';

/**
 * Cek apakah bunyi notifikasi aktif (default: true)
 */
export function isSoundEnabled() {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_SOUND_KEY) !== 'false';
}

/**
 * Atur status bunyi notifikasi
 */
export function setSoundEnabled(enabled) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_SOUND_KEY, enabled ? 'true' : 'false');
}

/**
 * Generator Suara Lonceng Wellness Dua Tingkat (Web Audio API Chime)
 * Menggunakan frekuensi murni sine C6 (1046.5 Hz) -> G6 (1567.98 Hz)
 * Bebas dari error 404 file .mp3
 */
export const playBookingNotificationSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Pastikan context resume jika dalam kondisi suspended oleh browser policy
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

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
    // Nada lonceng dua tingkat (C6 -> G6) yang bersih, jernih, dan elegan
    playTone(1046.5, now, 0.35);
    playTone(1567.98, now + 0.16, 0.65);
  } catch (err) {
    console.warn('[SoundAlert] Audio play diblokir browser sebelum ada interaksi klik:', err);
  }
};

/**
 * Toggle Status Suara (Mute / Unmute)
 * Jika diaktifkan, memutar suara satu kali sebagai konfirmasi & membuka kunci autoplay
 */
export function toggleSound() {
  const current = isSoundEnabled();
  const next = !current;
  setSoundEnabled(next);
  if (next) {
    playBookingNotificationSound();
  }
  return next;
}

/**
 * Format Tanggal Indonesia Sederhana
 */
function formatSimpleDate(dateStr) {
  if (!dateStr || dateStr === '-') return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

/**
 * Format Jam Sederhana
 */
function formatSimpleTime(timeStr) {
  if (!timeStr || timeStr === '-') return '-';
  const clean = String(timeStr).replace(/ WITA/gi, '').trim();
  return clean.slice(0, 5);
}

/**
 * Format Rupiah Sederhana
 */
function formatSimpleRupiah(num) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(num) || 0);
}

/**
 * Tampilkan Pop-up Toast Real-Time Floating di Pojok Kanan Atas
 * Sesuai Spesifikasi Bagian 3 Nontifikasi.md:
 * - Floating pojok kanan atas (fixed top-5 right-5 z-50)
 * - Badge "🔔 Booking Baru Masuk!"
 * - Nama Tamu, Nama Paket (pax orang), Tanggal & Jam Kunjungan, Kode Booking
 * - Tombol Tutup (X)
 * - Otomatis tertutup setelah 6 detik
 */
export function showBookingAlertToast(bookingData) {
  if (typeof document === 'undefined') return;

  let container = document.getElementById('booking-alert-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'booking-alert-container';
    container.className = 'booking-alert-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'booking-alert-toast';

  const customerName = bookingData.customer_name || 'Tamu Baru';
  const packageName = bookingData.package_name || 'Paket Wellness';
  const pax = bookingData.pax || 1;
  const bookingDate = formatSimpleDate(bookingData.booking_date);
  const bookingTime = formatSimpleTime(bookingData.booking_time);
  const bookingId = bookingData.booking_id || bookingData.id || '-';
  const totalAmount = bookingData.total_amount ? formatSimpleRupiah(bookingData.total_amount) : '';

  toast.innerHTML = `
    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
      <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(13, 148, 136, 0.2); border: 1px solid rgba(20, 184, 166, 0.35); padding: 3px 9px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; color: #2DD4BF; letter-spacing: 0.3px;">
        <span>🔔</span> <span>Booking Baru Masuk!</span>
      </div>
      <button type="button" class="btn-close-booking-toast" style="background: transparent; border: none; color: #94A3B8; cursor: pointer; padding: 2px 6px; font-size: 1.15rem; line-height: 1; border-radius: 4px; transition: color 0.15s;" title="Tutup">&times;</button>
    </div>

    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 3px;">
      <div style="font-size: 0.95rem; font-weight: 700; color: #F8FAFC; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        ${escapeHtml(customerName)}
      </div>
      <div style="font-size: 0.75rem; font-weight: 600; color: #38BDF8; background: rgba(56, 189, 248, 0.12); padding: 2px 7px; border-radius: 6px; white-space: nowrap;">
        ${pax} Orang
      </div>
    </div>

    <div style="font-size: 0.8rem; color: #CBD5E1; margin-bottom: 8px; display: flex; align-items: center; gap: 5px;">
      <span style="color: #F59E0B;">✨</span>
      <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;">${escapeHtml(packageName)}</span>
    </div>

    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1px solid rgba(148, 163, 184, 0.15); font-size: 0.76rem; color: #94A3B8; flex-wrap: wrap; gap: 4px;">
      <div style="display: flex; align-items: center; gap: 4px; color: #E2E8F0;">
        <span>📅</span>
        <span>${bookingDate} • pk ${bookingTime} WITA</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        ${totalAmount ? `<span style="font-weight: 600; color: #34D399;">${totalAmount}</span>` : ''}
        <span style="font-family: monospace; font-size: 0.72rem; color: #5EEAD4; background: rgba(13, 148, 136, 0.2); padding: 1px 6px; border-radius: 4px;">
          ${escapeHtml(bookingId)}
        </span>
      </div>
    </div>
  `;

  const closeBtn = toast.querySelector('.btn-close-booking-toast');
  const dismiss = () => {
    toast.classList.add('fade-out');
    setTimeout(() => {
      toast.remove();
    }, 280);
  };

  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    dismiss();
  });

  // Otomatis tutup setelah 6 detik sesuai spesifikasi Section 2 & 3
  const timer = setTimeout(() => {
    dismiss();
  }, 6000);

  toast.addEventListener('mouseenter', () => clearTimeout(timer));

  container.appendChild(toast);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
