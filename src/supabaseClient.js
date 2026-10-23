/**
 * Supabase Client & Local Mock Storage — Dasbor Untung Usaha
 * Mendukung Cloud Supabase dan Mode Demo Browser Offline
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from './utils/logger.js';
import { sanitizeErrorMessage } from './utils/security.js';

// Kunci LocalStorage untuk Mode Demo
const STORAGE_KEYS = {
  bookings: 'dasbor_untung_bookings',
  orders: 'dasbor_untung_orders',
  order_costs: 'dasbor_untung_order_costs',
  customers: 'dasbor_untung_customers',
  payments: 'dasbor_untung_payments',
  financial_transactions: 'dasbor_untung_transactions',
  closing_periods: 'dasbor_untung_closing',
  sync_runs: 'dasbor_untung_sync_runs',
  audit_logs: 'dasbor_untung_audit_logs',
  admins: 'dasbor_untung_admins'
};

// Data Awal Seed Demo Mahawellnessjourney
const SEED_DATA = {
  bookings: [
    {
      id: 'MWJ-SACRED-DISCOVERY-20261020-7491',
      booking_id: 'MWJ-SACRED-DISCOVERY-20261020-7491',
      invoice_number: 'INV-46289160',
      order_id: 'TRX-102-20261020113000-A9F2',
      service_id: 'SRV001',
      service_name: 'Spiritual Temple Tour',
      package_id: 'PKG001',
      package_name: 'Sacred Discovery',
      customer_name: 'Sarah Jenkins',
      customer_phone: '6281234567890',
      customer_email: 'sarah.jenkins@example.com',
      booking_date: new Date().toISOString().split('T')[0],
      booking_time: '09:00',
      pax: 2,
      total_amount: 700000,
      total_price: 700000,
      tax: 0,
      status: 'pending',
      notes: '[Origin: Australia] | [Category: Tour] | [Pax: 2] | [Time: 09:00 WITA] | [DOB: 1992-06-14] | [Payment: QRIS] | User Notes: Mohon disiapkan sarung sembahyang ukuran M.',
      created_at: new Date(Date.now() - 30 * 60000).toISOString()
    },
    {
      id: 'MWJ-YOGA-RETREAT-20261020-5821',
      booking_id: 'MWJ-YOGA-RETREAT-20261020-5821',
      invoice_number: 'INV-46289161',
      order_id: 'TRX-103-20261020121500-C3B1',
      service_id: 'SRV002',
      service_name: 'Yoga & Meditation Retreat',
      package_id: 'PKG002',
      package_name: 'Mindfulness Full Day',
      customer_name: 'Budi Santoso',
      customer_phone: '6281987654321',
      customer_email: 'budi.santoso@gmail.com',
      booking_date: new Date().toISOString().split('T')[0],
      booking_time: '10:00',
      pax: 1,
      total_amount: 1200000,
      total_price: 1200000,
      tax: 0,
      status: 'confirmed',
      notes: '[Origin: Indonesia] | [Category: Retreat] | [Pax: 1] | [Time: 10:00 WITA] | [DOB: 1988-11-20] | [Payment: BCA_VA] | User Notes: Sesi yoga hening di Ubud.',
      created_at: new Date(Date.now() - 2 * 3600000).toISOString()
    },
    {
      id: 'MWJ-MELUKAT-HEALING-20261020-3104',
      booking_id: 'MWJ-MELUKAT-HEALING-20261020-3104',
      invoice_number: 'INV-46289162',
      order_id: 'TRX-104-20261020130000-E7D9',
      service_id: 'SRV004',
      service_name: 'Healing & Purification',
      package_id: 'PKG004',
      package_name: 'Melukat Sebatu Sacred Water',
      customer_name: 'Wayan Arya Wiguna',
      customer_phone: '6287711223344',
      customer_email: 'wayan.arya@bali.com',
      booking_date: new Date().toISOString().split('T')[0],
      booking_time: '14:00',
      pax: 2,
      total_amount: 900000,
      total_price: 900000,
      tax: 0,
      status: 'paid',
      notes: '[Origin: Indonesia] | [Category: Healing] | [Pax: 2] | [Time: 14:00 WITA] | [DOB: 1995-03-08] | [Payment: QRIS] | User Notes: Pembersihan tirta suci Sebatu Gianyar.',
      created_at: new Date(Date.now() - 4 * 3600000).toISOString()
    },
    {
      id: 'MWJ-NUMEROLOGY-GUIDE-20261020-8942',
      booking_id: 'MWJ-NUMEROLOGY-GUIDE-20261020-8942',
      invoice_number: 'INV-46289163',
      order_id: 'TRX-105-20261020143000-F1A8',
      service_id: 'SRV003',
      service_name: 'Numerology Consultation',
      package_id: 'PKG003',
      package_name: 'Sacred Life Matrix',
      customer_name: 'Elena Rostova',
      customer_phone: '6281299887766',
      customer_email: 'elena.rostova@mail.ru',
      booking_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      booking_time: '11:00',
      pax: 1,
      total_amount: 350000,
      total_price: 350000,
      tax: 0,
      status: 'pending',
      notes: '[Origin: Russia] | [Category: Numerology] | [Pax: 1] | [Time: 11:00 WITA] | [DOB: 1990-12-05] | [Payment: Credit_Card] | User Notes: Online personal birth chart consultation.',
      created_at: new Date(Date.now() - 15 * 60000).toISOString()
    }
  ],
  customers: [
    {
      id: 'cust-001',
      name: 'Sarah Jenkins',
      phone: '6281234567890',
      phone_normalized: '6281234567890',
      email: 'sarah.jenkins@example.com',
      nationality: 'Australia',
      dob: '1992-06-14',
      address: 'Sydney, Australia (Wisatawan Bali)',
      notes: 'Wisatawan Australia - Spiritual Temple Tour',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      id: 'cust-002',
      name: 'Budi Santoso',
      phone: '6281987654321',
      phone_normalized: '6281987654321',
      email: 'budi.santoso@gmail.com',
      nationality: 'Indonesia',
      dob: '1988-11-20',
      address: 'Denpasar, Bali',
      notes: 'Pelanggan setia retreat yoga & meditasi',
      created_at: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      id: 'cust-003',
      name: 'Wayan Arya Wiguna',
      phone: '6287711223344',
      phone_normalized: '6287711223344',
      email: 'wayan.arya@bali.com',
      nationality: 'Indonesia',
      dob: '1995-03-08',
      address: 'Tampaksiring, Gianyar',
      notes: 'Sesi Melukat Tirta Sebatu Gianyar',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      id: 'cust-004',
      name: 'Elena Rostova',
      phone: '6281299887766',
      phone_normalized: '6281299887766',
      email: 'elena.rostova@mail.ru',
      nationality: 'Russia',
      dob: '1990-12-05',
      address: 'Canggu, Badung',
      notes: 'Konsultasi Numerologi Personal Birth Chart',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString()
    }
  ],
  orders: [
    {
      id: 'MWJ-SACRED-DISCOVERY-20261020-7491',
      order_code: 'MWJ-SACRED-DISCOVERY-20261020-7491',
      invoice_number: 'INV-46289160',
      order_id: 'TRX-102-20261020113000-A9F2',
      service_id: 'SRV001',
      service_or_item: 'Spiritual Temple Tour (Sacred Discovery)',
      package_name: 'Sacred Discovery',
      customer_id: 'cust-001',
      customer_name: 'Sarah Jenkins',
      customer_phone: '6281234567890',
      customer_email: 'sarah.jenkins@example.com',
      source: 'website',
      external_order_id: 'INV-46289160',
      order_date: new Date().toISOString().split('T')[0],
      order_time: '09:00',
      pax: 2,
      status: 'Menunggu',
      payment_status: 'Belum Dibayar',
      subtotal_amount: 700000,
      discount_amount: 0,
      additional_income_amount: 0,
      refund_amount: 0,
      notes: '[Origin: Australia] | [Category: Tour] | [Pax: 2] | [Time: 09:00 WITA] | [DOB: 1992-06-14] | [Payment: QRIS] | User Notes: Mohon disiapkan sarung sembahyang ukuran M.',
      is_closed: false,
      created_at: new Date(Date.now() - 30 * 60000).toISOString()
    },
    {
      id: 'MWJ-YOGA-RETREAT-20261020-5821',
      order_code: 'MWJ-YOGA-RETREAT-20261020-5821',
      invoice_number: 'INV-46289161',
      order_id: 'TRX-103-20261020121500-C3B1',
      service_id: 'SRV002',
      service_or_item: 'Yoga & Meditation Retreat (Mindfulness Full Day)',
      package_name: 'Mindfulness Full Day',
      customer_id: 'cust-002',
      customer_name: 'Budi Santoso',
      customer_phone: '6281987654321',
      customer_email: 'budi.santoso@gmail.com',
      source: 'whatsapp',
      external_order_id: 'INV-46289161',
      order_date: new Date().toISOString().split('T')[0],
      order_time: '10:00',
      pax: 1,
      status: 'Dikonfirmasi',
      payment_status: 'Lunas',
      subtotal_amount: 1200000,
      discount_amount: 0,
      additional_income_amount: 0,
      refund_amount: 0,
      notes: '[Origin: Indonesia] | [Category: Retreat] | [Pax: 1] | [Time: 10:00 WITA] | [DOB: 1988-11-20] | [Payment: BCA_VA] | User Notes: Sesi yoga hening di Ubud.',
      is_closed: false,
      created_at: new Date(Date.now() - 2 * 3600000).toISOString()
    },
    {
      id: 'MWJ-MELUKAT-HEALING-20261020-3104',
      order_code: 'MWJ-MELUKAT-HEALING-20261020-3104',
      invoice_number: 'INV-46289162',
      order_id: 'TRX-104-20261020130000-E7D9',
      service_id: 'SRV004',
      service_or_item: 'Healing & Purification (Melukat Sebatu)',
      package_name: 'Melukat Sebatu Sacred Water',
      customer_id: 'cust-003',
      customer_name: 'Wayan Arya Wiguna',
      customer_phone: '6287711223344',
      customer_email: 'wayan.arya@bali.com',
      source: 'website',
      external_order_id: 'INV-46289162',
      order_date: new Date().toISOString().split('T')[0],
      order_time: '14:00',
      pax: 2,
      status: 'Selesai',
      payment_status: 'Lunas',
      subtotal_amount: 900000,
      discount_amount: 0,
      additional_income_amount: 0,
      refund_amount: 0,
      notes: '[Origin: Indonesia] | [Category: Healing] | [Pax: 2] | [Time: 14:00 WITA] | [DOB: 1995-03-08] | [Payment: QRIS] | User Notes: Pembersihan tirta suci Sebatu Gianyar.',
      is_closed: false,
      created_at: new Date(Date.now() - 4 * 3600000).toISOString()
    },
    {
      id: 'MWJ-NUMEROLOGY-GUIDE-20261020-8942',
      order_code: 'MWJ-NUMEROLOGY-GUIDE-20261020-8942',
      invoice_number: 'INV-46289163',
      order_id: 'TRX-105-20261020143000-F1A8',
      service_id: 'SRV003',
      service_or_item: 'Numerology Consultation (Sacred Matrix)',
      package_name: 'Sacred Life Matrix',
      customer_id: 'cust-004',
      customer_name: 'Elena Rostova',
      customer_phone: '6281299887766',
      customer_email: 'elena.rostova@mail.ru',
      source: 'website',
      external_order_id: 'INV-46289163',
      order_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      order_time: '11:00',
      pax: 1,
      status: 'Baru',
      payment_status: 'Belum Dibayar',
      subtotal_amount: 350000,
      discount_amount: 0,
      additional_income_amount: 0,
      refund_amount: 0,
      notes: '[Origin: Russia] | [Category: Numerology] | [Pax: 1] | [Time: 11:00 WITA] | [DOB: 1990-12-05] | [Payment: Credit_Card] | User Notes: Online personal birth chart consultation.',
      is_closed: false,
      created_at: new Date(Date.now() - 15 * 60000).toISOString()
    }
  ],
  payments: [
    {
      payment_id: 'PAY-MWJ-7491',
      booking_id: 'MWJ-SACRED-DISCOVERY-20261020-7491',
      order_id: 'TRX-102-20261020113000-A9F2',
      idempotency_key: 'IDEMP-TRX-102-20261020113000-A9F2',
      payment_method: 'qris',
      amount: 700000,
      status: 'pending',
      paid_at: null,
      expired_at: new Date(Date.now() + 24 * 3600000).toISOString()
    },
    {
      payment_id: 'PAY-MWJ-5821',
      booking_id: 'MWJ-YOGA-RETREAT-20261020-5821',
      order_id: 'TRX-103-20261020121500-C3B1',
      idempotency_key: 'IDEMP-TRX-103-20261020121500-C3B1',
      payment_method: 'bca_va',
      amount: 1200000,
      status: 'paid',
      paid_at: new Date(Date.now() - 2 * 3600000).toISOString(),
      expired_at: new Date(Date.now() + 22 * 3600000).toISOString()
    },
    {
      payment_id: 'PAY-MWJ-3104',
      booking_id: 'MWJ-MELUKAT-HEALING-20261020-3104',
      order_id: 'TRX-104-20261020130000-E7D9',
      idempotency_key: 'IDEMP-TRX-104-20261020130000-E7D9',
      payment_method: 'qris',
      amount: 900000,
      status: 'paid',
      paid_at: new Date(Date.now() - 3 * 3600000).toISOString(),
      expired_at: new Date(Date.now() + 21 * 3600000).toISOString()
    },
    {
      payment_id: 'PAY-MWJ-8942',
      booking_id: 'MWJ-NUMEROLOGY-GUIDE-20261020-8942',
      order_id: 'TRX-105-20261020143000-F1A8',
      idempotency_key: 'IDEMP-TRX-105-20261020143000-F1A8',
      payment_method: 'credit_card',
      amount: 350000,
      status: 'pending',
      paid_at: null,
      expired_at: new Date(Date.now() + 24 * 3600000).toISOString()
    }
  ],
  order_costs: [
    {
      id: 'cost-001',
      order_id: 'MWJ-SACRED-DISCOVERY-20261020-7491',
      category: 'Modal/HPP',
      description: 'Tiket Masuk Pura & Sarana Pejati',
      amount: 150000,
      cost_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    },
    {
      id: 'cost-002',
      order_id: 'MWJ-SACRED-DISCOVERY-20261020-7491',
      category: 'Transportasi',
      description: 'Bensin & Driver Antar Jemput',
      amount: 120000,
      cost_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    },
    {
      id: 'cost-003',
      order_id: 'MWJ-YOGA-RETREAT-20261020-5821',
      category: 'Modal/HPP',
      description: 'Sewa Studio Yoga & Instruktur',
      amount: 400000,
      cost_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    },
    {
      id: 'cost-004',
      order_id: 'MWJ-YOGA-RETREAT-20261020-5821',
      category: 'Biaya Bahan',
      description: 'Healthy Lunch & Herbal Drink',
      amount: 150000,
      cost_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    },
    {
      id: 'cost-005',
      order_id: 'MWJ-MELUKAT-HEALING-20261020-3104',
      category: 'Fee Pemandu/Terapis',
      description: 'Banten Melukat & Sesari Pemangku',
      amount: 150000,
      cost_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    }
  ],
  financial_transactions: [
    {
      id: 'trx-001',
      transaction_code: 'TRX-102-20261020113000-A9F2',
      transaction_date: new Date().toISOString().split('T')[0],
      type: 'income',
      category: 'Pendapatan Pesanan',
      description: 'Pembayaran MWJ-SACRED-DISCOVERY Sarah Jenkins',
      amount: 700000,
      source_type: 'order',
      payment_method: 'QRIS',
      is_closed: false,
      created_at: new Date().toISOString()
    },
    {
      id: 'trx-002',
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_code: 'TRX-103-20261020121500-C3B1',
      type: 'income',
      category: 'Pendapatan Pesanan',
      description: 'Pembayaran MWJ-YOGA-RETREAT Budi Santoso',
      amount: 1200000,
      source_type: 'order',
      payment_method: 'Transfer Bank (BCA VA)',
      is_closed: false,
      created_at: new Date().toISOString()
    },
    {
      id: 'trx-003',
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_code: 'TRX-104-20261020130000-E7D9',
      type: 'income',
      category: 'Pendapatan Pesanan',
      description: 'Pembayaran MWJ-MELUKAT-HEALING Wayan Arya Wiguna',
      amount: 900000,
      source_type: 'order',
      payment_method: 'QRIS',
      is_closed: false,
      created_at: new Date().toISOString()
    }
  ],
  closing_periods: [
    {
      id: 'cls-001',
      period_start: '2026-09-01',
      period_end: '2026-09-30',
      status: 'closed',
      total_revenue: 18500000,
      total_cost: 7200000,
      net_profit: 11300000,
      closed_by: 'Admin Mahawellnessjourney',
      closed_at: '2026-10-01T00:00:00Z',
      notes: 'Tutup buku bulan September 2026.'
    }
  ],
  sync_runs: [
    {
      id: 'sync-001',
      source_name: 'Website Booking Mahawellnessjourney',
      started_at: new Date(Date.now() - 15 * 60000).toISOString(),
      finished_at: new Date(Date.now() - 14 * 60000).toISOString(),
      status: 'Berhasil',
      records_seen: 4,
      records_created: 1,
      records_updated: 3,
      records_skipped: 0,
      error_summary: null,
      triggered_by: 'Otomatis Scheduler'
    }
  ],
  audit_logs: [
    {
      id: 'aud-001',
      actor_name: 'Admin',
      action: 'UPDATE_STATUS',
      entity_type: 'orders',
      entity_id: 'MWJ-SACRED-DISCOVERY-20261020-7491',
      details: 'Reservasi baru diterima dari Website Mahawellnessjourney',
      created_at: new Date(Date.now() - 30 * 60000).toISOString()
    }
  ],
  admins: [
    {
      id: 'adm-001',
      name: 'Admin Mahawellnessjourney',
      email: 'admin@mahawellnessjourney.com',
      role: 'Admin',
      is_active: true
    }
  ]
};

function getLocalTable(table) {
  const key = STORAGE_KEYS[table] || `dasbor_untung_${table}`;
  const stored = localStorage.getItem(key);
  if (!stored) {
    const initial = SEED_DATA[table] || [];
    localStorage.setItem(key, JSON.stringify(initial));
    return [...initial];
  }
  try {
    const parsed = JSON.parse(stored);
    // Auto-migrate legacy demo data if it doesn't match MWJ standard
    if (table === 'bookings' && parsed.length > 0 && !parsed.some(b => String(b.id || b.booking_id || '').startsWith('MWJ-'))) {
      const initial = SEED_DATA.bookings || [];
      localStorage.setItem(key, JSON.stringify(initial));
      return [...initial];
    }
    if (table === 'orders' && parsed.length > 0 && !parsed.some(o => String(o.order_code || o.id || '').startsWith('MWJ-'))) {
      const initial = SEED_DATA.orders || [];
      localStorage.setItem(key, JSON.stringify(initial));
      return [...initial];
    }
    return parsed;
  } catch {
    return [...(SEED_DATA[table] || [])];
  }
}

function saveLocalTable(table, data) {
  const key = STORAGE_KEYS[table] || `dasbor_untung_${table}`;
  localStorage.setItem(key, JSON.stringify(data));
}

// In-Memory Realtime Subscribers
const realtimeSubscribers = new Set();
function notifyRealtime(payload) {
  realtimeSubscribers.forEach(cb => {
    try { cb(payload); } catch (e) { console.error('Realtime cb error:', e); }
  });
}

// Cross-tab storage synchronization for Mock Demo Mode
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && Object.values(STORAGE_KEYS).includes(e.key)) {
      notifyRealtime({
        schema: 'public',
        table: e.key.replace('dasbor_untung_', ''),
        eventType: 'SYNC',
        new: null,
        old: null
      });
    }
  });
}

/**
 * Mendapatkan Kredensial Supabase
 */
