# App Store Submission Checklist

Complete guide for submitting UnionEyes to the Apple App Store.

## Pre-Submission Requirements

### 1. Developer Account Setup

- [ ] Active Apple Developer account ($99/year)
- [ ] Agreed to latest Apple Developer Program License Agreement
- [ ] Completed tax and banking information
- [ ] Two-factor authentication enabled

### 2. App Store Connect Setup

- [ ] App created in App Store Connect
- [ ] Bundle ID registered (com.unioneyes.app)
- [ ] App name reserved
- [ ] Primary category selected (Productivity or Business)
- [ ] Secondary category selected (optional)
- [ ] Age rating completed

### 3. Certificates & Provisioning

- [ ] Distribution certificate created
- [ ] App Store provisioning profile created
- [ ] Push notification certificates (if applicable)
- [ ] Associated domains configuration
- [ ] App Groups (if using)

### 4. Build Preparation

- [ ] Version number updated (e.g., 1.0.0)
- [ ] Build number incremented
- [ ] All features tested on physical devices
- [ ] No debug code or test accounts in build
- [ ] Performance optimization completed
- [ ] Memory leaks tested and fixed
- [ ] Battery usage optimized

## App Information

### Required Metadata

- [ ] App name (30 characters max)
- [ ] Subtitle (30 characters max)
- [ ] Description (4000 characters max)
- [ ] Keywords (100 characters max, comma-separated)
- [ ] Promotional text (170 characters, can be updated without review)
- [ ] Support URL
- [ ] Marketing URL (optional)
- [ ] Privacy Policy URL (REQUIRED)

### What's New

- [ ] Release notes written (4000 characters max)
- [ ] Highlights key features and bug fixes
- [ ] Clear and user-friendly language

## Visual Assets

### App Icon

- [ ] 1024x1024 px PNG (no alpha channel)
- [ ] No rounded corners
- [ ] Follows Apple's design guidelines

### Screenshots (REQUIRED)

- [ ] iPhone 6.7" Display (1290x2796 px) - 3-10 images
- [ ] iPhone 6.5" Display (1242x2688 px) - 3-10 images
- [ ] iPad Pro 12.9" Display (2048x2732 px) - 3-10 images (if supporting iPad)

### App Preview Videos (Optional but Recommended)

- [ ] Portrait orientation
- [ ] 15-30 seconds duration
- [ ] Shows actual app functionality
- [ ] No third-party app references

## App Review Information

### Contact Information

- [ ] First name and last name
- [ ] Phone number (reachable 24/7)
- [ ] Email address (monitored 24/7)

### Demo Account (REQUIRED for apps requiring login)

- [ ] Username provided
- [ ] Password provided
- [ ] Account is active and won't expire
- [ ] Instructions for reviewer if needed

### Notes for Reviewer

- [ ] Special instructions if app requires setup
- [ ] Explanation of non-obvious features
- [ ] Testing credentials for backend services
- [ ] Information about hardware requirements

## App Privacy

### Privacy Policy

- [ ] Privacy policy URL provided
- [ ] Privacy policy is accessible
- [ ] Policy describes data collection
- [ ] Policy describes data usage
- [ ] Policy describes third-party sharing

### Privacy Nutrition Labels

- [ ] Data collection practices declared
- [ ] Contact info collection specified
- [ ] Financial info (if applicable)
- [ ] Health data (if applicable)
- [ ] Location data (if applicable)
- [ ] User content collection
- [ ] Tracking data specified
- [ ] Third-party data collection disclosed

## Compliance

### Age Rating

- [ ] Questionnaire completed honestly
- [ ] Appropriate age rating received
- [ ] Content matches age rating

### Export Compliance

- [ ] Encryption usage declared
- [ ] CCATS required? (if using strong encryption)
- [ ] Export compliance documentation

### Content Rights

- [ ] You own all content rights
- [ ] Proper licenses for third-party content
- [ ] Music/sound effects licensed
- [ ] Font licenses verified

## Technical Requirements

### App Capabilities

- [ ] Info.plist permission descriptions complete:
  - [ ] Camera usage description
  - [ ] Photo library usage description
  - [ ] Face ID usage description
  - [ ] Microphone usage description
  - [ ] Location usage description
  - [ ] Calendar usage description
  - [ ] Contacts usage description
- [ ] Background modes configured (if needed)
- [ ] Associated domains configured (if using)

### Testing

