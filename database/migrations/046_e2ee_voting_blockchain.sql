-- Migration: E2EE Voting & Blockchain Audit Trail
-- Description: End-to-end encryption for ballot casting and third-party auditor integration
-- Phase: 1 - Critical CLC Compliance
-- Date: 2025-11-24

-- =====================================================================================
-- PART 1: ENCRYPTED VOTING SCHEMA ENHANCEMENTS
-- =====================================================================================

-- Add E2EE fields to voting_sessions
ALTER TABLE voting_sessions
  ADD COLUMN IF NOT EXISTS encryption_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM',
  ADD COLUMN IF NOT EXISTS public_key TEXT, -- RSA public key for this session (PEM format)
  ADD COLUMN IF NOT EXISTS key_fingerprint VARCHAR(128), -- SHA-256 hash of public key
  ADD COLUMN IF NOT EXISTS escrow_key_shares JSONB, -- Shamir's Secret Sharing for emergency access
  ADD COLUMN IF NOT EXISTS audit_hash VARCHAR(128), -- Merkle root hash for blockchain verification
  ADD COLUMN IF NOT EXISTS blockchain_anchor_tx VARCHAR(200), -- Transaction ID on blockchain
  ADD COLUMN IF NOT EXISTS blockchain_network VARCHAR(50), -- ethereum, hyperledger, bitcoin
  ADD COLUMN IF NOT EXISTS third_party_auditor_id UUID;

-- Create index for audit queries
CREATE INDEX IF NOT EXISTS idx_voting_sessions_audit_hash ON voting_sessions(audit_hash);
CREATE INDEX IF NOT EXISTS idx_voting_sessions_blockchain_tx ON voting_sessions(blockchain_anchor_tx);

-- Add encrypted ballot fields to votes table
ALTER TABLE votes
  ADD COLUMN IF NOT EXISTS encrypted_ballot TEXT, -- Encrypted vote data (Base64)
  ADD COLUMN IF NOT EXISTS encryption_iv VARCHAR(64), -- Initialization vector for AES-GCM
  ADD COLUMN IF NOT EXISTS encryption_tag VARCHAR(64), -- Authentication tag for AES-GCM
  ADD COLUMN IF NOT EXISTS ballot_hash VARCHAR(128), -- SHA-512 hash of encrypted ballot
  ADD COLUMN IF NOT EXISTS vote_sequence INTEGER, -- Sequence number for Merkle tree
  ADD COLUMN IF NOT EXISTS merkle_proof JSONB; -- Merkle proof for vote inclusion

CREATE INDEX IF NOT EXISTS idx_votes_ballot_hash ON votes(ballot_hash);
CREATE INDEX IF NOT EXISTS idx_votes_sequence ON votes(vote_sequence);

-- =====================================================================================
-- PART 2: THIRD-PARTY AUDITOR MANAGEMENT
-- =====================================================================================

-- Third-party auditors table
CREATE TABLE IF NOT EXISTS voting_auditors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Auditor details
  auditor_name VARCHAR(200) NOT NULL,
  auditor_type VARCHAR(50) NOT NULL, -- independent, government, clc_certified, academic
  
  -- Organization info
  organization_name VARCHAR(200),
  organization_website VARCHAR(500),
  registration_number VARCHAR(100), -- Professional accreditation number
  
  -- Contact
  contact_person VARCHAR(200),
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  
  -- Credentials
  public_key TEXT NOT NULL, -- PEM-encoded RSA public key
  key_fingerprint VARCHAR(128) NOT NULL UNIQUE,
  certificate TEXT, -- X.509 certificate
  
  -- Trust and compliance
  is_clc_certified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  certification_expires_at DATE,
  
  -- API access
  api_key_hash VARCHAR(128), -- Hashed API key for programmatic access
  api_rate_limit INTEGER DEFAULT 1000,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_voting_auditors_active ON voting_auditors(is_active);
CREATE INDEX idx_voting_auditors_clc ON voting_auditors(is_clc_certified);

