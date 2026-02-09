# Fastlane for UnionEyes Mobile

Fastlane automates builds, testing, and releases for both iOS and Android.

## Setup

### Install Fastlane

```bash
# Using Homebrew (macOS)
brew install fastlane

# Using RubyGems
sudo gem install fastlane

# Install dependencies
cd mobile
bundle install
```

### iOS Setup

1. **Configure Apple Developer Account**
   - Update `Appfile` with your Apple ID and Team ID
   - Set up App Store Connect API key (recommended)

2. **Setup Match (Code Signing)**

   ```bash
   fastlane match init
   ```

   - Choose git storage
   - Enter your certificates repository URL
   - Generate certificates: `fastlane match development`
   - Generate App Store certificates: `fastlane match appstore`

3. **Configure Environment Variables**

   ```bash
   export MATCH_PASSWORD="your-match-password"
   export FASTLANE_USER="your-apple-id@example.com"
   export FASTLANE_PASSWORD="your-app-specific-password"
   ```

### Android Setup

1. **Create Keystore**

   ```bash
   keytool -genkey -v -keystore unioneyes.keystore -alias unioneyes -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Setup Google Play Service Account**
   - Go to Google Play Console > API Access
   - Create service account
   - Download JSON key file
   - Save as `google-play-service-account.json`

3. **Configure Environment Variables**

   ```bash
   export ANDROID_KEYSTORE_FILE="path/to/unioneyes.keystore"
   export ANDROID_KEYSTORE_PASSWORD="your-keystore-password"
   export ANDROID_KEY_ALIAS="unioneyes"
   export ANDROID_KEY_PASSWORD="your-key-password"
   ```

## Available Lanes

### iOS Lanes

#### Development

```bash
fastlane ios dev
```

Builds development version for testing on devices.

#### TestFlight

```bash
fastlane ios beta
```

- Increments build number
- Builds release version
- Uploads to TestFlight
- Uploads dSYMs to Sentry

#### App Store

```bash
fastlane ios release
```

- Increments version
- Builds release version
- Uploads to App Store Connect
- Creates GitHub release
- Uploads dSYMs to Sentry

#### Screenshots

```bash
fastlane ios screenshots
```

Generates screenshots for all device sizes.

#### Metadata

```bash
fastlane ios metadata
```

Uploads metadata and screenshots to App Store Connect.

#### Register Devices

```bash
fastlane ios register_devices
```

Registers new devices from `devices.txt`.

### Android Lanes

#### Development

```bash
fastlane android dev
```

Builds debug APK.

#### Internal Testing

```bash
fastlane android beta
```

- Increments version code
- Builds release AAB
- Uploads to Play Store (Internal Testing)
- Uploads ProGuard mappings to Sentry

#### Production Release

```bash
fastlane android release
```

- Increments version code
- Builds release AAB
- Uploads to Play Store (Production)
- Creates GitHub release
- Uploads ProGuard mappings to Sentry

#### Screenshots

```bash
fastlane android screenshots
```

Generates screenshots using Screengrab.

#### Metadata

```bash
fastlane android metadata
```

Uploads metadata and screenshots to Play Store.

#### Promote to Beta

```bash
fastlane android promote_to_beta
```

Promotes internal release to beta track.

#### Promote to Production

```bash
fastlane android promote_to_production
```

Promotes beta release to production track.

### Shared Lanes

#### Run Tests

```bash
fastlane test
```

#### Run Linter

```bash
fastlane lint
```

#### Type Check

```bash
fastlane typecheck
```

#### Clean

```bash
fastlane clean
```

## CI/CD Integration

### GitHub Actions

Fastlane lanes are integrated with GitHub Actions:

- `build-preview.yml` - Builds on PR
- `build-production.yml` - Builds on tag push
- `eas-submit.yml` - Submits to stores

### Required Secrets

Add these secrets to your GitHub repository:

#### iOS

- `MATCH_PASSWORD` - Match encryption password
- `FASTLANE_USER` - Apple ID
- `FASTLANE_PASSWORD` - App-specific password
- `MATCH_GIT_BASIC_AUTHORIZATION` - Git auth for certificates repo

#### Android

- `ANDROID_KEYSTORE_FILE` (base64 encoded)
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `GOOGLE_PLAY_SERVICE_ACCOUNT` (JSON content)

#### Common

- `EXPO_TOKEN` - Expo access token
- `SENTRY_AUTH_TOKEN` - Sentry auth token
- `SLACK_WEBHOOK_URL` - Slack notifications

## Troubleshooting

### iOS Code Signing Issues

```bash
# Reset certificates
fastlane match nuke development
fastlane match nuke distribution

# Regenerate
fastlane match development
fastlane match appstore
```

### Android Build Failures

```bash
# Clean Android builds
cd android
./gradlew clean

# Verify keystore
keytool -list -v -keystore unioneyes.keystore
```

### Match Issues

```bash
# Update fastlane
sudo gem install fastlane

# Clear derived data
rm -rf ~/Library/Developer/Xcode/DerivedData
```

## Best Practices

1. **Version Management**
   - Fastlane auto-increments build numbers
   - Manually update version numbers for major releases

2. **Testing Before Release**
   - Always test on TestFlight/Internal Testing first
   - Get feedback from beta testers
   - Fix critical bugs before production

3. **Release Notes**
   - Keep release notes updated in `store-assets/`
   - Be clear and concise
   - Highlight new features and fixes

4. **Certificates Management**
   - Keep Match password secure
   - Regularly backup certificates repository
   - Document certificate renewal process

5. **Monitoring**
   - Check Sentry for crashes
   - Monitor analytics for adoption rates
   - Review store ratings and feedback

## Support

For issues:

- Check Fastlane docs: <https://docs.fastlane.tools>
- GitHub discussions: <https://github.com/unioneyes/unioneyes-mobile/discussions>
- Email: <dev@unioneyes.com>
