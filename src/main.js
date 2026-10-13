/**
 * Application Entry Point — Dasbor Untung Usaha
 * Sacred Journey Bali — Internal Web Admin
 */

import './styles/index.css';
import { renderDasborApp, initDasborApp } from './pages/dasborUntung.js';

// Setup Toast Notification System
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
    <span style="font-size: 1.25rem;">${icon}</span>
    <div style="flex: 1; font-weight: 500;">${message}</div>
    <button style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px;" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

function initApp() {
  const appContainer = document.getElementById('app-root');
  if (!appContainer) return;

  appContainer.innerHTML = renderDasborApp();
  setTimeout(() => {
    initDasborApp();
  }, 50);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
