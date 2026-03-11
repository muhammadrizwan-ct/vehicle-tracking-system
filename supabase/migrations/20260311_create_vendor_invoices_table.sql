-- Create vendor_invoices table for persistent storage of vendor invoices

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.vendor_invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name text NOT NULL,
    invoice_no text NOT NULL,
    invoice_date date,
    invoice_month text,
    amount numeric(14,2) NOT NULL DEFAULT 0,
    paid_amount numeric(14,2) NOT NULL DEFAULT 0,
    balance numeric(14,2) NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'Pending',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_invoices_invoice_no
    ON public.vendor_invoices (invoice_no);

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_vendor_name
    ON public.vendor_invoices (vendor_name);

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_invoice_date
    ON public.vendor_invoices (invoice_date DESC);

-- RLS policies
ALTER TABLE public.vendor_invoices ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'vendor_invoices' AND policyname = 'vendor_invoices_select_all'
    ) THEN
        CREATE POLICY vendor_invoices_select_all
            ON public.vendor_invoices
            FOR SELECT
            TO anon, authenticated
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'vendor_invoices' AND policyname = 'vendor_invoices_insert_all'
    ) THEN
        CREATE POLICY vendor_invoices_insert_all
            ON public.vendor_invoices
            FOR INSERT
            TO anon, authenticated
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'vendor_invoices' AND policyname = 'vendor_invoices_update_all'
    ) THEN
        CREATE POLICY vendor_invoices_update_all
            ON public.vendor_invoices
            FOR UPDATE
            TO anon, authenticated
            USING (true)
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'vendor_invoices' AND policyname = 'vendor_invoices_delete_all'
    ) THEN
        CREATE POLICY vendor_invoices_delete_all
            ON public.vendor_invoices
            FOR DELETE
            TO anon, authenticated
            USING (true);
    END IF;
END
$$;
