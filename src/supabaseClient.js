/**
 * Supabase Client Configuration & Initialization
 * Sacred Journey Bali - Booking & Admin System
 */

import { createClient } from '@supabase/supabase-js';

// Default Demo Mock Storage Key
const MOCK_STORAGE_KEY = 'sacred_journey_mock_bookings';

// Initial mock bookings if user hasn't configured Supabase yet
const INITIAL_MOCK_BOOKINGS = [
  {
    id: 'e1a3b5c7-1234-4567-89ab-cdef01234567',
    customer_name: 'Budi Santoso',
    customer_email: 'budi.santoso@example.com',
    service_name: 'Spiritual Temple Tour',
    booking_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    status: 'Confirmed',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString()
  },
  {
    id: 'f2b4c6d8-2345-5678-9abc-def012345678',
    customer_name: 'Sarah Jenkins',
    customer_email: 'sarah.j@outlook.com',
    service_name: 'Yoga & Meditation Retreat',
    booking_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    status: 'Pending',
    created_at: new Date(Date.now() - 40 * 60000).toISOString()
  },
  {
    id: 'a3c5e7f9-3456-6789-abcd-ef0123456789',
    customer_name: 'Wayan Arya Wiguna',
    customer_email: 'wayan.arya@bali.com',
    service_name: 'Healing & Purification',
    booking_date: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
    status: 'Confirmed',
    created_at: new Date(Date.now() - 24 * 3600000).toISOString()
  },
  {
    id: 'b4d6f8a0-4567-789a-bcde-f01234567890',
    customer_name: 'Elena Rostova',
    customer_email: 'elena.rostova@mail.ru',
    service_name: 'Numerology Consultation',
    booking_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    status: 'Pending',
    created_at: new Date(Date.now() - 15 * 60000).toISOString()
  }
];

function getMockBookings() {
  const stored = localStorage.getItem(MOCK_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_BOOKINGS));
    return [...INITIAL_MOCK_BOOKINGS];
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [...INITIAL_MOCK_BOOKINGS];
  }
}

function saveMockBookings(bookings) {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(bookings));
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

/**
 * Save user credentials to LocalStorage
 */
export function saveSupabaseCredentials(url, anonKey) {
  if (url) localStorage.setItem('supabase_url', url.trim());
  else localStorage.removeItem('supabase_url');

  if (anonKey) localStorage.setItem('supabase_anon_key', anonKey.trim());
  else localStorage.removeItem('supabase_anon_key');

  // Re-initialize client
  initSupabaseClient();
}

/**
 * Clear user credentials
 */
export function clearSupabaseCredentials() {
  localStorage.removeItem('supabase_url');
  localStorage.removeItem('supabase_anon_key');
  initSupabaseClient();
}

// Global active client instance
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
          try {
            return { data: { session: JSON.parse(sessionStr) }, error: null };
          } catch {
            return { data: { session: null }, error: null };
          }
        }
        return { data: { session: null }, error: null };
      },
      async getUser() {
        const sessionStr = localStorage.getItem('mock_admin_session');
        if (sessionStr) {
          try {
            const session = JSON.parse(sessionStr);
            return { data: { user: session.user }, error: null };
          } catch {
            return { data: { user: null }, error: null };
          }
        }
        return { data: { user: null }, error: null };
      },
      async signInWithPassword({ email, password }) {
        if (!email || !password) {
          return { data: null, error: { message: 'Email and password are required' } };
        }
        // In demo mode, accept admin@sacredjourneybali.com or any email with password length >= 6
        if (password.length < 6) {
          return { data: null, error: { message: 'Password minimal 6 karakter.' } };
        }
        const user = {
          id: 'admin-uuid-001',
          email,
          role: 'authenticated',
          user_metadata: { full_name: 'Administrator' }
        };
        const session = { access_token: 'mock-jwt-token', user };
        localStorage.setItem('mock_admin_session', JSON.stringify(session));
        return { data: { user, session }, error: null };
      },
      async signOut() {
        localStorage.removeItem('mock_admin_session');
        return { error: null };
      },
      onAuthStateChange(callback) {
        // Simple mock subscriber
        return { data: { subscription: { unsubscribe: () => {} } } };
      }
    },
    from(table) {
      if (table !== 'bookings') {
        throw new Error(`Table ${table} not implemented in mock`);
      }
      return {
        select(columns = '*') {
          return {
            order(col, { ascending = true } = {}) {
              const bookings = getMockBookings();
              bookings.sort((a, b) => {
                const valA = a[col] || '';
                const valB = b[col] || '';
                return ascending ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
              });
              return Promise.resolve({ data: bookings, error: null });
            },
            then(resolve, reject) {
              const bookings = getMockBookings();
              return Promise.resolve({ data: bookings, error: null }).then(resolve, reject);
            }
          };
        },
        async insert(records) {
          const list = Array.isArray(records) ? records : [records];
          const current = getMockBookings();
          const newEntries = list.map(item => ({
            id: 'bkg-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 5),
            customer_name: item.customer_name,
            customer_email: item.customer_email,
            service_name: item.service_name,
            booking_date: item.booking_date,
            status: item.status || 'Pending',
            created_at: new Date().toISOString()
          }));

          const updated = [...newEntries, ...current];
          saveMockBookings(updated);

          newEntries.forEach(entry => {
            notifyMockRealtime({
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
                  const current = getMockBookings();
                  let updatedItem = null;
                  const updated = current.map(item => {
                    if (item[col] === val) {
                      updatedItem = { ...item, ...updates };
                      return updatedItem;
                    }
                    return item;
                  });
                  saveMockBookings(updated);

                  if (updatedItem) {
                    notifyMockRealtime({
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
              const current = getMockBookings();
              const deletedItem = current.find(i => i[col] === val);
              const remaining = current.filter(i => i[col] !== val);
              saveMockBookings(remaining);

              if (deletedItem) {
                notifyMockRealtime({
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
      console.log('✅ Supabase client initialized with Live URL:', url);
    } catch (err) {
      console.warn('⚠️ Gagal inisialisasi Supabase live client, fallback ke Demo Mock:', err);
      clientInstance = createMockClient();
    }
  } else {
    console.log('ℹ️ Supabase belum dikonfigurasi. Menggunakan Demo Mock Client (Data tersimpan di browser).');
    clientInstance = createMockClient();
  }

  return clientInstance;
}

// Initial initialization
clientInstance = initSupabaseClient();

/**
 * Main export: Supabase Client proxy
 */
export const supabase = new Proxy({}, {
  get(target, prop) {
    if (!clientInstance) initSupabaseClient();
    return clientInstance[prop];
  }
});

export function isUsingMock() {
  return isMockClient;
}

/**
 * Test Supabase Connection
 */
export async function testSupabaseConnection(url, anonKey) {
  try {
    const testClient = createClient(url, anonKey);
    const { data, error } = await testClient.from('bookings').select('id').limit(1);
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Koneksi ke Supabase tabel "bookings" berhasil!' };
  } catch (err) {
    return { success: false, message: err.message || 'Gagal terhubung ke URL Supabase.' };
  }
}
