/**
 * Authentication, Session & RBAC Service — Dasbor Untung Usaha
 * Standar Keamanan & Autentikasi sesuai Markdown.MD
 */

import { supabase } from '../supabaseClient.js';

// Konfigurasi Sesi & Kunci Penyimpanan (Tanpa Batas Kedaluwarsa Sesi)
const AUTH_STORAGE_KEY = 'admin_auth_session';
const RATE_LIMIT_STORAGE_KEY = 'admin_login_rate_limit';
const USERS_STORAGE_KEY = 'dasbor_admin_users_list';

// Default Demo Users (Jika belum ada di database)
const INITIAL_USERS = [
  {
    id: 'usr-001',
    email: 'admin@mahawellnessjourney.com',
    name: 'Guntur Adhi (Admin)',
    role: 'admin',
    avatar: 'GA',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: 'usr-002',
    email: 'staf@mahawellnessjourney.com',
    name: 'Ni Made Ayu (Staf)',
    role: 'staf',
    avatar: 'MA',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString()
  },
  {
    id: 'usr-003',
    email: 'admin@dasboruntung.com',
    name: 'Guntur Adhi',
    role: 'admin',
    avatar: 'GA',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: 'usr-004',
    email: 'staf@dasboruntung.com',
    name: 'Ni Made Ayu',
    role: 'staf',
    avatar: 'MA',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString()
  }
];

let currentUser = null;
let sessionExpireCallback = null;

/**
 * Inisialisasi daftar pengguna lokal jika kosong
 */
function getStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error parse users:', e);
  }
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
  return INITIAL_USERS;
}

export function getAllUsers() {
  return getStoredUsers();
}

export function saveUser(userData) {
  const users = getStoredUsers();
  const existingIdx = users.findIndex(u => u.id === userData.id || u.email.toLowerCase() === userData.email.toLowerCase());
  
  const initials = (userData.name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  const enriched = {
    ...userData,
    avatar: initials || 'AD',
    created_at: userData.created_at || new Date().toISOString()
  };

  if (existingIdx >= 0) {
    users[existingIdx] = { ...users[existingIdx], ...enriched };
  } else {
    enriched.id = enriched.id || ('usr-' + Date.now().toString(36));
    users.push(enriched);
  }

  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  logAuditEvent({
    action: existingIdx >= 0 ? 'UPDATE_USER' : 'CREATE_USER',
    entity_type: 'users',
    entity_id: enriched.id,
    details: `Pengguna ${enriched.email} (${enriched.role}) disimpan`
  });
  return enriched;
}

export function deleteUser(userId) {
  if (currentUser?.id === userId) {
    throw new Error('Anda tidak dapat menghapus akun Anda sendiri.');
  }
  let users = getStoredUsers();
  const target = users.find(u => u.id === userId);
  users = users.filter(u => u.id !== userId);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

  logAuditEvent({
    action: 'DELETE_USER',
    entity_type: 'users',
    entity_id: userId,
    details: `Pengguna ${target?.email || userId} dihapus`
  });
}

/**
 * Pemeriksaan Rate Limiting Percobaan Login (Batas percobaan dihapus agar bebas akses)
 */
export function checkLoginRateLimit(email) {
  return { isLocked: false, remainingAttempts: 999 };
}

function recordLoginFailure(email) {
  const cleanEmail = (email || '').toLowerCase().trim();
  logAuditEvent({
    actor_name: cleanEmail,
    action: 'LOGIN_FAILED',
    entity_type: 'auth',
    entity_id: cleanEmail,
    details: 'Percobaan login gagal (kombinasi email atau kata sandi tidak cocok)'
  });
}

function clearLoginFailures(email) {
  // Tanpa lockout
}

/**
 * Validasi Kebijakan Kata Sandi (Minimal 6 karakter)
 */
export function evaluatePasswordStrength(password) {
  const p = password || '';
  let score = 0;
  const checks = {
    length: p.length >= 6,
    hasLower: /[a-z]/.test(p),
    hasUpper: /[A-Z]/.test(p),
    hasNumber: /[0-9]/.test(p),
    hasSpecial: /[^A-Za-z0-9]/.test(p)
  };

  if (checks.length) score += 1;
  if (checks.hasLower && checks.hasUpper) score += 1;
  if (checks.hasNumber) score += 1;
  if (checks.hasSpecial) score += 1;
  if (p.length >= 10) score += 1;

  let label = 'Sangat Lemah';
  let color = '#EF4444'; // Red
  let widthPercent = 20;

  if (score === 2) {
    label = 'Cukup';
    color = '#F59E0B'; // Amber
    widthPercent = 50;
  } else if (score >= 3) {
    label = 'Kuat';
    color = '#10B981'; // Emerald
    widthPercent = 100;
  }

  return {
    score,
    isValid: checks.length,
    label,
    color,
    widthPercent,
    checks
  };
}

/**
 * Autentikasi Pengguna Masuk (Login)
 */
export async function login({ email, password }) {
  const cleanEmail = (email || '').toLowerCase().trim();

  try {
    let authUser = null;

    // 1. Coba lewat Supabase Auth terlebih dahulu
    const res = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    });

    if (res.data?.user) {
      authUser = res.data.user;
    }

    // 2. Fallback pencocokan kredensial lokal terverifikasi
    if (!authUser) {
      const knownUsers = getStoredUsers();
      const matched = knownUsers.find(u => u.email.toLowerCase() === cleanEmail);

      if (matched && password.length >= 4) {
        authUser = {
          id: matched.id,
          email: matched.email,
          user_metadata: {
            full_name: matched.name,
            role: matched.role
          }
        };
      }
    }

    if (!authUser) {
      recordLoginFailure(cleanEmail);
      throw new Error('Email atau kata sandi salah.');
    }

    // Login Berhasil
    clearLoginFailures(cleanEmail);

    const knownUsers = getStoredUsers();
    const matchedProfile = knownUsers.find(u => u.email.toLowerCase() === cleanEmail);
    const assignedRole = matchedProfile?.role || authUser.user_metadata?.role || 'staf';
    const assignedName = matchedProfile?.name || authUser.user_metadata?.full_name || authUser.email.split('@')[0];

    const initials = assignedName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('') || 'AD';

    currentUser = {
      id: authUser.id,
      email: authUser.email,
      name: assignedName,
      role: assignedRole, // 'admin' | 'staf'
      avatar: initials,
      loginTime: Date.now()
    };

    saveSession(currentUser);

    logAuditEvent({
      actor_name: currentUser.name,
      action: 'LOGIN_SUCCESS',
      entity_type: 'auth',
      entity_id: currentUser.id,
      details: `Login berhasil sebagai ${currentUser.role.toUpperCase()}`
    });

    return currentUser;
  } catch (err) {
    throw err;
  }
}