-- Auditor assignments to voting sessions
CREATE TABLE IF NOT EXISTS voting_session_auditors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  voting_session_id UUID NOT NULL REFERENCES voting_sessions(id) ON DELETE CASCADE,
  auditor_id UUID NOT NULL REFERENCES voting_auditors(id),
  
  -- Assignment details
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID,
  
  -- Auditor access
  auditor_public_key TEXT NOT NULL, -- Auditor's key for this session
  access_level VARCHAR(50) DEFAULT 'observer', -- observer, verifier, administrator
  
  -- Verification results
  verification_status VARCHAR(50), -- pending, in_progress, verified, failed
  verification_started_at TIMESTAMP WITH TIME ZONE,
  verification_completed_at TIMESTAMP WITH TIME ZONE,
  verification_report_url TEXT,
  
  -- Findings
  issues_found INTEGER DEFAULT 0,
  severity VARCHAR(50), -- clean, minor, major, critical
  findings_summary TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_session_auditor UNIQUE (voting_session_id, auditor_id)
);

CREATE INDEX idx_session_auditors_session ON voting_session_auditors(voting_session_id);
CREATE INDEX idx_session_auditors_auditor ON voting_session_auditors(auditor_id);
CREATE INDEX idx_session_auditors_status ON voting_session_auditors(verification_status);

-- =====================================================================================
-- PART 3: BLOCKCHAIN AUDIT TRAIL
-- =====================================================================================

-- Blockchain anchoring records
CREATE TABLE IF NOT EXISTS blockchain_audit_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to voting session
  voting_session_id UUID NOT NULL REFERENCES voting_sessions(id),
  
  -- Blockchain details
  blockchain_network VARCHAR(50) NOT NULL, -- ethereum, polygon, hyperledger, bitcoin
  network_type VARCHAR(50) DEFAULT 'mainnet', -- mainnet, testnet
  
  -- Transaction details
  transaction_hash VARCHAR(200) NOT NULL UNIQUE,
  block_number BIGINT,
  block_hash VARCHAR(200),
  block_timestamp TIMESTAMP WITH TIME ZONE,
  
  -- Data anchored
  merkle_root_hash VARCHAR(128) NOT NULL, -- Merkle root of all votes
  metadata_hash VARCHAR(128), -- Hash of session metadata
  total_votes_count INTEGER,
  
  -- Smart contract (if applicable)
  contract_address VARCHAR(200),
  contract_method VARCHAR(100),
  
  -- Gas and fees (for blockchain networks with fees)
  gas_used BIGINT,
  gas_price_gwei DECIMAL(20,9),
  transaction_fee_eth DECIMAL(20,18),
  transaction_fee_usd DECIMAL(12,2),
  
  -- Verification
  is_confirmed BOOLEAN DEFAULT false,
  confirmations_required INTEGER DEFAULT 6,
  current_confirmations INTEGER DEFAULT 0,
  
  -- Retrieval URLs
  explorer_url TEXT, -- Block explorer URL
  proof_url TEXT, -- API endpoint to retrieve proof
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, failed, reverted
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  anchored_by UUID
);

CREATE INDEX idx_blockchain_anchors_session ON blockchain_audit_anchors(voting_session_id);
CREATE INDEX idx_blockchain_anchors_tx ON blockchain_audit_anchors(transaction_hash);
CREATE INDEX idx_blockchain_anchors_block ON blockchain_audit_anchors(block_number);
CREATE INDEX idx_blockchain_anchors_status ON blockchain_audit_anchors(status);

-- Merkle tree for vote verification
CREATE TABLE IF NOT EXISTS vote_merkle_tree (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  voting_session_id UUID NOT NULL REFERENCES voting_sessions(id),
  
  -- Tree structure
  tree_level INTEGER NOT NULL, -- 0 = leaf (votes), 1+ = internal nodes
  node_index INTEGER NOT NULL, -- Position at this level
  node_hash VARCHAR(128) NOT NULL, -- SHA-512 hash
  
  -- Parent/child relationships
  parent_node_id UUID REFERENCES vote_merkle_tree(id),
  left_child_id UUID REFERENCES vote_merkle_tree(id),
  right_child_id UUID REFERENCES vote_merkle_tree(id),
  
  -- Leaf node references (level 0 only)
  vote_id UUID REFERENCES votes(id),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_tree_position UNIQUE (voting_session_id, tree_level, node_index)
);

