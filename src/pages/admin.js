/**
 * Web Admin Dashboard Page
 * Sacred Journey Bali — Supabase Admin Dashboard
 * Features:
 * - Realtime SELECT from `bookings` table
 * - Realtime UPDATE status (`Confirmed`, `Pending`, `Cancelled`)
 * - DELETE booking
 * - Supabase Auth (Login/Logout)
 * - Supabase Realtime channel subscription
 * - Search, filter, and KPI summary statistics
 */

import { 
  supabase, 
  isUsingMock, 
  getSupabaseCredentials, 
  saveSupabaseCredentials, 
  clearSupabaseCredentials,
  testSupabaseConnection 
} from '../supabaseClient.js';

let allBookings = [];
let filteredBookings = [];
let realtimeChannel = null;
let currentSearch = '';
let currentStatusFilter = 'ALL';
let currentUser = null;

export function renderAdminPage() {
  const isMock = isUsingMock();
  const { url, isConfigured } = getSupabaseCredentials();

  return `
    <div class="admin-dashboard-container">
      
      <!-- Top Action Bar -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <h2 style="font-family: var(--font-heading); font-size: 1.85rem; font-weight: 800; color: #FFFFFF;">
            Dashboard Web Admin
          </h2>
          <p style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 2px;">
            Pantau dan kelola seluruh reservasi pelanggan secara real-time melalui database Supabase.
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
          <!-- Supabase Connection Config Trigger -->
          <button id="btn-open-db-config" class="btn btn-secondary" title="Konfigurasi Kredensial Supabase">
            <span style="font-size: 1.1rem;">⚡</span>
            <span>Konfigurasi Supabase</span>
          </button>

          <!-- Supabase SQL Script Viewer Trigger -->
          <button id="btn-view-sql" class="btn btn-outline-gold" title="Lihat Script SQL Supabase">
            <span>📜</span>
            <span>Script SQL Schema</span>
          </button>

          <!-- Refresh Button -->
          <button id="btn-refresh-bookings" class="btn btn-secondary" title="Muat Ulang Data">
            <span id="refresh-icon">🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <!-- Auth Banner & Live Connection Info -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; padding: 0.85rem 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); margin-bottom: 1.5rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span class="status-dot ${isConfigured ? 'live' : 'demo'}"></span>
          <span style="font-size: 0.85rem; font-weight: 600;">
            ${isConfigured 
              ? `<span style="color: var(--status-confirmed);">Terkoneksi ke Supabase Live:</span> <span style="font-family: monospace; color: var(--text-muted); font-size: 0.8rem;">${url}</span>`
              : `<span style="color: var(--status-pending);">Mode Demo Browser Aktif:</span> Data tersimpan lokal. Masukkan Kredensial Supabase untuk terhubung ke cloud.`
            }
          </span>
        </div>

        <div id="admin-auth-widget" style="display: flex; align-items: center; gap: 0.75rem; font-size: 0.82rem;">
          <!-- Rendered via JS -->
          <span style="color: var(--text-muted);">Memeriksa status sesi...</span>
        </div>
      </div>

      <!-- KPI Metrics Grid -->
      <div class="kpi-grid">
        <div class="kpi-card kpi-total">
          <div class="kpi-icon-wrap">📋</div>
          <div class="kpi-info">
            <span class="kpi-label">Total Pesanan</span>
            <span id="kpi-total-val" class="kpi-value">0</span>
          </div>
        </div>

        <div class="kpi-card kpi-pending">
          <div class="kpi-icon-wrap">⏳</div>
          <div class="kpi-info">
            <span class="kpi-label">Pending (Review)</span>
            <span id="kpi-pending-val" class="kpi-value">0</span>
          </div>
        </div>

        <div class="kpi-card kpi-confirmed">
          <div class="kpi-icon-wrap">✅</div>
          <div class="kpi-info">
            <span class="kpi-label">Terkonfirmasi</span>
            <span id="kpi-confirmed-val" class="kpi-value">0</span>
          </div>
        </div>

        <div class="kpi-card kpi-cancelled">
          <div class="kpi-icon-wrap">❌</div>
          <div class="kpi-info">
            <span class="kpi-label">Dibatalkan</span>
            <span id="kpi-cancelled-val" class="kpi-value">0</span>
          </div>
        </div>
      </div>

      <!-- Bookings Table Card -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">
              <span>Daftar Pesanan Masuk</span>
              <span id="table-count-badge" style="font-size: 0.75rem; background: var(--bg-surface-elevated); padding: 2px 8px; border-radius: var(--radius-full); color: var(--gold-light); font-weight: 700;">
                0 Pesanan
              </span>
            </h3>
            <p class="card-desc">Tabel otomatis diperbarui saat ada reservasi baru via Supabase Realtime.</p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: var(--status-confirmed); font-weight: 600; background: var(--status-confirmed-bg); padding: 0.35rem 0.75rem; border-radius: var(--radius-full);">
            <span class="status-dot live"></span>
            <span>Real-time Live Sync</span>
          </div>
        </div>

        <!-- Table Toolbar -->
        <div class="table-toolbar">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              id="admin-search-input" 
              class="search-input" 
              placeholder="Cari nama, email, atau layanan..." 
            />
          </div>

          <div class="filter-group">
            <label style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 600;">Status:</label>
            <select id="admin-status-filter" class="select-input">
              <option value="ALL">Semua Status</option>
              <option value="Pending">Pending (Menunggu)</option>
              <option value="Confirmed">Confirmed (Terkonfirmasi)</option>
              <option value="Cancelled">Cancelled (Dibatalkan)</option>
            </select>
          </div>
        </div>

        <!-- Table View -->
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Pemesan</th>
                <th>Paket Layanan</th>
                <th>Tanggal Pelaksanaan</th>
                <th>Status</th>
                <th>Waktu Transaksi</th>
                <th style="text-align: right;">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody id="bookings-tbody">
              <!-- Rendered via JS -->
              <tr>
                <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                  <div class="spinner spinner-light" style="margin: 0 auto 0.75rem;"></div>
                  Memuat data dari Supabase...
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

    </div>

    <!-- Modals Container -->
    <div id="admin-modals-slot"></div>
  `;
}

