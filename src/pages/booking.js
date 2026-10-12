/**
 * Booking Online Frontend Page
 * Sacred Journey Bali — Public Booking Form with Supabase Integration
 */

import { supabase, isUsingMock } from '../supabaseClient.js';

export const SERVICES = [
  {
    id: 'SRV001',
    name: 'Spiritual Temple Tour',
    category: 'Sacred Tour',
    duration: '3 - 6 Jam',
    desc: 'Kunjungan pura sakral dengan panduan spiritual, meditasi & upacara pembersihan diri.',
    icon: '🛕'
  },
  {
    id: 'SRV002',
    name: 'Yoga & Meditation Retreat',
    category: 'Mindfulness Retreat',
    duration: 'Full Day / Retreat',
    desc: 'Retreat yoga & meditasi intensif di tengah alam Ubud untuk kedamaian batin sejati.',
    icon: '🧘'
  },
  {
    id: 'SRV003',
    name: 'Numerology Consultation',
    category: 'Spiritual Guidance',
    duration: '60 - 90 Menit',
    desc: 'Konsultasi numerologi personal untuk memahami potensi diri, jodoh & arah hidup.',
    icon: '🔢'
  },
  {
    id: 'SRV004',
    name: 'Healing & Purification',
    category: 'Traditional Melukat',
    duration: '2 - 4 Jam',
    desc: 'Ritual pembersihan diri Melukat dengan air suci alami di Tirta Empul atau Sebatu.',
    icon: '🌿'
  }
];

export function renderBookingPage() {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const isMock = isUsingMock();

  return `
    <div class="booking-section">
      <!-- Hero Header -->
      <div class="booking-hero">
        <p class="hero-subtitle">Sacred Journey Bali</p>
        <h2 class="hero-title">Formulir Booking Online</h2>
        <p class="hero-description">
          Pilih layanan spiritual sakral Anda dan lengkapi detail reservasi. Data akan langsung tersimpan aman ke database Supabase secara real-time.
        </p>
      </div>

      <!-- Mode Notice -->
      ${isMock ? `
        <div class="alert alert-info">
          <span>ℹ️</span>
          <div>
            <strong>Mode Demo Browser Aktif:</strong> Supabase URL & Anon Key belum diatur. Pesanan akan disimpan ke LocalStorage dan dapat dipantau langsung di tab Web Admin.
            <a href="javascript:void(0)" id="link-open-config" style="color: inherit; text-decoration: underline; margin-left: 6px; font-weight: 600;">Hubungkan Supabase</a>
          </div>
        </div>
      ` : `
        <div class="alert alert-success">
          <span>🟢</span>
          <div>
            <strong>Terhubung ke Database Supabase Live:</strong> Seluruh form submission akan langsung di-INSERT ke tabel <code>bookings</code>.
          </div>
        </div>
      `}

      <!-- Status Alert Box (Error / Success) -->
      <div id="booking-alert" style="display: none;"></div>

      <!-- Main Booking Card -->
      <div class="card">
        <form id="public-booking-form" class="booking-form" novalidate>
          
          <!-- 1. Customer Name -->
          <div class="form-group">
            <label class="form-label" for="customer_name">
              <span>Nama Lengkap Pemesan</span>
              <span class="form-label-required">*Wajib diisi</span>
            </label>
            <input 
              type="text" 
              id="customer_name" 
              name="customer_name" 
              class="form-input" 
              placeholder="Contoh: I Putu Mahendra / Sarah Jenkins"
              required 
              autocomplete="name"
            />
          </div>

          <!-- 2. Customer Email -->
          <div class="form-group">
            <label class="form-label" for="customer_email">
              <span>Alamat Email</span>
              <span class="form-label-required">*Konfirmasi tiket</span>
            </label>
            <input 
              type="email" 
              id="customer_email" 
              name="customer_email" 
              class="form-input" 
              placeholder="nama@email.com"
              required 
              autocomplete="email"
            />
          </div>

          <!-- 3. Service Selection Grid -->
          <div class="form-group">
            <label class="form-label">
              <span>Pilih Paket Layanan Spiritual</span>
              <span class="form-label-required">*Pilih salah satu</span>
            </label>
            <div class="service-selector-grid">
              ${SERVICES.map((srv, idx) => `
                <div class="service-radio-card ${idx === 0 ? 'selected' : ''}" data-service="${srv.name}">
                  <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">${srv.icon}</div>
                  <div class="service-radio-title">${srv.name}</div>
                  <div class="service-radio-desc">${srv.desc}</div>
                  <span style="font-size: 0.72rem; color: var(--gold-light); font-weight: 600; margin-top: auto; padding-top: 0.5rem;">⏱️ ${srv.duration}</span>
                </div>
              `).join('')}
            </div>
            <input type="hidden" id="service_name" name="service_name" value="${SERVICES[0].name}" />
          </div>

          <!-- 4. Booking Date -->
          <div class="form-group">
            <label class="form-label" for="booking_date">
              <span>Tanggal Pelaksanaan</span>
              <span class="form-label-required">*Pilih tanggal</span>
            </label>
            <input 
              type="date" 
              id="booking_date" 
              name="booking_date" 
              class="form-input" 
              min="${tomorrow}"
              value="${tomorrow}"
              required 
            />
          </div>

          <!-- Submit Button with Loading Spinner -->
          <div style="margin-top: 0.75rem;">
            <button type="submit" id="btn-submit-booking" class="btn btn-primary" style="width: 100%; padding: 0.85rem 1.5rem; font-size: 1rem;">
              <span id="btn-submit-text">Kirim Reservasi Sekarang ✨</span>
              <span id="btn-submit-spinner" class="spinner" style="display: none;"></span>
            </button>
          </div>

          <p style="text-align: center; font-size: 0.78rem; color: var(--text-muted);">
            🔒 Data pesanan diproteksi enkripsi Supabase Row Level Security (RLS). Status awal: <strong>Pending</strong>.
          </p>

        </form>
      </div>

    </div>
  `;
}

