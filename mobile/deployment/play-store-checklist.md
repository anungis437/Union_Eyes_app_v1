# Play Store Submission Checklist

Complete guide for submitting UnionEyes to the Google Play Store.

## Pre-Submission Requirements

### 1. Developer Account Setup

- [ ] Google Play Developer account ($25 one-time fee)
- [ ] Payment profile completed
- [ ] Identity verification completed (if required)
- [ ] Two-factor authentication enabled

### 2. Play Console Setup

- [ ] App created in Play Console
- [ ] App name selected (up to 50 characters)
- [ ] Package name set (com.unioneyes.app)
- [ ] Default language selected
- [ ] Category selected (Productivity or Business)

### 3. App Signing

- [ ] App signing key generated
- [ ] Upload key created
- [ ] Google Play App Signing enrolled (recommended)
- [ ] Keystore file backed up securely

### 4. Build Preparation

- [ ] Version name updated (e.g., 1.0.0)
- [ ] Version code incremented (integer)
- [ ] App Bundle (AAB) format used (required)
- [ ] All features tested on physical devices
- [ ] No debug code or test credentials
- [ ] ProGuard/R8 optimization completed
- [ ] APK size optimized

## App Information

### Store Listing

#### Main Details

- [ ] App name (50 characters max)
- [ ] Short description (80 characters max)
- [ ] Full description (4000 characters max)
- [ ] App icon (512x512 px PNG)
- [ ] Feature graphic (1024x500 px PNG or JPEG)

#### Graphics

- [ ] Screenshots (2-8 images)
  - Phone: Min 320px, Max 3840px
  - 7" tablet (optional)
  - 10" tablet (optional)
- [ ] Promo video (YouTube URL, optional)

#### Categorization

- [ ] App category selected
- [ ] Tags selected (optional)
- [ ] Content rating questionnaire completed
- [ ] Target age group specified

#### Contact Details

- [ ] Email address
- [ ] Phone number (optional but recommended)
- [ ] Website URL
- [ ] Privacy policy URL (REQUIRED if app handles personal data)

## Privacy & Security

### Privacy Policy

- [ ] Privacy policy URL provided
- [ ] Policy describes data collection
- [ ] Policy describes data usage
- [ ] Policy describes third-party sharing
- [ ] Policy includes data deletion instructions

### Data Safety Section

- [ ] Data collection practices declared
- [ ] Data types collected specified:
  - [ ] Location data
  - [ ] Personal info (name, email, etc.)
  - [ ] Financial info (if applicable)
  - [ ] Photos and videos
  - [ ] Files and docs
  - [ ] Device or other IDs
- [ ] Data sharing practices disclosed
- [ ] Security practices described
- [ ] Data deletion option available

### Permissions

- [ ] All permissions justified
- [ ] Sensitive permissions explained:
  - [ ] Camera
  - [ ] Storage
  - [ ] Location
  - [ ] Biometric
  - [ ] Notifications
- [ ] Dangerous permissions reviewed
- [ ] Runtime permissions implemented

## Content Rating

### IARC Questionnaire

- [ ] Violence level specified
- [ ] Sexual content specified
- [ ] Language/profanity specified
- [ ] Gambling/drug references specified
- [ ] User interaction features declared
- [ ] Data sharing practices declared
- [ ] Age rating received (e.g., Everyone, Teen, Mature)

## App Content

### Government Apps Declaration

- [ ] App is/isn't a government app declared

### Ads Declaration

- [ ] Contains ads: Yes/No
- [ ] Ad provider disclosed
- [ ] Ads follow Google policies

### Additional Information

- [ ] Target audience selected
- [ ] Store presence: Production
- [ ] Countries/regions selected

## Technical Requirements

### App Bundle

- [ ] AAB file under 150MB
- [ ] Supports 64-bit architectures
- [ ] Min SDK version appropriate (API 21+ recommended)
- [ ] Target SDK latest or previous version
- [ ] No outdated libraries
- [ ] All features functional

### Testing

- [ ] Pre-launch report reviewed
- [ ] No crashes in pre-launch testing
- [ ] Tested on multiple device types
- [ ] Tested on different Android versions
- [ ] Tested on tablets (if supported)
- [ ] Deep links tested
- [ ] Push notifications tested
- [ ] In-app purchases tested (if applicable)
- [ ] Offline functionality tested
- [ ] Network error handling tested

### Google Play Policies Compliance

- [ ] No deceptive behavior
- [ ] No malicious code
- [ ] Accurate metadata
- [ ] Appropriate content
- [ ] Proper permission usage
- [ ] No intellectual property violations
- [ ] Data security implemented
- [ ] User privacy respected

## Release Management

### Release Type

- [ ] Release track selected:
  - [ ] Internal testing (up to 100 testers)
  - [ ] Closed testing (selected testers)
  - [ ] Open testing (public beta)
  - [ ] Production (public release)

### Release Details

- [ ] Release name specified
- [ ] Release notes written (500 characters per language)
- [ ] Highlights new features
- [ ] Lists bug fixes
- [ ] Clear and user-friendly

