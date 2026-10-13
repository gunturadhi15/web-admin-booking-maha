-- ==============================================================================
-- DATABASE SCHEMA: DASBOR UNTUNG USAHA (PRD & BACKLOG SPECIFICATION)
-- Database: PostgreSQL (Supabase) dengan Row Level Security (RLS) & Realtime
-- ==============================================================================

-- 1. TABEL `admins` (Pengguna & Hak Akses)
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'Admin' CHECK (role IN ('Admin', 'Staf', 'Viewer')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABEL `customers` (Data Pelanggan)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    phone_normalized TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone_normalized);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers (name);

-- 3. TABEL `orders` (Kelola Pesanan & Booking)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    service_or_item TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('website', 'whatsapp', 'manual')),
    external_order_id TEXT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    order_time TEXT NOT NULL DEFAULT '09:00',
    status TEXT NOT NULL DEFAULT 'Baru' CHECK (status IN ('Baru', 'Dikonfirmasi', 'Diproses', 'Selesai', 'Dibatalkan')),
    payment_status TEXT NOT NULL DEFAULT 'Belum Dibayar' CHECK (payment_status IN ('Belum Dibayar', 'DP', 'Lunas', 'Refund')),
    subtotal_amount NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    additional_income_amount NUMERIC NOT NULL DEFAULT 0,
    refund_amount NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    is_closed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_date ON public.orders (order_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_source ON public.orders (source);
CREATE INDEX IF NOT EXISTS idx_orders_code ON public.orders (order_code);

-- 4. TABEL `order_costs` (Kelola Modal & Biaya Langsung per Pesanan)
CREATE TABLE IF NOT EXISTS public.order_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('Modal/HPP', 'Biaya Bahan', 'Transportasi', 'Fee Pemandu/Terapis', 'Biaya Langsung Lain')),
    description TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    cost_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_costs_order ON public.order_costs (order_id);

-- 5. TABEL `financial_transactions` (Pembukuan Pemasukan & Pengeluaran Kas)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_code TEXT UNIQUE NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('order', 'order_cost', 'manual', 'operational')),
    source_id UUID,
    payment_method TEXT DEFAULT 'Transfer Bank',
    is_closed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.financial_transactions (transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.financial_transactions (type);

-- 6. TABEL `closing_periods` (Rekap Tutup Buku)
CREATE TABLE IF NOT EXISTS public.closing_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('open', 'closed', 'reopened')),
    total_revenue NUMERIC NOT NULL DEFAULT 0,
    total_cost NUMERIC NOT NULL DEFAULT 0,
    net_profit NUMERIC NOT NULL DEFAULT 0,
    closed_by TEXT NOT NULL DEFAULT 'Admin',
    closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT
);

-- 7. TABEL `sync_runs` (Riwayat & Log Tarik Data Web Utama)
CREATE TABLE IF NOT EXISTS public.sync_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name TEXT NOT NULL DEFAULT 'Website Utama (Sacred Journey Bali)',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'Berhasil' CHECK (status IN ('Menunggu', 'Berjalan', 'Berhasil', 'Berhasil dengan Peringatan', 'Gagal')),
    records_seen INT NOT NULL DEFAULT 0,
    records_created INT NOT NULL DEFAULT 0,
    records_updated INT NOT NULL DEFAULT 0,
    records_skipped INT NOT NULL DEFAULT 0,
    error_summary TEXT,
    triggered_by TEXT NOT NULL DEFAULT 'Manual Admin'
);

