-- =====================================================
-- Phase 5D: Jurisdiction Templates Seed Data
-- Document Templates for Canadian Jurisdictions
-- =====================================================

INSERT INTO jurisdiction_templates (jurisdiction, template_type, template_name, template_content, required_fields, legal_reference, active) VALUES
('CA-FED', 'grievance', 'Federal Grievance Form', '# GRIEVANCE FORM\n\n**Employee:** {{employeeName}}\n**Date:** {{filingDate}}\n**Issue:** {{grievanceDescription}}', ARRAY['employeeName', 'filingDate', 'grievanceDescription'], 'Canada Labour Code s.133', true),
('CA-FED', 'arbitration', 'Federal Arbitration Request', '# ARBITRATION REQUEST\n\n**Union:** {{unionName}}\n**Date:** {{requestDate}}\n**Matter:** {{arbitrationMatter}}', ARRAY['unionName', 'requestDate', 'arbitrationMatter'], 'Canada Labour Code s.57', true),
('CA-ON', 'grievance', 'Ontario Grievance Form', '# GRIEVANCE FORM - ONTARIO\n\n**Employee:** {{employeeName}}\n**Date:** {{filingDate}}\n**Issue:** {{grievanceDescription}}', ARRAY['employeeName', 'filingDate', 'grievanceDescription'], 'LRA 1995', true),
('CA-QC', 'grievance', 'Quebec Grievance Form / Formulaire de grief', '# FORMULAIRE DE GRIEF / GRIEVANCE FORM\n\n**Employé/Employee:** {{employeeName}}\n**Date:** {{filingDate}}\n**Question/Issue:** {{grievanceDescription}}', ARRAY['employeeName', 'filingDate', 'grievanceDescription'], 'Code du travail art.100', true);