- [ ] App runs on latest iOS version
- [ ] App runs on previous iOS version
- [ ] Tested on multiple device sizes
- [ ] Tested on iPad (if supporting)
- [ ] All features work without crashes
- [ ] In-app purchases tested (if applicable)
- [ ] Push notifications tested
- [ ] Deep links tested
- [ ] Offline functionality tested
- [ ] Network error handling tested

### App Store Guidelines Compliance

- [ ] No crashes or bugs
- [ ] Complete and functional app
- [ ] Accurate metadata
- [ ] Appropriate content
- [ ] No private APIs used
- [ ] No placeholder content
- [ ] Works as described
- [ ] Follows Human Interface Guidelines

## Pricing and Availability

- [ ] Price tier selected (or Free)
- [ ] Availability territories selected
- [ ] Release date set
- [ ] Educational discount (if applicable)

## Build Upload

### Using EAS

```bash
cd mobile
eas build --platform ios --profile production
eas submit --platform ios --latest
```

### Using Fastlane

```bash
cd mobile
fastlane ios release
```

### Using Xcode

- [ ] Archive created
- [ ] Archive validated
- [ ] Archive uploaded to App Store Connect
- [ ] Upload successful notification received

## Pre-Submission Validation

- [ ] Build appears in App Store Connect
- [ ] Build processed successfully (wait 15-60 minutes)
- [ ] TestFlight beta testing completed
- [ ] No crashes reported in TestFlight
- [ ] Beta tester feedback addressed
- [ ] All required information filled

## Submission

- [ ] Selected build for submission
- [ ] Reviewed all metadata
- [ ] Reviewed all screenshots
- [ ] Checked privacy information
- [ ] Verified pricing
- [ ] Submitted for review

## Post-Submission

### Review Process

- [ ] Submission status changed to "Waiting for Review"
- [ ] Review typically takes 1-3 days
- [ ] Monitor email for status updates
- [ ] Be ready to respond to rejection quickly

### If Approved

- [ ] App status: "Pending Developer Release" or "Ready for Sale"
- [ ] Release manually or automatically (based on settings)
- [ ] Announce launch
- [ ] Monitor reviews and ratings
- [ ] Respond to user feedback

### If Rejected

- [ ] Read rejection reason carefully
- [ ] Address all issues mentioned
- [ ] Update build if code changes needed
- [ ] Update metadata if needed
- [ ] Respond in Resolution Center
- [ ] Resubmit quickly

## Common Rejection Reasons

### Guideline 2.1 - App Completeness

- Incomplete features or placeholder content
- Crashes during review
- Features not working as described

### Guideline 2.3 - Accurate Metadata

- Screenshots don't match actual app
- Description is misleading
- App name is too generic or misleading

### Guideline 4.2 - Minimum Functionality

- App is too simple
- Not useful, unique, or engaging

### Guideline 5.1 - Privacy

- Missing privacy policy
- Collects data without permission
- Privacy labels incomplete or inaccurate

## Tips for Success

1. **Test Thoroughly**
   - Test on actual devices, not just simulator
   - Test all user flows
   - Test edge cases and error scenarios

2. **Clear Communication**
   - Write clear, accurate descriptions
   - Provide helpful screenshots
   - Give detailed reviewer notes

3. **Follow Guidelines**
   - Read App Store Review Guidelines
   - Follow Human Interface Guidelines
   - Check for common rejection reasons

4. **Beta Test First**
   - Use TestFlight for beta testing
   - Get feedback from real users
   - Fix bugs before submission

5. **Be Responsive**
   - Monitor email during review
   - Respond quickly to questions
   - Be polite and professional

6. **Plan Ahead**
   - Start submission process early
   - Account for review time (1-3 days typical)
   - Have marketing materials ready

## Resources

- **App Store Connect**: <https://appstoreconnect.apple.com>
- **Review Guidelines**: <https://developer.apple.com/app-store/review/guidelines/>
- **Human Interface Guidelines**: <https://developer.apple.com/design/human-interface-guidelines/>
- **App Store Resources**: <https://developer.apple.com/app-store/>
- **TestFlight**: <https://developer.apple.com/testflight/>

## Support

For internal support:

- Email: <dev@unioneyes.com>
- Slack: #mobile-deployment

For Apple support:

- Developer Support: <https://developer.apple.com/support/>
- Contact Apple: <https://developer.apple.com/contact/>
