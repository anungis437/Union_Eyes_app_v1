# Offline-First Sync Architecture - Quick Start

## ✅ Integration Checklist

Follow these steps to integrate the offline-first sync architecture into your UnionEyes mobile app.

### 1. Prerequisites ✓

Ensure you have these dependencies installed (already in package.json):

- ✅ `react-native-mmkv` - Fast key-value storage
- ✅ `@react-native-async-storage/async-storage` - Complex object storage
- ✅ `@react-native-community/netinfo` - Network state monitoring
- ✅ `@tanstack/react-query` - Data fetching and caching

### 2. Wrap Your App with Provider

In your main `App.tsx` or `_layout.tsx`:

```tsx
import { OfflineSyncProvider } from './src/setup/OfflineSyncSetup';

export default function App() {
  return <OfflineSyncProvider>{/* Your app components */}</OfflineSyncProvider>;
}
```

### 3. Replace Standard Data Fetching

**Before:**

```tsx
const { data, isLoading } = useQuery(['claims'], () => api.getClaims());
```

**After:**

```tsx
import { useOfflineQuery } from './hooks/useOfflineQuery';

const { data, isLoading, isOffline } = useOfflineQuery(['claims'], {
  entity: 'claims',
  fetchFn: () => api.getClaims(),
  cacheFirst: true,
  syncOnMount: true,
});
```

### 4. Replace Standard Mutations

**Before:**

```tsx
const mutation = useMutation((data) => api.createClaim(data));
```

**After:**

```tsx
import { useOfflineMutation } from './hooks/useOfflineQuery';
import { OperationPriority } from './services/offline-queue';

const mutation = useOfflineMutation({
  entity: 'claims',
  mutationFn: (data) => api.createClaim(data),
  priority: OperationPriority.HIGH,
  optimisticUpdate: (variables) => ({
    id: `temp_${Date.now()}`,
    ...variables,
    status: 'pending',
  }),
});
```

### 5. Add Status Indicators

Show users when they're offline and when data is syncing. The `OfflineSyncProvider` includes a status bar, but you can add more:

```tsx
import { useSyncStatus, useOfflineQueue } from './hooks/useOfflineQuery';

function MyComponent() {
  const { isOnline, isSyncing } = useSyncStatus();
  const { hasPending, stats } = useOfflineQueue();

  return (
    <View>
      {!isOnline && <Text>🔴 Offline Mode</Text>}
      {isSyncing && <Text>🔄 Syncing...</Text>}
      {hasPending && <Text>⚠️ {stats.pending} pending</Text>}
    </View>
  );
}
```

### 6. Handle Conflicts (Optional)

Add a conflicts screen or modal:

```tsx
import { useConflicts } from './hooks/useOfflineQuery';
import { conflictResolver } from './services/conflict-resolver';

function ConflictsScreen() {
  const { conflicts, hasConflicts } = useConflicts();

  if (!hasConflicts) {
    return <Text>No conflicts</Text>;
  }

  return (
    <FlatList
      data={conflicts}
      renderItem={({ item }) => (
        <ConflictItem
          conflict={item}
          onResolve={(resolution) => conflictResolver.resolveManually(item.id, resolution)}
        />
      )}
    />
  );
}
```

### 7. Test Offline Scenarios

**Enable Offline Testing:**

1. **Airplane Mode**: Test your app with airplane mode on
2. **Network Link Conditioner** (iOS): Simulate poor connections
3. **Chrome DevTools** (for testing web): Throttle network
4. **React Native Debugger**: Monitor network requests

**Key Scenarios to Test:**

- ✅ Create data while offline
- ✅ Update data while offline
- ✅ Delete data while offline
- ✅ Switch to offline mid-operation
- ✅ Come back online and verify sync
- ✅ Force quit app and restart (persistence)
- ✅ Create conflicts (edit same item on two devices)

### 8. Configure Sync Strategies (Optional)

Customize sync behavior per entity:

```tsx
import { getSyncEngine } from './services/sync-engine';
import { ConflictResolutionStrategy } from './services/conflict-resolver';
import { OperationPriority } from './services/offline-queue';

const syncEngine = getSyncEngine();

syncEngine.registerStrategy({
  entity: 'important_documents',
  endpoint: '/documents',
  lastSyncKey: 'documents_last_sync',
  priority: OperationPriority.HIGH,
  conflictStrategy: ConflictResolutionStrategy.MANUAL, // Force manual review
  pullPageSize: 20,
  shouldPull: async () => {
    // Only pull on WiFi for large documents
    return networkStatus.isOnWiFi();
  },
  shouldPush: async () => true,
});
```

### 9. Add Settings Screen (Optional)

Give users control:

```tsx
function SettingsScreen() {
  return (
    <View>
      <Switch value={wifiOnlySync} onValueChange={setWifiOnlySync} label="Sync only on WiFi" />
      <Button title="Force Sync Now" onPress={() => getSyncEngine().forceSyncNow()} />
      <Button
        title="Clear Local Cache"
        onPress={async () => {
          await localDB.clearAll();
          Alert.alert('Cache cleared');
        }}
      />
    </View>
  );
}
```

### 10. Monitor and Debug