/**
 * Initialize Admin Page Logic & Subscriptions
 */
export async function initAdminPage() {
  setupEventListeners();
  await checkAuthSession();
  await fetchBookings();
  setupRealtimeSubscription();
}

/**
 * Event Listeners Setup
 */
function setupEventListeners() {
  const refreshBtn = document.getElementById('btn-refresh-bookings');
  const searchInput = document.getElementById('admin-search-input');
  const statusFilter = document.getElementById('admin-status-filter');
  const btnConfig = document.getElementById('btn-open-db-config');
  const btnSql = document.getElementById('btn-view-sql');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      const icon = document.getElementById('refresh-icon');
      if (icon) icon.style.display = 'inline-block';
      await fetchBookings();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.toLowerCase().trim();
      applyFilters();
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      currentStatusFilter = e.target.value;
      applyFilters();
    });
  }

  if (btnConfig) {
    btnConfig.addEventListener('click', () => showConfigModal());
  }

  if (btnSql) {
    btnSql.addEventListener('click', () => showSqlModal());
  }

  // Global event listener for Supabase Config dialog request
  window.addEventListener('open-supabase-config', () => {
    showConfigModal();
  });

  // Global event when booking submitted in other tab
  window.addEventListener('booking-submitted', (e) => {
    fetchBookings();
  });
}

/**
 * Check Supabase User Auth Session
 */
async function checkAuthSession() {
  const authWidget = document.getElementById('admin-auth-widget');
  if (!authWidget) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;

    if (user) {
      authWidget.innerHTML = `
        <span style="color: var(--text-secondary);">Login sebagai:</span>
        <strong style="color: var(--gold-light);">${user.email}</strong>
        <button id="btn-auth-logout" class="btn btn-action" style="padding: 3px 8px; font-size: 0.75rem;">
          🚪 Logout
        </button>
      `;
      document.getElementById('btn-auth-logout')?.addEventListener('click', handleLogout);
    } else {
      authWidget.innerHTML = `
        <span style="color: var(--text-muted);">Sesi: Anonim / Demo</span>
        <button id="btn-auth-login" class="btn btn-primary" style="padding: 4px 10px; font-size: 0.78rem;">
          🔐 Login Admin
        </button>
      `;
      document.getElementById('btn-auth-login')?.addEventListener('click', showLoginModal);
    }
  } catch (err) {
    console.warn('Auth check error:', err);
    authWidget.innerHTML = `
      <span style="color: var(--text-muted);">Mode Tamu</span>
      <button id="btn-auth-login" class="btn btn-primary" style="padding: 4px 10px; font-size: 0.78rem;">
        🔐 Login Admin
      </button>
    `;
    document.getElementById('btn-auth-login')?.addEventListener('click', showLoginModal);
  }
}

