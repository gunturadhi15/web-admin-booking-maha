/**
 * Reusable B2B SaaS UI Component Library — Dasbor Untung Usaha
 * Executive Design System: Linear, Cal.com, Stripe Dashboard, shadcn/ui
 * Vector SVG Iconography + Tabular Numerals + High-Legibility Typography
 */

import { icon } from './icons.js';
import { escapeHtml } from '../utils/security.js';

export { escapeHtml };

/**
 * Pemformat Angka & Tanggal Standar Indonesia
 */
export function formatRupiah(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

export function formatTanggal(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

export function formatJam(timeStr) {
  if (!timeStr) return '09:00';
  const clean = String(timeStr).slice(0, 5);
  return clean.includes(':') ? clean : `${clean}:00`;
}

/**
 * Subtle Pill Badge dengan dot 6px & border tipis bergradasi
 */
export function StatusBadge(status) {
  const s = String(status || 'Baru').toLowerCase();
  
  if (['confirmed', 'dikonfirmasi', 'aktif'].includes(s)) {
    return `
      <span class="badge-subtle badge-confirmed" title="Status: Dikonfirmasi">
        <span class="badge-dot"></span>
        <span>Dikonfirmasi</span>
      </span>
    `;
  }
  
  if (['completed', 'selesai', 'lunas', 'paid'].includes(s)) {
    return `
      <span class="badge-subtle badge-completed" title="Status: Selesai">
        <span class="badge-dot"></span>
        <span>Selesai</span>
      </span>
    `;
  }
  
  if (['cancelled', 'batal', 'dibatalkan'].includes(s)) {
    return `
      <span class="badge-subtle badge-cancelled" title="Status: Dibatalkan">
        <span class="badge-dot"></span>
        <span>Dibatalkan</span>
      </span>
    `;
  }

  // Menunggu / Baru / Diproses / Pending
  return `
    <span class="badge-subtle badge-pending" title="Status: Menunggu">
      <span class="badge-dot"></span>
      <span>Menunggu</span>
    </span>
  `;
}

/**
 * Kartu KPI Kompresi Eksklusif (Min-height: 96px, no clipped text, tabular-nums)
 */
export function KpiCard({ label, value, badgeText, badgeType = 'neutral', caption, iconName = 'profit' }) {
  const badgeClass = `ledger-badge ledger-badge-${badgeType}`;
  return `
    <div class="ledger-cell">
      <div class="ledger-header">
        <span class="ledger-label">${escapeHtml(label)}</span>
        ${badgeText ? `<span class="${badgeClass}">${escapeHtml(badgeText)}</span>` : ''}
      </div>
      <div class="ledger-row">
        <div class="ledger-value">${value}</div>
      </div>
      <div class="ledger-caption">${escapeHtml(caption || '')}</div>
    </div>
  `;
}

/**
 * Unified Control Bar (Pencarian cepat `/`, segmented control dengan hitungan, date presets, reset filter, dan toggle kartu/tabel)
 */
export function ControlBar({
  searchQuery = '',
  currentStatus = 'ALL',
  currentDate = 'ALL',
  statusCounts = {},
  hasActiveFilters = false,
  viewMode = 'auto'
}) {
  const statuses = [
    { key: 'ALL', label: 'Semua', count: statusCounts.total || 0 },
    { key: 'Menunggu', label: 'Menunggu', count: statusCounts.Menunggu || 0 },
    { key: 'Dikonfirmasi', label: 'Dikonfirmasi', count: statusCounts.Dikonfirmasi || 0 },
    { key: 'Selesai', label: 'Selesai', count: statusCounts.Selesai || 0 },
    { key: 'Dibatalkan', label: 'Dibatalkan', count: statusCounts.Dibatalkan || 0 }
  ];

  return `
    <div class="control-bar">
      <!-- Baris 1: Pencarian Cepat & Toggle Tampilan Kartu/Tabel -->
      <div class="control-search-row">
        <div class="search-input-wrap">
          <span class="search-icon-symbol">${icon('search', { size: 15 })}</span>
          <input 
            type="text" 
            id="order-search-input" 
            class="control-search-input" 
            placeholder="Cari ID booking, pelanggan, WhatsApp, layanan…" 
            value="${escapeHtml(searchQuery)}"
            autocomplete="off"
            aria-label="Cari booking"
          />
          <kbd class="search-kbd-shortcut" title="Tekan '/' untuk mencari">/</kbd>
        </div>

        <div class="view-mode-toggle" role="group" aria-label="Pilihan Tampilan">
          <button type="button" class="btn-view-toggle ${viewMode !== 'table' ? 'active' : ''}" id="btn-toggle-cards" title="Tampilan Kartu Responsif">
            ${icon('cards', { size: 14 })}
            <span class="vmt-text">Kartu</span>
          </button>
          <button type="button" class="btn-view-toggle ${viewMode === 'table' ? 'active' : ''}" id="btn-toggle-table" title="Tampilan Tabel Lengkap">
            ${icon('table', { size: 14 })}
            <span class="vmt-text">Tabel</span>
          </button>
        </div>
      </div>

      <!-- Baris 2: Segmented Control Status (Swipeable / Horizontally Scrollable) -->
      <div class="segmented-control-wrapper">
        <div class="segmented-control" id="status-segmented-control" role="tablist" aria-label="Filter status booking">
          ${statuses.map(st => `
            <button 
              type="button" 
              class="segmented-btn ${currentStatus === st.key ? 'active' : ''}" 
              data-status="${st.key}"
              role="tab"
              aria-selected="${currentStatus === st.key}"
            >
              <span>${st.label}</span>
              <span class="segmented-badge-count">${st.count}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Baris 3: Preset Tanggal & Tombol Aksi Tambah Booking -->
      <div class="control-actions-row">
        <div class="date-and-reset-group">
          <select id="order-date-range-filter" class="date-select-input" title="Filter rentang tanggal" aria-label="Filter rentang tanggal">
            <option value="ALL" ${currentDate === 'ALL' ? 'selected' : ''}>Semua Tanggal</option>
            <option value="TODAY" ${currentDate === 'TODAY' ? 'selected' : ''}>Hari ini</option>
            <option value="7_DAYS" ${currentDate === '7_DAYS' ? 'selected' : ''}>7 hari terakhir</option>
            <option value="30_DAYS" ${currentDate === '30_DAYS' ? 'selected' : ''}>30 hari terakhir</option>
            <option value="THIS_MONTH" ${currentDate === 'THIS_MONTH' ? 'selected' : ''}>Bulan berjalan</option>
          </select>

          ${hasActiveFilters ? `
            <button type="button" id="btn-reset-filters" class="btn-reset-filter" title="Reset semua filter">
              ${icon('close', { size: 13 })}
              <span>Reset</span>
            </button>
          ` : ''}
        </div>

        <button type="button" id="btn-add-booking-primary" class="btn-primary-action" aria-label="Tambah Booking Baru">
          ${icon('plus', { size: 15, strokeWidth: 2.2 })}
          <span>Tambah Booking</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * Mass Actions Bar (Muncul saat ada baris checkbox yang dipilih)
 */
export function MassActionBar(selectedCount = 0) {
  if (selectedCount <= 0) return '';
  return `
    <div class="mass-action-bar" id="mass-action-bar" role="toolbar" aria-label="Aksi massal booking">
      <div class="mass-action-info">
        <span class="mass-action-count">${selectedCount}</span> booking dipilih
      </div>
      <div class="mass-action-buttons">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-bulk-confirm" title="Konfirmasi semua booking terpilih">
          ${icon('check', { size: 14 })}
          <span>Konfirmasi</span>
        </button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-bulk-cancel" title="Batalkan semua booking terpilih">
          ${icon('close', { size: 14 })}
          <span>Batalkan</span>
        </button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-bulk-export" title="Ekspor data terpilih ke CSV">
          ${icon('export', { size: 14 })}
          <span>Ekspor CSV</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * State: Loading Skeleton (Tinggi baris seragam)
 */
export function TableSkeletonRows(count = 5) {
  return Array.from({ length: count }).map(() => `
    <tr class="skeleton-tr">
      <td style="text-align: center;"><div class="skeleton-box" style="width: 16px; height: 16px; margin: 0 auto; border-radius: 4px;"></div></td>
      <td><div class="skeleton-box" style="width: 110px; height: 20px; border-radius: 4px;"></div></td>
      <td>
        <div class="skeleton-box" style="width: 140px; height: 16px; margin-bottom: 4px;"></div>
        <div class="skeleton-box" style="width: 100px; height: 12px;"></div>
      </td>
      <td><div class="skeleton-box" style="width: 160px; height: 16px;"></div></td>
      <td>
        <div class="skeleton-box" style="width: 80px; height: 14px; margin-bottom: 2px;"></div>
        <div class="skeleton-box" style="width: 50px; height: 12px;"></div>
      </td>
      <td><div class="skeleton-box" style="width: 95px; height: 22px; border-radius: 9999px;"></div></td>
      <td style="text-align: right;"><div class="skeleton-box" style="width: 85px; height: 16px; margin-left: auto;"></div></td>
      <td style="text-align: center;"><div class="skeleton-box" style="width: 28px; height: 28px; margin: 0 auto; border-radius: 6px;"></div></td>
    </tr>
  `).join('');
}

/**
 * State: Hasil Filter Kosong & Tidak Ditemukan
 */
export function EmptyFilterState({ onReset }) {
  return `
    <tr>
      <td colspan="8">
        <div class="empty-state-card">
          <div class="empty-state-icon">${icon('search', { size: 36, strokeWidth: 1.5 })}</div>
          <div class="empty-state-title">Hasil filter tidak ditemukan</div>
          <p class="empty-state-desc">Tidak ada booking yang cocok dengan kriteria pencarian atau filter yang aktif.</p>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-empty-reset-filter" style="margin-top: 0.5rem;">
            ${icon('refresh', { size: 14 })}
            <span>Reset Filter</span>
          </button>
        </div>
      </td>
    </tr>
  `;
}

export function InitialEmptyState() {
  return `
    <tr>
      <td colspan="8">
        <div class="empty-state-card">
          <div class="empty-state-icon">${icon('orders', { size: 36, strokeWidth: 1.5 })}</div>
          <div class="empty-state-title">Belum ada booking tersimpan</div>
          <p class="empty-state-desc">Mulai catat reservasi baru untuk melihat ringkasan jadwal dan laporan performa bisnis.</p>
          <button type="button" class="btn btn-primary-action btn-sm" id="btn-empty-add-booking" style="margin-top: 0.5rem;">
            ${icon('plus', { size: 15 })}
            <span>Tambah Booking Pertama</span>
          </button>
        </div>
      </td>
    </tr>
  `;
}
