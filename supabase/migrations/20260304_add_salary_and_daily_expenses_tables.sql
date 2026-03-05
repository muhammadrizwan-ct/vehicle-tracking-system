-- Add salary and daily expenses tables for Supabase-backed Expenses module

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.salary_expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_name text NOT NULL,
    expense_date date NOT NULL DEFAULT CURRENT_DATE,
    basic_salary numeric(14,2) NOT NULL DEFAULT 0,
    house_allowance numeric(14,2) NOT NULL DEFAULT 0,
    transport_allowance numeric(14,2) NOT NULL DEFAULT 0,
    other_allowance numeric(14,2) NOT NULL DEFAULT 0,
    gross_salary numeric(14,2) NOT NULL DEFAULT 0,
    tax_deduction numeric(14,2) NOT NULL DEFAULT 0,
    net_payable numeric(14,2) NOT NULL DEFAULT 0,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_name text NOT NULL,
    expense_date date NOT NULL DEFAULT CURRENT_DATE,
    working_days numeric(10,2) NOT NULL DEFAULT 0,
    travel_per_day numeric(14,2) NOT NULL DEFAULT 0,
    meal_per_day numeric(14,2) NOT NULL DEFAULT 0,
    fuel_per_day numeric(14,2) NOT NULL DEFAULT 0,
    other_per_day numeric(14,2) NOT NULL DEFAULT 0,
    total_amount numeric(14,2) NOT NULL DEFAULT 0,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salary_expenses_date ON public.salary_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_salary_expenses_employee ON public.salary_expenses(employee_name);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_date ON public.daily_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_employee ON public.daily_expenses(employee_name);

ALTER TABLE public.salary_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_expenses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'salary_expenses' AND policyname = 'salary_expenses_select_all'
    ) THEN
        CREATE POLICY salary_expenses_select_all
            ON public.salary_expenses
            FOR SELECT
            TO anon, authenticated
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'salary_expenses' AND policyname = 'salary_expenses_insert_all'
    ) THEN
        CREATE POLICY salary_expenses_insert_all
            ON public.salary_expenses
            FOR INSERT
            TO anon, authenticated
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'salary_expenses' AND policyname = 'salary_expenses_update_all'
    ) THEN
        CREATE POLICY salary_expenses_update_all
            ON public.salary_expenses
            FOR UPDATE
            TO anon, authenticated
            USING (true)
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'salary_expenses' AND policyname = 'salary_expenses_delete_all'
    ) THEN
        CREATE POLICY salary_expenses_delete_all
            ON public.salary_expenses
            FOR DELETE
            TO anon, authenticated
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'daily_expenses' AND policyname = 'daily_expenses_select_all'
    ) THEN
        CREATE POLICY daily_expenses_select_all
            ON public.daily_expenses
            FOR SELECT
            TO anon, authenticated
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'daily_expenses' AND policyname = 'daily_expenses_insert_all'
    ) THEN
        CREATE POLICY daily_expenses_insert_all
            ON public.daily_expenses
            FOR INSERT
            TO anon, authenticated
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'daily_expenses' AND policyname = 'daily_expenses_update_all'
    ) THEN
        CREATE POLICY daily_expenses_update_all
            ON public.daily_expenses
            FOR UPDATE
            TO anon, authenticated
            USING (true)
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'daily_expenses' AND policyname = 'daily_expenses_delete_all'
    ) THEN
        CREATE POLICY daily_expenses_delete_all
            ON public.daily_expenses
            FOR DELETE
            TO anon, authenticated
            USING (true);
    END IF;
END
$$;