### Rollout Strategy

- [ ] Staged rollout percentage (optional)
  - Start with 5-10%
  - Monitor for crashes/issues
  - Increase gradually
- [ ] Halt rollout option understood
- [ ] Update priority set (if needed)

## Pricing & Distribution

- [ ] Price set (or Free)
- [ ] Available countries selected
- [ ] Distribution channels selected
- [ ] Device categories selected
- [ ] Exclusions specified (if any)

## App Signing & Release

### Using EAS

```bash
cd mobile
eas build --platform android --profile production
eas submit --platform android --latest
```

### Using Fastlane

```bash
cd mobile
fastlane android release
```

### Manual Upload

- [ ] AAB file built
- [ ] Signed with upload key
- [ ] Uploaded to Play Console
- [ ] Release assigned to track
- [ ] ProGuard mapping files uploaded

## Pre-Release Testing

### Internal Testing

- [ ] Uploaded to Internal Testing track
- [ ] Testers added via email
- [ ] App shared with testers
- [ ] Feedback collected
- [ ] Critical bugs fixed

### Closed/Open Testing (Optional)

- [ ] Beta testing track configured
- [ ] Opt-in URL shared
- [ ] Feedback monitored
- [ ] Issues addressed

## Production Release Checklist

- [ ] All metadata completed
- [ ] All graphics uploaded
- [ ] Content rating approved
- [ ] Data safety section completed
- [ ] App signing configured
- [ ] Pre-launch report reviewed
- [ ] Testing completed
- [ ] Release notes finalized
- [ ] Countries/regions confirmed
- [ ] Pricing confirmed

## Submission

- [ ] Reviewed all information
- [ ] Checked all graphics and screenshots
- [ ] Verified privacy information
- [ ] Confirmed pricing and availability
- [ ] Clicked "Send for review"
- [ ] Submission status: "Under review"

## Post-Submission

### Review Process

- [ ] Review typically takes 1-7 days
- [ ] May take longer for first submission
- [ ] Monitor email for status updates
- [ ] Check Play Console daily

### If Approved

- [ ] App status: "Published"
- [ ] App visible in Play Store (within hours)
- [ ] Announce launch
- [ ] Monitor reviews and ratings
- [ ] Respond to user feedback
- [ ] Track statistics in Play Console

### If Rejected

- [ ] Read rejection reason carefully
- [ ] Address all issues mentioned
- [ ] Update app if code changes needed
- [ ] Update metadata if needed
- [ ] Appeal if rejection seems incorrect
- [ ] Resubmit promptly

## Common Rejection Reasons

### Policy Violations

**Restricted Content**

- Inappropriate content for age rating
- Intellectual property violations
- Deceptive behavior

**User Data**

- Inadequate privacy policy
- Improper data handling
- Missing data safety disclosures

**Permissions**

- Requesting unnecessary permissions
- Not explaining permission usage
- Background location without justification

**Quality**

- App crashes or doesn't work
- Incomplete functionality
- Poor user experience

**Monetization**

- Misleading pricing
- In-app purchase issues
- Ad implementation problems

## Monitoring & Optimization

### Post-Launch Tasks

- [ ] Monitor crash reports
- [ ] Track ANRs (App Not Responding)
- [ ] Review user ratings
- [ ] Respond to user reviews
- [ ] Track installation metrics
- [ ] Monitor Play Console vitals
- [ ] Check pre-launch reports for updates

### App Store Optimization (ASO)

- [ ] Monitor keyword rankings
- [ ] A/B test graphics (Google Experiments)
- [ ] Update description based on user feedback
- [ ] Improve screenshots
- [ ] Create promotional campaigns

### Updates

- [ ] Plan regular updates
- [ ] Address user feedback
- [ ] Fix reported bugs
- [ ] Add requested features
- [ ] Maintain compatibility with new Android versions

## Best Practices

1. **Quality First**
   - Test thoroughly before submission
   - Fix all crashes and ANRs
   - Optimize performance

2. **Clear Communication**
   - Write clear, accurate descriptions
   - Use high-quality screenshots
   - Explain features clearly

3. **Follow Policies**
   - Read Google Play policies
   - Follow Material Design guidelines
   - Respect user privacy

4. **Beta Test**
   - Use Internal/Closed testing
   - Get real user feedback
   - Fix issues before production

5. **Be Responsive**
   - Monitor reviews daily
   - Respond to user questions
   - Address issues quickly

6. **Plan Releases**
   - Use staged rollouts
   - Monitor metrics closely
   - Be ready to halt if issues arise

## Resources

- **Play Console**: https://play.google.com/console
- **Developer Policy**: https://play.google.com/about/developer-content-policy/
- **Design Guidelines**: https://material.io/design
- **Android Developers**: https://developer.android.com/distribute
- **Academy**: https://play.google.com/academy

## Support

For internal support:

- Email: dev@unioneyes.com
- Slack: #mobile-deployment

For Google support:

- Developer Support: https://support.google.com/googleplay/android-developer
- Policy Questions: Use Play Console support
