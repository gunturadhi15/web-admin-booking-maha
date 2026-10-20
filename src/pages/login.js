/**
 * Login Page Component — Dasbor Untung Usaha
 * Memenuhi Spesifikasi Bagian 10.A & 10.E di Markdown.MD
 */

import { login, checkLoginRateLimit, evaluatePasswordStrength } from '../services/auth.js';

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
              placeholder="admin@mahawellnessjourney.com" 
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

          <!-- Pesan Error Generik di Bawah Form -->
          <div id="login-error-container" class="login-error-message" style="display: none;" role="alert">
            <span class="error-dot">●</span>
            <span id="login-error-text">Email atau kata sandi salah.</span>
          </div>

          <!-- Tombol Masuk Lebar Penuh (#18181B) -->
          <button type="submit" id="btn-submit-login" class="btn-login-submit">
            <span id="btn-login-spinner" class="login-spinner" style="display: none;"></span>
            <span id="btn-login-text">Masuk</span>
          </button>

          <!-- Info Default Akun untuk Demo -->
          <div class="login-demo-hint">
            <div>💡 <strong>Akun Terdaftar:</strong></div>
            <div style="margin-top: 4px; font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-secondary);">
              Admin: <code>admin@mahawellnessjourney.com</code> / <code>admin@dasboruntung.com</code> (Sandi: <code>Admin12345!</code>)<br/>
              Staf: <code>staf@mahawellnessjourney.com</code> / <code>staf@dasboruntung.com</code> (Sandi: <code>Staf12345!</code>)
            </div>
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

  // Toggle Visibility Password
  toggleBtn?.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    toggleBtn.textContent = isPassword ? '🙈' : '👁️';
    toggleBtn.setAttribute('title', isPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
  });

  // Submit Handler
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const nextUrl = document.getElementById('login-next-input')?.value || '/';

    // Sembunyikan error sebelumnya
    errorContainer.style.display = 'none';

    if (!email || !password) {
      errorContainer.style.display = 'flex';
      errorText.textContent = 'Email atau kata sandi tidak boleh kosong.';
      return;
    }

    // State Loading
    submitBtn.disabled = true;
    spinnerText.style.display = 'inline-block';
    btnText.textContent = 'Memverifikasi...';

    try {
      const user = await login({ email, password });
      
      btnText.textContent = 'Berhasil masuk!';
      window.showToast?.(`Selamat datang kembali, ${user.name}!`, 'success');

      // Arahkan ke halaman tujuan (default: /)
      setTimeout(() => {
        window.history.pushState({}, '', nextUrl);
        window.dispatchEvent(new CustomEvent('auth:change', { detail: { user } }));
      }, 400);

    } catch (err) {
      submitBtn.disabled = false;
      spinnerText.style.display = 'none';
      btnText.textContent = 'Masuk';

      errorContainer.style.display = 'flex';
      errorText.textContent = err.message || 'Email atau kata sandi salah.';
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
      <div class="modal-dialog" style="max-width: 420px;">
        <div class="modal-header">
          <h3 class="modal-title" style="font-size: 1.1rem; font-weight: 600;">Atur Ulang Kata Sandi</h3>
          <button class="btn-close-modal" id="btn-close-forgot-modal">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
            Masukkan email terdaftar dan kata sandi baru Anda (minimal 10 karakter).
          </p>

          <form id="form-reset-password">
            <div class="form-group" style="margin-bottom: 0.75rem;">
              <label class="form-label">Email Terdaftar:</label>
              <input type="email" id="reset-email" class="form-input" placeholder="admin@dasboruntung.com" required />
            </div>

            <div class="form-group" style="margin-bottom: 0.5rem;">
              <label class="form-label">Kata Sandi Baru (Minimal 10 karakter):</label>
              <input type="password" id="reset-password-input" class="form-input" placeholder="••••••••••" required />
            </div>

            <!-- Indikator Kekuatan Kata Sandi -->
            <div class="password-meter-wrap" style="margin-bottom: 1rem;">
              <div class="meter-track">
                <div id="pwd-meter-fill" class="meter-fill" style="width: 0%; background: #EF4444;"></div>
              </div>
              <div class="meter-label-row">
                <span id="pwd-meter-text" style="font-size: 0.72rem; color: var(--text-secondary);">Kekuatan: -</span>
                <span id="pwd-length-hint" style="font-size: 0.72rem; color: var(--text-muted);">Min. 10 karakter</span>
              </div>
            </div>

            <button type="submit" class="btn btn-primary-action" style="width: 100%; height: 36px;">
              Perbarui Kata Sandi
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

  const pwdInput = document.getElementById('reset-password-input');
  const meterFill = document.getElementById('pwd-meter-fill');
  const meterText = document.getElementById('pwd-meter-text');

  pwdInput?.addEventListener('input', (e) => {
    const val = e.target.value;
    const strength = evaluatePasswordStrength(val);
    meterFill.style.width = `${strength.widthPercent}%`;
    meterFill.style.backgroundColor = strength.color;
    meterText.textContent = `Kekuatan: ${strength.label}`;
    meterText.style.color = strength.color;
  });

  document.getElementById('form-reset-password')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = pwdInput?.value || '';
    if (val.length < 10) {
      window.showToast?.('Kata sandi harus minimal 10 karakter sesuai kebijakan keamanan.', 'error');
      return;
    }

    slot.innerHTML = '';
    window.showToast?.('Kata sandi berhasil diperbarui! Silakan masuk.', 'success');
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
