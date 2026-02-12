# Employee Offboarding Policy

**Policy Owner:** Chief Security Officer / HR Manager  
**Version:** 1.0  
**Last Updated:** February 12, 2026  
**Review Frequency:** Annual  
**ISO 27001:2022 Control:** A.6.5 - Responsibilities After Termination or Change of Employment

---

## 1. Purpose

This policy establishes the security procedures for offboarding employees, contractors, and third-party personnel from Union Eyes. The goal is to protect confidential information, ensure timely access revocation, facilitate knowledge transfer, and maintain positive relationships while mitigating security risks associated with personnel departures.

## 2. Scope

This policy applies to all terminations and departures including:
- Voluntary resignations
- Involuntary terminations (with or without cause)
- Retirement
- End of contract for contractors and temporary workers
- Reduction in force or layoffs
- Role changes requiring access modification
- Extended leave of absence (>90 days)
- Death of employee or contractor

## 3. Regulatory Compliance

This policy supports compliance with:
- ISO 27001:2022 (A.6.5 - Responsibilities After Termination or Change of Employment)
- SOC 2 Type II (Access control and user lifecycle management)
- PIPEDA and GDPR (handling of employee and member data post-termination)
- Canadian employment standards legislation

## 4. Offboarding Principles

### 4.1 Core Principles
- **Timeliness:** Access revocation and asset recovery within defined timelines
- **Completeness:** All access points and assets accounted for
- **Respect and Dignity:** Departing employees treated with respect regardless of circumstances
- **Knowledge Transfer:** Critical knowledge documented and transitioned
- **Security First:** Security takes precedence over convenience in offboarding process
- **Audit Trail:** All offboarding activities documented for compliance and audit

### 4.2 Risk-Based Approach
Offboarding procedures vary based on:
- **Termination type:** Voluntary vs. involuntary; amicable vs. contentious
- **Access level:** Standard user vs. privileged access vs. administrator
- **Data sensitivity:** Access to PII, financial data, intellectual property
- **Risk indicators:** Performance issues, misconduct, security violations
- **Business criticality:** Key personnel, sole maintainers, customer-facing roles

## 5. Offboarding Timeline and Phases

### 5.1 Advance Notice Period (Voluntary Resignation)

**Typical notice period:** 2 weeks (standard), 4 weeks (senior roles), 30+ days (executives)

**Security Activities During Notice Period:**
- [ ] Offboarding checklist initiated by HR
- [ ] Manager notifies security team of departure (within 24 hours of resignation)
- [ ] Access review: identify all systems, data repositories, and tools accessed
- [ ] Determine knowledge transfer needs and plan
- [ ] Schedule exit interview
- [ ] Prepare equipment return instructions
- [ ] Begin transition planning for critical responsibilities
- [ ] Monitor access logs for unusual activity (discretionary, for high-risk scenarios)

**Access During Notice Period:**
- Generally, access remains unchanged unless risk indicators present
- Access to highly sensitive strategic information may be restricted
- Privileged/administrative access may be revoked early with compensating controls
- Access to source code repositories may change to read-only (case-by-case)

**Risk Indicators Requiring Early Access Revocation:**
- Resignation to join a competitor
- Unusual data access patterns or bulk downloads
- Expression of grievances or hostility
- Performance or conduct issues during notice period
- Request by employee to end notice period early

### 5.2 Termination Day (Last Day of Employment)

**Timing:**
- **Voluntary termination:** End of business on last day
- **Involuntary termination (amicable):** End of business on termination day
- **Involuntary termination (contentious) or with cause:** Immediate (within 1 hour)

**Immediate Actions (Termination Hour - H-hour):**

**H+0 (Immediate - within 15 minutes):**
- [ ] Disable Active Directory / Identity Provider (IdP) account
- [ ] Revoke all API tokens and service account access
- [ ] Disable email account (or convert to forwarding if business need)
- [ ] Revoke VPN access
- [ ] Disable MFA tokens and security keys
- [ ] Revoke access to cloud infrastructure (AWS, Azure, GCP)
- [ ] Disable admin/privileged accounts
- [ ] Remote wipe company-issued mobile devices (if applicable)