-- 8. TABEL `audit_logs` (Pencatatan Perubahan Penting)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_name TEXT NOT NULL DEFAULT 'Admin',
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs (created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closing_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Izinkan publik untuk insert order jika sinkronisasi web publik mengirim langsung
CREATE POLICY "Allow anon insert orders" ON public.orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow authenticated all orders" ON public.orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow anon select orders" ON public.orders FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon update orders" ON public.orders FOR UPDATE TO anon USING (true);

-- Customer policies
CREATE POLICY "Allow all customers" ON public.customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Costs policies
CREATE POLICY "Allow all order_costs" ON public.order_costs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Financial transactions
CREATE POLICY "Allow all transactions" ON public.financial_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Closing periods
CREATE POLICY "Allow all closing" ON public.closing_periods FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Sync runs
CREATE POLICY "Allow all sync_runs" ON public.sync_runs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Audit logs
CREATE POLICY "Allow all audit_logs" ON public.audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- SUPABASE REALTIME PUBLICATION
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'financial_transactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_transactions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'sync_runs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_runs;
  END IF;
END $$;

-- ==============================================================================
-- DATA DUMMY AWAL (SEED DEVELOPMENT DATA)
-- ==============================================================================
INSERT INTO public.customers (id, name, phone, phone_normalized, email, address, notes)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Budi Santoso', '+62 812-3456-7890', '6281234567890', 'budi.santoso@gmail.com', 'Denpasar, Bali', 'Pelanggan reguler tour spiritual'),
  ('22222222-2222-2222-2222-222222222222', 'Sarah Jenkins', '+62 819-8765-4321', '6281987654321', 'sarah.j@outlook.com', 'Ubud, Gianyar', 'Wisatawan Australia - Yoga Retreat'),
  ('33333333-3333-3333-3333-333333333333', 'Wayan Arya Wiguna', '+62 877-1122-3344', '6287711223344', 'wayan.arya@bali.com', 'Tampaksiring, Gianyar', 'Paket Melukat Tirta Empul'),
  ('44444444-4444-4444-4444-444444444444', 'Elena Rostova', '+7 916 123-45-67', '79161234567', 'elena.rostova@mail.ru', 'Canggu, Badung', 'Konsultasi Numerologi Online')
ON CONFLICT DO NOTHING;

INSERT INTO public.orders (id, order_code, customer_id, customer_name, customer_phone, service_or_item, source, external_order_id, order_date, order_time, status, payment_status, subtotal_amount, discount_amount, additional_income_amount, refund_amount, notes)
VALUES 
  ('aaaa1111-0000-0000-0000-000000000001', 'ORD-202610-001', '11111111-1111-1111-1111-111111111111', 'Budi Santoso', '+62 812-3456-7890', 'Spiritual Temple Tour (Divine Journey)', 'website', 'WEB-7721', CURRENT_DATE, '09:00', 'Selesai', 'Lunas', 650000, 0, 50000, 0, 'Selesai tepat waktu. Tamu sangat puas.'),
  ('aaaa1111-0000-0000-0000-000000000002', 'ORD-202610-002', '22222222-2222-2222-2222-222222222222', 'Sarah Jenkins', '+62 819-8765-4321', 'Yoga & Meditation Retreat (Full Day)', 'whatsapp', NULL, CURRENT_DATE, '10:00', 'Diproses', 'DP', 1200000, 50000, 0, 0, 'DP 50% diterima. Pelunasan di lokasi.'),
  ('aaaa1111-0000-0000-0000-000000000003', 'ORD-202610-003', '33333333-3333-3333-3333-333333333333', 'Wayan Arya Wiguna', '+62 877-1122-3344', 'Healing & Purification (Melukat Sebatu)', 'whatsapp', NULL, CURRENT_DATE, '14:00', 'Dikonfirmasi', 'Lunas', 450000, 0, 0, 0, 'Jadwal terkonfirmasi pemangku.'),
  ('aaaa1111-0000-0000-0000-000000000004', 'ORD-202610-004', '44444444-4444-4444-4444-444444444444', 'Elena Rostova', '+7 916 123-45-67', 'Numerology Consultation (Personal)', 'website', 'WEB-7729', CURRENT_DATE, '11:00', 'Baru', 'Belum Dibayar', 350000, 0, 0, 0, 'Menunggu konfirmasi pembayaran via WA.')
ON CONFLICT DO NOTHING;

INSERT INTO public.order_costs (order_id, category, description, amount, cost_date)
VALUES 
  ('aaaa1111-0000-0000-0000-000000000001', 'Modal/HPP', 'Tiket Masuk Pura & Sarana Pejati', 150000, CURRENT_DATE),
  ('aaaa1111-0000-0000-0000-000000000001', 'Transportasi', 'Bensin & Driver Antar Jemput', 120000, CURRENT_DATE),
  ('aaaa1111-0000-0000-0000-000000000002', 'Modal/HPP', 'Sewa Studio Yoga & Instruktur', 400000, CURRENT_DATE),
  ('aaaa1111-0000-0000-0000-000000000002', 'Biaya Bahan', 'Healthy Lunch & Herbal Drink', 150000, CURRENT_DATE),
  ('aaaa1111-0000-0000-0000-000000000003', 'Fee Pemandu/Terapis', 'Banten Melukat & Sesari Pemangku', 150000, CURRENT_DATE)
ON CONFLICT DO NOTHING;

INSERT INTO public.financial_transactions (transaction_code, transaction_date, type, category, description, amount, source_type, payment_method)
VALUES 
  ('TRX-202610-001', CURRENT_DATE, 'income', 'Pendapatan Pesanan', 'Pembayaran ORD-202610-001 Budi Santoso', 700000, 'order', 'QRIS'),
  ('TRX-202610-002', CURRENT_DATE, 'expense', 'HPP Pesanan', 'Biaya Tiket & Sarana Pejati ORD-202610-001', 150000, 'order_cost', 'Kas Kecil'),
  ('TRX-202610-003', CURRENT_DATE, 'expense', 'Transportasi', 'Bensin & Operasional Driver ORD-202610-001', 120000, 'order_cost', 'Kas Kecil'),
  ('TRX-202610-004', CURRENT_DATE, 'income', 'Pendapatan Pesanan (DP)', 'DP 50% ORD-202610-002 Sarah Jenkins', 575000, 'order', 'Transfer Bank'),
  ('TRX-202610-005', CURRENT_DATE, 'expense', 'Operasional Kantor', 'Biaya Internet & Listrik Operasional', 250000, 'operational', 'Transfer Bank')
ON CONFLICT DO NOTHING;

INSERT INTO public.sync_runs (source_name, started_at, finished_at, status, records_seen, records_created, records_updated, records_skipped, triggered_by)
VALUES 
  ('Website Utama (Sacred Journey Bali)', now() - INTERVAL '15 minutes', now() - INTERVAL '14 minutes', 'Berhasil', 4, 1, 3, 0, 'Otomatis Scheduler'),
  ('Website Utama (Sacred Journey Bali)', now() - INTERVAL '1 hour', now() - INTERVAL '59 minutes', 'Berhasil', 3, 2, 1, 0, 'Manual Admin')
ON CONFLICT DO NOTHING;

INSERT INTO public.admins (name, email, role, is_active)
VALUES ('Pemilik Usaha / Admin', 'admin@dasboruntung.com', 'Admin', true)
ON CONFLICT DO NOTHING;
