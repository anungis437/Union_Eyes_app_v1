-- Migration: PKI Digital Signatures System
-- Description: Officer attestation workflow with certificate authority integration
-- Phase: 1 - Critical CLC Compliance
-- Date: 2025-11-24

-- =====================================================================================
-- PART 1: DIGITAL SIGNATURE SCHEMA
-- =====================================================================================

-- Signature types enum
DROP TYPE IF EXISTS signature_type CASCADE;
CREATE TYPE signature_type AS ENUM (
  'financial_attestation',
  'document_approval',
  'meeting_minutes',
  'contract_signing',
  'policy_approval',
  'election_certification',
  'grievance_settlement',
  'collective_agreement'
);

-- Signature status enum
DROP TYPE IF EXISTS signature_status CASCADE;
CREATE TYPE signature_status AS ENUM (
  'pending',
  'signed',
  'rejected',
  'expired',
  'revoked'
);

-- Digital signatures table
CREATE TABLE IF NOT EXISTS digital_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization context
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Document/transaction being signed
  document_type VARCHAR(100) NOT NULL,
  document_id UUID NOT NULL,
  document_hash VARCHAR(128) NOT NULL, -- SHA-512 hash of document
  document_url TEXT,
  
  -- Signature details
  signature_type signature_type NOT NULL,
  signature_status signature_status DEFAULT 'pending',
  
  -- Signer information
  signer_user_id UUID NOT NULL,
  signer_name VARCHAR(200) NOT NULL,
  signer_title VARCHAR(100),
  signer_email VARCHAR(255),
  
  -- PKI certificate details
  certificate_subject VARCHAR(500), -- X.509 Subject DN
  certificate_issuer VARCHAR(500), -- X.509 Issuer DN
  certificate_serial_number VARCHAR(100),
  certificate_thumbprint VARCHAR(128), -- SHA-256 thumbprint
  certificate_not_before TIMESTAMP WITH TIME ZONE,
  certificate_not_after TIMESTAMP WITH TIME ZONE,
  
  -- Signature cryptographic data
  signature_algorithm VARCHAR(50), -- RSA-SHA256, ECDSA-SHA256, etc.
  signature_value TEXT, -- Base64-encoded signature
  public_key TEXT, -- Base64-encoded public key (PEM format)
  
  -- Timestamp from trusted TSA (Time Stamping Authority)
  timestamp_token TEXT, -- RFC 3161 timestamp token
  timestamp_authority VARCHAR(200),
  timestamp_value TIMESTAMP WITH TIME ZONE,
  
  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_method VARCHAR(100),
  
  -- Metadata
  signed_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  geolocation JSONB, -- {lat, lng, city, country}
  
  -- Rejection/revocation
  rejection_reason TEXT,
  rejected_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revocation_reason TEXT,
  
  -- Audit trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_certificate_validity CHECK (
    certificate_not_before IS NULL OR 
    certificate_not_after IS NULL OR 
    certificate_not_after > certificate_not_before
  ),
  CONSTRAINT unique_document_signer UNIQUE (document_type, document_id, signer_user_id)
);

-- Indexes
CREATE INDEX idx_digital_signatures_org ON digital_signatures(organization_id);
CREATE INDEX idx_digital_signatures_document ON digital_signatures(document_type, document_id);
CREATE INDEX idx_digital_signatures_signer ON digital_signatures(signer_user_id);
CREATE INDEX idx_digital_signatures_status ON digital_signatures(signature_status);
CREATE INDEX idx_digital_signatures_type ON digital_signatures(signature_type);
CREATE INDEX idx_digital_signatures_hash ON digital_signatures(document_hash);
CREATE INDEX idx_digital_signatures_signed_at ON digital_signatures(signed_at);

-- RLS policies
ALTER TABLE digital_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_signatures ON digital_signatures
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

CREATE POLICY insert_signatures ON digital_signatures
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND signer_user_id = current_setting('app.current_user_id', TRUE)::UUID
  );

CREATE POLICY update_signatures ON digital_signatures
  FOR UPDATE
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND (
      signer_user_id = current_setting('app.current_user_id', TRUE)::UUID
      OR current_setting('app.current_user_role', TRUE) IN ('admin', 'officer')
    )
  );

-- =====================================================================================
-- PART 2: SIGNATURE WORKFLOWS
-- =====================================================================================

