/**
 * Login Page Component — Dasbor Untung Usaha
 * Memenuhi Spesifikasi Bagian 10.A & 10.E di Markdown.MD & OWASP Security Standards
 * 
 * Fitur Keamanan:
 * - Poin 3: Zero Hardcoded Secret (Tidak ada password plaintext tertera di layar)
 * - Poin 5: Error Jangan Bocor (Pesan error generik anti-enumerasi akun)
 * - Poin 10: Server-Side Rate Limiting & Lockout UI
 * - Poin 20: Alur Reset Password Aman
 * - Poin 9: Anti-XSS (HTML Escaped)
 */

import {
  login,
  checkLoginRateLimit,
  evaluatePasswordStrength,
  requestPasswordReset
} from '../services/auth.js';
import { escapeHtml, sanitizeText } from '../utils/security.js';

export function renderLoginPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const nextTarget = urlParams.get('next') || '/';

  return `
    <div class="login-page-canvas">
      
      <!-- Kartu Login Tunggal (max-w-sm, border 1px, shadow-none, rounded-lg) -->
      <div class="login-card-container">
        
        <!-- Header Kartu -->
        <div class="login-header">
          <div class="login-brand-badge">
            <span class="brand-badge-icon brand-badge-sm" style="display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 6px; background: #0F172A; color: #0D9488;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c-1.8 2.8-3.5 5.5-4 8.5 1.2.6 2.6.9 4 .9s2.8-.3 4-.9c-.5-3-2.2-5.7-4-8.5Z"/><path d="M4 14.5c2.5 1 5.2.8 7.5-.5-1.5-2.2-2.5-4.8-2.8-7.5-2.2 2-3.8 4.7-4.7 8Z"/><path d="M20 14.5c-2.5 1-5.2.8-7.5-.5 1.5-2.2 2.5-4.8 2.8-7.5 2.2 2 3.8 4.7 4.7 8Z"/></svg>
            </span>
            <span class="login-brand-title">Mahawellnessjourney</span>
          </div>
          <h1 class="login-title">Masuk</h1>
          <p class="login-desc">Masuk ke sistem Mahawellnessjourney Admin untuk mengelola booking dan operasional.</p>
        </div>

        <!-- Form Login -->
        <form id="form-login" class="login-form" novalidate>
          <input type="hidden" id="login-next-input" value="${escapeHtml(nextTarget)}" />

          <!-- Input Email -->
          <div class="form-group">
            <label for="login-email" class="form-label">Email</label>
            <input 
              type="email" 
              id="login-email" 
              name="email" 
              class="form-input" 
              placeholder="nama@mahawellnessjourney.com" 
              autocomplete="username" 
              required 
            />
          </div>

          <!-- Input Kata Sandi dengan Tombol Tampilkan/Sembunyikan -->
          <div class="form-group">
            <div class="label-with-action">
              <label for="login-password" class="form-label">Kata Sandi</label>
              <button type="button" id="btn-forgot-password" class="link-forgot-password" tabindex="0">
                Lupa kata sandi?
              </button>
            </div>
            <div class="password-input-wrapper">
              <input 
                type="password" 
                id="login-password" 
                name="password" 
                class="form-input" 
                placeholder="Masukkan kata sandi" 
                autocomplete="current-password" 
                required 
              />
              <button 
                type="button" 
                id="btn-toggle-password" 
                class="btn-toggle-visibility" 
                title="Tampilkan kata sandi" 
                aria-label="Tampilkan atau sembunyikan kata sandi"
              >
                👁️
              </button>
            </div>
          </div>

          <!-- Banner Kunci Sementara (Rate Limiting Lockout) -->
          <div id="login-lockout-banner" class="login-error-message" style="display: none; background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; padding: 0.75rem; border-radius: 6px; font-size: 0.8rem;" role="alert">
            <span style="margin-right: 6px;">🔒</span>
            <span id="login-lockout-text">Akun dikunci sementara karena terlalu banyak percobaan gagal.</span>
          </div>

          <!-- Pesan Error Generik di Bawah Form (Poin 5) -->
          <div id="login-error-container" class="login-error-message" style="display: none;" role="alert">
            <span class="error-dot">●</span>
            <span id="login-error-text">Email atau kata sandi tidak cocok.</span>
          </div>

          <!-- Tombol Masuk Lebar Penuh (#18181B) -->
          <button type="submit" id="btn-submit-login" class="btn-login-submit">
            <span id="btn-login-spinner" class="login-spinner" style="display: none;"></span>
            <span id="btn-login-text">Masuk</span>
          </button>

          <!-- Catatan Keamanan Lingkungan Terproteksi (Poin 3: No Hardcoded Secret) -->
          <div class="login-demo-hint" style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 0.75rem; border-radius: 6px;">
            <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; font-weight: 600; color: #334155;">
              <span>🛡️</span>
              <span>Sistem Terenkripsi &amp; Terproteksi</span>
            </div>
            <p style="margin: 4px 0 0; font-size: 0.72rem; color: #64748B; line-height: 1.4;">
              Akses terbatas hanya untuk staf operasional dan administrator berwenang. Semua aktivitas masuk dan kegagalan dicatat dalam jejak audit.
            </p>
          </div>

        </form>

      </div>

      <!-- Footer Hak Cipta Ringkas -->
      <footer class="login-footer">
        &copy; ${new Date().getFullYear()} Mahawellnessjourney Bali &bull; Sistem Web Admin &amp; Reservasi
      </footer>

    </div>

    <!-- Modal Lupa / Reset Kata Sandi -->
    <div id="forgot-password-modal-slot"></div>
  `;
}