**H+1 hour (within 1 hour of termination):**
- [ ] Revoke access to SaaS applications (Slack, GitHub, Google Workspace, etc.)
- [ ] Disable SSH keys and certificates
- [ ] Revoke database access
- [ ] Remove from distribution groups and mailing lists
- [ ] Disable physical access cards (building, server room)
- [ ] Change passwords for any shared accounts previously accessed (if applicable)
- [ ] Notify IT helpdesk to deny any support requests from departed employee

**H+4 hours (same business day):**
- [ ] Review access logs for anomalies in final hours
- [ ] Verify all critical access points disabled
- [ ] Update offboarding checklist status
- [ ] Notify relevant teams and stakeholders of departure (as appropriate)

### 5.3 Post-Termination Activities (Days 1-30)

**Week 1:**
- [ ] Conduct exit interview (if not completed on last day)
- [ ] Collect all equipment: laptop, monitors, mobile devices, access cards, keys
- [ ] Collect all documents, files, and company materials
- [ ] Ensure final paycheck and benefits information provided
- [ ] Provide COBRA or benefits continuation information
- [ ] Remind of ongoing confidentiality obligations
- [ ] Execute separation agreement if applicable

**Week 2:**
- [ ] Complete knowledge transfer and documentation
- [ ] Transfer ownership of files, documents, and projects
- [ ] Reassign or close open tickets and tasks
- [ ] Archive employee email and files per retention policy
- [ ] Remove employee from organizational charts and internal directories
- [ ] Update external profiles (website, LinkedIn company page if listed)

**Week 3-4:**
- [ ] Final expense reimbursement processed
- [ ] Final invoice payment for contractors
- [ ] Equipment returned or replacement cost invoiced
- [ ] Confirm all access removed via quarterly access review
- [ ] Close out offboarding checklist
- [ ] File offboarding documentation in personnel file

### 5.4 Ongoing Post-Termination Obligations

**Indefinite:**
- Confidentiality obligations remain in effect (indefinite for trade secrets, 5 years for other confidential info)
- NDA remains enforceable
- Non-disparagement obligations (if applicable)
- Cooperation with investigations or legal proceedings
- Intellectual property assignment remains in effect

**Periodic:**
- Alumni network engagement (optional, for amicable departures)
- Reference check responses (per company policy)
- Rehire eligibility reviews (typically 1 year minimum)

## 6. Comprehensive Offboarding Checklist

### 6.1 Master Offboarding Checklist (All Terminations)

**Initiated by:** HR Manager  
**Completed by:** HR, IT, Security, Manager  
**Tracking:** Offboarding ticketing system or HR system

#### HR Activities
- [ ] Offboarding initiated in HR system
- [ ] Termination date and reason documented
- [ ] Final pay and benefits calculated
- [ ] Exit interview scheduled
- [ ] Separation agreement prepared (if applicable)
- [ ] COBRA and benefits continuation materials provided
- [ ] Confidentiality obligations reminder letter sent
- [ ] Employment verification procedure updated
- [ ] Personnel file updated and archived

#### Manager Activities
- [ ] Knowledge transfer plan created and executed
- [ ] Open projects and tasks reassigned
- [ ] Critical information documented
- [ ] Team notified of departure (timing appropriate)
- [ ] Client/stakeholder communication handled (if external-facing)
- [ ] Final performance documentation completed
- [ ] Exit interview conducted (or delegated to HR)
- [ ] Equipment and materials collected
- [ ] Endorsement of security clearance revocation

#### IT Department Activities
- [ ] Disable user accounts (AD, SSO, all IdPs)
- [ ] Revoke email access (or convert to forwarding/archival)
- [ ] Disable VPN and remote access
- [ ] Revoke SaaS application access (all apps)
- [ ] Remove from distribution and security groups
- [ ] Disable MFA devices
- [ ] Revoke certificates and SSH keys
- [ ] Archive user files and email per retention policy
- [ ] Transfer file/folder ownership as directed
- [ ] Recover equipment: laptop, monitors, peripherals, mobile devices
- [ ] Wipe devices per data sanitization policy
- [ ] Update asset inventory
- [ ] Disable physical access badges

#### Security Team Activities
- [ ] Review access logs for anomalies in final days
- [ ] Revoke privileged access and admin rights
- [ ] Revoke API tokens and service accounts
- [ ] Change passwords for shared/service accounts
- [ ] Review recent data access and exports
- [ ] Remove from security tools and dashboards
- [ ] Update incident response contact lists
- [ ] Verify complete access revocation
- [ ] Archive security logs per retention policy
- [ ] Risk assessment if high-risk departure
- [ ] Notify SOC/monitoring team if elevated monitoring warranted

