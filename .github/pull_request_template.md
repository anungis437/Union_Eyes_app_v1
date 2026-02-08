## Description
<!-- Provide a clear and concise description of the changes -->

## Type of Change
<!-- Mark the relevant option with an 'x' -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] ♻️ Code refactor (no functional changes)
- [ ] 🔒 Security fix
- [ ] 🌐 Compliance/regulation change

## Union Compliance Checklist
<!-- These are REQUIRED for all PRs affecting member data or union operations -->

### Privacy & Data Protection
- [ ] ✅ Provincial privacy laws checked (PIPEDA, PIPA, etc.)
- [ ] ✅ Cross-border data transfer restrictions respected
- [ ] ✅ Indigenous data sovereignty (OCAP®) principles followed
- [ ] ✅ Geofence privacy validated (GPS tracking compliance)

### Taxation & Financial
- [ ] ✅ Strike fund tax compliance verified (CRA regulations)
- [ ] ✅ Transfer pricing rules followed for cross-border transactions
- [ ] ✅ Joint-trust FMV benchmarks validated

### Language & Culture
- [ ] ✅ OQLF language requirements met (Quebec French)
- [ ] ✅ Bilingual content provided where required
- [ ] ✅ Cultural sensitivity reviewed

### Security & Legal
- [ ] ✅ Cyber insurance coverage updated if needed
- [ ] ✅ Open source license contamination checked
- [ ] ✅ Force majeure procedures documented

### Governance
- [ ] ✅ Founder conflict-of-interest checks passed
- [ ] ✅ Golden share mission-lock not violated
- [ ] ✅ ESG claims verified by third party

## Validator Results
<!-- Paste output from `pnpm run validate:blind-spots` -->

```
# Paste validator output here
```

## Testing
<!-- Describe the tests you ran and how to reproduce them -->

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Validators pass locally

### Test Coverage
<!-- Paste test coverage if applicable -->

```
# Coverage stats
```

## Screenshots/Videos
<!-- If applicable, add screenshots or videos to help explain your changes -->

## Related Issues
<!-- Link related issues using #issue_number -->

Closes #
Related to #

## Migration Required?
<!-- Does this PR require database migration, data migration, or config changes? -->

- [ ] Database schema changes
- [ ] Data migration script needed
- [ ] Environment variables added/changed
- [ ] Infrastructure changes required

### Migration Steps
<!-- If yes, document the migration steps -->

1. 
2. 
3. 

## Deployment Notes
<!-- Any special considerations for deployment -->

- [ ] Requires staging deployment first
- [ ] Backward compatible
- [ ] Feature flag controlled
- [ ] Requires configuration changes

## Documentation
<!-- Has documentation been updated? -->

- [ ] README updated
- [ ] API documentation updated
- [ ] Inline code comments added
- [ ] User guide updated

## Performance Impact
<!-- Describe any performance implications -->

- [ ] No significant performance impact
- [ ] Performance improved
- [ ] Performance degraded (justify why)

## Security Considerations
<!-- Any security implications? -->

- [ ] Security review completed
- [ ] No sensitive data exposed
- [ ] Authentication/authorization checked
- [ ] Input validation added

## Reviewer Notes
<!-- Any specific areas you want reviewers to focus on? -->

## Post-Merge Tasks
<!-- List any tasks that need to be done after merging -->

- [ ] 
- [ ] 
- [ ] 

---

## For Maintainers

### Merge Checklist
- [ ] All CI checks passing
- [ ] Code review approved by 2+ maintainers
- [ ] Union compliance validators passed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No merge conflicts
- [ ] Staging deployment successful

### Deployment Plan
- [ ] Deploy to staging
- [ ] Run smoke tests on staging
- [ ] Deploy to production
- [ ] Monitor for 24 hours
- [ ] Post-deployment validation