export function initLoginPage() {
  const form = document.getElementById('form-login');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const toggleBtn = document.getElementById('btn-toggle-password');
  const submitBtn = document.getElementById('btn-submit-login');
  const spinnerText = document.getElementById('btn-login-spinner');
  const btnText = document.getElementById('btn-login-text');
  const errorContainer = document.getElementById('login-error-container');
  const errorText = document.getElementById('login-error-text');
  const lockoutBanner = document.getElementById('login-lockout-banner');
  const lockoutText = document.getElementById('login-lockout-text');

  // Toggle Visibility Password
  toggleBtn?.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    toggleBtn.textContent = isPassword ? '🙈' : '👁️';
    toggleBtn.setAttribute('title', isPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
  });

  // Periksa Rate Limiting saat input email kehilangan fokus
  emailInput?.addEventListener('blur', () => {
    const email = emailInput.value.trim();
    if (!email) return;
    const limit = checkLoginRateLimit(email);
    if (limit.isLocked) {
      lockoutBanner.style.display = 'flex';
      lockoutText.textContent = limit.message;
      submitBtn.disabled = true;
    } else {
      lockoutBanner.style.display = 'none';
      submitBtn.disabled = false;
    }
  });

  // Submit Handler
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = sanitizeText(emailInput.value, 100).toLowerCase().trim();
    const password = passwordInput.value;
    const nextUrl = document.getElementById('login-next-input')?.value || '/';

    // Sembunyikan pesan error sebelumnya
    errorContainer.style.display = 'none';
    lockoutBanner.style.display = 'none';

    if (!email || !password) {
      errorContainer.style.display = 'flex';
      errorText.textContent = 'Email dan kata sandi wajib diisi.';
      return;
    }

    // Periksa status penguncian rate limit
    const limitCheck = checkLoginRateLimit(email);
    if (limitCheck.isLocked) {
      lockoutBanner.style.display = 'flex';
      lockoutText.textContent = limitCheck.message;
      return;
    }

    // State Loading
    submitBtn.disabled = true;
    spinnerText.style.display = 'inline-block';
    btnText.textContent = 'Memverifikasi...';

    try {
      const user = await login({ email, password });
      
      btnText.textContent = 'Berhasil masuk!';
      window.showToast?.(`Selamat datang kembali, ${escapeHtml(user.name)}!`, 'success');

      // Arahkan ke halaman tujuan (default: /)
      setTimeout(() => {
        window.history.pushState({}, '', nextUrl);
        window.dispatchEvent(new CustomEvent('auth:change', { detail: { user } }));
      }, 400);

    } catch (err) {
      submitBtn.disabled = false;
      spinnerText.style.display = 'none';
      btnText.textContent = 'Masuk';

      // Cek apakah baru saja memicu lockout
      const postLimit = checkLoginRateLimit(email);
      if (postLimit.isLocked) {
        lockoutBanner.style.display = 'flex';
        lockoutText.textContent = postLimit.message;
      } else {
        errorContainer.style.display = 'flex';
        errorText.textContent = err.message || 'Email atau kata sandi tidak cocok.';
      }
    }
  });

  // Modal Lupa Kata Sandi
  document.getElementById('btn-forgot-password')?.addEventListener('click', () => {
    showForgotPasswordModal();
  });
}

