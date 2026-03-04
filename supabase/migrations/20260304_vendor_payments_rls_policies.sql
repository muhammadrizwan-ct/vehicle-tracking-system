-- Ensure vendor_payments can be used by frontend Supabase client

ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'vendor_payments' AND policyname = 'vendor_payments_select_all'
    ) THEN
        CREATE POLICY vendor_payments_select_all
            ON public.vendor_payments
            FOR SELECT
            TO anon, authenticated
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'vendor_payments' AND policyname = 'vendor_payments_insert_all'
    ) THEN
        CREATE POLICY vendor_payments_insert_all
            ON public.vendor_payments
            FOR INSERT
            TO anon, authenticated
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'vendor_payments' AND policyname = 'vendor_payments_update_all'
    ) THEN
        CREATE POLICY vendor_payments_update_all
            ON public.vendor_payments
            FOR UPDATE
            TO anon, authenticated
            USING (true)
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'vendor_payments' AND policyname = 'vendor_payments_delete_all'
    ) THEN
        CREATE POLICY vendor_payments_delete_all
            ON public.vendor_payments
            FOR DELETE
            TO anon, authenticated
            USING (true);
    END IF;
END
$$;