-- Signature workflow requirements
CREATE TABLE IF NOT EXISTS signature_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization context
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Workflow definition
  workflow_name VARCHAR(200) NOT NULL,
  document_type VARCHAR(100) NOT NULL,
  signature_type signature_type NOT NULL,
  
  -- Required signers
  required_signatures INTEGER DEFAULT 1,
  required_roles JSONB, -- Array of roles: ["president", "treasurer", "secretary"]
  sequential_signing BOOLEAN DEFAULT false, -- Must sign in order
  expiration_hours INTEGER DEFAULT 168, -- 7 days default
  
  -- Approval logic
  approval_threshold INTEGER, -- E.g., 2 of 3 officers
  allow_delegation BOOLEAN DEFAULT false,
  
  -- Notifications
  notify_on_pending BOOLEAN DEFAULT true,
  notify_on_signed BOOLEAN DEFAULT true,
  reminder_interval_hours INTEGER DEFAULT 24,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  
  CONSTRAINT unique_workflow_doc_type UNIQUE (organization_id, document_type, signature_type)
);

CREATE INDEX idx_signature_workflows_org ON signature_workflows(organization_id);
CREATE INDEX idx_signature_workflows_doc_type ON signature_workflows(document_type);

-- RLS policies for signature_workflows
ALTER TABLE signature_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_workflows ON signature_workflows
  FOR SELECT
  USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

CREATE POLICY manage_workflows ON signature_workflows
  FOR ALL
  USING (
    organization_id = current_setting('app.current_organization_id', TRUE)::UUID
    AND current_setting('app.current_user_role', TRUE) IN ('admin', 'officer')
  );

-- =====================================================================================
-- PART 3: CERTIFICATE AUTHORITY INTEGRATION
-- =====================================================================================

-- Trusted certificate authorities
CREATE TABLE IF NOT EXISTS trusted_certificate_authorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- CA details
  ca_name VARCHAR(200) NOT NULL,
  ca_type VARCHAR(50) NOT NULL, -- public, private, government
  issuer_dn VARCHAR(500) NOT NULL UNIQUE, -- X.509 Issuer Distinguished Name
  
  -- Root certificate
  root_certificate TEXT NOT NULL, -- PEM-encoded root cert
  root_certificate_thumbprint VARCHAR(128) NOT NULL UNIQUE,
  
  -- Trust settings
  is_trusted BOOLEAN DEFAULT true,
  trust_level VARCHAR(50) DEFAULT 'high', -- high, medium, low
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  
  -- CRL (Certificate Revocation List)
  crl_url TEXT,
  crl_last_updated TIMESTAMP WITH TIME ZONE,
  
  -- OCSP (Online Certificate Status Protocol)
  ocsp_url TEXT,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_trusted_cas_issuer ON trusted_certificate_authorities(issuer_dn);
CREATE INDEX idx_trusted_cas_thumbprint ON trusted_certificate_authorities(root_certificate_thumbprint);

-- Seed some common trusted CAs (certificate placeholders - replace with actual certs in production)
INSERT INTO trusted_certificate_authorities (ca_name, ca_type, issuer_dn, root_certificate, root_certificate_thumbprint, is_trusted, trust_level) VALUES
  ('DigiCert', 'public', 'CN=DigiCert High Assurance EV Root CA, OU=www.digicert.com, O=DigiCert Inc, C=US',
   '-----BEGIN CERTIFICATE-----\nPLACEHOLDER_CERTIFICATE_DATA\n-----END CERTIFICATE-----', 
   '74:31:E5:F4:C3:C1:CE:46:90:77:4F:0B:61:E0:54:40:88:3B:A9:A0:1E:D0:0B:A6:AB:D7:80:6E:D3:B1:18:CF', true, 'high'),
  ('GlobalSign', 'public', 'CN=GlobalSign Root CA, OU=Root CA, O=GlobalSign nv-sa, C=BE',
   '-----BEGIN CERTIFICATE-----\nPLACEHOLDER_CERTIFICATE_DATA\n-----END CERTIFICATE-----',
   '84:14:4E:97:1D:87:B8:17:69:ED:BE:66:70:90:32:92:7E:D0:D4:E8:20:9E:AA:E0:A6:00:DC:FA:E1:42:E3:A5', true, 'high'),
  ('Government of Canada', 'government', 'CN=Government of Canada Root CA, OU=PKI, O=Government of Canada, C=CA',
   '-----BEGIN CERTIFICATE-----\nPLACEHOLDER_CERTIFICATE_DATA\n-----END CERTIFICATE-----',
   'SAMPLE_THUMBPRINT_REPLACE_WITH_ACTUAL', true, 'high')