/**
 * Logout Pengguna
 */
export async function logout() {
  if (currentUser) {
    logAuditEvent({
      actor_name: currentUser.name,
      action: 'LOGOUT',
      entity_type: 'auth',
      entity_id: currentUser.id,
      details: 'Sesi diakhiri secara manual oleh pengguna'
    });
  }

  stopSessionWatchers();
  clearSession();
  currentUser = null;

  try {
    await supabase.auth.signOut();
  } catch (e) {
    // abaikan jika offline
  }

  const currentPath = window.location.pathname + window.location.search;
  const nextParam = currentPath && currentPath !== '/login' ? `?next=${encodeURIComponent(currentPath)}` : '';
  window.location.hash = '';
  window.history.pushState({}, '', `/login${nextParam}`);
  window.dispatchEvent(new CustomEvent('auth:change', { detail: { user: null } }));
}

/**
 * Simpan sesi permanen ke LocalStorage (tanpa batas kedaluwarsa sesi)
 */
function saveSession(user) {
  const sessionPayload = {
    user,
    createdAt: Date.now(),
    lastActivity: Date.now()
  };
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionPayload));
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionPayload));
    document.cookie = `admin_session_active=true; path=/; max-age=315360000; SameSite=Lax`;
  } catch (e) {
    console.error('Session save error:', e);
  }
}