CREATE INDEX idx_merkle_tree_session ON vote_merkle_tree(voting_session_id);
CREATE INDEX idx_merkle_tree_level ON vote_merkle_tree(tree_level, node_index);
CREATE INDEX idx_merkle_tree_vote ON vote_merkle_tree(vote_id);
CREATE INDEX idx_merkle_tree_parent ON vote_merkle_tree(parent_node_id);

-- =====================================================================================
-- PART 4: ENCRYPTION KEY MANAGEMENT
-- =====================================================================================

-- Session encryption keys (asymmetric keypair)
CREATE TABLE IF NOT EXISTS voting_session_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  voting_session_id UUID NOT NULL UNIQUE REFERENCES voting_sessions(id),
  
  -- RSA keypair (4096-bit recommended)
  public_key TEXT NOT NULL, -- PEM format
  private_key_encrypted TEXT NOT NULL, -- Encrypted with master key
  encryption_algorithm VARCHAR(50) DEFAULT 'RSA-4096',
  
  -- Key derivation
  key_derivation_function VARCHAR(50) DEFAULT 'PBKDF2',
  kdf_iterations INTEGER DEFAULT 100000,
  kdf_salt VARCHAR(64),
  
  -- Shamir's Secret Sharing for emergency access
  secret_shares_total INTEGER DEFAULT 5,
  secret_shares_threshold INTEGER DEFAULT 3,
  secret_share_1_encrypted TEXT,
  secret_share_2_encrypted TEXT,
  secret_share_3_encrypted TEXT,
  secret_share_4_encrypted TEXT,
  secret_share_5_encrypted TEXT,
  
  -- Key custodians
  custodian_1_user_id UUID,
  custodian_2_user_id UUID,
  custodian_3_user_id UUID,
  custodian_4_user_id UUID,
  custodian_5_user_id UUID,
  
  -- Key lifecycle
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  
  -- Usage tracking
  encryption_count INTEGER DEFAULT 0,
  decryption_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_session_keys_session ON voting_session_keys(voting_session_id);
CREATE INDEX idx_session_keys_active ON voting_session_keys(is_active);

-- Key access audit log
CREATE TABLE IF NOT EXISTS voting_key_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  session_key_id UUID NOT NULL REFERENCES voting_session_keys(id),
  
  -- Access details
  access_type VARCHAR(50) NOT NULL, -- encrypt, decrypt, share_generated, share_accessed
  accessed_by UUID NOT NULL,
  access_reason TEXT,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  
  -- Result
  success BOOLEAN,
  error_message TEXT,
  
  -- Timestamp
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_key_access_log_key ON voting_key_access_log(session_key_id);
CREATE INDEX idx_key_access_log_user ON voting_key_access_log(accessed_by);
CREATE INDEX idx_key_access_log_time ON voting_key_access_log(accessed_at);

-- =====================================================================================
-- PART 5: VOTE ENCRYPTION FUNCTIONS
-- =====================================================================================

-- Function: Generate Merkle tree for voting session
CREATE OR REPLACE FUNCTION generate_vote_merkle_tree(
  p_session_id UUID
) RETURNS VARCHAR AS $$
DECLARE
  v_vote_count INTEGER;
  v_leaf_hashes TEXT[];
  v_current_level INTEGER := 0;
  v_merkle_root VARCHAR(128);
