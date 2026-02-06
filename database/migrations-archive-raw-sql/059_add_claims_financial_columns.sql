-- ============================================================================
-- Migration: Add Missing Financial and Resolution Columns to Claims
-- Description: Adds financial tracking and resolution outcome columns to claims table
-- Date: 2025-12-15
-- ============================================================================

-- Add missing financial columns to claims table
ALTER TABLE public.claims 
  ADD COLUMN IF NOT EXISTS claim_amount VARCHAR(20),
  ADD COLUMN IF NOT EXISTS settlement_amount VARCHAR(20),
  ADD COLUMN IF NOT EXISTS legal_costs VARCHAR(20),
  ADD COLUMN IF NOT EXISTS court_costs VARCHAR(20);

-- Add missing resolution columns
ALTER TABLE public.claims 
  ADD COLUMN IF NOT EXISTS resolution_outcome VARCHAR(100),
  ADD COLUMN IF NOT EXISTS filed_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for financial reporting and resolution tracking
CREATE INDEX IF NOT EXISTS idx_claims_claim_amount ON public.claims(claim_amount) 
  WHERE claim_amount IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_claims_settlement_amount ON public.claims(settlement_amount) 
  WHERE settlement_amount IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_claims_resolution_outcome ON public.claims(resolution_outcome) 
  WHERE resolution_outcome IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_claims_filed_date ON public.claims(filed_date DESC) 
  WHERE filed_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_claims_resolved_at ON public.claims(resolved_at DESC) 
  WHERE resolved_at IS NOT NULL;

-- Add composite index for financial analysis
CREATE INDEX IF NOT EXISTS idx_claims_financial_tracking ON public.claims(organization_id, status, claim_amount) 
  WHERE claim_amount IS NOT NULL;

-- Add comments explaining the columns
COMMENT ON COLUMN public.claims.claim_amount IS 'Amount being claimed by member (stored as string for precision)';
COMMENT ON COLUMN public.claims.settlement_amount IS 'Final settlement amount agreed upon (stored as string for precision)';
COMMENT ON COLUMN public.claims.legal_costs IS 'Legal costs incurred for this claim (stored as string for precision)';
COMMENT ON COLUMN public.claims.court_costs IS 'Court costs if claim went to arbitration/court (stored as string for precision)';
COMMENT ON COLUMN public.claims.resolution_outcome IS 'Final outcome description of the resolved claim';
COMMENT ON COLUMN public.claims.filed_date IS 'Date when claim was formally filed';
COMMENT ON COLUMN public.claims.resolved_at IS 'Timestamp when claim was marked as resolved';

-- Add check constraint to ensure resolved_at is set when status is resolved/closed
ALTER TABLE public.claims 
  DROP CONSTRAINT IF EXISTS check_resolved_at_with_status;

ALTER TABLE public.claims 
  ADD CONSTRAINT check_resolved_at_with_status CHECK (
    (status NOT IN ('resolved', 'closed') OR resolved_at IS NOT NULL)
  );

-- Add trigger to auto-set resolved_at when status changes to resolved/closed
CREATE OR REPLACE FUNCTION set_claim_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed') THEN
    NEW.resolved_at = COALESCE(NEW.resolved_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_claim_resolved_at ON public.claims;

CREATE TRIGGER trigger_set_claim_resolved_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION set_claim_resolved_at();
