-- Create tickets table for task/ticket management.

BEGIN;

CREATE TABLE IF NOT EXISTS public.tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number text UNIQUE NOT NULL,
    title text NOT NULL,
    description text,
    assigned_to text,
    priority text NOT NULL DEFAULT 'medium',
    status text NOT NULL DEFAULT 'open',
    created_by text NOT NULL,
    due_date date,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON public.tickets(created_by);

-- RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read tickets
CREATE POLICY tickets_select_authenticated ON public.tickets
    FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to insert tickets
CREATE POLICY tickets_insert_authenticated ON public.tickets
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow all authenticated users to update tickets
CREATE POLICY tickets_update_authenticated ON public.tickets
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Only admins can delete tickets (via current_app_role function)
CREATE POLICY tickets_delete_admin ON public.tickets
    FOR DELETE TO authenticated USING (public.current_app_role() = 'admin');

COMMIT;
