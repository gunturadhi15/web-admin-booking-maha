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
import {
  getCurrentUser,
  isAdmin,
  isStaff,
  canDeleteBooking,
  canManageUsers,
  canManageSettings,
  logout,
  getAllUsers,
  saveUser,
  deleteUser,
  getAuditLogs,
  changePassword,
  logAuditEvent,
  evaluatePasswordStrength
} from '../services/auth.js';
import {
  formatTanggal,
  formatJam,
  StatusBadge,
  KpiCard,
  ControlBar,
  MassActionBar,
  TableSkeletonRows,
  EmptyFilterState,
  InitialEmptyState
} from '../components/ui.js';
import { icon } from '../components/icons.js';

// Application State
let activeModule = 'dashboard'; // 'dashboard' | 'orders' | 'profit' | 'customers' | 'charts' | 'bookkeeping' | 'sync' | 'settings' | 'users' | 'audit'

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
  const user = getCurrentUser();
  const userIsAdmin = isAdmin();

  return `
    <div class="dasbor-layout">
      
      <!-- Backdrop for Mobile Sidebar Drawer -->
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>

      <!-- Sidebar Navigation (Drawer on Mobile, w-60) -->
      <aside class="dasbor-sidebar" id="dasbor-sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <div class="brand-badge-icon">
              ${icon('profit', { size: 18, strokeWidth: 2.2 })}
            </div>
            <div class="brand-text-wrap">
              <h2 class="logo-title">Untung Usaha</h2>
              <span class="logo-subtitle">Sistem Admin &amp; Bisnis</span>
            </div>
          </div>
          <button class="btn-close-sidebar" id="btn-close-sidebar" aria-label="Tutup Menu">${icon('close', { size: 18 })}</button>
        </div>

        <nav class="sidebar-menu">
          <div class="menu-group-label">OPERASIONAL</div>
          <button class="sidebar-link active" data-mod="dashboard">
            <span class="link-icon">${icon('dashboard', { size: 16 })}</span>
            <span>Dashboard Ringkas</span>
          </button>
          <button class="sidebar-link" data-mod="orders">
            <span class="link-icon">${icon('orders', { size: 16 })}</span>
            <span>Kelola Pesanan</span>
            <span id="badge-order-count" class="badge-count">0</span>
          </button>
          <button class="sidebar-link" data-mod="profit">
            <span class="link-icon">${icon('profit', { size: 16 })}</span>
            <span>Hitung Untung</span>
          </button>

          <div class="menu-group-label">JADWAL</div>
          <button class="sidebar-link" data-mod="orders" data-sub="calendar">
            <span class="link-icon">${icon('calendar', { size: 16 })}</span>
            <span>Jadwal Booking</span>
          </button>
          <button class="sidebar-link" data-mod="bookkeeping">
            <span class="link-icon">${icon('bookkeeping', { size: 16 })}</span>
            <span>Pembukuan Harian</span>
          </button>

          <div class="menu-group-label">PELANGGAN</div>
          <button class="sidebar-link" data-mod="customers">
            <span class="link-icon">${icon('customers', { size: 16 })}</span>
            <span>Data Pelanggan</span>
          </button>
          <button class="sidebar-link" data-mod="charts">
            <span class="link-icon">${icon('charts', { size: 16 })}</span>
            <span>Grafik Keuntungan</span>
          </button>

          <div class="menu-group-label">PENGATURAN</div>
          <button class="sidebar-link" data-mod="settings">
            <span class="link-icon">${icon('settings', { size: 16 })}</span>
            <span>Pengaturan Akun</span>
          </button>
          ${userIsAdmin ? `
            <button class="sidebar-link" data-mod="users" title="Hanya Admin">
              <span class="link-icon">${icon('users', { size: 16 })}</span>
              <span>Pengguna</span>
            </button>
            <button class="sidebar-link" data-mod="audit" title="Hanya Admin">
              <span class="link-icon">${icon('audit', { size: 16 })}</span>
              <span>Log Aktivitas</span>
            </button>
          ` : ''}
        </nav>

        <div class="sidebar-footer">
          <div class="conn-pill ${isConfigured ? 'live' : 'demo'}" id="sidebar-db-status" title="Status Sinkronisasi Basis Data">
            <span class="status-dot ${isConfigured ? 'live' : 'demo'}"></span>
            <span>${isConfigured ? 'Supabase Live' : 'Demo Browser'}</span>
          </div>
        </div>
      </aside>

      <!-- Main App Viewport -->
      <div class="dasbor-main">
        
        <!-- Mobile Top App Bar (Visible on mobile screens) -->
        <header class="mobile-top-bar">
          <div class="mobile-brand">
            <button id="btn-toggle-sidebar" class="mobile-menu-btn" aria-label="Buka Menu" title="Menu Navigasi">
              ${icon('menu', { size: 18, strokeWidth: 2 })}
            </button>
            <div class="brand-badge-icon brand-badge-sm">
              ${icon('profit', { size: 15, strokeWidth: 2.2 })}
            </div>
            <div class="mobile-logo-text">
              <span class="logo-title-sm">Untung Usaha</span>
              <span class="logo-subtitle-sm">Admin Bisnis</span>
            </div>
          </div>

          <div class="mobile-top-actions">
            <div class="conn-pill ${isConfigured ? 'live' : 'demo'}" id="mobile-db-status" title="Status Database">
              <span class="status-dot ${isConfigured ? 'live' : 'demo'}"></span>
              <span>${isConfigured ? 'Live' : 'Demo'}</span>
            </div>
            <button id="btn-mobile-quick-wa" class="btn btn-primary btn-icon-only" title="Catat Pesanan WhatsApp" aria-label="Catat WhatsApp">
              ${icon('whatsapp', { size: 16 })}
            </button>
            <button id="btn-mobile-refresh" class="btn btn-secondary btn-icon-only" title="Muat Ulang Data" aria-label="Segarkan">
              ${icon('refresh', { size: 16 })}
            </button>
            <!-- Avatar Profil Pengguna di Header Mobile (Section 10.G) -->
            <button type="button" class="user-avatar-circle" id="mobile-user-avatar-btn" style="width: 32px; height: 32px; font-size: 0.75rem; cursor: pointer; border: 1px solid var(--border-subtle);" title="Menu Pengguna">
              ${user?.avatar || 'GA'}
            </button>
          </div>
        </header>

        <!-- Mobile Horizontal Quick Navigation Tabs (Pill Bar) -->
        <nav class="mobile-nav-tabs" id="mobile-nav-tabs" aria-label="Navigasi Modul">
          <button class="mobile-tab-btn active" data-mod="dashboard">
            ${icon('dashboard', { size: 14 })} <span>Ringkasan</span>
          </button>
          <button class="mobile-tab-btn" data-mod="orders">
            ${icon('orders', { size: 14 })} <span>Pesanan</span>
            <span class="mobile-tab-badge" id="mobile-badge-order-count">0</span>
          </button>
          <button class="mobile-tab-btn" data-mod="profit">
            ${icon('profit', { size: 14 })} <span>Untung</span>
          </button>
          <button class="mobile-tab-btn" data-mod="customers">
            ${icon('customers', { size: 14 })} <span>Pelanggan</span>
          </button>
          <button class="mobile-tab-btn" data-mod="charts">
            ${icon('charts', { size: 14 })} <span>Grafik</span>
          </button>
          <button class="mobile-tab-btn" data-mod="bookkeeping">
            ${icon('bookkeeping', { size: 14 })} <span>Buku Kas</span>
          </button>
          <button class="mobile-tab-btn" data-mod="settings">
            ${icon('settings', { size: 14 })} <span>Akun</span>
          </button>
          ${userIsAdmin ? `
            <button class="mobile-tab-btn" data-mod="users">
              ${icon('users', { size: 14 })} <span>Pengguna</span>
            </button>
            <button class="mobile-tab-btn" data-mod="audit">
              ${icon('audit', { size: 14 })} <span>Log</span>
            </button>
          ` : ''}
        </nav>

        <!-- Header Bar (Breadcrumb, Title, Ekspor, User Menu Topbar) -->
        <header class="dasbor-header">
          <div class="header-left">
            <div class="topbar-breadcrumb">
              <span>Admin</span>
              <span class="breadcrumb-separator">${icon('chevronRight', { size: 12 })}</span>
              <span class="breadcrumb-active" id="breadcrumb-current-mod">Dasbor Booking</span>
            </div>
            <div class="header-title-wrap">
              <h1 id="page-heading" class="page-title">Dashboard Ringkas</h1>
              <span id="page-subheading" class="page-desc">Ringkasan performa keuntungan harian dan operasional usaha.</span>
            </div>
          </div>

          <div class="header-right">
            <!-- Tombol Sekunder Ekspor CSV -->
            <button id="btn-header-export" class="btn btn-secondary" title="Ekspor Data Booking ke CSV">
              ${icon('export', { size: 15 })}
              <span>Ekspor CSV</span>
            </button>

            <!-- Tombol Refresh Data -->
            <button id="btn-global-refresh" class="btn btn-secondary btn-icon-only" title="Muat Ulang Data">
              ${icon('refresh', { size: 15 })}
            </button>

            <!-- Menu Pengguna di Topbar Kanan (Section 10.G) -->
            <div class="topbar-user-menu" id="topbar-user-menu">
              <button type="button" class="user-profile-trigger" id="user-menu-trigger" aria-haspopup="true" aria-expanded="false" title="Menu Pengguna">
                <div class="user-avatar-circle">${user?.avatar || 'GA'}</div>
                <span class="user-display-name">${escapeHtml(user?.name || 'Admin')}</span>
                <span class="user-role-badge role-${user?.role || 'admin'}">${user?.role === 'admin' ? 'Admin' : 'Staf'}</span>
                ${icon('chevronDown', { size: 13, className: 'chevron-icon' })}
              </button>
              
              <div class="user-dropdown-menu" id="user-dropdown-menu" role="menu">
                <div class="user-dropdown-header">
                  <div style="font-weight: 600; font-size: 0.8rem; color: var(--text-primary);">${escapeHtml(user?.name || 'Admin')}</div>
                  <div class="user-dropdown-email">${escapeHtml(user?.email || 'admin@dasboruntung.com')}</div>
                </div>
                <button type="button" class="user-dropdown-item" id="menu-item-profile">
                  ${icon('user', { size: 15 })} <span>Profil &amp; Informasi Sesi</span>
                </button>
                <button type="button" class="user-dropdown-item" id="menu-item-change-password">
                  ${icon('lock', { size: 15 })} <span>Ganti Kata Sandi</span>
                </button>
                <div style="height: 1px; background: var(--border-subtle); margin: 4px 0;"></div>
                <button type="button" class="user-dropdown-item item-danger" id="menu-item-logout">
                  ${icon('logout', { size: 15 })} <span>Keluar dari Akun</span>
                </button>
              </div>
            </div>
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
 * Helper Drawer Sidebar Mobile
 */
function toggleMobileSidebar() {
  const sidebar = document.querySelector('.dasbor-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar) return;
  const isOpen = sidebar.classList.toggle('mobile-open');
  backdrop?.classList.toggle('active', isOpen);
}

function closeMobileSidebar() {
  const sidebar = document.querySelector('.dasbor-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  sidebar?.classList.remove('mobile-open');
  backdrop?.classList.remove('active');
}

/**
 * Setup Event Navigasi
 */
function setupNavigationEvents() {
  // Sidebar Navigation Links
  document.querySelectorAll('.sidebar-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const mod = btn.getAttribute('data-mod');
      switchModule(mod);
      closeMobileSidebar();
    });
  });

  // Mobile Horizontal Tabs
  document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mod = btn.getAttribute('data-mod');
      switchModule(mod);
    });
  });

  // Mobile Drawer Toggle & Close
  document.getElementById('btn-toggle-sidebar')?.addEventListener('click', toggleMobileSidebar);
  document.getElementById('btn-close-sidebar')?.addEventListener('click', closeMobileSidebar);
  document.getElementById('sidebar-backdrop')?.addEventListener('click', closeMobileSidebar);

  // Refresh Buttons
  document.getElementById('btn-global-refresh')?.addEventListener('click', async () => {
    await loadAllData();
    renderActiveModule();
    window.showToast?.('Data berhasil disegarkan!', 'info');
  });
  document.getElementById('btn-mobile-refresh')?.addEventListener('click', async () => {
    await loadAllData();
    renderActiveModule();
    window.showToast?.('Data berhasil disegarkan!', 'info');
  });

  // Quick WhatsApp Order Buttons
  document.getElementById('btn-quick-wa-order')?.addEventListener('click', () => {
    showAddOrderModal('whatsapp');
  });
  document.getElementById('btn-mobile-quick-wa')?.addEventListener('click', () => {
    showAddOrderModal('whatsapp');
  });

  // Database Status Pills Click
  document.getElementById('sidebar-db-status')?.addEventListener('click', () => {
    switchModule('settings');
    closeMobileSidebar();
  });
  document.getElementById('mobile-db-status')?.addEventListener('click', () => {
    switchModule('settings');
  });

  // Topbar Export CSV
  document.getElementById('btn-header-export')?.addEventListener('click', () => {
    exportBookingsToCSV(ordersData);
  });

  // Topbar User Menu Toggle & Dropdown Events (Section 10.G)
  const userTrigger = document.getElementById('user-menu-trigger');
  const userDropdown = document.getElementById('user-dropdown-menu');
  if (userTrigger && userDropdown) {
    userTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = userTrigger.getAttribute('aria-expanded') === 'true';
      userTrigger.setAttribute('aria-expanded', !isExpanded);
      userDropdown.classList.toggle('show', !isExpanded);
    });

    document.addEventListener('click', (e) => {
      if (!userDropdown.contains(e.target) && !userTrigger.contains(e.target)) {
        userDropdown.classList.remove('show');
        userTrigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // User Dropdown Menu Items
  document.getElementById('menu-item-profile')?.addEventListener('click', () => {
    userDropdown?.classList.remove('show');
    userTrigger?.setAttribute('aria-expanded', 'false');
    showUserProfileModal();
  });

  document.getElementById('menu-item-change-password')?.addEventListener('click', () => {
    userDropdown?.classList.remove('show');
    userTrigger?.setAttribute('aria-expanded', 'false');
    showChangePasswordModal();
  });

  document.getElementById('menu-item-logout')?.addEventListener('click', async () => {
    userDropdown?.classList.remove('show');
    userTrigger?.setAttribute('aria-expanded', 'false');
    if (confirm('Apakah Anda yakin ingin keluar dari akun?')) {
      await logout();
      window.location.href = '/login';
    }
  });

  // Mobile User Avatar Trigger (Section 10.G)
  document.getElementById('mobile-user-avatar-btn')?.addEventListener('click', () => {
    showMobileUserMenuModal();
  });
}

function switchModule(modName) {
  activeModule = modName;

  // Perbarui breadcrumb topbar
  const breadcrumb = document.getElementById('breadcrumb-current-mod');
  const moduleNames = {
    dashboard: 'Dasbor Ringkas',
    orders: 'Kelola Pesanan',
    profit: 'Hitung Untung',
    customers: 'Data Pelanggan',
    charts: 'Grafik Keuntungan',
    bookkeeping: 'Pembukuan Harian',
    settings: 'Pengaturan Akun',
    users: 'Manajemen Pengguna',
    audit: 'Log Aktivitas'
  };
  if (breadcrumb) {
    breadcrumb.textContent = moduleNames[modName] || 'Dasbor';
  }

  document.querySelectorAll('.sidebar-link').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mod') === modName);
  });
  document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
    const isActive = btn.getAttribute('data-mod') === modName;
    btn.classList.toggle('active', isActive);
    if (isActive) {
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
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

  const rawPrice = Number(b.total_price || b.subtotal_amount || b.grand_total || 0);
  const invCode = b.invoice_number || b.invoice || (b.id ? 'BKG-' + String(b.id).slice(0, 8).toUpperCase() : 'ORD-001');
  const serviceTitle = b.service_name || b.package_name || b.service_or_item || 'Paket Wisata Spiritual';
  const orderDt = b.booking_date || b.tour_date || (b.created_at ? b.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);

  return {
    id: b.id,
    order_code: invCode,
    customer_id: b.customer_id || ('cust-' + b.id),
    customer_name: b.customer_name || 'Pelanggan',
    customer_phone: b.customer_phone || b.whatsapp || '-',
    customer_email: b.customer_email || b.email || '',
    service_or_item: serviceTitle,
    source: b.source || 'website',
    external_order_id: invCode,
    order_date: orderDt,
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
    const mobileBadge = document.getElementById('mobile-badge-order-count');
    if (mobileBadge) mobileBadge.textContent = ordersData.length;

  } catch (err) {
    console.error('Error load data:', err);
    window.showToast?.(`Gagal memuat data: ${err.message}`, 'error');
  }
}

/**
 * Render Modul Aktif (Teks Berbasis Fakta Teknis & Kalimat Aktif)
 */
function renderActiveModule() {
  const viewport = document.getElementById('dasbor-viewport');
  const heading = document.getElementById('page-heading');
  const subheading = document.getElementById('page-subheading');
  if (!viewport) return;

  switch (activeModule) {
    case 'dashboard':
      heading.textContent = 'Pusat Operasional & Laba Harian';
      subheading.textContent = 'Memantau transaksi pesanan masuk, alokasi modal langsung (HPP), dan realisasi laba bersih harian.';
      viewport.innerHTML = renderDashboardView();
      initDashboardEvents();
      break;

    case 'orders':
      heading.textContent = 'Buku Pesanan & Reservasi';
      subheading.textContent = 'Mencatat seluruh pesanan dari Website dan WhatsApp, memperbarui status pengerjaan, dan mencatat riwayat transaksi.';
      viewport.innerHTML = renderOrdersView();
      initOrdersEvents();
      break;

    case 'profit':
      heading.textContent = 'Kalkulasi Untung & Modal Langsung';
      subheading.textContent = 'Menghitung laba kotor, mencatat HPP operasional per pesanan, dan menampilkan margin keuntungan riil.';
      viewport.innerHTML = renderProfitView();
      initProfitEvents();
      break;

    case 'customers':
      heading.textContent = 'Direktori & Riwayat Pelanggan';
      subheading.textContent = 'Menyimpan profil kontak pelanggan, riwayat pemesanan terdahulu, dan total kontribusi omzet.';
      viewport.innerHTML = renderCustomersView();
      initCustomersEvents();
      break;

    case 'charts':
      heading.textContent = 'Analisis Performa & Grafik Laba';
      subheading.textContent = 'Grafik komparasi pendapatan versus biaya operasional untuk mengevaluasi pertumbuhan usaha.';
      viewport.innerHTML = renderChartsView();
      initChartsEvents();
      break;

    case 'bookkeeping':
      heading.textContent = 'Buku Kas & Tutup Buku Periode';
      subheading.textContent = 'Pencatatan arus kas masuk dan keluar, rekonsiliasi akhir bulan, serta ekspor laporan keuangan format spreadsheet.';
      viewport.innerHTML = renderBookkeepingView();
      initBookkeepingEvents();
      break;

    case 'sync':
      switchModule('dashboard');
      break;

    case 'settings':
      heading.textContent = 'Pengaturan Akses & Kredensial Database';
      subheading.textContent = 'Konfigurasi endpoint Supabase API, autentikasi pengguna admin, dan audit jejak aktivitas.';
      viewport.innerHTML = renderSettingsView();
      initSettingsEvents();
      break;

    case 'users':
      if (!isAdmin()) {
        window.showToast?.('Akses ditolak: Hanya Admin yang dapat mengelola pengguna.', 'error');
        switchModule('dashboard');
        return;
      }
      heading.textContent = 'Manajemen Pengguna & Hak Akses (RBAC)';
      subheading.textContent = 'Kelola kredensial staf operasional, terapkan batasan peran Admin vs Staf, dan pantau status akun.';
      viewport.innerHTML = renderUsersView();
      initUsersEvents();
      break;

    case 'audit':
      if (!isAdmin()) {
        window.showToast?.('Akses ditolak: Hanya Admin yang dapat melihat log aktivitas.', 'error');
        switchModule('dashboard');
        return;
      }
      heading.textContent = 'Log Aktivitas & Jejak Audit Sistem';
      subheading.textContent = 'Rekam jejak seluruh mutasi data pemesanan, riwayat autentikasi login/logout, dan audit kepatuhan staf.';
      viewport.innerHTML = renderAuditView();
      initAuditEvents();
      break;
  }
}

/**
 * Helper: Subtle Semantic Pill Badge dengan titik indikator 6px
 * Confirmed: Emerald (#ECFDF5 / #047857 / #A7F3D0 / #10B981)
 * Pending: Amber (#FFFBEB / #B45309 / #FDE68A / #F59E0B)
 * Cancelled: Red (#FEF2F2 / #B91C1C / #FECACA / #EF4444)
 * Completed: Zinc (#F4F4F5 / #3F3F46 / #E4E4E7 / #71717A)
 */
export function getSemanticBadge(status) {
  const s = String(status || 'Baru').toLowerCase();
  if (['confirmed', 'dikonfirmasi', 'aktif'].includes(s)) {
    return `<span class="badge-subtle badge-confirmed"><span class="badge-dot"></span>Dikonfirmasi</span>`;
  } else if (['completed', 'selesai', 'lunas', 'paid'].includes(s)) {
    return `<span class="badge-subtle badge-completed"><span class="badge-dot"></span>Selesai</span>`;
  } else if (['cancelled', 'batal', 'dibatalkan'].includes(s)) {
    return `<span class="badge-subtle badge-cancelled"><span class="badge-dot"></span>Dibatalkan</span>`;
  } else {
    return `<span class="badge-subtle badge-pending"><span class="badge-dot"></span>Menunggu</span>`;
  }
}

/* ==============================================================================
   1. MODUL: PUSAT OPERASIONAL & LABA HARIAN (EDITORIAL & FUNCTIONAL)
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

  const totalAllOrders = ordersData.length || 1;
  const recentOrders = ordersData.slice(0, 6);
  const { isConfigured, url } = getSupabaseCredentials();

  return `
    <div class="view-container">
      
      <!-- 1. Compressed KPI Strip (Max Height 88px, 4 Columns, Tabular-Nums) -->
      <section class="kpi-horizontal-strip" aria-label="Ringkasan Performa Booking &amp; Keuangan">
        <div class="ledger-cell">
          <div class="ledger-header">
            <span class="ledger-label">Total Omzet</span>
            <span class="ledger-badge ledger-badge-success">${todayOrders.length} Pesanan</span>
          </div>
          <div class="ledger-row">
            <div class="ledger-value">${formatRupiah(summaryToday.totalRevenue)}</div>
          </div>
          <div class="ledger-caption">Realisasi pesanan terjadwal hari ini</div>
        </div>

        <div class="ledger-cell">
          <div class="ledger-header">
            <span class="ledger-label">Laba Bersih</span>
            <span class="ledger-badge ledger-badge-success">${summaryToday.netMargin}% Margin</span>
          </div>
          <div class="ledger-row">
            <div class="ledger-value">${formatRupiah(summaryToday.netProfit)}</div>
          </div>
          <div class="ledger-caption">Omzet bersih dikurangi HPP &amp; beban operasional</div>
        </div>

        <div class="ledger-cell">
          <div class="ledger-header">
            <span class="ledger-label">Alokasi Modal (HPP)</span>
            <span class="ledger-badge ledger-badge-neutral">Beban Riil</span>
          </div>
          <div class="ledger-row">
            <div class="ledger-value">${formatRupiah(summaryToday.totalOrderCosts + summaryToday.totalOperational)}</div>
          </div>
          <div class="ledger-caption">Biaya langsung layanan + beban harian</div>
        </div>

        <div class="ledger-cell">
          <div class="ledger-header">
            <span class="ledger-label">Booking Aktif</span>
            <span class="ledger-badge ledger-badge-warning">${ordersData.filter(o => o.status !== 'Dibatalkan' && o.status !== 'Selesai').length} Antrean</span>
          </div>
          <div class="ledger-row">
            <div class="ledger-value">${ordersData.filter(o => o.status !== 'Dibatalkan' && o.status !== 'Selesai').length}</div>
          </div>
          <div class="ledger-caption">Pesanan menunggu &amp; dikonfirmasi</div>
        </div>
      </section>

      <!-- 2. Asymmetric 2-Column Operational Grid (68% Primary Ledger / 32% Telemetry Rail) -->
      <div class="dashboard-asymmetric-layout">
        
        <!-- KOLOM UTAMA (68%): Tabel Kerja Fungsional & Diagram Alur Kerja Konkret -->
        <div class="dashboard-primary-col">
          
          <!-- Tabel Kerja Fungsional: Pesanan Terbaru (Border-First & Compact Row) -->
          <div class="table-card-wrapper" style="margin-bottom: 1.5rem;">
            <div class="card-header" style="padding: 0.95rem 1.15rem; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.55rem;">
                <div class="brand-badge-icon brand-badge-sm" style="background: #EFF6FF; color: #2563EB; box-shadow: none;">
                  ${icon('orders', { size: 16 })}
                </div>
                <div>
                  <h3 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin: 0; letter-spacing: -0.01em;">Reservasi &amp; Booking Terbaru</h3>
                  <p style="font-size: 0.76rem; color: var(--text-muted); margin: 2px 0 0;">Transaksi masuk terkini yang terhubung secara realtime.</p>
                </div>
              </div>
              <button class="btn btn-secondary" style="font-size: 0.78rem; height: 32px; padding: 0 0.85rem;" id="btn-goto-all-orders">
                <span>Buka Semua Pesanan</span>
                ${icon('arrowUpRight', { size: 14 })}
              </button>
            </div>

            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th class="col-id">ID BOOKING</th>
                    <th>NAMA PELANGGAN &amp; KONTAK</th>
                    <th>LAYANAN / RUANGAN</th>
                    <th style="width: 145px;">JADWAL</th>
                    <th style="width: 130px;">STATUS</th>
                    <th style="width: 145px; text-align: right;">TOTAL / BAYAR</th>
                    <th style="width: 48px; text-align: center;">AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentOrders.length === 0 ? `
                    <tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">Belum ada data pesanan tersimpan di database.</td></tr>
                  ` : recentOrders.map(o => {
                    const cleanPhone = (o.customer_phone || '').replace(/[^0-9]/g, '');
                    const waHref = cleanPhone ? `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(o.customer_name)},%20kami%20konfirmasi%20jadwal%20${o.order_code}:` : null;
                    return `
                    <tr>
                      <td class="col-id">
                        <span class="booking-id-tag">${escapeHtml(o.order_code)}</span>
                      </td>
                      <td>
                        <div class="cust-cell-primary">${escapeHtml(o.customer_name)}</div>
                        <div class="cust-cell-secondary">
                          ${waHref ? `
                            <a href="${waHref}" target="_blank" rel="noopener noreferrer" class="table-wa-link" title="Chat WhatsApp Pelanggan">
                              ${icon('whatsapp', { size: 12, strokeWidth: 2 })} <span>${escapeHtml(o.customer_phone)}</span>
                            </a>
                          ` : `<span>${escapeHtml(o.customer_phone || '-')}</span>`}
                        </div>
                      </td>
                      <td>
                        <span style="font-size: 0.82rem; color: var(--text-primary); font-weight: 500;">${escapeHtml(o.service_or_item)}</span>
                      </td>
                      <td>
                        <div class="tabular-nums" style="font-weight: 500; font-size: 0.82rem; color: var(--text-primary); display: flex; align-items: center; gap: 4px;">
                          ${icon('calendar', { size: 13, strokeWidth: 1.5 })}
                          <span>${o.order_date}</span>
                        </div>
                        <div class="tabular-nums" style="font-size: 0.72rem; color: var(--text-muted); margin-top: 1px; padding-left: 17px;">pk ${o.order_time || '09:00'} WIB</div>
                      </td>
                      <td>
                        ${getSemanticBadge(o.status)}
                      </td>
                      <td style="text-align: right;">
                        <div class="tabular-nums" style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${formatRupiah(calculateOrderNetIncome(o))}</div>
                        <div style="font-size: 0.72rem; color: ${o.payment_status === 'Lunas' ? '#047857' : '#B45309'}; font-weight: 600; margin-top: 1px;">${o.payment_status || 'Belum Dibayar'}</div>
                      </td>
                      <td style="text-align: center;">
                        <button type="button" class="btn-action-dots" title="Tindakan Cepat" onclick="window.adminOpenActionMenu('${o.id}', event)">
                          ${icon('dots', { size: 15 })}
                        </button>
                      </td>
                    </tr>
                  `;}).join('')}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <!-- KOLOM SAMPING (32%): Distribusi Status Berbobot & Pintasan Cepat -->
        <div class="dashboard-rail-col">
          
          <!-- Kartu 1: Distribusi Status Alur Pesanan (Weighted Horizontal Bars) -->
          <div class="card">
            <div class="card-header">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div class="brand-badge-icon brand-badge-sm" style="background: #F8FAFC; color: #475569; border: 1px solid var(--border-subtle); box-shadow: none;">
                  ${icon('charts', { size: 16 })}
                </div>
                <div>
                  <h3 class="card-title" style="margin: 0; font-size: 0.95rem; font-weight: 700;">Distribusi Status Booking</h3>
                  <p class="card-desc" style="margin: 2px 0 0;">Proporsi pesanan dalam siklus pengerjaan operasional.</p>
                </div>
              </div>
            </div>

            <div class="weighted-status-container">
              <div class="weighted-status-item">
                <div class="status-item-header">
                  <span class="status-item-label">
                    <span class="status-pill status-baru">Baru</span> Pesanan Baru Masuk
                  </span>
                  <span class="status-item-count" style="color: #3B82F6;">${statusCount.Baru}</span>
                </div>
                <div class="status-progress-track">
                  <div class="status-progress-fill" style="width: ${(statusCount.Baru / totalAllOrders) * 100}%; background: #3B82F6;"></div>
                </div>
              </div>

              <div class="weighted-status-item">
                <div class="status-item-header">
                  <span class="status-item-label">
                    <span class="status-pill status-dikonfirmasi">Dikonfirmasi</span> Jadwal Terjadwal
                  </span>
                  <span class="status-item-count" style="color: #F59E0B;">${statusCount.Dikonfirmasi}</span>
                </div>
                <div class="status-progress-track">
                  <div class="status-progress-fill" style="width: ${(statusCount.Dikonfirmasi / totalAllOrders) * 100}%; background: #F59E0B;"></div>
                </div>
              </div>

              <div class="weighted-status-item">
                <div class="status-item-header">
                  <span class="status-item-label">
                    <span class="status-pill status-diproses">Diproses</span> Berjalan di Lokasi
                  </span>
                  <span class="status-item-count" style="color: #8B5CF6;">${statusCount.Diproses}</span>
                </div>
                <div class="status-progress-track">
                  <div class="status-progress-fill" style="width: ${(statusCount.Diproses / totalAllOrders) * 100}%; background: #8B5CF6;"></div>
                </div>
              </div>

              <div class="weighted-status-item">
                <div class="status-item-header">
                  <span class="status-item-label">
                    <span class="status-pill status-selesai">Selesai</span> Selesai &amp; Lunas
                  </span>
                  <span class="status-item-count" style="color: #10B981;">${statusCount.Selesai}</span>
                </div>
                <div class="status-progress-track">
                  <div class="status-progress-fill" style="width: ${(statusCount.Selesai / totalAllOrders) * 100}%; background: #10B981;"></div>
                </div>
              </div>

              <div class="weighted-status-item">
                <div class="status-item-header">
                  <span class="status-item-label">
                    <span class="status-pill status-dibatalkan">Dibatalkan</span> Batal / Refund
                  </span>
                  <span class="status-item-count" style="color: #EF4444;">${statusCount.Dibatalkan}</span>
                </div>
                <div class="status-progress-track">
                  <div class="status-progress-fill" style="width: ${(statusCount.Dibatalkan / totalAllOrders) * 100}%; background: #EF4444;"></div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  `;
}

function initDashboardEvents() {
  document.getElementById('btn-goto-all-orders')?.addEventListener('click', () => switchModule('orders'));
}

/* ==============================================================================
   2. MODUL: KELOLA PESANAN & RESERVASI (BORDER-FIRST B2B SAAS)
   ============================================================================== */
let currentSearchQuery = '';
let currentStatusFilter = 'ALL';
let currentDateFilter = 'ALL';
let orderSortColumn = 'order_date'; // 'order_date' | 'total'
let orderSortDirection = 'desc'; // 'asc' | 'desc'
let orderCurrentPage = 1;
let orderPageSize = 25; // 25 | 50 | 100
let orderViewMode = 'auto'; // 'auto' (kartu di HP, tabel di desktop) | 'cards' | 'table'
let selectedBookingIds = new Set();
let orderSearchDebounceTimer = null;

/**
 * Hitung Jumlah Booking per Status
 */
function getStatusCounts() {
  const counts = {
    total: ordersData.length,
    Menunggu: 0,
    Dikonfirmasi: 0,
    Selesai: 0,
    Dibatalkan: 0
  };

  ordersData.forEach(o => {
    const s = String(o.status || '').toLowerCase();
    if (['baru', 'menunggu', 'diproses', 'pending'].includes(s)) counts.Menunggu++;
    else if (['dikonfirmasi', 'confirmed'].includes(s)) counts.Dikonfirmasi++;
    else if (['selesai', 'completed'].includes(s)) counts.Selesai++;
    else if (['dibatalkan', 'cancelled', 'batal'].includes(s)) counts.Dibatalkan++;
  });

  return counts;
}

/**
 * Ekspor Data Booking ke CSV
 */
export function exportBookingsToCSV(bookingsList, filename = 'daftar-booking.csv') {
  if (!bookingsList || bookingsList.length === 0) {
    window.showToast?.('Tidak ada data booking untuk diekspor.', 'error');
    return;
  }

  const headers = ['ID Booking', 'Nama Pelanggan', 'Kontak WhatsApp', 'Email', 'Layanan/Unit', 'Tanggal', 'Jam', 'Status Operasional', 'Status Pembayaran', 'Nilai Total (Rp)'];
  const rows = bookingsList.map(b => [
    `"${(b.order_code || '').replace(/"/g, '""')}"`,
    `"${(b.customer_name || '').replace(/"/g, '""')}"`,
    `"${(b.customer_phone || '').replace(/"/g, '""')}"`,
    `"${(b.customer_email || '').replace(/"/g, '""')}"`,
    `"${(b.service_or_item || '').replace(/"/g, '""')}"`,
    `"${b.order_date || ''}"`,
    `"${b.order_time || ''}"`,
    `"${b.status || ''}"`,
    `"${b.payment_status || ''}"`,
    `"${calculateOrderNetIncome(b)}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  logAuditEvent({
    action: 'EXPORT_BOOKINGS',
    entity_type: 'bookings',
    details: `Mengekspor ${bookingsList.length} data booking ke file ${filename}`
  });

  window.showToast?.(`${bookingsList.length} data booking berhasil diekspor!`, 'success');
}

function syncOrdersUrlParams() {
  const url = new URL(window.location);
  if (currentSearchQuery) url.searchParams.set('q', currentSearchQuery);
  else url.searchParams.delete('q');

  if (currentStatusFilter !== 'ALL') url.searchParams.set('status', currentStatusFilter);
  else url.searchParams.delete('status');

  if (currentDateFilter !== 'ALL') url.searchParams.set('date', currentDateFilter);
  else url.searchParams.delete('date');

  if (orderCurrentPage > 1) url.searchParams.set('page', orderCurrentPage);
  else url.searchParams.delete('page');

  window.history.replaceState({}, '', url);
}

function renderOrdersView() {
  const statusCounts = getStatusCounts();
  const hasActiveFilters = Boolean(currentSearchQuery || currentStatusFilter !== 'ALL' || currentDateFilter !== 'ALL');
  const { paginatedOrders, totalCount, totalPages, startIndex } = getFilteredAndSortedOrders();

  return `
    <div class="view-container">
      
      <!-- Unified Control Bar & Compact Data Table Container -->
      <div class="table-card-wrapper">
        
        <!-- Unified Responsive Control Bar (Section 6) -->
        ${ControlBar({
          searchQuery: currentSearchQuery,
          currentStatus: currentStatusFilter,
          currentDate: currentDateFilter,
          statusCounts,
          hasActiveFilters,
          viewMode: orderViewMode
        })}

        <!-- Mass Action Bar (Muncul jika ada baris terpilih) -->
        <div id="mass-action-bar-container">
          ${MassActionBar(selectedBookingIds.size)}
        </div>

        <!-- Tampilan Kartu Responsif (Khusus Layar HP & Auto-Layout) -->
        <div class="orders-cards-container ${orderViewMode === 'table' ? 'force-hidden' : ''}">
          ${renderOrderCards(paginatedOrders)}
        </div>

        <!-- 8-Column Data Table (Layar Komputer / Mode Tabel) -->
        <div class="table-responsive orders-table-wrapper ${orderViewMode === 'cards' ? 'force-hidden' : ''}" style="max-height: 640px; overflow-y: auto;">
          <table class="data-table" style="position: relative;">
            <thead style="position: sticky; top: 0; z-index: 20;">
              <tr>
                <th style="width: 36px; text-align: center;">
                  <input type="checkbox" id="check-all-orders" class="table-checkbox" title="Pilih Semua di Halaman Ini" />
                </th>
                <th style="width: 140px;">ID BOOKING</th>
                <th>NAMA PELANGGAN &amp; KONTAK</th>
                <th>LAYANAN / RUANGAN / UNIT</th>
                <th style="width: 145px; cursor: pointer; user-select: none;" id="th-sort-jadwal" title="Urutkan berdasarkan Jadwal">
                  JADWAL ${orderSortColumn === 'order_date' ? (orderSortDirection === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th style="width: 130px;">STATUS</th>
                <th style="width: 140px; text-align: right; cursor: pointer; user-select: none;" id="th-sort-total" title="Urutkan berdasarkan Total">
                  TOTAL / BAYAR ${orderSortColumn === 'total' ? (orderSortDirection === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th style="width: 48px; text-align: center;">AKSI</th>
              </tr>
            </thead>
            <tbody id="orders-table-tbody">
              ${renderOrderRows(paginatedOrders)}
            </tbody>
          </table>
        </div>

        <!-- Footer Pagination Bar -->
        <div class="pagination-bar">
          <div class="pagination-left">
            <span>Baris per halaman:</span>
            <select id="order-page-size-select" class="pagination-select" aria-label="Jumlah baris per halaman">
              <option value="25" ${orderPageSize === 25 ? 'selected' : ''}>25</option>
              <option value="50" ${orderPageSize === 50 ? 'selected' : ''}>50</option>
              <option value="100" ${orderPageSize === 100 ? 'selected' : ''}>100</option>
            </select>
            <span style="margin-left: 0.5rem; font-variant-numeric: tabular-nums;">
              ${totalCount > 0 ? `Menampilkan ${startIndex + 1} - ${Math.min(startIndex + orderPageSize, totalCount)} dari ${totalCount} booking` : '0 booking'}
            </span>
          </div>

          <div class="pagination-buttons">
            <button type="button" id="btn-page-prev" class="pagination-btn" ${orderCurrentPage <= 1 ? 'disabled' : ''}>
              &larr; Sebelumnya
            </button>
            <span style="font-variant-numeric: tabular-nums; padding: 0 6px; font-weight: 500;">
              Halaman ${orderCurrentPage} dari ${totalPages}
            </span>
            <button type="button" id="btn-page-next" class="pagination-btn" ${orderCurrentPage >= totalPages ? 'disabled' : ''}>
              Berikutnya &rarr;
            </button>
          </div>
        </div>

      </div>

    </div>
  `;
}

function getFilteredAndSortedOrders() {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Filtering
  const filtered = ordersData.filter(o => {
    // Status Filter
    if (currentStatusFilter !== 'ALL') {
      const s = String(o.status || '').toLowerCase();
      if (currentStatusFilter === 'Menunggu' && !['baru', 'menunggu', 'diproses', 'pending'].includes(s)) return false;
      if (currentStatusFilter === 'Dikonfirmasi' && !['dikonfirmasi', 'confirmed'].includes(s)) return false;
      if (currentStatusFilter === 'Selesai' && !['selesai', 'completed'].includes(s)) return false;
      if (currentStatusFilter === 'Dibatalkan' && !['dibatalkan', 'cancelled', 'batal'].includes(s)) return false;
    }

    // Date Range Presets
    if (currentDateFilter === 'TODAY' && o.order_date !== todayStr) return false;
    if (currentDateFilter === '7_DAYS') {
      const orderDate = new Date(o.order_date);
      const diffDays = (new Date() - orderDate) / (1000 * 60 * 60 * 24);
      if (diffDays < 0 || diffDays > 7) return false;
    }
    if (currentDateFilter === '30_DAYS') {
      const orderDate = new Date(o.order_date);
      const diffDays = (new Date() - orderDate) / (1000 * 60 * 60 * 24);
      if (diffDays < 0 || diffDays > 30) return false;
    }
    if (currentDateFilter === 'THIS_MONTH') {
      const currentMonth = todayStr.slice(0, 7);
      if (!(o.order_date || '').startsWith(currentMonth)) return false;
    }

    // Search Keyword
    if (currentSearchQuery) {
      const q = currentSearchQuery.toLowerCase();
      const matchCode = (o.order_code || '').toLowerCase().includes(q);
      const matchName = (o.customer_name || '').toLowerCase().includes(q);
      const matchPhone = (o.customer_phone || '').toLowerCase().includes(q);
      const matchItem = (o.service_or_item || '').toLowerCase().includes(q);
      return matchCode || matchName || matchPhone || matchItem;
    }

    return true;
  });

  // 2. Sorting
  filtered.sort((a, b) => {
    if (orderSortColumn === 'order_date') {
      const dtA = `${a.order_date} ${a.order_time || '00:00'}`;
      const dtB = `${b.order_date} ${b.order_time || '00:00'}`;
      return orderSortDirection === 'asc' ? dtA.localeCompare(dtB) : dtB.localeCompare(dtA);
    }
    if (orderSortColumn === 'total') {
      const totalA = calculateOrderNetIncome(a);
      const totalB = calculateOrderNetIncome(b);
      return orderSortDirection === 'asc' ? totalA - totalB : totalB - totalA;
    }
    return 0;
  });

  // 3. Pagination
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / orderPageSize));
  if (orderCurrentPage > totalPages) orderCurrentPage = totalPages;
  const startIndex = (orderCurrentPage - 1) * orderPageSize;
  const paginatedOrders = filtered.slice(startIndex, startIndex + orderPageSize);

  return {
    filtered,
    paginatedOrders,
    totalCount,
    totalPages,
    startIndex
  };
}

/**
 * Tampilan Kartu Responsif (Khusus Layar HP / Touch-First Auto-Layout)
 */
function renderOrderCards(orders) {
  if (orders.length === 0) {
    if (currentSearchQuery || currentStatusFilter !== 'ALL' || currentDateFilter !== 'ALL') {
      return EmptyFilterState({});
    }
    return InitialEmptyState();
  }

  return `
    <div class="orders-mobile-card-list">
      ${orders.map(o => {
        const netIncome = calculateOrderNetIncome(o);
        const cleanPhone = (o.customer_phone || '').replace(/[^0-9]/g, '');
        const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(o.customer_name)},%20kami%20konfirmasi%20jadwal%20${o.order_code}:` : null;
        const isChecked = selectedBookingIds.has(o.id);
        const isPaid = o.payment_status === 'Lunas';

        return `
          <div class="booking-mobile-card ${isChecked ? 'card-selected' : ''}" data-id="${o.id}">
            <!-- Card Header: Checkbox + ID + Status Badge -->
            <div class="bmc-header">
              <div class="bmc-id-wrap">
                <input type="checkbox" class="table-checkbox row-checkbox bmc-checkbox" data-id="${o.id}" ${isChecked ? 'checked' : ''} aria-label="Pilih ${o.order_code}" />
                <span class="booking-id-tag">${escapeHtml(o.order_code)}</span>
              </div>
              <div class="bmc-status">
                ${StatusBadge(o.status)}
              </div>
            </div>

            <!-- Card Body: Customer & Package -->
            <div class="bmc-body">
              <div class="bmc-customer-row">
                <span class="bmc-customer-name">${escapeHtml(o.customer_name)}</span>
                ${waLink ? `
                  <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="bmc-wa-btn" title="Chat WhatsApp Pelanggan">
                    ${icon('whatsapp', { size: 13, strokeWidth: 2 })}
                    <span>${escapeHtml(o.customer_phone)}</span>
                  </a>
                ` : `<span class="bmc-phone" style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(o.customer_phone || '-')}</span>`}
              </div>
              <div class="bmc-service-title">${escapeHtml(o.service_or_item)}</div>
            </div>

            <!-- Card Footer: Schedule + Amount + Action -->
            <div class="bmc-footer">
              <div class="bmc-schedule-amount">
                <div class="bmc-schedule tabular-nums" style="display: flex; align-items: center; gap: 4px;">
                  ${icon('calendar', { size: 12, strokeWidth: 1.5 })}
                  <span>${formatTanggal(o.order_date)} • pk ${formatJam(o.order_time)} WIB</span>
                </div>
                <div class="bmc-amount tabular-nums">
                  <strong>${formatRupiah(netIncome)}</strong>
                  <span class="bmc-payment-pill ${isPaid ? 'paid' : 'unpaid'}">${o.payment_status || 'Belum Dibayar'}</span>
                </div>
              </div>

              <div class="bmc-actions">
                <button type="button" class="btn btn-secondary bmc-action-btn" onclick="window.adminOpenActionMenu('${o.id}', event)">
                  ${icon('dots', { size: 14 })}
                  <span>Tindakan</span>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderOrderRows(orders) {
  if (orders.length === 0) {
    if (currentSearchQuery || currentStatusFilter !== 'ALL' || currentDateFilter !== 'ALL') {
      return EmptyFilterState({});
    }
    return InitialEmptyState();
  }

  return orders.map(o => {
    const netIncome = calculateOrderNetIncome(o);
    const cleanPhone = (o.customer_phone || '').replace(/[^0-9]/g, '');
    const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(o.customer_name)},%20kami%20konfirmasi%20jadwal%20${o.order_code}:` : null;
    const isChecked = selectedBookingIds.has(o.id);

    return `
      <tr class="${isChecked ? 'row-selected' : ''}">
        <!-- 1. Checkbox -->
        <td style="text-align: center;">
          <input type="checkbox" class="table-checkbox row-checkbox" data-id="${o.id}" ${isChecked ? 'checked' : ''} />
        </td>

        <!-- 2. ID Booking (Monospace Badge Tag — Never wraps!) -->
        <td class="col-id">
          <span class="booking-id-tag">${escapeHtml(o.order_code)}</span>
        </td>

        <!-- 3. Nama Pelanggan & Kontak (2 baris dalam 1 sel) -->
        <td>
          <div class="cust-cell-primary">${escapeHtml(o.customer_name)}</div>
          <div class="cust-cell-secondary">
            ${waLink ? `
              <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="table-wa-link" title="Chat WhatsApp Pelanggan">
                ${icon('whatsapp', { size: 12, strokeWidth: 2 })} <span>${escapeHtml(o.customer_phone)}</span>
              </a>
            ` : `<span>${escapeHtml(o.customer_phone || '-')}</span>`}
          </div>
        </td>

        <!-- 4. Layanan / Ruangan / Unit -->
        <td>
          <span style="font-size: 0.82rem; color: var(--text-primary); font-weight: 500;">${escapeHtml(o.service_or_item)}</span>
        </td>

        <!-- 5. Jadwal (Tanggal & Waktu) Tabular-Nums -->
        <td>
          <div class="tabular-nums" style="font-weight: 500; font-size: 0.82rem; color: var(--text-primary); display: flex; align-items: center; gap: 4px;">
            ${icon('calendar', { size: 13, strokeWidth: 1.5 })}
            <span>${formatTanggal(o.order_date)}</span>
          </div>
          <div class="tabular-nums" style="font-size: 0.72rem; color: var(--text-muted); margin-top: 1px; padding-left: 17px;">pk ${formatJam(o.order_time)} WIB</div>
        </td>

        <!-- 6. Status Badge (Subtle Semantic Pill dengan dot 6px) -->
        <td>
          ${StatusBadge(o.status)}
        </td>

        <!-- 7. Total / Pembayaran Tabular-Nums (Rata Kanan) -->
        <td style="text-align: right;">
          <div class="tabular-nums" style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${formatRupiah(netIncome)}</div>
          <div style="font-size: 0.72rem; color: ${o.payment_status === 'Lunas' ? '#047857' : '#B45309'}; font-weight: 600; margin-top: 1px;">${o.payment_status || 'Belum Dibayar'}</div>
        </td>

        <!-- 8. Tombol Aksi Cepat (...) -->
        <td style="text-align: center;">
          <button type="button" class="btn-action-dots" title="Tindakan Cepat" onclick="window.adminOpenActionMenu('${o.id}', event)">
            ${icon('dots', { size: 15 })}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function initOrdersEvents() {
  // 1. Baca URL Query Parameters
  const initialParams = new URLSearchParams(window.location.search);
  if (initialParams.has('q')) currentSearchQuery = initialParams.get('q');
  if (initialParams.has('status')) currentStatusFilter = initialParams.get('status');
  if (initialParams.has('date')) currentDateFilter = initialParams.get('date');
  if (initialParams.has('page')) orderCurrentPage = parseInt(initialParams.get('page'), 10) || 1;

  // 2. Keyboard Shortcut '/' untuk Memfokuskan Pencarian
  const onKeydown = (e) => {
    if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      e.preventDefault();
      const searchInp = document.getElementById('order-search-input');
      searchInp?.focus();
      searchInp?.select();
    }
  };
  window.removeEventListener('keydown', window._orderKeydownHandler);
  window._orderKeydownHandler = onKeydown;
  window.addEventListener('keydown', onKeydown);

  // 3. Pencarian Cepat dengan Debounce 300ms
  const searchInp = document.getElementById('order-search-input');
  searchInp?.addEventListener('input', (e) => {
    clearTimeout(orderSearchDebounceTimer);
    orderSearchDebounceTimer = setTimeout(() => {
      currentSearchQuery = e.target.value.trim();
      orderCurrentPage = 1;
      syncOrdersUrlParams();
      refreshOrdersView();
    }, 300);
  });

  // 4. Segmented Control Filter Status
  document.querySelectorAll('#status-segmented-control .segmented-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentStatusFilter = btn.getAttribute('data-status') || 'ALL';
      orderCurrentPage = 1;
      syncOrdersUrlParams();
      refreshOrdersView();
    });
  });

  // 5. Preset Rentang Tanggal
  const dateFilter = document.getElementById('order-date-range-filter');
  dateFilter?.addEventListener('change', (e) => {
    currentDateFilter = e.target.value;
    orderCurrentPage = 1;
    syncOrdersUrlParams();
    refreshOrdersView();
  });

  // 6. Reset Filter Buttons
  const resetHandler = () => {
    currentSearchQuery = '';
    currentStatusFilter = 'ALL';
    currentDateFilter = 'ALL';
    orderCurrentPage = 1;
    syncOrdersUrlParams();
    refreshOrdersView();
  };
  document.getElementById('btn-reset-filters')?.addEventListener('click', resetHandler);
  document.getElementById('btn-empty-reset-filter')?.addEventListener('click', resetHandler);

  // 7. Tombol Tambah Booking
  document.getElementById('btn-add-booking-primary')?.addEventListener('click', () => showAddOrderModal('manual'));
  document.getElementById('btn-empty-add-booking')?.addEventListener('click', () => showAddOrderModal('manual'));

  // 8. Sorting Header Kolom
  document.getElementById('th-sort-jadwal')?.addEventListener('click', () => {
    if (orderSortColumn === 'order_date') {
      orderSortDirection = orderSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      orderSortColumn = 'order_date';
      orderSortDirection = 'desc';
    }
    refreshOrdersView();
  });

  document.getElementById('th-sort-total')?.addEventListener('click', () => {
    if (orderSortColumn === 'total') {
      orderSortDirection = orderSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      orderSortColumn = 'total';
      orderSortDirection = 'desc';
    }
    refreshOrdersView();
  });

  // 9. Pagination Controls
  document.getElementById('order-page-size-select')?.addEventListener('change', (e) => {
    orderPageSize = parseInt(e.target.value, 10) || 25;
    orderCurrentPage = 1;
    refreshOrdersView();
  });

  document.getElementById('btn-page-prev')?.addEventListener('click', () => {
    if (orderCurrentPage > 1) {
      orderCurrentPage--;
      syncOrdersUrlParams();
      refreshOrdersView();
    }
  });

  document.getElementById('btn-page-next')?.addEventListener('click', () => {
    const { totalPages } = getFilteredAndSortedOrders();
    if (orderCurrentPage < totalPages) {
      orderCurrentPage++;
      syncOrdersUrlParams();
      refreshOrdersView();
    }
  });

  // 9b. View Toggle Mode (Kartu Responsif vs Tabel)
  document.getElementById('btn-toggle-cards')?.addEventListener('click', () => {
    orderViewMode = 'cards';
    refreshOrdersView();
  });
  document.getElementById('btn-toggle-table')?.addEventListener('click', () => {
    orderViewMode = 'table';
    refreshOrdersView();
  });

  // 10. Checkbox Selection & Mass Actions
  setupCheckboxAndMassActionEvents();
}

function setupCheckboxAndMassActionEvents() {
  const masterCheck = document.getElementById('check-all-orders');
  const { paginatedOrders } = getFilteredAndSortedOrders();

  if (masterCheck) {
    const allOnPageSelected = paginatedOrders.length > 0 && paginatedOrders.every(o => selectedBookingIds.has(o.id));
    masterCheck.checked = allOnPageSelected;
  }

  masterCheck?.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    paginatedOrders.forEach(o => {
      if (isChecked) selectedBookingIds.add(o.id);
      else selectedBookingIds.delete(o.id);
    });
    refreshOrdersView();
  });

  document.querySelectorAll('.row-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = cb.getAttribute('data-id');
      if (e.target.checked) selectedBookingIds.add(id);
      else selectedBookingIds.delete(id);
      refreshOrdersView();
    });
  });

  // Tombol Aksi Massal
  document.getElementById('btn-bulk-confirm')?.addEventListener('click', async () => {
    if (selectedBookingIds.size === 0) return;
    const count = selectedBookingIds.size;
    await Promise.allSettled(Array.from(selectedBookingIds).map(id => window.adminChangeOrderStatus(id, 'Dikonfirmasi', false)));
    selectedBookingIds.clear();
    window.showToast?.(`${count} booking berhasil dikonfirmasi!`, 'success');
    renderActiveModule();
  });

  document.getElementById('btn-bulk-cancel')?.addEventListener('click', async () => {
    if (selectedBookingIds.size === 0) return;
    if (!confirm(`Batalkan ${selectedBookingIds.size} booking terpilih?`)) return;
    const count = selectedBookingIds.size;
    await Promise.allSettled(Array.from(selectedBookingIds).map(id => window.adminChangeOrderStatus(id, 'Dibatalkan', false)));
    selectedBookingIds.clear();
    window.showToast?.(`${count} booking berhasil dibatalkan!`, 'info');
    renderActiveModule();
  });

  document.getElementById('btn-bulk-export')?.addEventListener('click', () => {
    const selectedList = ordersData.filter(o => selectedBookingIds.has(o.id));
    exportBookingsToCSV(selectedList, `booking-terpilih-${new Date().toISOString().split('T')[0]}.csv`);
  });
}

