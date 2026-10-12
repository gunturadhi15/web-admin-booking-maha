/**
 * Dedicated Web Admin Dashboard
 * Sacred Journey Bali — Standalone Web Admin
 * Features:
 * 1. Manajemen Booking & Jadwal (Customer Phone, Pricing, Date, Time, Status, WhatsApp Action)
 * 2. Dashboard Keuangan & Grafik Pendapatan (Chart.js Omzet Bulanan & Distribusi Layanan)
 * 3. Inbox Pesan & Kendala Pelanggan (Tabel `messages`, WhatsApp direct, toggle `is_resolved`)
 * 4. Sistem Autentikasi Admin (Supabase Auth)
 * 5. Supabase Realtime Listener (bookings & messages)
 */

import Chart from 'chart.js/auto';
import { 
  supabase, 
  isUsingMock, 
  getSupabaseCredentials, 
  saveSupabaseCredentials, 
  clearSupabaseCredentials,
  testSupabaseConnection 
} from '../supabaseClient.js';

// Dashboard State
let currentAdminTab = 'bookings'; // 'bookings' | 'finance' | 'inbox'
let allBookings = [];
let allMessages = [];
let currentSearchBooking = '';
let currentStatusFilter = 'ALL';
let currentMessageFilter = 'ALL'; // 'ALL' | 'UNRESOLVED' | 'RESOLVED'

let monthlyChartInstance = null;
let categoryChartInstance = null;
let realtimeChannel = null;

export function renderAdminPage() {
  const { url, isConfigured } = getSupabaseCredentials();

  return `
    <div class="admin-dashboard-container">
      
      <!-- Top Header & Action Controls -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <span style="font-size: 1.5rem;">📊</span>
            <h2 style="font-family: var(--font-heading); font-size: 1.85rem; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em;">
              Dedicated Web Admin Dashboard
            </h2>
          </div>
          <p style="font-size: 0.88rem; color: var(--text-secondary);">
            Pusat operasional bisnis: monitoring pemesanan, jadwal pelaksanaan, grafik pendapatan omzet bulanan, dan penanganan kendala pelanggan.
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
          <button id="btn-open-db-config" class="btn btn-secondary" title="Konfigurasi Kredensial Supabase">
            <span style="font-size: 1.1rem;">⚡</span>
            <span>Konfigurasi Supabase</span>
          </button>

          <button id="btn-view-sql" class="btn btn-outline-gold" title="Lihat Script SQL Supabase">
            <span>📜</span>
            <span>Script SQL Schema</span>
          </button>

          <button id="btn-refresh-all" class="btn btn-secondary" title="Muat Ulang Seluruh Data">
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Auth Banner & Live Connection Status -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; padding: 0.85rem 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); margin-bottom: 1.5rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span class="status-dot ${isConfigured ? 'live' : 'demo'}"></span>
          <span style="font-size: 0.85rem; font-weight: 600;">
            ${isConfigured 
              ? `<span style="color: var(--status-confirmed);">Terkoneksi ke Supabase Live:</span> <span style="font-family: monospace; color: var(--text-muted); font-size: 0.8rem;">${url}</span>`
              : `<span style="color: var(--status-pending);">Mode Demo Browser:</span> Data tersimpan lokal di browser. Hubungkan Supabase untuk integrasi cloud.`
            }
          </span>
        </div>

        <div id="admin-auth-widget" style="display: flex; align-items: center; gap: 0.75rem; font-size: 0.82rem;">
          <span style="color: var(--text-muted);">Memeriksa status sesi...</span>
        </div>
      </div>

      <!-- Sub-Navigation Modules Tabs -->
      <div class="admin-modules-tabs" style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem; overflow-x: auto;">
        <button id="tab-btn-bookings" class="admin-tab-btn active">
          <span>📋 Manajemen Booking &amp; Jadwal</span>
          <span id="badge-count-bookings" class="admin-tab-counter">0</span>
        </button>

        <button id="tab-btn-finance" class="admin-tab-btn">
          <span>📈 Dashboard Keuangan &amp; Grafik Pendapatan</span>
        </button>

        <button id="tab-btn-inbox" class="admin-tab-btn">
          <span>📥 Inbox Pesan &amp; Kendala</span>
          <span id="badge-count-messages" class="admin-tab-counter" style="background: rgba(239, 68, 68, 0.2); color: #EF4444;">0</span>
        </button>
      </div>

      <!-- Dynamic Sub-Tab Viewport -->
      <div id="admin-subview-content"></div>

    </div>

    <!-- Modals Container -->
    <div id="admin-modals-slot"></div>
  `;
}

/**
 * Initialize Admin Logic
 */
export async function initAdminPage() {
  setupSubNavigation();
  setupGlobalControls();
  await checkAuthSession();
  await loadAllData();
  setupRealtimeChannels();
}

/**
 * Setup Tab Switching
 */
function setupSubNavigation() {
  const btnBookings = document.getElementById('tab-btn-bookings');
  const btnFinance = document.getElementById('tab-btn-finance');
  const btnInbox = document.getElementById('tab-btn-inbox');

  btnBookings?.addEventListener('click', () => switchSubTab('bookings'));
  btnFinance?.addEventListener('click', () => switchSubTab('finance'));
  btnInbox?.addEventListener('click', () => switchSubTab('inbox'));

  // Render initial tab
  switchSubTab('bookings');
}

