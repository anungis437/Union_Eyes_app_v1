-- Add missing fields to arrears_cases table for enhanced tracking
-- These fields are used by the arrears management routes

ALTER TABLE public.arrears_cases 
ADD COLUMN IF NOT EXISTS transaction_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS remaining_balance DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS days_overdue INTEGER,
ADD COLUMN IF NOT EXISTS contact_history JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS payment_schedule JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS payment_plan_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_plan_start_date DATE,
ADD COLUMN IF NOT EXISTS installment_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS number_of_installments INTEGER,
ADD COLUMN IF NOT EXISTS created_by TEXT,
ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- Update remaining_balance to match total_owed for existing records
UPDATE public.arrears_cases 
SET remaining_balance = total_owed 
WHERE remaining_balance IS NULL;

-- Create index for transaction IDs array
CREATE INDEX IF NOT EXISTS idx_arrears_transaction_ids ON public.arrears_cases USING GIN(transaction_ids);

SELECT 'Arrears cases table enhanced successfully' AS status;
