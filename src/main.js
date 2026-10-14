/**
 * Application Entry Point & Authentication Router — Dasbor Untung Usaha
 * Sacred Journey Bali — Internal Web Admin
 * Memenuhi Spesifikasi Bagian 10 (Autentikasi, Keamanan, RBAC & Router Middleware)
 */

import './styles/index.css';
import { renderDasborApp, initDasborApp } from './pages/dasborUntung.js';
import { renderLoginPage, initLoginPage } from './pages/login.js';
import { restoreSession, getCurrentUser, onSessionExpired, showSessionExpiredModal } from './services/auth.js';

// Setup Toast Notification System (B2B SaaS Style)
window.showToast = function (message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'realtime') icon = '✨';

  toast.innerHTML = `
    <span style="font-size: 1.1rem; line-height: 1;">${icon}</span>
    <div style="flex: 1; font-weight: 500; font-size: 0.85rem; line-height: 1.35;">${message}</div>
    <button style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; font-size: 1.1rem;" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
};

/**
 * Client-Side Router & Middleware Protection
 */
function routeApp() {
  const appContainer = document.getElementById('app-root');
  if (!appContainer) return;

  const user = restoreSession();
  const path = window.location.pathname;

  // 1. Jika rute adalah /login
  if (path === '/login') {
    if (user) {
      // Pengguna yang sudah login diarahkan ke dashboard
      const urlParams = new URLSearchParams(window.location.search);
      const nextTarget = urlParams.get('next') || '/';
      window.history.replaceState({}, '', nextTarget);
      renderDashboard(appContainer);
      return;
    }

    // Render Halaman Login
    appContainer.innerHTML = renderLoginPage();
    setTimeout(() => {
      initLoginPage();
    }, 30);
    return;
  }

  // 2. Proteksi Middleware: Pengguna belum login diarahkan ke /login?next=<path>
  if (!user) {
    const currentFull = window.location.pathname + window.location.search;
    const nextParam = currentFull && currentFull !== '/' ? `?next=${encodeURIComponent(currentFull)}` : '';
    window.history.replaceState({}, '', `/login${nextParam}`);
    appContainer.innerHTML = renderLoginPage();
    setTimeout(() => {
      initLoginPage();
    }, 30);
    return;
  }

  // 3. Pengguna terautentikasi -> Render Dashboard Admin
  renderDashboard(appContainer);
}

function renderDashboard(container) {
  container.innerHTML = renderDasborApp();
  setTimeout(() => {
    initDasborApp();
  }, 50);
}

// Tangani Sesi Berakhir (Inaktivitas 30 Menit / Batas 8 Jam)
onSessionExpired((reason) => {
  showSessionExpiredModal(reason);
});

// Listener Perubahan Autentikasi & Navigasi Riwayat Browser (PopState)
window.addEventListener('auth:change', () => {
  routeApp();
});

window.addEventListener('popstate', () => {
  routeApp();
});

// Inisialisasi awal saat DOM siap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', routeApp);
} else {
  routeApp();
}