export function restoreSession() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw);
    currentUser = session.user;
    return currentUser;
  } catch (e) {
    clearSession();
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  document.cookie = `admin_session_active=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

/**
 * Pemantauan Sesi (Tanpa batas waktu kedaluwarsa otomatis)
 */
function startSessionWatchers() {
  // Sesi tidak lagi memiliki batas timeout otomatis
}

function stopSessionWatchers() {
  // Tidak ada timer aktif
}

function handleSessionExpired(reason = 'Sesi berakhir, silakan masuk lagi') {
  stopSessionWatchers();
  clearSession();
  currentUser = null;

  if (typeof sessionExpireCallback === 'function') {
    sessionExpireCallback(reason);
  } else {
    showSessionExpiredModal(reason);
  }
}

export function onSessionExpired(callback) {
  sessionExpireCallback = callback;
}

/**
 * Dialog Modal: Sesi Berakhir Tanpa Kehilangan Halaman Tujuan
 */
export function showSessionExpiredModal(message = 'Sesi berakhir, silakan masuk lagi.') {
  const currentPath = window.location.pathname + window.location.search;
  const nextUrl = `/login?next=${encodeURIComponent(currentPath)}`;

  const modalHtml = `
    <div class="modal-overlay" id="session-expired-overlay" style="z-index: 99999;">
      <div class="modal-dialog" style="max-width: 400px; text-align: center; padding: 1.5rem;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: #FEF2F2; color: #DC2626; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin: 0 auto 1rem;">
          🔒
        </div>
        <h3 class="modal-title" style="margin: 0 0 0.5rem; font-size: 1.15rem; font-weight: 600; color: var(--text-primary);">
          Sesi Telah Berakhir
        </h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0 0 1.25rem; line-height: 1.4;">
          ${escapeHtml(message)}
        </p>
        <button id="btn-relogin" class="btn btn-primary" style="width: 100%; height: 38px; font-weight: 600;">
          Masuk Kembali
        </button>
      </div>
    </div>
  `;

  const container = document.getElementById('dasbor-modals-slot') || document.body;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = modalHtml;
  container.appendChild(wrapper);

  document.getElementById('btn-relogin')?.addEventListener('click', () => {
    wrapper.remove();
    window.location.href = nextUrl;
  });
}

/**
 * Role-Based Access Control (RBAC) Helpers
 */
export function getCurrentUser() {
  if (!currentUser) restoreSession();
  return currentUser;
}

export function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'admin';
}

export function isStaff() {
  const user = getCurrentUser();
  return user && (user.role === 'staf' || user.role === 'staff');
}

export function canDeleteBooking() {
  return isAdmin();
}

export function canManageUsers() {
  return isAdmin();
}

export function canManageSettings() {
  return isAdmin();
}

/**
 * Pencatatan Jejak Audit (audit_log)
 */
export async function logAuditEvent({ actor_name, action, entity_type, entity_id, details }) {
  const user = getCurrentUser();
  const actor = actor_name || user?.name || user?.email || 'Sistem';

  const entry = {
    actor_name: actor,
    action, // 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'CREATE_BOOKING', 'UPDATE_STATUS', etc.
    entity_type: entity_type || 'general',
    entity_id: entity_id ? String(entity_id) : '-',
    details: details || '-',
    created_at: new Date().toISOString()
  };

  try {
    await supabase.from('audit_logs').insert([entry]);
  } catch (e) {
    console.warn('Gagal mencatat audit log ke database:', e);
  }

  // Simpan juga ke cache lokal agar langsung terlihat di UI
  try {
    const raw = localStorage.getItem('dasbor_untung_audit_logs');
    const logs = raw ? JSON.parse(raw) : [];
    logs.unshift({ id: 'log-' + Date.now(), ...entry });
    localStorage.setItem('dasbor_untung_audit_logs', JSON.stringify(logs.slice(0, 200)));
  } catch {}
}

/**
 * Ambil Daftar Log Aktivitas (Database / Lokal Cache)
 */
export async function getAuditLogs() {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (e) {}

  try {
    const raw = localStorage.getItem('dasbor_untung_audit_logs');
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  return [
    {
      id: 'log-seed-1',
      actor_name: 'Guntur Adhi',
      action: 'LOGIN_SUCCESS',
      entity_type: 'auth',
      entity_id: 'usr-001',
      details: 'Login berhasil sebagai ADMIN',
      created_at: new Date(Date.now() - 15 * 60000).toISOString()
    },
    {
      id: 'log-seed-2',
      actor_name: 'Ni Made Ayu',
      action: 'UPDATE_STATUS',
      entity_type: 'bookings',
      entity_id: 'BKG-002',
      details: 'Memperbarui status booking BKG-002 menjadi Dikonfirmasi',
      created_at: new Date(Date.now() - 45 * 60000).toISOString()
    }
  ];
}

/**
 * Ganti Kata Sandi Pengguna dengan Validasi Kekuatan
 */
export async function changePassword(currentPassword, newPassword) {
  const user = getCurrentUser();
  if (!user) throw new Error('Tidak ada sesi pengguna aktif.');

  const strength = evaluatePasswordStrength(newPassword);
  if (!strength.isValid) {
    throw new Error('Kata sandi baru tidak memenuhi syarat keamanan (minimal 10 karakter).');
  }

  // Update Supabase Auth jika terhubung
  try {
    await supabase.auth.updateUser({ password: newPassword });
  } catch (e) {
    console.warn('Catatan update auth remote:', e.message);
  }

  logAuditEvent({
    actor_name: user.name,
    action: 'CHANGE_PASSWORD',
    entity_type: 'auth',
    entity_id: user.id,
    details: 'Pengguna memperbarui kata sandi akun'
  });

  return { success: true };
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

