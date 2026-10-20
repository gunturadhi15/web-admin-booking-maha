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
import {
  playBookingNotificationSound,
  isSoundEnabled,
  toggleSound,
  showBookingAlertToast
} from '../services/soundAlert.js';

// Anti-Spam Sound Alert & New Booking Tracking (Section 2 Nontifikasi.md)
const knownBookingIds = new Set();
let isInitialLoad = true;

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
            <div class="brand-badge-icon" style="background: #0F172A; color: #0D9488;">
              ${icon('wellness', { size: 18, strokeWidth: 2.2 })}
            </div>
            <div class="brand-text-wrap">
              <h2 class="logo-title">Mahawellnessjourney</h2>
              <span class="logo-subtitle">Admin Reservasi &amp; Wellness</span>
            </div>
          </div>
          <button class="btn-close-sidebar" id="btn-close-sidebar" aria-label="Tutup Menu">${icon('close', { size: 18 })}</button>
        </div>

        <nav class="sidebar-menu">
          <div class="menu-group-label">OPERASIONAL</div>
          <button class="sidebar-link active" data-mod="dashboard">
            <span class="link-icon">${icon('dashboard', { size: 16 })}</span>
            <span>Dashboard</span>
          </button>
          <button class="sidebar-link" data-mod="orders">
            <span class="link-icon">${icon('orders', { size: 16 })}</span>
            <span>Kelola Pesanan</span>
            <span id="badge-order-count" class="badge-count">0</span>
          </button>
          <button class="sidebar-link" data-mod="calendar">
            <span class="link-icon">${icon('calendar', { size: 16 })}</span>
            <span>Jadwal Booking</span>
          </button>
          <button class="sidebar-link" data-mod="profit">
            <span class="link-icon">${icon('profit', { size: 16 })}</span>
            <span>Hitung Untung</span>
          </button>

          <div class="menu-group-label">KEUANGAN &amp; KAS</div>
          <button class="sidebar-link" data-mod="bookkeeping">
            <span class="link-icon">${icon('bookkeeping', { size: 16 })}</span>
            <span>Pembukuan Harian</span>
          </button>
          <button class="sidebar-link" data-mod="charts">
            <span class="link-icon">${icon('charts', { size: 16 })}</span>
            <span>Grafik Keuntungan</span>
          </button>

          <div class="menu-group-label">PELANGGAN</div>
          <button class="sidebar-link" data-mod="customers">
            <span class="link-icon">${icon('customers', { size: 16 })}</span>
            <span>Data Pelanggan</span>
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
            <div class="brand-badge-icon brand-badge-sm" style="background: #0F172A; color: #0D9488;">
              ${icon('wellness', { size: 15, strokeWidth: 2.2 })}
            </div>
            <div class="mobile-logo-text">
              <span class="logo-title-sm">Mahawellnessjourney</span>
              <span class="logo-subtitle-sm">Admin Reservasi</span>
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
            <button id="btn-mobile-toggle-sound" class="btn btn-secondary btn-icon-only" onclick="window.toggleAdminSound?.()" title="Toggle Bunyi Notifikasi" aria-label="Toggle Suara">
              <span id="mobile-sound-toggle-icon">${isSoundEnabled() ? '🔊' : '🔇'}</span>
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
            ${icon('dashboard', { size: 14 })} <span>Dashboard</span>
          </button>
          <button class="mobile-tab-btn" data-mod="orders">
            ${icon('orders', { size: 14 })} <span>Pesanan</span>
            <span class="mobile-tab-badge" id="mobile-badge-order-count">0</span>
          </button>
          <button class="mobile-tab-btn" data-mod="calendar">
            ${icon('calendar', { size: 14 })} <span>Jadwal</span>
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
              <span>Mahawellnessjourney</span>
              <span class="breadcrumb-separator">${icon('chevronRight', { size: 12 })}</span>
              <span class="breadcrumb-active" id="breadcrumb-current-mod">Dashboard</span>
            </div>
            <div class="header-title-wrap">
              <h1 id="page-heading" class="page-title">Dashboard</h1>
              <span id="page-subheading" class="page-desc">Pusat kendali reservasi, jadwal sesi hari ini, okupansi slot 2 jam, dan analitik bisnis.</span>
            </div>
          </div>

          <div class="header-right">
            <!-- Tombol Sekunder Ekspor CSV -->
            <button id="btn-header-export" class="btn btn-secondary" title="Ekspor Data Booking ke CSV">
              ${icon('export', { size: 15 })}
              <span>Ekspor CSV</span>
            </button>

            <!-- Tombol Toggle Suara Notifikasi (Mute/Unmute per Nontifikasi.md) -->
            <button id="btn-toggle-sound" class="btn-toggle-sound ${isSoundEnabled() ? '' : 'sound-off'}" onclick="window.toggleAdminSound?.()" title="Klik untuk mengaktifkan/membisukan bunyi notifikasi baru">
              <span id="sound-toggle-icon">${isSoundEnabled() ? '🔊' : '🔇'}</span>
              <span id="sound-toggle-label">${isSoundEnabled() ? 'Suara Aktif' : 'Bisu'}</span>
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

  // Sound Notification Toggle (Mute/Unmute per Nontifikasi.md)
  function updateSoundButtonUI() {
    const enabled = isSoundEnabled();
    const iconEl = document.getElementById('sound-toggle-icon');
    const labelEl = document.getElementById('sound-toggle-label');
    const btnEl = document.getElementById('btn-toggle-sound');
    const mobileIconEl = document.getElementById('mobile-sound-toggle-icon');

    if (iconEl) iconEl.textContent = enabled ? '🔊' : '🔇';
    if (labelEl) labelEl.textContent = enabled ? 'Suara Aktif' : 'Bisu';
    if (btnEl) btnEl.className = `btn-toggle-sound ${enabled ? '' : 'sound-off'}`;
    if (mobileIconEl) mobileIconEl.textContent = enabled ? '🔊' : '🔇';
  }

  const handleToggleSound = () => {
    const nextState = toggleSound();
    updateSoundButtonUI();
    if (nextState) {
      window.showToast?.('🔊 Bunyi notifikasi pesanan diaktifkan.', 'info');
      // Tampilkan toast alert demo sebagai konfirmasi visual & audio
      showBookingAlertToast({
        booking_id: 'MWJ-DEMO-ALERT-001',
        customer_name: 'Tes Bunyi & Notifikasi',
        package_name: 'Suara Lonceng Wellness Aktif',
        booking_date: new Date().toISOString().split('T')[0],
        booking_time: '09:00 WITA',
        pax: 2,
        total_amount: 650000
      });
    } else {
      window.showToast?.('🔇 Bunyi notifikasi pesanan dibisukan.', 'info');
    }
  };

  document.getElementById('btn-toggle-sound')?.addEventListener('click', handleToggleSound);
  document.getElementById('btn-mobile-toggle-sound')?.addEventListener('click', handleToggleSound);

  window.toggleAdminSound = handleToggleSound;
  window.playBookingNotificationSound = playBookingNotificationSound;
  window.showBookingAlertToast = showBookingAlertToast;

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
    dashboard: 'Dashboard',
    orders: 'Kelola Pesanan',
    calendar: 'Jadwal Booking',
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
 * Parser string notes dari alur Frontend Booking Engine
 * Format: [Origin: ...] | [Category: ...] | [Pax: ...] | [Time: ...] | [DOB: ...] | [Payment: ...] | User Notes: ...
 */
export function parseBookingNotes(notesString = '') {
  const result = {
    origin: '',
    category: '',
    pax: 1,
    time: '',
    dob: '',
    payment: '',
    userNotes: ''
  };
  if (!notesString || typeof notesString !== 'string') return result;

  const originMatch = notesString.match(/\[Origin:\s*([^\]]+)\]/i);
  if (originMatch) result.origin = originMatch[1].trim();

  const catMatch = notesString.match(/\[Category:\s*([^\]]+)\]/i);
  if (catMatch) result.category = catMatch[1].trim();

  const paxMatch = notesString.match(/\[Pax:\s*(\d+)\]/i);
  if (paxMatch) result.pax = parseInt(paxMatch[1], 10);

  const timeMatch = notesString.match(/\[Time:\s*([^\]]+)\]/i);
  if (timeMatch) result.time = timeMatch[1].trim();

  const dobMatch = notesString.match(/\[DOB:\s*([^\]]+)\]/i);
  if (dobMatch) result.dob = dobMatch[1].trim();

  const payMatch = notesString.match(/\[Payment:\s*([^\]]+)\]/i);
  if (payMatch) result.payment = payMatch[1].trim();

  const userNotesMatch = notesString.match(/User Notes:\s*(.*)$/i);
  if (userNotesMatch) {
    result.userNotes = userNotesMatch[1].trim();
  } else {
    const stripped = notesString.replace(/\[[^\]]+\]\s*\|?\s*/g, '').trim();
    if (stripped) result.userNotes = stripped;
  }
  return result;
}

/**
 * Mesin Validasi Ketersediaan Slot & Kunci Jadwal 2 Jam (2-Hour Booking Lock)
 * Sesuai Spesifikasi Section 4.B, 5.2, 5.6 & 6.4 di Penyelarasan.md
 * - Setiap pesanan aktif pada jam T mengunci ketersediaan slot dari T hingga T + 2 jam (120 menit).
 * - Kuota maksimal 8-10 pax per sesi 2 jam.
 * - Jika status dibatalkan / expired, kunci dilepas otomatis (auto-release).
 */
export function checkSlotAvailability(bookingDate, bookingTime, requestedPax = 1, excludeBookingId = null) {
  if (!bookingDate || !bookingTime) return { available: true, currentPax: 0, remainingPax: 10, maxPax: 10 };

  const parseMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const clean = String(timeStr).replace(/[^0-9:]/g, '');
    const parts = clean.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };

  const targetMinutes = parseMinutes(bookingTime);

  // Ambil semua booking aktif pada tanggal yang sama yang bukan dibatalkan/expired
  const activeBookings = ordersData.filter(o => {
    if (excludeBookingId && (o.id === excludeBookingId || o.order_code === excludeBookingId)) return false;
    if (o.order_date !== bookingDate) return false;
    const st = String(o.status || '').toLowerCase();
    // Jika cancelled/dibatalkan/expired, kunci terlepas otomatis (auto-release)
    if (st === 'dibatalkan' || st === 'cancelled' || st === 'expired') return false;
    return true;
  });

  let totalCollidingPax = 0;
  const collidingBookings = [];

  activeBookings.forEach(b => {
    const bMinutes = parseMinutes(b.order_time);
    // Tabrakan dalam jendela 2 jam (< 120 menit)
    if (Math.abs(targetMinutes - bMinutes) < 120) {
      const bPax = Number(b.pax || 1);
      totalCollidingPax += bPax;
      collidingBookings.push(b);
    }
  });

  const maxCapacity = 10; // Maksimal 8–10 pax per sesi (Section 5.2)
  const remainingCapacity = Math.max(0, maxCapacity - totalCollidingPax);
  const isAvailable = (totalCollidingPax + requestedPax) <= maxCapacity;

  return {
    available: isAvailable,
    currentPax: totalCollidingPax,
    remainingPax: remainingCapacity,
    maxPax: maxCapacity,
    collidingCount: collidingBookings.length,
    reason: isAvailable
      ? null
      : `Slot jam ${bookingTime} WITA terkunci/penuh. Kuota terisi ${totalCollidingPax}/${maxCapacity} pax dalam jendela kunci 2 jam.`
  };
}

/**
 * Direct WhatsApp Link Generator dengan Template Pesan Otomatis (Section 5.7)
 */
