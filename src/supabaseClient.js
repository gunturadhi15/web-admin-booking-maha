/**
 * Supabase Client Configuration & Initialization
 * Sacred Journey Bali - Dedicated Web Admin & Booking System
 */

import { createClient } from '@supabase/supabase-js';

// Default Demo Mock Storage Keys
const MOCK_STORAGE_KEY_BOOKINGS = 'sacred_journey_mock_bookings';
const MOCK_STORAGE_KEY_MESSAGES = 'sacred_journey_mock_messages';

// Initial Mock Bookings with Pricing, Date, Time & Phone
const INITIAL_MOCK_BOOKINGS = [
  {
    id: 'e1a3b5c7-1234-4567-89ab-cdef01234567',
    customer_name: 'Budi Santoso',
    customer_email: 'budi.santoso@example.com',
    customer_phone: '+6281234567890',
    service_name: 'Spiritual Temple Tour',
    total_price: 650000,
    booking_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    booking_time: '09:00',
    status: 'Confirmed',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString()
  },
  {
    id: 'f2b4c6d8-2345-5678-9abc-def012345678',
    customer_name: 'Sarah Jenkins',
    customer_email: 'sarah.j@outlook.com',
    customer_phone: '+6281987654321',
    service_name: 'Yoga & Meditation Retreat',
    total_price: 1200000,
    booking_date: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
    booking_time: '10:00',
    status: 'Pending',
    created_at: new Date(Date.now() - 40 * 60000).toISOString()
  },
  {
    id: 'a3c5e7f9-3456-6789-abcd-ef0123456789',
    customer_name: 'Wayan Arya Wiguna',
    customer_email: 'wayan.arya@bali.com',
    customer_phone: '+6287711223344',
    service_name: 'Healing & Purification',
    total_price: 450000,
    booking_date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
    booking_time: '14:00',
    status: 'Confirmed',
    created_at: new Date(Date.now() - 24 * 3600000).toISOString()
  },
  {
    id: 'b4d6f8a0-4567-789a-bcde-f01234567890',
    customer_name: 'Elena Rostova',
    customer_email: 'elena.rostova@mail.ru',
    customer_phone: '+79161234567',
    service_name: 'Numerology Consultation',
    total_price: 350000,
    booking_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    booking_time: '11:00',
    status: 'Pending',
    created_at: new Date(Date.now() - 15 * 60000).toISOString()
  },
  {
    id: 'c5e7f9b1-5678-90ab-cdef-123456789012',
    customer_name: 'David Miller',
    customer_email: 'david.m@gmail.com',
    customer_phone: '+6281355443322',
    service_name: 'Spiritual Temple Tour',
    total_price: 1200000,
    booking_date: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
    booking_time: '09:00',
    status: 'Confirmed',
    created_at: new Date(Date.now() - 16 * 86400000).toISOString()
  },
  {
    id: 'd6f8a0c2-6789-01bc-def1-234567890123',
    customer_name: 'Ayu Pradnya',
    customer_email: 'ayu.pradnya@gmail.com',
    customer_phone: '+628199887766',
    service_name: 'Healing & Purification',
    total_price: 650000,
    booking_date: new Date(Date.now() - 40 * 86400000).toISOString().split('T')[0],
    booking_time: '13:00',
    status: 'Confirmed',
    created_at: new Date(Date.now() - 41 * 86400000).toISOString()
  },
  {
    id: 'e7a1b3d5-7890-12cd-ef23-456789012345',
    customer_name: 'Michael Chang',
    customer_email: 'm.chang@yahoo.com',
    customer_phone: '+628122334455',
    service_name: 'Yoga & Meditation Retreat',
    total_price: 1800000,
    booking_date: new Date(Date.now() - 70 * 86400000).toISOString().split('T')[0],
    booking_time: '09:30',
    status: 'Confirmed',
    created_at: new Date(Date.now() - 72 * 86400000).toISOString()
  }
];

// Initial Mock Messages (Inbox Pesan & Kendala)
const INITIAL_MOCK_MESSAGES = [
  {
    id: 'msg-001',
    sender_name: 'Sarah Jenkins',
    sender_email: 'sarah.j@outlook.com',
    sender_phone: '+6281987654321',
    message_content: 'Halo admin, apakah untuk sesi Yoga & Meditation Retreat tanggal lusa saya perlu membawa matras yoga sendiri?',
    is_resolved: false,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString()
  },
  {
    id: 'msg-002',
    sender_name: 'Ketut Sujana',
    sender_email: 'ketut.sujana@gmail.com',
    sender_phone: '+6287812345678',
    message_content: 'Selamat siang, saya ingin menanyakan apakah ada penjemputan gratis dari hotel daerah Seminyak untuk paket Temple Tour?',
    is_resolved: false,
    created_at: new Date(Date.now() - 6 * 3600000).toISOString()
  },
  {
    id: 'msg-003',
    sender_name: 'Elena Rostova',
    sender_email: 'elena.rostova@mail.ru',
    sender_phone: '+79161234567',
    message_content: 'Sudah melakukan pembayaran untuk konsultasi numerologi, mohon link konfirmasi WhatsApp-nya dikirimkan segera ya.',
    is_resolved: true,
    created_at: new Date(Date.now() - 24 * 3600000).toISOString()
  }
];