export function getSupabaseCredentials() {
  const envUrl =
    import.meta.env?.NEXT_PUBLIC_SUPABASE_URL ||
    import.meta.env?.VITE_SUPABASE_URL ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
    '';

  const envKey =
    import.meta.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    import.meta.env?.VITE_SUPABASE_ANON_KEY ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    '';

  const localUrl = localStorage.getItem('supabase_url') || '';
  const localKey = localStorage.getItem('supabase_anon_key') || '';

  const url = (localUrl || envUrl || '').trim();
  const anonKey = (localKey || envKey || '').trim();

  const isValidUrl = Boolean(url && (url.startsWith('https://') || url.startsWith('http://')));
  const isConfigured = Boolean(
    isValidUrl &&
    anonKey &&
    !anonKey.includes('your-project-id') &&
    !anonKey.includes('your-anon-key') &&
    !anonKey.includes('YOUR_')
  );

  return { url, anonKey, isConfigured };
}

/**
 * Deteksi Kunci Service Role (Poin 1: API Key Aman & Poin 3: No Hardcode Secret)
 * Service Role Key memiliki hak bypass RLS penuh dan TIDAK BOLEH berada di frontend browser
 */
export function isServiceRoleKey(key) {
  if (!key || typeof key !== 'string') return false;
  try {
    const parts = key.trim().split('.');
    if (parts.length === 3) {
      // Decode JWT payload (base64url)
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonStr);
      return payload.role === 'service_role';
    }
  } catch {}
  return false;
}