export function getDirectWhatsAppUrl(order) {
  if (!order) return null;
  const rawPhone = order.customer_phone || '';
  const cleanPhone = String(rawPhone).replace(/[^0-9]/g, '');
  if (!cleanPhone) return null;

  const bkgId = order.order_code || order.booking_id || order.id || '-';
  const pkg = order.service_or_item || order.package_name || 'Wisata Spiritual';
  const tgl = formatTanggal(order.order_date);
  const jam = formatJam(order.order_time);
  const pax = order.pax || 1;

  const message = `Halo ${order.customer_name},\n\nKami dari Mahawellnessjourney ingin mengonfirmasi reservasi Anda:\n• Kode Booking: ${bkgId}\n• Paket: ${pkg}\n• Tanggal: ${tgl}\n• Jam Sesi: ${jam} WITA\n• Jumlah Peserta: ${pax} Orang\n\nApakah ada hal khusus yang perlu kami siapkan untuk kenyamanan perjalanan spiritual Anda? Terima kasih.`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Helper: Konversi record tabel bookings / REST JSON ke struktur orders di Dasbor
 * Memenuhi spesifikasi Database Schema Mapping Section 4.A & 4.B
 */
function bookingToOrder(b) {
  const statusRaw = String(b.status || 'pending').toLowerCase();
  let mappedStatus = 'Menunggu';
  let mappedPayment = 'Belum Dibayar';

  if (['completed', 'selesai'].includes(statusRaw)) {
    mappedStatus = 'Selesai';
    mappedPayment = 'Lunas';
  } else if (['paid', 'lunas'].includes(statusRaw)) {
    mappedStatus = 'Dikonfirmasi';
    mappedPayment = 'Lunas';
  } else if (['confirmed', 'dikonfirmasi'].includes(statusRaw)) {
    mappedStatus = 'Dikonfirmasi';
    mappedPayment = 'Lunas';
  } else if (['cancelled', 'batal', 'dibatalkan', 'expired'].includes(statusRaw)) {
    mappedStatus = 'Dibatalkan';
    mappedPayment = 'Refund';
  } else {
    mappedStatus = 'Menunggu';
    mappedPayment = 'Belum Dibayar';
  }

  // Parse notes string untuk data terstruktur
  const parsed = parseBookingNotes(b.notes || '');

  // Pemetaan ID & Format Standar (MWJ-..., INV-..., TRX-...)
  const bookingId = b.booking_id || b.id || ('MWJ-SACRED-' + Date.now().toString().slice(-4));
  const invCode = b.invoice_number || b.invoice || ('INV-' + Date.now().toString().slice(-8));
  const orderId = b.order_id || ('TRX-' + (b.customer_id || '101') + '-' + Date.now());

  // Pemetaan Customer
  const custName = b.customer?.name || b.customer_name || 'Tamu Mahawellnessjourney';
  const rawPhone = b.customer?.phone || b.customer_phone || b.whatsapp || '';
  const cleanPhone = String(rawPhone).replace(/[^0-9]/g, '');
  const custEmail = b.customer?.email || b.customer_email || b.email || '';
  const custNationality = b.customer?.nationality || parsed.origin || 'Indonesia';
  const custDob = b.customer?.dob || parsed.dob || '';

  // Pemetaan Service & Package
  const serviceId = b.service_id || 'SRV001';
  const pkgName = b.package_name || b.service_name || b.service_or_item || 'Spiritual Temple Tour';

  // Tanggal & Jam (WITA)
  const orderDt = b.tour_date || b.booking_date || (b.created_at ? b.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);
  const orderTm = b.booking_time || parsed.time || '09:00';

  // Pax & Pricing (100% Tax-Free Nett, Tax: 0)
  const paxCount = Number(b.pax || parsed.pax || 1);
  const rawPrice = Number(b.total_amount ?? b.total_price ?? b.pricing?.total_amount ?? b.subtotal_amount ?? 0);

  return {
    id: bookingId,
    booking_id: bookingId,
    order_code: bookingId,
    invoice_number: invCode,
    order_id: orderId,
    customer_id: b.customer_id || ('cust-' + bookingId),
    customer_name: custName,
    customer_phone: cleanPhone,
    customer_email: custEmail,
    customer_nationality: custNationality,
    customer_dob: custDob,
    service_id: serviceId,
    service_or_item: pkgName,
    package_name: pkgName,
    source: b.source || 'website',
    external_order_id: invCode,
    order_date: orderDt,
    order_time: orderTm,
    pax: paxCount,
    status: mappedStatus,
    payment_status: mappedPayment,
    subtotal_amount: rawPrice,
    tax: 0,
    discount_amount: 0,
    additional_income_amount: 0,
    refund_amount: 0,
    notes: b.notes || '',
    parsed_notes: parsed,
    is_closed: false,
    created_at: b.created_at || new Date().toISOString()
  };
}

/**
 * Helper untuk mendeteksi perubahan data booking / order
 */
function hasDataChanged(prevOrders, newOrders) {
  if (!prevOrders || !newOrders) return true;
  if (prevOrders.length !== newOrders.length) return true;
  for (let i = 0; i < prevOrders.length; i++) {
    const p = prevOrders[i];
    const n = newOrders[i];
    if (!n) return true;
    if (
      p.id !== n.id ||
      p.status !== n.status ||
      p.payment_status !== n.payment_status ||
      p.order_date !== n.order_date ||
      p.order_time !== n.order_time ||
      p.subtotal_amount !== n.subtotal_amount ||
      p.customer_name !== n.customer_name ||
      p.customer_phone !== n.customer_phone
    ) {
      return true;
    }
  }
  return false;
}

let isFetchingSilently = false;

/**
 * Pengambilan Data Latar Belakang Tanpa Kedip (Silent Data Fetching)
 * Sesuai spesifikasi realtimedatabase.md:
 * - Mengambil data terbaru di latar belakang
 * - Tidak menampilkan skeleton atau loading spinner layar penuh (no flicker)
 * - Memperbarui state tabel & kartu KPI secara real-time
 */
async function fetchBookingsSilently() {
  if (isFetchingSilently) return;
  isFetchingSilently = true;

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

    let newOrders = [];
    if (bookingsList.length > 0) {
      const mappedBookingOrders = bookingsList.map(bookingToOrder);
      const existingIds = new Set(mappedBookingOrders.map(b => b.id));
      const additional = directOrders.filter(o => !existingIds.has(o.id)).map(bookingToOrder);
      newOrders = [...mappedBookingOrders, ...additional];
    } else {
      newOrders = directOrders.map(bookingToOrder);
    }

    const ordersChanged = hasDataChanged(ordersData, newOrders);
    ordersData = newOrders;

    // 🔔 Deteksi Pesanan Baru untuk Sound Alert & Pop-up Toast (Anti-Spam saat Refresh per Nontifikasi.md)
    if (isInitialLoad) {
      // Saat pertama kali buka halaman, catat semua ID tanpa membunyikan alarm
      newOrders.forEach(b => {
        const id = b.id || b.booking_id || b.order_code;
        if (id) knownBookingIds.add(id);
      });
      isInitialLoad = false;
    } else {
      // Cek apakah ada booking_id yang belum pernah tercatat sebelumnya
      const newEntries = newOrders.filter(b => {
        const id = b.id || b.booking_id || b.order_code;
        return id && !knownBookingIds.has(id);
      });

      if (newEntries.length > 0) {
        newEntries.forEach(b => {
          const id = b.id || b.booking_id || b.order_code;
          if (id) knownBookingIds.add(id);
        });

        const newest = newEntries[0];

        // 1. Bunyikan suara lonceng jika fitur suara aktif
        if (isSoundEnabled()) {
          playBookingNotificationSound();
        }

        // 2. Tampilkan Pop-up Toast di pojok kanan atas selama 6 detik
        showBookingAlertToast({
          booking_id: newest.order_code || newest.booking_id || newest.id,
          customer_name: newest.customer_name || 'Tamu Baru',
          package_name: newest.service_or_item || newest.service_name || 'Paket Wellness',
          booking_date: newest.order_date || newest.booking_date || '-',
          booking_time: newest.order_time || newest.booking_time || '-',
          pax: newest.pax || 1,
          total_amount: newest.subtotal_amount || newest.total_amount || 0
        });
      }
    }

    // Auto-populate customersData dari ordersData jika data pelanggan kosong
    if ((!resCustomers.data || resCustomers.data.length === 0) && ordersData.length > 0) {
      const custMap = new Map();
      ordersData.forEach(o => {
        if (o.customer_name && !custMap.has(o.customer_name)) {
          const parsed = parseBookingNotes(o.notes);
          custMap.set(o.customer_name, {
            id: o.customer_id || 'cust-' + o.id,
            name: o.customer_name,
            phone: o.customer_phone,
            phone_normalized: (o.customer_phone || '').replace(/[^0-9]/g, ''),
            email: o.customer_email || '',
            nationality: o.customer_nationality || parsed.origin || 'Indonesia',
            dob: o.customer_dob || parsed.dob || '',
            address: parsed.origin ? `Asal: ${parsed.origin}` : 'Bali',
            notes: o.notes || 'Pelanggan Terintegrasi Mahawellnessjourney',
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

    // Perbarui badge jumlah total booking secara hening
    const badge = document.getElementById('badge-order-count');
    if (badge) badge.textContent = ordersData.length;
    const mobileBadge = document.getElementById('mobile-badge-order-count');
    if (mobileBadge) mobileBadge.textContent = ordersData.length;

    // Perbarui modul yang sedang aktif tanpa kedipan
    updateActiveModuleSilently(ordersChanged);
  } catch (err) {
    console.warn('[SilentFetch] Gagal sinkronisasi latar belakang:', err);
  } finally {
    isFetchingSilently = false;
  }
}

/**
 * Perbarui Tampilan Modul Secara Hening (Mencegah Kehilangan Fokus Input Search)
 */
function updateActiveModuleSilently(ordersChanged) {
  if (!ordersChanged) return;

  const viewport = document.getElementById('dasbor-viewport');
  if (!viewport) return;

  if (activeModule === 'dashboard') {
    viewport.innerHTML = renderDashboardView();
    initDashboardEvents();
  } else if (activeModule === 'orders') {
    const isInputFocused = document.activeElement && (
      document.activeElement.tagName === 'INPUT' ||
      document.activeElement.tagName === 'TEXTAREA' ||
      document.activeElement.tagName === 'SELECT'
    );

    if (isInputFocused) {
      // Pertahankan elemen input yang sedang diketik user, cukup perbarui isi tbody & cards
      const { paginatedOrders, totalCount, totalPages, startIndex } = getFilteredAndSortedOrders();
      const tbody = document.getElementById('orders-table-tbody');
      if (tbody) tbody.innerHTML = renderOrderRows(paginatedOrders);

      const cardsContainer = document.querySelector('.orders-cards-container');
      if (cardsContainer) cardsContainer.innerHTML = renderOrderCards(paginatedOrders);

      const statusCounts = getStatusCounts();
      document.querySelectorAll('#status-segmented-control .segmented-btn').forEach(btn => {
        const st = btn.getAttribute('data-status') || 'ALL';
        const countSpan = btn.querySelector('.segmented-count');
        if (countSpan) countSpan.textContent = statusCounts[st] ?? 0;
      });

      const paginationInfo = document.querySelector('.pagination-left span[style*="tabular-nums"]');
      if (paginationInfo) {
        paginationInfo.textContent = totalCount > 0
          ? `Menampilkan ${startIndex + 1} - ${Math.min(startIndex + orderPageSize, totalCount)} dari ${totalCount} booking`
          : '0 booking';
      }
      const pageNumSpan = document.querySelector('.pagination-buttons span[style*="tabular-nums"]');
      if (pageNumSpan) {
        pageNumSpan.textContent = `Halaman ${orderCurrentPage} dari ${totalPages}`;
      }
    } else {
      refreshOrdersView();
    }
  } else if (activeModule === 'calendar') {
    refreshCalendarView();
  } else if (activeModule === 'customers') {
    renderActiveModule();
  } else if (activeModule === 'profit' || activeModule === 'charts') {
    renderActiveModule();
  }
}

/**
 * Load Semua Data dari Supabase (Wrapper pemanggilan awal)
 */
async function loadAllData() {
  await fetchBookingsSilently();
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
      heading.textContent = 'Dashboard';
      subheading.textContent = 'Pusat kendali reservasi, jadwal sesi hari ini, okupansi slot 2 jam, dan analitik bisnis.';
      viewport.innerHTML = renderDashboardView();
      initDashboardEvents();
      break;

    case 'orders':
      heading.textContent = 'Kelola Pesanan & Reservasi';
      subheading.textContent = 'Buku reservasi tamu terintegrasi, verifikasi status, validasi pembayaran, dan administrasi pesanan.';
      viewport.innerHTML = renderOrdersView();
      initOrdersEvents();
      break;

    case 'calendar':
      heading.textContent = 'Jadwal Booking & Kalender Sesi';
      subheading.textContent = 'Kalender reservasi bulanan, ketersediaan slot 2 jam WITA, proteksi tabrakan kuota, dan penjadwalan ulang.';
      viewport.innerHTML = renderCalendarView();
      initCalendarEvents();
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
function getSessionEndTime(timeStr) {
  if (!timeStr) return '11:00';
  const clean = timeStr.replace(/[^0-9:]/g, '');
  const parts = clean.split(':');
  let h = parseInt(parts[0], 10) || 9;
  let m = parts[1] || '00';
  h = (h + 2) % 24;
  return `${String(h).padStart(2, '0')}:${m}`;
}

/* ==============================================================================
   1. MODUL: DASHBOARD (EXECUTIVE OPERATIONAL COCKPIT & LIVE RADAR)
   Berbeda total dengan modul Kelola Pesanan (bukan tabel transaksi mentah,
   melainkan pusat kendali ringkasan eksekutif, agenda sesi hari ini,
   analitik okupansi 2 jam, dan tindakan cepat reservasi).
   ============================================================================== */
function renderDashboardView() {
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date(Date.now() + 86400000);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7); // 'YYYY-MM'

  // 1. Total Pendapatan Bulan Ini (Rp Nett, 100% Tax-Free per Section 6.1)
  const monthlyPaidOrders = ordersData.filter(o => {
    if (!o.order_date || !o.order_date.startsWith(currentMonthStr)) return false;
    const st = String(o.status || '').toLowerCase();
    const paySt = String(o.payment_status || '').toLowerCase();
    if (st === 'dibatalkan' || st === 'cancelled' || st === 'refund') return false;
    return paySt === 'lunas' || paySt === 'paid' || st === 'selesai' || st === 'completed' || st === 'dikonfirmasi' || st === 'confirmed';
  });
  const monthlyRevenue = monthlyPaidOrders.reduce((sum, o) => sum + calculateOrderNetIncome(o), 0);

  // 2. Booking Hari Ini & Besok
  const todayOrders = ordersData.filter(o => o.order_date === todayStr && o.status !== 'Dibatalkan' && o.status !== 'cancelled');
  const tomorrowOrders = ordersData.filter(o => o.order_date === tomorrowStr && o.status !== 'Dibatalkan' && o.status !== 'cancelled');
  const countTodayAndTomorrow = todayOrders.length + tomorrowOrders.length;

  // 3. Pesanan Menunggu Konfirmasi (pending)
  const pendingOrders = ordersData.filter(o => {
    const st = String(o.status || '').toLowerCase();
    return st === 'baru' || st === 'menunggu' || st === 'pending';
  });
  const countPending = pendingOrders.length;

  // 4. Tamu Aktif Hari Ini (Sum Pax Terjadwal)
  const totalPaxToday = todayOrders.reduce((sum, o) => sum + Number(o.pax || 1), 0);
  const maxDailyPax = 24; // Estimasi kapasitas 3 slot sesi x 8 pax
  const todayOccupancyPct = Math.min(100, Math.round((totalPaxToday / maxDailyPax) * 100));

  // Reservasi Terdekat Berikutnya (jika hari ini kosong)
  const upcomingBookings = ordersData
    .filter(o => (o.order_date >= todayStr) && o.status !== 'Dibatalkan' && o.status !== 'cancelled')
    .sort((a, b) => (a.order_date || '').localeCompare(b.order_date || ''));
  const nextBooking = upcomingBookings.find(o => o.order_date > todayStr) || upcomingBookings[0];

  // 5. Analisis Kontribusi Kategori Layanan (Service Analytics)
  const serviceStats = [
    {
      id: 'SRV001',
      name: 'Sacred Tour Spiritual & Pura',
      iconKey: 'tour',
      color: '#0D9488',
      count: 0,
      revenue: 0
    },
    {
      id: 'SRV002',
      name: 'Yoga, Meditation & Retreat',
      iconKey: 'retreat',
      color: '#0284C7',
      count: 0,
      revenue: 0
    },
    {
      id: 'SRV003',
      name: 'Konsultasi Numerologi & Jiwa',
      iconKey: 'numerology',
      color: '#8B5CF6',
      count: 0,
      revenue: 0
    },
    {
      id: 'SRV004',
      name: 'Melukat & Bio-Energy Healing',
      iconKey: 'healing',
      color: '#10B981',
      count: 0,
      revenue: 0
    }
  ];

  ordersData.forEach(o => {
    if (o.status === 'Dibatalkan' || o.status === 'cancelled') return;
    const sId = String(o.service_id || '').toUpperCase();
    const sName = String(o.service_or_item || '').toLowerCase();
    const net = calculateOrderNetIncome(o);

    if (sId === 'SRV001' || sName.includes('tour') || sName.includes('pura') || sName.includes('discovery')) {
      serviceStats[0].count++;
      serviceStats[0].revenue += net;
    } else if (sId === 'SRV002' || sName.includes('retreat') || sName.includes('yoga') || sName.includes('meditas')) {
      serviceStats[1].count++;
      serviceStats[1].revenue += net;
    } else if (sId === 'SRV003' || sName.includes('numerolog') || sName.includes('jiwa')) {
      serviceStats[2].count++;
      serviceStats[2].revenue += net;
    } else {
      serviceStats[3].count++;
      serviceStats[3].revenue += net;
    }
  });

  const maxServiceRevenue = Math.max(...serviceStats.map(s => s.revenue), 1);
  const recentOrders = ordersData.slice(0, 5);

  return `
    <div class="view-container">
      
      <!-- 1. Executive Metric Strip Sesuai Spesifikasi Section 6.1 di Penyelarasan.md -->
      <section class="kpi-horizontal-strip" aria-label="Ringkasan Performa Booking &amp; Keuangan">
        <div class="ledger-cell">
          <div class="ledger-header">
            <span class="ledger-label">Total Pendapatan Bulan Ini</span>
            <span class="ledger-badge ledger-badge-success">${monthlyPaidOrders.length} Terbayar</span>
          </div>
          <div class="ledger-row">
            <div class="ledger-value">${formatRupiah(monthlyRevenue)}</div>
          </div>
          <div class="ledger-caption">100% Tax-Free Nett (Bulan Ini)</div>
        </div>

        <div class="ledger-cell">
          <div class="ledger-header">
            <span class="ledger-label">Booking Hari Ini &amp; Besok</span>
            <span class="ledger-badge ledger-badge-neutral">${todayOrders.length} Hari Ini &bull; ${tomorrowOrders.length} Besok</span>
          </div>
          <div class="ledger-row">
            <div class="ledger-value">${countTodayAndTomorrow}</div>
          </div>
          <div class="ledger-caption">Jadwal reservasi aktif &amp; terkunci</div>
        </div>

        <div class="ledger-cell">
          <div class="ledger-header">
            <span class="ledger-label">Menunggu Konfirmasi</span>
            <span class="ledger-badge ${countPending > 0 ? 'ledger-badge-warning' : 'ledger-badge-success'}">${countPending > 0 ? `${countPending} Perlu Tindakan` : 'Terkonfirmasi Semua'}</span>
          </div>
          <div class="ledger-row">
            <div class="ledger-value">${countPending}</div>
          </div>
          <div class="ledger-caption">Reservasi status pending / baru</div>
        </div>

        <div class="ledger-cell">
          <div class="ledger-header">
            <span class="ledger-label">Tamu Aktif Hari Ini</span>
            <span class="ledger-badge ledger-badge-success">${todayOrders.length} Sesi Terjadwal</span>
          </div>
          <div class="ledger-row">
            <div class="ledger-value">${totalPaxToday} Pax</div>
          </div>
          <div class="ledger-caption">${todayOccupancyPct}% okupansi harian Bali</div>
        </div>
      </section>

      <!-- 2. Dual-Column Executive Grid (Operational Cockpit vs Analytics & Activity) -->
      <div class="dashboard-grid-2col">
        
        <!-- KOLOM KIRI (60%): Agenda Sesi Hari Ini & Pusat Tindakan Pending -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          
          <!-- Kartu 1: Agenda & Okupansi Sesi Hari Ini (WITA) -->
          <div class="timeline-card">
            <div class="timeline-header">
              <div style="display: flex; align-items: center; gap: 0.65rem;">
                <div class="brand-badge-icon brand-badge-sm" style="background: #F0FDFA; color: #0D9488; box-shadow: none;">
                  ${icon('calendar', { size: 16 })}
                </div>
                <div>
                  <h3 class="card-title" style="margin: 0; font-size: 0.98rem; font-weight: 700;">Agenda Sesi Kunjungan Hari Ini</h3>
                  <p class="card-desc" style="margin: 2px 0 0;">Jadwal sesi pelaksanaan eksklusif dengan proteksi 2-Hour Booking Lock (WITA).</p>
                </div>
              </div>
              
              <!-- Occupancy Tag -->
              <div style="font-size: 0.78rem; font-weight: 600; color: var(--accent-brand); background: #F0FDFA; border: 1px solid #CCFBF1; padding: 3px 10px; border-radius: 999px;">
                ${totalPaxToday} / ${maxDailyPax} Pax (${todayOccupancyPct}% Terisi)
              </div>
            </div>

            <!-- Daily Capacity Meter Bar -->
            <div style="margin-bottom: 1rem; padding: 0.75rem 0.85rem; background: var(--bg-surface-elevated); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 5px;">
                <span>Kapasitas Sesi Hari Ini (${formatTanggal(todayStr)})</span>
                <strong style="color: var(--text-primary);">${todayOrders.length} Sesi Aktif</strong>
              </div>
              <div class="service-progress-track" style="height: 6px;">
                <div class="service-progress-fill" style="width: ${todayOccupancyPct}%; background: #0D9488;"></div>
              </div>
            </div>

            <!-- List of Sessions Today -->
            <div class="timeline-items-list">
              ${todayOrders.length === 0 ? `
                <div style="text-align: center; padding: 2rem 1rem; background: var(--bg-surface-elevated); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md);">
                  <div style="color: var(--accent-brand); margin-bottom: 0.5rem;">${icon('wellness', { size: 28 })}</div>
                  <div style="font-weight: 600; font-size: 0.92rem; color: var(--text-primary);">Tidak Ada Sesi Terjadwal Hari Ini</div>
                  <p style="font-size: 0.78rem; color: var(--text-muted); margin: 3px 0 0.85rem;">Seluruh slot waktu 2 jam tersedia untuk reservasi tamu.</p>
                  ${nextBooking ? `
                    <div style="font-size: 0.78rem; color: var(--text-secondary); background: #FFFFFF; display: inline-block; padding: 6px 12px; border-radius: 4px; border: 1px solid var(--border-subtle);">
                      Sesi Terdekat: <strong>${formatTanggal(nextBooking.order_date)} pk ${formatJam(nextBooking.order_time)} WITA</strong> &mdash; ${escapeHtml(nextBooking.customer_name)}
                    </div>
                  ` : ''}
                </div>
              ` : todayOrders.map(o => {
    const rawTime = o.order_time ? o.order_time.slice(0, 5) : '09:00';
    const endTime = getSessionEndTime(rawTime);
    const waLink = getDirectWhatsAppUrl(o);
    const parsed = parseBookingNotes(o.notes);

    return `
                  <div class="timeline-item-card">
                    <div class="timeline-time-box">
                      <span class="timeline-time-badge">
                        ${icon('lockClock', { size: 12 })} pk ${rawTime} - ${endTime} WITA
                      </span>
                      <span class="timeline-lock-indicator">
                        ${icon('lockClock', { size: 10 })} Sesi 2 Jam Terkunci
                      </span>
                    </div>

                    <div class="timeline-content">
                      <div class="timeline-guest-name">
                        <span>${escapeHtml(o.customer_name)}</span>
                        <span class="badge-subtle badge-confirmed" style="font-size: 0.68rem; padding: 1px 6px;">${Number(o.pax || 1)} Pax</span>
                        ${parsed.dob ? `<span class="badge-subtle badge-pending" style="font-size: 0.68rem; padding: 1px 6px;">DOB: ${escapeHtml(parsed.dob)}</span>` : ''}
                      </div>
                      <div class="timeline-service-desc">${escapeHtml(o.service_or_item)}</div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                      ${waLink ? `
                        <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="font-size: 0.75rem; padding: 4px 8px; height: 30px; color: #047857;" title="Hubungi Tamu WhatsApp">
                          ${icon('whatsapp', { size: 13, strokeWidth: 2 })} <span>WA</span>
                        </a>
                      ` : ''}
                      <button type="button" class="btn btn-secondary" style="font-size: 0.75rem; padding: 4px 8px; height: 30px;" onclick="window.adminViewBookingDetail('${o.id}')" title="Lihat Rincian Reservasi">
                        ${icon('orders', { size: 13 })} <span>Detail</span>
                      </button>
                    </div>
                  </div>
                `;
  }).join('')}
            </div>
          </div>

          <!-- Kartu 2: Pusat Tindakan Reservasi Pending -->
          <div class="card">
            <div class="card-header" style="margin-bottom: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.55rem;">
                <div class="brand-badge-icon brand-badge-sm" style="background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; box-shadow: none;">
                  ${icon('orders', { size: 16 })}
                </div>
                <div>
                  <h3 class="card-title" style="margin: 0; font-size: 0.95rem; font-weight: 700;">Pesanan Menunggu Konfirmasi (${pendingOrders.length})</h3>
                  <p class="card-desc" style="margin: 2px 0 0;">Reservasi masuk yang memerlukan verifikasi jadwal atau pembayaran dari staf.</p>
                </div>
              </div>
            </div>

            ${pendingOrders.length === 0 ? `
              <div style="padding: 1rem 1.15rem; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: var(--radius-md); color: #065F46; font-size: 0.82rem; display: flex; align-items: center; gap: 8px;">
                ${icon('check', { size: 16 })}
                <span>Semua pesanan telah dikonfirmasi dan terjadwal dengan rapi. Tidak ada reservasi tertunda saat ini.</span>
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 0.65rem;">
                ${pendingOrders.slice(0, 3).map(po => {
    const poWa = getDirectWhatsAppUrl(po);
    return `
                    <div class="pending-alert-box">
                      <div style="flex: 1; min-width: 200px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <strong style="color: var(--text-primary); font-size: 0.88rem;">${escapeHtml(po.customer_name)}</strong>
                          <span class="booking-id-mono" style="font-size: 0.72rem;">${po.order_code}</span>
                        </div>
                        <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">
                          ${escapeHtml(po.service_or_item)} &bull; <strong>${formatTanggal(po.order_date)} pk ${formatJam(po.order_time)} WITA</strong>
                        </div>
                        <div style="font-size: 0.78rem; font-weight: 700; color: #B45309; margin-top: 2px;">
                          ${formatRupiah(calculateOrderNetIncome(po))}
                        </div>
                      </div>

                      <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                        <button type="button" class="btn btn-primary" style="font-size: 0.76rem; padding: 4px 10px; height: 30px; background: #0D9488; border-color: #0D9488;" onclick="window.adminChangeOrderStatus('${po.id}', 'Dikonfirmasi')">
                          ${icon('check', { size: 12 })} <span>Konfirmasi</span>
                        </button>
                        ${poWa ? `
                          <a href="${poWa}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="font-size: 0.76rem; padding: 4px 8px; height: 30px; color: #047857;" title="Hubungi Tamu WhatsApp">
                            ${icon('whatsapp', { size: 13, strokeWidth: 2 })} <span>WA</span>
                          </a>
                        ` : ''}
                        <button type="button" class="btn btn-secondary" style="font-size: 0.76rem; padding: 4px 8px; height: 30px;" onclick="window.adminViewBookingDetail('${po.id}')" title="Lihat Detail">
                          ${icon('orders', { size: 13 })}
                        </button>
                      </div>
                    </div>
                  `;
  }).join('')}
              </div>
            `}
          </div>

        </div>

        <!-- KOLOM KANAN (40%): Distribusi Layanan & Feed Aktivitas Masuk -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          
          <!-- Kartu 3: Distribusi Kontribusi Layanan Wellness -->
          <div class="card">
            <div class="card-header" style="margin-bottom: 0.85rem;">
              <div style="display: flex; align-items: center; gap: 0.55rem;">
                <div class="brand-badge-icon brand-badge-sm" style="background: #F0FDFA; color: #0D9488; box-shadow: none;">
                  ${icon('profit', { size: 16 })}
                </div>
                <div>
                  <h3 class="card-title" style="margin: 0; font-size: 0.95rem; font-weight: 700;">Distribusi Paket Wellness</h3>
                  <p class="card-desc" style="margin: 2px 0 0;">Volume reservasi &amp; kontribusi pendapatan per layanan.</p>
                </div>
              </div>
            </div>

            <div class="service-breakdown-list">
              ${serviceStats.map(s => {
    const pct = Math.round((s.revenue / maxServiceRevenue) * 100) || 0;
    return `
                  <div class="service-breakdown-row">
                    <div class="service-breakdown-meta">
                      <span class="service-breakdown-name">
                        ${icon(s.iconKey, { size: 14 })}
                        <span>${s.name}</span>
                      </span>
                      <span class="service-breakdown-stats">
                        ${s.count} Booking &bull; ${formatRupiah(s.revenue)}
                      </span>
                    </div>
                    <div class="service-progress-track">
                      <div class="service-progress-fill" style="width: ${pct}%; background: ${s.color};"></div>
                    </div>
                  </div>
                `;
  }).join('')}
            </div>
          </div>

          <!-- Kartu 4: Feed Aktivitas Reservasi Masuk Terkini (Compact Stream) -->
          <div class="card">
            <div class="card-header" style="margin-bottom: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.55rem;">
                <div class="brand-badge-icon brand-badge-sm" style="background: #F8FAFC; color: #475569; border: 1px solid var(--border-subtle); box-shadow: none;">
                  ${icon('orders', { size: 16 })}
                </div>
                <div>
                  <h3 class="card-title" style="margin: 0; font-size: 0.95rem; font-weight: 700;">Aktivitas Reservasi Terkini</h3>
                  <p class="card-desc" style="margin: 2px 0 0;">Aliran pemesanan terbaru yang masuk ke sistem.</p>
                </div>
              </div>
            </div>

            <div class="activity-feed-compact">
              ${recentOrders.length === 0 ? `
                <div style="text-align: center; color: var(--text-muted); padding: 1.5rem; font-size: 0.8rem;">Belum ada riwayat pesanan.</div>
              ` : recentOrders.map(ro => {
    const initials = (ro.customer_name || 'G').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    return `
                  <div class="activity-feed-row">
                    <div class="activity-feed-user">
                      <div class="activity-user-avatar">${initials}</div>
                      <div style="min-width: 0; flex: 1;">
                        <div style="font-weight: 600; font-size: 0.84rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${escapeHtml(ro.customer_name)}
                        </div>
                        <div style="font-size: 0.74rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                          ${escapeHtml(ro.service_or_item)} &bull; ${formatTanggal(ro.order_date)}
                        </div>
                      </div>
                    </div>

                    <div style="text-align: right; flex-shrink: 0;">
                      <div class="tabular-nums" style="font-weight: 700; font-size: 0.84rem; color: var(--text-primary);">${formatRupiah(calculateOrderNetIncome(ro))}</div>
                      <div style="margin-top: 2px;">${StatusBadge(ro.status)}</div>
                    </div>
                  </div>
                `;
  }).join('')}
            </div>

            <!-- Call to Action: Buka Kelola Pesanan -->
            <button type="button" class="btn btn-secondary" style="width: 100%; justify-content: center; gap: 8px; margin-top: 0.85rem; font-weight: 600; font-size: 0.82rem;" id="btn-goto-all-orders">
              <span>Buka Seluruh Daftar di Kelola Pesanan</span>
              ${icon('arrowUpRight', { size: 14 })}
            </button>
          </div>

        </div>

      </div>

      <!-- 3. Telemetri Status Kesehatan Sistem & Integrasi Realtime -->
      <div class="system-health-grid">
        <div class="health-item">
          <span class="health-dot-pulse"></span>
          <span><strong>Kunci Sesi 2 Jam:</strong> Aktif (Radius 120 Menit)</span>
        </div>
        <div class="health-item">
          <span class="health-dot-pulse"></span>
          <span><strong>Database:</strong> Supabase PostgreSQL Realtime</span>
        </div>
        <div class="health-item">
          <span class="health-dot-pulse"></span>
          <span><strong>Struktur Pajak:</strong> 0% (100% Tax-Free Nett)</span>
        </div>
        <div class="health-item">
          <span class="health-dot-pulse"></span>
          <span><strong>WhatsApp:</strong> Gateway Terhubung</span>
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

// State Kalender Jadwal (Modul: Jadwal Booking)
let calendarCurrentYear = new Date().getFullYear();
let calendarCurrentMonth = new Date().getMonth();
let selectedCalendarDate = new Date().toISOString().split('T')[0];

window.selectCalendarDate = function (dateKey) {
  selectedCalendarDate = dateKey;
  if (activeModule === 'calendar') {
    refreshCalendarView();
  } else {
    renderActiveModule();
  }
};

window.adminOpenQuickBookingForDate = function (date, time) {
  showAddOrderModal('manual', date, time);
};

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

/**
 * Modul: Kelola Pesanan (Daftar Reservasi, Validasi & Tabel Data)
 */
function renderOrdersView() {
  const statusCounts = getStatusCounts();
  const hasActiveFilters = Boolean(currentSearchQuery || currentStatusFilter !== 'ALL' || currentDateFilter !== 'ALL');
  const { paginatedOrders, totalCount, totalPages, startIndex } = getFilteredAndSortedOrders();

  return `
    <div class="view-container">
      
      <!-- Top Action Bar untuk Kelola Pesanan -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.15rem; gap: 1rem; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="brand-badge-icon brand-badge-sm" style="background: #F0FDFA; color: #0D9488; width: 36px; height: 36px;">
            ${icon('orders', { size: 18 })}
          </div>
          <div>
            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">Daftar Reservasi &amp; Administrasi Pesanan</h3>
            <p style="margin: 2px 0 0; font-size: 0.78rem; color: var(--text-secondary);">Verifikasi status operasional, validasi mutasi pembayaran, dan ekspor data buku tamu.</p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <button type="button" class="btn btn-secondary" id="btn-export-orders-csv" style="height: 36px; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 6px;">
            ${icon('download', { size: 14 })} <span>Ekspor CSV</span>
          </button>
          <button type="button" class="btn btn-primary" id="btn-add-booking-primary" style="height: 36px; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 6px;">
            ${icon('plus', { size: 14 })} <span>+ Tambah Booking</span>
          </button>
        </div>
      </div>

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

/**
 * Modul: Jadwal Booking (Kalender Bulanan & Slot 2 Jam Harian WITA)
 */
function renderCalendarView() {
  const MONTH_NAMES_ID = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const DAY_NAMES_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  const todayStr = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(calendarCurrentYear, calendarCurrentMonth, 1);
  const totalDaysInMonth = new Date(calendarCurrentYear, calendarCurrentMonth + 1, 0).getDate();
  const totalDaysInPrevMonth = new Date(calendarCurrentYear, calendarCurrentMonth, 0).getDate();

  let startDayOfWeek = firstDayOfMonth.getDay();
  startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  let calendarCellsHtml = '';

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const prevDayNum = totalDaysInPrevMonth - i;
    calendarCellsHtml += `
      <div class="calendar-day-box day-outside">
        <span class="cal-day-number">${prevDayNum}</span>
      </div>
    `;
  }

  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dateStr = `${calendarCurrentYear}-${String(calendarCurrentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedCalendarDate;

    const dayBookings = ordersData.filter(o => {
      const bDate = o.order_date || o.booking_date;
      if (bDate !== dateStr) return false;
      const s = String(o.status || '').toLowerCase();
      return !['dibatalkan', 'cancelled', 'batal'].includes(s);
    });

    const totalPax = dayBookings.reduce((sum, b) => sum + Number(b.pax || 1), 0);

    calendarCellsHtml += `
      <div class="calendar-day-box ${isToday ? 'day-today' : ''} ${isSelected ? 'day-selected' : ''}" 
           onclick="window.selectCalendarDate('${dateStr}')" 
           title="${dayBookings.length > 0 ? `${dayBookings.length} booking (${totalPax} pax)` : 'Tidak ada booking'}">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="cal-day-number" style="${isToday ? 'color: var(--accent-brand); font-weight: 700;' : ''}">${day}</span>
          ${isToday ? `<span style="font-size: 0.6rem; background: #0D9488; color: white; border-radius: 3px; padding: 1px 3px;">HARI INI</span>` : ''}
        </div>
        ${dayBookings.length > 0 ? `
          <span class="cal-booking-badge">
            ${dayBookings.length} Sesi (${totalPax} Pax)
          </span>
        ` : `
          <span style="font-size: 0.62rem; color: var(--text-muted); margin-top: auto;">Tersedia</span>
        `}
      </div>
    `;
  }

  const totalRendered = startDayOfWeek + totalDaysInMonth;
  const remainingCells = (7 - (totalRendered % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCellsHtml += `
      <div class="calendar-day-box day-outside">
        <span class="cal-day-number">${i}</span>
      </div>
    `;
  }

  const STANDARD_SLOTS = [
    { id: 'slot-1', label: 'Sesi Pagi — Spiritual Awakening', startTime: '09:00', endTime: '11:00', targetMin: 9 * 60 },
    { id: 'slot-2', label: 'Sesi Siang — Mind & Healing Tour', startTime: '11:30', endTime: '13:30', targetMin: 11 * 60 + 30 },
    { id: 'slot-3', label: 'Sesi Sore — Balinese Energy Flow', startTime: '14:00', endTime: '16:00', targetMin: 14 * 60 },
    { id: 'slot-4', label: 'Sesi Senja — Sunset Meditation', startTime: '16:30', endTime: '18:30', targetMin: 16 * 60 + 30 }
  ];

  const parseMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const clean = String(timeStr).replace(/[^0-9:]/g, '');
    const parts = clean.split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };

  const selectedDayBookings = ordersData.filter(o => {
    const bDate = o.order_date || o.booking_date;
    if (bDate !== selectedCalendarDate) return false;
    const s = String(o.status || '').toLowerCase();
    return !['dibatalkan', 'cancelled', 'batal'].includes(s);
  });

  const mappedBookingIds = new Set();

  const slotsHtml = STANDARD_SLOTS.map(slot => {
    const slotCheck = checkSlotAvailability(selectedCalendarDate, slot.startTime);

    const slotBookings = selectedDayBookings.filter(b => {
      const bMin = parseMinutes(b.order_time);
      if (Math.abs(bMin - slot.targetMin) < 75) {
        mappedBookingIds.add(b.id);
        return true;
      }
      return false;
    });

    const isBooked = slotBookings.length > 0;

    return `
      <div class="slot-status-card ${isBooked ? 'slot-booked' : 'slot-available'}">
        <div class="slot-card-header">
          <div class="slot-time-title">
            ${icon('clock', { size: 15 })}
            <span>${slot.startTime} - ${slot.endTime} WITA</span>
            <span style="font-size: 0.72rem; font-weight: normal; color: var(--text-secondary); margin-left: 4px;">• ${slot.label}</span>
          </div>
          <div>
            ${isBooked ? `
              <span class="status-badge badge-confirmed" style="font-size: 0.72rem; padding: 2px 7px;">
                Terjadwal (${slotCheck.currentPax}/10 Pax)
              </span>
            ` : `
              <span class="status-badge badge-neutral" style="font-size: 0.72rem; padding: 2px 7px; background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0;">
                Slot Siap (${slotCheck.remainingPax} Pax Kosong)
              </span>
            `}
          </div>
        </div>

        ${isBooked ? `
          <div style="display: flex; flex-direction: column; gap: 0.65rem; margin-top: 0.65rem;">
            ${slotBookings.map(b => {
              const waUrl = getDirectWhatsAppUrl(b);
              const pax = Number(b.pax || 1);
              return `
                <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;">
                    <div>
                      <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                        <span>${escapeHtml(b.customer_name)}</span>
                        <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: normal;">(${pax} Pax)</span>
                      </div>
                      <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">
                        ${escapeHtml(b.service_or_item || b.service_name || '-')}
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                      ${StatusBadge(b.status)}
                      <span class="booking-id-tag" style="font-size: 0.7rem;">${b.order_code || b.invoice || '-'}</span>
                    </div>
                  </div>

                  <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.4rem; border-top: 1px dashed var(--border-subtle); gap: 0.5rem; flex-wrap: wrap;">
                    <div style="font-size: 0.72rem; color: #0D9488; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                      ${icon('lockClock', { size: 13 })} Kunci 2 Jam Terpasang (${slot.startTime} - ${slot.endTime})
                    </div>
                    <div style="display: flex; gap: 4px;">
                      <button type="button" class="btn btn-secondary" style="height: 28px; font-size: 0.74rem; padding: 0 8px;" onclick="window.adminViewBookingDetail('${b.id}')">
                        ${icon('eye', { size: 12 })} Detail
                      </button>
                      ${waUrl ? `
                        <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="height: 28px; font-size: 0.74rem; padding: 0 8px; color: #047857;">
                          ${icon('whatsapp', { size: 12 })} WA
                        </a>
                      ` : ''}
                      <button type="button" class="btn btn-secondary" style="height: 28px; font-size: 0.74rem; padding: 0 8px;" onclick="window.adminOpenRescheduleModal('${b.id}')">
                        ${icon('calendar', { size: 12 })} Pindah
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div style="margin-top: 0.5rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span style="font-size: 0.78rem; color: var(--text-secondary);">
              Slot kosong. Kuota reservasi 8-10 pax tersedia untuk tamu baru.
            </span>
            <button type="button" class="btn btn-secondary" style="height: 30px; font-size: 0.78rem; padding: 0 10px; display: inline-flex; align-items: center; gap: 4px;" onclick="window.adminOpenQuickBookingForDate('${selectedCalendarDate}', '${slot.startTime}')">
              ${icon('plus', { size: 13 })} + Pesan Sesi Ini
            </button>
          </div>
        `}
      </div>
    `;
  }).join('');

  const unmappedBookings = selectedDayBookings.filter(b => !mappedBookingIds.has(b.id));
  let unmappedHtml = '';
  if (unmappedBookings.length > 0) {
    unmappedHtml = `
      <div style="margin-top: 1rem; border-top: 1px dashed var(--border-subtle); padding-top: 0.75rem;">
        <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 6px;">
          ${icon('clock', { size: 14 })} Sesi Jadwal Khusus / Fleksibel (${unmappedBookings.length})
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          ${unmappedBookings.map(b => `
            <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0.75rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
              <div>
                <div style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary);">
                  ${escapeHtml(b.customer_name)} &bull; ${formatJam(b.order_time || '09:00')} WITA
                </div>
                <div style="font-size: 0.76rem; color: var(--text-secondary);">${escapeHtml(b.service_or_item || '-')}</div>
              </div>
              <div style="display: flex; gap: 4px;">
                <button type="button" class="btn btn-secondary" style="height: 28px; font-size: 0.74rem; padding: 0 8px;" onclick="window.adminViewBookingDetail('${b.id}')">Detail</button>
                <button type="button" class="btn btn-secondary" style="height: 28px; font-size: 0.74rem; padding: 0 8px;" onclick="window.adminOpenRescheduleModal('${b.id}')">Pindah</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="view-container">
      
      <!-- Top Action Bar untuk Jadwal Booking -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.15rem; gap: 1rem; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="brand-badge-icon brand-badge-sm" style="background: #F0FDFA; color: #0D9488; width: 36px; height: 36px;">
            ${icon('calendar', { size: 18 })}
          </div>
          <div>
            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary);">Kalender Reservasi &amp; Kunci Jadwal 2 Jam</h3>
            <p style="margin: 2px 0 0; font-size: 0.78rem; color: var(--text-secondary);">Proteksi tabrakan kuota 120 menit (WITA) dan manajemen alokasi slot harian.</p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <button type="button" class="btn btn-primary" id="btn-cal-add-booking" style="height: 36px; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 6px;">
            ${icon('plus', { size: 14 })} <span>+ Pesan Sesi Baru</span>
          </button>
        </div>
      </div>

      <div class="calendar-layout-grid">
        <!-- Kolom Kiri: Kalender Bulanan Interaktif -->
        <div class="calendar-card">
          <div class="calendar-nav-bar">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <button type="button" id="cal-btn-prev-month" class="btn btn-secondary" style="width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center;" title="Bulan Sebelumnya">
                &larr;
              </button>
              <div class="calendar-month-title">
                ${MONTH_NAMES_ID[calendarCurrentMonth]} ${calendarCurrentYear}
              </div>
              <button type="button" id="cal-btn-next-month" class="btn btn-secondary" style="width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center;" title="Bulan Berikutnya">
                &rarr;
              </button>
            </div>

            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <button type="button" id="cal-btn-today" class="btn btn-secondary" style="height: 32px; font-size: 0.78rem; padding: 0 10px;">
                Bulan &amp; Hari Ini
              </button>
            </div>
          </div>

          <div class="calendar-grid-table" style="margin-bottom: 4px;">
            ${DAY_NAMES_ID.map(d => `<div class="calendar-day-head">${d}</div>`).join('')}
          </div>

          <div class="calendar-grid-table">
            ${calendarCellsHtml}
          </div>

          <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle); display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.75rem; color: var(--text-secondary);">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="width: 12px; height: 12px; border: 1px solid #0D9488; background: #F0FDFA; border-radius: 3px; display: inline-block;"></span>
              <span>Hari Ini</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="width: 12px; height: 12px; border: 2px solid #0D9488; background: #FFFFFF; border-radius: 3px; display: inline-block;"></span>
              <span>Tanggal Terpilih</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="width: 12px; height: 12px; background: #0D9488; border-radius: 3px; display: inline-block;"></span>
              <span>Ada Sesi Booking</span>
            </div>
          </div>
        </div>

        <!-- Kolom Kanan: Panel Detail Jadwal Harian (Slot 2 Jam) -->
        <div class="schedule-panel-card">
          <div class="schedule-panel-header">
            <div>
              <div style="font-size: 0.72rem; color: var(--accent-brand); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Agenda &amp; Ketersediaan Sesi</div>
              <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin: 2px 0 0 0;">
                ${formatTanggal(selectedCalendarDate)}
              </h3>
            </div>
            <div style="font-size: 0.74rem; background: #F0FDFA; color: #0F766E; padding: 3px 8px; border-radius: 4px; border: 1px solid #CCFBF1; font-weight: 600;">
              WITA (Bali) • Kunci Sesi 2 Jam
            </div>
          </div>

          <div class="slot-timeline-list">
            ${slotsHtml}
          </div>

          ${unmappedHtml}
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

    // Search Keyword (Section 2 & 6.2 di Penyelarasan.md)
    if (currentSearchQuery) {
      const q = currentSearchQuery.toLowerCase();
      const matchCode = (o.order_code || '').toLowerCase().includes(q) || (o.booking_id || '').toLowerCase().includes(q) || (o.id || '').toLowerCase().includes(q);
      const matchInvoice = (o.invoice_number || '').toLowerCase().includes(q);
      const matchTrx = (o.order_id || '').toLowerCase().includes(q);
      const matchName = (o.customer_name || '').toLowerCase().includes(q);
      const matchPhone = (o.customer_phone || '').toLowerCase().includes(q);
      const matchItem = (o.service_or_item || '').toLowerCase().includes(q);
      return matchCode || matchInvoice || matchTrx || matchName || matchPhone || matchItem;
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
    const waLink = getDirectWhatsAppUrl(o);
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
                  <span>${formatTanggal(o.order_date)} • pk ${formatJam(o.order_time)} WITA</span>
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
    const waLink = getDirectWhatsAppUrl(o);
    const isChecked = selectedBookingIds.has(o.id);

    return `
      <tr class="${isChecked ? 'row-selected' : ''}" data-id="${o.id}" id="order-row-${o.id}">
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
          <div class="tabular-nums" style="font-size: 0.72rem; color: var(--text-muted); margin-top: 1px; padding-left: 17px;">pk ${formatJam(o.order_time)} WITA</div>
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
  // Top Bar Action Buttons
  document.getElementById('btn-export-orders-csv')?.addEventListener('click', () => {
    exportBookingsToCSV(ordersData);
  });

  document.getElementById('btn-add-booking-primary')?.addEventListener('click', () => {
    showAddOrderModal('manual');
  });

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

function initCalendarEvents() {
  document.getElementById('cal-btn-prev-month')?.addEventListener('click', () => {
    if (calendarCurrentMonth === 0) {
      calendarCurrentMonth = 11;
      calendarCurrentYear--;
    } else {
      calendarCurrentMonth--;
    }
    refreshCalendarView();
  });

  document.getElementById('cal-btn-next-month')?.addEventListener('click', () => {
    if (calendarCurrentMonth === 11) {
      calendarCurrentMonth = 0;
      calendarCurrentYear++;
    } else {
      calendarCurrentMonth++;
    }
    refreshCalendarView();
  });

  document.getElementById('cal-btn-today')?.addEventListener('click', () => {
    const now = new Date();
    calendarCurrentYear = now.getFullYear();
    calendarCurrentMonth = now.getMonth();
    selectedCalendarDate = now.toISOString().split('T')[0];
    refreshCalendarView();
  });

  document.getElementById('btn-cal-add-booking')?.addEventListener('click', () => {
    showAddOrderModal('manual', selectedCalendarDate);
  });
}

function refreshCalendarView() {
  const container = document.getElementById('dasbor-viewport');
  if (container && activeModule === 'calendar') {
    container.innerHTML = renderCalendarView();
    initCalendarEvents();
  }
}

/**
 * Menu Tindakan Cepat (...) — Sesuai Butir 7 & 10.D di Markdown.MD
 */
window.adminOpenActionMenu = function (orderId, event) {
  event?.stopPropagation?.();
  const order = ordersData.find(o => o.id === orderId);
  if (!order) return;

  const slot = document.getElementById('dasbor-modals-slot');
  if (!slot) return;

  const userCanDelete = canDeleteBooking(); // Admin Only (Section 10.D)
  const waUrl = getDirectWhatsAppUrl(order);

  slot.innerHTML = `
    <div class="modal-overlay" id="action-menu-overlay">
      <div class="modal-dialog" style="max-width: 440px;">
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
                <span class="badge-dot" style="background: #0D9488;"></span> Selesai / Lunas
              </button>
              <button type="button" class="btn btn-secondary" style="font-size: 0.78rem; justify-content: flex-start; gap: 6px;" onclick="window.adminChangeOrderStatus('${order.id}', 'Dibatalkan'); document.getElementById('action-menu-overlay')?.remove();">
                <span class="badge-dot" style="background: #EF4444;"></span> Dibatalkan
              </button>
            </div>
          </div>

          <!-- Tindakan Cepat Sesuai Spesifikasi: Lihat detail, WhatsApp, Reschedule, Ubah, Salin ID, Hapus -->
          <div style="display: flex; flex-direction: column; gap: 0.45rem; border-top: 1px solid var(--border-subtle); padding-top: 0.85rem;">
            <button type="button" class="btn btn-secondary" style="width: 100%; justify-content: flex-start; gap: 8px;" onclick="document.getElementById('action-menu-overlay')?.remove(); window.adminViewBookingDetail('${order.id}');">
              ${icon('orders', { size: 15 })} <span>Lihat Detail Booking &amp; Notes</span>
            </button>

            ${waUrl ? `
              <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="width: 100%; justify-content: flex-start; gap: 8px; color: #047857;" onclick="document.getElementById('action-menu-overlay')?.remove();">
                ${icon('whatsapp', { size: 15, strokeWidth: 2 })} <span>Kirim Notifikasi WhatsApp Tamu</span>
              </a>
            ` : ''}

            <button type="button" class="btn btn-secondary" style="width: 100%; justify-content: flex-start; gap: 8px;" onclick="document.getElementById('action-menu-overlay')?.remove(); window.adminOpenRescheduleModal('${order.id}');">
              ${icon('calendar', { size: 15 })} <span>Reschedule Jadwal Kunjungan</span>
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
window.adminCopyBookingId = async function (orderCode) {
  try {
    await navigator.clipboard.writeText(orderCode);
    window.showToast?.(`ID Booking disalin: ${orderCode}`, 'success');
  } catch {
    window.showToast?.(`ID Booking: ${orderCode}`, 'info');
  }
};

/**
 * Modal Reschedule Jadwal Kunjungan (2-Hour Booking Lock Validation)
 * Sesuai Section 5.6 & 6.4 di Penyelarasan.md
 */
window.adminOpenRescheduleModal = function (orderId) {
  const slot = document.getElementById('dasbor-modals-slot');
  if (!slot) return;
  const order = ordersData.find(o => o.id === orderId);
  if (!order) {
    window.showToast?.('Pesanan tidak ditemukan!', 'error');
    return;
  }

  const currentDate = order.order_date || new Date().toISOString().split('T')[0];
  const currentTime = order.order_time ? order.order_time.slice(0, 5) : '09:00';
  const pax = order.pax || 1;

  slot.innerHTML = `
    <div class="modal-overlay" id="reschedule-modal-overlay">
      <div class="modal-dialog" style="max-width: 500px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${icon('calendar', { size: 18 })}
            <h3 class="card-title" style="margin: 0; font-size: 1.05rem;">Reschedule Jadwal &mdash; <span class="booking-id-tag">${escapeHtml(order.order_code)}</span></h3>
          </div>
          <button class="btn-close-modal" id="btn-close-reschedule">&times;</button>
        </div>

        <div class="modal-body" style="padding: 1.25rem;">
          <div style="margin-bottom: 1rem; background: var(--bg-surface-elevated); padding: 0.85rem 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 0.82rem;">
            <div style="color: var(--text-primary); font-weight: 600;">${escapeHtml(order.customer_name)} (${pax} Pax)</div>
            <div style="color: var(--text-secondary); margin-top: 2px;">${escapeHtml(order.service_or_item)}</div>
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--border-subtle); color: var(--text-muted);">
              Jadwal Saat Ini: <strong style="color: var(--text-primary);">${formatTanggal(currentDate)} pk ${formatJam(currentTime)} WITA</strong>
            </div>
          </div>

          <form id="form-reschedule-booking">
            <div class="form-grid-2" style="margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label">Tanggal Pelaksanaan Baru:</label>
                <input type="date" id="reschedule-new-date" class="form-input" value="${currentDate}" required min="${new Date().toISOString().split('T')[0]}" />
              </div>
              <div class="form-group">
                <label class="form-label">Jam Sesi (WITA):</label>
                <input type="time" id="reschedule-new-time" class="form-input" value="${currentTime}" required />
              </div>
            </div>

            <!-- Live Availability & 2-Hour Lock Status Badge -->
            <div id="reschedule-slot-feedback" style="margin-bottom: 1.25rem; padding: 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 0.8rem; display: flex; align-items: flex-start; gap: 8px;">
              <div style="margin-top: 2px;">${icon('lockClock', { size: 16 })}</div>
              <div id="reschedule-feedback-text">Memeriksa ketersediaan slot 2 jam (2-Hour Booking Lock)...</div>
            </div>

            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('reschedule-modal-overlay')?.remove();">
                Batal
              </button>
              <button type="submit" id="btn-submit-reschedule" class="btn btn-primary" style="display: flex; align-items: center; gap: 6px;">
                ${icon('check', { size: 14 })} <span>Simpan Jadwal Baru</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-reschedule')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('reschedule-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'reschedule-modal-overlay') slot.innerHTML = '';
  });

  const dateInput = document.getElementById('reschedule-new-date');
  const timeInput = document.getElementById('reschedule-new-time');
  const feedbackBox = document.getElementById('reschedule-slot-feedback');
  const feedbackText = document.getElementById('reschedule-feedback-text');
  const submitBtn = document.getElementById('btn-submit-reschedule');

  function updateSlotStatus() {
    const d = dateInput?.value;
    const t = timeInput?.value;
    if (!d || !t) return;

    const check = checkSlotAvailability(d, t, pax, order.id);
    if (check.available) {
      feedbackBox.style.background = '#ECFDF5';
      feedbackBox.style.borderColor = '#A7F3D0';
      feedbackBox.style.color = '#065F46';
      feedbackText.innerHTML = `<strong>Slot Tersedia!</strong> Kuota aman (${check.remainingCapacity} dari ${check.maxCapacity} pax tersisa dalam radius 2 jam).`;
      submitBtn.disabled = false;
    } else {
      feedbackBox.style.background = '#FEF2F2';
      feedbackBox.style.borderColor = '#FECACA';
      feedbackBox.style.color = '#991B1B';
      feedbackText.innerHTML = `<strong>Kunci Slot 2 Jam Aktif:</strong> ${escapeHtml(check.reason)}`;
      submitBtn.disabled = true;
    }
  }

  dateInput?.addEventListener('change', updateSlotStatus);
  timeInput?.addEventListener('input', updateSlotStatus);
  updateSlotStatus();

  document.getElementById('form-reschedule-booking')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newDate = dateInput.value;
    const newTime = timeInput.value;

    const validation = checkSlotAvailability(newDate, newTime, pax, order.id);
    if (!validation.available) {
      window.showToast?.(validation.reason, 'error');
      return;
    }

    const oldDate = order.order_date;
    const oldTime = order.order_time;

    // 1. OPTIMISTIC UI: Perbarui memori & tutup modal seketika
    order.order_date = newDate;
    order.booking_date = newDate;
    order.tour_date = newDate;
    order.order_time = `${newTime} WITA`;
    order.booking_time = `${newTime} WITA`;

    slot.innerHTML = '';
    window.showToast?.(`Jadwal ${order.order_code} berhasil diubah ke ${formatTanggal(newDate)} pk ${newTime} WITA!`, 'success');

    // 2. OPTIMISTIC DOM: Perbarui tampilan baris tabel & kartu seketika
    const rowEl = document.getElementById('order-row-' + order.id) || document.querySelector(`tr[data-id="${order.id}"]`);
    if (rowEl) {
      const scheduleCell = rowEl.children[4];
      if (scheduleCell) {
        scheduleCell.innerHTML = `
          <div class="tabular-nums" style="font-weight: 500; font-size: 0.82rem; color: var(--text-primary); display: flex; align-items: center; gap: 4px;">
            ${icon('calendar', { size: 13, strokeWidth: 1.5 })}
            <span>${formatTanggal(newDate)}</span>
          </div>
          <div class="tabular-nums" style="font-size: 0.72rem; color: var(--text-muted); margin-top: 1px; padding-left: 17px;">pk ${formatJam(newTime)} WITA</div>
        `;
      }
    }
    const cardEl = document.querySelector(`.booking-mobile-card[data-id="${order.id}"]`);
    if (cardEl) {
      const sched = cardEl.querySelector('.bmc-schedule');
      if (sched) {
        sched.innerHTML = `
          ${icon('calendar', { size: 12, strokeWidth: 1.5 })}
          <span>${formatTanggal(newDate)} • pk ${formatJam(newTime)} WITA</span>
        `;
      }
    }

    if (activeModule === 'dashboard' || activeModule === 'calendar') {
      renderActiveModule();
    }

    try {
      // 3. Kirim update ke Supabase di latar belakang
      await Promise.allSettled([
        supabase.from('bookings').update({
          booking_date: newDate,
          tour_date: newDate,
          booking_time: `${newTime} WITA`
        }).eq('id', order.id),
        supabase.from('orders').update({
          order_date: newDate,
          order_time: `${newTime} WITA`
        }).eq('id', order.id)
      ]);

      await logAuditEvent({
        action: 'RESCHEDULE_BOOKING',
        entity_type: 'orders',
        entity_id: order.id,
        details: `Jadwal ${order.order_code} dijadwalkan ulang ke ${newDate} pk ${newTime} WITA`
      });

      // Panggil ulang fetchBookingsSilently() setelah request API selesai sesuai realtimedatabase.md
      fetchBookingsSilently();
    } catch (err) {
      // Rollback jika gagal
      order.order_date = oldDate;
      order.booking_date = oldDate;
      order.tour_date = oldDate;
      order.order_time = oldTime;
      order.booking_time = oldTime;
      window.showToast?.(`Gagal reschedule: ${err.message}`, 'error');
      fetchBookingsSilently();
    }
  });
};

/**
 * Dialog Modal: Lihat Detail Booking & Catatan Khusus
 * Sesuai Spesifikasi Section 4.A & 6.3 di Penyelarasan.md (0% Pajak Tax-Free Nett, DOB Numerologi/Healing, WhatsApp)
 */
window.adminViewBookingDetail = function (orderId) {
  const slot = document.getElementById('dasbor-modals-slot');
  if (!slot) return;
  const order = ordersData.find(o => o.id === orderId);
  if (!order) return;

  const netIncome = calculateOrderNetIncome(order);
  const waLink = getDirectWhatsAppUrl(order);
  const parsed = parseBookingNotes(order.notes);
  const origin = order.customer_nationality || parsed.origin || 'Indonesia';
  const pax = order.pax || parsed.pax || 1;
  const rawTime = order.order_time || parsed.time || '09:00';
  const timeWita = rawTime.includes('WITA') ? rawTime : `${rawTime} WITA`;
  const isSpecialWellness = (order.service_id === 'SRV003' || order.service_id === 'SRV004' || (order.service_or_item || '').toLowerCase().includes('numerolog') || (order.service_or_item || '').toLowerCase().includes('healing'));

  slot.innerHTML = `
    <div class="modal-overlay" id="booking-detail-overlay">
      <div class="modal-dialog" style="max-width: 580px;">
        <div class="modal-header">
          <div>
            <div style="font-size: 0.72rem; color: var(--accent-brand); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Mahawellnessjourney Reservasi</div>
            <h3 class="modal-title" style="font-size: 1.15rem; font-weight: 600; margin-top: 2px;">
              ${escapeHtml(order.customer_name)}
            </h3>
          </div>
          <button class="btn-close-modal" id="btn-close-booking-detail">&times;</button>
        </div>

        <div class="modal-body" style="padding: 1.25rem;">
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 1.15rem;">
            <div style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase;">ID Booking &amp; Invoice</span>
              <div style="margin-top: 4px; display: flex; flex-direction: column; gap: 2px;">
                <span class="booking-id-mono" style="font-size: 0.78rem;">${order.order_code}</span>
                ${order.invoice_number ? `<span style="font-size: 0.72rem; color: var(--text-muted); font-family: monospace;">Inv: ${order.invoice_number}</span>` : ''}
              </div>
            </div>

            <div style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase;">Status Reservasi</span>
              <div style="margin-top: 5px;">${StatusBadge(order.status)}</div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.85rem; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 1rem; background: var(--bg-surface);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-secondary);">Paket / Layanan:</span>
              <strong style="color: var(--text-primary); text-align: right;">${escapeHtml(order.service_or_item)}</strong>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-secondary);">Jumlah Peserta (Pax):</span>
              <span style="font-weight: 600; color: var(--text-primary);">${pax} Orang</span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <span style="color: var(--text-secondary);">Sesi Pelaksanaan:</span>
              <div style="text-align: right;">
                <div class="tabular-nums" style="font-weight: 600; color: var(--text-primary);">${formatTanggal(order.order_date)} pk ${timeWita}</div>
                <div style="font-size: 0.72rem; color: #0D9488; display: inline-flex; align-items: center; gap: 4px; margin-top: 2px;">
                  ${icon('lockClock', { size: 12 })} <span>Kunci Sesi 2 Jam Eksklusif</span>
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-secondary);">Asal / Kebangsaan:</span>
              <span class="badge-subtle badge-confirmed" style="font-size: 0.75rem;">${escapeHtml(origin)}</span>
            </div>

            ${(parsed.dob || isSpecialWellness) ? `
              <div style="display: flex; justify-content: space-between; align-items: center; background: #F0FDFA; padding: 6px 10px; border-radius: 4px; border: 1px solid #CCFBF1;">
                <span style="color: #0F766E; font-size: 0.78rem; font-weight: 600;">Tanggal Lahir (DOB - Spiritual/Healing):</span>
                <span class="tabular-nums" style="font-weight: 700; color: #0D9488; font-size: 0.85rem;">${escapeHtml(parsed.dob || 'Belum Dilampirkan')}</span>
              </div>
            ` : ''}

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-secondary);">Kontak Tamu:</span>
              <span>
                ${waLink ? `
                  <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="table-wa-link" title="Chat WhatsApp Tamu">
                    ${icon('whatsapp', { size: 13, strokeWidth: 2 })} <span>${escapeHtml(order.customer_phone)}</span>
                  </a>
                ` : escapeHtml(order.customer_phone || '-')}
              </span>
            </div>

            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-secondary);">Email Tamu:</span>
              <span>${escapeHtml(order.customer_email || '-')}</span>
            </div>

            <!-- Rincian Biaya 100% Tax-Free Nett Sesuai Section 4.A & 6.3 -->
            <div style="border-top: 1px solid var(--border-subtle); padding-top: 0.65rem; margin-top: 0.25rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 3px;">
                <span style="color: var(--text-secondary);">Subtotal Biaya:</span>
                <span class="tabular-nums">${formatRupiah(order.subtotal_amount)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 3px;">
                <span style="color: var(--text-secondary);">Pajak (Tax):</span>
                <span style="color: #059669; font-weight: 500;">Rp 0 (100% Tax-Free Nett)</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.95rem; font-weight: 700; border-top: 1px dashed var(--border-subtle); padding-top: 4px; margin-top: 4px;">
                <span style="color: var(--text-primary);">Total Tagihan Nett:</span>
                <span class="tabular-nums" style="color: var(--text-primary);">${formatRupiah(netIncome)}</span>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-secondary);">Status Pembayaran:</span>
              <span style="font-weight: 600; color: ${order.payment_status === 'Lunas' ? '#047857' : '#B45309'};">${order.payment_status || 'Belum Dibayar'}</span>
            </div>

            ${(parsed.userNotes || order.notes) ? `
              <div style="border-top: 1px solid var(--border-subtle); padding-top: 0.5rem;">
                <span style="color: var(--text-secondary); display: block; font-size: 0.72rem; text-transform: uppercase;">Catatan Tambahan Tamu:</span>
                <p style="margin: 3px 0 0; color: var(--text-primary); font-size: 0.82rem; background: var(--bg-surface-elevated); padding: 6px 8px; border-radius: 4px; border: 1px solid var(--border-subtle);">${escapeHtml(parsed.userNotes || order.notes)}</p>
              </div>
            ` : ''}
          </div>

          <div style="margin-top: 1.25rem; display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap;">
            ${waLink ? `
              <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="color: #047857; gap: 5px;">
                ${icon('whatsapp', { size: 14, strokeWidth: 2 })} <span>Kirim WA</span>
              </a>
            ` : ''}
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('booking-detail-overlay')?.remove(); window.adminOpenRescheduleModal('${order.id}');">
              ${icon('calendar', { size: 14 })} <span>Reschedule</span>
            </button>
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('booking-detail-overlay')?.remove(); window.adminOpenEditOrder('${order.id}');">
              ${icon('edit', { size: 14 })} <span>Ubah Data</span>
            </button>
            <button type="button" class="btn btn-primary-action" onclick="document.getElementById('booking-detail-overlay')?.remove();">
              Tutup
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

/**
/**
 * Optimistic DOM Update: Perbarui Baris & Kartu di Layar Seketika Tanpa Menunggu Request Jaringan
 * Sesuai Bagian 3 pada realtimedatabase.md
 */
function optimisticUpdateOrderStatusDOM(orderId, newStatus, newPaymentStatus) {
  // 1. Baris Tabel Desktop
  const rowEl = document.getElementById('order-row-' + orderId) || document.querySelector(`tr[data-id="${orderId}"]`);
  if (rowEl && newStatus !== 'DELETED') {
    const statusCell = rowEl.children[5];
    if (statusCell) statusCell.innerHTML = StatusBadge(newStatus);
    const payCell = rowEl.children[6];
    if (payCell) {
      const target = ordersData.find(o => o.id === orderId);
      const netIncome = target ? calculateOrderNetIncome(target) : 0;
      payCell.innerHTML = `
        <div class="tabular-nums" style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${formatRupiah(netIncome)}</div>
        <div style="font-size: 0.72rem; color: ${newPaymentStatus === 'Lunas' ? '#047857' : '#B45309'}; font-weight: 600; margin-top: 1px;">${newPaymentStatus || 'Belum Dibayar'}</div>
      `;
    }
  }

  // 2. Kartu Responsif Mobile
  const cardEl = document.querySelector(`.booking-mobile-card[data-id="${orderId}"]`);
  if (cardEl && newStatus !== 'DELETED') {
    const cardStatus = cardEl.querySelector('.bmc-status');
    if (cardStatus) cardStatus.innerHTML = StatusBadge(newStatus);
    const payPill = cardEl.querySelector('.bmc-payment-pill');
    if (payPill) {
      payPill.textContent = newPaymentStatus || 'Belum Dibayar';
      payPill.className = `bmc-payment-pill ${newPaymentStatus === 'Lunas' ? 'paid' : 'unpaid'}`;
    }
  }

  // 3. Segmented Control Filter Badge Numbers
  const statusCounts = getStatusCounts();
  document.querySelectorAll('#status-segmented-control .segmented-btn').forEach(btn => {
    const st = btn.getAttribute('data-status') || 'ALL';
    const countSpan = btn.querySelector('.segmented-count');
    if (countSpan) countSpan.textContent = statusCounts[st] ?? 0;
  });

  // 4. Jika sedang di Dashboard, perbarui kartu KPI seketika
  if (activeModule === 'dashboard') {
    const viewport = document.getElementById('dasbor-viewport');
    if (viewport) {
      viewport.innerHTML = renderDashboardView();
      initDashboardEvents();
    }
  }
}

/**
 * Update Status Pesanan dengan Optimistic UI dan Idempotency Guard
 * Sesuai Section 3 di realtimedatabase.md & Section 6.4 di Penyelarasan.md
 */
window.adminChangeOrderStatus = async function (orderId, newStatus, showToastMessage = true) {
  const target = ordersData.find(o => o.id === orderId);
  if (!target) return;

  // Idempotency check: jika status sudah sama, hindari pemrosesan ganda
  if (target.status === newStatus && (newStatus !== 'Selesai' || target.payment_status === 'Lunas')) {
    if (showToastMessage) window.showToast?.(`Pesanan ${target.order_code} sudah berstatus "${newStatus}".`, 'info');
    return;
  }

  const oldStatus = target.status;
  const oldPaymentStatus = target.payment_status;

  // 1. OPTIMISTIC UI: Perbarui status di memori detik itu juga
  target.status = newStatus;
  if (newStatus === 'Selesai') target.payment_status = 'Lunas';
  if (newStatus === 'Dibatalkan') target.payment_status = 'Refund';

  // 2. OPTIMISTIC DOM: Perbarui tampilan tabel dan kartu di layar langsung (0ms delay)
  optimisticUpdateOrderStatusDOM(orderId, newStatus, target.payment_status);

  if (showToastMessage) {
    window.showToast?.(`Status ${target.order_code || 'booking'} diubah ke "${newStatus}"!`, 'success');
  }

  let bkgStatus = 'pending';
  if (newStatus === 'Selesai') bkgStatus = 'completed';
  else if (newStatus === 'Dikonfirmasi') bkgStatus = 'confirmed';
  else if (newStatus === 'Dibatalkan') bkgStatus = 'cancelled';

  // Idempotency Guard untuk Transaksi Finansial
  if (newStatus === 'Selesai' || target.payment_status === 'Lunas') {
    const existingTrx = transactionsData.find(t => t.source_id === orderId || t.transaction_code === 'TRX-' + (target.order_code || target.id));
    if (!existingTrx) {
      const newTrx = {
        id: 'trx-' + target.id,
        transaction_code: 'TRX-' + (target.order_code || target.id),
        transaction_date: target.order_date || new Date().toISOString().split('T')[0],
        type: 'income',
        category: 'Pendapatan Pesanan',
        description: `Pembayaran ${target.order_code} - ${target.customer_name}`,
        amount: target.subtotal_amount,
        source_type: 'order',
        source_id: target.id,
        payment_method: 'Transfer Bank / Online',
        is_closed: false,
        created_at: new Date().toISOString()
      };
      transactionsData.unshift(newTrx);
      supabase.from('financial_transactions').insert(newTrx);
    }
  }

  try {
    // 3. Kirim request update ke Supabase di latar belakang
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

    // Panggil ulang fungsi fetch data setelah request API selesai sesuai realtimedatabase.md
    fetchBookingsSilently();
  } catch (err) {
    // Rollback jika request gagal
    target.status = oldStatus;
    target.payment_status = oldPaymentStatus;
    optimisticUpdateOrderStatusDOM(orderId, oldStatus, oldPaymentStatus);
    if (showToastMessage) window.showToast?.(`Gagal update status: ${err.message}`, 'error');
    fetchBookingsSilently();
  }
};

window.adminDeleteOrder = async function (orderId) {
  // Pengecekan RBAC Server / Client (Section 10.D)
  if (!canDeleteBooking()) {
    window.showToast?.('Akses ditolak: Hanya peran Admin yang diizinkan menghapus data booking.', 'error');
    return;
  }

  const target = ordersData.find(o => o.id === orderId);
  const code = target?.order_code || orderId;

  // Wajib Dialog Konfirmasi
  if (!confirm(`Apakah Anda yakin ingin menghapus booking ${code} secara permanen dari database? Tindakan ini tidak dapat dibatalkan.`)) return;

  // 1. OPTIMISTIC UI: Hapus dari memori seketika
  const oldOrders = [...ordersData];
  ordersData = ordersData.filter(o => o.id !== orderId);
  selectedBookingIds.delete(orderId);

  // Perbarui badge counter di header seketika
  const badge = document.getElementById('badge-order-count');
  if (badge) badge.textContent = ordersData.length;
  const mobileBadge = document.getElementById('mobile-badge-order-count');
  if (mobileBadge) mobileBadge.textContent = ordersData.length;

  // 2. OPTIMISTIC DOM: Hilangkan baris tabel & kartu seketika dengan animasi halus
  const rowEl = document.getElementById('order-row-' + orderId) || document.querySelector(`tr[data-id="${orderId}"]`);
  if (rowEl) {
    rowEl.style.transition = 'opacity 0.2s, transform 0.2s';
    rowEl.style.opacity = '0';
    rowEl.style.transform = 'translateX(-10px)';
    setTimeout(() => rowEl.remove(), 200);
  }
  const cardEl = document.querySelector(`.booking-mobile-card[data-id="${orderId}"]`);
  if (cardEl) {
    cardEl.style.transition = 'opacity 0.2s';
    cardEl.style.opacity = '0';
    setTimeout(() => cardEl.remove(), 200);
  }

  // Perbarui angka filter status
  optimisticUpdateOrderStatusDOM(orderId, 'DELETED', '');
  window.showToast?.(`Booking ${code} berhasil dihapus!`, 'success');

  try {
    // 3. Kirim delete ke Supabase di latar belakang
    await Promise.allSettled([
      supabase.from('bookings').delete().eq('id', orderId),
      supabase.from('orders').delete().eq('id', orderId)
    ]);

    await logAuditEvent({
      action: 'DELETE_BOOKING',
      entity_type: 'orders',
      entity_id: orderId,
      details: `Booking ${code} dihapus secara permanen`
    });

    // Panggil ulang fetchBookingsSilently() setelah request API selesai
    fetchBookingsSilently();
  } catch (err) {
    // Rollback jika gagal
    ordersData = oldOrders;
    window.showToast?.(`Gagal menghapus booking: ${err.message}`, 'error');
    fetchBookingsSilently();
  }
};

window.adminOpenEditOrder = function (orderId) {
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
      }]).catch(() => { });

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

