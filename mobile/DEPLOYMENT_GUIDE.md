# UnionEyes Mobile App - Complete Deployment Guide

Comprehensive guide for deploying UnionEyes to Apple App Store and Google Play Store.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Development Workflow](#development-workflow)
4. [Building](#building)
5. [Testing](#testing)
6. [Store Submission](#store-submission)
7. [OTA Updates](#ota-updates)
8. [Monitoring](#monitoring)
9. [Rollback Procedures](#rollback-procedures)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts

- [ ] **Apple Developer Account** ($99/year)
  - Enrolled in Apple Developer Program
  - Two-factor authentication enabled
  - Certificates and provisioning profiles access
- [ ] **Google Play Developer Account** ($25 one-time)
  - Identity verified
  - Payment profile completed
- [ ] **Expo Account** (Free)
  - EAS access enabled
  - Project created
- [ ] **GitHub Account**
  - Repository access
  - Secrets configured

### Required Tools

```bash
# Node.js and pnpm
node --version  # v20+
pnpm --version  # v8+

# Expo CLI
npm install -g expo-cli eas-cli

# Fastlane (optional but recommended)
sudo gem install fastlane

# Git
git --version
```

### Environment Setup

```bash
# Clone repository
git clone https://github.com/unioneyes/unioneyes-mobile.git
cd unioneyes-mobile/mobile

# Install dependencies
pnpm install

# Copy environment template
cp env/.env.example .env
```

---

## Initial Setup

### 1. Configure EAS

```bash
# Login to Expo
eas login

# Configure project
eas init

# Link to existing project or create new
eas build:configure
```

**Update `eas.json`:**

- Set project ID
- Configure build profiles
- Set submission settings

### 2. Configure App Identifiers

**iOS (app.json):**

```json
{
  "ios": {
    "bundleIdentifier": "com.unioneyes.app",
    "buildNumber": "1"
  }
}
```

**Android (app.json):**

```json
{
  "android": {
    "package": "com.unioneyes.app",
    "versionCode": 1
  }
}
```

### 3. Set Up Code Signing

#### iOS Code Signing

**Option A: Automatic (EAS)**

```bash
eas build --platform ios --profile production
# Follow prompts to generate certificates
```

**Option B: Manual (Fastlane Match)**

```bash
fastlane match init
fastlane match development
fastlane match appstore
```

#### Android Code Signing

**Generate Keystore:**

```bash
keytool -genkey -v -keystore unioneyes.keystore \
  -alias unioneyes -keyalg RSA -keysize 2048 -validity 10000

# Store credentials securely
KEYSTORE_PASSWORD=your-password
KEY_ALIAS=unioneyes
KEY_PASSWORD=your-key-password
```

**Configure EAS:**

```json
{
  "android": {
    "credentials": {
      "credentialsSource": "local",
      "keystorePath": "./unioneyes.keystore",
      "keystorePassword": "${KEYSTORE_PASSWORD}",
      "keyAlias": "${KEY_ALIAS}",
      "keyPassword": "${KEY_PASSWORD}"
    }
  }
}
```

### 4. Configure Secrets

**GitHub Secrets:**

- `EXPO_TOKEN` - Expo access token
- `EXPO_APPLE_ID` - Apple ID
- `EXPO_APPLE_PASSWORD` - App-specific password
- `ANDROID_KEYSTORE_FILE` - Base64 encoded keystore
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `SENTRY_AUTH_TOKEN`
- `SLACK_WEBHOOK_URL`

---

## Development Workflow

### Branch Strategy

```
main (production)
  ├── develop (staging)
  │   ├── feature/new-feature
  │   ├── bugfix/fix-issue
  │   └── hotfix/critical-fix
```

### Version Management

```bash
# Increment version
node scripts/bump-version.js patch  # 1.0.0 -> 1.0.1
node scripts/bump-version.js minor  # 1.0.0 -> 1.1.0
node scripts/bump-version.js major  # 1.0.0 -> 2.0.0

# Generate changelog
node scripts/generate-changelog.js mobile-v1.0.0 HEAD
```

### Environment Configuration

```bash
# Development
cp env/.env.development .env

# Preview/Staging
cp env/.env.preview .env

# Production
cp env/.env.production .env
```

---

## Building

### Development Builds

```bash
# iOS (Simulator)
eas build --platform ios --profile development

# Android (APK)
eas build --platform android --profile development
```

### Preview Builds (TestFlight/Internal Testing)

```bash
# iOS
eas build --platform ios --profile preview
eas submit --platform ios --profile preview

# Android
eas build --platform android --profile preview
eas submit --platform android --profile preview
```

### Production Builds

```bash
# Pre-build validation
node scripts/validate-build.js

# Build for both platforms
eas build --platform all --profile production

# Or build individually
eas build --platform ios --profile production
eas build --platform android --profile production
```

### Using Fastlane

```bash
# iOS TestFlight
fastlane ios beta

# iOS App Store
fastlane ios release

# Android Internal Testing
fastlane android beta

# Android Production
fastlane android release
```

### CI/CD Builds

**Automatic builds triggered by:**

- **Pull Request** → Preview build (`build-preview.yml`)
- **Tag Push** (`mobile-v*`) → Production build (`build-production.yml`)
- **Manual Trigger** → Custom build via GitHub Actions

---

## Testing

### Pre-Submission Testing

Follow the complete [Testing Guide](./testing-guide.md):

```bash
# Run tests
pnpm test

# Run linter
pnpm lint

# Type check
pnpm type-check

# Validate build
node scripts/validate-build.js
```

### Beta Testing

#### iOS TestFlight

1. Build and submit to TestFlight:

   ```bash
   eas build --platform ios --profile preview
   eas submit --platform ios --profile preview
   ```

2. Add internal testers in App Store Connect
3. Invite external testers (optional, requires Apple review)
4. Collect feedback
5. Iterate and fix issues

#### Android Internal Testing

1. Build and submit:

   ```bash
   eas build --platform android --profile preview
   eas submit --platform android --profile preview
   ```

2. Add testers in Play Console
3. Share opt-in URL
4. Collect feedback
5. Iterate and fix issues

---

## Store Submission

### Pre-Submission Checklist

- [ ] Complete [App Store Checklist](./app-store-checklist.md)
- [ ] Complete [Play Store Checklist](./play-store-checklist.md)
- [ ] All tests passing
- [ ] Beta testing complete
- [ ] Store assets ready
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Support URL functional

### iOS App Store Submission

1. **Prepare Build:**

   ```bash
   eas build --platform ios --profile production
   ```

2. **Submit to App Store Connect:**

   ```bash
   eas submit --platform ios --profile production
   ```

   Or manually:
   - Open App Store Connect
   - Create new version
   - Upload build
   - Fill out metadata

3. **Configure Store Listing:**
   - App name and subtitle
   - Description (from `store-assets/app-store/description.txt`)
   - Keywords (from `store-assets/app-store/keywords.txt`)
   - Screenshots
   - Privacy policy URL
   - Support URL

4. **Submit for Review:**
   - Review all information
   - Add reviewer notes if needed
   - Provide demo account
   - Submit

5. **Review Process:**
   - Typically 1-3 days
   - Monitor email for updates
   - Be ready to respond quickly

### Android Play Store Submission

1. **Prepare Build:**

   ```bash
   eas build --platform android --profile production
   ```

2. **Submit to Play Console:**

   ```bash
   eas submit --platform android --profile production
   ```

   Or manually:
   - Open Play Console
   - Create new release
   - Upload AAB file
   - Fill out release details

3. **Configure Store Listing:**
   - App name
   - Short description (from `store-assets/play-store/short-description.txt`)
   - Full description (from `store-assets/play-store/full-description.txt`)
   - Screenshots
   - Feature graphic
   - Privacy policy URL

4. **Complete Content Rating:**
   - Fill out IARC questionnaire
   - Receive age rating

5. **Complete Data Safety:**
   - Declare data collection practices
   - Explain data usage
   - Describe security practices

6. **Submit for Review:**
   - Review all information
   - Select countries/regions
   - Set pricing
   - Submit

7. **Review Process:**
   - Typically 1-7 days
   - Monitor email for updates

---

## OTA Updates

### Publishing Updates

**For minor updates that don't require native code changes:**

```bash
# Update code
git commit -am "Fix: Bug fixes and improvements"

# Publish OTA update
eas update --branch production --message "Bug fixes and improvements"
```

### Automatic OTA Updates

OTA updates are automatically published on push to `main` branch via GitHub Actions (`update-ota.yml`).

### Update Channels

- `development` - Development builds
- `preview` - Preview/staging builds
- `production` - Production builds

### Testing Updates

```bash
# Publish to preview channel
eas update --branch preview --message "Testing new feature"

# Test on development build
# Updates apply immediately on app restart
```

### Update Best Practices

✅ **Do use OTA for:**

- Bug fixes
- UI changes
- Content updates
- Non-native code changes

❌ **Don't use OTA for:**

- Native module changes
- Binary changes
- Breaking changes
- Major version updates

---

## Monitoring

### Error Tracking (Sentry)

```typescript
import * as Sentry from '@sentry/react-native';

// Errors automatically captured
// View at: https://sentry.io/organizations/unioneyes/
```

### Analytics (Amplitude)

```typescript
import { trackEvent } from './src/services/analytics';

trackEvent('Feature Used', { feature_name: 'claims' });
```

### App Store Metrics

**iOS (App Store Connect):**

- Downloads and updates
- App Store views
- Conversion rate
- Ratings and reviews
- Crashes and hangs

**Android (Play Console):**

- Installs and uninstalls
- Store listing visitors
- Conversion rate
- Ratings and reviews
- ANRs and crashes

### Performance Monitoring

- Monitor crash-free rate (target: >99.5%)
- Track ANR rate (Android)
- Monitor API response times
- Track app launch time
- Monitor memory usage

---

## Rollback Procedures

### OTA Rollback

```bash
# Republish previous working version
eas update --branch production --message "Rollback to previous version"

# Or use specific update ID
eas update:republish --branch production --group <update-group-id>
```

### Store Build Rollback

#### iOS

1. Open App Store Connect
2. Go to App Store → Versions
3. Remove from Sale (immediate)
4. Submit previous version
5. Expedite review if critical

#### Android

1. Open Play Console
2. Go to Release → Production
3. Create new release with previous version
4. Use staged rollout to gradually roll back
5. Or halt rollout immediately

### Emergency Procedures

**Critical Issue Found:**

1. Halt all rollouts immediately
2. Remove app from sale (if necessary)
3. Fix issue in hotfix branch
4. Fast-track testing
5. Submit emergency update
6. Request expedited review

---

## Troubleshooting

### Common Build Issues

**EAS Build Fails:**

```bash
# Clear local cache
rm -rf node_modules
pnpm install

# Clear EAS cache
eas build --platform [ios|android] --clear-cache
```

**iOS Code Signing Issues:**

```bash
# Reset certificates
fastlane match nuke development
fastlane match nuke distribution

# Regenerate
fastlane match development
fastlane match appstore
```

**Android Build Fails:**

```bash
# Clean gradle
cd android
./gradlew clean

# Verify keystore
keytool -list -v -keystore unioneyes.keystore
```

### Submission Issues

**iOS Rejected - Guideline 2.1:**

- App crashes during review
- Solution: Test thoroughly, fix crashes

**iOS Rejected - Guideline 4.2:**

- Incomplete functionality
- Solution: Ensure all features work

**iOS Rejected - Guideline 5.1:**

- Privacy issues
- Solution: Update privacy policy, add descriptions

**Android Rejected - Policy Violation:**

- Check specific policy cited
- Update accordingly
- Resubmit with explanation

### Update Issues

**Users Not Getting Updates:**

- Check update channel matches build profile
- Verify users are on compatible runtime version
- Check for JS errors in update

**App Crashes After Update:**

- Rollback immediately
- Check error logs in Sentry
- Test update locally
- Fix and republish

---

## Release Checklist

- [ ] Code reviewed and approved
- [ ] All tests passing
- [ ] Version bumped
- [ ] Changelog generated
- [ ] Build validates successfully
- [ ] Beta testing complete
- [ ] Store assets ready
- [ ] Privacy policy updated
- [ ] Terms updated (if needed)
- [ ] Support documentation updated
- [ ] Team notified of release
- [ ] Monitoring configured
- [ ] Rollback plan documented
- [ ] Release notes written
- [ ] Marketing materials ready

---

## Support and Resources

### Internal Support

- **Email:** <dev@unioneyes.com>
- **Slack:** #mobile-deployment
- **On-Call:** [phone number]

### External Resources

- **Apple Developer:** <https://developer.apple.com/support/>
- **Google Play Support:** <https://support.google.com/googleplay/android-developer>
- **Expo Docs:** <https://docs.expo.dev/>
- **EAS Docs:** <https://docs.expo.dev/eas/>

### Quick Commands Reference

```bash
# Version management
node scripts/bump-version.js [major|minor|patch]
node scripts/generate-changelog.js

# Building
eas build --platform [ios|android|all] --profile [development|preview|production]

# Submission
eas submit --platform [ios|android] --profile [preview|production]

# OTA Updates
eas update --branch [development|preview|production] --message "Update message"

# Fastlane
fastlane ios [dev|beta|release]
fastlane android [dev|beta|release]
```

---

## Appendix

### A. Credentials Storage

Store sensitive credentials securely:

- Use 1Password or similar
- GitHub Secrets for CI/CD
- Never commit to repository
- Rotate regularly

### B. Team Access

Required access levels:

- **Apple Developer:** Admin
- **Play Console:** Admin
- **Expo:** Owner/Admin
- **GitHub:** Admin
- **Sentry:** Admin

### C. Emergency Contacts

- **Apple Developer Support:** [contact info]
- **Google Play Support:** [contact info]
- **Expo Support:** <support@expo.dev>
- **Internal On-Call:** [phone number]

---

**Document Version:** 1.0.0  
**Last Updated:** February 9, 2026  
**Next Review:** March 9, 2026

For questions or issues, contact: <dev@unioneyes.com>