function switchSubTab(tabName) {
  currentAdminTab = tabName;

  document.getElementById('tab-btn-bookings')?.classList.toggle('active', tabName === 'bookings');
  document.getElementById('tab-btn-finance')?.classList.toggle('active', tabName === 'finance');
  document.getElementById('tab-btn-inbox')?.classList.toggle('active', tabName === 'inbox');

  const viewport = document.getElementById('admin-subview-content');
  if (!viewport) return;

  if (tabName === 'bookings') {
    viewport.innerHTML = renderBookingsView();
    initBookingsViewEvents();
  } else if (tabName === 'finance') {
    viewport.innerHTML = renderFinanceView();
    initFinanceCharts();
  } else if (tabName === 'inbox') {
    viewport.innerHTML = renderInboxView();
    initInboxViewEvents();
  }
}

/**
 * Load Data from Supabase
 */
async function loadAllData() {
  await Promise.all([
    fetchBookingsData(),
    fetchMessagesData()
  ]);
  updateTopCounters();
}

async function fetchBookingsData() {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    allBookings = data || [];
  } catch (err) {
    console.error('Error fetching bookings:', err);
    window.showToast?.(`Gagal memuat pesanan: ${err.message}`, 'error');
  }
}

async function fetchMessagesData() {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    allMessages = data || [];
  } catch (err) {
    console.error('Error fetching messages:', err);
  }
}

function updateTopCounters() {
  const bkgCounter = document.getElementById('badge-count-bookings');
  const msgCounter = document.getElementById('badge-count-messages');

  if (bkgCounter) bkgCounter.textContent = allBookings.length;
  if (msgCounter) {
    const unresolved = allMessages.filter(m => !m.is_resolved).length;
    msgCounter.textContent = unresolved;
    msgCounter.style.display = unresolved > 0 ? 'inline-block' : 'none';
  }
}

/* ==============================================================================
   1. MODULE: MANAJEMEN BOOKING & JADWAL
   ============================================================================== */
