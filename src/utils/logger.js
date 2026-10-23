/**
 * Safe Application Logger — Dasbor Untung Usaha
 * Memenuhi Poin 4 (Debug Mode Off) & Poin 5 (Error Jangan Bocor)
 * Menonaktifkan log sensitif di lingkungan Production
 */

const isProd = typeof import.meta !== 'undefined' && import.meta.env?.PROD;

export const logger = {
  debug(...args) {
    if (!isProd) {
      console.debug('[DEBUG]', ...args);
    }
  },
  info(...args) {
    if (!isProd) {
      console.info('[INFO]', ...args);
    }
  },
  warn(...args) {
    if (!isProd) {
      console.warn('[WARN]', ...args);
    }
  },
  error(...args) {
    // Di produksi, hanya catat pesan umum atau kirim ke service telemetry/Sentry aman
    if (!isProd) {
      console.error('[ERROR]', ...args);
    }
  }
};
