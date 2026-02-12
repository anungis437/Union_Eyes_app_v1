# 🚀 DOCKER PHASE 1 - QUICK REFERENCE

## ⚡ ONE-LINER (21 Minutes)
```powershell
cd C:\APPS\Union_Eyes_app_v1; .\scripts\docker\backup-current-state.ps1; .\scripts\docker\apply-phase1.ps1; .\scripts\docker\add-resource-limits.ps1 -Environment dev; .\scripts\docker\validate-phase1.ps1
```

---

## 📋 STEP-BY-STEP (Safe Mode)

### 1. Validate Prerequisites (2 min)
```powershell
.\scripts\docker\dry-run-all.ps1 -Phase 1 -Validate
```

### 2. Preview Changes (3 min)
```powershell
.\scripts\docker\dry-run-all.ps1 -Phase 1
```

### 3. Backup (1 min)
```powershell
.\scripts\docker\backup-current-state.ps1
```

### 4. Apply Phase 1 (5 min)
```powershell
.\scripts\docker\apply-phase1.ps1
```

### 5. Add Resource Limits (2 min)
```powershell
.\scripts\docker\add-resource-limits.ps1 -Environment dev
```

### 6. Validate (3 min)
```powershell
.\scripts\docker\validate-phase1.ps1
```

### 7. Test Backup (3 min)
```powershell
.\scripts\docker\backup-automation.ps1 -Test
```

### 8. Commit (2 min)
```powershell
git add .; git commit -m "feat: Docker Excellence Phase 1"; git push
```

---

## 🛠️ COMMON COMMANDS

### Dry-Run Everything
```powershell
.\scripts\docker\add-resource-limits.ps1 -DryRun
.\scripts\docker\apply-phase1.ps1 -DryRun
```

### Production Resources
```powershell
.\scripts\docker\add-resource-limits.ps1 -Environment prod
```

### Backup Operations
```powershell
# Create backup
.\scripts\docker\backup-automation.ps1

# Verify backups
.\scripts\docker\backup-automation.ps1 -Verify

# Restore backup
.\scripts\docker\backup-automation.ps1 -Restore -BackupFile backup_20260212_020000.sql
```

### Docker Health Checks
```powershell
# View status
docker-compose ps

# Check health details
docker inspect --format='{{json .State.Health}}' unioneyes-app | ConvertFrom-Json

# View logs
docker-compose logs -f app

# Resource usage
docker stats
```

---

## 📊 GRADE TRACKING

| Phase | Grade | Points | Status |
|-------|-------|--------|--------|
| **Current** | **B+ (85)** | - | ✅ Done |
| **Phase 1** | **A- (90)** | +5 | 🎯 Ready |
| Phase 2 | A (94) | +4 | 📝 Planned |
| Phase 3 | A (97) | +3 | 📝 Planned |
| Phase 4 | A+ (98) | +1 | 📝 Planned |
| Phase 5 | A+ (100) | +2 | 📝 Planned |

---

## 🎯 VALIDATION CHECKLIST

- [ ] `docker-compose config` - No errors
- [ ] `docker-compose up -d` - Starts successfully
- [ ] `curl http://localhost:3000/api/health` - Returns 200
- [ ] `docker stats` - Shows resource limits
- [ ] `docker-compose ps` - All containers "healthy"
- [ ] GitHub Actions triggered on push
- [ ] Backup files in `backups/docker/`
- [ ] Validation test: 16/16 passed

---

## 🔄 ROLLBACK

```powershell
# Quick rollback
$backup = Get-ChildItem backups/docker_backup_* | Sort-Object Name -Descending | Select-Object -First 1
Copy-Item "$backup\*" . -Recurse -Force
docker-compose down; docker-compose up -d
```

---

## 📁 FILES CREATED

- `.github/workflows/docker-ci.yml` - CI/CD pipeline
- `scripts/docker/*.ps1` - 6 automation scripts
- `docs/docker-excellence-roadmap.md` - Master plan
- `DOCKER_IMPLEMENTATION_COMPLETE.md` - Summary

---

## 🆘 TROUBLESHOOTING

### Script Error?
```powershell
$Error[0] | Format-List -Force
```

### Docker Not Starting?
```powershell
docker-compose down
docker-compose config
docker-compose up -d
```

### Backup Fails?
```powershell
docker ps | grep unioneyes-db
Get-Content backups/docker/backup.log -Tail 20
```

---

## 📞 WHAT YOU GET

✅ Resource limits (CPU & memory)  
✅ Health checks (app + DB)  
✅ CI/CD with Trivy scanning  
✅ Automated backups (7-day retention)  
✅ Multi-arch builds (amd64 + arm64)  
✅ Restart policies  
✅ Comprehensive docs  
✅ **+5 grade points!**

---

**Ready?** Run the one-liner above! 🚀