function refreshOrdersView() {
  const container = document.getElementById('dasbor-viewport');
  if (container && activeModule === 'orders') {
    container.innerHTML = renderOrdersView();
    initOrdersEvents();
  }
}

/**
 * Menu Tindakan Cepat (...) — Sesuai Butir 7 & 10.D di Markdown.MD
 */
window.adminOpenActionMenu = function(orderId, event) {
  event?.stopPropagation?.();
  const order = ordersData.find(o => o.id === orderId);
  if (!order) return;

  const slot = document.getElementById('dasbor-modals-slot');
  if (!slot) return;

  const userCanDelete = canDeleteBooking(); // Admin Only (Section 10.D)

  slot.innerHTML = `
    <div class="modal-overlay" id="action-menu-overlay">
      <div class="modal-dialog" style="max-width: 420px;">
        <div class="modal-header">
          <div>
            <span class="booking-id-mono" style="font-size: 0.85rem;">${order.order_code}</span>
            <div style="font-weight: 600; font-size: 1rem; color: var(--text-primary); margin-top: 2px;">${escapeHtml(order.customer_name)}</div>
          </div>
          <button class="btn-close-modal" id="btn-close-action-menu">&times;</button>
        </div>

        <div class="modal-body" style="padding: 1.15rem 1.25rem;">
          
          <!-- Perbarui Status -->
          <div style="margin-bottom: 1.15rem;">
            <label class="form-label" style="font-size: 0.72rem; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.5rem; display: block;">Perbarui Status Booking:</label>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
              <button type="button" class="btn btn-secondary" style="font-size: 0.78rem; justify-content: flex-start; gap: 6px;" onclick="window.adminChangeOrderStatus('${order.id}', 'Menunggu'); document.getElementById('action-menu-overlay')?.remove();">
                <span class="badge-dot" style="background: #F59E0B;"></span> Menunggu
              </button>
              <button type="button" class="btn btn-secondary" style="font-size: 0.78rem; justify-content: flex-start; gap: 6px;" onclick="window.adminChangeOrderStatus('${order.id}', 'Dikonfirmasi'); document.getElementById('action-menu-overlay')?.remove();">
                <span class="badge-dot" style="background: #10B981;"></span> Dikonfirmasi
              </button>
              <button type="button" class="btn btn-secondary" style="font-size: 0.78rem; justify-content: flex-start; gap: 6px;" onclick="window.adminChangeOrderStatus('${order.id}', 'Selesai'); document.getElementById('action-menu-overlay')?.remove();">
                <span class="badge-dot" style="background: #71717A;"></span> Selesai
              </button>
              <button type="button" class="btn btn-secondary" style="font-size: 0.78rem; justify-content: flex-start; gap: 6px;" onclick="window.adminChangeOrderStatus('${order.id}', 'Dibatalkan'); document.getElementById('action-menu-overlay')?.remove();">
                <span class="badge-dot" style="background: #EF4444;"></span> Dibatalkan
              </button>
            </div>
          </div>

          <!-- Tindakan Cepat Sesuai Spesifikasi: Lihat detail, Ubah, Konfirmasi, Batalkan, Salin ID, Hapus -->
          <div style="display: flex; flex-direction: column; gap: 0.45rem; border-top: 1px solid var(--border-subtle); padding-top: 0.85rem;">
            <button type="button" class="btn btn-secondary" style="width: 100%; justify-content: flex-start; gap: 8px;" onclick="document.getElementById('action-menu-overlay')?.remove(); window.adminViewBookingDetail('${order.id}');">
              ${icon('orders', { size: 15 })} <span>Lihat Detail Booking</span>
            </button>

            <button type="button" class="btn btn-secondary" style="width: 100%; justify-content: flex-start; gap: 8px;" onclick="document.getElementById('action-menu-overlay')?.remove(); window.adminOpenEditOrder('${order.id}');">
              ${icon('edit', { size: 15 })} <span>Ubah / Edit Booking</span>
            </button>

            <button type="button" class="btn btn-secondary" style="width: 100%; justify-content: flex-start; gap: 8px;" onclick="document.getElementById('action-menu-overlay')?.remove(); window.adminCopyBookingId('${order.order_code}');">
              ${icon('copy', { size: 15 })} <span>Salin ID Booking</span>
            </button>

            <button type="button" class="btn btn-secondary" style="width: 100%; justify-content: flex-start; gap: 8px;" onclick="document.getElementById('action-menu-overlay')?.remove(); window.adminOpenOrderCosts('${order.id}');">
              ${icon('profit', { size: 15 })} <span>Alokasi Modal Langsung &amp; HPP</span>
            </button>

            <!-- Hapus Berwarna Merah dan Wajib Dialog Konfirmasi (Hanya Tampil untuk Admin Sesuai Section 10.D) -->
            ${userCanDelete ? `
              <button type="button" class="btn btn-secondary" style="width: 100%; justify-content: flex-start; gap: 8px; color: #DC2626; border-color: #FECACA;" onclick="document.getElementById('action-menu-overlay')?.remove(); window.adminDeleteOrder('${order.id}');">
                ${icon('trash', { size: 15 })} <span>Hapus Booking (Admin)</span>
              </button>
            ` : ''}
          </div>

        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-action-menu')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('action-menu-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'action-menu-overlay') slot.innerHTML = '';
  });
};

/**
 * Salin ID Booking ke Clipboard
 */
window.adminCopyBookingId = async function(orderCode) {
  try {
    await navigator.clipboard.writeText(orderCode);
    window.showToast?.(`ID Booking disalin: ${orderCode}`, 'success');
  } catch {
    window.showToast?.(`ID Booking: ${orderCode}`, 'info');
  }
};

/**
 * Dialog Modal: Lihat Detail Booking
 */
window.adminViewBookingDetail = function(orderId) {
  const slot = document.getElementById('dasbor-modals-slot');
  if (!slot) return;
  const order = ordersData.find(o => o.id === orderId);
  if (!order) return;

  const netIncome = calculateOrderNetIncome(order);
  const cleanPhone = (order.customer_phone || '').replace(/[^0-9]/g, '');
  const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(order.customer_name)},%20konfirmasi%20booking%20${order.order_code}:` : null;

  slot.innerHTML = `
    <div class="modal-overlay" id="booking-detail-overlay">
      <div class="modal-dialog" style="max-width: 540px;">
        <div class="modal-header">
          <div>
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Rincian Reservasi</div>
            <h3 class="modal-title" style="font-size: 1.15rem; font-weight: 600; margin-top: 2px;">
              ${escapeHtml(order.customer_name)}
            </h3>
          </div>
          <button class="btn-close-modal" id="btn-close-booking-detail">&times;</button>
        </div>

        <div class="modal-body" style="padding: 1.25rem;">
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.25rem;">
            <div style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase;">ID Booking</span>
              <div style="margin-top: 3px;"><span class="booking-id-tag">${order.order_code}</span></div>
            </div>

            <div style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase;">Status Saat Ini</span>
              <div style="margin-top: 4px;">${StatusBadge(order.status)}</div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.85rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 1rem; background: var(--bg-surface);">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-secondary);">Paket / Layanan:</span>
              <strong style="color: var(--text-primary); text-align: right;">${escapeHtml(order.service_or_item)}</strong>
            </div>

            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-secondary);">Jadwal Pelaksanaan:</span>
              <span class="tabular-nums" style="font-weight: 600;">${formatTanggal(order.order_date)} pk ${formatJam(order.order_time)} WIB</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-secondary);">Nomor Kontak:</span>
              <span>
                ${waLink ? `
                  <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="table-wa-link" title="Chat WhatsApp">
                    ${icon('whatsapp', { size: 13, strokeWidth: 2 })} <span>${escapeHtml(order.customer_phone)}</span>
                  </a>
                ` : escapeHtml(order.customer_phone || '-')}
              </span>
            </div>

            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-secondary);">Email:</span>
              <span>${escapeHtml(order.customer_email || '-')}</span>
            </div>

            <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-subtle); padding-top: 0.5rem;">
              <span style="color: var(--text-secondary);">Total Nominal:</span>
              <strong class="tabular-nums" style="font-size: 1rem; color: var(--text-primary);">${formatRupiah(netIncome)}</strong>
            </div>

            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-secondary);">Status Bayar:</span>
              <span style="font-weight: 600; color: ${order.payment_status === 'Lunas' ? '#047857' : '#B45309'};">${order.payment_status || 'Belum Dibayar'}</span>
            </div>

            ${order.notes ? `
              <div style="border-top: 1px solid var(--border-subtle); padding-top: 0.5rem;">
                <span style="color: var(--text-secondary); display: block; font-size: 0.75rem; text-transform: uppercase;">Catatan Tambahan:</span>
                <p style="margin: 3px 0 0; color: var(--text-primary); font-size: 0.8rem;">${escapeHtml(order.notes)}</p>
              </div>
            ` : ''}
          </div>

          <div style="margin-top: 1.25rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('booking-detail-overlay')?.remove();">
              Tutup
            </button>
            <button type="button" class="btn btn-primary-action" onclick="document.getElementById('booking-detail-overlay')?.remove(); window.adminOpenEditOrder('${order.id}');">
              Ubah Data
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-booking-detail')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('booking-detail-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'booking-detail-overlay') slot.innerHTML = '';
  });
};

window.adminChangeOrderStatus = async function(orderId, newStatus, showToastMessage = true) {
  try {
    const target = ordersData.find(o => o.id === orderId);
    if (target) {
      target.status = newStatus;
      if (newStatus === 'Selesai') target.payment_status = 'Lunas';
      if (newStatus === 'Dibatalkan') target.payment_status = 'Refund';
    }

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

    await logAuditEvent({
      action: 'UPDATE_STATUS',
      entity_type: 'orders',
      entity_id: orderId,
      details: `Status ${target?.order_code || orderId} diubah menjadi: ${newStatus}`
    });

    if (showToastMessage) {
      window.showToast?.(`Status ${target?.order_code || 'booking'} diubah ke "${newStatus}"!`, 'success');
      renderActiveModule();
    }
  } catch (err) {
    if (showToastMessage) window.showToast?.(`Gagal update status: ${err.message}`, 'error');
  }
};

window.adminDeleteOrder = async function(orderId) {
  // Pengecekan RBAC Server / Client (Section 10.D)
  if (!canDeleteBooking()) {
    window.showToast?.('Akses ditolak: Hanya peran Admin yang diizinkan menghapus data booking.', 'error');
    return;
  }

  const target = ordersData.find(o => o.id === orderId);
  const code = target?.order_code || orderId;
  
  // Wajib Dialog Konfirmasi
  if (!confirm(`Apakah Anda yakin ingin menghapus booking ${code} secara permanen dari database? Tindakan ini tidak dapat dibatalkan.`)) return;

  try {
    await Promise.allSettled([
      supabase.from('bookings').delete().eq('id', orderId),
      supabase.from('orders').delete().eq('id', orderId)
    ]);

    ordersData = ordersData.filter(o => o.id !== orderId);
    selectedBookingIds.delete(orderId);

    await logAuditEvent({
      action: 'DELETE_BOOKING',
      entity_type: 'orders',
      entity_id: orderId,
      details: `Booking ${code} dihapus secara permanen`
    });

    window.showToast?.(`Booking ${code} berhasil dihapus!`, 'success');
    renderActiveModule();
  } catch (err) {
    window.showToast?.(`Gagal menghapus booking: ${err.message}`, 'error');
  }
};

window.adminOpenEditOrder = function(orderId) {
  const slot = document.getElementById('dasbor-modals-slot');
  if (!slot) return;

  const order = ordersData.find(o => o.id === orderId);
  if (!order) {
    window.showToast?.('Pesanan tidak ditemukan!', 'error');
    return;
  }

  slot.innerHTML = `
    <div class="modal-overlay" id="edit-order-overlay">
      <div class="modal-dialog" style="max-width: 600px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${icon('edit', { size: 18 })}
            <h3 class="card-title" style="margin: 0;">Edit Pesanan &mdash; <span class="booking-id-tag">${order.order_code}</span></h3>
          </div>
          <button class="btn-close-modal" id="btn-close-edit-order">&times;</button>
        </div>

        <div class="modal-body">
          <form id="form-edit-order">
            <div class="form-grid-2" style="margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label">Kode Pesanan:</label>
                <input type="text" class="form-input" value="${order.order_code}" readonly />
              </div>
              <div class="form-group">
                <label class="form-label">Tanggal Pelaksanaan:</label>
                <input type="date" id="edit-order-date" class="form-input" value="${order.order_date}" required />
              </div>
            </div>

            <div class="form-grid-2" style="margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label">Nama Pelanggan:</label>
                <input type="text" id="edit-order-cust-name" class="form-input" value="${escapeHtml(order.customer_name)}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Nomor WhatsApp:</label>
                <input type="tel" id="edit-order-cust-phone" class="form-input" value="${escapeHtml(order.customer_phone || '')}" required />
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label">Paket Layanan / Barang:</label>
              <input type="text" id="edit-order-item" class="form-input" value="${escapeHtml(order.service_or_item)}" required />
            </div>

            <div class="form-grid-2" style="margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label">Nilai Pesanan (Rp):</label>
                <input type="number" id="edit-order-amount" class="form-input" value="${order.subtotal_amount}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Diskon (Rp):</label>
                <input type="number" id="edit-order-discount" class="form-input" value="${order.discount_amount || 0}" />
              </div>
            </div>

            <div class="form-grid-2" style="margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label">Status Operasional:</label>
                <select id="edit-order-status" class="form-select">
                  <option value="Baru" ${order.status === 'Baru' ? 'selected' : ''}>Baru</option>
                  <option value="Dikonfirmasi" ${order.status === 'Dikonfirmasi' ? 'selected' : ''}>Dikonfirmasi</option>
                  <option value="Diproses" ${order.status === 'Diproses' ? 'selected' : ''}>Diproses</option>
                  <option value="Selesai" ${order.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                  <option value="Dibatalkan" ${order.status === 'Dibatalkan' ? 'selected' : ''}>Dibatalkan</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Status Pembayaran:</label>
                <select id="edit-order-pay-status" class="form-select">
                  <option value="Belum Dibayar" ${order.payment_status === 'Belum Dibayar' ? 'selected' : ''}>Belum Dibayar</option>
                  <option value="DP" ${order.payment_status === 'DP' ? 'selected' : ''}>DP</option>
                  <option value="Lunas" ${order.payment_status === 'Lunas' ? 'selected' : ''}>Lunas</option>
                  <option value="Refund" ${order.payment_status === 'Refund' ? 'selected' : ''}>Refund</option>
                </select>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label class="form-label">Catatan Tambahan:</label>
              <textarea id="edit-order-notes" class="form-textarea" rows="2">${escapeHtml(order.notes || '')}</textarea>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
              ${icon('check', { size: 15 })} <span>Simpan Perubahan Pesanan</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-edit-order')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('edit-order-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'edit-order-overlay') slot.innerHTML = '';
  });

  document.getElementById('form-edit-order')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('edit-order-date')?.value;
    const name = document.getElementById('edit-order-cust-name')?.value.trim();
    const phone = document.getElementById('edit-order-cust-phone')?.value.trim();
    const item = document.getElementById('edit-order-item')?.value.trim();
    const amount = Number(document.getElementById('edit-order-amount')?.value || 0);
    const discount = Number(document.getElementById('edit-order-discount')?.value || 0);
    const status = document.getElementById('edit-order-status')?.value;
    const payStatus = document.getElementById('edit-order-pay-status')?.value;
    const notes = document.getElementById('edit-order-notes')?.value.trim();

    try {
      let bkgStatus = 'pending';
      if (payStatus === 'Lunas' || status === 'Selesai') bkgStatus = 'completed';
      else if (status === 'Dikonfirmasi') bkgStatus = 'confirmed';
      else if (status === 'Dibatalkan') bkgStatus = 'cancelled';

      await Promise.allSettled([
        supabase.from('bookings').update({
          customer_name: name,
          customer_phone: phone,
          service_name: item,
          booking_date: date,
          total_price: Math.max(0, amount - discount),
          status: bkgStatus
        }).eq('id', orderId),
        supabase.from('orders').update({
          customer_name: name,
          customer_phone: phone,
          service_or_item: item,
          order_date: date,
          subtotal_amount: amount,
          discount_amount: discount,
          status,
          payment_status: payStatus,
          notes
        }).eq('id', orderId)
      ]);

      await supabase.from('audit_logs').insert([{
        actor_name: 'Admin',
        action: 'UPDATE_ORDER',
        entity_type: 'orders',
        entity_id: orderId,
        details: `Pesanan ${order.order_code} berhasil diperbarui`
      }]).catch(() => {});

      window.showToast?.(`Pesanan ${order.order_code} berhasil diperbarui!`, 'success');
      slot.innerHTML = '';
      await loadAllData();
      renderActiveModule();
    } catch (err) {
      window.showToast?.(`Gagal memperbarui: ${err.message}`, 'error');
    }
  });
};


