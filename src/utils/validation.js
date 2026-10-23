/**
 * Input Validation Utilities — Dasbor Untung Usaha
 * Validasi ketat sisi klien & persiapan payload sebelum dikirim ke database
 */

// Format Email RFC 5322 sederhana
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Format Telepon (Minimal 8 digit, maksimal 15 digit angka)
const PHONE_REGEX = /^\+?[0-9]{8,15}$/;

// Format Tanggal ISO YYYY-MM-DD
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Format Jam HH:mm
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Validasi Alamat Email
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const clean = email.trim();
  return clean.length >= 5 && clean.length <= 100 && EMAIL_REGEX.test(clean);
}

/**
 * Validasi Nomor Telepon
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const clean = phone.replace(/[\s-]/g, '');
  return PHONE_REGEX.test(clean);
}

/**
 * Validasi Tanggal
 */
export function isValidDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (!DATE_REGEX.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

/**
 * Validasi Jam
 */
export function isValidTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return false;
  return TIME_REGEX.test(timeStr.trim());
}

/**
 * Status yang Diizinkan (Whitelist)
 */
export const ALLOWED_ORDER_STATUSES = ['Baru', 'Dikonfirmasi', 'Diproses', 'Selesai', 'Dibatalkan'];
export const ALLOWED_PAYMENT_STATUSES = ['Belum Dibayar', 'DP', 'Lunas', 'Refund'];
export const ALLOWED_USER_ROLES = ['admin', 'staf', 'viewer'];
export const ALLOWED_COST_CATEGORIES = [
  'Modal/HPP',
  'Biaya Bahan',
  'Transportasi',
  'Fee Pemandu/Terapis',
  'Biaya Langsung Lain'
];

/**
 * Validasi Status Pesanan
 */
export function isValidOrderStatus(status) {
  return ALLOWED_ORDER_STATUSES.includes(status);
}

/**
 * Validasi Status Pembayaran
 */
export function isValidPaymentStatus(status) {
  return ALLOWED_PAYMENT_STATUSES.includes(status);
}

/**
 * Validasi Kekuatan Kata Sandi Sesuai Kebijakan (Min 10 Karakter, Variasi Karakter)
 */
export function validatePasswordPolicy(password) {
  const p = password || '';
  const errors = [];

  if (p.length < 10) {
    errors.push('Panjang kata sandi minimal 10 karakter.');
  }
  if (!/[A-Z]/.test(p)) {
    errors.push('Wajib memuat setidaknya 1 huruf besar (A-Z).');
  }
  if (!/[a-z]/.test(p)) {
    errors.push('Wajib memuat setidaknya 1 huruf kecil (a-z).');
  }
  if (!/[0-9]/.test(p)) {
    errors.push('Wajib memuat setidaknya 1 angka (0-9).');
  }
  if (!/[^A-Za-z0-9]/.test(p)) {
    errors.push('Wajib memuat setidaknya 1 karakter khusus/simbol (@#$%&*!).');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validasi Payload Reservasi Publik
 */
export function validateBookingSubmission(data) {
  const errors = {};

  if (!data.customer_name || data.customer_name.trim().length < 2) {
    errors.customer_name = 'Nama lengkap pemesan wajib diisi (minimal 2 karakter).';
  } else if (data.customer_name.trim().length > 100) {
    errors.customer_name = 'Nama pemesan maksimal 100 karakter.';
  }

  if (!isValidEmail(data.customer_email)) {
    errors.customer_email = 'Format alamat email tidak valid.';
  }

  if (!isValidPhone(data.customer_phone)) {
    errors.customer_phone = 'Nomor WhatsApp / HP tidak valid (8-15 digit angka).';
  }

  if (!isValidDate(data.booking_date)) {
    errors.booking_date = 'Format tanggal pelaksanaan tidak valid.';
  }

  if (!data.service_name || data.service_name.trim().length === 0) {
    errors.service_name = 'Layanan yang dipilih wajib ditentukan.';
  }

  const price = Number(data.total_price);
  if (isNaN(price) || price < 0 || price > 1000000000) {
    errors.total_price = 'Nominal harga reservasi tidak valid.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
