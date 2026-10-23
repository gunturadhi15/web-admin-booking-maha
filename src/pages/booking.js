/**
 * Booking Online Frontend Page
 * Sacred Journey Bali — Public Booking Form with Pricing, Phone & Time
 */

import { supabase, isUsingMock } from '../supabaseClient.js';
import { escapeHtml, sanitizeText, sanitizePhone, sanitizeNumeric, sanitizeErrorMessage } from '../utils/security.js';
import { validateBookingSubmission } from '../utils/validation.js';

export const SERVICES = [
  {
    id: 'SRV001',
    name: 'Spiritual Temple Tour',
    price: 650000,
    category: 'Sacred Tour',
    duration: '3 - 6 Jam',
    desc: 'Kunjungan pura sakral dengan panduan spiritual, meditasi & upacara pembersihan diri.',
    icon: '🛕'
  },
  {
    id: 'SRV002',
    name: 'Yoga & Meditation Retreat',
    price: 1200000,
    category: 'Mindfulness Retreat',
    duration: 'Full Day / Retreat',
    desc: 'Retreat yoga & meditasi intensif di tengah alam Ubud untuk kedamaian batin sejati.',
    icon: '🧘'
  },
  {
    id: 'SRV003',
    name: 'Numerology Consultation',
    price: 350000,
    category: 'Spiritual Guidance',
    duration: '60 - 90 Menit',
    desc: 'Konsultasi numerologi personal untuk memahami potensi diri, jodoh & arah hidup.',
    icon: '🔢'
  },
  {
    id: 'SRV004',
    name: 'Healing & Purification',
    price: 450000,
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
          Pilih layanan spiritual sakral, waktu pelaksanaan, dan lengkapi detail reservasi. Data akan langsung terhubung ke dashboard Web Admin secara real-time.
        </p>
      </div>

      <!-- Mode Notice -->
      ${isMock ? `
        <div class="alert alert-info">
          <span>ℹ️</span>
          <div>
            <strong>Mode Demo Browser:</strong> Pesanan tersimpan di browser dan langsung muncul di tab Web Admin.
          </div>
        </div>
      ` : `
        <div class="alert alert-success">
          <span>🟢</span>
          <div>
            <strong>Terhubung ke Supabase Live:</strong> Seluruh form submission akan langsung di-INSERT ke tabel <code>bookings</code>.
          </div>
        </div>
      `}

      <!-- Status Alert Box -->
      <div id="booking-alert" style="display: none;"></div>

      <!-- Main Booking Card -->
      <div class="card">
        <form id="public-booking-form" class="booking-form" novalidate>
          
          <!-- 1. Customer Name & Phone -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
            <div class="form-group">
              <label class="form-label" for="customer_name">
                <span>Nama Lengkap Pemesan</span>
                <span class="form-label-required">*Wajib</span>
              </label>
              <input 
                type="text" 
                id="customer_name" 
                name="customer_name" 
                class="form-input" 
                placeholder="Contoh: I Putu Mahendra"
                required 
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="customer_phone">
                <span>No. WhatsApp / Telepon</span>
                <span class="form-label-required">*Untuk kendala &amp; tiket</span>
              </label>
              <input 
                type="tel" 
                id="customer_phone" 
                name="customer_phone" 
                class="form-input" 
                placeholder="+62 812 3456 7890"
                required 
              />
            </div>
          </div>

          <!-- 2. Customer Email -->
          <div class="form-group">
            <label class="form-label" for="customer_email">
              <span>Alamat Email</span>
              <span class="form-label-required">*Konfirmasi</span>
            </label>
            <input 
              type="email" 
              id="customer_email" 
              name="customer_email" 
              class="form-input" 
              placeholder="nama@email.com"
              required 
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
                <div class="service-radio-card ${idx === 0 ? 'selected' : ''}" data-service="${srv.name}" data-price="${srv.price}">
                  <div style="font-size: 1.5rem; margin-bottom: 0.25rem;">${srv.icon}</div>
                  <div class="service-radio-title">${srv.name}</div>
                  <div class="service-radio-desc">${srv.desc}</div>
                  <div style="margin-top: auto; padding-top: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.72rem; color: var(--gold-light); font-weight: 600;">⏱️ ${srv.duration}</span>
                    <span style="font-size: 0.85rem; font-weight: 700; color: #FFFFFF;">${formatRupiah(srv.price)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
            <input type="hidden" id="service_name" name="service_name" value="${SERVICES[0].name}" />
            <input type="hidden" id="total_price" name="total_price" value="${SERVICES[0].price}" />
          </div>

          <!-- 4. Booking Date & Time Slot -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
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

            <div class="form-group">
              <label class="form-label" for="booking_time">
                <span>Pilih Jam Pelaksanaan</span>
                <span class="form-label-required">*WITA</span>
              </label>
              <select id="booking_time" name="booking_time" class="form-select">
                <option value="09:00">09:00 WITA (Sesi Pagi Utama)</option>
                <option value="10:00">10:00 WITA (Sesi Pagi)</option>
                <option value="11:30">11:30 WITA (Sesi Siang)</option>
                <option value="14:00">14:00 WITA (Sesi Sore Awal)</option>
                <option value="15:30">15:30 WITA (Sesi Sunset Meditasi)</option>
              </select>
            </div>
          </div>

          <!-- Price Summary Preview -->
          <div style="background: rgba(217, 163, 67, 0.08); border: 1px solid rgba(217, 163, 67, 0.25); border-radius: var(--radius-md); padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span style="font-size: 0.8rem; color: var(--text-secondary);">Total Biaya Reservasi:</span>
              <div id="display-total-price" style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 800; color: #FFFFFF;">
                ${formatRupiah(SERVICES[0].price)}
              </div>
            </div>
            <span style="font-size: 0.75rem; color: var(--gold-light); font-weight: 600;">Status Awal: Pending</span>
          </div>

          <!-- Submit Button with Spinner -->
          <div style="margin-top: 0.5rem;">
            <button type="submit" id="btn-submit-booking" class="btn btn-primary" style="width: 100%; padding: 0.85rem 1.5rem; font-size: 1rem;">
              <span id="btn-submit-text">Kirim Reservasi Sekarang ✨</span>
              <span id="btn-submit-spinner" class="spinner" style="display: none;"></span>
            </button>
          </div>

        </form>
      </div>

    </div>
  `;
}

export function initBookingForm(onSuccessNavigate) {
  const form = document.getElementById('public-booking-form');
  const alertBox = document.getElementById('booking-alert');
  const submitBtn = document.getElementById('btn-submit-booking');
  const submitText = document.getElementById('btn-submit-text');
  const submitSpinner = document.getElementById('btn-submit-spinner');
  const serviceCards = document.querySelectorAll('.service-radio-card');
  const serviceInput = document.getElementById('service_name');
  const priceInput = document.getElementById('total_price');
  const displayTotal = document.getElementById('display-total-price');

  serviceCards.forEach(card => {
    card.addEventListener('click', () => {
      serviceCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const selectedService = card.getAttribute('data-service');
      const selectedPrice = Number(card.getAttribute('data-price') || 0);

      if (serviceInput) serviceInput.value = selectedService;
      if (priceInput) priceInput.value = selectedPrice;
      if (displayTotal) displayTotal.textContent = formatRupiah(selectedPrice);
    });
  });

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rawCustomerName = document.getElementById('customer_name')?.value || '';
    const rawCustomerPhone = document.getElementById('customer_phone')?.value || '';
    const rawCustomerEmail = document.getElementById('customer_email')?.value || '';
    const rawServiceName = serviceInput?.value || SERVICES[0].name;
    const rawTotalPrice = priceInput?.value || SERVICES[0].price;
    const rawBookingDate = document.getElementById('booking_date')?.value || '';
    const rawBookingTime = document.getElementById('booking_time')?.value || '09:00';

    // 1. Sanitasi Input (Poin 7)
    const customerName = sanitizeText(rawCustomerName, 100);
    const customerPhone = sanitizePhone(rawCustomerPhone);
    const customerEmail = sanitizeText(rawCustomerEmail, 100).toLowerCase();
    const serviceName = sanitizeText(rawServiceName, 120);
    const totalPrice = sanitizeNumeric(rawTotalPrice, 0, 1000000000, SERVICES[0].price);
    const bookingDate = sanitizeText(rawBookingDate, 10);
    const bookingTime = sanitizeText(rawBookingTime, 8);

    // 2. Validasi Input Terpusat (Poin 6)
    const validation = validateBookingSubmission({
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      service_name: serviceName,
      total_price: totalPrice,
      booking_date: bookingDate
    });

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      showAlert('error', escapeHtml(firstError));
      return;
    }

    setLoading(true);
    hideAlert();

    try {
      const payload = {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        service_name: serviceName,
        total_price: totalPrice,
        booking_date: bookingDate,
        booking_time: bookingTime,
        status: 'Baru'
      };

      const { data, error } = await supabase
        .from('bookings')
        .insert([payload])
        .select();

      if (error) throw error;

      // 3. Render Aman dengan Anti-XSS (Poin 9)
      showAlert(
        'success',
        `🎉 <strong>Reservasi Berhasil Dikirim!</strong><br/>
         Pemesan: <strong>${escapeHtml(customerName)}</strong> (${escapeHtml(customerPhone)})<br/>
         Layanan: <strong>${escapeHtml(serviceName)}</strong> (${formatRupiah(totalPrice)})<br/>
         Jadwal: <strong>${escapeHtml(bookingDate)} pk ${escapeHtml(bookingTime)} WITA</strong>.<br/>
         Data telah masuk ke database Supabase dan otomatis tampil di Web Admin.`
      );

      form.reset();
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const dateEl = document.getElementById('booking_date');
      if (dateEl) dateEl.value = tomorrow;

      serviceCards.forEach((c, idx) => c.classList.toggle('selected', idx === 0));
      if (serviceInput) serviceInput.value = SERVICES[0].name;
      if (priceInput) priceInput.value = SERVICES[0].price;
      if (displayTotal) displayTotal.textContent = formatRupiah(SERVICES[0].price);

      window.dispatchEvent(new CustomEvent('booking-submitted', { detail: payload }));
    } catch (err) {
      // 4. Error Jangan Bocor (Poin 5)
      const safeErrorMsg = sanitizeErrorMessage(err, 'Gagal menyimpan pesanan. Silakan periksa kembali formulir Anda.');
      showAlert('error', safeErrorMsg);
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
    alertBox.innerHTML = `<span>${type === 'success' ? '✅' : '⚠️'}</span><div style="flex: 1;">${html}</div>`;
    alertBox.style.display = 'flex';
  }

  function hideAlert() {
    if (alertBox) alertBox.style.display = 'none';
  }
}

function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num);
}