/* ==============================================================================
   3. MODUL: HITUNG UNTUNG OTOMATIS & MODAL/BIAYA (FASE 2)
   ============================================================================== */
function renderProfitView() {
  const overallSummary = calculatePeriodSummary(ordersData, costsData, transactionsData.filter(t => t.type === 'expense' && t.source_type === 'operational'));
  
  const rev = overallSummary.totalRevenue || 0;
  const cost = overallSummary.totalOrderCosts || 0;
  const op = overallSummary.totalOperational || 0;
  const gross = overallSummary.grossProfit || 0;
  const net = overallSummary.netProfit || 0;

  const costRatio = rev > 0 ? ((cost / rev) * 100).toFixed(1) : '0';
  const opRatio = rev > 0 ? ((op / rev) * 100).toFixed(1) : '0';
  const grossMargin = rev > 0 ? Math.round((gross / rev) * 100) : 0;
  const netMargin = rev > 0 ? ((net / rev) * 100).toFixed(1) : '0';

  return `
    <div class="view-container">
      
      <!-- 1. Empat Kartu Metrik Finansial Eksekutif (Berdiameter Jelas & Bernapas) -->
      <div class="profit-cards-grid">
        
        <!-- Kartu 1: Omzet Penjualan -->
        <div class="profit-stat-card">
          <div class="profit-stat-header">
            <span class="profit-stat-title">Total Pendapatan (Omzet)</span>
            <div class="brand-badge-icon brand-badge-sm" style="background: #EFF6FF; color: #2563EB;">
              ${icon('orders', { size: 16 })}
            </div>
          </div>
          <div class="profit-stat-value" style="color: var(--text-primary);">
            ${formatRupiah(rev)}
          </div>
          <div class="profit-stat-footer">
            <span>Basis 100% Penjualan</span>
            <span class="badge-subtle badge-completed">Bruto</span>
          </div>
        </div>

        <!-- Kartu 2: Modal Langsung (HPP) -->
        <div class="profit-stat-card" style="background: #FEF2F2; border-color: #FECACA;">
          <div class="profit-stat-header">
            <span class="profit-stat-title" style="color: #991B1B;">Total Modal (HPP &amp; Biaya)</span>
            <div class="brand-badge-icon brand-badge-sm" style="background: #FEE2E2; color: #DC2626;">
              ${icon('profit', { size: 16 })}
            </div>
          </div>
          <div class="profit-stat-value" style="color: #DC2626;">
            ${formatRupiah(cost)}
          </div>
          <div class="profit-stat-footer" style="border-top-color: #FECACA; color: #B91C1C;">
            <span>Biaya Langsung Layanan</span>
            <span class="badge-subtle badge-cancelled" style="font-weight: 700;">${costRatio}% Omzet</span>
          </div>
        </div>

        <!-- Kartu 3: Laba Kotor Usaha -->
        <div class="profit-stat-card">
          <div class="profit-stat-header">
            <span class="profit-stat-title">Laba Kotor Usaha</span>
            <div class="brand-badge-icon brand-badge-sm" style="background: #ECFDF5; color: #059669;">
              ${icon('database', { size: 16 })}
            </div>
          </div>
          <div class="profit-stat-value" style="color: #059669;">
            ${formatRupiah(gross)}
          </div>
          <div class="profit-stat-footer">
            <span>Omzet &minus; Modal Langsung</span>
            <span class="badge-subtle badge-confirmed" style="font-weight: 700;">Margin ${grossMargin}%</span>
          </div>
        </div>

        <!-- Kartu 4: Laba Bersih Akhir (Bintang Utama Dasbor) -->
        <div class="profit-stat-card card-highlight-net">
          <div class="profit-stat-header">
            <span class="profit-stat-title" style="color: #065F46; font-weight: 700;">Laba Bersih Riil (Net Profit)</span>
            <div class="brand-badge-icon brand-badge-sm" style="background: #DCFCE7; color: #059669;">
              ${icon('sparkles', { size: 16 })}
            </div>
          </div>
          <div class="profit-stat-value" style="color: #047857; font-size: 1.65rem;">
            ${formatRupiah(net)}
          </div>
          <div class="profit-stat-footer" style="border-top-color: #BBF7D0; color: #065F46;">
            <span>Uang Bersih Siap Tarik</span>
            <span class="badge-subtle badge-confirmed" style="font-weight: 700; background: #DCFCE7; color: #065F46;">${netMargin}% Riil</span>
          </div>
        </div>

      </div>

      <!-- 2. Visualisasi Alur Formula Keuangan & Bar Alokasi Persentase -->
      <div class="profit-overview-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
              ${icon('charts', { size: 16 })}
              <span>Struktur Alur Perhitungan Laba &amp; Alokasi Modal</span>
            </h4>
            <p style="margin: 3px 0 0; font-size: 0.78rem; color: var(--text-muted);">
              Penjelasan visual perbedaan antara uang masuk (omzet), modal langsung yang dikeluarkan, dan laba bersih yang tersisa.
            </p>
          </div>
          <span class="badge-subtle badge-completed" style="font-size: 0.75rem;">
            Formula Terintegrasi
          </span>
        </div>

        <!-- Visual Flow Strip (Persamaan Finansial Konkret) -->
        <div class="financial-flow-container">
          
          <div class="financial-flow-box flow-revenue">
            <span class="flow-box-tag">1. Pendapatan (Omzet)</span>
            <div class="flow-box-amount" style="color: #2563EB;">${formatRupiah(rev)}</div>
            <span class="flow-box-sub">Uang Masuk dari Pelanggan</span>
          </div>

          <div class="financial-flow-operator" title="Dikurangi Modal">&minus;</div>

          <div class="financial-flow-box flow-cost">
            <span class="flow-box-tag" style="color: #991B1B;">2. Modal Langsung (HPP)</span>
            <div class="flow-box-amount" style="color: #DC2626;">${formatRupiah(cost)}</div>
            <span class="flow-box-sub">Biaya Logistik &amp; Paket (${costRatio}%)</span>
          </div>

          <div class="financial-flow-operator" title="Dikurangi Operasional">&minus;</div>

          <div class="financial-flow-box flow-operational">
            <span class="flow-box-tag" style="color: #92400E;">3. Biaya Operasional</span>
            <div class="flow-box-amount" style="color: #D97706;">${formatRupiah(op)}</div>
            <span class="flow-box-sub">Beban Kantor &amp; Kasir (${opRatio}%)</span>
          </div>

          <div class="financial-flow-operator" style="background: #DCFCE7; border-color: #86EFAC; color: #059669;" title="Hasil Laba Bersih">&equals;</div>

          <div class="financial-flow-box flow-net" style="box-shadow: 0 1px 3px rgba(5, 150, 105, 0.1);">
            <span class="flow-box-tag" style="color: #065F46;">4. Laba Bersih Riil</span>
            <div class="flow-box-amount" style="color: #047857;">${formatRupiah(net)}</div>
            <span class="flow-box-sub" style="color: #065F46; font-weight: 600;">Keuntungan Riil (${netMargin}%)</span>
          </div>

        </div>

        <!-- Progress Bar Alokasi Persentase Multi-Segmen -->
        <div class="financial-allocation-wrap">
          <div class="financial-allocation-header">
            <span><strong>Proporsi Distribusi Dana Usaha:</strong></span>
            <span>Basis: ${formatRupiah(rev)}</span>
          </div>

          <div class="financial-meter-track" title="Alokasi Dana: Laba Bersih (${netMargin}%), Modal HPP (${costRatio}%), Operasional (${opRatio}%)">
            <div class="meter-segment" style="width: ${Math.max(0, netMargin)}%; background: #10B981;" title="Laba Bersih: ${netMargin}%"></div>
            <div class="meter-segment" style="width: ${costRatio}%; background: #EF4444;" title="Modal HPP: ${costRatio}%"></div>
            <div class="meter-segment" style="width: ${opRatio}%; background: #F59E0B;" title="Operasional: ${opRatio}%"></div>
          </div>

          <div class="financial-meter-legend">
            <div class="legend-item">
              <span class="legend-dot" style="background: #10B981;"></span>
              <span><strong>Laba Bersih Usaha:</strong> ${formatRupiah(net)} (${netMargin}%)</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot" style="background: #EF4444;"></span>
              <span><strong>Modal Pokok (HPP):</strong> ${formatRupiah(cost)} (${costRatio}%)</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot" style="background: #F59E0B;"></span>
              <span><strong>Beban Operasional:</strong> ${formatRupiah(op)} (${opRatio}%)</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Detail Untung per Pesanan Table -->
      <div class="card" style="margin-top: 1.5rem;">
        <div class="card-header">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <div class="brand-badge-icon brand-badge-sm" style="background: #F8FAFC; color: #475569; border: 1px solid var(--border-subtle); box-shadow: none;">
              ${icon('profit', { size: 16 })}
            </div>
            <div>
              <h3 class="card-title" style="margin: 0; font-size: 0.95rem; font-weight: 700;">Rincian Untung per Pesanan</h3>
              <p class="card-desc" style="margin: 2px 0 0;">Kalkulasi keuntungan per transaksi berdasarkan formula resmi: Pendapatan &minus; Diskon &minus; Modal/HPP = Laba Kotor.</p>
            </div>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 140px;">KODE PESANAN</th>
                <th>PEMESAN</th>
                <th>LAYANAN</th>
                <th style="text-align: right;">PENDAPATAN BERSIH</th>
                <th style="text-align: right;">MODAL / HPP</th>
                <th style="text-align: right;">LABA KOTOR</th>
                <th style="text-align: center; width: 100px;">MARGIN</th>
                <th style="text-align: right; width: 140px;">KELOLA BIAYA</th>
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
                      <span class="booking-id-tag">${escapeHtml(o.order_code)}</span>
                    </td>
                    <td>
                      <div class="cust-cell-primary">${escapeHtml(o.customer_name)}</div>
                    </td>
                    <td>
                      <span style="font-size: 0.82rem; color: var(--text-primary); font-weight: 500;">${escapeHtml(o.service_or_item)}</span>
                    </td>
                    <td style="text-align: right; font-weight: 700; color: var(--text-primary);" class="tabular-nums">
                      ${formatRupiah(netIncome)}
                    </td>
                    <td style="text-align: right; color: #DC2626; font-weight: 600;" class="tabular-nums">
                      ${formatRupiah(totalCost)}
                    </td>
                    <td style="text-align: right;" class="tabular-nums">
                      <strong style="color: ${grossProfit >= 0 ? '#059669' : '#DC2626'}; font-size: 0.9rem;">
                        ${formatRupiah(grossProfit)}
                      </strong>
                    </td>
                    <td style="text-align: center;">
                      <span class="badge-subtle ${margin >= 40 ? 'badge-confirmed' : 'badge-pending'}">
                        <span class="badge-dot" style="background: ${margin >= 40 ? '#10B981' : '#F59E0B'};"></span>
                        ${margin}%
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <button class="btn btn-secondary" style="font-size: 0.78rem; gap: 5px; height: 30px;" onclick="window.adminOpenOrderCosts('${o.id}')">
                        ${icon('edit', { size: 12 })}
                        <span>Biaya (${orderCosts.length})</span>
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
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin: 0;">Direktori Data Pelanggan</h3>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin: 3px 0 0;">Daftar pelanggan terdaftar, nomor kontak WhatsApp, dan riwayat seluruh transaksinya.</p>
        </div>

        <button id="btn-add-customer-modal" class="btn btn-primary" style="gap: 6px;">
          ${icon('plus', { size: 14 })}
          <span>Tambah Pelanggan Baru</span>
        </button>
      </div>

      <div class="table-card-wrapper">
        <div class="table-toolbar" style="padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-subtle); background: var(--bg-surface);">
          <div class="search-box" style="max-width: 380px;">
            <span class="search-icon">${icon('search', { size: 14 })}</span>
            <input type="text" id="cust-search-input" class="search-input" placeholder="Cari nama, nomor WhatsApp, email pelanggan..." />
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 220px;">NAMA PELANGGAN</th>
                <th>KONTAK WHATSAPP &amp; EMAIL</th>
                <th>ALAMAT</th>
                <th style="text-align: center; width: 130px;">TOTAL PESANAN</th>
                <th style="text-align: right; width: 160px;">TOTAL BELANJA</th>
                <th style="text-align: right; width: 170px;">AKSI</th>
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
          <div class="cust-cell-primary">${escapeHtml(c.name)}</div>
          <div class="cust-cell-secondary">${escapeHtml(c.notes || '-')}</div>
        </td>

        <td>
          <div style="display: flex; flex-direction: column; gap: 3px;">
            ${waLink ? `
              <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="table-wa-link" title="Chat WhatsApp Pelanggan">
                ${icon('whatsapp', { size: 12, strokeWidth: 2 })} <span>${escapeHtml(c.phone || '-')}</span>
              </a>
            ` : `
              <div style="font-size: 0.82rem; color: var(--text-primary); display: flex; align-items: center; gap: 5px;">
                ${icon('phone', { size: 12 })} <span>${escapeHtml(c.phone || '-')}</span>
              </div>
            `}
            ${c.email ? `
              <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 5px;">
                ${icon('user', { size: 11 })} <span>${escapeHtml(c.email)}</span>
              </div>
            ` : ''}
          </div>
        </td>

        <td>
          <span style="font-size: 0.82rem; color: var(--text-secondary);">${escapeHtml(c.address || '-')}</span>
        </td>

        <td style="text-align: center;">
          <span class="badge-subtle badge-completed">
            <span class="badge-dot"></span>
            ${custOrders.length} Pesanan
          </span>
        </td>

        <td style="text-align: right;" class="tabular-nums">
          <strong style="color: #059669; font-weight: 700; font-size: 0.88rem;">${formatRupiah(totalSpent)}</strong>
        </td>

        <td style="text-align: right;">
          <div class="action-buttons" style="justify-content: flex-end; gap: 6px;">
            ${waLink ? `
              <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" title="Chat WhatsApp" style="font-size: 0.75rem; gap: 4px; padding: 4px 8px; height: 28px; color: #047857;">
                ${icon('whatsapp', { size: 12, strokeWidth: 2 })} <span>WA</span>
              </a>
            ` : ''}
            <button class="btn btn-secondary" title="Lihat Riwayat Pesanan" style="font-size: 0.75rem; gap: 4px; padding: 4px 8px; height: 28px;" onclick="window.adminViewCustomerOrders('${c.id}')">
              ${icon('orders', { size: 12 })} <span>Riwayat</span>
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

window.adminViewCustomerOrders = function(customerId) {
  const slot = document.getElementById('dasbor-modals-slot');
  if (!slot) return;

  const customer = customersData.find(c => c.id === customerId);
  if (!customer) {
    window.showToast?.('Data pelanggan tidak ditemukan!', 'error');
    return;
  }

  const custOrders = ordersData.filter(o => o.customer_id === customer.id || o.customer_name === customer.name);
  const totalSpent = custOrders.reduce((sum, o) => sum + calculateOrderNetIncome(o), 0);
  const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
  const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(customer.name)},%20kami%20dari%20admin%20Sacred%20Journey%20Bali:` : null;

  slot.innerHTML = `
    <div class="modal-overlay" id="customer-orders-overlay">
      <div class="modal-dialog" style="max-width: 650px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="user-avatar-circle" style="width: 38px; height: 38px; font-size: 0.85rem;">
              ${customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <h3 class="modal-title" style="margin: 0; font-size: 1.05rem; font-weight: 700;">${escapeHtml(customer.name)}</h3>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 1px;">${escapeHtml(customer.phone || '-')}</div>
            </div>
          </div>
          <button class="btn-close-modal" id="btn-close-cust-orders">&times;</button>
        </div>

        <div class="modal-body">
          <div class="form-grid-2" style="margin-bottom: 1.25rem;">
            <div style="background: var(--bg-surface-elevated); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase;">Total Transaksi</span>
              <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-top: 2px;">
                ${custOrders.length} Pesanan
              </div>
            </div>
            <div style="background: var(--bg-surface-elevated); padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase;">Total Nilai Belanja</span>
              <div style="font-size: 1.25rem; font-weight: 700; color: #059669; margin-top: 2px;">
                ${formatRupiah(totalSpent)}
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary); margin: 0;">Riwayat Pesanan Pelanggan:</h4>
            ${waLink ? `
              <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="color: #047857; font-size: 0.75rem; gap: 5px; height: 28px;">
                ${icon('whatsapp', { size: 12, strokeWidth: 2 })} <span>Chat WhatsApp</span>
              </a>
            ` : ''}
          </div>

          <div class="table-responsive" style="max-height: 280px;">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 140px;">KODE &amp; TANGGAL</th>
                  <th>LAYANAN</th>
                  <th style="text-align: right;">TOTAL</th>
                  <th style="width: 110px;">STATUS</th>
                </tr>
              </thead>
              <tbody>
                ${custOrders.length === 0 ? `
                  <tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Belum ada pesanan untuk pelanggan ini.</td></tr>
                ` : custOrders.map(o => `
                  <tr>
                    <td>
                      <span class="booking-id-tag">${o.order_code}</span>
                      <div class="tabular-nums" style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">${o.order_date}</div>
                    </td>
                    <td><span style="font-size: 0.82rem; color: var(--text-primary); font-weight: 500;">${escapeHtml(o.service_or_item)}</span></td>
                    <td style="text-align: right; font-weight: 700; color: var(--text-primary);" class="tabular-nums">${formatRupiah(calculateOrderNetIncome(o))}</td>
                    <td>
                      ${getSemanticBadge(o.status)}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-cust-orders')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('customer-orders-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'customer-orders-overlay') slot.innerHTML = '';
  });
};

