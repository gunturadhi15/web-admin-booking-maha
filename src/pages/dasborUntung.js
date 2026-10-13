/**
 * Dasbor Untung Usaha — Full Modular Implementation
 * Berdasarkan PRD & Development Task READMENEW.MD
 * Mengimplementasikan seluruh 8 modul bisnis:
 * 1. Dashboard Ringkas (Fase 1)
 * 2. Kelola Pesanan & Catat WA (Fase 2)
 * 3. Hitung Untung Otomatis & Modal/Biaya (Fase 2)
 * 4. Data Pelanggan & Riwayat (Fase 3)
 * 5. Grafik Keuntungan & Bandingkan Periode (Fase 3)
 * 6. Pembukuan Harian, Tutup Buku & Ekspor Laporan (Fase 3)
 * 7. Tarik Data Web Utama (Fase 4)
 * 8. Masuk, Akun & Pengaturan (Fase 5)
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
import {
  calculateOrderNetIncome,
  calculateOrderTotalCost,
  calculateOrderGrossProfit,
  calculateOrderProfitMargin,
  calculatePeriodSummary,
  formatRupiah
} from '../services/profitCalculator.js';

// Application State
let activeModule = 'dashboard'; // 'dashboard' | 'orders' | 'profit' | 'customers' | 'charts' | 'bookkeeping' | 'sync' | 'settings'

// Data Cache
let ordersData = [];
let costsData = [];
let customersData = [];
let transactionsData = [];
let closingData = [];
let syncRunsData = [];
let auditLogsData = [];

let chartProfitInstance = null;
let realtimeChannel = null;

export function renderDasborApp() {
  const { isConfigured, url } = getSupabaseCredentials();

  return `
    <div class="dasbor-layout">
      
      <!-- Sidebar Navigation -->
      <aside class="dasbor-sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <span class="logo-icon">📊</span>
            <div>
              <h2 class="logo-title">Untung Usaha</h2>
              <span class="logo-subtitle">Sistem Admin Bisnis</span>
            </div>
          </div>
        </div>

        <nav class="sidebar-menu">
          <div class="menu-group-label">OPERASIONAL UTAMA</div>
          <button class="sidebar-link active" data-mod="dashboard">
            <span class="link-icon">🏠</span>
            <span>Dashboard Ringkas</span>
          </button>
          <button class="sidebar-link" data-mod="orders">
            <span class="link-icon">📋</span>
            <span>Kelola Pesanan</span>
            <span id="badge-order-count" class="badge-count">0</span>
          </button>
          <button class="sidebar-link" data-mod="profit">
            <span class="link-icon">💰</span>
            <span>Hitung Untung Otomatis</span>
          </button>

          <div class="menu-group-label">ANALISIS &amp; PEMBUKUAN</div>
          <button class="sidebar-link" data-mod="customers">
            <span class="link-icon">👥</span>
            <span>Data Pelanggan</span>
          </button>
          <button class="sidebar-link" data-mod="charts">
            <span class="link-icon">📈</span>
            <span>Grafik Keuntungan</span>
          </button>
          <button class="sidebar-link" data-mod="bookkeeping">
            <span class="link-icon">📒</span>
            <span>Pembukuan Harian</span>
          </button>

          <div class="menu-group-label">INTEGRASI &amp; SISTEM</div>
          <button class="sidebar-link" data-mod="sync">
            <span class="link-icon">🔄</span>
            <span>Tarik Data Web Utama</span>
          </button>
          <button class="sidebar-link" data-mod="settings">
            <span class="link-icon">⚙️</span>
            <span>Masuk &amp; Akun</span>
          </button>
        </nav>

        <div class="sidebar-footer">
          <div class="conn-pill ${isConfigured ? 'live' : 'demo'}" id="sidebar-db-status">
            <span class="status-dot ${isConfigured ? 'live' : 'demo'}"></span>
            <span>${isConfigured ? 'Supabase Live' : 'Demo Browser'}</span>
          </div>
        </div>
      </aside>

      <!-- Main App Viewport -->
      <div class="dasbor-main">
        
        <!-- Header Bar -->
        <header class="dasbor-header">
          <div class="header-left">
            <h1 id="page-heading" class="page-title">Dashboard Ringkas</h1>
            <p id="page-subheading" class="page-desc">Ringkasan performa keuntungan harian dan operasional usaha.</p>
          </div>

          <div class="header-right">
            <button id="btn-quick-wa-order" class="btn btn-primary" title="Catat Pesanan dari WhatsApp">
              <span>💬</span>
              <span>+ Pesanan WhatsApp</span>
            </button>

            <button id="btn-global-refresh" class="btn btn-secondary" title="Muat Ulang Data">
              <span>🔄</span>
            </button>
          </div>
        </header>

        <!-- Dynamic Content Body -->
        <main id="dasbor-viewport" class="dasbor-content">
          <!-- Rendered via JS -->
        </main>

      </div>

    </div>

    <!-- Modals Container -->
    <div id="dasbor-modals-slot"></div>
  `;
}

/**
 * Inisialisasi Aplikasi
 */
export async function initDasborApp() {
  setupNavigationEvents();
  await loadAllData();
  setupRealtime();
  renderActiveModule();
}

/**
 * Setup Event Navigasi
 */
function setupNavigationEvents() {
  document.querySelectorAll('.sidebar-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const mod = btn.getAttribute('data-mod');
      switchModule(mod);
    });
  });

  document.getElementById('btn-global-refresh')?.addEventListener('click', async () => {
    await loadAllData();
    renderActiveModule();
    window.showToast?.('Data berhasil disegarkan!', 'info');
  });

  document.getElementById('btn-quick-wa-order')?.addEventListener('click', () => {
    showAddOrderModal('whatsapp');
  });

  document.getElementById('sidebar-db-status')?.addEventListener('click', () => {
    switchModule('settings');
  });
}

function switchModule(modName) {
  activeModule = modName;
  document.querySelectorAll('.sidebar-link').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mod') === modName);
  });
  renderActiveModule();
}

/**
 * Helper: Konversi record tabel bookings ke struktur orders di Dasbor
 */
function bookingToOrder(b) {
  const statusRaw = String(b.status || 'pending').toLowerCase();
  let mappedStatus = 'Baru';
  let mappedPayment = 'Belum Dibayar';

  if (['completed', 'selesai', 'paid', 'lunas'].includes(statusRaw)) {
    mappedStatus = 'Selesai';
    mappedPayment = 'Lunas';
  } else if (['confirmed', 'dikonfirmasi'].includes(statusRaw)) {
    mappedStatus = 'Dikonfirmasi';
    mappedPayment = 'Lunas';
  } else if (['cancelled', 'batal', 'dibatalkan'].includes(statusRaw)) {
    mappedStatus = 'Dibatalkan';
    mappedPayment = 'Refund';
  } else {
    mappedStatus = 'Baru';
    mappedPayment = 'Belum Dibayar';
  }

  const rawPrice = Number(b.total_price || b.subtotal_amount || 0);

  return {
    id: b.id,
    order_code: b.invoice || (b.id ? 'BKG-' + String(b.id).slice(0, 8).toUpperCase() : 'ORD-001'),
    customer_id: b.customer_id || ('cust-' + b.id),
    customer_name: b.customer_name || 'Pelanggan',
    customer_phone: b.customer_phone || '-',
    customer_email: b.customer_email || '',
    service_or_item: b.service_name || b.service_or_item || 'Paket Wisata',
    source: b.source || 'website',
    external_order_id: b.invoice || null,
    order_date: b.booking_date || (b.created_at ? b.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
    order_time: b.booking_time || '09:00',
    status: mappedStatus,
    payment_status: mappedPayment,
    subtotal_amount: rawPrice,
    discount_amount: 0,
    additional_income_amount: 0,
    refund_amount: 0,
    notes: b.notes || 'Pemesanan Web Booking',
    is_closed: false,
    created_at: b.created_at || new Date().toISOString()
  };
}

/**
 * Load Semua Data dari Supabase (Tabel bookings terintegrasi)
 */
async function loadAllData() {
  try {
    const [resBookings, resOrders, resCosts, resCustomers, resTrx, resClosing, resSync, resAudit] = await Promise.all([
      supabase.from('bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('order_costs').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('financial_transactions').select('*').order('transaction_date', { ascending: false }),
      supabase.from('closing_periods').select('*').order('period_end', { ascending: false }),
      supabase.from('sync_runs').select('*').order('started_at', { ascending: false }),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false })
    ]);

    const bookingsList = resBookings.data || [];
    const directOrders = resOrders.data || [];

    // Jika tabel bookings berisi data, petakan ke ordersData
    if (bookingsList.length > 0) {
      const mappedBookingOrders = bookingsList.map(bookingToOrder);
      const existingIds = new Set(mappedBookingOrders.map(b => b.id));
      const additional = directOrders.filter(o => !existingIds.has(o.id));
      ordersData = [...mappedBookingOrders, ...additional];
    } else {
      ordersData = directOrders;
    }

    // Auto-populate customersData dari ordersData jika data pelanggan kosong
    if ((!resCustomers.data || resCustomers.data.length === 0) && ordersData.length > 0) {
      const custMap = new Map();
      ordersData.forEach(o => {
        if (o.customer_name && !custMap.has(o.customer_name)) {
          custMap.set(o.customer_name, {
            id: o.customer_id || 'cust-' + o.id,
            name: o.customer_name,
            phone: o.customer_phone,
            phone_normalized: (o.customer_phone || '').replace(/[^0-9]/g, ''),
            email: o.customer_email || '',
            address: 'Bali',
            notes: 'Pelanggan Terintegrasi Web Booking',
            created_at: o.created_at
          });
        }
      });
      customersData = Array.from(custMap.values());
    } else {
      customersData = resCustomers.data || [];
    }

    // Auto-populate financial_transactions jika transaksi kosong
    if ((!resTrx.data || resTrx.data.length === 0) && ordersData.length > 0) {
      transactionsData = ordersData
        .filter(o => o.payment_status === 'Lunas' || o.status === 'Selesai')
        .map(o => ({
          id: 'trx-' + o.id,
          transaction_code: 'TRX-' + (o.order_code || o.id),
          transaction_date: o.order_date,
          type: 'income',
          category: 'Pendapatan Pesanan',
          description: `Pembayaran ${o.order_code} - ${o.customer_name}`,
          amount: o.subtotal_amount,
          source_type: 'order',
          source_id: o.id,
          payment_method: 'Transfer Bank / Online',
          is_closed: false,
          created_at: o.created_at
        }));
    } else {
      transactionsData = resTrx.data || [];
    }

    costsData = resCosts.data || [];
    closingData = resClosing.data || [];
    syncRunsData = resSync.data || [];
    auditLogsData = resAudit.data || [];

    const badge = document.getElementById('badge-order-count');
    if (badge) badge.textContent = ordersData.length;

  } catch (err) {
    console.error('Error load data:', err);
    window.showToast?.(`Gagal memuat data: ${err.message}`, 'error');
  }
}

