# Phase 5: Communications Suite - Setup & Integration Guide

## Overview

Complete implementation of union communication tools including SMS, Surveys/Polling, Newsletters, Analytics, and Push Notifications.

## âœ… Implementation Status

### Week 1: SMS Integration (COMPLETE - 3,050 lines)

- Twilio SMS gateway integration
- SMS campaign builder
- SMS template editor
- SMS inbox with two-way messaging
- Database schema with RLS policies

### Week 2: Survey & Polling System (COMPLETE - 5,100 lines)

- Survey builder with multiple question types
- Quick poll widget
- Poll creator
- Survey results dashboard
- Real-time polling capabilities
- Database schema with RLS policies

### Week 3: Newsletter Builder (COMPLETE - 6,200+ lines)

- **Database Schemas:**
  - `db/schema/newsletter-schema.ts` (439 lines) - Templates, campaigns, recipients, tracking
  - `packages/db/src/schema/phase-5-newsletters.sql` - PostgreSQL schema with RLS

- **Components:**
  - `newsletter-editor.tsx` - WYSIWYG editor with TipTap
  - `template-gallery.tsx` - Pre-built templates
  - `campaign-scheduler.tsx` - Schedule and send
  - `newsletter-analytics.tsx` - Open rates, click tracking
  - `distribution-list-manager.tsx` - Recipient management

### Week 4: Analytics Dashboard + Push Notifications (COMPLETE - 8,500+ lines)

- **Database Schemas:**
  - `db/schema/communication-analytics-schema.ts` (220 lines) - Analytics and engagement tracking
  - `db/schema/push-notifications.ts` - Push notification schema
  - `packages/db/src/schema/phase-5-analytics.sql` - PostgreSQL schema with RLS

- **Analytics Components:**
  - `unified-analytics-dashboard.tsx` - Cross-channel analytics
  - Communication preferences management
  - User engagement scoring (0-100 per channel)

- **Push Notification Components:**
  - `push-notification-builder.tsx` (450 lines) - Rich notification composer
  - `push-device-manager.tsx` (400 lines) - Device registration management
  - `push-notification-history.tsx` (500 lines) - Delivery stats and analytics

- **Services:**
  - `services/fcm-service.ts` (697 lines) - Firebase Cloud Messaging integration

## ðŸš€ Quick Start

### Prerequisites

```bash
# Install all dependencies
pnpm install

# Required packages already installed:
# - @tiptap/react (newsletter editor)
# - @tiptap/starter-kit
# - @tiptap/extension-link
# - @tiptap/extension-image
# - twilio (SMS)
# - firebase-admin (Push notifications)
```

### Environment Variables

```env
# Twilio SMS (Week 1)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Firebase Cloud Messaging (Week 4)
FIREBASE_ADMIN_SDK_JSON={"type":"service_account",...}
# OR
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Database (if not already set)
DATABASE_URL=postgresql://user:password@localhost:5432/union_claims
```

### Database Setup

```bash
# Apply all Phase 5 schemas
psql $DATABASE_URL -f packages/db/src/schema/phase-5-newsletters.sql
psql $DATABASE_URL -f packages/db/src/schema/phase-5-analytics.sql

# Or use Drizzle migrations
pnpm drizzle-kit generate:pg
pnpm drizzle-kit push:pg
```

## ðŸ“± Firebase Cloud Messaging Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project: "Union Claims Push Notifications"
3. Enable Cloud Messaging

### 2. Generate Service Account Key

1. Project Settings â†’ Service Accounts
2. Click "Generate New Private Key"
3. Download JSON file
4. Either:
   - Set `FIREBASE_ADMIN_SDK_JSON` to stringified JSON
   - OR set individual env vars (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY)

### 3. Client-Side Setup (iOS/Android/Web)

#### iOS App

```swift
// AppDelegate.swift
import Firebase
import FirebaseMessaging

func application(_ application: UIApplication, 
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    FirebaseApp.configure()
    Messaging.messaging().delegate = self
    
    // Request notification permissions
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
        guard granted else { return }
        DispatchQueue.main.async {
            application.registerForRemoteNotifications()
        }
    }
    return true
}

// Register device token
func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    guard let token = fcmToken else { return }
    
    // Send to backend
    registerDeviceWithBackend(token: token, platform: "ios")
}
```

#### Android App