/* ==============================================================================
   5. MODUL: GRAFIK KEUNTUNGAN & BANDINGKAN PERIODE (FASE 3)
   ============================================================================== */
function renderChartsView() {
  return `
    <div class="view-container">
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <div class="brand-badge-icon brand-badge-sm" style="background: #F8FAFC; color: #475569; border: 1px solid var(--border-subtle); box-shadow: none;">
              ${icon('charts', { size: 16 })}
            </div>
            <div>
              <h3 class="card-title" style="margin: 0; font-size: 0.95rem; font-weight: 700;">Tren Keuntungan Usaha per Periode</h3>
              <p class="card-desc" style="margin: 2px 0 0;">Visualisasi perbandingan pendapatan kotor, alokasi modal/biaya, dan laba bersih riil bulanan.</p>
            </div>
          </div>

          <div class="filter-group">
            <select id="chart-filter-mode" class="form-select" style="font-size: 0.8rem; height: 34px;">
              <option value="monthly">Tinjauan Bulanan (Tahun 2026)</option>
              <option value="weekly">Tinjauan Mingguan Terakhir</option>
            </select>
          </div>
        </div>

        <div style="height: 340px; position: relative; padding: 0.5rem;">
          <canvas id="chart-dasbor-profit"></canvas>
        </div>
      </div>

      <!-- Perbandingan Periode -->
      <div class="charts-two-col-grid">
        <div class="card">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <div class="brand-badge-icon brand-badge-sm" style="background: #F8FAFC; color: #475569; border: 1px solid var(--border-subtle); box-shadow: none;">
              ${icon('dashboard', { size: 15 })}
            </div>
            <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin: 0;">Bandingkan Periode Bisnis</h4>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Perbandingan performa bulan berjalan dengan bulan sebelumnya.</p>
          
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="padding: 0.85rem; background: var(--bg-surface-elevated); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.82rem; color: var(--text-secondary);">Bulan Berjalan (Oktober 2026)</span>
              <strong style="color: #059669; font-weight: 700;" class="tabular-nums">Rp 2.450.000 Laba Bersih</strong>
            </div>
            <div style="padding: 0.85rem; background: var(--bg-surface-elevated); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.82rem; color: var(--text-secondary);">Bulan Sebelumnya (September 2026)</span>
              <strong style="color: #2563EB; font-weight: 700;" class="tabular-nums">Rp 11.300.000 Laba Bersih</strong>
            </div>
          </div>
        </div>

        <div class="card">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <div class="brand-badge-icon brand-badge-sm" style="background: #F8FAFC; color: #475569; border: 1px solid var(--border-subtle); box-shadow: none;">
              ${icon('profit', { size: 15 })}
            </div>
            <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin: 0;">Komposisi Pengeluaran Terbesar</h4>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">Alokasi modal &amp; biaya langsung operasional usaha.</p>
          
          <div style="display: flex; flex-direction: column; gap: 0.65rem; font-size: 0.82rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid var(--border-subtle);">
              <span style="color: var(--text-secondary);">Modal / HPP Layanan:</span>
              <strong style="color: #DC2626; font-weight: 700;">55%</strong>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid var(--border-subtle);">
              <span style="color: var(--text-secondary);">Transportasi &amp; Bahan:</span>
              <strong style="color: #D97706; font-weight: 700;">25%</strong>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0;">
              <span style="color: var(--text-secondary);">Fee Pemandu / Terapis:</span>
              <strong style="color: #2563EB; font-weight: 700;">20%</strong>
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
          backgroundColor: 'rgba(37, 99, 235, 0.25)',
          borderColor: '#2563EB',
          borderWidth: 1.5,
          borderRadius: 4
        },
        {
          label: 'Modal & Biaya (Costs)',
          data: costData,
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          borderColor: '#DC2626',
          borderWidth: 1.5,
          borderRadius: 4
        },
        {
          label: 'Laba Bersih (Net Profit)',
          data: profitData,
          type: 'line',
          borderColor: '#059669',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#334155',
            font: { family: 'Plus Jakarta Sans', size: 12, weight: 600 },
            usePointStyle: true,
            boxWidth: 8
          }
        },
        tooltip: {
          callbacks: {
            label: (item) => ` ${item.dataset.label}: ${formatRupiah(item.raw)}`
          }
        }
      },
      scales: {
        y: {
          grid: { color: '#E2E8F0' },
          ticks: {
            color: '#64748B',
            font: { family: 'Plus Jakarta Sans', size: 11 },
            callback: (v) => 'Rp ' + (v / 1000000).toFixed(0) + ' Jt'
          }
        },
        x: {
          grid: { display: false },
          ticks: {
            color: '#64748B',
            font: { family: 'Plus Jakarta Sans', size: 11 }
          }
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
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin: 0;">Pembukuan Pemasukan &amp; Pengeluaran</h3>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin: 3px 0 0;">Catat transaksi arus kas, rekap tutup buku periode, dan ekspor laporan ke format CSV.</p>
        </div>

        <div style="display: flex; gap: 0.65rem; flex-wrap: wrap;">
          <button id="btn-export-csv" class="btn btn-secondary" title="Ekspor Data ke File CSV" style="gap: 6px;">
            ${icon('export', { size: 14 })}
            <span>Ekspor CSV</span>
          </button>

          <button id="btn-open-closing-modal" class="btn btn-secondary" title="Proses Tutup Buku Periode" style="gap: 6px;">
            ${icon('lock', { size: 14 })}
            <span>Tutup Buku Periode</span>
          </button>

          <button id="btn-add-transaction-modal" class="btn btn-primary" style="gap: 6px;">
            ${icon('plus', { size: 14 })}
            <span>Catat Transaksi Kas</span>
          </button>
        </div>
      </div>

      <!-- Transactions Table Card -->
      <div class="table-card-wrapper">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 150px;">KODE &amp; TANGGAL</th>
                <th style="width: 120px;">JENIS</th>
                <th style="width: 160px;">KATEGORI</th>
                <th>DESKRIPSI</th>
                <th style="width: 150px;">METODE BAYAR</th>
                <th style="text-align: right; width: 140px;">NOMINAL</th>
              </tr>
            </thead>
            <tbody>
              ${transactionsData.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">Belum ada transaksi pembukuan.</td></tr>
              ` : transactionsData.map(t => `
                <tr>
                  <td>
                    <span class="booking-id-tag">${t.transaction_code}</span>
                    <div class="tabular-nums" style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">${t.transaction_date}</div>
                  </td>
                  <td>
                    <span class="badge-subtle ${t.type === 'income' ? 'badge-confirmed' : 'badge-cancelled'}">
                      <span class="badge-dot" style="background: ${t.type === 'income' ? '#10B981' : '#EF4444'};"></span>
                      ${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                    </span>
                  </td>
                  <td><span style="font-size: 0.82rem; color: var(--text-primary); font-weight: 500;">${escapeHtml(t.category)}</span></td>
                  <td><span style="font-size: 0.82rem; color: var(--text-secondary);">${escapeHtml(t.description)}</span></td>
                  <td><span style="font-size: 0.8rem; color: var(--text-muted);">${t.payment_method || '-'}</span></td>
                  <td style="text-align: right;" class="tabular-nums">
                    <strong style="color: ${t.type === 'income' ? '#059669' : '#DC2626'}; font-size: 0.9rem;">
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
        <div class="card-header">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div class="brand-badge-icon brand-badge-sm" style="background: #F8FAFC; color: #475569; border: 1px solid var(--border-subtle); box-shadow: none;">
              ${icon('lock', { size: 15 })}
            </div>
            <div>
              <h4 class="card-title" style="margin: 0; font-size: 0.95rem; font-weight: 700;">Riwayat Tutup Buku (Closing Periods)</h4>
              <p class="card-desc" style="margin: 2px 0 0;">Laporan penutupan buku resmi per siklus pembukuan usaha.</p>
            </div>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>PERIODE</th>
                <th style="text-align: right;">TOTAL PENDAPATAN</th>
                <th style="text-align: right;">TOTAL BIAYA</th>
                <th style="text-align: right;">LABA BERSIH</th>
                <th style="text-align: center; width: 110px;">STATUS</th>
                <th>DITUTUP OLEH</th>
              </tr>
            </thead>
            <tbody>
              ${closingData.map(c => `
                <tr>
                  <td><strong>${c.period_start} s/d ${c.period_end}</strong></td>
                  <td style="text-align: right;" class="tabular-nums">${formatRupiah(c.total_revenue)}</td>
                  <td style="text-align: right; color: #DC2626;" class="tabular-nums">${formatRupiah(c.total_cost)}</td>
                  <td style="text-align: right; color: #059669; font-weight: 700;" class="tabular-nums">${formatRupiah(c.net_profit)}</td>
                  <td style="text-align: center;">
                    <span class="badge-subtle badge-completed">
                      <span class="badge-dot"></span>
                      ${c.status}
                    </span>
                  </td>
                  <td><span style="font-size: 0.82rem; color: var(--text-secondary);">${escapeHtml(c.closed_by)}</span></td>
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
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <div class="brand-badge-icon brand-badge-sm" style="background: #F8FAFC; color: #475569; border: 1px solid var(--border-subtle); box-shadow: none;">
              ${icon('sync', { size: 16 })}
            </div>
            <div>
              <h3 class="card-title" style="margin: 0; font-size: 0.95rem; font-weight: 700;">Integrasi &amp; Sinkronisasi Website Utama</h3>
              <p class="card-desc" style="margin: 2px 0 0;">Menghubungkan pesanan baru yang dibuat pelanggan di website utama ke Dasbor Untung Usaha.</p>
            </div>
          </div>

          <button id="btn-trigger-sync-now" class="btn btn-primary" style="gap: 6px;">
            ${icon('refresh', { size: 14 })}
            <span>Tarik Data Sekarang</span>
          </button>
        </div>

        <div class="sync-overview-grid">
          <div style="padding: 1rem; background: var(--bg-surface-elevated); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <span style="font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase;">Status Terakhir</span>
            <div style="font-size: 1.15rem; font-weight: 700; color: #059669; margin-top: 4px; display: flex; align-items: center; gap: 6px;">
              <span class="badge-dot" style="background: #10B981;"></span>
              <span>${lastRun?.status || 'Siap &amp; Aktif'}</span>
            </div>
          </div>

          <div style="padding: 1rem; background: var(--bg-surface-elevated); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <span style="font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase;">Waktu Terakhir Penarikan</span>
            <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin-top: 4px;">
              ${lastRun ? new Date(lastRun.started_at).toLocaleString('id-ID') : '-'}
            </div>
          </div>

          <div style="padding: 1rem; background: var(--bg-surface-elevated); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <span style="font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase;">Jadwal Otomatis</span>
            <div style="font-size: 0.9rem; font-weight: 600; color: var(--accent-brand); margin-top: 4px; display: flex; align-items: center; gap: 5px;">
              ${icon('clock', { size: 13 })}
              <span>Setiap 15 Menit</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Sync Runs Log Table -->
      <div class="card">
        <div class="card-header">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div class="brand-badge-icon brand-badge-sm" style="background: #F8FAFC; color: #475569; border: 1px solid var(--border-subtle); box-shadow: none;">
              ${icon('orders', { size: 15 })}
            </div>
            <div>
              <h4 class="card-title" style="margin: 0; font-size: 0.95rem; font-weight: 700;">Riwayat Penarikan Data (Sync Runs)</h4>
              <p class="card-desc" style="margin: 2px 0 0;">Catatan eksekusi proses tarik data otomatis dan manual.</p>
            </div>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>WAKTU PENARIKAN</th>
                <th>SUMBER</th>
                <th style="width: 110px;">STATUS</th>
                <th style="text-align: center; width: 120px;">DILIHAT</th>
                <th style="text-align: center; width: 120px;">DIBUAT</th>
                <th>PEMICU</th>
              </tr>
            </thead>
            <tbody>
              ${syncRunsData.map(s => `
                <tr>
                  <td>
                    <span class="tabular-nums" style="font-size: 0.82rem; font-weight: 500;">
                      ${new Date(s.started_at).toLocaleString('id-ID')}
                    </span>
                  </td>
                  <td><span style="font-size: 0.82rem; color: var(--text-primary);">${escapeHtml(s.source_name)}</span></td>
                  <td>
                    <span class="badge-subtle badge-confirmed">
                      <span class="badge-dot"></span>
                      ${s.status}
                    </span>
                  </td>
                  <td style="text-align: center;" class="tabular-nums">${s.records_seen}</td>
                  <td style="text-align: center;" class="tabular-nums"><strong style="color: #059669;">+${s.records_created}</strong></td>
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
        <div class="card-header">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div class="brand-badge-icon brand-badge-sm" style="background: #F8FAFC; color: #475569; border: 1px solid var(--border-subtle); box-shadow: none;">
              ${icon('user', { size: 15 })}
            </div>
            <div>
              <h3 class="card-title" style="margin: 0; font-size: 0.95rem; font-weight: 700;">Akun Pengelola &amp; Autentikasi</h3>
              <p class="card-desc" style="margin: 2px 0 0;">Sesi admin yang aktif pada Dasbor Untung Usaha.</p>
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: var(--bg-surface-elevated); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); margin-top: 0.5rem; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="user-avatar-circle" style="width: 44px; height: 44px; font-size: 1rem;">
              AD
            </div>
            <div>
              <div style="font-weight: 700; color: var(--text-primary);">Pemilik Usaha / Admin</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">admin@dasboruntung.com (Role: Admin)</div>
            </div>
          </div>

          <button id="btn-admin-logout" class="btn btn-secondary" style="color: #DC2626; border-color: #FECACA; gap: 6px;">
            ${icon('logout', { size: 14 })}
            <span>Keluar / Logout</span>
          </button>
        </div>
      </div>

      <!-- Supabase Cloud Connection Settings -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-header">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div class="brand-badge-icon brand-badge-sm" style="background: #F8FAFC; color: #475569; border: 1px solid var(--border-subtle); box-shadow: none;">
              ${icon('database', { size: 15 })}
            </div>
            <div>
              <h3 class="card-title" style="margin: 0; font-size: 0.95rem; font-weight: 700;">Konfigurasi Koneksi Supabase Cloud</h3>
              <p class="card-desc" style="margin: 2px 0 0;">Hubungkan database Supabase PostgreSQL agar data tersimpan aman secara cloud.</p>
            </div>
          </div>
        </div>

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

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button type="button" id="btn-sett-test" class="btn btn-secondary" style="flex: 1; gap: 6px; justify-content: center;">
              ${icon('refresh', { size: 14 })}
              <span>Tes Koneksi</span>
            </button>
            <button type="submit" class="btn btn-primary" style="flex: 1; gap: 6px; justify-content: center;">
              ${icon('check', { size: 14 })}
              <span>Simpan Kredensial</span>
            </button>
          </div>
        </form>

        ${url ? `
          <div style="margin-top: 1rem; text-align: center;">
            <button id="btn-sett-clear" class="btn-action" style="color: #DC2626;">Kembalikan ke Mode Demo Browser</button>
          </div>
        ` : ''}
      </div>

      <!-- Audit Logs Table -->
      <div class="card">
        <div class="card-header">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div class="brand-badge-icon brand-badge-sm" style="background: #F8FAFC; color: #475569; border: 1px solid var(--border-subtle); box-shadow: none;">
              ${icon('audit', { size: 15 })}
            </div>
            <div>
              <h3 class="card-title" style="margin: 0; font-size: 0.95rem; font-weight: 700;">Catatan Aktivitas &amp; Audit Log</h3>
              <p class="card-desc" style="margin: 2px 0 0;">Riwayat perubahan penting pada transaksi, status pesanan, dan keuangan.</p>
            </div>
          </div>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 170px;">WAKTU</th>
                <th style="width: 150px;">PENGGUNA</th>
                <th style="width: 140px;">AKSI</th>
                <th style="width: 130px;">ENTITAS</th>
                <th>RINCIAN</th>
              </tr>
            </thead>
            <tbody>
              ${auditLogsData.map(a => `
                <tr>
                  <td>
                    <span class="tabular-nums" style="font-size: 0.8rem; font-weight: 500;">
                      ${new Date(a.created_at).toLocaleString('id-ID')}
                    </span>
                  </td>
                  <td><strong>${escapeHtml(a.actor_name)}</strong></td>
                  <td><span class="badge-subtle badge-completed"><span class="badge-dot"></span>${a.action}</span></td>
                  <td><span class="booking-id-tag">${a.entity_type}</span></td>
                  <td><span style="font-size: 0.82rem; color: var(--text-secondary);">${escapeHtml(a.details || '-')}</span></td>
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
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${icon(sourceType === 'whatsapp' ? 'whatsapp' : 'orders', { size: 18 })}
            <h3 class="modal-title" style="margin: 0;">${sourceType === 'whatsapp' ? 'Catat Pesanan WhatsApp' : 'Tambah Booking &amp; Reservasi Baru'}</h3>
          </div>
          <button class="btn-close-modal" id="btn-close-add-order">&times;</button>
        </div>

        <div class="modal-body">
          <form id="form-create-order">
            <div class="form-grid-2" style="margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label">Kode Pesanan (Otomatis):</label>
                <input type="text" id="inp-order-code" class="form-input" value="${nextCode}" readonly />
              </div>
              <div class="form-group">
                <label class="form-label">Tanggal Pelaksanaan:</label>
                <input type="date" id="inp-order-date" class="form-input" value="${today}" required />
              </div>
            </div>

            <div class="form-grid-2" style="margin-bottom: 1rem;">
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

            <div class="form-grid-2" style="margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label">Nilai Pesanan (Rp):</label>
                <input type="number" id="inp-order-amount" class="form-input" placeholder="650000" required />
              </div>
              <div class="form-group">
                <label class="form-label">Diskon (Rp):</label>
                <input type="number" id="inp-order-discount" class="form-input" value="0" />
              </div>
            </div>

            <div class="form-grid-2" style="margin-bottom: 1rem;">
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

            <button type="submit" class="btn btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
              ${icon('check', { size: 15 })} <span>Simpan Pesanan ke Database</span>
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
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${icon('profit', { size: 18 })}
            <h3 class="modal-title" style="margin: 0;">Kelola Modal &amp; Biaya &mdash; <span class="booking-id-tag">${order.order_code}</span></h3>
          </div>
          <button class="btn-close-modal" id="btn-close-costs">&times;</button>
        </div>

        <div class="modal-body">
          <div class="cost-modal-summary-grid">
            <div style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase;">Pendapatan Bersih:</span>
              <div style="font-weight: 700; color: var(--text-primary); font-size: 1rem; margin-top: 2px;" class="tabular-nums">${formatRupiah(netIncome)}</div>
            </div>
            <div style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase;">Total Biaya/Modal:</span>
              <div style="font-weight: 700; color: #DC2626; font-size: 1rem; margin-top: 2px;" class="tabular-nums">${formatRupiah(totalCost)}</div>
            </div>
            <div style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase;">Laba Kotor:</span>
              <div style="font-weight: 700; color: #059669; font-size: 1rem; margin-top: 2px;" class="tabular-nums">${formatRupiah(grossProfit)}</div>
            </div>
          </div>

          <!-- Daftar Biaya yang Sudah Dicatat -->
          <h4 style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary); margin: 1rem 0 0.5rem;">Daftar Komponen Biaya:</h4>
          <div style="max-height: 180px; overflow-y: auto; margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem;">
            ${currentCosts.length === 0 ? `
              <div style="font-size: 0.82rem; color: var(--text-muted); text-align: center; padding: 1rem;">Belum ada biaya dicatat untuk pesanan ini.</div>
            ` : currentCosts.map(c => `
              <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface-elevated); padding: 0.6rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                <div>
                  <strong style="color: var(--text-primary); font-size: 0.85rem;">${escapeHtml(c.category)}</strong>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(c.description || '-')}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <span style="color: #DC2626; font-weight: 700;" class="tabular-nums">${formatRupiah(c.amount)}</span>
                  <button class="btn btn-secondary btn-icon-only" style="width: 26px; height: 26px; color: #DC2626;" onclick="window.adminDeleteCost('${c.id}', '${orderId}')">&times;</button>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Form Tambah Biaya Baru -->
          <div style="border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
            <h4 style="font-size: 0.88rem; font-weight: 700; color: var(--accent-brand); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 5px;">
              ${icon('plus', { size: 14 })}
              <span>Tambah Komponen Biaya Baru</span>
            </h4>
            <form id="form-add-cost">
              <div class="form-grid-2" style="margin-bottom: 0.75rem;">
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

              <button type="submit" class="btn btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
                ${icon('plus', { size: 14 })} <span>Tambah Biaya ke Pesanan</span>
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
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${icon('customers', { size: 18 })}
            <h3 class="modal-title" style="margin: 0;">Tambah Data Pelanggan</h3>
          </div>
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
            <button type="submit" class="btn btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
              ${icon('check', { size: 14 })} <span>Simpan Pelanggan</span>
            </button>
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
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${icon('bookkeeping', { size: 18 })}
            <h3 class="modal-title" style="margin: 0;">Catat Transaksi Pembukuan Kas</h3>
          </div>
          <button class="btn-close-modal" id="btn-close-trx">&times;</button>
        </div>
        <div class="modal-body">
          <form id="form-create-trx">
            <div class="form-grid-2" style="margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label">Kode:</label>
                <input type="text" class="form-input" value="${nextCode}" readonly />
              </div>
              <div class="form-group">
                <label class="form-label">Tanggal:</label>
                <input type="date" id="trx-new-date" class="form-input" value="${today}" required />
              </div>
            </div>

            <div class="form-grid-2" style="margin-bottom: 1rem;">
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

            <button type="submit" class="btn btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
              ${icon('check', { size: 14 })} <span>Simpan Transaksi Kas</span>
            </button>
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
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${icon('lock', { size: 18 })}
            <h3 class="modal-title" style="margin: 0;">Tutup Buku Periode</h3>
          </div>
          <button class="btn-close-modal" id="btn-close-closing">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem;">
            Konfirmasi penutupan buku untuk mengunci transaksi dan menghasilkan snapshot laporan keuangan resmi.
          </p>

          <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); margin-bottom: 1.25rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.85rem;">
              <span style="color: var(--text-secondary);">Total Pendapatan:</span>
              <strong style="color: #059669;" class="tabular-nums">${formatRupiah(summary.totalRevenue)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.85rem;">
              <span style="color: var(--text-secondary);">Total Biaya/Modal:</span>
              <strong style="color: #DC2626;" class="tabular-nums">${formatRupiah(summary.totalOrderCosts + summary.totalOperational)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-subtle); padding-top: 0.5rem;">
              <span style="font-weight: 700; color: var(--text-primary);">Laba Bersih Akhir:</span>
              <strong style="font-size: 1.15rem; color: #7C3AED;" class="tabular-nums">${formatRupiah(summary.netProfit)}</strong>
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

            <button type="submit" class="btn btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
              ${icon('lock', { size: 14 })} <span>Kunci &amp; Selesaikan Tutup Buku</span>
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

/* ==============================================================================
   9. MODUL: MANAJEMEN PENGGUNA & HAK AKSES (RBAC) (Section 10.D)
   ============================================================================== */
function renderUsersView() {
  const users = getAllUsers();
  const current = getCurrentUser();
  const adminCount = users.filter(u => u.role === 'admin').length;
  const staffCount = users.filter(u => u.role !== 'admin').length;

  return `
    <div class="view-container">
      
      <!-- Top Compressed KPI Strip (<= 88px) -->
      <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 1.25rem;">
        ${KpiCard({
          label: 'Total Pengguna',
          value: users.length,
          subtext: 'Terdaftar di sistem'
        })}
        ${KpiCard({
          label: 'Pengguna Admin',
          value: adminCount,
          subtext: 'Akses penuh & kelola akun'
        })}
        ${KpiCard({
          label: 'Pengguna Staf',
          value: staffCount,
          subtext: 'Akses operasional booking'
        })}
      </div>

      <!-- Users Table Card -->
      <div class="table-card-wrapper">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-subtle); background: var(--bg-surface);">
          <div>
            <h3 style="margin: 0; font-size: 0.95rem; font-weight: 600; color: var(--text-primary);">Daftar Pengguna &amp; Peran</h3>
            <p style="margin: 2px 0 0; font-size: 0.78rem; color: var(--text-secondary);">Batasi hak akses operasional sesuai prinsip hak istimewa terkecil (PoLP).</p>
          </div>
          <button type="button" class="btn btn-primary" id="btn-add-user" style="height: 32px; font-size: 0.78rem; gap: 6px;">
            ${icon('plus', { size: 14 })}
            <span>Tambah Pengguna</span>
          </button>
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 240px;">PENGGUNA</th>
                <th>EMAIL</th>
                <th style="width: 130px;">PERAN (RBAC)</th>
                <th style="width: 160px;">TANGGAL TERDAFTAR</th>
                <th style="width: 100px;">STATUS</th>
                <th style="width: 140px; text-align: center;">AKSI</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => {
                const isCurrent = current?.id === u.id || current?.email?.toLowerCase() === u.email?.toLowerCase();
                const isAdminRole = u.role === 'admin';
                return `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.65rem;">
                        <div class="user-avatar-circle" style="width: 28px; height: 28px; font-size: 0.72rem;">${escapeHtml(u.avatar || 'US')}</div>
                        <div>
                          <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary);">
                            ${escapeHtml(u.name)} ${isCurrent ? '<span style="font-size: 0.7rem; color: var(--color-accent); font-weight: 500;">(Anda)</span>' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style="font-size: 0.82rem; color: var(--text-secondary); font-family: var(--font-mono);">${escapeHtml(u.email)}</span>
                    </td>
                    <td>
                      <span class="badge-subtle ${isAdminRole ? 'badge-completed' : 'badge-confirmed'}">
                        <span class="badge-dot" style="background: ${isAdminRole ? '#71717A' : '#10B981'};"></span>
                        ${isAdminRole ? 'Admin' : 'Staf'}
                      </span>
                    </td>
                    <td>
                      <span class="tabular-nums" style="font-size: 0.8rem; color: var(--text-secondary);">
                        ${u.created_at ? formatTanggal(u.created_at.split('T')[0]) : '14 Okt 2026'}
                      </span>
                    </td>
                    <td>
                      <span class="badge-subtle badge-confirmed">
                        <span class="badge-dot"></span>
                        Aktif
                      </span>
                    </td>
                    <td style="text-align: center;">
                      <div style="display: inline-flex; gap: 0.35rem;">
                        <button type="button" class="btn btn-secondary btn-icon-only btn-toggle-role" data-id="${u.id}" data-role="${u.role}" title="Ubah Peran (Admin/Staf)" style="width: 28px; height: 28px; font-size: 0.75rem;" ${isCurrent ? 'disabled' : ''}>
                          ${icon('refresh', { size: 12 })}
                        </button>
                        ${!isCurrent ? `
                          <button type="button" class="btn btn-secondary btn-icon-only btn-delete-user" data-id="${u.id}" data-email="${escapeHtml(u.email)}" title="Hapus Pengguna" style="width: 28px; height: 28px; font-size: 0.75rem; color: #DC2626; border-color: #FECACA;">
                            ${icon('trash', { size: 12 })}
                          </button>
                        ` : `
                          <span style="display: inline-block; width: 28px; font-size: 0.72rem; color: var(--text-muted); line-height: 28px;">-</span>
                        `}
                      </div>
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

function initUsersEvents() {
  document.getElementById('btn-add-user')?.addEventListener('click', showAddUserModal);

  document.querySelectorAll('.btn-toggle-role').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const currentRole = btn.getAttribute('data-role');
      const newRole = currentRole === 'admin' ? 'staf' : 'admin';
      
      const users = getAllUsers();
      const target = users.find(u => u.id === id);
      if (target) {
        target.role = newRole;
        saveUser(target);
        window.showToast?.(`Peran ${target.name} diubah menjadi ${newRole.toUpperCase()}!`, 'success');
        renderActiveModule();
      }
    });
  });

  document.querySelectorAll('.btn-delete-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const email = btn.getAttribute('data-email');
      if (confirm(`Hapus pengguna ${email}? Tindakan ini tidak dapat dibatalkan.`)) {
        try {
          deleteUser(id);
          window.showToast?.('Pengguna berhasil dihapus.', 'info');
          renderActiveModule();
        } catch (err) {
          window.showToast?.(err.message, 'error');
        }
      }
    });
  });
}

function showAddUserModal() {
  const slot = document.getElementById('dasbor-modals-slot');
  if (!slot) return;

  slot.innerHTML = `
    <div class="modal-overlay" id="add-user-overlay">
      <div class="modal-dialog" style="max-width: 440px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" style="margin: 0; font-size: 1rem; font-weight: 600;">Tambah Pengguna Baru</h3>
            <p style="margin: 2px 0 0; font-size: 0.78rem; color: var(--text-secondary);">Berikan kredensial staf operasional atau administrator.</p>
          </div>
          <button class="btn-close-modal" id="btn-close-add-user">&times;</button>
        </div>

        <form id="form-add-user" class="modal-body" style="padding: 1.15rem 1.25rem;">
          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label">Nama Lengkap</label>
            <input type="text" id="new-user-name" class="form-input" placeholder="contoh: I Wayan Sudarma" required />
          </div>

          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label">Email Pengguna</label>
            <input type="email" id="new-user-email" class="form-input" placeholder="nama@dasboruntung.com" autocomplete="username" required />
          </div>

          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label">Peran Sistem (RBAC)</label>
            <select id="new-user-role" class="form-select" style="width: 100%;">
              <option value="staf">Staf (Lihat, tambah, ubah booking; tidak bisa hapus)</option>
              <option value="admin">Admin (Akses penuh, kelola pengguna &amp; audit)</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label">Kata Sandi Awal</label>
            <input type="password" id="new-user-pass" class="form-input" placeholder="Minimal 10 karakter" autocomplete="new-password" required />
            <div style="margin-top: 6px;">
              <div class="meter-track">
                <div class="meter-fill" id="new-user-pass-meter" style="width: 0%; background: #EF4444;"></div>
              </div>
              <div class="meter-label-row">
                <span id="new-user-pass-label">Kekuatan: Terlalu pendek</span>
                <span style="font-family: var(--font-mono);">Min. 10 Karakter</span>
              </div>
            </div>
          </div>

          <div id="new-user-error" style="display: none; padding: 0.5rem 0.75rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: var(--radius-sm); font-size: 0.78rem; color: #B91C1C; margin-bottom: 0.85rem;"></div>

          <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-add-user">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-save-new-user">Simpan Pengguna</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('btn-close-add-user')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('btn-cancel-add-user')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('add-user-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'add-user-overlay') slot.innerHTML = '';
  });

  const passInput = document.getElementById('new-user-pass');
  const meterFill = document.getElementById('new-user-pass-meter');
  const meterLabel = document.getElementById('new-user-pass-label');

  passInput?.addEventListener('input', (e) => {
    const val = e.target.value;
    const res = evaluatePasswordStrength(val);
    if (meterFill && meterLabel) {
      meterFill.style.width = `${res.percent}%`;
      meterFill.style.background = res.color;
      meterLabel.textContent = `Kekuatan: ${res.label}`;
    }
  });

  document.getElementById('form-add-user')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('new-user-name')?.value.trim();
    const email = document.getElementById('new-user-email')?.value.trim();
    const role = document.getElementById('new-user-role')?.value || 'staf';
    const pass = passInput?.value || '';
    const errBox = document.getElementById('new-user-error');

    const strength = evaluatePasswordStrength(pass);
    if (!strength.isValid) {
      if (errBox) {
        errBox.textContent = 'Kata sandi minimal 10 karakter untuk memenuhi standar keamanan.';
        errBox.style.display = 'block';
      }
      return;
    }

    try {
      saveUser({
        name,
        email,
        role
      });
      window.showToast?.(`Pengguna ${email} (${role.toUpperCase()}) berhasil ditambahkan!`, 'success');
      slot.innerHTML = '';
      renderActiveModule();
    } catch (err) {
      if (errBox) {
        errBox.textContent = err.message;
        errBox.style.display = 'block';
      }
    }
  });
}

/* ==============================================================================
   10. MODUL: LOG AKTIVITAS & JEJAK AUDIT (Section 10.F)
   ============================================================================== */
let auditFilterAction = 'ALL';

function getAuditLogsSync() {
  if (auditLogsData && auditLogsData.length > 0) return auditLogsData;
  try {
    const raw = localStorage.getItem('dasbor_untung_audit_logs');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [
    {
      id: 'log-1',
      actor_name: 'Guntur Adhi',
      action: 'LOGIN_SUCCESS',
      entity_type: 'auth',
      entity_id: 'usr-001',
      details: 'Login berhasil sebagai Administrator',
      created_at: new Date(Date.now() - 15 * 60000).toISOString()
    },
    {
      id: 'log-2',
      actor_name: 'Ni Made Ayu',
      action: 'UPDATE_STATUS',
      entity_type: 'bookings',
      entity_id: 'BKG-002',
      details: 'Memperbarui status booking BKG-002 menjadi Dikonfirmasi',
      created_at: new Date(Date.now() - 45 * 60000).toISOString()
    }
  ];
}

function renderAuditView() {
  const logs = getAuditLogsSync();
  const filtered = logs.filter(l => {
    if (auditFilterAction === 'ALL') return true;
    if (auditFilterAction === 'LOGIN' && (l.action.includes('LOGIN') || l.action.includes('LOGOUT'))) return true;
    if (auditFilterAction === 'BOOKING' && (l.action.includes('BOOKING') || l.action.includes('ORDER') || l.action.includes('STATUS'))) return true;
    if (auditFilterAction === 'USER' && (l.action.includes('USER') || l.action.includes('PASSWORD'))) return true;
    return false;
  });

  return `
    <div class="view-container">
      
      <!-- Table & Filters Card -->
      <div class="table-card-wrapper">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-subtle); background: var(--bg-surface); flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h3 style="margin: 0; font-size: 0.95rem; font-weight: 600; color: var(--text-primary);">Rekam Jejak Audit Sistem</h3>
            <p style="margin: 2px 0 0; font-size: 0.78rem; color: var(--text-secondary);">Merekam setiap login, mutasi pesanan, dan perubahan kredensial staf secara kronologis.</p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <select id="audit-action-filter" class="form-select" style="font-size: 0.78rem; height: 32px; padding: 0 0.5rem;">
              <option value="ALL" ${auditFilterAction === 'ALL' ? 'selected' : ''}>Semua Peristiwa</option>
              <option value="LOGIN" ${auditFilterAction === 'LOGIN' ? 'selected' : ''}>Autentikasi (Login/Logout)</option>
              <option value="BOOKING" ${auditFilterAction === 'BOOKING' ? 'selected' : ''}>Mutasi Booking / Pesanan</option>
              <option value="USER" ${auditFilterAction === 'USER' ? 'selected' : ''}>Manajemen Akun &amp; Sandi</option>
            </select>
            <button type="button" class="btn btn-secondary" id="btn-export-audit" style="height: 32px; font-size: 0.78rem; gap: 6px;">
              ${icon('export', { size: 13 })}
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>

        <div class="table-responsive" style="max-height: 600px; overflow-y: auto;">
          <table class="data-table">
            <thead style="position: sticky; top: 0; z-index: 10;">
              <tr>
                <th style="width: 170px;">WAKTU (WIB)</th>
                <th style="width: 160px;">AKTOR / PENGGUNA</th>
                <th style="width: 150px;">PERISTIWA</th>
                <th style="width: 130px;">ENTITAS / ID</th>
                <th>RINCIAN AKTIVITAS</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="5" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-secondary);">
                    Belum ada rekaman log audit untuk filter ini.
                  </td>
                </tr>
              ` : filtered.map(l => {
                let badgeClass = 'badge-completed';
                let dotColor = '#71717A';
                const act = l.action || '';

                if (act.includes('SUCCESS') || act.includes('CREATE')) {
                  badgeClass = 'badge-confirmed';
                  dotColor = '#10B981';
                } else if (act.includes('FAILED') || act.includes('DELETE')) {
                  badgeClass = 'badge-cancelled';
                  dotColor = '#EF4444';
                } else if (act.includes('UPDATE')) {
                  badgeClass = 'badge-pending';
                  dotColor = '#F59E0B';
                }

                const dateStr = l.created_at ? l.created_at.split('T')[0] : '2026-10-14';
                const timeStr = l.created_at && l.created_at.includes('T') ? l.created_at.split('T')[1].slice(0, 8) : '09:00:00';

                return `
                  <tr>
                    <td>
                      <div class="tabular-nums" style="font-weight: 500; font-size: 0.82rem; color: var(--text-primary);">${formatTanggal(dateStr)}</div>
                      <div class="tabular-nums" style="font-size: 0.72rem; color: var(--text-muted); margin-top: 1px;">pk ${timeStr} WIB</div>
                    </td>
                    <td>
                      <span style="font-weight: 500; font-size: 0.82rem; color: var(--text-primary);">${escapeHtml(l.actor_name || 'Sistem')}</span>
                    </td>
                    <td>
                      <span class="badge-subtle ${badgeClass}">
                        <span class="badge-dot" style="background: ${dotColor};"></span>
                        ${escapeHtml(l.action)}
                      </span>
                    </td>
                    <td>
                      <span class="booking-id-mono" style="font-size: 0.78rem;">${escapeHtml(l.entity_id || '-')}</span>
                    </td>
                    <td>
                      <span style="font-size: 0.82rem; color: var(--text-secondary);">${escapeHtml(l.details || '-')}</span>
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

function initAuditEvents() {
  document.getElementById('audit-action-filter')?.addEventListener('change', (e) => {
    auditFilterAction = e.target.value;
    renderActiveModule();
  });

  document.getElementById('btn-export-audit')?.addEventListener('click', () => {
    const logs = getAuditLogsSync();
    const rows = logs.map(l => [
      `"${l.created_at || ''}"`,
      `"${(l.actor_name || '').replace(/"/g, '""')}"`,
      `"${l.action || ''}"`,
      `"${l.entity_id || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + ['Waktu,Pengguna,Aksi,Entitas,Rincian', ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `audit-log-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.showToast?.('Log audit berhasil diekspor ke CSV!', 'success');
  });
}