/**
 * Logout Handler
 */
async function handleLogout() {
  await supabase.auth.signOut();
  currentUser = null;
  window.showToast?.('Berhasil logout dari sesi admin.', 'info');
  await checkAuthSession();
  await fetchBookings();
}

/**
 * Fetch Bookings via SELECT
 */
async function fetchBookings() {
  const tbody = document.getElementById('bookings-tbody');

  try {
    console.log('Fetching bookings from Supabase table: bookings');
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    allBookings = data || [];
    applyFilters();
    updateKPIs();

  } catch (err) {
    console.error('Error fetching bookings:', err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--status-cancelled);">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
            <strong>Gagal Memuat Data Supabase:</strong> ${err.message || 'Koneksi terputus'}<br/>
            <small style="color: var(--text-muted); display: block; margin-top: 4px;">
              Jika menggunakan RLS, pastikan policy SELECT untuk role authenticated/anon sudah dibuat di Supabase.
            </small>
            <button id="btn-retry-fetch" class="btn btn-secondary" style="margin-top: 1rem; font-size: 0.8rem;">
              Coba Lagi
            </button>
          </td>
        </tr>
      `;
      document.getElementById('btn-retry-fetch')?.addEventListener('click', fetchBookings);
    }
  }
}

/**
 * Filter bookings based on search & status filter
 */
function applyFilters() {
  filteredBookings = allBookings.filter(b => {
    // Status Filter
    if (currentStatusFilter !== 'ALL' && b.status !== currentStatusFilter) {
      return false;
    }
    // Search query
    if (currentSearch) {
      const matchName = (b.customer_name || '').toLowerCase().includes(currentSearch);
      const matchEmail = (b.customer_email || '').toLowerCase().includes(currentSearch);
      const matchService = (b.service_name || '').toLowerCase().includes(currentSearch);
      return matchName || matchEmail || matchService;
    }
    return true;
  });

  renderTableRows(filteredBookings);

  const badge = document.getElementById('table-count-badge');
  if (badge) badge.textContent = `${filteredBookings.length} Pesanan`;
}

/**
 * Update KPI Summary Cards
 */
function updateKPIs() {
  const total = allBookings.length;
  const pending = allBookings.filter(b => b.status === 'Pending').length;
  const confirmed = allBookings.filter(b => b.status === 'Confirmed').length;
  const cancelled = allBookings.filter(b => b.status === 'Cancelled').length;

  const totalEl = document.getElementById('kpi-total-val');
  const pendingEl = document.getElementById('kpi-pending-val');
  const confirmedEl = document.getElementById('kpi-confirmed-val');
  const cancelledEl = document.getElementById('kpi-cancelled-val');

  if (totalEl) totalEl.textContent = total;
  if (pendingEl) pendingEl.textContent = pending;
  if (confirmedEl) confirmedEl.textContent = confirmed;
  if (cancelledEl) cancelledEl.textContent = cancelled;
}

/**
 * Render Data Table Rows
 */
function renderTableRows(bookings) {
  const tbody = document.getElementById('bookings-tbody');
  if (!tbody) return;

  if (bookings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <div class="empty-icon">📂</div>
            <div class="empty-title">Tidak Ada Pesanan Ditemukan</div>
            <div class="empty-desc">
              ${currentSearch || currentStatusFilter !== 'ALL' 
                ? 'Tidak ada pesanan yang sesuai dengan filter pencarian.' 
                : 'Belum ada data reservasi masuk di tabel bookings.'}
            </div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = bookings.map(b => {
    const initials = (b.customer_name || 'U')
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();

    const formattedDate = b.booking_date 
      ? new Date(b.booking_date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
      : '-';

    const formattedCreatedAt = b.created_at
      ? new Date(b.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '-';

    const statusClass = (b.status || 'pending').toLowerCase();

    return `
      <tr data-booking-id="${b.id}">
        <!-- Customer -->
        <td>
          <div class="customer-cell">
            <div class="customer-avatar">${initials}</div>
            <div class="customer-meta">
              <span class="customer-name">${escapeHtml(b.customer_name || 'Anonim')}</span>
              <span class="customer-email">${escapeHtml(b.customer_email || '-')}</span>
            </div>
          </div>
        </td>

        <!-- Service -->
        <td>
          <span class="service-badge">
            <span>✨</span>
            <span>${escapeHtml(b.service_name || 'Layanan')}</span>
          </span>
        </td>

        <!-- Booking Date -->
        <td>
          <span style="font-weight: 600; color: #FFFFFF;">📅 ${formattedDate}</span>
        </td>

        <!-- Status -->
        <td>
          <span class="status-pill ${statusClass}">
            <span class="status-pill-dot"></span>
            <span>${b.status || 'Pending'}</span>
          </span>
        </td>

        <!-- Created At -->
        <td>
          <span style="font-size: 0.8rem; color: var(--text-muted);">${formattedCreatedAt}</span>
        </td>

        <!-- Actions -->
        <td>
          <div class="action-buttons" style="justify-content: flex-end;">
            ${b.status !== 'Confirmed' ? `
              <button 
                class="btn-action confirm" 
                title="Konfirmasi Pesanan" 
                onclick="window.updateBookingStatus('${b.id}', 'Confirmed')"
              >
                <span>✅ Konfirmasi</span>
              </button>
            ` : ''}

            ${b.status !== 'Pending' ? `
              <button 
                class="btn-action pending" 
                title="Kembalikan ke Pending" 
                onclick="window.updateBookingStatus('${b.id}', 'Pending')"
              >
                <span>⏳ Pending</span>
              </button>
            ` : ''}

            ${b.status !== 'Cancelled' ? `
              <button 
                class="btn-action cancel" 
                title="Batalkan Pesanan" 
                onclick="window.updateBookingStatus('${b.id}', 'Cancelled')"
              >
                <span>❌ Batal</span>
              </button>
            ` : ''}

            <!-- Direct Contact (WhatsApp/Email) -->
            <a 
              href="mailto:${encodeURIComponent(b.customer_email || '')}?subject=Konfirmasi%20Booking%20Sacred%20Journey%20Bali"
              class="btn-action" 
              title="Kirim Email ke Pemesan"
              target="_blank"
            >
              <span>✉️</span>
            </a>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Global update status function attached to window
 */
window.updateBookingStatus = async function(bookingId, newStatus) {
  try {
    console.log(`Mengubah status pesanan ID: ${bookingId} menjadi: ${newStatus}`);

    // Optimistic UI update
    const target = allBookings.find(b => b.id === bookingId);
    const oldStatus = target ? target.status : null;
    if (target) {
      target.status = newStatus;
      applyFilters();
      updateKPIs();
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId)
      .select();

    if (error) {
      // Revert optimistic update
      if (target && oldStatus) {
        target.status = oldStatus;
        applyFilters();
        updateKPIs();
      }
      throw error;
    }

    window.showToast?.(`Status pesanan berhasil diubah menjadi "${newStatus}"!`, 'success');

  } catch (err) {
    console.error('Error saat update status booking:', err);
    window.showToast?.(`Gagal update status: ${err.message}`, 'error');
  }
};

/**
 * Setup Supabase Realtime Listener
 */
function setupRealtimeSubscription() {
  if (realtimeChannel) {
    try { realtimeChannel.unsubscribe(); } catch {}
  }

  try {
    realtimeChannel = supabase
      .channel('public:bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          console.log('⚡ Realtime event received:', payload);
          handleRealtimeEvent(payload);
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });
  } catch (err) {
    console.warn('Realtime subscription not supported or failed:', err);
  }
}

function handleRealtimeEvent(payload) {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  if (eventType === 'INSERT') {
    // Add to top of list
    const exists = allBookings.some(b => b.id === newRecord.id);
    if (!exists) {
      allBookings.unshift(newRecord);
      applyFilters();
      updateKPIs();
      window.showToast?.(`✨ Pesanan Baru Masuk: ${newRecord.customer_name} (${newRecord.service_name})`, 'realtime');
    }
  } else if (eventType === 'UPDATE') {
    const idx = allBookings.findIndex(b => b.id === newRecord.id);
    if (idx !== -1) {
      allBookings[idx] = newRecord;
      applyFilters();
      updateKPIs();
      window.showToast?.(`🔄 Status Pesanan ${newRecord.customer_name} diperbarui menjadi ${newRecord.status}`, 'info');
    }
  } else if (eventType === 'DELETE') {
    allBookings = allBookings.filter(b => b.id !== oldRecord.id);
    applyFilters();
    updateKPIs();
  }
}

/**
 * Modal: Supabase Connection Configuration
 */
function showConfigModal() {
  const slot = document.getElementById('admin-modals-slot');
  if (!slot) return;

  const { url, anonKey } = getSupabaseCredentials();

  slot.innerHTML = `
    <div class="modal-overlay" id="config-modal-overlay">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="card-title">
            <span>⚡ Konfigurasi Koneksi Supabase</span>
          </h3>
          <button class="btn-close-modal" id="btn-close-config">&times;</button>
        </div>

        <div class="modal-body">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
            Masukkan URL Project dan Anon Public Key dari Dashboard Supabase Anda (Menu <strong>Project Settings > API</strong>).
          </p>

          <form id="form-supabase-config">
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label">Project URL (Supabase URL):</label>
              <input 
                type="url" 
                id="cfg-url" 
                class="form-input" 
                placeholder="https://xyzcompany.supabase.co" 
                value="${url || ''}"
                required
              />
            </div>

            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label">Project API Key (Anon / Public Key):</label>
              <input 
                type="text" 
                id="cfg-key" 
                class="form-input" 
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..." 
                value="${anonKey || ''}"
                required
              />
            </div>

            <div id="test-connection-result" style="display: none; margin-bottom: 1rem;"></div>

            <div style="display: flex; gap: 0.75rem; margin-top: 1.25rem;">
              <button type="button" id="btn-test-connection" class="btn btn-secondary" style="flex: 1;">
                🧪 Tes Koneksi
              </button>
              <button type="submit" class="btn btn-primary" style="flex: 1;">
                💾 Simpan & Sambungkan
              </button>
            </div>
          </form>

          ${url ? `
            <div style="margin-top: 1.5rem; text-align: center; border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
              <button type="button" id="btn-reset-to-demo" class="btn-action" style="color: var(--status-cancelled);">
                Kembalikan ke Mode Demo Browser
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  // Handlers
  document.getElementById('btn-close-config')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('config-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'config-modal-overlay') slot.innerHTML = '';
  });

  const form = document.getElementById('form-supabase-config');
  const btnTest = document.getElementById('btn-test-connection');
  const resultDiv = document.getElementById('test-connection-result');
  const btnReset = document.getElementById('btn-reset-to-demo');

  btnTest?.addEventListener('click', async () => {
    const inputUrl = document.getElementById('cfg-url')?.value.trim();
    const inputKey = document.getElementById('cfg-key')?.value.trim();

    if (!inputUrl || !inputKey) {
      showResult('error', 'Silakan masukkan URL dan Anon Key terlebih dahulu.');
      return;
    }

    btnTest.disabled = true;
    btnTest.textContent = 'Menguji...';
    showResult('info', 'Menghubungkan ke Supabase...');

    const res = await testSupabaseConnection(inputUrl, inputKey);
    btnTest.disabled = false;
    btnTest.textContent = '🧪 Tes Koneksi';

    if (res.success) {
      showResult('success', res.message);
    } else {
      showResult('error', `Gagal: ${res.message}`);
    }
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const inputUrl = document.getElementById('cfg-url')?.value.trim();
    const inputKey = document.getElementById('cfg-key')?.value.trim();

    saveSupabaseCredentials(inputUrl, inputKey);
    window.showToast?.('Kredensial Supabase berhasil disimpan! Memuat ulang...', 'success');
    slot.innerHTML = '';
    setTimeout(() => { window.location.reload(); }, 600);
  });

  btnReset?.addEventListener('click', () => {
    if (confirm('Apakah Anda ingin menghapus kredensial Supabase dan kembali ke Demo Browser?')) {
      clearSupabaseCredentials();
      window.showToast?.('Kredensial dihapus. Kembali ke mode demo.', 'info');
      slot.innerHTML = '';
      setTimeout(() => { window.location.reload(); }, 500);
    }
  });

  function showResult(type, msg) {
    if (!resultDiv) return;
    resultDiv.style.display = 'block';
    resultDiv.className = `alert alert-${type}`;
    resultDiv.innerHTML = `<span>${type === 'success' ? '✅' : '⚠️'}</span><div>${msg}</div>`;
  }
}

