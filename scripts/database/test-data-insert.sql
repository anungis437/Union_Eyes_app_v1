-- Test data for AI search functionality
-- Run with: psql "DATABASE_URL" -f test-data-insert.sql
-- 
-- NOTE: This file contains PostgreSQL-specific syntax (::jsonb, LIMIT, etc.)
-- MSSQL linter errors can be ignored - this is PostgreSQL only

-- Insert test legal documents
INSERT INTO ai_documents (tenant_id, source_type, title, content, metadata) VALUES
('test-tenant-001', 'public', 'NLRA Section 7 Rights', 
 'Employees shall have the right to self-organization, to form, join, or assist labor organizations, to bargain collectively through representatives of their own choosing, and to engage in other concerted activities for the purpose of collective bargaining or other mutual aid or protection.',
 '{"source": "NLRA", "section": "7", "type": "labor_law"}'::jsonb),

('test-tenant-001', 'public', 'Unfair Labor Practice - Retaliation',
 'It shall be an unfair labor practice for an employer to interfere with, restrain, or coerce employees in the exercise of the rights guaranteed in section 7. This includes discharge or discrimination against an employee because of union membership or activities.',
 '{"source": "NLRA", "section": "8a", "type": "labor_law"}'::jsonb),

('test-tenant-001', 'internal', 'Collective Bargaining Agreement - Grievance Procedure',
 'Any dispute concerning the interpretation or application of this Agreement shall be subject to the grievance procedure. The union representative shall have the right to be present at any stage of the grievance process. Management must respond to grievances within 10 business days.',
 '{"source": "Sample CBA", "article": "5", "type": "contract"}'::jsonb)
RETURNING id, title;

-- Get the document IDs for chunk creation
\set doc1_id (SELECT id FROM ai_documents WHERE title = 'NLRA Section 7 Rights' AND tenant_id = 'test-tenant-001' LIMIT 1)
\set doc2_id (SELECT id FROM ai_documents WHERE title = 'Unfair Labor Practice - Retaliation' AND tenant_id = 'test-tenant-001' LIMIT 1)
\set doc3_id (SELECT id FROM ai_documents WHERE title = 'Collective Bargaining Agreement - Grievance Procedure' AND tenant_id = 'test-tenant-001' LIMIT 1)

-- Note: The above \set approach doesn't work well in psql scripts
-- We'll insert chunks with the document lookup inline
INSERT INTO ai_chunks (document_id, tenant_id, content, chunk_index, embedding)
SELECT 
  d.id,
  'test-tenant-001',
  'Employees shall have the right to self-organization, to form, join, or assist labor organizations.',
  0,
  NULL -- OpenAI will generate embeddings when search is used
FROM ai_documents d 
WHERE d.title = 'NLRA Section 7 Rights' AND d.tenant_id = 'test-tenant-001'
LIMIT 1;

INSERT INTO ai_chunks (document_id, tenant_id, content, chunk_index, embedding)
SELECT 
  d.id,
  'test-tenant-001',
  'Employees have the right to bargain collectively through representatives of their own choosing.',
  1,
  NULL
FROM ai_documents d 
WHERE d.title = 'NLRA Section 7 Rights' AND d.tenant_id = 'test-tenant-001'
LIMIT 1;

INSERT INTO ai_chunks (document_id, tenant_id, content, chunk_index, embedding)
SELECT 
  d.id,
  'test-tenant-001',
  'It shall be an unfair labor practice for an employer to interfere with, restrain, or coerce employees.',
  0,
  NULL
FROM ai_documents d 
WHERE d.title = 'Unfair Labor Practice - Retaliation' AND d.tenant_id = 'test-tenant-001'
LIMIT 1;

INSERT INTO ai_chunks (document_id, tenant_id, content, chunk_index, embedding)
SELECT 
  d.id,
  'test-tenant-001',
  'This includes discharge or discrimination against an employee because of union membership or activities.',
  1,
  NULL
FROM ai_documents d 
WHERE d.title = 'Unfair Labor Practice - Retaliation' AND d.tenant_id = 'test-tenant-001'
LIMIT 1;

INSERT INTO ai_chunks (document_id, tenant_id, content, chunk_index, embedding)
SELECT 
  d.id,
  'test-tenant-001',
  'Any dispute concerning the interpretation or application of this Agreement shall be subject to the grievance procedure.',
  0,
  NULL
FROM ai_documents d 
WHERE d.title = 'Collective Bargaining Agreement - Grievance Procedure' AND d.tenant_id = 'test-tenant-001'
LIMIT 1;

-- Verify insertions
SELECT 'Documents created:' as status;
SELECT id, title, created_at FROM ai_documents WHERE tenant_id = 'test-tenant-001' ORDER BY created_at DESC;

SELECT 'Chunks created:' as status;
SELECT c.id, d.title as document_title, c.chunk_index, LEFT(c.content, 50) || '...' as content_preview
FROM ai_chunks c
JOIN ai_documents d ON c.document_id = d.id
WHERE c.tenant_id = 'test-tenant-001'
ORDER BY d.title, c.chunk_index;
