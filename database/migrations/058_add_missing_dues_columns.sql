-- ============================================================================
-- Migration: Add Missing Columns to dues_transactions
-- Description: Adds detailed financial breakdown columns to match schema definition
-- Date: 2025-12-15
-- ============================================================================

-- Add missing financial breakdown columns to dues_transactions
ALTER TABLE public.dues_transactions 
  ADD COLUMN IF NOT EXISTS dues_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS cope_amount NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS pac_amount NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS strike_fund_amount NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS late_fee_amount NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS adjustment_amount NUMERIC(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS paid_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Backfill dues_amount and total_amount from existing amount column
UPDATE public.dues_transactions 
SET 
  dues_amount = COALESCE(dues_amount, amount),
  total_amount = COALESCE(total_amount, amount)
WHERE dues_amount IS NULL OR total_amount IS NULL;

-- Make dues_amount and total_amount NOT NULL after backfill
ALTER TABLE public.dues_transactions 
  ALTER COLUMN dues_amount SET NOT NULL,
  ALTER COLUMN total_amount SET NOT NULL;

-- Create computed total check constraint
ALTER TABLE public.dues_transactions 
  DROP CONSTRAINT IF EXISTS valid_total_amount;

ALTER TABLE public.dues_transactions 
  ADD CONSTRAINT valid_total_amount CHECK (
    total_amount = COALESCE(dues_amount, 0) + 
                   COALESCE(cope_amount, 0) + 
                   COALESCE(pac_amount, 0) + 
                   COALESCE(strike_fund_amount, 0) + 
                   COALESCE(late_fee_amount, 0) + 
                   COALESCE(adjustment_amount, 0)
  );

-- Add indexes for financial reporting
CREATE INDEX IF NOT EXISTS idx_dues_trans_amounts ON public.dues_transactions(tenant_id, total_amount);
CREATE INDEX IF NOT EXISTS idx_dues_trans_paid_date ON public.dues_transactions(paid_date) WHERE paid_date IS NOT NULL;

-- Add comment explaining the schema
COMMENT ON TABLE public.dues_transactions IS 'Member dues transactions with detailed financial breakdown';
COMMENT ON COLUMN public.dues_transactions.dues_amount IS 'Base union dues amount';
COMMENT ON COLUMN public.dues_transactions.cope_amount IS 'Committee on Political Education contribution';
COMMENT ON COLUMN public.dues_transactions.pac_amount IS 'Political Action Committee contribution';
COMMENT ON COLUMN public.dues_transactions.strike_fund_amount IS 'Strike fund contribution';
COMMENT ON COLUMN public.dues_transactions.late_fee_amount IS 'Late payment fee';
COMMENT ON COLUMN public.dues_transactions.adjustment_amount IS 'Manual adjustment amount (positive or negative)';
COMMENT ON COLUMN public.dues_transactions.total_amount IS 'Total amount due (sum of all components)';
COMMENT ON COLUMN public.dues_transactions.paid_date IS 'Timestamp when payment was recorded';
COMMENT ON COLUMN public.dues_transactions.receipt_url IS 'URL to payment receipt (e.g., Stripe receipt)';
