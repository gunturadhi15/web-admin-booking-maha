import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  // Kebijakan Keamanan Konten (Content Security Policy)
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  return {
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    esbuild: {
      // Hapus seluruh console dan debugger statement saat produksi (Debug Mode Off)
      drop: isProd ? ['console', 'debugger'] : []
    },
    server: {
      port: 5173,
      open: false,
      headers: {
        'Content-Security-Policy': cspHeader,
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
      }
    },
    preview: {
      port: 4173,
      headers: {
        'Content-Security-Policy': cspHeader,
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
      }
    }
  };
});