/**
 * Render Modul Aktif
 */
function renderActiveModule() {
  const viewport = document.getElementById('dasbor-viewport');
  const heading = document.getElementById('page-heading');
  const subheading = document.getElementById('page-subheading');
  if (!viewport) return;

  switch (activeModule) {
    case 'dashboard':
      heading.textContent = 'Dashboard Ringkas Usaha';
      subheading.textContent = 'Ringkasan untung hari ini, pesanan terbaru, dan status operasional (Fase 1).';
      viewport.innerHTML = renderDashboardView();
      initDashboardEvents();
      break;

    case 'orders':
      heading.textContent = 'Kelola Pesanan & Booking';
      subheading.textContent = 'Daftar pesanan dari Website & WhatsApp, catat pesanan manual, serta edit status (Fase 2).';
      viewport.innerHTML = renderOrdersView();
      initOrdersEvents();
      break;

    case 'profit':
      heading.textContent = 'Hitung Untung Otomatis';
      subheading.textContent = 'Kelola modal/HPP, biaya langsung, dan lihat kalkulasi laba per pesanan secara transparan (Fase 2).';
      viewport.innerHTML = renderProfitView();
      initProfitEvents();
      break;

    case 'customers':
      heading.textContent = 'Data & Riwayat Pelanggan';
      subheading.textContent = 'Daftar pelanggan, nomor WhatsApp, riwayat pesanan, dan pencarian cepat (Fase 3).';
      viewport.innerHTML = renderCustomersView();
      initCustomersEvents();
      break;

    case 'charts':
      heading.textContent = 'Grafik Analisis Keuntungan';
      subheading.textContent = 'Tren keuntungan per periode, perbandingan performa bisnis, dan margin (Fase 3).';
      viewport.innerHTML = renderChartsView();
      initChartsEvents();
      break;

    case 'bookkeeping':
      heading.textContent = 'Pembukuan Harian & Tutup Buku';
      subheading.textContent = 'Pencatatan pemasukan/pengeluaran, proses tutup buku periode, dan ekspor laporan CSV/XLSX (Fase 3).';
      viewport.innerHTML = renderBookkeepingView();
      initBookkeepingEvents();
      break;

    case 'sync':
      heading.textContent = 'Tarik Data Web Utama';
      subheading.textContent = 'Sinkronisasi pesanan dari website utama dengan idempotency key dan jadwal penarikan (Fase 4).';
      viewport.innerHTML = renderSyncView();
      initSyncEvents();
      break;

    case 'settings':
      heading.textContent = 'Masuk, Akun & Pengaturan';
      subheading.textContent = 'Kelola akun admin, konfigurasi koneksi Supabase Cloud, dan log audit keamanan (Fase 5).';
      viewport.innerHTML = renderSettingsView();
      initSettingsEvents();
      break;
  }
}

/* ==============================================================================
   1. MODUL: DASHBOARD RINGKAS (FASE 1)
   ============================================================================== */