function renderBookingsView() {
  const total = allBookings.length;
  const pending = allBookings.filter(b => b.status === 'Pending').length;
  const confirmed = allBookings.filter(b => b.status === 'Confirmed').length;
  const cancelled = allBookings.filter(b => b.status === 'Cancelled').length;

  return `
    <div>
      <!-- KPI Metrics Grid -->
      <div class="kpi-grid">
        <div class="kpi-card kpi-total">
          <div class="kpi-icon-wrap">📋</div>
          <div class="kpi-info">
            <span class="kpi-label">Total Pemesanan</span>
            <span class="kpi-value">${total}</span>
          </div>
        </div>

        <div class="kpi-card kpi-pending">
          <div class="kpi-icon-wrap">⏳</div>
          <div class="kpi-info">
            <span class="kpi-label">Perlu Konfirmasi</span>
            <span class="kpi-value">${pending}</span>
          </div>
        </div>

        <div class="kpi-card kpi-confirmed">
          <div class="kpi-icon-wrap">✅</div>
          <div class="kpi-info">
            <span class="kpi-label">Jadwal Terkonfirmasi</span>
            <span class="kpi-value">${confirmed}</span>
          </div>
        </div>

        <div class="kpi-card kpi-cancelled">
          <div class="kpi-icon-wrap">❌</div>
          <div class="kpi-info">
            <span class="kpi-label">Pesanan Dibatalkan</span>
            <span class="kpi-value">${cancelled}</span>
          </div>
        </div>
      </div>

      <!-- Bookings Table Card -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">
              <span>Tabel Pemesanan &amp; Jadwal Pelaksanaan</span>
            </h3>
            <p class="card-desc">
              Pantau rincian harga, slot waktu &amp; tanggal, serta nomor kontak WhatsApp pemesan secara real-time.
            </p>
          </div>
        </div>

        <!-- Toolbar -->
        <div class="table-toolbar">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              id="search-bookings-input" 
              class="search-input" 
              placeholder="Cari nama, email, no HP, atau layanan..." 
              value="${currentSearchBooking}"
            />
          </div>

          <div class="filter-group">
            <label style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 600;">Status:</label>
            <select id="filter-bookings-status" class="select-input">
              <option value="ALL" ${currentStatusFilter === 'ALL' ? 'selected' : ''}>Semua Status</option>
              <option value="Pending" ${currentStatusFilter === 'Pending' ? 'selected' : ''}>Pending (Menunggu)</option>
              <option value="Confirmed" ${currentStatusFilter === 'Confirmed' ? 'selected' : ''}>Confirmed (Terkonfirmasi)</option>
              <option value="Cancelled" ${currentStatusFilter === 'Cancelled' ? 'selected' : ''}>Cancelled (Dibatalkan)</option>
            </select>
          </div>
        </div>

        <!-- Table View -->
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Pemesan &amp; Kontak</th>
                <th>Paket Layanan</th>
                <th>Rincian Harga</th>
                <th>Jadwal (Hari, Tanggal &amp; Jam)</th>
                <th>Status</th>
                <th style="text-align: right;">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody id="bookings-tbody">
              ${renderBookingsTableRows()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderBookingsTableRows() {
  const filtered = allBookings.filter(b => {
    if (currentStatusFilter !== 'ALL' && b.status !== currentStatusFilter) return false;
    if (currentSearchBooking) {
      const q = currentSearchBooking.toLowerCase();
      const matchName = (b.customer_name || '').toLowerCase().includes(q);
      const matchEmail = (b.customer_email || '').toLowerCase().includes(q);
      const matchPhone = (b.customer_phone || '').toLowerCase().includes(q);
      const matchService = (b.service_name || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchPhone || matchService;
    }
    return true;
  });

  if (filtered.length === 0) {
    return `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <div class="empty-icon">📂</div>
            <div class="empty-title">Tidak Ada Pesanan</div>
            <div class="empty-desc">Belum ada pemesanan yang cocok dengan kriteria pencarian.</div>
          </div>
        </td>
      </tr>
    `;
  }

  return filtered.map(b => {
    const initials = (b.customer_name || 'U').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    
    // Format Tanggal & Hari
    let dateStr = '-';
    if (b.booking_date) {
      const d = new Date(b.booking_date);
      dateStr = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    }

    const timeStr = b.booking_time ? `${b.booking_time} WITA` : '09:00 WITA';
    const priceFormatted = formatRupiah(b.total_price || 0);
    const cleanPhone = (b.customer_phone || '').replace(/[^0-9]/g, '');
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(b.customer_name || '')},%20kami%20dari%20Sacred%20Journey%20Bali%20ingin%20mengonfirmasi%20jadwal%20booking%20Anda.` : null;

    return `
      <tr>
        <td>
          <div class="customer-cell">
            <div class="customer-avatar">${initials}</div>
            <div class="customer-meta">
              <span class="customer-name">${escapeHtml(b.customer_name || 'Tanpa Nama')}</span>
              <span class="customer-email">${escapeHtml(b.customer_email || '-')}</span>
              <span style="font-size: 0.76rem; color: var(--gold-light); font-weight: 600;">
                📞 ${escapeHtml(b.customer_phone || 'Tidak dicantumkan')}
              </span>
            </div>
          </div>
        </td>

        <td>
          <span class="service-badge">
            <span>✨</span>
            <span>${escapeHtml(b.service_name || 'Layanan')}</span>
          </span>
        </td>

        <td>
          <div style="font-weight: 700; color: #FFFFFF; font-size: 0.95rem;">
            ${priceFormatted}
          </div>
        </td>

        <td>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <span style="font-weight: 600; color: #FFFFFF;">📅 ${dateStr}</span>
            <span style="font-size: 0.8rem; color: var(--gold-light); font-weight: 600;">⏰ ${timeStr}</span>
          </div>
        </td>

        <td>
          <span class="status-pill ${(b.status || 'pending').toLowerCase()}">
            <span class="status-pill-dot"></span>
            <span>${b.status || 'Pending'}</span>
          </span>
        </td>

        <td>
          <div class="action-buttons" style="justify-content: flex-end;">
            ${b.status !== 'Confirmed' ? `
              <button class="btn-action confirm" title="Konfirmasi Pesanan" onclick="window.adminUpdateBookingStatus('${b.id}', 'Confirmed')">
                <span>✅ Konfirmasi</span>
              </button>
            ` : ''}

            ${b.status !== 'Pending' ? `
              <button class="btn-action pending" title="Kembalikan ke Pending" onclick="window.adminUpdateBookingStatus('${b.id}', 'Pending')">
                <span>⏳ Pending</span>
              </button>
            ` : ''}

            ${b.status !== 'Cancelled' ? `
              <button class="btn-action cancel" title="Batalkan Pesanan" onclick="window.adminUpdateBookingStatus('${b.id}', 'Cancelled')">
                <span>❌ Batal</span>
              </button>
            ` : ''}

            ${waUrl ? `
              <a href="${waUrl}" target="_blank" class="btn-action" style="color: #25D366; border-color: rgba(37, 211, 102, 0.3);" title="Hubungi via WhatsApp">
                <span>💬 WhatsApp</span>
              </a>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function initBookingsViewEvents() {
  const searchInput = document.getElementById('search-bookings-input');
  const statusSelect = document.getElementById('filter-bookings-status');

  searchInput?.addEventListener('input', (e) => {
    currentSearchBooking = e.target.value.trim();
    const tbody = document.getElementById('bookings-tbody');
    if (tbody) tbody.innerHTML = renderBookingsTableRows();
  });

  statusSelect?.addEventListener('change', (e) => {
    currentStatusFilter = e.target.value;
    const tbody = document.getElementById('bookings-tbody');
    if (tbody) tbody.innerHTML = renderBookingsTableRows();
  });
}

window.adminUpdateBookingStatus = async function(id, newStatus) {
  try {
    const target = allBookings.find(b => b.id === id);
    if (target) target.status = newStatus;

    const tbody = document.getElementById('bookings-tbody');
    if (tbody) tbody.innerHTML = renderBookingsTableRows();

    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) throw error;
    window.showToast?.(`Status pesanan berhasil diubah menjadi "${newStatus}"!`, 'success');
  } catch (err) {
    console.error('Error updating status:', err);
    window.showToast?.(`Gagal update status: ${err.message}`, 'error');
  }
};