/**
 * Initialize Event Handlers for Booking Form
 */
export function initBookingForm(onSuccessNavigate) {
  const form = document.getElementById('public-booking-form');
  const alertBox = document.getElementById('booking-alert');
  const submitBtn = document.getElementById('btn-submit-booking');
  const submitText = document.getElementById('btn-submit-text');
  const submitSpinner = document.getElementById('btn-submit-spinner');
  const serviceCards = document.querySelectorAll('.service-radio-card');
  const serviceInput = document.getElementById('service_name');
  const linkOpenConfig = document.getElementById('link-open-config');

  if (linkOpenConfig) {
    linkOpenConfig.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('open-supabase-config'));
    });
  }

  // Handle service card selection
  serviceCards.forEach(card => {
    card.addEventListener('click', () => {
      serviceCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const selectedService = card.getAttribute('data-service');
      if (serviceInput) serviceInput.value = selectedService;
    });
  });

  if (!form) return;

  // Handle Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Ambil nilai field form
    const customerName = document.getElementById('customer_name')?.value?.trim();
    const customerEmail = document.getElementById('customer_email')?.value?.trim();
    const serviceName = serviceInput?.value?.trim() || SERVICES[0].name;
    const bookingDate = document.getElementById('booking_date')?.value;

    // 2. Validasi input
    if (!customerName) {
      showAlert('error', 'Silakan masukkan Nama Lengkap Anda.');
      document.getElementById('customer_name')?.focus();
      return;
    }

    if (!customerEmail || !customerEmail.includes('@') || !customerEmail.includes('.')) {
      showAlert('error', 'Silakan masukkan alamat Email yang valid.');
      document.getElementById('customer_email')?.focus();
      return;
    }

    if (!bookingDate) {
      showAlert('error', 'Silakan pilih Tanggal Pelaksanaan.');
      document.getElementById('booking_date')?.focus();
      return;
    }

    // 3. Set Indikator Loading
    setLoading(true);
    hideAlert();

    try {
      // 4. Eksekusi INSERT ke Supabase
      // Sesuai Tahap 2: supabase.from('bookings').insert([...])
      const payload = {
        customer_name: customerName,
        customer_email: customerEmail,
        service_name: serviceName,
        booking_date: bookingDate,
        status: 'Pending'
      };

      console.log('Mengirim data booking ke Supabase:', payload);

      const { data, error } = await supabase
        .from('bookings')
        .insert([payload])
        .select();

      if (error) {
        throw error;
      }

      // 5. Sukses
      const createdBooking = (data && data[0]) ? data[0] : payload;
      const bookingId = createdBooking.id || 'BKG-' + Date.now().toString(36).toUpperCase();

      showAlert(
        'success', 
        `🎉 <strong>Reservasi Berhasil Diterima!</strong><br/>
         Nomor Ref: <code>${bookingId}</code><br/>
         Data pesanan untuk <strong>${customerName}</strong> (${serviceName}) pada tanggal <strong>${bookingDate}</strong> telah tersimpan ke database.`
      );

      // Reset form
      form.reset();
      // Set default date back to tomorrow
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const dateEl = document.getElementById('booking_date');
      if (dateEl) dateEl.value = tomorrow;

      // Reset selected card
      serviceCards.forEach((c, idx) => {
        c.classList.toggle('selected', idx === 0);
      });
      if (serviceInput) serviceInput.value = SERVICES[0].name;

      // Trigger global event agar admin dashboard langsung refresh jika aktif
      window.dispatchEvent(new CustomEvent('booking-submitted', { detail: createdBooking }));

    } catch (err) {
      console.error('Error saat menyimpan booking:', err);
      showAlert(
        'error', 
        `❌ <strong>Gagal Mengirim Pesanan:</strong> ${err.message || 'Terjadi kesalahan jaringan atau konfigurasi RLS Supabase.'}<br/>
         <small>Pastikan policy INSERT anon pada tabel 'bookings' sudah diaktifkan di Supabase.</small>`
      );
    } finally {
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    if (submitBtn) submitBtn.disabled = isLoading;
    if (submitSpinner) submitSpinner.style.display = isLoading ? 'inline-block' : 'none';
    if (submitText) submitText.textContent = isLoading ? 'Menyimpan ke Database...' : 'Kirim Reservasi Sekarang ✨';
  }

  function showAlert(type, html) {
    if (!alertBox) return;
    alertBox.className = `alert alert-${type}`;
    alertBox.innerHTML = `
      <span>${type === 'success' ? '✅' : '⚠️'}</span>
      <div style="flex: 1;">${html}</div>
    `;
    alertBox.style.display = 'flex';
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    if (alertBox) {
      alertBox.style.display = 'none';
      alertBox.innerHTML = '';
    }
  }
}