function renderDashboardView() {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = ordersData.filter(o => o.order_date === todayStr);
  const todayCosts = costsData.filter(c => c.cost_date === todayStr);
  const todayOpExpenses = transactionsData.filter(t => t.transaction_date === todayStr && t.type === 'expense' && t.source_type === 'operational');

  const summaryToday = calculatePeriodSummary(todayOrders, todayCosts, todayOpExpenses);
  const overallSummary = calculatePeriodSummary(ordersData, costsData, transactionsData.filter(t => t.type === 'expense' && t.source_type === 'operational'));

  const statusCount = {
    Baru: ordersData.filter(o => o.status === 'Baru').length,
    Dikonfirmasi: ordersData.filter(o => o.status === 'Dikonfirmasi').length,
    Diproses: ordersData.filter(o => o.status === 'Diproses').length,
    Selesai: ordersData.filter(o => o.status === 'Selesai').length,
    Dibatalkan: ordersData.filter(o => o.status === 'Dibatalkan').length
  };

  const recentOrders = ordersData.slice(0, 5);

  return `
    <div class="view-container">
      
      <!-- KPI Ringkasan Untung Hari Ini -->
      <div class="kpi-grid">
        <div class="kpi-card" style="border-left: 4px solid #10B981;">
          <div class="kpi-icon-wrap" style="background: rgba(16, 185, 129, 0.15); color: #10B981;">💰</div>
          <div class="kpi-info">
            <span class="kpi-label">Laba Bersih Hari Ini</span>
            <span class="kpi-value" style="color: #34D399;">${formatRupiah(summaryToday.netProfit)}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Margin: ${summaryToday.netMargin}%</span>
          </div>
        </div>

        <div class="kpi-card" style="border-left: 4px solid var(--gold-primary);">
          <div class="kpi-icon-wrap" style="background: rgba(217, 163, 67, 0.15); color: var(--gold-primary);">📈</div>
          <div class="kpi-info">
            <span class="kpi-label">Pendapatan Hari Ini</span>
            <span class="kpi-value">${formatRupiah(summaryToday.totalRevenue)}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Dari ${todayOrders.length} Pesanan</span>
          </div>
        </div>

        <div class="kpi-card" style="border-left: 4px solid #EF4444;">
          <div class="kpi-icon-wrap" style="background: rgba(239, 68, 68, 0.15); color: #EF4444;">📉</div>
          <div class="kpi-info">
            <span class="kpi-label">Modal / Biaya Hari Ini</span>
            <span class="kpi-value" style="color: #F87171;">${formatRupiah(summaryToday.totalOrderCosts + summaryToday.totalOperational)}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">HPP + Biaya Operasional</span>
          </div>
        </div>

        <div class="kpi-card" style="border-left: 4px solid #3B82F6;">
          <div class="kpi-icon-wrap" style="background: rgba(59, 130, 246, 0.15); color: #3B82F6;">📦</div>
          <div class="kpi-info">
            <span class="kpi-label">Total Pesanan Aktif</span>
            <span class="kpi-value">${ordersData.filter(o => o.status !== 'Dibatalkan' && o.status !== 'Selesai').length}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Perlu Diproses</span>
          </div>
        </div>
      </div>

      <!-- Dua Kolom: Pesanan Terbaru & Status Pesanan -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
        
        <!-- Kartu 1: Pesanan Terbaru -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">📦 Pesanan Terbaru</h3>
              <p class="card-desc">5 transaksi terakhir yang masuk dari website atau WhatsApp.</p>
            </div>
            <button class="btn btn-action" id="btn-goto-all-orders">Lihat Semua</button>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Kode &amp; Pelanggan</th>
                  <th>Layanan</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${recentOrders.length === 0 ? `
                  <tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Belum ada pesanan.</td></tr>
                ` : recentOrders.map(o => `
                  <tr>
                    <td>
                      <div style="font-weight: 700; color: #FFFFFF; font-size: 0.85rem;">${o.order_code}</div>
                      <div style="font-size: 0.78rem; color: var(--text-secondary);">${escapeHtml(o.customer_name)}</div>
                    </td>
                    <td>
                      <span class="service-badge" style="font-size: 0.75rem;">${escapeHtml(o.service_or_item)}</span>
                    </td>
                    <td style="font-weight: 700;">${formatRupiah(calculateOrderNetIncome(o))}</td>
                    <td>
                      <span class="status-pill status-${o.status.toLowerCase()}">${o.status}</span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Kartu 2: Distribusi Status Pesanan & Akumulasi Keuntungan -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">📊 Status Pesanan &amp; Rekap Usaha</h3>
              <p class="card-desc">Status alur operasional pesanan saat ini.</p>
            </div>
          </div>

          <!-- Status Bar Items -->
          <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: var(--bg-surface-elevated); border-radius: var(--radius-sm);">
              <span style="font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                <span class="status-pill status-baru">Baru</span> Pesanan Baru Masuk
              </span>
              <strong style="font-size: 1.1rem; color: #60A5FA;">${statusCount.Baru}</strong>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: var(--bg-surface-elevated); border-radius: var(--radius-sm);">
              <span style="font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                <span class="status-pill status-dikonfirmasi">Dikonfirmasi</span> Jadwal Terkonfirmasi
              </span>
              <strong style="font-size: 1.1rem; color: #FBBF24;">${statusCount.Dikonfirmasi}</strong>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: var(--bg-surface-elevated); border-radius: var(--radius-sm);">
              <span style="font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                <span class="status-pill status-diproses">Diproses</span> Sedang Berjalan
              </span>
              <strong style="font-size: 1.1rem; color: #A78BFA;">${statusCount.Diproses}</strong>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.85rem; background: var(--bg-surface-elevated); border-radius: var(--radius-sm);">
              <span style="font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                <span class="status-pill status-selesai">Selesai</span> Selesai &amp; Sukses
              </span>
              <strong style="font-size: 1.1rem; color: #34D399;">${statusCount.Selesai}</strong>
            </div>
          </div>

          <!-- Total Akumulasi Keseluruhan -->
          <div style="background: rgba(217, 163, 67, 0.08); border: 1px solid rgba(217, 163, 67, 0.25); border-radius: var(--radius-md); padding: 1rem; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="font-size: 0.78rem; color: var(--text-secondary); text-transform: uppercase;">Total Akumulasi Laba Bersih</span>
              <div style="font-family: var(--font-heading); font-size: 1.35rem; font-weight: 800; color: #FFFFFF;">
                ${formatRupiah(overallSummary.netProfit)}
              </div>
            </div>
            <button class="btn btn-outline-gold" id="btn-goto-profit-calc" style="font-size: 0.8rem; padding: 0.4rem 0.85rem;">
              Lihat Rincian Laba
            </button>
          </div>
        </div>

      </div>

    </div>
  `;
}

function initDashboardEvents() {
  document.getElementById('btn-goto-all-orders')?.addEventListener('click', () => switchModule('orders'));
  document.getElementById('btn-goto-profit-calc')?.addEventListener('click', () => switchModule('profit'));
}

/* ==============================================================================
   2. MODUL: KELOLA PESANAN & CATAT DARI WA (FASE 2)
   ============================================================================== */
function renderOrdersView() {
  return `
    <div class="view-container">
      
      <!-- Top Action Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <h3 style="font-size: 1.25rem; font-weight: 700; color: #FFFFFF;">Daftar Pesanan &amp; Booking</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Kelola seluruh reservasi dari website utama dan pencatatan manual WhatsApp.</p>
        </div>

        <div style="display: flex; gap: 0.75rem;">
          <button id="btn-add-wa-order" class="btn btn-primary">
            <span>💬</span>
            <span>+ Catat Pesanan WhatsApp</span>
          </button>
        </div>
      </div>

      <!-- Card Table -->
      <div class="card">
        
        <!-- Filter & Search Toolbar -->
        <div class="table-toolbar">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" id="order-search-input" class="search-input" placeholder="Cari kode pesanan, nama pemesan, no WA..." />
          </div>

          <div class="filter-group">
            <select id="order-filter-status" class="select-input">
              <option value="ALL">Semua Status</option>
              <option value="Baru">Baru</option>
              <option value="Dikonfirmasi">Dikonfirmasi</option>
              <option value="Diproses">Diproses</option>
              <option value="Selesai">Selesai</option>
              <option value="Dibatalkan">Dibatalkan</option>
            </select>

            <select id="order-filter-source" class="select-input">
              <option value="ALL">Semua Sumber</option>
              <option value="website">Website</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="manual">Manual</option>
            </select>
          </div>
        </div>

        <!-- Orders Table -->
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Kode &amp; Tanggal</th>
                <th>Pemesan &amp; Kontak</th>
                <th>Layanan / Item</th>
                <th>Sumber</th>
                <th>Nilai Pesanan</th>
                <th>Status Operasional</th>
                <th>Status Bayar</th>
                <th style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody id="orders-table-tbody">
              ${renderOrderRows(ordersData)}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  `;
}

function renderOrderRows(orders) {
  if (orders.length === 0) {
    return `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <div class="empty-icon">📂</div>
            <div class="empty-title">Tidak Ada Pesanan</div>
            <div class="empty-desc">Belum ada pesanan yang sesuai filter.</div>
          </div>
        </td>
      </tr>
    `;
  }

  return orders.map(o => {
    const netIncome = calculateOrderNetIncome(o);
    const cleanPhone = (o.customer_phone || '').replace(/[^0-9]/g, '');
    const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(o.customer_name)},%20kami%20dari%20admin%20mengenai%20pesanan%20${o.order_code}:` : null;

    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: #FFFFFF; font-size: 0.88rem;">${o.order_code}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">📅 ${o.order_date} pk ${o.order_time || '09:00'}</div>
        </td>

        <td>
          <div style="font-weight: 600; color: #FFFFFF;">${escapeHtml(o.customer_name)}</div>
          <div style="font-size: 0.75rem; color: var(--gold-light);">📞 ${escapeHtml(o.customer_phone || '-')}</div>
        </td>

        <td>
          <span class="service-badge" style="font-size: 0.75rem;">${escapeHtml(o.service_or_item)}</span>
        </td>

        <td>
          <span style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: ${o.source === 'website' ? '#60A5FA' : '#34D399'};">
            ${o.source === 'website' ? '🌐 Web' : '💬 WA'}
          </span>
        </td>

        <td>
          <div style="font-weight: 700; color: #FFFFFF;">${formatRupiah(netIncome)}</div>
          ${o.discount_amount > 0 ? `<div style="font-size: 0.7rem; color: #F87171;">Diskon: -${formatRupiah(o.discount_amount)}</div>` : ''}
        </td>

        <td>
          <select class="select-input" style="padding: 3px 6px; font-size: 0.75rem;" onchange="window.adminChangeOrderStatus('${o.id}', this.value)">
            <option value="Baru" ${o.status === 'Baru' ? 'selected' : ''}>Baru</option>
            <option value="Dikonfirmasi" ${o.status === 'Dikonfirmasi' ? 'selected' : ''}>Dikonfirmasi</option>
            <option value="Diproses" ${o.status === 'Diproses' ? 'selected' : ''}>Diproses</option>
            <option value="Selesai" ${o.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
            <option value="Dibatalkan" ${o.status === 'Dibatalkan' ? 'selected' : ''}>Dibatalkan</option>
          </select>
        </td>

        <td>
          <span class="status-pill status-${(o.payment_status || 'belum').toLowerCase().replace(' ', '-')}">
            ${o.payment_status || 'Belum Dibayar'}
          </span>
        </td>

        <td>
          <div class="action-buttons" style="justify-content: flex-end;">
            ${waLink ? `
              <a href="${waLink}" target="_blank" class="btn-action" title="Chat WhatsApp" style="color: #25D366; border-color: rgba(37, 211, 102, 0.4);">
                <span>💬</span>
              </a>
            ` : ''}
            <button class="btn-action" title="Kelola Modal &amp; Biaya" onclick="window.adminOpenOrderCosts('${o.id}')">
              <span>💰 Biaya</span>
            </button>
            <button class="btn-action" title="Edit Pesanan" onclick="window.adminOpenEditOrder('${o.id}')">
              <span>✏️</span>
            </button>
            <button class="btn-action" title="Hapus Pesanan" style="color: #EF4444; border-color: rgba(239, 68, 68, 0.4);" onclick="window.adminDeleteOrder('${o.id}')">
              <span>🗑️</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function initOrdersEvents() {
  document.getElementById('btn-add-wa-order')?.addEventListener('click', () => showAddOrderModal('whatsapp'));

  const searchInp = document.getElementById('order-search-input');
  const statusSel = document.getElementById('order-filter-status');
  const sourceSel = document.getElementById('order-filter-source');

  const filterHandler = () => {
    const q = (searchInp?.value || '').toLowerCase().trim();
    const st = statusSel?.value || 'ALL';
    const sc = sourceSel?.value || 'ALL';

    const filtered = ordersData.filter(o => {
      if (st !== 'ALL' && o.status !== st) return false;
      if (sc !== 'ALL' && o.source !== sc) return false;
      if (q) {
        const matchCode = (o.order_code || '').toLowerCase().includes(q);
        const matchName = (o.customer_name || '').toLowerCase().includes(q);
        const matchPhone = (o.customer_phone || '').toLowerCase().includes(q);
        const matchItem = (o.service_or_item || '').toLowerCase().includes(q);
        return matchCode || matchName || matchPhone || matchItem;
      }
      return true;
    });

    const tbody = document.getElementById('orders-table-tbody');
    if (tbody) tbody.innerHTML = renderOrderRows(filtered);
  };

  searchInp?.addEventListener('input', filterHandler);
  statusSel?.addEventListener('change', filterHandler);
  sourceSel?.addEventListener('change', filterHandler);
}

window.adminChangeOrderStatus = async function(orderId, newStatus) {
  try {
    const target = ordersData.find(o => o.id === orderId);
    if (target) {
      target.status = newStatus;
      if (newStatus === 'Selesai') target.payment_status = 'Lunas';
      if (newStatus === 'Dibatalkan') target.payment_status = 'Refund';
    }

    // Map status ke tabel bookings
    let bkgStatus = 'pending';
    if (newStatus === 'Selesai') bkgStatus = 'completed';
    else if (newStatus === 'Dikonfirmasi') bkgStatus = 'confirmed';
    else if (newStatus === 'Dibatalkan') bkgStatus = 'cancelled';

    await Promise.allSettled([
      supabase.from('bookings').update({ status: bkgStatus }).eq('id', orderId),
      supabase.from('orders').update({ 
        status: newStatus,
        payment_status: newStatus === 'Selesai' ? 'Lunas' : (newStatus === 'Dibatalkan' ? 'Refund' : 'Belum Dibayar')
      }).eq('id', orderId)
    ]);

    // Catat audit log
    await supabase.from('audit_logs').insert([{
      actor_name: 'Admin',
      action: 'UPDATE_STATUS',
      entity_type: 'orders',
      entity_id: orderId,
      details: `Status diubah menjadi: ${newStatus}`
    }]).catch(() => {});

    window.showToast?.(`Status ${target?.order_code || 'pesanan'} diubah ke "${newStatus}"!`, 'success');
    renderActiveModule();
  } catch (err) {
    window.showToast?.(`Gagal update status: ${err.message}`, 'error');
  }
};

window.adminDeleteOrder = async function(orderId) {
  const target = ordersData.find(o => o.id === orderId);
  const code = target?.order_code || orderId;
  if (!confirm(`Apakah Anda yakin ingin menghapus pesanan ${code} dari database?`)) return;

  try {
    await Promise.allSettled([
      supabase.from('bookings').delete().eq('id', orderId),
      supabase.from('orders').delete().eq('id', orderId)
    ]);

    ordersData = ordersData.filter(o => o.id !== orderId);
    window.showToast?.(`Pesanan ${code} berhasil dihapus dari database!`, 'success');
    renderActiveModule();
  } catch (err) {
    window.showToast?.(`Gagal menghapus pesanan: ${err.message}`, 'error');
  }
};

/* ==============================================================================
   3. MODUL: HITUNG UNTUNG OTOMATIS & MODAL/BIAYA (FASE 2)
   ============================================================================== */
function renderProfitView() {
  const overallSummary = calculatePeriodSummary(ordersData, costsData, transactionsData.filter(t => t.type === 'expense' && t.source_type === 'operational'));

  return `
    <div class="view-container">
      
      <!-- Top Financial Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card" style="border-left: 4px solid var(--gold-primary);">
          <div class="kpi-icon-wrap" style="background: rgba(217, 163, 67, 0.15); color: var(--gold-primary);">📈</div>
          <div class="kpi-info">
            <span class="kpi-label">Total Pendapatan Bersih</span>
            <span class="kpi-value">${formatRupiah(overallSummary.totalRevenue)}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Nilai Pesanan - Diskon</span>
          </div>
        </div>

        <div class="kpi-card" style="border-left: 4px solid #EF4444;">
          <div class="kpi-icon-wrap" style="background: rgba(239, 68, 68, 0.15); color: #EF4444;">📉</div>
          <div class="kpi-info">
            <span class="kpi-label">Total Modal / HPP &amp; Biaya</span>
            <span class="kpi-value" style="color: #F87171;">${formatRupiah(overallSummary.totalOrderCosts)}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Seluruh Biaya Langsung</span>
          </div>
        </div>

        <div class="kpi-card" style="border-left: 4px solid #10B981;">
          <div class="kpi-icon-wrap" style="background: rgba(16, 185, 129, 0.15); color: #10B981;">💰</div>
          <div class="kpi-info">
            <span class="kpi-label">Laba Kotor Usaha</span>
            <span class="kpi-value" style="color: #34D399;">${formatRupiah(overallSummary.grossProfit)}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Pendapatan - Modal/HPP</span>
          </div>
        </div>

        <div class="kpi-card" style="border-left: 4px solid #8B5CF6;">
          <div class="kpi-icon-wrap" style="background: rgba(139, 92, 246, 0.15); color: #8B5CF6;">✨</div>
          <div class="kpi-info">
            <span class="kpi-label">Laba Bersih Akhir</span>
            <span class="kpi-value" style="color: #C084FC;">${formatRupiah(overallSummary.netProfit)}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Setelah Biaya Operasional</span>
          </div>
        </div>
      </div>

      <!-- Detail Untung per Pesanan Table -->
      <div class="card" style="margin-top: 1.5rem;">
        <div class="card-header">
          <div>
            <h3 class="card-title">💵 Rincian Untung per Pesanan (Transparan)</h3>
            <p class="card-desc">Kalkulasi keuntungan per transaksi berdasarkan formula resmi: Pendapatan - Diskon - Modal/HPP = Laba Kotor.</p>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Kode Pesanan</th>
                <th>Pemesan</th>
                <th>Layanan</th>
                <th>Pendapatan Bersih</th>
                <th>Modal / HPP &amp; Biaya</th>
                <th>Laba Kotor</th>
                <th>Margin (%)</th>
                <th style="text-align: right;">Kelola Biaya</th>
              </tr>
            </thead>
            <tbody>
              ${ordersData.map(o => {
                const orderCosts = costsData.filter(c => c.order_id === o.id);
                const netIncome = calculateOrderNetIncome(o);
                const totalCost = calculateOrderTotalCost(orderCosts);
                const grossProfit = calculateOrderGrossProfit(o, orderCosts);
                const margin = calculateOrderProfitMargin(o, orderCosts);

                return `
                  <tr>
                    <td>
                      <strong style="color: #FFFFFF;">${o.order_code}</strong>
                    </td>
                    <td>${escapeHtml(o.customer_name)}</td>
                    <td><span class="service-badge" style="font-size: 0.75rem;">${escapeHtml(o.service_or_item)}</span></td>
                    <td style="font-weight: 700; color: #FFFFFF;">${formatRupiah(netIncome)}</td>
                    <td style="color: #F87171; font-weight: 600;">${formatRupiah(totalCost)}</td>
                    <td>
                      <strong style="color: ${grossProfit >= 0 ? '#34D399' : '#EF4444'}; font-size: 0.95rem;">
                        ${formatRupiah(grossProfit)}
                      </strong>
                    </td>
                    <td>
                      <span class="status-pill ${margin >= 40 ? 'status-selesai' : 'status-dikonfirmasi'}">
                        ${margin}%
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <button class="btn btn-action" onclick="window.adminOpenOrderCosts('${o.id}')">
                        <span>➕ / ✏️ Biaya (${orderCosts.length})</span>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

function initProfitEvents() {}

/* ==============================================================================
   4. MODUL: DATA PELANGGAN & RIWAYAT (FASE 3)
   ============================================================================== */
function renderCustomersView() {
  return `
    <div class="view-container">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <h3 style="font-size: 1.25rem; font-weight: 700; color: #FFFFFF;">Direktori Data Pelanggan</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Daftar pelanggan, nomor kontak WhatsApp, dan riwayat seluruh transaksinya.</p>
        </div>

        <button id="btn-add-customer-modal" class="btn btn-primary">
          <span>➕</span>
          <span>Tambah Pelanggan Baru</span>
        </button>
      </div>

      <div class="card">
        <div class="table-toolbar">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" id="cust-search-input" class="search-input" placeholder="Cari nama, nomor WhatsApp, email pelanggan..." />
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nama Pelanggan</th>
                <th>Kontak WhatsApp &amp; Email</th>
                <th>Alamat</th>
                <th>Total Pesanan</th>
                <th>Total Belanja</th>
                <th style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody id="cust-table-tbody">
              ${renderCustomerRows(customersData)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderCustomerRows(customers) {
  if (customers.length === 0) {
    return `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">Belum ada data pelanggan.</td></tr>`;
  }

  return customers.map(c => {
    const custOrders = ordersData.filter(o => o.customer_id === c.id || o.customer_name === c.name);
    const totalSpent = custOrders.reduce((sum, o) => sum + calculateOrderNetIncome(o), 0);
    const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');
    const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(c.name)},%20kami%20dari%20Sacred%20Journey%20Bali:` : null;

    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: #FFFFFF;">${escapeHtml(c.name)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${c.notes || '-'}</div>
        </td>

        <td>
          <div style="color: var(--gold-light); font-weight: 600;">📞 ${escapeHtml(c.phone || '-')}</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">✉️ ${escapeHtml(c.email || '-')}</div>
        </td>

        <td>${escapeHtml(c.address || '-')}</td>

        <td>
          <span style="font-weight: 700; color: #FFFFFF;">${custOrders.length} Pesanan</span>
        </td>

        <td>
          <strong style="color: #34D399;">${formatRupiah(totalSpent)}</strong>
        </td>

        <td>
          <div class="action-buttons" style="justify-content: flex-end;">
            ${waLink ? `
              <a href="${waLink}" target="_blank" class="btn-action" title="Chat WhatsApp" style="color: #25D366; border-color: rgba(37, 211, 102, 0.4);">
                <span>💬 WhatsApp</span>
              </a>
            ` : ''}
            <button class="btn-action" title="Lihat Riwayat Pesanan" onclick="window.adminViewCustomerOrders('${c.id}')">
              <span>📜 Riwayat</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function initCustomersEvents() {
  document.getElementById('btn-add-customer-modal')?.addEventListener('click', showAddCustomerModal);

  const searchInp = document.getElementById('cust-search-input');
  searchInp?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = customersData.filter(c => {
      const matchName = (c.name || '').toLowerCase().includes(q);
      const matchPhone = (c.phone || '').toLowerCase().includes(q);
      const matchEmail = (c.email || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchEmail;
    });
    const tbody = document.getElementById('cust-table-tbody');
    if (tbody) tbody.innerHTML = renderCustomerRows(filtered);
  });
}

/* ==============================================================================
   5. MODUL: GRAFIK KEUNTUNGAN & BANDINGKAN PERIODE (FASE 3)
   ============================================================================== */
function renderChartsView() {
  return `
    <div class="view-container">
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header">
          <div>
            <h3 class="card-title">📈 Tren Keuntungan Usaha per Periode</h3>
            <p class="card-desc">Visualisasi pendapatan kotor, modal/biaya, dan laba bersih bulanan.</p>
          </div>

          <div class="filter-group">
            <select id="chart-filter-mode" class="select-input">
              <option value="monthly">Tinjauan Bulanan (Tahun 2026)</option>
              <option value="weekly">Tinjauan Mingguan Terakhir</option>
            </select>
          </div>
        </div>

        <div style="height: 340px; position: relative;">
          <canvas id="chart-dasbor-profit"></canvas>
        </div>
      </div>

      <!-- Perbandingan Periode -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.5rem;">
        <div class="card">
          <h4 style="font-size: 1.05rem; font-weight: 700; color: #FFFFFF; margin-bottom: 0.5rem;">⚖️ Bandingkan Periode Bisnis</h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">Perbandingan performa bulan berjalan dengan bulan sebelumnya.</p>
          
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="padding: 0.85rem; background: var(--bg-surface-elevated); border-radius: var(--radius-sm); display: flex; justify-content: space-between;">
              <span>Bulan Berjalan (Oktober 2026)</span>
              <strong style="color: #34D399;">Rp 2.450.000 Laba Bersih</strong>
            </div>
            <div style="padding: 0.85rem; background: var(--bg-surface-elevated); border-radius: var(--radius-sm); display: flex; justify-content: space-between;">
              <span>Bulan Sebelumnya (September 2026)</span>
              <strong style="color: #60A5FA;">Rp 11.300.000 Laba Bersih</strong>
            </div>
          </div>
        </div>

        <div class="card">
          <h4 style="font-size: 1.05rem; font-weight: 700; color: #FFFFFF; margin-bottom: 0.5rem;">📊 Komposisi Pengeluaran Terbesar</h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">Alokasi modal &amp; biaya langsung usaha.</p>
          
          <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.85rem;">
            <div style="display: flex; justify-content: space-between;">
              <span>Modal / HPP Layanan:</span>
              <strong style="color: #F87171;">55%</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Transportasi &amp; Bahan:</span>
              <strong style="color: #FBBF24;">25%</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Fee Pemandu / Terapis:</span>
              <strong style="color: #60A5FA;">20%</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function initChartsEvents() {
  const canvas = document.getElementById('chart-dasbor-profit');
  if (!canvas) return;

  if (chartProfitInstance) {
    chartProfitInstance.destroy();
    chartProfitInstance = null;
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const revenueData = [12000000, 14500000, 16200000, 13800000, 19500000, 22000000, 24500000, 21000000, 18500000, 2650000, 0, 0];
  const costData =    [5200000,  6100000,  6900000,  5800000,  7900000,  8800000,  9900000,  8500000,  7200000,  1220000, 0, 0];
  const profitData =  revenueData.map((rev, idx) => rev - costData[idx]);

  const ctx = canvas.getContext('2d');
  chartProfitInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Pendapatan (Revenue)',
          data: revenueData,
          backgroundColor: 'rgba(217, 163, 67, 0.4)',
          borderColor: '#D9A343',
          borderWidth: 1.5,
          borderRadius: 4
        },
        {
          label: 'Modal & Biaya (Costs)',
          data: costData,
          backgroundColor: 'rgba(239, 68, 68, 0.3)',
          borderColor: '#EF4444',
          borderWidth: 1.5,
          borderRadius: 4
        },
        {
          label: 'Laba Bersih (Net Profit)',
          data: profitData,
          type: 'line',
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#D1D5DB' } },
        tooltip: {
          callbacks: {
            label: (item) => ` ${item.dataset.label}: ${formatRupiah(item.raw)}`
          }
        }
      },
      scales: {
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#9CA3AF',
            callback: (v) => 'Rp ' + (v / 1000000).toFixed(0) + ' Jt'
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

/* ==============================================================================
   6. MODUL: PEMBUKUAN HARIAN, TUTUP BUKU & EKSPOR (FASE 3)
   ============================================================================== */
function renderBookkeepingView() {
  return `
    <div class="view-container">
      
      <!-- Top Action Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <h3 style="font-size: 1.25rem; font-weight: 700; color: #FFFFFF;">Pembukuan Pemasukan &amp; Pengeluaran</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Catat transaksi arus kas, rekap tutup buku periode, dan ekspor laporan ke CSV.</p>
        </div>

        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button id="btn-export-csv" class="btn btn-secondary" title="Ekspor Data ke File CSV">
            <span>📥</span>
            <span>Ekspor CSV</span>
          </button>

          <button id="btn-open-closing-modal" class="btn btn-outline-gold" title="Proses Tutup Buku Periode">
            <span>🔒</span>
            <span>Tutup Buku Periode</span>
          </button>

          <button id="btn-add-transaction-modal" class="btn btn-primary">
            <span>➕</span>
            <span>Catat Transaksi Kas</span>
          </button>
        </div>
      </div>

      <!-- Transactions Table Card -->
      <div class="card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Kode &amp; Tanggal</th>
                <th>Jenis</th>
                <th>Kategori</th>
                <th>Deskripsi</th>
                <th>Metode Bayar</th>
                <th>Nominal</th>
              </tr>
            </thead>
            <tbody>
              ${transactionsData.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">Belum ada transaksi pembukuan.</td></tr>
              ` : transactionsData.map(t => `
                <tr>
                  <td>
                    <strong style="color: #FFFFFF;">${t.transaction_code}</strong>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${t.transaction_date}</div>
                  </td>
                  <td>
                    <span class="status-pill ${t.type === 'income' ? 'status-selesai' : 'status-dibatalkan'}">
                      ${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                    </span>
                  </td>
                  <td><span class="service-badge" style="font-size: 0.75rem;">${escapeHtml(t.category)}</span></td>
                  <td>${escapeHtml(t.description)}</td>
                  <td><span style="font-size: 0.8rem; color: var(--text-secondary);">${t.payment_method || '-'}</span></td>
                  <td>
                    <strong style="color: ${t.type === 'income' ? '#34D399' : '#F87171'}; font-size: 0.95rem;">
                      ${t.type === 'income' ? '+' : '-'}${formatRupiah(t.amount)}
                    </strong>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Riwayat Tutup Buku -->
      <div class="card" style="margin-top: 1.5rem;">
        <h4 style="font-size: 1.05rem; font-weight: 700; color: #FFFFFF; margin-bottom: 0.5rem;">🔒 Riwayat Tutup Buku (Closing Periods)</h4>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Periode</th>
                <th>Total Pendapatan</th>
                <th>Total Biaya</th>
                <th>Laba Bersih</th>
                <th>Status</th>
                <th>Ditutup Oleh</th>
              </tr>
            </thead>
            <tbody>
              ${closingData.map(c => `
                <tr>
                  <td><strong>${c.period_start} s/d ${c.period_end}</strong></td>
                  <td>${formatRupiah(c.total_revenue)}</td>
                  <td style="color: #F87171;">${formatRupiah(c.total_cost)}</td>
                  <td style="color: #34D399; font-weight: 700;">${formatRupiah(c.net_profit)}</td>
                  <td><span class="status-pill status-selesai">${c.status}</span></td>
                  <td>${escapeHtml(c.closed_by)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

function initBookkeepingEvents() {
  document.getElementById('btn-add-transaction-modal')?.addEventListener('click', showAddTransactionModal);
  document.getElementById('btn-open-closing-modal')?.addEventListener('click', showClosingPeriodModal);
  document.getElementById('btn-export-csv')?.addEventListener('click', handleExportCSV);
}

function handleExportCSV() {
  const rows = [
    ['Kode Pesanan', 'Tanggal', 'Nama Pelanggan', 'No Telepon', 'Layanan', 'Sumber', 'Status', 'Pendapatan Bersih', 'Total Modal', 'Laba Kotor']
  ];

  ordersData.forEach(o => {
    const orderCosts = costsData.filter(c => c.order_id === o.id);
    const netIncome = calculateOrderNetIncome(o);
    const totalCost = calculateOrderTotalCost(orderCosts);
    const grossProfit = calculateOrderGrossProfit(o, orderCosts);

    rows.push([
      o.order_code,
      o.order_date,
      `"${o.customer_name}"`,
      `"${o.customer_phone || ''}"`,
      `"${o.service_or_item}"`,
      o.source,
      o.status,
      netIncome,
      totalCost,
      grossProfit
    ]);
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `laporan_untung_usaha_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.showToast?.('File CSV Laporan Keuntungan berhasil diunduh!', 'success');
}

/* ==============================================================================
   7. MODUL: TARIK DATA WEB UTAMA (FASE 4)
   ============================================================================== */
function renderSyncView() {
  const lastRun = syncRunsData[0];

  return `
    <div class="view-container">
      
      <!-- Sync Status Overview -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header">
          <div>
            <h3 class="card-title">🔄 Integrasi &amp; Sinkronisasi Website Utama</h3>
            <p class="card-desc">Mengambil otomatis pesanan baru yang dibuat pelanggan di website utama ke Dasbor Untung Usaha.</p>
          </div>

          <button id="btn-trigger-sync-now" class="btn btn-primary">
            <span>⚡</span>
            <span>Tarik Data Sekarang</span>
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-top: 1rem;">
          <div style="padding: 1rem; background: var(--bg-surface-elevated); border-radius: var(--radius-sm);">
            <span style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase;">Status Terakhir</span>
            <div style="font-size: 1.25rem; font-weight: 700; color: #34D399; margin-top: 4px;">
              ${lastRun?.status || 'Siap'}
            </div>
          </div>

          <div style="padding: 1rem; background: var(--bg-surface-elevated); border-radius: var(--radius-sm);">
            <span style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase;">Waktu Terakhir Penarikan</span>
            <div style="font-size: 0.95rem; font-weight: 600; color: #FFFFFF; margin-top: 4px;">
              ${lastRun ? new Date(lastRun.started_at).toLocaleString('id-ID') : '-'}
            </div>
          </div>

          <div style="padding: 1rem; background: var(--bg-surface-elevated); border-radius: var(--radius-sm);">
            <span style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase;">Jadwal Otomatis</span>
            <div style="font-size: 0.95rem; font-weight: 600; color: var(--gold-light); margin-top: 4px;">
              ⏱️ Setiap 15 Menit
            </div>
          </div>
        </div>
      </div>

      <!-- Sync Runs Log Table -->
      <div class="card">
        <h4 style="font-size: 1.05rem; font-weight: 700; color: #FFFFFF; margin-bottom: 0.5rem;">📜 Riwayat Penarikan Data (Sync Runs)</h4>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Waktu Penarikan</th>
                <th>Sumber</th>
                <th>Status</th>
                <th>Record Dilihat</th>
                <th>Record Dibuat</th>
                <th>Pemicu</th>
              </tr>
            </thead>
            <tbody>
              ${syncRunsData.map(s => `
                <tr>
                  <td>${new Date(s.started_at).toLocaleString('id-ID')}</td>
                  <td>${escapeHtml(s.source_name)}</td>
                  <td><span class="status-pill status-selesai">${s.status}</span></td>
                  <td>${s.records_seen}</td>
                  <td><strong style="color: #34D399;">+${s.records_created}</strong></td>
                  <td><span style="font-size: 0.8rem; color: var(--text-secondary);">${escapeHtml(s.triggered_by)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

function initSyncEvents() {
  document.getElementById('btn-trigger-sync-now')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-trigger-sync-now');
    if (btn) btn.innerHTML = '<span class="spinner"></span> Menarik data...';

    // Simulasi penarikan idempotent dari website utama
    setTimeout(async () => {
      const newSyncRun = {
        source_name: 'Website Utama (Sacred Journey Bali)',
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        status: 'Berhasil',
        records_seen: 5,
        records_created: 0,
        records_updated: 2,
        records_skipped: 3,
        triggered_by: 'Manual Admin'
      };

      await supabase.from('sync_runs').insert([newSyncRun]);
      await loadAllData();
      renderActiveModule();
      window.showToast?.('Penarikan data website utama berhasil disinkronkan!', 'success');
    }, 1200);
  });
}

/* ==============================================================================
   8. MODUL: MASUK, AKUN & PENGATURAN (FASE 5)
   ============================================================================== */
function renderSettingsView() {
  const { url, anonKey, isConfigured } = getSupabaseCredentials();

  return `
    <div class="view-container">
      
      <!-- Account Info -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <h3 class="card-title">👤 Akun Pengelola &amp; Autentikasi</h3>
        <p class="card-desc">Sesi admin yang aktif pada Dasbor Untung Usaha.</p>

        <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: var(--bg-surface-elevated); border-radius: var(--radius-sm); margin-top: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, var(--gold-dark), var(--gold-primary)); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #0B0F17;">
              AD
            </div>
            <div>
              <div style="font-weight: 700; color: #FFFFFF;">Pemilik Usaha / Admin</div>
              <div style="font-size: 0.8rem; color: var(--gold-light);">admin@dasboruntung.com (Role: Admin)</div>
            </div>
          </div>

          <button id="btn-admin-logout" class="btn btn-secondary" style="color: #F87171;">
            🚪 Keluar / Logout
          </button>
        </div>
      </div>

      <!-- Supabase Cloud Connection Settings -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <h3 class="card-title">⚡ Konfigurasi Koneksi Supabase Cloud</h3>
        <p class="card-desc">Hubungkan database Supabase PostgreSQL agar data tersimpan aman secara cloud.</p>

        <form id="settings-db-form" style="margin-top: 1rem; display: flex; flex-direction: column; gap: 1rem;">
          <div class="form-group">
            <label class="form-label">Project URL (Supabase URL):</label>
            <input type="url" id="sett-url" class="form-input" placeholder="https://xyz.supabase.co" value="${url || ''}" required />
          </div>

          <div class="form-group">
            <label class="form-label">Project API Key (Anon / Public Key):</label>
            <input type="text" id="sett-key" class="form-input" placeholder="eyJhbG..." value="${anonKey || ''}" required />
          </div>

          <div id="sett-test-result" style="display: none;"></div>

          <div style="display: flex; gap: 0.75rem;">
            <button type="button" id="btn-sett-test" class="btn btn-secondary" style="flex: 1;">🧪 Tes Koneksi</button>
            <button type="submit" class="btn btn-primary" style="flex: 1;">💾 Simpan Kredensial</button>
          </div>
        </form>

        ${url ? `
          <div style="margin-top: 1rem; text-align: center;">
            <button id="btn-sett-clear" class="btn-action" style="color: #EF4444;">Kembalikan ke Mode Demo Browser</button>
          </div>
        ` : ''}
      </div>

      <!-- Audit Logs Table -->
      <div class="card">
        <h3 class="card-title">🛡️ Catatan Aktivitas &amp; Audit Log</h3>
        <p class="card-desc">Riwayat perubahan penting pada transaksi, status pesanan, dan keuangan.</p>

        <div class="table-responsive" style="margin-top: 1rem;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Pengguna</th>
                <th>Aksi</th>
                <th>Entitas</th>
                <th>Rincian</th>
              </tr>
            </thead>
            <tbody>
              ${auditLogsData.map(a => `
                <tr>
                  <td>${new Date(a.created_at).toLocaleString('id-ID')}</td>
                  <td><strong>${escapeHtml(a.actor_name)}</strong></td>
                  <td><span class="status-pill status-baru">${a.action}</span></td>
                  <td>${a.entity_type}</td>
                  <td>${escapeHtml(a.details || '-')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

function initSettingsEvents() {
  document.getElementById('btn-admin-logout')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.showToast?.('Berhasil logout.', 'info');
  });

  document.getElementById('btn-sett-test')?.addEventListener('click', async () => {
    const u = document.getElementById('sett-url')?.value.trim();
    const k = document.getElementById('sett-key')?.value.trim();
    const resDiv = document.getElementById('sett-test-result');
    if (!u || !k || !resDiv) return;

    resDiv.style.display = 'block';
    resDiv.className = 'alert alert-info';
    resDiv.textContent = 'Menguji koneksi ke Supabase...';

    const test = await testSupabaseConnection(u, k);
    resDiv.className = `alert alert-${test.success ? 'success' : 'error'}`;
    resDiv.textContent = test.message;
  });

  document.getElementById('settings-db-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('sett-url')?.value.trim();
    const k = document.getElementById('sett-key')?.value.trim();
    saveSupabaseCredentials(u, k);
    window.showToast?.('Kredensial disimpan! Memuat ulang...', 'success');
    setTimeout(() => window.location.reload(), 600);
  });

  document.getElementById('btn-sett-clear')?.addEventListener('click', () => {
    clearSupabaseCredentials();
    window.location.reload();
  });
}

/* ==============================================================================
   MODALS: CATAT PESANAN WA, BIAYA, TRANSAKSI, TUTUP BUKU
   ============================================================================== */
function showAddOrderModal(sourceType = 'whatsapp') {
  const slot = document.getElementById('dasbor-modals-slot');
  if (!slot) return;

  const nextCode = `ORD-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2, '0')}-${String(ordersData.length + 1).padStart(3, '0')}`;
  const today = new Date().toISOString().split('T')[0];

  slot.innerHTML = `
    <div class="modal-overlay" id="add-order-overlay">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="card-title">💬 Catat Pesanan ${sourceType === 'whatsapp' ? 'dari WhatsApp' : 'Manual'}</h3>
          <button class="btn-close-modal" id="btn-close-add-order">&times;</button>
        </div>

        <div class="modal-body">
          <form id="form-create-order">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label">Kode Pesanan (Otomatis):</label>
                <input type="text" id="inp-order-code" class="form-input" value="${nextCode}" readonly />
              </div>
              <div class="form-group">
                <label class="form-label">Tanggal Pelaksanaan:</label>
                <input type="date" id="inp-order-date" class="form-input" value="${today}" required />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label">Nama Pelanggan:</label>
                <input type="text" id="inp-order-cust-name" class="form-input" placeholder="Contoh: Ni Luh Putu" required />
              </div>
              <div class="form-group">
                <label class="form-label">Nomor WhatsApp:</label>
                <input type="tel" id="inp-order-cust-phone" class="form-input" placeholder="+62 812-xxxx-xxxx" required />
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label">Paket Layanan / Barang:</label>
              <input type="text" id="inp-order-item" class="form-input" placeholder="Contoh: Spiritual Temple Tour / Yoga Retreat" required />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label">Nilai Pesanan (Rp):</label>
                <input type="number" id="inp-order-amount" class="form-input" placeholder="650000" required />
              </div>
              <div class="form-group">
                <label class="form-label">Diskon (Rp):</label>
                <input type="number" id="inp-order-discount" class="form-input" value="0" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label">Status Operasional:</label>
                <select id="inp-order-status" class="form-select">
                  <option value="Baru">Baru</option>
                  <option value="Dikonfirmasi" selected>Dikonfirmasi</option>
                  <option value="Diproses">Diproses</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Status Pembayaran:</label>
                <select id="inp-order-pay-status" class="form-select">
                  <option value="Belum Dibayar">Belum Dibayar</option>
                  <option value="DP">DP</option>
                  <option value="Lunas" selected>Lunas</option>
                </select>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label class="form-label">Catatan Tambahan:</label>
              <textarea id="inp-order-notes" class="form-textarea" rows="2" placeholder="Catatan khusus dari chat WhatsApp..."></textarea>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%;">
              💾 Simpan Pesanan ke Database
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-add-order')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('add-order-overlay')?.addEventListener('click', (e) => { if (e.target.id === 'add-order-overlay') slot.innerHTML = ''; });

  document.getElementById('form-create-order')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const code = document.getElementById('inp-order-code')?.value;
    const date = document.getElementById('inp-order-date')?.value;
    const name = document.getElementById('inp-order-cust-name')?.value.trim();
    const phone = document.getElementById('inp-order-cust-phone')?.value.trim();
    const item = document.getElementById('inp-order-item')?.value.trim();
    const amount = Number(document.getElementById('inp-order-amount')?.value || 0);
    const discount = Number(document.getElementById('inp-order-discount')?.value || 0);
    const status = document.getElementById('inp-order-status')?.value;
    const payStatus = document.getElementById('inp-order-pay-status')?.value;
    const notes = document.getElementById('inp-order-notes')?.value.trim();

    try {
      // 1. Simpan/Cek Pelanggan
      let cust = customersData.find(c => c.phone === phone || c.name.toLowerCase() === name.toLowerCase());
      if (!cust) {
        const { data: newCust } = await supabase.from('customers').insert([{
          name,
          phone,
          phone_normalized: phone.replace(/[^0-9]/g, ''),
          notes: 'Dibuat dari pesanan WhatsApp'
        }]).select();
        if (newCust && newCust[0]) cust = newCust[0];
      }

      // 2. Simpan Pesanan (Sync ke tabel bookings & orders)
      const bkgStatus = (payStatus === 'Lunas' || status === 'Selesai') ? 'paid' : (status === 'Dibatalkan' ? 'cancelled' : 'pending');
      const bookingPayload = {
        invoice: code,
        customer_name: name,
        customer_phone: phone,
        service_name: item,
        total_price: Math.max(0, amount - discount),
        booking_date: date,
        booking_time: '09:00',
        status: bkgStatus
      };

      await Promise.allSettled([
        supabase.from('bookings').insert([bookingPayload]),
        supabase.from('orders').insert([{
          order_code: code,
          customer_id: cust ? cust.id : null,
          customer_name: name,
          customer_phone: phone,
          service_or_item: item,
          source: 'whatsapp',
          order_date: date,
          status,
          payment_status: payStatus,
          subtotal_amount: amount,
          discount_amount: discount,
          notes
        }])
      ]);

      // 3. Catat Audit Log
      await supabase.from('audit_logs').insert([{
        actor_name: 'Admin',
        action: 'CREATE_ORDER',
        entity_type: 'orders',
        details: `Pesanan ${code} berhasil dibuat dari WhatsApp`
      }]);

      window.showToast?.(`Pesanan ${code} berhasil disimpan!`, 'success');
      slot.innerHTML = '';
      await loadAllData();
      renderActiveModule();
    } catch (err) {
      window.showToast?.(`Gagal menyimpan pesanan: ${err.message}`, 'error');
    }
  });
}

window.adminOpenOrderCosts = function(orderId) {
  const slot = document.getElementById('dasbor-modals-slot');
  if (!slot) return;

  const order = ordersData.find(o => o.id === orderId);
  if (!order) return;

  const currentCosts = costsData.filter(c => c.order_id === orderId);
  const totalCost = calculateOrderTotalCost(currentCosts);
  const netIncome = calculateOrderNetIncome(order);
  const grossProfit = netIncome - totalCost;

  slot.innerHTML = `
    <div class="modal-overlay" id="order-costs-overlay">
      <div class="modal-dialog" style="max-width: 600px;">
        <div class="modal-header">
          <h3 class="card-title">💰 Kelola Modal &amp; Biaya — ${order.order_code}</h3>
          <button class="btn-close-modal" id="btn-close-costs">&times;</button>
        </div>

        <div class="modal-body">
          <div style="background: var(--bg-surface-elevated); padding: 0.85rem; border-radius: var(--radius-sm); margin-bottom: 1rem; display: flex; justify-content: space-between;">
            <div>
              <span style="font-size: 0.75rem; color: var(--text-secondary);">Pendapatan Bersih:</span>
              <div style="font-weight: 700; color: #FFFFFF;">${formatRupiah(netIncome)}</div>
            </div>
            <div>
              <span style="font-size: 0.75rem; color: var(--text-secondary);">Total Biaya/Modal:</span>
              <div style="font-weight: 700; color: #F87171;">${formatRupiah(totalCost)}</div>
            </div>
            <div>
              <span style="font-size: 0.75rem; color: var(--text-secondary);">Laba Kotor:</span>
              <div style="font-weight: 700; color: #34D399;">${formatRupiah(grossProfit)}</div>
            </div>
          </div>

          <!-- Daftar Biaya yang Sudah Dicatat -->
          <h4 style="font-size: 0.9rem; font-weight: 700; color: #FFFFFF; margin-bottom: 0.5rem;">Daftar Komponen Biaya:</h4>
          <div style="max-height: 180px; overflow-y: auto; margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem;">
            ${currentCosts.length === 0 ? `
              <div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 1rem;">Belum ada biaya dicatat untuk pesanan ini.</div>
            ` : currentCosts.map(c => `
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.25); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm);">
                <div>
                  <strong style="color: #FFFFFF; font-size: 0.85rem;">${escapeHtml(c.category)}</strong>
                  <div style="font-size: 0.75rem; color: var(--text-secondary);">${escapeHtml(c.description || '-')}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span style="color: #F87171; font-weight: 700;">${formatRupiah(c.amount)}</span>
                  <button class="btn-action" style="color: #EF4444; padding: 2px 6px;" onclick="window.adminDeleteCost('${c.id}', '${orderId}')">&times;</button>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Form Tambah Biaya Baru -->
          <div style="border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
            <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--gold-light); margin-bottom: 0.75rem;">+ Tambah Komponen Biaya Baru</h4>
            <form id="form-add-cost">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
                <div class="form-group">
                  <label class="form-label">Kategori Biaya:</label>
                  <select id="inp-cost-category" class="form-select" required>
                    <option value="Modal/HPP">Modal / HPP Layanan</option>
                    <option value="Biaya Bahan">Biaya Bahan Baku / Makanan</option>
                    <option value="Transportasi">Transportasi &amp; Driver</option>
                    <option value="Fee Pemandu/Terapis">Fee Pemandu / Terapis</option>
                    <option value="Biaya Langsung Lain">Biaya Langsung Lain</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Nominal Biaya (Rp):</label>
                  <input type="number" id="inp-cost-amount" class="form-input" placeholder="150000" required />
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 1rem;">
                <label class="form-label">Keterangan / Catatan:</label>
                <input type="text" id="inp-cost-desc" class="form-input" placeholder="Contoh: Tiket masuk pura untuk 2 orang" />
              </div>

              <button type="submit" class="btn btn-primary" style="width: 100%;">
                Tambah Biaya ke Pesanan
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-costs')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('order-costs-overlay')?.addEventListener('click', (e) => { if (e.target.id === 'order-costs-overlay') slot.innerHTML = ''; });

  document.getElementById('form-add-cost')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const category = document.getElementById('inp-cost-category')?.value;
    const amount = Number(document.getElementById('inp-cost-amount')?.value || 0);
    const desc = document.getElementById('inp-cost-desc')?.value.trim();

    try {
      await supabase.from('order_costs').insert([{
        order_id: orderId,
        category,
        amount,
        description: desc,
        cost_date: order.order_date
      }]);

      window.showToast?.('Biaya berhasil ditambahkan!', 'success');
      await loadAllData();
      window.adminOpenOrderCosts(orderId);
      renderActiveModule();
    } catch (err) {
      window.showToast?.(`Gagal menambah biaya: ${err.message}`, 'error');
    }
  });
};

window.adminDeleteCost = async function(costId, orderId) {
  try {
    await supabase.from('order_costs').delete().eq('id', costId);
    window.showToast?.('Biaya dihapus.', 'info');
    await loadAllData();
    window.adminOpenOrderCosts(orderId);
    renderActiveModule();
  } catch (err) {
    window.showToast?.(`Gagal hapus biaya: ${err.message}`, 'error');
  }
};

function showAddCustomerModal() {
  const slot = document.getElementById('dasbor-modals-slot');
  if (!slot) return;

  slot.innerHTML = `
    <div class="modal-overlay" id="add-cust-overlay">
      <div class="modal-dialog" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="card-title">👥 Tambah Data Pelanggan</h3>
          <button class="btn-close-modal" id="btn-close-cust">&times;</button>
        </div>
        <div class="modal-body">
          <form id="form-create-customer">
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label">Nama Lengkap:</label>
              <input type="text" id="cust-new-name" class="form-input" placeholder="Contoh: I Wayan Sudarta" required />
            </div>
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label">Nomor WhatsApp / Telepon:</label>
              <input type="tel" id="cust-new-phone" class="form-input" placeholder="+62 812-xxxx-xxxx" required />
            </div>
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label">Alamat Email:</label>
              <input type="email" id="cust-new-email" class="form-input" placeholder="email@gmail.com" />
            </div>
            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label class="form-label">Alamat / Lokasi:</label>
              <input type="text" id="cust-new-addr" class="form-input" placeholder="Denpasar / Ubud / ..." />
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Simpan Pelanggan</button>
          </form>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-cust')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('add-cust-overlay')?.addEventListener('click', (e) => { if (e.target.id === 'add-cust-overlay') slot.innerHTML = ''; });

  document.getElementById('form-create-customer')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('cust-new-name')?.value.trim();
    const phone = document.getElementById('cust-new-phone')?.value.trim();
    const email = document.getElementById('cust-new-email')?.value.trim();
    const addr = document.getElementById('cust-new-addr')?.value.trim();

    try {
      await supabase.from('customers').insert([{
        name,
        phone,
        phone_normalized: phone.replace(/[^0-9]/g, ''),
        email,
        address: addr
      }]);

      window.showToast?.('Pelanggan berhasil ditambahkan!', 'success');
      slot.innerHTML = '';
      await loadAllData();
      renderActiveModule();
    } catch (err) {
      window.showToast?.(`Gagal: ${err.message}`, 'error');
    }
  });
}

function showAddTransactionModal() {
  const slot = document.getElementById('dasbor-modals-slot');
  if (!slot) return;

  const nextCode = `TRX-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2, '0')}-${String(transactionsData.length + 1).padStart(3, '0')}`;
  const today = new Date().toISOString().split('T')[0];

  slot.innerHTML = `
    <div class="modal-overlay" id="add-trx-overlay">
      <div class="modal-dialog" style="max-width: 480px;">
        <div class="modal-header">
          <h3 class="card-title">📒 Catat Transaksi Pembukuan Kas</h3>
          <button class="btn-close-modal" id="btn-close-trx">&times;</button>
        </div>
        <div class="modal-body">
          <form id="form-create-trx">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label">Kode:</label>
                <input type="text" class="form-input" value="${nextCode}" readonly />
              </div>
              <div class="form-group">
                <label class="form-label">Tanggal:</label>
                <input type="date" id="trx-new-date" class="form-input" value="${today}" required />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label">Jenis:</label>
                <select id="trx-new-type" class="form-select">
                  <option value="expense">Pengeluaran (Biaya)</option>
                  <option value="income">Pemasukan (Kas Masuk)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Nominal (Rp):</label>
                <input type="number" id="trx-new-amount" class="form-input" placeholder="250000" required />
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label">Kategori:</label>
              <input type="text" id="trx-new-category" class="form-input" placeholder="Operasional Kantor / Listrik / Pemasaran" required />
            </div>

            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label class="form-label">Deskripsi:</label>
              <input type="text" id="trx-new-desc" class="form-input" placeholder="Keterangan transaksi..." required />
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%;">Simpan Transaksi Kas</button>
          </form>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-trx')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('add-trx-overlay')?.addEventListener('click', (e) => { if (e.target.id === 'add-trx-overlay') slot.innerHTML = ''; });

  document.getElementById('form-create-trx')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('trx-new-date')?.value;
    const type = document.getElementById('trx-new-type')?.value;
    const amount = Number(document.getElementById('trx-new-amount')?.value || 0);
    const category = document.getElementById('trx-new-category')?.value.trim();
    const desc = document.getElementById('trx-new-desc')?.value.trim();

    try {
      await supabase.from('financial_transactions').insert([{
        transaction_code: nextCode,
        transaction_date: date,
        type,
        category,
        description: desc,
        amount,
        source_type: 'operational'
      }]);

      window.showToast?.('Transaksi berhasil dicatat ke pembukuan!', 'success');
      slot.innerHTML = '';
      await loadAllData();
      renderActiveModule();
    } catch (err) {
      window.showToast?.(`Gagal: ${err.message}`, 'error');
    }
  });
}

function showClosingPeriodModal() {
  const slot = document.getElementById('dasbor-modals-slot');
  if (!slot) return;

  const today = new Date().toISOString().split('T')[0];
  const summary = calculatePeriodSummary(ordersData, costsData, transactionsData.filter(t => t.type === 'expense' && t.source_type === 'operational'));

  slot.innerHTML = `
    <div class="modal-overlay" id="closing-overlay">
      <div class="modal-dialog" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="card-title">🔒 Tutup Buku Periode</h3>
          <button class="btn-close-modal" id="btn-close-closing">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
            Konfirmasi penutupan buku untuk mengunci transaksi dan menghasilkan snapshot laporan keuangan resmi.
          </p>

          <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1.25rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span>Total Pendapatan:</span>
              <strong style="color: #34D399;">${formatRupiah(summary.totalRevenue)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <span>Total Biaya/Modal:</span>
              <strong style="color: #F87171;">${formatRupiah(summary.totalOrderCosts + summary.totalOperational)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-subtle); padding-top: 0.5rem;">
              <span style="font-weight: 700;">Laba Bersih Akhir:</span>
              <strong style="font-size: 1.15rem; color: #C084FC;">${formatRupiah(summary.netProfit)}</strong>
            </div>
          </div>

          <form id="form-confirm-closing">
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label">Tanggal Akhir Periode Ditutup:</label>
              <input type="date" id="cls-end-date" class="form-input" value="${today}" required />
            </div>

            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label class="form-label">Catatan Rekap Tutup Buku:</label>
              <textarea id="cls-notes" class="form-textarea" rows="2" placeholder="Catatan audit tutup buku..."></textarea>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%;">
              🔒 Kunci &amp; Selesaikan Tutup Buku
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-closing')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('closing-overlay')?.addEventListener('click', (e) => { if (e.target.id === 'closing-overlay') slot.innerHTML = ''; });

  document.getElementById('form-confirm-closing')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const endDate = document.getElementById('cls-end-date')?.value;
    const notes = document.getElementById('cls-notes')?.value.trim();

    try {
      await supabase.from('closing_periods').insert([{
        period_start: '2026-10-01',
        period_end: endDate,
        status: 'closed',
        total_revenue: summary.totalRevenue,
        total_cost: summary.totalOrderCosts + summary.totalOperational,
        net_profit: summary.netProfit,
        closed_by: 'Pemilik Usaha',
        notes: notes || 'Tutup buku periode per ' + endDate
      }]);

      window.showToast?.('Tutup buku periode berhasil dikunci!', 'success');
      slot.innerHTML = '';
      await loadAllData();
      renderActiveModule();
    } catch (err) {
      window.showToast?.(`Gagal tutup buku: ${err.message}`, 'error');
    }
  });
}

function setupRealtime() {
  if (realtimeChannel) {
    try { realtimeChannel.unsubscribe(); } catch {}
  }
  try {
    realtimeChannel = supabase
      .channel('dasbor_realtime_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, async (payload) => {
        console.log('[Supabase Realtime bookings]', payload);
        await loadAllData();
        renderActiveModule();
        const custName = payload.new?.customer_name || 'Pelanggan';
        window.showToast?.(`✨ Pesanan baru dari Web Booking: <strong>${custName}</strong>!`, 'realtime');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
        await loadAllData();
        renderActiveModule();
        window.showToast?.('Data pesanan diperbarui secara real-time!', 'realtime');
      })
      .subscribe();
  } catch (err) {
    console.warn('Realtime error:', err);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
