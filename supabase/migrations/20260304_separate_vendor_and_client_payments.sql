-- Separate vendor payments from client payments

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS payment_scope text;

UPDATE public.payments AS p
SET payment_scope = CASE
    WHEN lower(COALESCE(to_jsonb(p) ->> 'payment_scope', '')) = 'vendor' THEN 'vendor'
    WHEN COALESCE(to_jsonb(p) ->> 'vendor_name', '') <> '' THEN 'vendor'
    WHEN COALESCE(to_jsonb(p) -> 'details' ->> 'vendorName', '') <> '' THEN 'vendor'
    ELSE 'client'
END
WHERE payment_scope IS NULL OR btrim(payment_scope) = '';

ALTER TABLE public.payments
    ALTER COLUMN payment_scope SET DEFAULT 'client';

CREATE TABLE IF NOT EXISTS public.vendor_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name text NOT NULL,
    payment_date date,
    invoice_no text,
    invoice_month text,
    method text,
    amount numeric(14,2) NOT NULL DEFAULT 0,
    tax_deduction numeric(14,2) NOT NULL DEFAULT 0,
    net_amount numeric(14,2) NOT NULL DEFAULT 0,
    reference text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_payments_date ON public.vendor_payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor_name ON public.vendor_payments(vendor_name);
CREATE INDEX IF NOT EXISTS idx_payments_scope ON public.payments(payment_scope);

INSERT INTO public.vendor_payments (
    vendor_name,
    payment_date,
    invoice_no,
    invoice_month,
    method,
    amount,
    tax_deduction,
    net_amount,
    reference,
    notes
)
SELECT
    COALESCE(to_jsonb(p) ->> 'vendor_name', to_jsonb(p) -> 'details' ->> 'vendorName', 'Unknown Vendor') AS vendor_name,
    COALESCE(
        CASE
            WHEN (to_jsonb(p) ->> 'payment_date') ~ '^\d{4}-\d{2}-\d{2}$' THEN (to_jsonb(p) ->> 'payment_date')::date
            WHEN (to_jsonb(p) ->> 'date') ~ '^\d{4}-\d{2}-\d{2}$' THEN (to_jsonb(p) ->> 'date')::date
            ELSE NULL
        END,
        CURRENT_DATE
    ) AS payment_date,
    COALESCE(to_jsonb(p) ->> 'invoice_no', to_jsonb(p) -> 'details' ->> 'invoiceNo', '') AS invoice_no,
    COALESCE(to_jsonb(p) ->> 'invoice_month', to_jsonb(p) -> 'details' ->> 'invoiceMonth', '') AS invoice_month,
    COALESCE(to_jsonb(p) ->> 'method', to_jsonb(p) -> 'details' ->> 'method', '') AS method,
    COALESCE(
        CASE WHEN (to_jsonb(p) ->> 'amount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) ->> 'amount')::numeric END,
        0
    ) AS amount,
    COALESCE(
        CASE WHEN (to_jsonb(p) ->> 'tax_deduction') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) ->> 'tax_deduction')::numeric END,
        CASE WHEN (to_jsonb(p) ->> 'tax_amount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) ->> 'tax_amount')::numeric END,
        CASE WHEN (to_jsonb(p) -> 'details' ->> 'taxDeduction') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) -> 'details' ->> 'taxDeduction')::numeric END,
        0
    ) AS tax_deduction,
    COALESCE(
        CASE WHEN (to_jsonb(p) ->> 'net_amount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) ->> 'net_amount')::numeric END,
        CASE WHEN (to_jsonb(p) -> 'details' ->> 'netAmount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) -> 'details' ->> 'netAmount')::numeric END,
        COALESCE(
            CASE WHEN (to_jsonb(p) ->> 'amount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) ->> 'amount')::numeric END,
            0
        ) - COALESCE(
            CASE WHEN (to_jsonb(p) ->> 'tax_deduction') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) ->> 'tax_deduction')::numeric END,
            CASE WHEN (to_jsonb(p) ->> 'tax_amount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) ->> 'tax_amount')::numeric END,
            0
        )
    ) AS net_amount,
    COALESCE(to_jsonb(p) ->> 'reference', to_jsonb(p) ->> 'payment_reference', '') AS reference,
    COALESCE(to_jsonb(p) ->> 'notes', to_jsonb(p) -> 'details' ->> 'notes', '') AS notes
FROM public.payments AS p
WHERE p.payment_scope = 'vendor'
  AND NOT EXISTS (
      SELECT 1
      FROM public.vendor_payments vp
      WHERE COALESCE(vp.reference, '') = COALESCE(to_jsonb(p) ->> 'reference', to_jsonb(p) ->> 'payment_reference', '')
        AND COALESCE(vp.invoice_no, '') = COALESCE(to_jsonb(p) ->> 'invoice_no', to_jsonb(p) -> 'details' ->> 'invoiceNo', '')
        AND COALESCE(vp.vendor_name, '') = COALESCE(to_jsonb(p) ->> 'vendor_name', to_jsonb(p) -> 'details' ->> 'vendorName', 'Unknown Vendor')
  );