export function saveSupabaseCredentials(url, anonKey) {
  if (anonKey && isServiceRoleKey(anonKey)) {
    throw new Error('BAHAYA KEAMANAN: Kunci yang Anda masukkan adalah Service Role Key (Admin Secret). Jangan pernah memasukkan Service Role Key ke aplikasi frontend browser! Harap gunakan Anon Key (Public Key).');
  }

  if (url) localStorage.setItem('supabase_url', url.trim());
  else localStorage.removeItem('supabase_url');

  if (anonKey) localStorage.setItem('supabase_anon_key', anonKey.trim());
  else localStorage.removeItem('supabase_anon_key');

  initSupabaseClient();
}

export function clearSupabaseCredentials() {
  localStorage.removeItem('supabase_url');
  localStorage.removeItem('supabase_anon_key');
  initSupabaseClient();
}

let clientInstance = null;
let isMockClient = false;

function createMockClient() {
  isMockClient = true;
  return {
    isMock: true,
    auth: {
      async getUser() {
        const str = localStorage.getItem('dasbor_admin_user');
        if (str) {
          try { return { data: { user: JSON.parse(str) }, error: null }; } catch { }
        }
        return { data: { user: null }, error: null };
      },
      async signInWithPassword({ email, password }) {
        if (!email || !password) return { data: null, error: { message: 'Email dan password wajib diisi.' } };
        if (password.length < 5) return { data: null, error: { message: 'Password minimal 5 karakter.' } };
        const user = {
          id: 'adm-001',
          email,
          user_metadata: { full_name: 'Pemilik Usaha' }
        };
        localStorage.setItem('dasbor_admin_user', JSON.stringify(user));
        return { data: { user }, error: null };
      },
      async signOut() {
        localStorage.removeItem('dasbor_admin_user');
        return { error: null };
      }
    },
    from(table) {
      return {
        select(columns = '*') {
          return {
            order(col, { ascending = true } = {}) {
              const list = getLocalTable(table);
              list.sort((a, b) => {
                const vA = a[col] || '';
                const vB = b[col] || '';
                return ascending ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
              });
              return Promise.resolve({ data: list, error: null });
            },
            eq(col, val) {
              const list = getLocalTable(table).filter(i => i[col] === val);
              return Promise.resolve({ data: list, error: null });
            },
            then(resolve, reject) {
              const list = getLocalTable(table);
              return Promise.resolve({ data: list, error: null }).then(resolve, reject);
            }
          };
        },
        async insert(records) {
          const list = Array.isArray(records) ? records : [records];
          const current = getLocalTable(table);
          const newEntries = list.map(item => ({
            id: item.id || (table.slice(0, 3) + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4)),
            ...item,
            created_at: item.created_at || new Date().toISOString()
          }));

          const updated = [...newEntries, ...current];
          saveLocalTable(table, updated);

          newEntries.forEach(entry => {
            notifyRealtime({
              schema: 'public',
              table,
              eventType: 'INSERT',
              new: entry,
              old: null
            });
          });

          return { data: newEntries, error: null };
        },
        update(updates) {
          return {
            eq(col, val) {
              return {
                async select() {
                  const current = getLocalTable(table);
                  let updatedItem = null;
                  const updated = current.map(item => {
                    if (item[col] === val) {
                      updatedItem = { ...item, ...updates, updated_at: new Date().toISOString() };
                      return updatedItem;
                    }
                    return item;
                  });
                  saveLocalTable(table, updated);

                  if (updatedItem) {
                    notifyRealtime({
                      schema: 'public',
                      table,
                      eventType: 'UPDATE',
                      new: updatedItem,
                      old: current.find(i => i[col] === val)
                    });
                  }
                  return { data: updatedItem ? [updatedItem] : [], error: null };
                },
                then(resolve, reject) {
                  return this.select().then(resolve, reject);
                }
              };
            }
          };
        },
        delete() {
          return {
            eq(col, val) {
              const current = getLocalTable(table);
              const deletedItem = current.find(i => i[col] === val);
              const remaining = current.filter(i => i[col] !== val);
              saveLocalTable(table, remaining);

              if (deletedItem) {
                notifyRealtime({
                  schema: 'public',
                  table,
                  eventType: 'DELETE',
                  new: null,
                  old: deletedItem
                });
              }
              return Promise.resolve({ data: deletedItem ? [deletedItem] : [], error: null });
            }
          };
        }
      };
    },
    channel(name) {
      const subscriptions = [];
      const chObj = {
        name,
        on(type, filter, callback) {
          if (typeof callback === 'function') {
            const table = filter?.table || '*';
            const handler = (payload) => {
              if (table === '*' || !payload.table || payload.table === table) {
                callback(payload);
              }
            };
            subscriptions.push({ rawCb: callback, handler });
          }
          return chObj;
        },
        subscribe(statusCb) {
          subscriptions.forEach(s => realtimeSubscribers.add(s.handler));
          if (statusCb) statusCb('SUBSCRIBED');
          return chObj;
        },
        unsubscribe() {
          subscriptions.forEach(s => realtimeSubscribers.delete(s.handler));
          return chObj;
        }
      };
      return chObj;
    },
    removeChannel(ch) {
      if (ch && typeof ch.unsubscribe === 'function') {
        ch.unsubscribe();
      }
    }
  };
}

