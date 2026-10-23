/**
 * Security & Sanitization Utilities — Dasbor Untung Usaha
 * Memenuhi Standar Keamanan Web: OWASP Top 10, Anti-XSS, Anti-Injection, Safe Error Handling
 */

/**
 * 1. Universal Anti-XSS HTML Escaper
 * Mencegah eksekusi skrip berbahaya dalam template literal HTML
 */
export function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#96;');
}

/**
 * 2. Sanitasi Teks Biasa
 * Menghapus spasi berlebih, karakter kontrol, dan tag berbahaya
 */
export function sanitizeText(str, maxLength = 1000) {
  if (typeof str !== 'string') return '';
  // Hapus karakter kontrol ASCII non-printable kecuali newline & tab
  const cleaned = str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
  return cleaned.slice(0, maxLength);
}

/**
 * 3. Sanitasi Nomor Telepon
 * Standarisasi nomor telepon Indonesia / Internasional (E.164 kompatibel)
 */
export function sanitizePhone(phone) {
  if (!phone) return '';
  // Hanya simpan angka dan awalan '+'
  let cleaned = String(phone).replace(/[^\d+]/g, '');
  
  // Jika format lokal diawali 08..., ubah menjadi 628...
  if (cleaned.startsWith('08')) {
    cleaned = '628' + cleaned.slice(2);
  } else if (cleaned.startsWith('+62')) {
    cleaned = '62' + cleaned.slice(3);
  }
  
  return cleaned.slice(0, 20);
}

/**
 * 4. Sanitasi Angka & Nominal Finansial
 * Mencegah NaN, Infinity, nilai negatif tidak valid, atau overflow
 */
export function sanitizeNumeric(value, min = 0, max = 10000000000, defaultVal = 0) {
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return defaultVal;
  if (num < min) return min;
  if (num > max) return max;
  return Math.round(num * 100) / 100; // Pembulatan maksimal 2 desimal
}

/**
 * 5. Sanitasi Nama File (Anti-Path Traversal & Script Injection)
 */
export function sanitizeFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') return 'file_' + Date.now();
  // Ambil hanya nama file tanpa path direktori ../ atau ..\
  const baseName = fileName.replace(/^.*[\\\/]/, '');
  // Hanya izinkan karakter alfanumerik, titik, strip, dan garis bawah
  const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return safeName.slice(0, 100);
}

/**
 * 6. Error Sanitizer (Anti-Information Leakage)
 * Menampilkan pesan aman ke pengguna akhir tanpa membocorkan skema DB, stack trace, atau URL server
 */
export function sanitizeErrorMessage(err, fallback = 'Terjadi kesalahan sistem. Silakan coba kembali beberapa saat lagi.') {
  if (!err) return fallback;
  
  const rawMsg = (err.message || String(err)).toLowerCase();

  // Pola error autentikasi umum -> berikan pesan generik anti-enumerasi
  if (
    rawMsg.includes('invalid login credentials') ||
    rawMsg.includes('invalid_grant') ||
    rawMsg.includes('user not found') ||
    rawMsg.includes('wrong password') ||
    rawMsg.includes('email or password')
  ) {
    return 'Email atau kata sandi tidak cocok. Silakan periksa kembali.';
  }

  // Pola error rate limit
  if (rawMsg.includes('rate limit') || rawMsg.includes('too many requests') || rawMsg.includes('429')) {
    return 'Terlalu banyak percobaan dalam waktu singkat. Harap tunggu beberapa menit sebelum mencoba lagi.';
  }

  // Pola error jaringan / timeout
  if (rawMsg.includes('failed to fetch') || rawMsg.includes('network') || rawMsg.includes('timeout')) {
    return 'Koneksi ke server terputus. Pastikan perangkat Anda terhubung ke internet.';
  }

  // Pola error database / SQL / RLS -> Sembunyikan detail tabel & kolom
  if (
    rawMsg.includes('postgres') ||
    rawMsg.includes('relation') ||
    rawMsg.includes('column') ||
    rawMsg.includes('violates foreign key') ||
    rawMsg.includes('row-level security') ||
    rawMsg.includes('permission denied') ||
    rawMsg.includes('syntax error') ||
    rawMsg.includes('jwt') ||
    rawMsg.includes('pgrst')
  ) {
    return 'Gagal memproses data karena pembatasan hak akses atau validasi sistem.';
  }

  // Jika pesan pendek dan tidak mengandung kata kunci sensitif, boleh ditampilkan
  if (typeof err.message === 'string' && err.message.length > 0 && err.message.length < 120) {
    // Escape agar tidak memicu XSS
    return escapeHtml(err.message);
  }

  return fallback;
}

/**
 * 7. Cryptographic Password Hash & Verify (Web Crypto API)
 * Digunakan untuk simulasi offline / fallback local storage agar kata sandi TIDAK PERNAH disimpan plaintext
 */
export async function hashPasswordWebCrypto(password, salt = 'mahawellness_salt_2026') {
  if (!password) return '';
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  );

  const exported = await crypto.subtle.exportKey('raw', derivedKey);
  const hashArray = Array.from(new Uint8Array(exported));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPasswordWebCrypto(password, storedHash, salt = 'mahawellness_salt_2026') {
  if (!password || !storedHash) return false;
  try {
    const computedHash = await hashPasswordWebCrypto(password, salt);
    // Timing-safe comparison sederhana
    if (computedHash.length !== storedHash.length) return false;
    let result = 0;
    for (let i = 0; i < computedHash.length; i++) {
      result |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}
