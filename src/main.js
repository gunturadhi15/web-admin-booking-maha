/**
 * Application Entry Point
 * Sacred Journey Bali — Web Admin & Booking System
 */

import './styles/index.css';
import { renderAdminPage, initAdminPage } from './pages/admin.js';
import { renderBookingPage, initBookingForm } from './pages/booking.js';
import { getSupabaseCredentials } from './supabaseClient.js';

// Application State
let activeView = 'admin'; // 'admin' | 'booking'

// Initialize Toast System
window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'realtime') icon = '✨';

  toast.innerHTML = `
    <span style="font-size: 1.25rem;">${icon}</span>
    <div style="flex: 1; font-weight: 500;">${message}</div>
    <button style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px;" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  // Auto remove after 4.5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
};

/**
 * Switch Active View
 */
function switchView(viewName) {
  activeView = viewName;

  // Update tabs styling
  const tabAdmin = document.getElementById('nav-tab-admin');
  const tabBooking = document.getElementById('nav-tab-booking');
  const contentArea = document.getElementById('main-viewport');

  if (tabAdmin) tabAdmin.classList.toggle('active', viewName === 'admin');
  if (tabBooking) tabBooking.classList.toggle('active', viewName === 'booking');

  if (!contentArea) return;

  // Render view
  if (viewName === 'admin') {
    contentArea.innerHTML = renderAdminPage();
    setTimeout(() => initAdminPage(), 50);
  } else if (viewName === 'booking') {
    contentArea.innerHTML = renderBookingPage();
    setTimeout(() => {
      initBookingForm(() => {
        // Callback after booking
        switchView('admin');
      });
    }, 50);
  }

  // Update URL hash without reload
  window.location.hash = `#/${viewName}`;
}

/**
 * Update Navbar Connection Badge
 */
function updateNavbarBadge() {
  const indicator = document.getElementById('navbar-supabase-status');
  if (!indicator) return;

  const { isConfigured, url } = getSupabaseCredentials();

  indicator.innerHTML = `
    <span class="status-dot ${isConfigured ? 'live' : 'demo'}"></span>
    <span>${isConfigured ? 'Supabase Live' : 'Demo Browser'}</span>
  `;

  indicator.title = isConfigured 
    ? `Terkoneksi ke: ${url}` 
    : 'Klik untuk menghubungkan URL & Anon Key Supabase Anda';

  indicator.onclick = () => {
    window.dispatchEvent(new CustomEvent('open-supabase-config'));
  };
}

/**
 * Initialize App
 */
function initApp() {
  updateNavbarBadge();

  // Tab buttons
  document.getElementById('nav-tab-admin')?.addEventListener('click', () => switchView('admin'));
  document.getElementById('nav-tab-booking')?.addEventListener('click', () => switchView('booking'));

  // Listen to hash changes
  const initialHash = window.location.hash.replace('#/', '');
  if (initialHash === 'booking') {
    switchView('booking');
  } else {
    switchView('admin');
  }

  // Brand click returns to admin
  document.getElementById('brand-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('admin');
  });
}

// Kick off when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