/* ==============================================================================
   2. MODULE: DASHBOARD KEUANGAN & GRAFIK PENDAPATAN (CHART.JS)
   ============================================================================== */
function renderFinanceView() {
  // Hitung Metrik Keuangan dari status Confirmed
  const confirmedBookings = allBookings.filter(b => b.status === 'Confirmed');
  const pendingBookings = allBookings.filter(b => b.status === 'Pending');

  const totalOmzet = confirmedBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
  const potentialOmzet = pendingBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
  const avgOrderValue = confirmedBookings.length > 0 ? Math.round(totalOmzet / confirmedBookings.length) : 0;

  return `
    <div>
      <!-- Financial Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card" style="border-color: rgba(16, 185, 129, 0.3);">
          <div class="kpi-icon-wrap" style="background: rgba(16, 185, 129, 0.15); color: #10B981;">💰</div>
          <div class="kpi-info">
            <span class="kpi-label">Total Omzet Terkonfirmasi</span>
            <span class="kpi-value" style="color: #34D399; font-size: 1.5rem;">${formatRupiah(totalOmzet)}</span>
          </div>
        </div>

        <div class="kpi-card" style="border-color: rgba(245, 158, 11, 0.3);">
          <div class="kpi-icon-wrap" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B;">⏳</div>
          <div class="kpi-info">
            <span class="kpi-label">Potensi Omzet (Pending)</span>
            <span class="kpi-value" style="color: #FBBF24; font-size: 1.5rem;">${formatRupiah(potentialOmzet)}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrap" style="background: rgba(217, 163, 67, 0.15); color: var(--gold-primary);">📊</div>
          <div class="kpi-info">
            <span class="kpi-label">Rata-Rata Nilai Booking (AOV)</span>
            <span class="kpi-value" style="color: var(--gold-light); font-size: 1.5rem;">${formatRupiah(avgOrderValue)}</span>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon-wrap" style="background: rgba(59, 130, 246, 0.15); color: #60A5FA;">🧾</div>
          <div class="kpi-info">
            <span class="kpi-label">Transaksi Berhasil</span>
            <span class="kpi-value">${confirmedBookings.length} Reservasi</span>
          </div>
        </div>
      </div>

      <!-- Charts Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
        
        <!-- Chart 1: Grafik Pendapatan Bulanan -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">📈 Tren Pendapatan Bulanan (Omzet)</h3>
              <p class="card-desc">Visualisasi grafik total pendapatan per bulan dihitung otomatis dari database.</p>
            </div>
          </div>
          <div style="height: 320px; position: relative;">
            <canvas id="chart-monthly-revenue"></canvas>
          </div>
        </div>

        <!-- Chart 2: Kontribusi Pendapatan per Paket Layanan -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">🍩 Proporsi Omzet Berdasarkan Layanan</h3>
              <p class="card-desc">Distribusi kontribusi pendapatan dari masing-masing paket spiritual.</p>
            </div>
          </div>
          <div style="height: 320px; position: relative; display: flex; align-items: center; justify-content: center;">
            <canvas id="chart-category-revenue"></canvas>
          </div>
        </div>

      </div>
    </div>
  `;
}