function initProfitEvents() { }

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
    const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(c.name)},%20kami%20dari%20Mahawellnessjourney%20Bali:` : null;

    return `
      <tr>
        <td>
          <div class="cust-cell-primary" style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
            <span>${escapeHtml(c.name)}</span>
            ${c.nationality ? `<span class="badge-subtle badge-confirmed" style="font-size: 0.68rem; padding: 1px 6px;">${escapeHtml(c.nationality)}</span>` : ''}
          </div>
          <div class="cust-cell-secondary">
            ${c.dob ? `<span style="color: #0D9488; font-weight: 600;">DOB: ${escapeHtml(c.dob)}</span> &bull; ` : ''}${escapeHtml(c.notes || '-')}
          </div>
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

window.adminViewCustomerOrders = function (customerId) {
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
  const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(customer.name)},%20kami%20dari%20admin%20Mahawellnessjourney%20Bali:` : null;

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
  const costData = [5200000, 6100000, 6900000, 5800000, 7900000, 8800000, 9900000, 8500000, 7200000, 1220000, 0, 0];
  const profitData = revenueData.map((rev, idx) => rev - costData[idx]);

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
        source_name: 'Website Utama (Mahawellnessjourney)',
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
function showAddOrderModal(sourceType = 'whatsapp', defaultDate = null, defaultTime = null) {
  const slot = document.getElementById('dasbor-modals-slot');
  if (!slot) return;

  const nextCode = `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(ordersData.length + 1).padStart(3, '0')}`;
  const today = defaultDate || new Date().toISOString().split('T')[0];
  const initialTime = defaultTime ? (defaultTime.replace(/[^0-9:]/g, '').slice(0, 5)) : '09:00';

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
                <label class="form-label">Jam Sesi (WITA — Kunci 2 Jam):</label>
                <input type="time" id="inp-order-time" class="form-input" value="${initialTime}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Jumlah Tamu (Pax):</label>
                <input type="number" id="inp-order-pax" class="form-input" value="1" min="1" max="10" required />
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
              <textarea id="inp-order-notes" class="form-textarea" rows="2" placeholder="Catatan khusus dari chat WhatsApp atau preferensi tamu..."></textarea>
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
    const rawTime = document.getElementById('inp-order-time')?.value || '09:00';
    const pax = Number(document.getElementById('inp-order-pax')?.value || 1);
    const name = document.getElementById('inp-order-cust-name')?.value.trim();
    const phone = document.getElementById('inp-order-cust-phone')?.value.trim();
    const item = document.getElementById('inp-order-item')?.value.trim();
    const amount = Number(document.getElementById('inp-order-amount')?.value || 0);
    const discount = Number(document.getElementById('inp-order-discount')?.value || 0);
    const status = document.getElementById('inp-order-status')?.value;
    const payStatus = document.getElementById('inp-order-pay-status')?.value;
    const notes = document.getElementById('inp-order-notes')?.value.trim();

    // Validasi tabrakan slot 2 jam (2-Hour Booking Lock)
    const slotCheck = checkSlotAvailability(date, rawTime, pax);
    if (!slotCheck.available) {
      const proceed = confirm(`Peringatan Kunci Sesi 2 Jam:\n${slotCheck.reason}\n\nTetap lanjutkan menyimpan pesanan ini?`);
      if (!proceed) return;
    }

    try {
      // 1. Simpan/Cek Pelanggan
      let cust = customersData.find(c => c.phone === phone || c.name.toLowerCase() === name.toLowerCase());
      if (!cust) {
        const { data: newCust } = await supabase.from('customers').insert([{
          name,
          phone,
          phone_normalized: phone.replace(/[^0-9]/g, ''),
          notes: 'Dibuat dari form pesanan admin'
        }]).select();
        if (newCust && newCust[0]) cust = newCust[0];
      }

      // 2. Simpan Pesanan (Sync ke tabel bookings & orders)
      const bkgStatus = (payStatus === 'Lunas' || status === 'Selesai') ? 'paid' : (status === 'Dibatalkan' ? 'cancelled' : 'pending');
      const timeFormatted = `${rawTime} WITA`;
      const bookingPayload = {
        invoice: code,
        customer_name: name,
        customer_phone: phone,
        service_name: item,
        total_price: Math.max(0, amount - discount),
        booking_date: date,
        booking_time: timeFormatted,
        pax,
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
          source: sourceType,
          order_date: date,
          order_time: timeFormatted,
          pax,
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
        details: `Pesanan ${code} (${pax} pax, ${date} pk ${timeFormatted}) berhasil dibuat`
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

window.adminOpenOrderCosts = function (orderId) {
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

window.adminDeleteCost = async function (costId, orderId) {
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
            <div class="form-group" style="margin-bottom: 0.85rem;">
              <label class="form-label">Nama Lengkap:</label>
              <input type="text" id="cust-new-name" class="form-input" placeholder="Contoh: I Wayan Sudarta" required />
            </div>
            <div class="form-grid-2" style="margin-bottom: 0.85rem;">
              <div class="form-group">
                <label class="form-label">Nomor WhatsApp / Telepon:</label>
                <input type="tel" id="cust-new-phone" class="form-input" placeholder="6281234567890" required />
              </div>
              <div class="form-group">
                <label class="form-label">Alamat Email:</label>
                <input type="email" id="cust-new-email" class="form-input" placeholder="email@gmail.com" />
              </div>
            </div>
            <div class="form-grid-2" style="margin-bottom: 0.85rem;">
              <div class="form-group">
                <label class="form-label">Asal / Kebangsaan:</label>
                <input type="text" id="cust-new-nat" class="form-input" placeholder="Indonesia / Australia" />
              </div>
              <div class="form-group">
                <label class="form-label">Tanggal Lahir (DOB):</label>
                <input type="date" id="cust-new-dob" class="form-input" />
              </div>
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
    const nat = document.getElementById('cust-new-nat')?.value.trim();
    const dob = document.getElementById('cust-new-dob')?.value;
    const addr = document.getElementById('cust-new-addr')?.value.trim();

    try {
      await supabase.from('customers').insert([{
        name,
        phone,
        phone_normalized: phone.replace(/[^0-9]/g, ''),
        email,
        nationality: nat || 'Indonesia',
        dob: dob || '',
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

  const nextCode = `TRX-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(transactionsData.length + 1).padStart(3, '0')}`;
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

let silentPollingInterval = null;
let isRealtimeListenerSetup = false;

function setupRealtime() {
  // 1. Bersihkan subscription channel lama jika ada
  if (realtimeChannel) {
    try { supabase.removeChannel(realtimeChannel); } catch { }
    try { realtimeChannel.unsubscribe(); } catch { }
    realtimeChannel = null;
  }

  // 1. Supabase Realtime WebSocket Listener (Utama)
  try {
    realtimeChannel = supabase
      .channel('admin-realtime-bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          console.log('[Supabase Realtime bookings]', payload);
          if (payload.eventType === 'INSERT' && payload.new) {
            const newRow = payload.new;
            const id = newRow.id || newRow.booking_id || newRow.invoice_number;
            if (id && !knownBookingIds.has(id)) {
              knownBookingIds.add(id);
              if (isSoundEnabled()) {
                playBookingNotificationSound();
              }
              showBookingAlertToast({
                booking_id: newRow.invoice_number || newRow.booking_id || newRow.id || id,
                customer_name: newRow.customer_name || 'Tamu Baru',
                package_name: newRow.package_name || newRow.service_name || 'Paket Wellness',
                booking_date: newRow.booking_date || newRow.tour_date || '-',
                booking_time: newRow.booking_time || '-',
                pax: newRow.pax || 1,
                total_amount: newRow.total_amount || newRow.total_price || 0
              });
            }
          }
          fetchBookingsSilently();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('[Supabase Realtime orders]', payload);
          if (payload.eventType === 'INSERT' && payload.new) {
            const newRow = payload.new;
            const id = newRow.id || newRow.order_code;
            if (id && !knownBookingIds.has(id)) {
              knownBookingIds.add(id);
              if (isSoundEnabled()) {
                playBookingNotificationSound();
              }
              showBookingAlertToast({
                booking_id: newRow.order_code || newRow.id || id,
                customer_name: newRow.customer_name || 'Tamu Baru',
                package_name: newRow.service_or_item || 'Paket Wellness',
                booking_date: newRow.order_date || '-',
                booking_time: newRow.order_time || '-',
                pax: newRow.pax || 1,
                total_amount: newRow.subtotal_amount || 0
              });
            }
          }
          fetchBookingsSilently();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => {
          console.log('[Supabase Realtime payments]');
          fetchBookingsSilently();
        }
      )
      .subscribe((status) => {
        console.log('[Realtime Subscription Status]:', status);
      });
  } catch (err) {
    console.warn('[Realtime] WebSocket error:', err);
  }

  // 2. Silent Background Polling (Cadangan Anti-Gagal setiap 7 detik)
  if (silentPollingInterval) {
    clearInterval(silentPollingInterval);
  }
  silentPollingInterval = setInterval(() => {
    fetchBookingsSilently();
  }, 7000);

  // 3. Window Focus & Visibility Change Listener (Hanya didaftarkan sekali)
  if (!isRealtimeListenerSetup && typeof window !== 'undefined') {
    isRealtimeListenerSetup = true;

    window.addEventListener('focus', () => {
      fetchBookingsSilently();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        fetchBookingsSilently();
      }
    });

    window.addEventListener('storage', (e) => {
      if (e.key && (e.key.includes('booking') || e.key.includes('order') || e.key.includes('payment'))) {
        fetchBookingsSilently();
      }
    });

    window.addEventListener('booking-submitted', (e) => {
      const b = e.detail;
      if (b) {
        const id = b.id || b.booking_id || b.invoice_number;
        if (id && !knownBookingIds.has(id)) {
          knownBookingIds.add(id);
          if (isSoundEnabled()) {
            playBookingNotificationSound();
          }
          showBookingAlertToast({
            booking_id: id,
            customer_name: b.customer_name || 'Tamu Baru',
            package_name: b.service_name || b.package_name || 'Paket Wellness',
            booking_date: b.booking_date || '-',
            booking_time: b.booking_time || '-',
            pax: b.pax || 1,
            total_amount: b.total_price || b.total_amount || 0
          });
        }
      }
      fetchBookingsSilently();
    });
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
  } catch (e) { }
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