export function initSupabaseClient() {
  const { url, anonKey, isConfigured } = getSupabaseCredentials();

  if (isConfigured) {
    if (isServiceRoleKey(anonKey)) {
      logger.error('CRITICAL SECURITY ALERT: Service Role Key terdeteksi di lingkungan frontend! Inisialisasi dibatalkan.');
      clientInstance = createMockClient();
      return clientInstance;
    }

    try {
      clientInstance = createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
      isMockClient = false;
      logger.info('Supabase live client berhasil diaktifkan.');
    } catch (err) {
      logger.warn('Gagal terhubung ke Supabase live, beralih ke Demo Browser:', err);
      clientInstance = createMockClient();
    }
  } else {
    logger.info('Menggunakan Mode Demo Browser Lokal (Dasbor Untung Usaha).');
    clientInstance = createMockClient();
  }

  return clientInstance;
}

clientInstance = initSupabaseClient();

export const supabase = new Proxy({}, {
  get(target, prop) {
    if (!clientInstance) initSupabaseClient();
    return clientInstance[prop];
  }
});

export function isUsingMock() {
  return isMockClient;
}

export async function testSupabaseConnection(url, anonKey) {
  if (isServiceRoleKey(anonKey)) {
    return {
      success: false,
      message: 'BAHAYA KEAMANAN: Kunci yang Anda masukkan adalah Service Role Key! Hanya Anon Key publik yang diizinkan.'
    };
  }

  try {
    const testClient = createClient(url, anonKey);
    const { data, error } = await testClient.from('orders').select('id').limit(1);
    if (error) return { success: false, message: sanitizeErrorMessage(error) };
    return { success: true, message: 'Koneksi ke Supabase berhasil!' };
  } catch (err) {
    return { success: false, message: sanitizeErrorMessage(err, 'Gagal terhubung ke Supabase.') };
  }
}