Add logging for production:

```tsx
import { offlineQueue } from './services/offline-queue';
import { getSyncEngine } from './services/sync-engine';

// Log queue events
offlineQueue.addListener((operation, event) => {
  console.log(`Queue: ${event} - ${operation.entity}:${operation.type}`);

  // Send to analytics
  analytics.track('offline_queue_event', {
    entity: operation.entity,
    type: operation.type,
    event,
  });
});

// Log sync events
getSyncEngine().addListener((status, event) => {
  console.log(`Sync: ${event} - ${status.entity}`);

  // Send to analytics
  analytics.track('sync_event', {
    entity: status.entity,
    event,
    isSyncing: status.issyncing,
  });
});
```

## 🎯 Common Integration Patterns

### Pattern 1: List Screen with Pull-to-Refresh

```tsx
function ClaimsListScreen() {
  const { data, isLoading, isOffline, refetch } = useOfflineQuery(['claims'], {
    entity: 'claims',
    fetchFn: () => api.getClaims(),
    syncOnMount: true,
  });

  return (
    <FlatList
      data={data}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} enabled={!isOffline} />
      }
      ListHeaderComponent={isOffline ? <OfflineBanner /> : null}
      renderItem={({ item }) => <ClaimItem claim={item} />}
    />
  );
}
```

### Pattern 2: Form with Offline Support

```tsx
function ClaimFormScreen() {
  const mutation = useOfflineMutation({
    entity: 'claims',
    mutationFn: (claim) => api.createClaim(claim),
    priority: OperationPriority.HIGH,
  });

  const handleSubmit = async (formData) => {
    try {
      await mutation.mutateAsync(formData);

      if (mutation.isOffline) {
        Alert.alert('Queued', 'You are offline. Your claim will be submitted when you reconnect.');
      } else {
        Alert.alert('Success', 'Claim submitted!');
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <Form
      onSubmit={handleSubmit}
      disabled={mutation.isLoading}
      showOfflineIndicator={mutation.isOffline}
    />
  );
}
```

### Pattern 3: Detail Screen with Optimistic Updates

```tsx
function ClaimDetailScreen({ route }) {
  const { id } = route.params;

  const { data: claim } = useOfflineQuery(['claim', id], {
    entity: 'claims',
    fetchFn: () => api.getClaim(id),
  });

  const updateMutation = useOfflineMutation({
    entity: 'claims',
    mutationFn: (updates) => api.updateClaim(id, updates),
    optimisticUpdate: (variables) => ({
      ...claim,
      ...variables,
    }),
  });

  const handleApprove = () => {
    updateMutation.mutate({ status: 'approved' });
  };

  return (
    <View>
      <ClaimDetails claim={claim} />
      <Button title="Approve" onPress={handleApprove} />
    </View>
  );
}
```

## 🔍 Verification Steps

After integration, verify these work:

1. ✅ App loads offline with cached data
2. ✅ Changes persist when offline
3. ✅ Sync happens automatically when online
4. ✅ Status indicators show correct state
5. ✅ Pull-to-refresh works online
6. ✅ Optimistic updates feel instant
7. ✅ Conflicts are detected and resolved
8. ✅ Queue processes on reconnection
9. ✅ No data loss on force quit
10. ✅ Performance is smooth (no lag)

## 📊 Success Metrics

Track these to measure success:

- **Offline Usage**: % of operations performed offline
- **Sync Success Rate**: % of operations that sync successfully
- **Conflict Rate**: % of operations that conflict
- **Perceived Performance**: Time to first interaction
- **Data Persistence**: % of data available offline
- **User Satisfaction**: NPS score improvement

## 🆘 Troubleshooting

**Problem: Changes not syncing**

```tsx
// Check queue status
const stats = offlineQueue.getStats();
console.log('Pending:', stats.pending);
console.log('Failed:', stats.failed);

// Force process
await offlineQueue.processQueue();
```

**Problem: Too many conflicts**

```tsx
// Switch to server-wins for less critical data
syncEngine.registerStrategy({
  entity: 'notifications',
  conflictStrategy: ConflictResolutionStrategy.SERVER_WINS,
  // ...
});
```

**Problem: App feels slow**

```tsx
// Reduce sync frequency
createSyncEngine({
  syncInterval: 10 * 60 * 1000, // 10 minutes instead of 5
  batchSize: 100, // Larger batches
});
```

## ✨ Pro Tips

1. **Start Simple**: Begin with one entity, then expand
2. **Test Offline First**: Build offline UX before online
3. **Show State**: Always show users what's happening
4. **Handle Errors**: Gracefully handle all error cases
5. **Monitor Performance**: Track metrics from day one
6. **User Education**: Teach users about offline mode
7. **Gradual Rollout**: A/B test with small percentage first

## 📚 Additional Resources

- [Full Documentation](./OFFLINE_SYNC_README.md)
- [API Reference](./OFFLINE_SYNC_README.md#-api-reference)
- [Example Code](./src/setup/OfflineSyncSetup.tsx)
- [Test Suite](./src/services/__tests__/)

---

**Questions?** Check the troubleshooting section or review the test files for examples.

**Ready to ship!** 🚀
