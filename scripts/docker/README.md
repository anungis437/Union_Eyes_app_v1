# Docker Excellence Implementation

## Overview

This directory contains automation scripts for elevating Union Eyes Docker infrastructure from **B+ (85/100)** to **A+ (98/100)** "World Class" status.

## Quick Start

### 1. Dry-Run Phase 1 (Safe Preview)
```powershell
.\scripts\docker\dry-run-all.ps1 -Phase 1
```

### 2. Backup Current State
```powershell
.\scripts\docker\backup-current-state.ps1
```

### 3. Apply Phase 1 Improvements
```powershell
.\scripts\docker\apply-phase1.ps1
```

### 4. Validate Implementation
```powershell
.\scripts\docker\validate-phase1.ps1
```

## Scripts Reference

### Master Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `dry-run-all.ps1` | Test all phases safely | `.\dry-run-all.ps1 -Phase 1` |
| `backup-current-state.ps1` | Backup Docker configs | `.\backup-current-state.ps1` |
| `apply-phase1.ps1` | Implement Phase 1 | `.\apply-phase1.ps1` |
| `validate-phase1.ps1` | Verify Phase 1 | `.\validate-phase1.ps1` |

### Enhancement Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `add-resource-limits.ps1` | Add CPU/memory limits | `.\add-resource-limits.ps1 -Environment prod` |
| `backup-automation.ps1` | Automated backups | `.\backup-automation.ps1` |

### Backup Automation

#### Create Backup
```powershell
.\scripts\docker\backup-automation.ps1
```

#### Test Backup (No Retention)
```powershell
.\scripts\docker\backup-automation.ps1 -Test
```

#### Verify All Backups
```powershell
.\scripts\docker\backup-automation.ps1 -Verify
```

#### Restore from Backup
```powershell
.\scripts\docker\backup-automation.ps1 -Restore -BackupFile backup_20260212_020000.sql
```

#### Custom Retention Policy
```powershell
.\scripts\docker\backup-automation.ps1 -RetentionDays 14
```

## Resource Limits

### Development Environment
```yaml
app:
  cpus: 2
  memory: 4GB
  
postgres:
  cpus: 2
  memory: 2GB
```

### Production Environment
```yaml
app:
  cpus: 4
  memory: 8GB
  
postgres:
  cpus: 4
  memory: 4GB
```

## Health Checks

### Application Service
- **Endpoint:** `/api/health`
- **Interval:** 30 seconds
- **Timeout:** 10 seconds
- **Retries:** 3
- **Start Period:** 60 seconds

### PostgreSQL Service
- **Command:** `pg_isready -U postgres`
- **Interval:** 10 seconds
- **Timeout:** 5 seconds
- **Retries:** 5
- **Start Period:** 30 seconds

## CI/CD Pipeline

### Workflow: `.github/workflows/docker-ci.yml`

**Triggers:**
- Push to `main`, `staging`, `develop`
- Pull requests to `main`, `staging`
- Manual dispatch

**Jobs:**
1. **Build and Test** - Multi-stage Docker build
2. **Security Scan** - Trivy vulnerability scanning
3. **Multi-Arch Build** - amd64 + arm64 images
4. **Compose Validation** - Syntax and security checks
5. **Optimization Report** - Image size and layer analysis

**Features:**
- ✅ Trivy security scanning (SARIF upload to GitHub Security)
- ✅ Multi-architecture builds (amd64, arm64)
- ✅ Image size optimization checks
- ✅ Container startup tests
- ✅ Secret detection in Docker files
- ✅ Layer analysis and recommendations

## Backup Strategy

### Features
- ✅ Automated PostgreSQL backups with `pg_dump`
- ✅ Compressed backups (format=custom, compress=9)
- ✅ 7-day retention policy (configurable)
- ✅ Backup verification after creation
- ✅ Metadata tracking (size, duration, timestamp)
- ✅ Pre-restore safety backups
- ✅ Comprehensive logging

### Schedule Recommendation
Add to crontab (Linux) or Task Scheduler (Windows):

