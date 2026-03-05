-- Adds explicit payment breakdown columns so Supabase table editor matches live Client Payments UI

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS paid_amount numeric(14,2),
    ADD COLUMN IF NOT EXISTS tax_deduction_percentage numeric(7,4),
    ADD COLUMN IF NOT EXISTS tax_amount numeric(14,2),
    ADD COLUMN IF NOT EXISTS invoice_amount numeric(14,2),
    ADD COLUMN IF NOT EXISTS net_amount numeric(14,2);

UPDATE public.payments AS p
SET
    paid_amount = COALESCE(
        paid_amount,
        amount,
        CASE WHEN (to_jsonb(p) -> 'details' ->> 'paidAmount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) -> 'details' ->> 'paidAmount')::numeric END,
        CASE WHEN (to_jsonb(p) -> 'details' ->> 'paid_amount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) -> 'details' ->> 'paid_amount')::numeric END,
        CASE WHEN (to_jsonb(p) -> 'details' ->> 'totalAmount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) -> 'details' ->> 'totalAmount')::numeric END,
        CASE WHEN (to_jsonb(p) -> 'details' ->> 'total_amount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) -> 'details' ->> 'total_amount')::numeric END
    ),
    tax_deduction_percentage = COALESCE(
        tax_deduction_percentage,
        CASE WHEN (to_jsonb(p) -> 'details' ->> 'taxDeductionPercentage') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) -> 'details' ->> 'taxDeductionPercentage')::numeric END,
        CASE WHEN (to_jsonb(p) -> 'details' ->> 'tax_deduction_percentage') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) -> 'details' ->> 'tax_deduction_percentage')::numeric END,
        CASE WHEN (to_jsonb(p) -> 'details' ->> 'taxRate') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) -> 'details' ->> 'taxRate')::numeric END,
        CASE WHEN (to_jsonb(p) -> 'details' ->> 'tax_rate') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) -> 'details' ->> 'tax_rate')::numeric END,
        CASE
            WHEN COALESCE(amount, 0) > 0 THEN (COALESCE(tax_amount, 0) / amount) * 100
            ELSE NULL
        END
    ),
    tax_amount = COALESCE(
        tax_amount,
        CASE WHEN (to_jsonb(p) -> 'details' ->> 'taxAmount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) -> 'details' ->> 'taxAmount')::numeric END,
        CASE WHEN (to_jsonb(p) -> 'details' ->> 'tax_amount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) -> 'details' ->> 'tax_amount')::numeric END,
        CASE WHEN (to_jsonb(p) -> 'details' ->> 'taxDeduction') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) -> 'details' ->> 'taxDeduction')::numeric END,
        CASE WHEN (to_jsonb(p) -> 'details' ->> 'tax_deduction') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) -> 'details' ->> 'tax_deduction')::numeric END
    ),
    invoice_amount = COALESCE(
        invoice_amount,
        CASE WHEN (to_jsonb(p) -> 'details' ->> 'invoiceAmount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) -> 'details' ->> 'invoiceAmount')::numeric END,
        CASE WHEN (to_jsonb(p) -> 'details' ->> 'invoice_amount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) -> 'details' ->> 'invoice_amount')::numeric END,
        amount
    ),
    net_amount = COALESCE(
        net_amount,
        CASE WHEN (to_jsonb(p) -> 'details' ->> 'netAmount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) -> 'details' ->> 'netAmount')::numeric END,
        CASE WHEN (to_jsonb(p) -> 'details' ->> 'net_amount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (to_jsonb(p) -> 'details' ->> 'net_amount')::numeric END,
        CASE
            WHEN amount IS NOT NULL THEN amount - COALESCE(tax_amount, 0)
            ELSE NULL
        END
    );