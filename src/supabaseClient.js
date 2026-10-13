/**
 * Supabase Client & Local Mock Storage — Dasbor Untung Usaha
 * Mendukung Cloud Supabase dan Mode Demo Browser Offline
 */

import { createClient } from '@supabase/supabase-js';

// Kunci LocalStorage untuk Mode Demo
const STORAGE_KEYS = {
  bookings: 'dasbor_untung_bookings',
  orders: 'dasbor_untung_orders',
  order_costs: 'dasbor_untung_order_costs',
  customers: 'dasbor_untung_customers',
  financial_transactions: 'dasbor_untung_transactions',
  closing_periods: 'dasbor_untung_closing',
  sync_runs: 'dasbor_untung_sync_runs',
  audit_logs: 'dasbor_untung_audit_logs',
  admins: 'dasbor_untung_admins'
};

// Data Awal Seed Demo
const SEED_DATA = {
  bookings: [
    {
      id: 'bkg-001',
      invoice: 'ORD-202610-001',
      customer_name: 'Budi Santoso',
      customer_phone: '+62 812-3456-7890',
      customer_email: 'budi.santoso@gmail.com',
      service_name: 'Spiritual Temple Tour (Divine Journey)',
      booking_date: new Date().toISOString().split('T')[0],
      booking_time: '09:00',
      total_price: 650000,
      status: 'completed',
      created_at: new Date(Date.now() - 4 * 3600000).toISOString()
    },
    {
      id: 'bkg-002',
      invoice: 'ORD-202610-002',
      customer_name: 'Sarah Jenkins',
      customer_phone: '+62 819-8765-4321',
      customer_email: 'sarah.j@outlook.com',
      service_name: 'Yoga & Meditation Retreat (Full Day)',
      booking_date: new Date().toISOString().split('T')[0],
      booking_time: '10:00',
      total_price: 1200000,
      status: 'pending',
      created_at: new Date(Date.now() - 2 * 3600000).toISOString()
    },
    {
      id: 'bkg-003',
      invoice: 'ORD-202610-003',
      customer_name: 'Wayan Arya Wiguna',
      customer_phone: '+62 877-1122-3344',
      customer_email: 'wayan.arya@bali.com',
      service_name: 'Healing & Purification (Melukat Sebatu)',
      booking_date: new Date().toISOString().split('T')[0],
      booking_time: '14:00',
      total_price: 450000,
      status: 'paid',
      created_at: new Date(Date.now() - 1 * 3600000).toISOString()
    },
    {
      id: 'bkg-004',
      invoice: 'ORD-202610-004',
      customer_name: 'Elena Rostova',
      customer_phone: '+7 916 123-45-67',
      customer_email: 'elena.rostova@mail.ru',
      service_name: 'Numerology Consultation (Personal)',
      booking_date: new Date().toISOString().split('T')[0],
      booking_time: '11:00',
      total_price: 350000,
      status: 'pending',
      created_at: new Date(Date.now() - 30 * 60000).toISOString()
    }
  ],
  customers: [
    {
      id: 'cust-001',
      name: 'Budi Santoso',
      phone: '+62 812-3456-7890',
      phone_normalized: '6281234567890',
      email: 'budi.santoso@gmail.com',
      address: 'Denpasar, Bali',
      notes: 'Pelanggan setia tour spiritual',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      id: 'cust-002',
      name: 'Sarah Jenkins',
      phone: '+62 819-8765-4321',
      phone_normalized: '6281987654321',
      email: 'sarah.j@outlook.com',
      address: 'Ubud, Gianyar',
      notes: 'Wisatawan Australia - Retreat Yoga',
      created_at: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      id: 'cust-003',
      name: 'Wayan Arya Wiguna',
      phone: '+62 877-1122-3344',
      phone_normalized: '6287711223344',
      email: 'wayan.arya@bali.com',
      address: 'Tampaksiring, Gianyar',
      notes: 'Paket Melukat Tirta Empul',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      id: 'cust-004',
      name: 'Elena Rostova',
      phone: '+7 916 123-45-67',
      phone_normalized: '79161234567',
      email: 'elena.rostova@mail.ru',
      address: 'Canggu, Badung',
      notes: 'Konsultasi Numerologi Online',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString()
    }
  ],
  orders: [
    {
      id: 'ord-001',
      order_code: 'ORD-202610-001',
      customer_id: 'cust-001',
      customer_name: 'Budi Santoso',
      customer_phone: '+62 812-3456-7890',
      service_or_item: 'Spiritual Temple Tour (Divine Journey)',
      source: 'website',
      external_order_id: 'WEB-7721',
      order_date: new Date().toISOString().split('T')[0],
      order_time: '09:00',
      status: 'Selesai',
      payment_status: 'Lunas',
      subtotal_amount: 650000,
      discount_amount: 0,
      additional_income_amount: 50000,
      refund_amount: 0,
      notes: 'Selesai tepat waktu. Tamu sangat puas.',
      is_closed: false,
      created_at: new Date(Date.now() - 4 * 3600000).toISOString()
    },
    {
      id: 'ord-002',
      order_code: 'ORD-202610-002',
      customer_id: 'cust-002',
      customer_name: 'Sarah Jenkins',
      customer_phone: '+62 819-8765-4321',
      service_or_item: 'Yoga & Meditation Retreat (Full Day)',
      source: 'whatsapp',
      external_order_id: null,
      order_date: new Date().toISOString().split('T')[0],
      order_time: '10:00',
      status: 'Diproses',
      payment_status: 'DP',
      subtotal_amount: 1200000,
      discount_amount: 50000,
      additional_income_amount: 0,
      refund_amount: 0,
      notes: 'DP 50% diterima. Pelunasan di lokasi.',
      is_closed: false,
      created_at: new Date(Date.now() - 2 * 3600000).toISOString()
    },
    {
      id: 'ord-003',
      order_code: 'ORD-202610-003',
      customer_id: 'cust-003',
      customer_name: 'Wayan Arya Wiguna',
      customer_phone: '+62 877-1122-3344',
      service_or_item: 'Healing & Purification (Melukat Sebatu)',
      source: 'whatsapp',
      external_order_id: null,
      order_date: new Date().toISOString().split('T')[0],
      order_time: '14:00',
      status: 'Dikonfirmasi',
      payment_status: 'Lunas',
      subtotal_amount: 450000,
      discount_amount: 0,
      additional_income_amount: 0,
      refund_amount: 0,
      notes: 'Jadwal terkonfirmasi pemangku pura.',
      is_closed: false,
      created_at: new Date(Date.now() - 1 * 3600000).toISOString()
    },
    {
      id: 'ord-004',
      order_code: 'ORD-202610-004',
      customer_id: 'cust-004',
      customer_name: 'Elena Rostova',
      customer_phone: '+7 916 123-45-67',
      service_or_item: 'Numerology Consultation (Personal)',
      source: 'website',
      external_order_id: 'WEB-7729',
      order_date: new Date().toISOString().split('T')[0],
      order_time: '11:00',
      status: 'Baru',
      payment_status: 'Belum Dibayar',
      subtotal_amount: 350000,
      discount_amount: 0,
      additional_income_amount: 0,
      refund_amount: 0,
      notes: 'Menunggu konfirmasi pembayaran via WA.',
      is_closed: false,
      created_at: new Date(Date.now() - 30 * 60000).toISOString()
    }
  ],
  order_costs: [
    {
      id: 'cost-001',
      order_id: 'ord-001',
      category: 'Modal/HPP',
      description: 'Tiket Masuk Pura & Sarana Pejati',
      amount: 150000,
      cost_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    },
    {
      id: 'cost-002',
      order_id: 'ord-001',
      category: 'Transportasi',
      description: 'Bensin & Driver Antar Jemput',
      amount: 120000,
      cost_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    },
    {
      id: 'cost-003',
      order_id: 'ord-002',
      category: 'Modal/HPP',
      description: 'Sewa Studio Yoga & Instruktur',
      amount: 400000,
      cost_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    },
    {
      id: 'cost-004',
      order_id: 'ord-002',
      category: 'Biaya Bahan',
      description: 'Healthy Lunch & Herbal Drink',
      amount: 150000,
      cost_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    },
    {
      id: 'cost-005',
      order_id: 'ord-003',
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
      transaction_code: 'TRX-202610-001',
      transaction_date: new Date().toISOString().split('T')[0],
      type: 'income',
      category: 'Pendapatan Pesanan',
      description: 'Pembayaran ORD-202610-001 Budi Santoso',
      amount: 700000,
      source_type: 'order',
      payment_method: 'QRIS',
      is_closed: false,
      created_at: new Date().toISOString()
    },
    {
      id: 'trx-002',
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_code: 'TRX-202610-002',
      type: 'expense',
      category: 'HPP Pesanan',
      description: 'Biaya Tiket & Sarana Pejati ORD-202610-001',
      amount: 150000,
      source_type: 'order_cost',
      payment_method: 'Kas Kecil',
      is_closed: false,
      created_at: new Date().toISOString()
    },
    {
      id: 'trx-003',
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_code: 'TRX-202610-003',
      type: 'expense',
      category: 'Operasional Kantor',
      description: 'Biaya Internet & Listrik Operasional',
      amount: 250000,
      source_type: 'operational',
      payment_method: 'Transfer Bank',
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
      closed_by: 'Pemilik Usaha',
      closed_at: '2026-10-01T00:00:00Z',
      notes: 'Tutup buku bulan September 2026.'
    }
  ],
  sync_runs: [
    {
      id: 'sync-001',
      source_name: 'Website Utama (Sacred Journey Bali)',
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
      entity_id: 'ord-001',
      details: 'Status pesanan diubah ke Selesai',
      created_at: new Date(Date.now() - 3 * 3600000).toISOString()
    }
  ],
  admins: [
    {
      id: 'adm-001',
      name: 'Pemilik Usaha / Admin',
      email: 'admin@dasboruntung.com',
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
    return JSON.parse(stored);
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

export function saveSupabaseCredentials(url, anonKey) {
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
      return {
        on(type, filter, callback) {
          this._cb = callback;
          return this;
        },
        subscribe(statusCb) {
          if (this._cb) realtimeSubscribers.add(this._cb);
          if (statusCb) statusCb('SUBSCRIBED');
          return {
            unsubscribe: () => {
              if (this._cb) realtimeSubscribers.delete(this._cb);
            }
          };
        }
      };
    }
  };
}

export function initSupabaseClient() {
  const { url, anonKey, isConfigured } = getSupabaseCredentials();

  if (isConfigured) {
    try {
      clientInstance = createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
      isMockClient = false;
      console.log('✅ Supabase live client aktif:', url);
    } catch (err) {
      console.warn('⚠️ Gagal terhubung ke Supabase live, beralih ke Demo Browser:', err);
      clientInstance = createMockClient();
    }
  } else {
    console.log('ℹ️ Menggunakan Mode Demo Browser Lokal (Dasbor Untung Usaha).');
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
  try {
    const testClient = createClient(url, anonKey);
    const { data, error } = await testClient.from('orders').select('id').limit(1);
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Koneksi ke Supabase berhasil!' };
  } catch (err) {
    return { success: false, message: err.message || 'Gagal terhubung ke Supabase.' };
  }
}