#### Finance/Accounting Activities (if applicable)
- [ ] Revoke access to financial systems
- [ ] Change account credentials if employee had access
- [ ] Review recent transactions for anomalies
- [ ] Process final expense reports
- [ ] Collect company credit cards
- [ ] Update signing authorities and bank accounts
- [ ] Close procurement accounts

#### Legal/Compliance Activities (if applicable)
- [ ] Review employment agreement for post-termination obligations
- [ ] Prepare separation agreement if needed
- [ ] Document any legal holds or ongoing litigation
- [ ] Advise on non-compete enforceability (if applicable)
- [ ] Ensure compliance with notice requirements
- [ ] Preserve evidence if termination contentious

#### Facilities/Physical Security (if applicable)
- [ ] Deactivate building access card
- [ ] Collect office keys
- [ ] Collect parking pass
- [ ] Update visitor logs and escort lists
- [ ] Notify reception/security desk
- [ ] Clear desk and locker

### 6.2 Developer/Engineer Offboarding Addendum

**Additional activities for technical staff:**
- [ ] Remove Git repository access (GitHub, GitLab, Bitbucket)
- [ ] Revoke cloud console access (AWS, Azure, GCP)
- [ ] Remove from Kubernetes RBAC and namespaces
- [ ] Revoke database credentials
- [ ] Remove SSH keys from all servers
- [ ] Revoke container registry access
- [ ] Remove from CI/CD pipelines and deployment tools
- [ ] Review and remove personal scripts or cron jobs
- [ ] Transfer ownership of infrastructure resources
- [ ] Document undocumented systems or processes
- [ ] Review code commits and PRs in final weeks for malicious code (for high-risk terminations)
- [ ] Remove from on-call rotation and incident response team
- [ ] Update runbooks and documentation to remove personal references

### 6.3 Administrator/Privileged User Offboarding Addendum

**Additional activities for privileged access users:**
- [ ] Rotate all administrative passwords immediately
- [ ] Revoke superuser/root access on all systems
- [ ] Remove from PAM (Privileged Access Management) system
- [ ] Revoke access to secrets management systems (Vault, Azure Key Vault, etc.)
- [ ] Remove from security groups granting elevated privileges
- [ ] Revoke access to production environments
- [ ] Remove from backup and disaster recovery systems
- [ ] Revoke access to monitoring and logging systems
- [ ] Review audit logs for privileged actions in final 30 days
- [ ] Document all systems administered and transition ownership
- [ ] Update break-glass procedures if admin was emergency contact
- [ ] Review compliance with Separation of Duties post-departure

### 6.4 Manager/Executive Offboarding Addendum

**Additional activities for managers and executives:**
- [ ] Transfer direct report relationships
- [ ] Update organizational charts
- [ ] Transfer budget approvals and authorities
- [ ] Transfer signing authorities
- [ ] Remove from board committees or governance groups
- [ ] Transfer ownership of strategic documents and plans
- [ ] Update external communication lists (PR, media contacts)
- [ ] Revoke access to executive communication channels
- [ ] Handle equity or stock options per agreements
- [ ] Execute separation agreement with enhanced terms (if applicable)
- [ ] Longer confidentiality and non-compete periods (if applicable and enforceable)
- [ ] Board notification (for C-suite)

### 6.5 Contractor/Third-Party Offboarding

**Contract termination or expiration:**
- [ ] Formal contract termination notice sent
- [ ] All contractor access revoked per standard timeline
- [ ] Equipment returned or purchased (per contract terms)
- [ ] Final invoice processed
- [ ] Contract close-out documentation completed
- [ ] Performance evaluation documented (for future reference)
- [ ] Exit interview (optional but recommended for long-term contractors)
- [ ] Update vendor management system
- [ ] Ensure contractor data returned or destroyed

**Differs from employees:**
- No benefits continuation or COBRA
- No unemployment insurance implications
- Contract terms govern separation procedures
- May have different equipment ownership (contractor-owned devices)
- Intellectual property provisions per contract

## 7. Equipment and Asset Return

### 7.1 Company-Issued Equipment

**Must be returned:**
- Laptop computers
- Desktop computers and monitors
- Mobile devices (phones, tablets)
- Keyboards, mice, docking stations, chargers
- Headsets and webcams
- External hard drives or USB devices
- Physical security tokens
- Building access cards and keys
- Company credit cards
- Parking passes
- Uniforms or branded apparel (if required)