/* ==============================================================================
   11. MODAL: PROFIL PENGGUNA & GANTI KATA SANDI (Section 10.G)
   ============================================================================== */
function showMobileUserMenuModal() {
  const user = getCurrentUser();
  const slot = document.getElementById('dasbor-modals-slot');
  if (!slot || !user) return;

  slot.innerHTML = `
    <div class="modal-overlay" id="mobile-user-modal-overlay">
      <div class="modal-dialog mobile-bottom-sheet" style="max-width: 380px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <div class="user-avatar-circle" style="width: 36px; height: 36px; font-size: 0.85rem;">${escapeHtml(user.avatar || 'GA')}</div>
            <div>
              <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">${escapeHtml(user.name || 'Admin')}</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); font-family: var(--font-mono);">${escapeHtml(user.email)}</div>
            </div>
          </div>
          <button class="btn-close-modal" id="btn-close-mobile-user-menu">&times;</button>
        </div>

        <div class="modal-body" style="padding: 0.85rem; display: flex; flex-direction: column; gap: 0.45rem;">
          <div style="padding: 0.5rem 0.65rem; background: var(--bg-surface-elevated); border-radius: var(--radius-sm); font-size: 0.75rem; color: var(--text-secondary); display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
            <span>Peran Akses:</span>
            <strong style="color: var(--text-primary); text-transform: capitalize;">${user.role === 'admin' ? 'Administrator' : 'Staf Operasional'}</strong>
          </div>

          <button type="button" class="btn btn-secondary" id="mobile-menu-item-profile" style="width: 100%; justify-content: flex-start; height: 42px; font-size: 0.85rem; gap: 8px;">
            ${icon('user', { size: 15 })} <span>Profil &amp; Informasi Sesi</span>
          </button>

          <button type="button" class="btn btn-secondary" id="mobile-menu-item-change-pass" style="width: 100%; justify-content: flex-start; height: 42px; font-size: 0.85rem; gap: 8px;">
            ${icon('lock', { size: 15 })} <span>Ganti Kata Sandi</span>
          </button>

          <div style="height: 1px; background: var(--border-subtle); margin: 4px 0;"></div>

          <button type="button" class="btn btn-secondary" id="mobile-menu-item-logout" style="width: 100%; justify-content: flex-start; height: 42px; font-size: 0.85rem; gap: 8px; color: #DC2626; border-color: #FECACA;">
            ${icon('logout', { size: 15 })} <span>Keluar dari Akun</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-mobile-user-menu')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('mobile-user-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'mobile-user-modal-overlay') slot.innerHTML = '';
  });

  document.getElementById('mobile-menu-item-profile')?.addEventListener('click', () => {
    slot.innerHTML = '';
    showUserProfileModal();
  });

  document.getElementById('mobile-menu-item-change-pass')?.addEventListener('click', () => {
    slot.innerHTML = '';
    showChangePasswordModal();
  });

  document.getElementById('mobile-menu-item-logout')?.addEventListener('click', async () => {
    slot.innerHTML = '';
    if (confirm('Apakah Anda yakin ingin keluar dari akun?')) {
      await logout();
      window.location.href = '/login';
    }
  });
}

function showUserProfileModal() {
  const user = getCurrentUser();
  const slot = document.getElementById('dasbor-modals-slot');
  if (!slot || !user) return;

  slot.innerHTML = `
    <div class="modal-overlay" id="profile-overlay">
      <div class="modal-dialog" style="max-width: 420px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" style="margin: 0; font-size: 1rem; font-weight: 600;">Profil Pengguna</h3>
            <p style="margin: 2px 0 0; font-size: 0.78rem; color: var(--text-secondary);">Informasi akun dan status sesi aktif.</p>
          </div>
          <button class="btn-close-modal" id="btn-close-profile">&times;</button>
        </div>

        <div class="modal-body" style="padding: 1.25rem;">
          <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-subtle);">
            <div class="user-avatar-circle" style="width: 48px; height: 48px; font-size: 1.15rem;">
              ${escapeHtml(user.avatar || 'AD')}
            </div>
            <div>
              <div style="font-weight: 600; font-size: 1rem; color: var(--text-primary);">${escapeHtml(user.name)}</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); font-family: var(--font-mono);">${escapeHtml(user.email)}</div>
              <div style="margin-top: 4px;">
                <span class="user-role-badge role-${user.role}">${user.role === 'admin' ? 'Administrator' : 'Staf Operasional'}</span>
              </div>
            </div>
          </div>

          <div style="font-size: 0.8rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.5rem;">
            <div style="display: flex; justify-content: space-between;">
              <span>Batas Tidak Aktif (Inactivity):</span>
              <strong style="color: var(--text-primary);">30 Menit</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Batas Maksimum Sesi:</span>
              <strong style="color: var(--text-primary);">8 Jam</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Header Keamanan:</span>
              <strong style="color: #047857;">CSP, X-Frame-Options, HSTS</strong>
            </div>
          </div>

          <div style="margin-top: 1.25rem; display: flex; justify-content: flex-end;">
            <button type="button" class="btn btn-secondary" id="btn-close-profile-btn" style="width: 100%;">Tutup</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-profile')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('btn-close-profile-btn')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('profile-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'profile-overlay') slot.innerHTML = '';
  });
}

