# UnionEyes Mobile - Quick Start Guide

## Initial Setup

1. **Install Dependencies**

   ```bash
   cd mobile
   pnpm install
   ```

2. **Configure Environment**

   ```bash
   cp .env.example .env
   ```

   Update `.env` with your actual values:
   - Get Clerk publishable key from <https://clerk.com>
   - Set your API URL
   - Configure feature flags

3. **Start Development**

   ```bash
   pnpm start
   ```

## First Time Setup Checklist

- [ ] Install Node.js 18+
- [ ] Install pnpm: `npm install -g pnpm`
- [ ] Install Expo CLI: `npm install -g expo-cli`
- [ ] Install iOS Simulator (Mac only) or Android Studio
- [ ] Clone repository
- [ ] Run `pnpm install`
- [ ] Copy and configure `.env`
- [ ] Start development server

## Development Workflow

### Running the App

**Development Mode:**

```bash
pnpm start
```

**Platform Specific:**

```bash
pnpm ios      # Requires Mac + Xcode
pnpm android  # Requires Android Studio
pnpm web      # Browser preview
```

### Making Changes

1. Edit files in `app/` for screens
2. Edit files in `src/` for logic
3. Hot reload will update automatically
4. Shake device for developer menu

### Common Tasks

**Add a new screen:**

1. Create file in `app/` directory
2. Expo Router automatically creates route
3. Add navigation if needed

**Add a new component:**

1. Create in `src/components/`
2. Export from `src/components/index.ts`
3. Import where needed

**Add an API endpoint:**

1. Add method to `src/services/api.ts`
2. Create hook in `src/hooks/`
3. Use in component with React Query

## Building for Production

### Prerequisites

1. Install EAS CLI:

   ```bash
   npm install -g eas-cli
   ```

2. Login to Expo:

   ```bash
   eas login
   ```

3. Configure project:

   ```bash
   eas build:configure
   ```

### Build Commands

**Development Build:**

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

**Production Build:**

```bash
pnpm build:ios      # iOS
pnpm build:android  # Android
pnpm build:all      # Both platforms
```

### Submission

**iOS App Store:**

```bash
pnpm submit:ios
```

**Google Play Store:**

```bash
pnpm submit:android
```

## Project Structure Guide

```
mobile/
├── app/                      # Screens (Expo Router)
│   ├── _layout.tsx          # Root layout with providers
│   ├── (auth)/              # Auth screens (/sign-in, /sign-up)
│   └── (tabs)/              # Main app tabs
│
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Input.tsx
│   │
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useClaims.ts
│   │   └── useDocuments.ts
│   │
│   ├── services/           # Business logic & APIs
│   │   ├── api.ts          # API client
│   │   ├── storage.ts      # Storage abstraction
│   │   ├── sync.ts         # Offline sync
│   │   └── notifications.ts
│   │
│   ├── store/              # Zustand stores
│   │   ├── authStore.ts
│   │   └── settingsStore.ts
│   │
│   ├── types/              # TypeScript types
│   └── utils/              # Helper functions
│
├── assets/                 # Images, icons, fonts
├── app.json               # Expo configuration
├── eas.json              # EAS Build config
└── package.json          # Dependencies
```

## Key Features Explained

### 🔐 Authentication (Clerk)

- Sign in / Sign up with email
- Biometric authentication
- Automatic session management
- Protected routes

### 📱 Navigation (Expo Router)

- File-based routing
- Typed routes for safety
- Automatic deep linking
- Tab navigation

### 💾 Offline Support

- Queue mutations when offline
- Auto-sync when online
- Cached data access
- Conflict resolution

### 🔔 Push Notifications

- Permission handling
- Local notifications
- Push token management
- Deep link handling

### 📸 Document Capture

- Camera integration
- Document picker
- Image upload
- File management

## Troubleshooting

### App won't start

```bash
pnpm clean
rm -rf node_modules
pnpm install
pnpm start -c
```

### Cache issues

```bash
expo start -c
```

### iOS build issues

```bash
cd ios
pod install
cd ..
```

### Android build issues

```bash
cd android
./gradlew clean
cd ..
```

### Type errors

```bash
pnpm type-check
```

## Best Practices

1. **Always use TypeScript** - Type safety prevents bugs
2. **Use hooks for data** - React Query handles caching
3. **Offline-first** - Queue mutations, sync later
4. **Secure storage** - Use SecureStore for tokens
5. **Error handling** - Always handle API errors
6. **Loading states** - Show feedback to users
7. **Test on device** - Not just simulator

## Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Navigation](https://reactnavigation.org)
- [Clerk Documentation](https://clerk.com/docs)
- [React Query](https://tanstack.com/query)
- [Zustand](https://github.com/pmndrs/zustand)

## Getting Help

- Check the README.md for detailed info
- Review code comments
- Check Expo documentation
- Contact the development team

## Next Steps

After setup:

1. ✅ Customize branding (colors, logo)
2. ✅ Configure Clerk with your keys
3. ✅ Update API endpoints
4. ✅ Test authentication flow
5. ✅ Build and test on device
6. ✅ Submit to app stores

Good luck! 🚀