**Return process:**
- Equipment must be returned within 7 calendar days of termination
- Shipping label provided for remote employees
- In-person return during exit interview for local employees
- Inventory checklist signed by employee and IT
- Equipment inspected for damage

**Non-return consequences:**
- Replacement cost deducted from final paycheck (where legally permitted)
- Invoice sent for outstanding equipment
- Collections action for unpaid invoices
- Potential legal action for high-value items

### 7.2 Data Return and Destruction

**Employee must:**
- Return all documents, files, and materials containing confidential information
- Delete Union Eyes data from personal devices (email, files, passwords)
- Confirm deletion in writing (attestation form)
- Return any physical documents or files removed from office

**Union Eyes will:**
- Remotely wipe company-issued devices
- Archive employee email and files per retention policy
- Destroy employee personal data per privacy policy (except as required for legal/compliance)
- Provide employee copy of personal data if requested (GDPR/PIPEDA right)

### 7.3 Bring Your Own Device (BYOD) Offboarding

**If personal devices used for work:**
- Remote wipe of corporate data partition (if MDM enrolled)
- Uninstall MDM and company applications
- Employee confirms deletion of all company data
- Employee confirms deletion of company email and accounts
- No obligation to return personal device

## 8. Knowledge Transfer and Transition

### 8.1 Knowledge Transfer Requirements

**Mandatory for:**
- Employees with specialized knowledge or unique expertise
- Sole maintainers of critical systems or processes
- Customer-facing roles with key client relationships
- Project leaders or product owners

**Knowledge transfer activities:**
- Document all systems, processes, and projects owned
- Identify tribal knowledge and undocumented procedures
- Update runbooks, wikis, and documentation repositories
- Train successor or team members
- Hand off active projects with status summary
- Provide contact list for external stakeholders
- Record video walkthroughs for complex processes (optional)

**Timeline:**
- Begin during notice period (for voluntary resignations)
- Completed before last day if possible
- Continued virtually after departure if critical (compensated)

### 8.2 Critical Role Designations

**Roles requiring enhanced transition planning:**
- Single points of failure (SPOFs) for critical systems
- On-call rotation coverage
- Compliance and audit liaisons
- Key client relationship owners
- Security incident responders

**Mitigation for critical roles:**
- Cross-training and backup personnel identified in advance
- Documentation requirements higher for critical roles
- Notice period extended (negotiated)
- Post-departure consulting arrangement (compensated)

### 8.3 Intellectual Property and Work Product

**Employee must:**
- Deliver all work product to employer
- Execute IP assignment documents if not already signed
- Disclose any inventions or copyrightable works developed during employment
- Confirm no third-party IP incorporated without authorization

**Employer will:**
- Verify all work product obtained
- Archive code, documents, and models
- Transfer ownership in systems and repositories
- Pay for any final deliverables per contract

## 9. Exit Interviews

### 9.1 Purpose of Exit Interviews
- Gather feedback on employee experience
- Identify issues with management, culture, or processes
- Reinforce confidentiality and security obligations
- Maintain positive relationship and alumni network
- Gather information on knowledge gaps or risks

### 9.2 Exit Interview Process

**Scheduling:**
- Scheduled for last day or within final week
- Conducted by HR (neutral party) or manager (if relationship good)
- 30-60 minutes
- May be conducted virtually for remote employees

**Exit interview topics:**
- Reason for departure
- Experience at Union Eyes (positive and negative)
- Feedback on management and culture
- Suggestions for improvement
- Where employee is going (if comfortable sharing)
- Review of confidentiality obligations
- Reminder of non-disparagement commitments
- Invitation to alumni network

**Exit interview documentation:**
- Notes captured in HR system
- Confidential (not shared broadly)
- Analyzed for trends quarterly
- Used to improve retention and culture

### 9.3 Security-Focused Exit Interview Questions

**Asked by Security or HR:**
- Are you aware of any security vulnerabilities or risks?
- Did you experience any security incidents you didn't report?
- Any concerns about insider threats or suspicious activity by others?
- Did you take any company data with you? (direct question)
- Do you understand your ongoing confidentiality obligations?
- Any questions about data return or device wipe?

**Purpose:** Surface security issues and reinforce obligations, not to intimidate.

## 10. High-Risk Offboarding Procedures