/**
 * Modal: SQL Schema Viewer
 */
function showSqlModal() {
  const slot = document.getElementById('admin-modals-slot');
  if (!slot) return;

  const sqlScript = `-- 1. Buat Tabel bookings
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    service_name TEXT NOT NULL,
    booking_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 3. Policy INSERT untuk role anon (Pengunjung Form Booking)
CREATE POLICY "Allow anonymous insert" 
ON public.bookings FOR INSERT TO anon WITH CHECK (true);

-- 4. Policy SELECT & UPDATE untuk role authenticated (Admin)
CREATE POLICY "Allow authenticated select" 
ON public.bookings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated update" 
ON public.bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 5. Aktifkan Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;`;

  slot.innerHTML = `
    <div class="modal-overlay" id="sql-modal-overlay">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="card-title">
            <span>📜 Supabase SQL Migration Script</span>
          </h3>
          <button class="btn-close-modal" id="btn-close-sql">&times;</button>
        </div>

        <div class="modal-body">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
            Jalankan script ini di menu <strong>SQL Editor</strong> di dashboard Supabase Anda untuk membuat tabel, mengaktifkan RLS, dan mengaktifkan Realtime.
          </p>

          <pre class="code-box" id="sql-code-box">${escapeHtml(sqlScript)}</pre>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem;">
            <button id="btn-copy-sql" class="btn btn-primary">
              📋 Salin Script SQL
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-sql')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('sql-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'sql-modal-overlay') slot.innerHTML = '';
  });

  const btnCopy = document.getElementById('btn-copy-sql');
  btnCopy?.addEventListener('click', () => {
    navigator.clipboard.writeText(sqlScript);
    btnCopy.textContent = '✅ Berhasil Disalin!';
    setTimeout(() => { btnCopy.textContent = '📋 Salin Script SQL'; }, 2000);
    window.showToast?.('Script SQL berhasil disalin ke clipboard!', 'success');
  });
}

/**
 * Modal: Admin Auth Login
 */
function showLoginModal() {
  const slot = document.getElementById('admin-modals-slot');
  if (!slot) return;

  slot.innerHTML = `
    <div class="modal-overlay" id="login-modal-overlay">
      <div class="modal-dialog" style="max-width: 440px;">
        <div class="modal-header">
          <h3 class="card-title">
            <span>🔐 Login Admin Supabase</span>
          </h3>
          <button class="btn-close-modal" id="btn-close-login">&times;</button>
        </div>

        <div class="modal-body">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
            Masuk dengan akun yang telah dibuat di menu <strong>Authentication > Users</strong> Supabase.
          </p>

          <div id="login-alert-box" style="display: none; margin-bottom: 1rem;"></div>

          <form id="form-admin-login">
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label">Email Admin:</label>
              <input 
                type="email" 
                id="login-email" 
                class="form-input" 
                placeholder="admin@sacredjourneybali.com" 
                value="admin@sacredjourneybali.com"
                required
              />
            </div>

            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label class="form-label">Password:</label>
              <input 
                type="password" 
                id="login-password" 
                class="form-input" 
                placeholder="••••••••" 
                value="admin123"
                required
              />
            </div>

            <button type="submit" id="btn-submit-login" class="btn btn-primary" style="width: 100%;">
              <span>Masuk Dashboard</span>
            </button>
          </form>

          <p style="margin-top: 1rem; text-align: center; font-size: 0.78rem; color: var(--text-muted);">
            💡 Dalam mode demo, Anda dapat langsung login dengan email dan password apa saja (min. 6 karakter).
          </p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-login')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('login-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'login-modal-overlay') slot.innerHTML = '';
  });

  const form = document.getElementById('form-admin-login');
  const alertBox = document.getElementById('login-alert-box');
  const submitBtn = document.getElementById('btn-submit-login');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Memverifikasi...';

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      window.showToast?.('Berhasil login sebagai Admin!', 'success');
      slot.innerHTML = '';
      await checkAuthSession();
      await fetchBookings();
    } catch (err) {
      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.className = 'alert alert-error';
        alertBox.innerHTML = `<span>⚠️</span><div>${err.message || 'Email atau password salah.'}</div>`;
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Masuk Dashboard';
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