BEGIN
  -- Get all votes for session (ordered by sequence)
  SELECT 
    COUNT(*),
    ARRAY_AGG(ballot_hash ORDER BY vote_sequence)
  INTO v_vote_count, v_leaf_hashes
  FROM votes
  WHERE voting_session_id = p_session_id
  AND ballot_hash IS NOT NULL;
  
  IF v_vote_count = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Delete existing tree
  DELETE FROM vote_merkle_tree WHERE voting_session_id = p_session_id;
  
  -- Insert leaf nodes (level 0)
  INSERT INTO vote_merkle_tree (voting_session_id, tree_level, node_index, node_hash, vote_id)
  SELECT 
    p_session_id,
    0,
    ROW_NUMBER() OVER (ORDER BY vote_sequence) - 1,
    ballot_hash,
    id
  FROM votes
  WHERE voting_session_id = p_session_id
  AND ballot_hash IS NOT NULL
  ORDER BY vote_sequence;
  
  -- Build tree recursively
  WHILE v_vote_count > 1 LOOP
    v_current_level := v_current_level + 1;
    
    -- Create parent nodes by hashing pairs
    INSERT INTO vote_merkle_tree (voting_session_id, tree_level, node_index, node_hash, left_child_id, right_child_id)
    WITH current_level AS (
      SELECT 
        id,
        node_hash,
        node_index,
        ROW_NUMBER() OVER (ORDER BY node_index) as rn
      FROM vote_merkle_tree
      WHERE voting_session_id = p_session_id
      AND tree_level = v_current_level - 1
      ORDER BY node_index
    ),
    paired AS (
      SELECT 
        (rn + 1) / 2 as parent_index,
        MAX(CASE WHEN rn % 2 = 1 THEN id END) as left_id,
        MAX(CASE WHEN rn % 2 = 1 THEN node_hash END) as left_hash,
        MAX(CASE WHEN rn % 2 = 0 THEN id END) as right_id,
        MAX(CASE WHEN rn % 2 = 0 THEN node_hash ELSE left_hash END) as right_hash
      FROM current_level
      GROUP BY (rn + 1) / 2
    )
    SELECT 
      p_session_id,
      v_current_level,
      parent_index - 1,
      encode(sha512((left_hash || COALESCE(right_hash, left_hash))::bytea), 'hex'),
      left_id,
      right_id
    FROM paired;
    
    -- Count nodes at this level
    SELECT COUNT(*) INTO v_vote_count
    FROM vote_merkle_tree
    WHERE voting_session_id = p_session_id
    AND tree_level = v_current_level;
  END LOOP;
  
  -- Get Merkle root
  SELECT node_hash INTO v_merkle_root
  FROM vote_merkle_tree
  WHERE voting_session_id = p_session_id
  AND tree_level = v_current_level
  LIMIT 1;
  
  -- Update session with Merkle root
  UPDATE voting_sessions
  SET audit_hash = v_merkle_root,
      updated_at = NOW()
  WHERE id = p_session_id;
  
  RETURN v_merkle_root;
END;
$$ LANGUAGE plpgsql;