### 10.1 High-Risk Indicators
- Involuntary termination for cause
- Termination due to security violation or policy breach
- Employee under investigation
- Contentious separation or litigation threatened
- Employee joining direct competitor
- Employee expressed hostility or threats
- Performance issues or misconduct during employment

### 10.2 High-Risk Offboarding Process

**Immediate termination (no notice period):**
- Access revoked immediately (within minutes)
- Escorted exit from building (if on-site) or immediate device lock (if remote)
- No access to systems to "wrap up" or "say goodbye"
- Communication managed centrally by HR and leadership

**Enhanced monitoring:**
- Access logs reviewed forensically for final 30 days
- File access and downloads analyzed
- Email audit for data exfiltration or inappropriate communication
- Git commits reviewed for malicious code
- Cloud resource creation reviewed for backdoors

**Legal involvement:**
- Legal counsel consulted on termination approach
- Separation agreement with enhanced terms (release of claims)
- Cease and desist letter if threats or policy violations
- Preserve evidence for potential litigation
- Consider non-compete enforcement (if applicable and enforceable)

**Notification:**
- Customers/partners notified if employee had direct relationship (carefully worded)
- Vendors notified to change contact
- Relevant authorities notified if criminal activity suspected (law enforcement, regulators)

### 10.3 Insider Threat Response

**If insider threat suspected:**
- Engage incident response team
- Forensic analysis of employee activity
- Legal hold on all employee data
- Coordinate with cyber insurance
- Engage external forensics firm if needed
- Potential law enforcement notification

## 11. Communication and Notification

### 11.1 Internal Communication

**Manager communicates to team:**
- Timing: Termination day or as soon as appropriate
- Message: Professional, neutral, respectful
- Content: "[Employee] is no longer with Union Eyes. [Transition plan]. Please direct questions to [Manager/HR]."
- Avoid disclosing reason for termination

**Company-wide notification (for senior/public roles):**
- Approved by HR and executive team
- Announcement via email or all-hands
- Focuses on contributions and thanks for service
- Avoids negativity even for involuntary terminations

### 11.2 External Communication

**Clients and partners:**
- Notified if employee had direct relationship
- Introduces successor or interim contact
- Reassures continuity of service
- Professional and positive tone

**Vendor and supplier contacts:**
- Updated in vendor systems
- New contacts provided
- Especially important for procurement relationships

**Public communication (executives or public figures):**
- Press release or public statement if appropriate
- Coordinated with PR/communications team
- Legal review

### 11.3 Social Media and LinkedIn

**Company responsibility:**
- Update website team pages
- Remove from LinkedIn company page employee list (if applicable)
- Update organizational social media profiles

**Employee freedom:**
- Employee free to update LinkedIn with departure
- Employee may connect with colleagues (typically permitted)
- Non-disparagement obligations apply to public statements

## 12. Rehire Eligibility

### 12.1 Eligibility Determination

**Eligible for rehire (green):**
- Voluntary resignation in good standing
- Reduction in force or restructuring
- Retirement
- Completed notice period and offboarding fully
- Positive performance and conduct record
- Left on good terms

**Conditional rehire (amber):**
- Involuntary termination for performance (not misconduct)
- Left without proper notice
- Minor policy violations during employment
- Requires manager and HR approval

**Ineligible for rehire (red):**
- Termination for cause: theft, fraud, harassment, violence, gross misconduct
- Security policy violations or data breaches
- Breach of confidentiality or NDA
- Abandoned job (no-call, no-show)
- Critical of company publicly (severe disparagement)

**Documentation:**
- Rehire eligibility status documented in HR system
- Reviewed and approved by manager and HR
- May change based on time elapsed and circumstances (e.g., performance-based after 2 years)

### 12.2 Boomerang Program (Optional)

**Alumni network and rehire program:**
- Maintain relationships with departed employees
- Alumni events or newsletter (optional)
- Open door for returning employees in good standing
- Expedited screening for rehires (but background checks still required if >5 years)
- Seen as mark of positive culture

## 13. Special Circumstances

### 13.1 Death of Employee

**Immediate actions:**
- HR notified by management or family
- Compassionate communication to team
- Counseling or support resources offered to team
- Access revoked respectfully (no urgency unless security concern)
- Equipment recovery coordinated with family (not immediate)

