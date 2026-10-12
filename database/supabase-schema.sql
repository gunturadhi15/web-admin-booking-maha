-- ==============================================================================
-- Sacred Journey Bali - Database Schema & Row Level Security (RLS) for Supabase
-- ==============================================================================
-- Dokumen SQL ini digunakan untuk menginisialisasi database di Supabase SQL Editor.
-- Ikuti langkah berikut di Supabase Dashboard:
-- 1. Buka dashboard Supabase: https://supabase.com/dashboard
-- 2. Pilih / Buat proyek Anda.
-- 3. Masuk ke menu "SQL Editor" di bilah navigasi kiri.
-- 4. Buat "New query", salin dan tempel seluruh isi script ini, lalu klik "Run".
-- ==============================================================================

-- 1. Buat Tabel `bookings`
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    service_name TEXT NOT NULL,
    booking_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indeks untuk performa query pencarian dan penyortiran
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings (booking_date);

-- ==============================================================================
-- 2. Konfigurasi Row Level Security (RLS)
-- ==============================================================================
-- Mengaktifkan RLS pada tabel bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada untuk mencegah konflik
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.bookings;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.bookings;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.bookings;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.bookings;

-- Policy 1: Pengunjung publik (anon) dapat mengirimkan pemesanan baru (INSERT)
CREATE POLICY "Allow anonymous insert" 
ON public.bookings 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Policy 2: Admin yang sudah terautentikasi (authenticated) dapat membaca seluruh pesanan (SELECT)
CREATE POLICY "Allow authenticated select" 
ON public.bookings 
FOR SELECT 
TO authenticated 
USING (true);

-- Policy 3: Admin yang sudah terautentikasi (authenticated) dapat memperbarui status pesanan (UPDATE)
CREATE POLICY "Allow authenticated update" 
ON public.bookings 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Policy 4 (Opsional): Admin yang sudah terautentikasi dapat menghapus pesanan (DELETE)
CREATE POLICY "Allow authenticated delete" 
ON public.bookings 
FOR DELETE 
TO authenticated 
USING (true);

-- ==============================================================================
-- 3. Konfigurasi Supabase Realtime
-- ==============================================================================
-- Mengaktifkan pengiriman event real-time saat ada pesanan masuk atau berubah
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
END $$;

-- ==============================================================================
-- 4. Sample Data Awal (Opsional untuk pengujian)
-- ==============================================================================
INSERT INTO public.bookings (customer_name, customer_email, service_name, booking_date, status, created_at)
VALUES 
  ('Budi Santoso', 'budi.santoso@example.com', 'Spiritual Temple Tour', CURRENT_DATE + INTERVAL '3 days', 'Confirmed', now() - INTERVAL '2 hours'),
  ('Sarah Jenkins', 'sarah.j@outlook.com', 'Yoga & Meditation Retreat', CURRENT_DATE + INTERVAL '5 days', 'Pending', now() - INTERVAL '40 minutes'),
  ('Wayan Arya Wiguna', 'wayan.arya@bali.com', 'Healing & Purification', CURRENT_DATE + INTERVAL '1 day', 'Confirmed', now() - INTERVAL '1 day'),
  ('Elena Rostova', 'elena.rostova@mail.ru', 'Numerology Consultation', CURRENT_DATE + INTERVAL '2 days', 'Pending', now() - INTERVAL '15 minutes')
ON CONFLICT DO NOTHING;