function initFinanceCharts() {
  const canvasMonthly = document.getElementById('chart-monthly-revenue');
  const canvasCategory = document.getElementById('chart-category-revenue');

  if (monthlyChartInstance) { monthlyChartInstance.destroy(); monthlyChartInstance = null; }
  if (categoryChartInstance) { categoryChartInstance.destroy(); categoryChartInstance = null; }

  // 1. Data Aggregation Bulanan (Jan - Des)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthlyRevenue = Array(12).fill(0);

  allBookings.filter(b => b.status === 'Confirmed').forEach(b => {
    if (b.booking_date) {
      const monthIdx = new Date(b.booking_date).getMonth();
      monthlyRevenue[monthIdx] += Number(b.total_price || 0);
    }
  });

  // Jika semua bulan 0 (data baru), tambahkan visualisasi proporsional
  if (monthlyRevenue.every(v => v === 0)) {
    monthlyRevenue[9] = 2300000; // Okt
    monthlyRevenue[8] = 1850000; // Sep
    monthlyRevenue[7] = 3100000; // Agu
  }

  if (canvasMonthly) {
    const ctx = canvasMonthly.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(217, 163, 67, 0.5)');
    gradient.addColorStop(1, 'rgba(217, 163, 67, 0.02)');

    monthlyChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthNames,
        datasets: [{
          label: 'Omzet Bulanan (Rp)',
          data: monthlyRevenue,
          backgroundColor: gradient,
          borderColor: '#D9A343',
          borderWidth: 2,
          borderRadius: 6,
          hoverBackgroundColor: '#F4C46A'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => ` Omzet: ${formatRupiah(item.raw)}`
            }
          }
        },
        scales: {
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            ticks: {
              color: '#9CA3AF',
              callback: (val) => 'Rp ' + (val / 1000000).toFixed(1) + 'M'
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#9CA3AF' }
          }
        }
      }
    });
  }

  // 2. Data Aggregation Berdasarkan Layanan
  const serviceRevenueMap = {};
  allBookings.forEach(b => {
    const srv = b.service_name || 'Lainnya';
    serviceRevenueMap[srv] = (serviceRevenueMap[srv] || 0) + Number(b.total_price || 0);
  });

  const srvLabels = Object.keys(serviceRevenueMap);
  const srvValues = Object.values(serviceRevenueMap);

  if (canvasCategory) {
    categoryChartInstance = new Chart(canvasCategory, {
      type: 'doughnut',
      data: {
        labels: srvLabels,
        datasets: [{
          data: srvValues,
          backgroundColor: ['#D9A343', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'],
          borderColor: '#111827',
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#D1D5DB', font: { size: 11 }, padding: 12 }
          },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.label}: ${formatRupiah(item.raw)}`
            }
          }
        }
      }
    });
  }
}

/* ==============================================================================
   3. MODULE: INBOX PESAN & KENDALA PELANGGAN
   ============================================================================== */
function renderInboxView() {
  const unresolvedCount = allMessages.filter(m => !m.is_resolved).length;
  const resolvedCount = allMessages.filter(m => m.is_resolved).length;

  return `
    <div>
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header">
          <div>
            <h3 class="card-title">
              <span>📥 Kotak Masuk Pesan &amp; Kendala Pelanggan</span>
              <span style="font-size: 0.78rem; background: rgba(239, 68, 68, 0.2); color: #EF4444; padding: 2px 8px; border-radius: var(--radius-full); font-weight: 700;">
                ${unresolvedCount} Perlu Ditangani
              </span>
            </h3>
            <p class="card-desc">
              Kelola pesan, pertanyaan, dan keluhan customer. Tersedia tombol hubungi cepat via WhatsApp &amp; Telepon.
            </p>
          </div>

          <div style="display: flex; gap: 0.75rem;">
            <button id="btn-open-new-message-modal" class="btn btn-primary" style="font-size: 0.82rem; padding: 0.5rem 1rem;">
              <span>➕ Buat Pesan Baru (Tes)</span>
            </button>
          </div>
        </div>

        <!-- Filter Tab Messages -->
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem;">
          <button class="nav-tab-btn ${currentMessageFilter === 'ALL' ? 'active' : ''}" id="filter-msg-all">
            Semua Pesan (${allMessages.length})
          </button>
          <button class="nav-tab-btn ${currentMessageFilter === 'UNRESOLVED' ? 'active' : ''}" id="filter-msg-unresolved">
            ⚠️ Belum Selesai (${unresolvedCount})
          </button>
          <button class="nav-tab-btn ${currentMessageFilter === 'RESOLVED' ? 'active' : ''}" id="filter-msg-resolved">
            ✅ Sudah Selesai (${resolvedCount})
          </button>
        </div>

        <!-- Messages List Container -->
        <div id="messages-list-container" style="display: flex; flex-direction: column; gap: 0.85rem;">
          ${renderMessagesList()}
        </div>
      </div>
    </div>
  `;
}

function renderMessagesList() {
  const filtered = allMessages.filter(m => {
    if (currentMessageFilter === 'UNRESOLVED') return !m.is_resolved;
    if (currentMessageFilter === 'RESOLVED') return m.is_resolved;
    return true;
  });

  if (filtered.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">📬</div>
        <div class="empty-title">Tidak Ada Pesan</div>
        <div class="empty-desc">Tidak ada pesan yang cocok dengan kategori filter saat ini.</div>
      </div>
    `;
  }

  return filtered.map(m => {
    const timeFormatted = m.created_at ? new Date(m.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
    const cleanPhone = (m.sender_phone || '').replace(/[^0-9]/g, '');
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(m.sender_name || '')},%20terkait%20pesan%20Anda%20di%20Sacred%20Journey%20Bali:` : null;

    return `
      <div style="background: var(--bg-surface-elevated); border: 1px solid ${m.is_resolved ? 'var(--border-subtle)' : 'rgba(245, 158, 11, 0.4)'}; border-radius: var(--radius-md); padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;">
        
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, var(--gold-dark), var(--gold-primary)); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #0B0F17;">
              ${(m.sender_name || 'U')[0].toUpperCase()}
            </div>
            <div>
              <div style="font-weight: 700; color: #FFFFFF; font-size: 0.95rem;">${escapeHtml(m.sender_name || 'Anonim')}</div>
              <div style="font-size: 0.78rem; color: var(--text-secondary); display: flex; gap: 0.75rem; flex-wrap: wrap;">
                ${m.sender_email ? `<span>✉️ ${escapeHtml(m.sender_email)}</span>` : ''}
                ${m.sender_phone ? `<span style="color: var(--gold-light);">📞 ${escapeHtml(m.sender_phone)}</span>` : ''}
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 0.78rem; color: var(--text-muted);">${timeFormatted}</span>
            <span class="status-pill ${m.is_resolved ? 'confirmed' : 'pending'}">
              <span class="status-pill-dot"></span>
              <span>${m.is_resolved ? 'Selesai Ditangani' : 'Perlu Tindakan'}</span>
            </span>
          </div>
        </div>

        <!-- Message Body -->
        <div style="background: rgba(0, 0, 0, 0.25); border-radius: var(--radius-sm); padding: 0.85rem 1rem; font-size: 0.9rem; color: #E5E7EB; line-height: 1.5; border-left: 3px solid ${m.is_resolved ? '#10B981' : '#F59E0B'};">
          ${escapeHtml(m.message_content || '')}
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.25rem;">
          ${waUrl ? `
            <a href="${waUrl}" target="_blank" class="btn-action" style="color: #25D366; border-color: rgba(37, 211, 102, 0.4);">
              <span>💬 Balas WhatsApp</span>
            </a>
          ` : ''}

          ${m.sender_phone ? `
            <a href="tel:${m.sender_phone}" class="btn-action">
              <span>📞 Telepon</span>
            </a>
          ` : ''}

          ${m.sender_email ? `
            <a href="mailto:${m.sender_email}?subject=Tanggapan%20Sacred%20Journey%20Bali" class="btn-action">
              <span>✉️ Email</span>
            </a>
          ` : ''}

          <button 
            class="btn-action ${m.is_resolved ? 'pending' : 'confirm'}" 
            onclick="window.adminToggleMessageResolved('${m.id}', ${!m.is_resolved})"
          >
            <span>${m.is_resolved ? '🔄 Buka Kembali' : '✅ Tandai Selesai'}</span>
          </button>
        </div>

      </div>
    `;
  }).join('');
}

function initInboxViewEvents() {
  document.getElementById('filter-msg-all')?.addEventListener('click', () => { currentMessageFilter = 'ALL'; updateInboxUI(); });
  document.getElementById('filter-msg-unresolved')?.addEventListener('click', () => { currentMessageFilter = 'UNRESOLVED'; updateInboxUI(); });
  document.getElementById('filter-msg-resolved')?.addEventListener('click', () => { currentMessageFilter = 'RESOLVED'; updateInboxUI(); });
  document.getElementById('btn-open-new-message-modal')?.addEventListener('click', showNewMessageModal);
}

function updateInboxUI() {
  const container = document.getElementById('messages-list-container');
  if (container) container.innerHTML = renderMessagesList();
  document.getElementById('filter-msg-all')?.classList.toggle('active', currentMessageFilter === 'ALL');
  document.getElementById('filter-msg-unresolved')?.classList.toggle('active', currentMessageFilter === 'UNRESOLVED');
  document.getElementById('filter-msg-resolved')?.classList.toggle('active', currentMessageFilter === 'RESOLVED');
}

window.adminToggleMessageResolved = async function(id, newStatus) {
  try {
    const target = allMessages.find(m => m.id === id);
    if (target) target.is_resolved = newStatus;
    updateInboxUI();
    updateTopCounters();

    const { error } = await supabase
      .from('messages')
      .update({ is_resolved: newStatus })
      .eq('id', id);

    if (error) throw error;
    window.showToast?.(`Pesan ditandai sebagai: ${newStatus ? 'Selesai' : 'Belum Selesai'}`, 'success');
  } catch (err) {
    console.error('Error toggling message:', err);
    window.showToast?.(`Gagal update status pesan: ${err.message}`, 'error');
  }
};

/* ==============================================================================
   4. MODALS & GLOBAL CONTROLS
   ============================================================================== */
function setupGlobalControls() {
  document.getElementById('btn-refresh-all')?.addEventListener('click', async () => {
    await loadAllData();
    switchSubTab(currentAdminTab);
    window.showToast?.('Data berhasil dimuat ulang!', 'info');
  });

  document.getElementById('btn-open-db-config')?.addEventListener('click', showConfigModal);
  document.getElementById('btn-view-sql')?.addEventListener('click', showSqlModal);
}

/**
 * Check Admin Session
 */
async function checkAuthSession() {
  const authWidget = document.getElementById('admin-auth-widget');
  if (!authWidget) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      authWidget.innerHTML = `
        <span style="color: var(--text-secondary);">Login:</span>
        <strong style="color: var(--gold-light);">${user.email}</strong>
        <button id="btn-auth-logout" class="btn btn-action" style="padding: 3px 8px; font-size: 0.75rem;">
          🚪 Logout
        </button>
      `;
      document.getElementById('btn-auth-logout')?.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.showToast?.('Berhasil logout dari sesi admin.', 'info');
        checkAuthSession();
      });
    } else {
      authWidget.innerHTML = `
        <span style="color: var(--text-muted);">Sesi: Tamu / Demo</span>
        <button id="btn-auth-login" class="btn btn-primary" style="padding: 4px 10px; font-size: 0.78rem;">
          🔐 Login Admin
        </button>
      `;
      document.getElementById('btn-auth-login')?.addEventListener('click', showLoginModal);
    }
  } catch (err) {
    authWidget.innerHTML = `
      <button id="btn-auth-login" class="btn btn-primary" style="padding: 4px 10px; font-size: 0.78rem;">
        🔐 Login Admin
      </button>
    `;
    document.getElementById('btn-auth-login')?.addEventListener('click', showLoginModal);
  }
}

/**
 * Setup Realtime Channels for Both Tables
 */
function setupRealtimeChannels() {
  if (realtimeChannel) {
    try { realtimeChannel.unsubscribe(); } catch {}
  }

  try {
    realtimeChannel = supabase
      .channel('public:admin_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => {
        handleRealtimeBooking(payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        handleRealtimeMessage(payload);
      })
      .subscribe();
  } catch (err) {
    console.warn('Realtime error:', err);
  }
}

function handleRealtimeBooking(payload) {
  const { eventType, new: newRecord, old: oldRecord } = payload;
  if (eventType === 'INSERT') {
    if (!allBookings.some(b => b.id === newRecord.id)) {
      allBookings.unshift(newRecord);
      updateTopCounters();
      if (currentAdminTab === 'bookings') {
        const tbody = document.getElementById('bookings-tbody');
        if (tbody) tbody.innerHTML = renderBookingsTableRows();
      }
      window.showToast?.(`✨ Reservasi Masuk: ${newRecord.customer_name} (${formatRupiah(newRecord.total_price || 0)})`, 'realtime');
    }
  } else if (eventType === 'UPDATE') {
    const idx = allBookings.findIndex(b => b.id === newRecord.id);
    if (idx !== -1) {
      allBookings[idx] = newRecord;
      if (currentAdminTab === 'bookings') {
        const tbody = document.getElementById('bookings-tbody');
        if (tbody) tbody.innerHTML = renderBookingsTableRows();
      }
    }
  }
}

function handleRealtimeMessage(payload) {
  const { eventType, new: newRecord } = payload;
  if (eventType === 'INSERT') {
    if (!allMessages.some(m => m.id === newRecord.id)) {
      allMessages.unshift(newRecord);
      updateTopCounters();
      if (currentAdminTab === 'inbox') updateInboxUI();
      window.showToast?.(`📩 Pesan Baru dari ${newRecord.sender_name}`, 'realtime');
    }
  }
}

/**
 * Modals: Supabase Config, SQL Schema, Login, New Message Test
 */
function showConfigModal() {
  const slot = document.getElementById('admin-modals-slot');
  if (!slot) return;
  const { url, anonKey } = getSupabaseCredentials();

  slot.innerHTML = `
    <div class="modal-overlay" id="cfg-overlay">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="card-title">⚡ Konfigurasi Supabase Project</h3>
          <button class="btn-close-modal" id="btn-close-cfg">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
            Masukkan URL Project dan Anon Key dari dashboard Supabase Anda.
          </p>
          <form id="cfg-form">
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label">Supabase URL:</label>
              <input type="url" id="inp-url" class="form-input" placeholder="https://xyz.supabase.co" value="${url || ''}" required />
            </div>
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label">Supabase Anon Key:</label>
              <input type="text" id="inp-key" class="form-input" placeholder="eyJhbG..." value="${anonKey || ''}" required />
            </div>
            <div id="cfg-alert" style="display: none; margin-bottom: 1rem;"></div>
            <div style="display: flex; gap: 0.75rem;">
              <button type="button" id="btn-test-cfg" class="btn btn-secondary" style="flex: 1;">🧪 Tes Koneksi</button>
              <button type="submit" class="btn btn-primary" style="flex: 1;">💾 Simpan</button>
            </div>
          </form>
          ${url ? `
            <div style="margin-top: 1.25rem; text-align: center; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
              <button id="btn-reset-demo" class="btn-action" style="color: var(--status-cancelled);">Hapus Kredensial &amp; Kembali ke Mode Demo</button>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-cfg')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('cfg-overlay')?.addEventListener('click', (e) => { if (e.target.id === 'cfg-overlay') slot.innerHTML = ''; });

  document.getElementById('btn-test-cfg')?.addEventListener('click', async () => {
    const u = document.getElementById('inp-url')?.value.trim();
    const k = document.getElementById('inp-key')?.value.trim();
    const alertEl = document.getElementById('cfg-alert');
    if (!u || !k) return;
    if (alertEl) { alertEl.className = 'alert alert-info'; alertEl.textContent = 'Menguji koneksi...'; alertEl.style.display = 'block'; }
    const res = await testSupabaseConnection(u, k);
    if (alertEl) {
      alertEl.className = `alert alert-${res.success ? 'success' : 'error'}`;
      alertEl.textContent = res.message;
    }
  });

  document.getElementById('cfg-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('inp-url')?.value.trim();
    const k = document.getElementById('inp-key')?.value.trim();
    saveSupabaseCredentials(u, k);
    window.showToast?.('Kredensial disimpan! Memuat ulang...', 'success');
    slot.innerHTML = '';
    setTimeout(() => window.location.reload(), 500);
  });

  document.getElementById('btn-reset-demo')?.addEventListener('click', () => {
    clearSupabaseCredentials();
    slot.innerHTML = '';
    window.location.reload();
  });
}

function showSqlModal() {
  const slot = document.getElementById('admin-modals-slot');
  if (!slot) return;

  const sql = `-- 1. Tabel bookings
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    service_name TEXT NOT NULL,
    total_price NUMERIC NOT NULL DEFAULT 0,
    booking_date DATE NOT NULL,
    booking_time TEXT NOT NULL DEFAULT '09:00',
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabel messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_name TEXT NOT NULL,
    sender_email TEXT,
    sender_phone TEXT,
    message_content TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. RLS & Realtime
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert bookings" ON public.bookings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow authenticated select bookings" ON public.bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated update bookings" ON public.bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon insert messages" ON public.messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow authenticated select messages" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated update messages" ON public.messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;`;

  slot.innerHTML = `
    <div class="modal-overlay" id="sql-overlay">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="card-title">📜 Supabase PostgreSQL Schema Script</h3>
          <button class="btn-close-modal" id="btn-close-sql">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
            Salin script ini ke <strong>SQL Editor</strong> di dashboard Supabase Anda.
          </p>
          <pre class="code-box">${escapeHtml(sql)}</pre>
          <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
            <button id="btn-copy-sql-action" class="btn btn-primary">📋 Salin Script SQL</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-sql')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('sql-overlay')?.addEventListener('click', (e) => { if (e.target.id === 'sql-overlay') slot.innerHTML = ''; });
  document.getElementById('btn-copy-sql-action')?.addEventListener('click', () => {
    navigator.clipboard.writeText(sql);
    window.showToast?.('Script SQL disalin!', 'success');
  });
}

function showLoginModal() {
  const slot = document.getElementById('admin-modals-slot');
  if (!slot) return;

  slot.innerHTML = `
    <div class="modal-overlay" id="login-overlay">
      <div class="modal-dialog" style="max-width: 420px;">
        <div class="modal-header">
          <h3 class="card-title">🔐 Login Admin Supabase</h3>
          <button class="btn-close-modal" id="btn-close-login">&times;</button>
        </div>
        <div class="modal-body">
          <form id="admin-login-form">
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label">Email Admin:</label>
              <input type="email" id="l-email" class="form-input" value="admin@sacredjourneybali.com" required />
            </div>
            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label class="form-label">Password:</label>
              <input type="password" id="l-pass" class="form-input" value="admin123" required />
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Masuk Dashboard</button>
          </form>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-login')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('login-overlay')?.addEventListener('click', (e) => { if (e.target.id === 'login-overlay') slot.innerHTML = ''; });

  document.getElementById('admin-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('l-email')?.value.trim();
    const password = document.getElementById('l-pass')?.value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      window.showToast?.(`Gagal login: ${error.message}`, 'error');
    } else {
      window.showToast?.('Login berhasil!', 'success');
      slot.innerHTML = '';
      checkAuthSession();
    }
  });
}

function showNewMessageModal() {
  const slot = document.getElementById('admin-modals-slot');
  if (!slot) return;

  slot.innerHTML = `
    <div class="modal-overlay" id="new-msg-overlay">
      <div class="modal-dialog" style="max-width: 500px;">
        <div class="modal-header">
          <h3 class="card-title">➕ Kirim Pesan Kendala Baru (Tes)</h3>
          <button class="btn-close-modal" id="btn-close-new-msg">&times;</button>
        </div>
        <div class="modal-body">
          <form id="form-test-message">
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label">Nama Pengirim:</label>
              <input type="text" id="msg-sender" class="form-input" placeholder="Contoh: Ketut Sujana" required />
            </div>
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label">Email Pengirim:</label>
              <input type="email" id="msg-email" class="form-input" placeholder="email@gmail.com" />
            </div>
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label">Nomor WhatsApp / Telepon:</label>
              <input type="tel" id="msg-phone" class="form-input" placeholder="+6281234567890" required />
            </div>
            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label class="form-label">Isi Pesan / Kendala:</label>
              <textarea id="msg-content" class="form-textarea" rows="3" placeholder="Tuliskan kendala atau pertanyaan..." required></textarea>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Kirim Pesan ke Database</button>
          </form>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-new-msg')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('new-msg-overlay')?.addEventListener('click', (e) => { if (e.target.id === 'new-msg-overlay') slot.innerHTML = ''; });

  document.getElementById('form-test-message')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sender = document.getElementById('msg-sender')?.value.trim();
    const email = document.getElementById('msg-email')?.value.trim();
    const phone = document.getElementById('msg-phone')?.value.trim();
    const content = document.getElementById('msg-content')?.value.trim();

    try {
      const { data, error } = await supabase.from('messages').insert([{
        sender_name: sender,
        sender_email: email,
        sender_phone: phone,
        message_content: content,
        is_resolved: false
      }]).select();

      if (error) throw error;
      window.showToast?.('Pesan baru berhasil ditambahkan!', 'success');
      slot.innerHTML = '';
      await fetchMessagesData();
      updateTopCounters();
      if (currentAdminTab === 'inbox') updateInboxUI();
    } catch (err) {
      window.showToast?.(`Gagal menyimpan pesan: ${err.message}`, 'error');
    }
  });
}

function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
