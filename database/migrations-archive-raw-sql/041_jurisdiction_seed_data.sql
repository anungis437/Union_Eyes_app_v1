-- =====================================================
-- Phase 5D: Jurisdiction Rules Seed Data
-- Canadian Labour Law Rules (Simplified)
-- =====================================================

INSERT INTO jurisdiction_rules (jurisdiction, rule_type, rule_category, rule_name, description, legal_reference, rule_parameters) VALUES
-- Federal Jurisdiction
('CA-FED', 'grievance_arbitration', 'arbitration_deadline', 'Federal Arbitration Filing Deadline', 'Deadline to file for arbitration', 'Canada Labour Code s.57(2)', '{"deadline_days": 25, "deadline_type": "calendar"}'),
('CA-FED', 'certification', 'certification_threshold', 'Federal Certification Threshold', 'Minimum support for certification', 'Canada Labour Code s.29', '{"card_threshold_min": 35}'),
('CA-FED', 'strike_vote', 'strike_vote_requirement', 'Federal Strike Vote Requirements', 'Requirements for strike authorization', 'Canada Labour Code s.87.3', '{"secret_ballot_required": true, "majority_threshold": 50}'),
-- Ontario
('CA-ON', 'grievance_arbitration', 'arbitration_deadline', 'Ontario Arbitration Filing Deadline', 'Deadline to file for arbitration', 'LRA s.48(2)', '{"deadline_days": 30, "deadline_type": "calendar"}'),
('CA-ON', 'certification', 'certification_threshold', 'Ontario Auto Certification', 'Card-based certification threshold', 'LRA s.8', '{"card_threshold_auto": 55}'),
-- Quebec
('CA-QC', 'grievance_arbitration', 'arbitration_deadline', 'Quebec Arbitration Filing Deadline', 'Délai arbitrage', 'Code du travail art.100', '{"deadline_days": 20, "deadline_type": "calendar"}'),
('CA-QC', 'certification', 'certification_threshold', 'Quebec Certification Threshold', 'Seuil certification', 'Code du travail art.28', '{"card_threshold_min": 35}'),
-- British Columbia
('CA-BC', 'grievance_arbitration', 'arbitration_deadline', 'BC Arbitration Filing', 'No statutory deadline', 'LRC s.84', '{"deadline_days": null, "deadline_type": "none"}'),
('CA-BC', 'certification', 'certification_threshold', 'BC Auto Certification', 'Card-based certification', 'LRC s.18', '{"card_threshold_auto": 55}'),
-- Alberta
('CA-AB', 'certification', 'certification_threshold', 'Alberta Mandatory Vote', 'Vote required for certification', 'LRC s.32', '{"method": "mandatory_vote"}');
