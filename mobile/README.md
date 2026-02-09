# UnionEyes Mobile App

Production-ready React Native mobile application for UnionEyes, built with Expo.

## Features

- 🔐 **Authentication**: Clerk-based authentication with biometric support
- 📱 **Expo Router**: File-based routing with typed routes
- 🎨 **Modern UI**: Clean, accessible interface with React Navigation
- 💾 **Offline Support**: Full offline capabilities with automatic sync
- 📸 **Document Capture**: Camera integration for scanning documents
- 🔔 **Push Notifications**: Real-time notifications with Expo Notifications
- 🔒 **Secure Storage**: Encrypted storage for sensitive data
- ⚡ **Fast Storage**: MMKV for high-performance local storage
- 🌐 **API Integration**: React Query for efficient data fetching
- 🏪 **State Management**: Zustand for global state

## Tech Stack

- **Framework**: Expo SDK 51
- **Language**: TypeScript
- **Navigation**: Expo Router + React Navigation
- **Authentication**: Clerk
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **Storage**: AsyncStorage, SecureStore, MMKV
- **UI Components**: React Native + Expo Vector Icons
- **Camera**: Expo Camera
- **Notifications**: Expo Notifications

## Project Structure

```
mobile/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   │   ├── sign-in.tsx
│   │   ├── sign-up.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/            # Main app tabs
│   │   ├── index.tsx      # Home
│   │   ├── claims.tsx
│   │   ├── documents.tsx
│   │   ├── notifications.tsx
│   │   └── profile.tsx
│   └── _layout.tsx        # Root layout
├── src/
│   ├── components/        # Reusable components
│   ├── hooks/            # Custom hooks
│   ├── services/         # API & services
│   │   ├── api.ts
│   │   ├── storage.ts
│   │   ├── sync.ts
│   │   └── notifications.ts
│   ├── store/            # Zustand stores
│   │   ├── authStore.ts
│   │   └── settingsStore.ts
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── assets/               # Images, icons, fonts
├── app.json             # Expo configuration
├── eas.json             # EAS Build configuration
├── package.json         # Dependencies
└── tsconfig.json        # TypeScript config
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

1. Navigate to the mobile directory:

```bash
cd mobile
```

1. Install dependencies:

```bash
pnpm install
```

1. Copy environment variables:

```bash
cp .env.example .env
```

1. Configure your environment variables in `.env`:

```bash
API_URL=https://your-api-url.com
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
```

### Development

Start the development server:

```bash
pnpm start
```

Run on specific platforms:

```bash
# iOS
pnpm ios

# Android
pnpm android

# Web
pnpm web
```

## Building for Production

### Using EAS Build

1. Install EAS CLI:

```bash
npm install -g eas-cli
```

1. Login to Expo:

```bash
eas login
```

1. Configure your project:

```bash
eas build:configure
```

1. Build for production:

```bash
# iOS
pnpm build:ios

# Android
pnpm build:android

# Both
pnpm build:all
```

### Submit to App Stores

```bash
# iOS App Store
pnpm submit:ios

# Google Play Store
pnpm submit:android
```

## Key Components

### Authentication Flow

The app uses Clerk for authentication with automatic route protection:

- Unauthenticated users → Sign in screen
- Authenticated users → Main app tabs

### Offline Sync

The app includes a robust offline sync system:

1. All mutations are queued when offline
2. Automatic sync when connection is restored
3. Conflict resolution for data integrity

### Storage Layers

1. **SecureStore**: Sensitive data (auth tokens)
2. **AsyncStorage**: Large datasets (cached claims, documents)
3. **MMKV**: Fast key-value storage (settings, flags)

### Push Notifications

Fully configured push notification system:

- Permission handling
- Token management
- Deep linking support
- Background notification handling

## Available Scripts

- `pnpm start` - Start Expo development server
- `pnpm ios` - Run on iOS simulator
- `pnpm android` - Run on Android emulator
- `pnpm web` - Run in web browser
- `pnpm build:ios` - Build iOS app with EAS
- `pnpm build:android` - Build Android app with EAS
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript compiler check
- `pnpm test` - Run tests
- `pnpm clean` - Clean build artifacts

## Environment Variables

Required environment variables:

```bash
# API Configuration
API_URL=https://api.unioneyes.com
API_TIMEOUT=30000

# Clerk Authentication
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx

# App Configuration
APP_ENV=development
ENABLE_BIOMETRIC_AUTH=true
ENABLE_OFFLINE_MODE=true
ENABLE_PUSH_NOTIFICATIONS=true
```

## Testing

Run tests:

```bash
pnpm test
```

Run tests in watch mode:

```bash
pnpm test --watch
```

## Code Quality

The project includes:

- ESLint for code linting
- TypeScript for type safety
- Prettier for code formatting

Run linting:

```bash
pnpm lint
```

## Troubleshooting

### Clear Cache

If you encounter issues, try clearing the cache:

```bash
pnpm clean
```

### Reset Expo

```bash
expo start -c
```

### iOS Pod Issues

```bash
cd ios && pod install && cd ..
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linting and type checking
4. Submit a pull request

## License

Proprietary - UnionEyes 2024

## Support

For support, contact the development team or file an issue in the repository.