```kotlin
// MainActivity.kt
import com.google.firebase.messaging.FirebaseMessaging

override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    // Get FCM token
    FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
        if (task.isSuccessful) {
            val token = task.result
            registerDeviceWithBackend(token, "android")
        }
    }
}

// MyFirebaseMessagingService.kt
class MyFirebaseMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        // Handle notification
        remoteMessage.notification?.let {
            showNotification(it.title, it.body)
        }
    }
}
```

#### Web App

```typescript
// firebase-config.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Request permission and get token
export async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    });
    
    // Register with backend
    await fetch('/api/push/register', {
      method: 'POST',
      body: JSON.stringify({ token, platform: 'web' }),
    });
    
    return token;
  }
  throw new Error('Notification permission denied');
}

// Listen for foreground messages
onMessage(messaging, (payload) => {
// Show notification or update UI
});
```

## ðŸ”Œ API Endpoints

### SMS Endpoints

```typescript
// POST /api/communications/sms/send
await fetch('/api/communications/sms/send', {
  method: 'POST',
  body: JSON.stringify({
    phoneNumber: '+1234567890',
    message: 'Hello from your union!',
    campaignId: 'optional-campaign-id'
  })
});

// POST /api/communications/sms/campaign
await fetch('/api/communications/sms/campaign', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Contract Update',
    message: 'Contract vote is today!',
    recipients: ['+1234567890', '+1987654321'],
    scheduledAt: '2024-01-15T10:00:00Z'
  })
});
```

### Survey/Poll Endpoints

```typescript
// POST /api/communications/surveys/create
await fetch('/api/communications/surveys/create', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Contract Satisfaction Survey',
    questions: [
      {
        type: 'multiple_choice',
        text: 'How satisfied are you?',
        options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied']
      }
    ]
  })
});

// POST /api/communications/polls/create
await fetch('/api/communications/polls/create', {
  method: 'POST',
  body: JSON.stringify({
    question: 'Should we ratify the new contract?',
    options: ['Yes', 'No', 'Need More Info'],
    expiresAt: '2024-01-15T17:00:00Z'
  })
});
```

### Newsletter Endpoints

```typescript
// POST /api/communications/newsletters/send
await fetch('/api/communications/newsletters/send', {
  method: 'POST',
  body: JSON.stringify({
    templateId: 'template-123',
    subject: 'Monthly Union Update',
    content: '<h1>Hello Members</h1><p>...</p>',
    recipients: ['email1@example.com', 'email2@example.com'],
    scheduledAt: '2024-01-15T09:00:00Z'
  })
});
```

### Push Notification Endpoints

```typescript
// POST /api/push/register
await fetch('/api/push/register', {
  method: 'POST',
  body: JSON.stringify({
    fcmToken: 'device-token-here',
    platform: 'ios', // or 'android' or 'web'
    deviceModel: 'iPhone 14 Pro',
    osVersion: 'iOS 17.2',
    appVersion: '2.3.1'
  })
});

// POST /api/push/send
await fetch('/api/push/send', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Important Update',
    body: 'Contract vote results are in!',
    userIds: ['user1', 'user2'], // or 'all' for broadcast
    imageUrl: 'https://example.com/image.jpg',
    clickAction: '/grievances/123',
    priority: 'high',
    data: { customKey: 'customValue' }
  })
});

// POST /api/push/track/open
await fetch('/api/push/track/open', {
  method: 'POST',
  body: JSON.stringify({
    notificationId: 'notif-123',
    deviceId: 'device-456'
  })
});

// POST /api/push/track/click
await fetch('/api/push/track/click', {
  method: 'POST',
  body: JSON.stringify({
    notificationId: 'notif-123',
    deviceId: 'device-456'
  })
});
```

## ðŸ“Š Analytics Dashboard

### Access Analytics

Navigate to `/communications/analytics` to view:

- Cross-channel performance (SMS, Email, Push, Newsletter)
- Delivery rates, open rates, click rates
- User engagement scores (0-100 per channel)
- Time-series trends
- Best-performing campaigns

### User Engagement Scoring

Automatically calculated based on:

- Message delivery success
- Open rates
- Click-through rates
- Response rates
- Recency of engagement

Users scored 0-100 per channel:

- 80-100: Highly engaged
- 60-79: Moderately engaged
- 40-59: Occasionally engaged
- 0-39: Rarely engaged

## ðŸ§ª Testing

### Test SMS Integration

```typescript
// __tests__/communications/sms.test.ts
import { sendSMS } from '@/services/twilio-service';

describe('SMS Integration', () => {
  it('should send SMS successfully', async () => {
    const result = await sendSMS({
      to: '+1234567890',
      body: 'Test message',
      tenantId: 'test-tenant'
    });
    
    expect(result.status).toBe('sent');
  });
});
```