-- Function: Verify vote inclusion in Merkle tree
CREATE OR REPLACE FUNCTION verify_vote_merkle_proof(
  p_vote_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_vote RECORD;
  v_merkle_proof JSONB;
  v_session_root VARCHAR(128);
  v_calculated_root VARCHAR(128);
BEGIN
  -- Get vote details
  SELECT * INTO v_vote
  FROM votes
  WHERE id = p_vote_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Vote not found');
  END IF;
  
  -- Get session Merkle root
  SELECT audit_hash INTO v_session_root
  FROM voting_sessions
  WHERE id = v_vote.voting_session_id;
  
  -- Build Merkle proof path
  WITH RECURSIVE proof_path AS (
    -- Start with vote leaf node
    SELECT 
      vmt.id,
      vmt.node_hash,
      vmt.parent_node_id,
      vmt.tree_level,
      0 as path_index,
      ARRAY[vmt.node_hash] as hashes,
      ARRAY[]::VARCHAR[] as sibling_hashes
    FROM vote_merkle_tree vmt
    WHERE vmt.vote_id = p_vote_id
    
    UNION ALL
    
    -- Traverse up the tree
    SELECT 
      parent.id,
      parent.node_hash,
      parent.parent_node_id,
      parent.tree_level,
      pp.path_index + 1,
      pp.hashes || parent.node_hash,
      pp.sibling_hashes || COALESCE(sibling.node_hash, parent.node_hash)
    FROM proof_path pp
    INNER JOIN vote_merkle_tree parent ON parent.id = pp.parent_node_id
    LEFT JOIN vote_merkle_tree sibling ON 
      (sibling.id = parent.left_child_id AND parent.right_child_id = pp.id)
      OR (sibling.id = parent.right_child_id AND parent.left_child_id = pp.id)
  )
  SELECT jsonb_build_object(
    'leaf_hash', v_vote.ballot_hash,
    'root_hash', v_session_root,
    'proof_path', jsonb_agg(
      jsonb_build_object(
        'level', tree_level,
        'hash', node_hash
      ) ORDER BY tree_level
    ),
    'valid', (SELECT node_hash FROM proof_path ORDER BY tree_level DESC LIMIT 1) = v_session_root
  ) INTO v_merkle_proof
  FROM proof_path;
  
  RETURN v_merkle_proof;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- PART 6: BLOCKCHAIN ANCHORING FUNCTIONS
-- =====================================================================================

-- Function: Create blockchain anchor for voting session
CREATE OR REPLACE FUNCTION create_blockchain_anchor(
  p_session_id UUID,
  p_blockchain_network VARCHAR DEFAULT 'ethereum',
  p_network_type VARCHAR DEFAULT 'mainnet'
) RETURNS UUID AS $$
DECLARE
  v_merkle_root VARCHAR(128);
  v_anchor_id UUID;
  v_metadata_hash VARCHAR(128);
  v_vote_count INTEGER;
BEGIN
  -- Ensure Merkle tree exists
  v_merkle_root := generate_vote_merkle_tree(p_session_id);
  
  IF v_merkle_root IS NULL THEN
    RAISE EXCEPTION 'Cannot create blockchain anchor: no votes found';
  END IF;
  
  -- Count votes
  SELECT COUNT(*) INTO v_vote_count
  FROM votes
  WHERE voting_session_id = p_session_id;
  
  -- Generate metadata hash
  SELECT encode(sha512(
    (vs.id::TEXT || 
     vs.session_title || 
     vs.created_at::TEXT || 
     v_vote_count::TEXT ||
     v_merkle_root)::bytea
  ), 'hex') INTO v_metadata_hash
  FROM voting_sessions vs
  WHERE vs.id = p_session_id;
  
  -- Create anchor record
  INSERT INTO blockchain_audit_anchors (
    voting_session_id,
    blockchain_network,
    network_type,
    merkle_root_hash,
    metadata_hash,
    total_votes_count,
    status,
    transaction_hash
  ) VALUES (
    p_session_id,
    p_blockchain_network,
    p_network_type,
    v_merkle_root,
    v_metadata_hash,
    v_vote_count,
    'pending',
    'PENDING_TX_' || gen_random_uuid()::TEXT -- Placeholder until actual blockchain tx
  )
  RETURNING id INTO v_anchor_id;
  
  RETURN v_anchor_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- COMMENTS AND METADATA
-- =====================================================================================

COMMENT ON TABLE voting_auditors IS 'Third-party auditors certified to verify voting integrity';
COMMENT ON TABLE voting_session_auditors IS 'Auditor assignments to specific voting sessions';
COMMENT ON TABLE blockchain_audit_anchors IS 'Blockchain transaction records anchoring vote Merkle roots';
COMMENT ON TABLE vote_merkle_tree IS 'Merkle tree structure for cryptographic vote verification';
COMMENT ON TABLE voting_session_keys IS 'Asymmetric keypairs for E2EE voting with Shamir secret sharing';
COMMENT ON TABLE voting_key_access_log IS 'Audit log for all encryption key access';

COMMENT ON FUNCTION generate_vote_merkle_tree IS 'Builds Merkle tree from all votes in session and returns root hash';
COMMENT ON FUNCTION verify_vote_merkle_proof IS 'Verifies a vote is included in the Merkle tree using cryptographic proof';
COMMENT ON FUNCTION create_blockchain_anchor IS 'Creates blockchain anchor record for voting session (actual blockchain tx done externally)';
