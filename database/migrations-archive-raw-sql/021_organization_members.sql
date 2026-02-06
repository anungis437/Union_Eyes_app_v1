-- Migration: Organization Members Table
-- Created: 2025-01-12
-- Description: Creates organization_members table for member directory feature

-- Create member role enum
CREATE TYPE member_role AS ENUM ('member', 'steward', 'officer', 'admin');

-- Create member status enum
CREATE TYPE member_status AS ENUM ('active', 'inactive', 'on-leave');

-- Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  
  -- Basic Information
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Role and Status
  role member_role NOT NULL DEFAULT 'member',
  status member_status NOT NULL DEFAULT 'active',
  
  -- Work Information
  department TEXT,
  position TEXT,
  hire_date TIMESTAMP WITH TIME ZONE,
  
  -- Union Information
  membership_number TEXT,
  seniority INTEGER DEFAULT 0,
  union_join_date TIMESTAMP WITH TIME ZONE,
  
  -- Contact Preferences
  preferred_contact_method TEXT,
  
  -- Metadata (JSON string for flexibility)
  metadata TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  UNIQUE(organization_id, user_id),
  UNIQUE(email)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_email ON organization_members(email);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_org_members_status ON organization_members(status);
CREATE INDEX IF NOT EXISTS idx_org_members_department ON organization_members(department);
CREATE INDEX IF NOT EXISTS idx_org_members_deleted_at ON organization_members(deleted_at) WHERE deleted_at IS NULL;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_organization_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organization_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_members_updated_at();

-- Insert seed data for testing
INSERT INTO organization_members (organization_id, user_id, name, email, phone, role, status, department, position, hire_date, membership_number, seniority, union_join_date, metadata)
VALUES 
  ('default-org', 'user_seed_001', 'John Smith', 'john.smith@example.com', '555-0101', 'member', 'active', 'Manufacturing', 'Assembly Line Worker', '2018-03-15', 'JOHN-180315', 6, '2018-04-01', '{"location": "Plant A", "shift": "Day"}'),
  ('default-org', 'user_seed_002', 'Sarah Johnson', 'sarah.johnson@example.com', '555-0102', 'steward', 'active', 'Manufacturing', 'Lead Operator', '2015-06-20', 'SARA-150620', 9, '2015-07-01', '{"location": "Plant A", "shift": "Day"}'),
  ('default-org', 'user_seed_003', 'Mike Davis', 'mike.davis@example.com', '555-0103', 'officer', 'active', 'Administration', 'Union Representative', '2012-01-10', 'MIKE-120110', 12, '2012-02-01', '{"location": "Main Office"}'),
  ('default-org', 'user_seed_004', 'Emily Chen', 'emily.chen@example.com', '555-0104', 'member', 'active', 'Logistics', 'Warehouse Associate', '2020-09-01', 'EMIL-200901', 4, '2020-10-01', '{"location": "Warehouse B", "shift": "Evening"}'),
  ('default-org', 'user_seed_005', 'Robert Wilson', 'robert.wilson@example.com', '555-0105', 'member', 'on-leave', 'Maintenance', 'Technician', '2017-11-30', 'ROBE-171130', 7, '2017-12-15', '{"location": "Plant B", "certifications": ["HVAC", "Electrical"]}'),
  ('default-org', 'user_seed_006', 'Lisa Martinez', 'lisa.martinez@example.com', '555-0106', 'admin', 'active', 'Administration', 'Union President', '2010-04-15', 'LISA-100415', 14, '2010-05-01', '{"location": "Main Office", "committees": ["Negotiations", "Grievance"]}'),
  ('default-org', 'user_seed_007', 'David Brown', 'david.brown@example.com', '555-0107', 'steward', 'active', 'Customer Service', 'Senior Representative', '2016-07-22', 'DAVI-160722', 8, '2016-08-01', '{"location": "Call Center", "languages": ["English", "Spanish"]}'),
  ('default-org', 'user_seed_008', 'Jennifer Taylor', 'jennifer.taylor@example.com', '555-0108', 'member', 'active', 'IT', 'Systems Administrator', '2019-02-14', 'JENN-190214', 5, '2019-03-01', '{"location": "Main Office", "specialties": ["Network", "Security"]}'),
  ('default-org', 'user_seed_009', 'Chris Anderson', 'chris.anderson@example.com', '555-0109', 'member', 'inactive', 'Manufacturing', 'Machine Operator', '2014-10-05', 'CHRI-141005', 10, '2014-11-01', '{"location": "Plant A"}'),
  ('default-org', 'user_seed_010', 'Amanda White', 'amanda.white@example.com', '555-0110', 'member', 'active', 'Logistics', 'Shipping Coordinator', '2021-05-17', 'AMAN-210517', 3, '2021-06-01', '{"location": "Warehouse A", "shift": "Day"}}')
ON CONFLICT (organization_id, user_id) DO NOTHING;