function showForgotPasswordModal() {
  const slot = document.getElementById('forgot-password-modal-slot');
  if (!slot) return;

  slot.innerHTML = `
    <div class="modal-overlay" id="forgot-modal-overlay">
      <div class="modal-dialog" style="max-width: 440px;">
        <div class="modal-header">
          <h3 class="modal-title" style="font-size: 1.1rem; font-weight: 600;">Atur Ulang Kata Sandi</h3>
          <button class="btn-close-modal" id="btn-close-forgot-modal">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.45;">
            Masukkan alamat email resmi Anda yang terdaftar di sistem. Kami akan mengirimkan tautan pemulihan kata sandi yang aman dan berbatas waktu.
          </p>

          <form id="form-reset-password">
            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label">Email Terdaftar:</label>
              <input type="email" id="reset-email" class="form-input" placeholder="nama@mahawellnessjourney.com" required />
            </div>

            <div id="reset-status-box" style="display: none; padding: 0.75rem; border-radius: 6px; font-size: 0.8rem; margin-bottom: 1rem; line-height: 1.4;"></div>

            <button type="submit" id="btn-submit-reset" class="btn btn-primary-action" style="width: 100%; height: 38px; font-weight: 600;">
              <span id="btn-reset-text">Kirim Tautan Pemulihan</span>
              <span id="btn-reset-spinner" class="login-spinner" style="display: none; width: 14px; height: 14px;"></span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-forgot-modal')?.addEventListener('click', () => { slot.innerHTML = ''; });
  document.getElementById('forgot-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'forgot-modal-overlay') slot.innerHTML = '';
  });

  const emailInput = document.getElementById('reset-email');
  const submitBtn = document.getElementById('btn-submit-reset');
  const btnText = document.getElementById('btn-reset-text');
  const spinner = document.getElementById('btn-reset-spinner');
  const statusBox = document.getElementById('reset-status-box');

  document.getElementById('form-reset-password')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput?.value?.trim() || '';

    if (!email) return;

    submitBtn.disabled = true;
    spinner.style.display = 'inline-block';
    btnText.textContent = 'Memproses Permintaan...';
    statusBox.style.display = 'none';

    try {
      const result = await requestPasswordReset(email);
      
      statusBox.style.display = 'block';
      statusBox.style.background = '#ECFDF5';
      statusBox.style.border = '1px solid #A7F3D0';
      statusBox.style.color = '#065F46';
      statusBox.innerHTML = `✅ ${escapeHtml(result.message)}`;
      
      btnText.textContent = 'Tautan Terkirim';
      setTimeout(() => {
        slot.innerHTML = '';
      }, 4000);
    } catch (err) {
      submitBtn.disabled = false;
      spinner.style.display = 'none';
      btnText.textContent = 'Kirim Tautan Pemulihan';

      statusBox.style.display = 'block';
      statusBox.style.background = '#FEF2F2';
      statusBox.style.border = '1px solid #FECACA';
      statusBox.style.color = '#991B1B';
      statusBox.innerHTML = `⚠️ ${escapeHtml(err.message || 'Gagal memproses permintaan.')}`;
    }
  });
}