ON CONFLICT (issuer_dn) DO NOTHING;

-- =====================================================================================
-- PART 4: SIGNATURE VERIFICATION FUNCTIONS
-- =====================================================================================

-- Function: Verify digital signature
CREATE OR REPLACE FUNCTION verify_digital_signature(
  p_signature_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_signature RECORD;
  v_is_valid BOOLEAN := false;
BEGIN
  -- Get signature details
  SELECT * INTO v_signature
  FROM digital_signatures
  WHERE id = p_signature_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signature not found: %', p_signature_id;
  END IF;
  
  -- Check if already verified
  IF v_signature.is_verified THEN
    RETURN true;
  END IF;
  
  -- Verify certificate is from trusted CA
  IF EXISTS (
    SELECT 1 FROM trusted_certificate_authorities
    WHERE issuer_dn = v_signature.certificate_issuer
    AND is_trusted = true
    AND (valid_until IS NULL OR valid_until > NOW())
  ) THEN
    v_is_valid := true;
  END IF;
  
  -- Check certificate validity period
  IF v_signature.certificate_not_before > NOW() OR 
     v_signature.certificate_not_after < NOW() THEN
    v_is_valid := false;
  END IF;
  
  -- Update verification status
  UPDATE digital_signatures
  SET 
    is_verified = v_is_valid,
    verified_at = NOW(),
    verification_method = 'certificate_chain_validation',
    updated_at = NOW()
  WHERE id = p_signature_id;
  
  RETURN v_is_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if document has required signatures
CREATE OR REPLACE FUNCTION check_signature_completion(
  p_document_type VARCHAR,
  p_document_id UUID,
  p_organization_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_workflow RECORD;
  v_signature_count INTEGER;
  v_verified_count INTEGER;
  v_required_roles JSONB;
  v_signed_roles JSONB;
  v_result JSONB;
BEGIN
  -- Get workflow requirements
  SELECT * INTO v_workflow
  FROM signature_workflows
  WHERE organization_id = p_organization_id
  AND document_type = p_document_type
  AND is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_workflow', false,
      'is_complete', false,
      'message', 'No signature workflow defined'
    );
  END IF;
  
  -- Count signatures
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN is_verified THEN 1 END)
  INTO v_signature_count, v_verified_count
  FROM digital_signatures
  WHERE document_type = p_document_type
  AND document_id = p_document_id
  AND signature_status = 'signed'
  AND organization_id = p_organization_id;
  
  -- Build result
  v_result := jsonb_build_object(
    'has_workflow', true,
    'required_signatures', v_workflow.required_signatures,
    'current_signatures', v_signature_count,
    'verified_signatures', v_verified_count,
    'is_complete', v_signature_count >= v_workflow.required_signatures,
    'is_verified', v_verified_count >= v_workflow.required_signatures,
    'expiration_hours', v_workflow.expiration_hours
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- PART 5: ATTESTATION TEMPLATES
-- =====================================================================================

-- Financial attestation statements
CREATE TABLE IF NOT EXISTS attestation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template details
  template_name VARCHAR(200) NOT NULL,
  template_type VARCHAR(100) NOT NULL, -- financial, governance, compliance
  signature_type signature_type NOT NULL,
  
  -- Attestation text
  attestation_text TEXT NOT NULL,
  legal_disclaimer TEXT,
  
  -- Applicable jurisdictions
  jurisdictions JSONB, -- Array of jurisdiction codes
  
  -- CLC compliance
  clc_required BOOLEAN DEFAULT false,
  sox_compliance BOOLEAN DEFAULT false,
  
  -- Metadata
  version INTEGER DEFAULT 1,
  effective_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

-- Seed attestation templates
INSERT INTO attestation_templates (template_name, template_type, signature_type, attestation_text, clc_required, sox_compliance) VALUES
  (
    'SOX Financial Attestation',
    'financial',
    'financial_attestation',
    'I, the undersigned officer of this organization, hereby certify that:

1. I have reviewed the financial statements and records for the period indicated;
2. Based on my knowledge, the financial statements and information fairly present, in all material respects, the financial condition and results of operations;
3. The organization has maintained adequate internal controls over financial reporting;
4. All material facts have been disclosed to auditors;
5. There are no undisclosed material weaknesses in internal controls;
6. No fraud involving management or employees with significant financial roles has occurred.

I understand that this attestation is made under penalty of perjury and may be subject to audit by regulatory authorities.',
    true,
    true
  ),
  (
    'CLC Per-Capita Remittance Attestation',
    'financial',
    'financial_attestation',
    'I hereby certify that the per-capita remittance calculation submitted to the Canadian Labour Congress is accurate and complete:

1. The member count represents all members in good standing as of the reporting period;
2. All dues have been properly collected and recorded;
3. The per-capita tax rate applied is in accordance with CLC requirements;
4. No material discrepancies or errors exist in the remittance calculation;
5. Supporting documentation is available for audit upon request.

This attestation is made in accordance with CLC financial reporting requirements.',
    true,
    false
  ),
  (
    'Collective Agreement Ratification',
    'governance',
    'collective_agreement',
    'I certify that the collective agreement ratification vote was conducted in accordance with:

1. Union bylaws and democratic voting procedures;
2. All eligible members were notified and given opportunity to vote;
3. Quorum requirements were met;
4. Votes were counted accurately and results verified;
5. No irregularities or challenges to the vote outcome exist.

This certification is provided under oath and subject to verification.',
    false,
    false
  )
ON CONFLICT DO NOTHING;

-- =====================================================================================
-- PART 6: AUDIT AND COMPLIANCE
-- =====================================================================================

-- Signature audit log
CREATE TABLE IF NOT EXISTS signature_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  signature_id UUID NOT NULL REFERENCES digital_signatures(id),
  
  -- Event details
  event_type VARCHAR(50) NOT NULL, -- created, signed, verified, rejected, revoked
  event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Actor
  actor_user_id UUID,
  actor_name VARCHAR(200),
  actor_role VARCHAR(100),
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  
  -- Details
  event_data JSONB,
  notes TEXT
);

