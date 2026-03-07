-- Dashboard monthly summary view for Supabase Table Editor
-- Exposes month-wise metrics used by dashboard cards and filters.

CREATE OR REPLACE VIEW public.dashboard_monthly_summary AS
WITH bounds AS (
    SELECT
        date_trunc('month', LEAST(
            COALESCE((SELECT MIN(created_at) FROM public.clients), now()),
            COALESCE((SELECT MIN(created_at) FROM public.vehicles), now()),
            COALESCE((SELECT MIN(created_at) FROM public.invoices), now())
        ))::date AS start_month,
        date_trunc('month', now())::date AS end_month
),
months AS (
    SELECT generate_series(start_month, end_month, interval '1 month')::date AS month_start
    FROM bounds
),
invoice_rows AS (
    SELECT
        date_trunc('month', COALESCE(i.created_at, now()))::date AS month_start,
        COALESCE(i.total, 0)::numeric(14,2) AS invoice_total,
        CASE
            WHEN COALESCE(i.details->>'balance', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
                THEN GREATEST((i.details->>'balance')::numeric, 0)
            WHEN COALESCE(i.details->>'paidAmount', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
                THEN GREATEST(COALESCE(i.total, 0)::numeric - (i.details->>'paidAmount')::numeric, 0)
            WHEN COALESCE(i.details->>'paid_amount', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
                THEN GREATEST(COALESCE(i.total, 0)::numeric - (i.details->>'paid_amount')::numeric, 0)
            ELSE CASE
                WHEN lower(COALESCE(i.status, '')) = 'paid' THEN 0::numeric
                ELSE COALESCE(i.total, 0)::numeric
            END
        END AS pending_amount
    FROM public.invoices i
),
invoice_monthly AS (
    SELECT
        month_start,
        SUM(invoice_total)::numeric(14,2) AS total_revenue,
        SUM(pending_amount)::numeric(14,2) AS pending_payments
    FROM invoice_rows
    GROUP BY month_start
),
clients_monthly AS (
    SELECT
        date_trunc('month', COALESCE(c.created_at, now()))::date AS month_start,
        COUNT(*)::int AS added_clients
    FROM public.clients c
    GROUP BY 1
),
vehicles_monthly AS (
    SELECT
        date_trunc('month', COALESCE(v.created_at, now()))::date AS month_start,
        COUNT(*)::int AS added_vehicles
    FROM public.vehicles v
    GROUP BY 1
)
SELECT
    m.month_start,
    to_char(m.month_start, 'Mon YYYY') AS month_label,
    (
        SELECT COUNT(*)::int
        FROM public.clients c
        WHERE COALESCE(c.created_at, now()) < (m.month_start + interval '1 month')
    ) AS total_clients,
    COALESCE(cm.added_clients, 0) AS added_clients,
    (
        SELECT COUNT(*)::int
        FROM public.vehicles v
        WHERE COALESCE(v.created_at, now()) < (m.month_start + interval '1 month')
    ) AS total_vehicles,
    COALESCE(vm.added_vehicles, 0) AS added_vehicles,
    COALESCE(im.total_revenue, 0)::numeric(14,2) AS total_revenue,
    COALESCE(im.pending_payments, 0)::numeric(14,2) AS pending_payments
FROM months m
LEFT JOIN invoice_monthly im ON im.month_start = m.month_start
LEFT JOIN clients_monthly cm ON cm.month_start = m.month_start
LEFT JOIN vehicles_monthly vm ON vm.month_start = m.month_start
ORDER BY m.month_start DESC;

GRANT SELECT ON public.dashboard_monthly_summary TO anon, authenticated;