function getMockData(key, fallback) {
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return [...fallback];
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [...fallback];
  }
}

function saveMockData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// In-memory listeners for Mock Realtime
const mockRealtimeListeners = new Set();

function notifyMockRealtime(payload) {
  mockRealtimeListeners.forEach(listener => {
    try { listener(payload); } catch (err) { console.error('Realtime listener error:', err); }
  });
}

/**
 * Retrieve credentials from Vite env or LocalStorage
 */
export function getSupabaseCredentials() {
  const envUrl = import.meta.env?.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = localStorage.getItem('supabase_url') || '';
  const localKey = localStorage.getItem('supabase_anon_key') || '';

  const url = localUrl || envUrl;
  const anonKey = localKey || envKey;

  const isValidUrl = url && (url.startsWith('https://') || url.startsWith('http://'));
  const isConfigured = Boolean(isValidUrl && anonKey && !anonKey.includes('YOUR_'));

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
      async getSession() {
        const sessionStr = localStorage.getItem('mock_admin_session');
        if (sessionStr) {
          try { return { data: { session: JSON.parse(sessionStr) }, error: null }; } catch {}
        }
        return { data: { session: null }, error: null };
      },
      async getUser() {
        const sessionStr = localStorage.getItem('mock_admin_session');
        if (sessionStr) {
          try {
            const session = JSON.parse(sessionStr);
            return { data: { user: session.user }, error: null };
          } catch {}
        }
        return { data: { user: null }, error: null };
      },
      async signInWithPassword({ email, password }) {
        if (!email || !password) {
          return { data: null, error: { message: 'Email dan password harus diisi.' } };
        }
        if (password.length < 6) {
          return { data: null, error: { message: 'Password minimal 6 karakter.' } };
        }
        const user = {
          id: 'admin-uuid-001',
          email,
          role: 'authenticated',
          user_metadata: { full_name: 'Administrator Sacred Journey' }
        };
        const session = { access_token: 'mock-jwt-token', user };
        localStorage.setItem('mock_admin_session', JSON.stringify(session));
        return { data: { user, session }, error: null };
      },
      async signOut() {
        localStorage.removeItem('mock_admin_session');
        return { error: null };
      }
    },
    from(table) {
      const storageKey = table === 'messages' ? MOCK_STORAGE_KEY_MESSAGES : MOCK_STORAGE_KEY_BOOKINGS;
      const initialFallback = table === 'messages' ? INITIAL_MOCK_MESSAGES : INITIAL_MOCK_BOOKINGS;

      return {
        select(columns = '*') {
          return {
            order(col, { ascending = true } = {}) {
              const list = getMockData(storageKey, initialFallback);
              list.sort((a, b) => {
                const valA = a[col] || '';
                const valB = b[col] || '';
                return ascending ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
              });
              return Promise.resolve({ data: list, error: null });
            },
            then(resolve, reject) {
              const list = getMockData(storageKey, initialFallback);
              return Promise.resolve({ data: list, error: null }).then(resolve, reject);
            }
          };
        },
        async insert(records) {
          const list = Array.isArray(records) ? records : [records];
          const current = getMockData(storageKey, initialFallback);
          const newEntries = list.map(item => ({
            id: (table === 'messages' ? 'msg-' : 'bkg-') + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5),
            ...item,
            created_at: new Date().toISOString()
          }));

          const updated = [...newEntries, ...current];
          saveMockData(storageKey, updated);

          newEntries.forEach(entry => {
            notifyMockRealtime({
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
                  const current = getMockData(storageKey, initialFallback);
                  let updatedItem = null;
                  const updated = current.map(item => {
                    if (item[col] === val) {
                      updatedItem = { ...item, ...updates };
                      return updatedItem;
                    }
                    return item;
                  });
                  saveMockData(storageKey, updated);

                  if (updatedItem) {
                    notifyMockRealtime({
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
              const current = getMockData(storageKey, initialFallback);
              const deletedItem = current.find(i => i[col] === val);
              const remaining = current.filter(i => i[col] !== val);
              saveMockData(storageKey, remaining);

              if (deletedItem) {
                notifyMockRealtime({
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
          this._callback = callback;
          return this;
        },
        subscribe(statusCallback) {
          if (this._callback) {
            mockRealtimeListeners.add(this._callback);
          }
          if (statusCallback) statusCallback('SUBSCRIBED');
          return {
            unsubscribe: () => {
              if (this._callback) mockRealtimeListeners.delete(this._callback);
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
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      isMockClient = false;
      console.log('✅ Supabase live client initialized:', url);
    } catch (err) {
      console.warn('⚠️ Gagal inisialisasi live client Supabase, menggunakan Demo Browser:', err);
      clientInstance = createMockClient();
    }
  } else {
    console.log('ℹ️ Menggunakan Demo Browser Client (Data tersimpan di localStorage).');
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
    const { data, error } = await testClient.from('bookings').select('id').limit(1);
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Koneksi ke Supabase berhasil!' };
  } catch (err) {
    return { success: false, message: err.message || 'Gagal terhubung ke Supabase.' };
  }
}