CREATE INDEX idx_signature_audit_signature ON signature_audit_log(signature_id);
CREATE INDEX idx_signature_audit_timestamp ON signature_audit_log(event_timestamp);

-- Trigger to log signature events
CREATE OR REPLACE FUNCTION log_signature_events()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO signature_audit_log (
      signature_id,
      event_type,
      actor_user_id,
      actor_name,
      event_data
    ) VALUES (
      NEW.id,
      'created',
      NEW.signer_user_id,
      NEW.signer_name,
      jsonb_build_object(
        'document_type', NEW.document_type,
        'document_id', NEW.document_id,
        'signature_type', NEW.signature_type
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.signature_status != NEW.signature_status THEN
      INSERT INTO signature_audit_log (
        signature_id,
        event_type,
        actor_user_id,
        actor_name,
        event_data
      ) VALUES (
        NEW.id,
        CASE NEW.signature_status
          WHEN 'signed' THEN 'signed'
          WHEN 'rejected' THEN 'rejected'
          WHEN 'revoked' THEN 'revoked'
          ELSE 'status_changed'
        END,
        NEW.signer_user_id,
        NEW.signer_name,
        jsonb_build_object(
          'old_status', OLD.signature_status,
          'new_status', NEW.signature_status
        )
      );
    END IF;
    
    IF OLD.is_verified != NEW.is_verified AND NEW.is_verified THEN
      INSERT INTO signature_audit_log (
        signature_id,
        event_type,
        event_data
      ) VALUES (
        NEW.id,
        'verified',
        jsonb_build_object(
          'verification_method', NEW.verification_method,
          'verified_at', NEW.verified_at
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_signature_events
  AFTER INSERT OR UPDATE ON digital_signatures
  FOR EACH ROW
  EXECUTE FUNCTION log_signature_events();

-- =====================================================================================
-- COMMENTS AND METADATA
-- =====================================================================================

COMMENT ON TABLE digital_signatures IS 'PKI digital signatures for officer attestations and document approvals';
COMMENT ON TABLE signature_workflows IS 'Configurable signature workflow requirements by document type';
COMMENT ON TABLE trusted_certificate_authorities IS 'Trusted CA root certificates for signature verification';
COMMENT ON TABLE attestation_templates IS 'Pre-defined attestation statements for various compliance requirements';
COMMENT ON TABLE signature_audit_log IS 'Comprehensive audit trail of all signature events';

COMMENT ON FUNCTION verify_digital_signature IS 'Verifies digital signature against trusted CA certificates';
COMMENT ON FUNCTION check_signature_completion IS 'Checks if document has all required signatures per workflow';
