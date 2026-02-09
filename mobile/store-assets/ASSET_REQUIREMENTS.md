# Asset Requirements Guide

## App Store (iOS) Assets

### App Icon

- **Size:** 1024x1024 px
- **Format:** PNG (no alpha channel)
- **File:** icon.png
- **Requirements:** Square, no rounded corners, no transparency

### Screenshots (Required)

1. **iPhone 6.7" Display** (1290x2796 px) - 3-10 images
2. **iPhone 6.5" Display** (1242x2688 px) - 3-10 images
3. **iPhone 5.5" Display** (1242x2208 px) - Optional
4. **iPad Pro 12.9" Display** (2048x2732 px) - 3-10 images
5. **iPad Pro 11" Display** (1668x2388 px) - Optional

### App Preview Videos (Optional)

- Up to 3 videos per device size
- 15-30 seconds duration
- MP4 or M4V format
- Portrait orientation recommended

### Additional Assets

- **Promotional Artwork:** 1024x1024 px (for App Store features)

## Play Store (Android) Assets

### App Icon

- **Size:** 512x512 px
- **Format:** PNG (32-bit with alpha)
- **File:** icon.png

### Feature Graphic (Required)

- **Size:** 1024x500 px
- **Format:** PNG or JPEG
- **File:** feature-graphic.png
- **Usage:** Store listing header

### Screenshots (Required)

1. **Phone:** 16:9 or 9:16 ratio
   - Min: 320 px
   - Max: 3840 px
   - 2-8 images required

2. **7" Tablet:** Optional (2-8 images)
3. **10" Tablet:** Optional (2-8 images)

### Promotional Graphics (Optional)

- **Promo Graphic:** 180x120 px
- **TV Banner:** 1280x720 px (for Android TV)

### Video (Optional)

- YouTube video URL
- Showcases app features

## Adaptive Icon (Android)

- **Size:** 512x512 px
- **Format:** PNG with transparency
- **File:** adaptive-icon.png
- **Safe Zone:** 264x264 px center circle

## Splash Screen

- **Size:** 2048x2048 px (iOS) / 1920x1080 px (Android)
- **Format:** PNG
- **File:** splash.png

## Favicon (Web/PWA)

- **Size:** 48x48 px
- **Format:** PNG
- **File:** favicon.png

## Design Guidelines

### App Icon Best Practices

- Simple, memorable design
- No text or tiny details
- Consistent with brand
- Recognizable at small sizes
- Test on different backgrounds

### Screenshot Best Practices

- Showcase key features
- Add descriptive text overlays
- Use consistent style/branding
- Show real app content
- Localize for different markets
- First 2-3 screenshots are most important

### Color Profile

- Use sRGB color space
- Test on light and dark backgrounds

## Asset Organization

```
mobile/assets/
├── icon.png                    # 1024x1024
├── adaptive-icon.png           # 512x512 (Android)
├── splash.png                  # 2048x2048
├── favicon.png                 # 48x48
├── app-store/
│   ├── icon-1024.png
│   ├── screenshots/
│   │   ├── iphone-6.7/
│   │   │   ├── screenshot-1.png
│   │   │   ├── screenshot-2.png
│   │   │   └── ...
│   │   └── ipad-12.9/
│   │       └── ...
│   └── preview-videos/
│       └── ...
└── play-store/
    ├── icon-512.png
    ├── feature-graphic.png
    └── screenshots/
        ├── phone/
        │   ├── screenshot-1.png
        │   └── ...
        └── tablet/
            └── ...
```

## Tools & Resources

### Design Tools

- **Figma:** App icon and screenshot templates
- **Adobe Illustrator:** Vector graphics
- **Sketch:** iOS design
- **Canva:** Quick mockups

### Screenshot Generators

- **App Store Screenshot Generator:** https://www.appscreens.io/
- **Figma Templates:** Community templates
- **Mockuuups:** Device frames

### Testing Tools

- **Preview on Device:** Xcode Simulator, Android Emulator
- **App Store Connect:** Preview before submission
- **Play Console:** See how it looks in store

## Localization

If supporting multiple languages:

- Create separate screenshots for each locale
- Translate text overlays
- Consider cultural differences
- Prioritize major markets first

## Automation

Consider using tools to generate screenshots:

- **Fastlane Snapshot:** iOS screenshot automation
- **Fastlane Screengrab:** Android screenshot automation
- **Expo Screens:** Automated screenshot generation

## Checklist Before Submission

- [ ] All required asset sizes created
- [ ] Icons have no transparency (iOS)
- [ ] Screenshots show actual app content
- [ ] Text is readable on mobile screens
- [ ] Images follow store guidelines
- [ ] Assets tested on different devices
- [ ] Brand guidelines followed
- [ ] Legal disclaimers included if needed
- [ ] All assets optimized for size
- [ ] Backup copies saved
