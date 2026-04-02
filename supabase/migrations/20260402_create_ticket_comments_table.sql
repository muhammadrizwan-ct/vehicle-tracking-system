-- Create ticket_comments table for conversation threads on tickets.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ticket_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    comment text NOT NULL,
    created_by text NOT NULL,
    created_by_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON public.ticket_comments(ticket_id);

-- RLS
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY ticket_comments_select_authenticated ON public.ticket_comments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY ticket_comments_insert_authenticated ON public.ticket_comments
    FOR INSERT TO authenticated WITH CHECK (true);

-- Only admins can delete comments
CREATE POLICY ticket_comments_delete_admin ON public.ticket_comments
    FOR DELETE TO authenticated USING (public.current_app_role() = 'admin');

COMMIT;