```bash
# Daily at 2 AM UTC
0 2 * * * cd /path/to/unioneyes && pwsh scripts/docker/backup-automation.ps1
```

### Backup Location
```
backups/docker/
├── backup_20260212_020000.sql
├── backup_20260212_020000.json
├── backup_20260213_020000.sql
├── backup_20260213_020000.json
└── backup.log
```

## Safety Features

### All Scripts Support
- ✅ **Dry-run mode** - Preview changes without applying
- ✅ **Automatic backups** - Before making changes
- ✅ **Validation checks** - After applying changes
- ✅ **Rollback capability** - Restore from backups
- ✅ **Comprehensive logging** - Track all operations

### Error Handling
- Pre-flight checks before execution
- Automatic rollback on validation failure
- Detailed error messages with troubleshooting hints
- Health check verification after changes

## Usage Examples

### Complete Phase 1 Implementation
```powershell
# 1. Preview changes
.\scripts\docker\dry-run-all.ps1 -Phase 1

# 2. Backup current state
.\scripts\docker\backup-current-state.ps1

# 3. Apply Phase 1
.\scripts\docker\apply-phase1.ps1

# 4. Validate
.\scripts\docker\validate-phase1.ps1

# 5. Test backup system
.\scripts\docker\backup-automation.ps1 -Test
```

### Add Resource Limits Only
```powershell
# Preview changes
.\scripts\docker\add-resource-limits.ps1 -Environment prod -DryRun

# Apply changes
.\scripts\docker\add-resource-limits.ps1 -Environment prod

# Validate
docker-compose config
```

### Manual Backup and Restore
```powershell
# Create backup
.\scripts\docker\backup-automation.ps1

# List backups
Get-ChildItem backups/docker/backup_*.sql

# Restore specific backup
.\scripts\docker\backup-automation.ps1 -Restore -BackupFile backup_20260212_020000.sql
```

## Troubleshooting

### Docker Compose Validation Fails
```powershell
# Check syntax
docker-compose config

# View detailed errors
docker-compose config --quiet
```

### Container Health Check Fails
```powershell
# Check container logs
docker logs unioneyes-app

# Check health status
docker inspect --format='{{json .State.Health}}' unioneyes-app | jq
```

### Backup Fails
```powershell
# Check container is running
docker ps | grep unioneyes-db

# Test database connection
docker exec unioneyes-db psql -U postgres -c "SELECT version();"

# View backup logs
Get-Content backups/docker/backup.log -Tail 50
```

### Resource Limits Too Restrictive
```powershell
# Check current usage
docker stats

# Adjust limits
.\scripts\docker\add-resource-limits.ps1 -Environment dev

# Or manually edit docker-compose.yml
```

## Next Steps

### Phase 2: Observability Stack
- Prometheus metrics collection
- Grafana dashboards
- Loki log aggregation
- Alert rules

### Phase 3: Kubernetes Readiness
- K8s deployment manifests
- Horizontal Pod Autoscaler (HPA)
- Ingress configuration
- ConfigMaps and Secrets

### Phase 4: Advanced Security
- Azure Key Vault integration
- Container image signing
- Security context policies
- CIS compliance audit

### Phase 5: Operational Excellence
- Blue-green deployment automation
- Disaster recovery testing
- Comprehensive runbooks
- Performance optimization

## Resources

- **Roadmap:** See `/docs/docker-excellence-roadmap.md`
- **Current Assessment:** See `/REPOSITORY_EXCELLENCE_SPRINT_COMPLETE.md`
- **CI/CD Workflow:** See `/.github/workflows/docker-ci.yml`
- **Backups:** Located in `/backups/docker/`

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review script logs in `/backups/docker/backup.log`
3. Run validation: `.\scripts\docker\validate-phase1.ps1`
4. Check Docker logs: `docker-compose logs -f`

---

**Version:** Phase 1 - Quick Wins  
**Last Updated:** February 12, 2026  
**Status:** Ready for Implementation
