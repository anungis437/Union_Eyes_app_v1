# Git History Purge - Simple Steps

## Manual Git History Cleanup

### Prerequisites
1. Install git-filter-repo:
   ```powershell
   pip install git-filter-repo
   ```
   OR
   ```powershell
   scoop install git-filter-repo
   ```

### Step 1: Create Backup
```powershell
cd C:\APPS
git clone --mirror Union_Eyes_app_v1 Union_Eyes_backup
```

### Step 2: Purge Files from History
```powershell
cd Union_Eyes_app_v1

git filter-repo --invert-paths `
  --path .env `
  --path .env.production `
  --path .env.staging `
  --path .env.10-10-excellence `
  --path docs/deployment/AZURE_CREDENTIALS.md `
  --force
```

### Step 3: Verify Removal
```powershell
# Check that files are gone from history
git log --all --full-history --oneline -- .env
# Should return nothing

git log --all --full-history --oneline -- .env.production
# Should return nothing
```

### Step 4: Garbage Collect
```powershell
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Step 5: Force Push to Remote
⚠️ **WARNING:** This will rewrite history for ALL team members!

```powershell
# Push all branches
git push --force --all

# Push all tags
git push --force --tags
```

### Step 6: Notify Team
All team members must delete their local clones and re-clone:

```powershell
cd C:\APPS
Remove-Item -Recurse -Force Union_Eyes_app_v1
git clone <repo-url>
```

### Step 7: CRITICAL - Rotate All Credentials
Treat ALL exposed credentials as compromised and rotate IMMEDIATELY:

- ✅ PostgreSQL DATABASE_URL passwords
- ✅ Azure Container Registry passwords
- ✅ Azure OpenAI API keys (all 4 endpoints)
- ✅ Azure Storage account keys (2 accounts)
- ✅ Azure Speech Service keys
- ✅ Stripe secret keys
- ✅ Clerk secret keys
- ✅ Whop API keys

### Verification
```powershell
# Search for any remaining secrets
git grep -i "password|secret|api_key" -- ':!*.md' ':!*.example'
# Should return minimal/no results

# Check repository size reduced
Get-ChildItem .git -Recurse | Measure-Object -Property Length -Sum
```

## Alternative: Using BFG Repo-Cleaner

```powershell
# Download BFG from https://rtyley.github.io/bfg-repo-cleaner/
# Place bfg.jar in accessible location

# Create backup first
cd C:\APPS
git clone --mirror Union_Eyes_app_v1 Union_Eyes_backup

cd Union_Eyes_app_v1

# Remove files
java -jar path\to\bfg.jar --delete-files .env
java -jar path\to\bfg.jar --delete-files .env.production
java -jar path\to\bfg.jar --delete-files .env.staging
java -jar path\to\bfg.jar --delete-files .env.10-10-excellence
java -jar path\to\bfg.jar --delete-files AZURE_CREDENTIALS.md

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push --force --all
git push --force --tags
```

## Rollback (if needed)
If something goes wrong:

```powershell
cd C:\APPS\Union_Eyes_app_v1
Remove-Item -Recurse -Force .git
Copy-Item -Recurse C:\APPS\Union_Eyes_backup .git
```