function showChangePasswordModal() {
  const slot = document.getElementById('dasbor-modals-slot');
  if (!slot) return;

  slot.innerHTML = `
    <div class="modal-overlay" id="change-pass-overlay">
      <div class="modal-dialog" style="max-width: 420px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title" style="margin: 0; font-size: 1rem; font-weight: 600;">Ganti Kata Sandi</h3>
            <p style="margin: 2px 0 0; font-size: 0.78rem; color: var(--text-secondary);">Minimal 10 karakter sesuai standar keamanan (Section 10.E).</p>
          </div>
          <button class="btn-close-modal" id="btn-close-change-pass">&times;</button>
        </div>

        <form id="form-change-pass" class="modal-body" style="padding: 1.15rem 1.25rem;">
          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label">Kata Sandi Saat Ini</label>
            <input type="password" id="cp-current" class="form-input" autocomplete="current-password" required />
          </div>

          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label">Kata Sandi Baru</label>
            <input type="password" id="cp-new" class="form-input" autocomplete="new-password" required />
            <div style="margin-top: 6px;">
              <div class="meter-track">
                <div class="meter-fill" id="cp-meter-fill" style="width: 0%; background: #EF4444;"></div>
              </div>
              <div class="meter-label-row">
                <span id="cp-meter-label">Kekuatan: Terlalu pendek</span>
                <span style="font-family: var(--font-mono);">Min. 10 Karakter</span>
              </div>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0.85rem;">
            <label class="form-label">Konfirmasi Kata Sandi Baru</label>
            <input type="password" id="cp-confirm" class="form-input" autocomplete="new-password" required />
          </div>

          <div id="cp-error" style="display: none; padding: 0.5rem 0.75rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: var(--radius-sm); font-size: 0.78rem; color: #B91C1C; margin-bottom: 0.85rem;"></div>

          <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
            <button type="button" class="btn btn-secondary" id="btn-cancel-cp">Batal</button>
            <button type="submit" class="btn btn-primary" id="btn-submit-cp">Perbarui Kata Sandi</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('btn-close-change-pass')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('btn-cancel-cp')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('change-pass-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'change-pass-overlay') slot.innerHTML = '';
  });

  const newPassInp = document.getElementById('cp-new');
  const meterFill = document.getElementById('cp-meter-fill');
  const meterLabel = document.getElementById('cp-meter-label');

  newPassInp?.addEventListener('input', (e) => {
    const val = e.target.value;
    const res = evaluatePasswordStrength(val);
    if (meterFill && meterLabel) {
      meterFill.style.width = `${res.percent}%`;
      meterFill.style.background = res.color;
      meterLabel.textContent = `Kekuatan: ${res.label}`;
    }
  });

  document.getElementById('form-change-pass')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPass = document.getElementById('cp-current')?.value;
    const newPass = newPassInp?.value || '';
    const confirmPass = document.getElementById('cp-confirm')?.value;
    const errBox = document.getElementById('cp-error');

    if (newPass !== confirmPass) {
      if (errBox) {
        errBox.textContent = 'Konfirmasi kata sandi tidak cocok dengan kata sandi baru.';
        errBox.style.display = 'block';
      }
      return;
    }

    const strength = evaluatePasswordStrength(newPass);
    if (!strength.isValid) {
      if (errBox) {
        errBox.textContent = 'Kata sandi baru minimal 10 karakter.';
        errBox.style.display = 'block';
      }
      return;
    }

    try {
      await changePassword(currentPass, newPass);
      window.showToast?.('Kata sandi berhasil diperbarui!', 'success');
      slot.innerHTML = '';
    } catch (err) {
      if (errBox) {
        errBox.textContent = err.message || 'Gagal mengubah kata sandi.';
        errBox.style.display = 'block';
      }
    }
  });
}