**Family support:**
- Benefits and life insurance coordinated with family
- Final paycheck and accrued vacation paid to estate
- COBRA information provided
- Sensitive handling of personal effects

**Legal and compliance:**
- Death certificate obtained for records
- Estate executor identified for final settlements
- Data access by family (limited, with legal guidance, per privacy law)

### 13.2 Extended Leave of Absence

**Leaves >90 days:**
- Access may be suspended during leave for security
- Reactivated upon return
- Equipment return optional based on leave type
- Alternative: revoke VPN, keep email active (read-only)

**Return from leave:**
- Access re-enabled after security and HR confirmation
- May require re-training or refresher if extended leave
- Screening updates if required (e.g., >6 month leave)

### 13.3 Role Change or Internal Transfer

**Change requiring access modification:**
- Offboarding from old role (access revocation)
- Onboarding to new role (access provisioning)
- Knowledge transfer to successor
- Continuation of employment, so less formal

**Process:**
- Access review and adjustment
- Move only necessary data to new role
- Maintain audit trail of access changes

## 14. Roles and Responsibilities

### 14.1 Human Resources Manager
- Overall offboarding process ownership
- Initiate offboarding checklist
- Coordinate with all stakeholders
- Conduct exit interviews
- Process final pay and benefits
- Maintain offboarding documentation
- Track metrics and compliance

### 14.2 Chief Security Officer / Security Team
- Define security offboarding requirements
- Review high-risk offboardings
- Monitor access revocation completion
- Audit logs for departing employees
- Investigate security concerns
- Enforce access revocation timelines

### 14.3 IT Department
- Execute access revocation tasks
- Collect and wipe equipment
- Archive email and files
- Transfer data ownership
- Update asset inventory
- Technical offboarding execution

### 14.4 Manager/Supervisor
- Notify HR of departure
- Plan knowledge transfer
- Collect equipment and materials
- Conduct or participate in exit interview
- Communicate to team
- Verify completion of offboarding

### 14.5 Departing Employee
- Provide adequate notice (voluntary departure)
- Complete knowledge transfer
- Return all equipment and materials
- Delete company data from personal devices
- Participate in exit interview
- Honor post-employment obligations

## 15. Metrics and Monitoring

### 15.1 Offboarding Compliance Metrics
- **Access revocation timeliness:** % revoked within SLA (target: 100% within 1 hour for critical access)
- **Offboarding checklist completion:** % completed within 30 days (target: 100%)
- **Equipment recovery:** % recovered within 7 days (target: >95%)
- **Exit interview completion:** % completed (target: >85%)
- **Rehire eligibility determination:** % documented (target: 100%)

### 15.2 Effectiveness Metrics
- Post-departure security incidents (none expected)
- Unauthorized access attempts by terminated users (none expected)
- Equipment recovery cost (replacement cost for non-returns)
- Knowledge transfer effectiveness (subjective, surveyed)
- Average time to complete offboarding

### 15.3 Reporting
- **Monthly:** Offboarding reports to HR and Security leadership
- **Quarterly:** Access review includes verification of terminated user access removal
- **Annually:** Offboarding program effectiveness review

## 16. Policy Review and Updates

- Policy reviewed annually by HR and Security
- Updated based on:
  - Audit findings
  - Security incidents related to offboarding
  - Regulatory changes
  - Process improvement opportunities
  - Technology changes
- Offboarding checklist updated as systems and tools change

## 17. Related Policies and Documents

- [Employee Screening Policy](EMPLOYEE_SCREENING_POLICY.md)
- [Employment Terms and Security Policy](EMPLOYMENT_TERMS_SECURITY_POLICY.md)
- [NDA and Confidentiality Policy](NDA_AND_CONFIDENTIALITY_POLICY.md)
- [Security Awareness Training Policy](SECURITY_AWARENESS_TRAINING_POLICY.md)
- [Remote Work Security Policy](REMOTE_WORK_SECURITY_POLICY.md)
- [Access Control Policy](../access/ACCESS_CONTROL_POLICY.md)
- Information Security Policy
- Data Retention and Destruction Policy
- Incident Response Policy

## 18. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Chief Security Officer | _______________ | _______________ | _______________ |
| HR Manager | _______________ | _______________ | _______________ |
| IT Director | _______________ | _______________ | _______________ |
| Chief Executive Officer | _______________ | _______________ | _______________ |

---

**Document Classification:** Internal Use  
**Next Review Date:** February 2027