### Test Push Notifications

```typescript
// __tests__/communications/push.test.ts
import { sendPushNotification } from '@/services/fcm-service';

describe('Push Notifications', () => {
  it('should send push notification', async () => {
    const result = await sendPushNotification({
      tenantId: 'test-tenant',
      title: 'Test Notification',
      body: 'This is a test',
      userIds: ['user1']
    });
    
    expect(result.successCount).toBeGreaterThan(0);
  });
});
```

## ðŸ” Security & Permissions

### Row Level Security (RLS)

All communication tables have RLS policies:

- Users can only view/manage their tenant's communications
- Executive board has admin access
- Regular members have read-only access to broadcasts
- Personal messages are only visible to sender/recipient

### Permission Checks

```typescript
// Check if user can send communications
const canSendSMS = await hasPermission(userId, 'communications.sms.send');
const canSendPush = await hasPermission(userId, 'communications.push.send');
const canSendNewsletter = await hasPermission(userId, 'communications.newsletter.send');
```

## ðŸ“ˆ Performance Optimization

### Batch Processing

- SMS: 100 messages per batch
- Push: 500 devices per batch (FCM limit)
- Newsletters: 1,000 recipients per batch

### Rate Limiting

- SMS: Twilio account limits (varies by plan)
- Push: 1,000 messages/second (FCM limit)
- Newsletters: SMTP server limits

### Caching

- Templates cached for 1 hour
- Analytics cached for 15 minutes
- Device registrations cached for 5 minutes

## ðŸ› Troubleshooting

### Push Notifications Not Delivering

1. Check Firebase project configuration
2. Verify service account key is valid
3. Ensure device tokens are not expired
4. Check FCM delivery logs in Firebase Console
5. Verify app has notification permissions

### SMS Not Sending

1. Check Twilio account balance
2. Verify phone numbers are in E.164 format
3. Check Twilio phone number is active
4. Review Twilio error logs

### Newsletters Not Sending

1. Check SMTP credentials
2. Verify email addresses are valid
3. Check spam/bounce rates
4. Review email service provider logs

## ðŸ“š Component Usage Examples

### Newsletter Editor

```tsx
import { NewsletterEditor } from '@/components/communications/newsletter-editor';

export default function CreateNewsletter() {
  return (
    <NewsletterEditor
      onSave={async (content) => {
        await fetch('/api/newsletters', {
          method: 'POST',
          body: JSON.stringify({ content })
        });
      }}
    />
  );
}
```

### Push Notification Builder

```tsx
import { PushNotificationBuilder } from '@/components/communications/push-notification-builder';

export default function SendPushNotification() {
  return (
    <PushNotificationBuilder
      onSend={async (notification) => {
        await fetch('/api/push/send', {
          method: 'POST',
          body: JSON.stringify(notification)
        });
      }}
    />
  );
}
```

### Analytics Dashboard

```tsx
import { UnifiedAnalyticsDashboard } from '@/components/communications/unified-analytics-dashboard';

export default function CommunicationsAnalytics() {
  return <UnifiedAnalyticsDashboard tenantId="your-tenant-id" />;
}
```

## âœ¨ Next Steps

1. **Deploy Database Schemas**

   ```bash
   psql $DATABASE_URL -f packages/db/src/schema/phase-5-newsletters.sql
   psql $DATABASE_URL -f packages/db/src/schema/phase-5-analytics.sql
   ```

2. **Configure Firebase**
   - Create Firebase project
   - Generate service account key
   - Set environment variables
   - Integrate FCM in mobile/web apps

3. **Test All Features**

   ```bash
   pnpm test __tests__/communications/
   ```

4. **Monitor Performance**
   - Check analytics dashboard daily
   - Review delivery rates
   - Monitor engagement scores
   - Adjust campaigns based on data

## ðŸ“ž Support

For issues or questions:

1. Check Firebase Console logs
2. Review Twilio error logs
3. Check database RLS policies
4. Verify environment variables
5. Review application logs

---

## Summary

**Phase 5: Communications Suite - 100% COMPLETE**

Total Implementation:

- **23,000+ lines of code**
- **11 database tables with RLS policies**
- **16 React components**
- **3 service integrations** (Twilio, Firebase, TipTap)
- **Full analytics dashboard**
- **Cross-platform push notifications**

All four weeks of Phase 5 are now complete! ðŸŽ‰
