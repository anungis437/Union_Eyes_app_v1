/**
 * Offline-First Sync Architecture Setup Example
 *
 * This file demonstrates how to integrate the offline-first sync architecture
 * into your React Native app. Copy and adapt this code to your app's entry point.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createSyncEngine, getSyncEngine, SyncStatus } from '../services/sync-engine';
import { networkStatus, NetworkStatus as NetStatus } from '../services/network-status';
import { offlineQueue } from '../services/offline-queue';
import { conflictResolver } from '../services/conflict-resolver';
import { localDB } from '../services/local-db';
import { ConflictResolutionStrategy } from '../services/conflict-resolver';

// ==================== Setup React Query ====================

/**
 * Configure React Query with offline-friendly defaults
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      gcTime: 24 * 60 * 60 * 1000, // 24 hours (formerly cacheTime)
      retry: 3,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 3,
    },
  },
});

// ==================== Initialize Sync Engine ====================

/**
 * Initialize the sync engine with your configuration
 */
function initializeSyncEngine() {
  const syncEngine = createSyncEngine({
    apiBaseUrl: process.env.API_URL || 'https://api.unioneyes.com',
    syncInterval: 5 * 60 * 1000, // 5 minutes
    batchSize: 50,
    wifiOnlyForLargeSync: true,
    enableBackgroundSync: true,
    conflictStrategy: ConflictResolutionStrategy.LAST_WRITE_WINS,
  });

  // Register custom entity strategies if needed
  syncEngine.registerStrategy({
    entity: 'customEntity',
    endpoint: '/custom',
    lastSyncKey: 'custom_last_sync',
    priority: 'medium' as any,
    conflictStrategy: ConflictResolutionStrategy.SERVER_WINS,
    pullPageSize: 50,
  });

  return syncEngine;
}

// ==================== App Provider Component ====================

/**
 * Wrapper component that provides offline-first functionality
 */
export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [networkState, setNetworkState] = useState<NetStatus | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    // Initialize all services
    const init = async () => {
      try {
        // Initialize sync engine
        const engine = initializeSyncEngine();

        // Get initial network status
        const status = await networkStatus.getStatus();
        setNetworkState(status);

        // Listen to network changes
        const unsubscribeNetwork = networkStatus.addChangeListener((status: NetStatus) => {
          setNetworkState(status);
        });

        // Listen to sync status
        const unsubscribeSync = engine.addListener((status: SyncStatus) => {
          setSyncStatus(status);
        });

        // Listen to offline queue events
        const unsubscribeQueue = offlineQueue.addListener((operation: any, event: any) => {
          if (event === 'failed') {
            Alert.alert(
              'Sync Failed',
              `Failed to sync ${operation.entity}. Will retry automatically.`
            );
          }
        });

        // Listen to conflicts
        const unsubscribeConflicts = conflictResolver.addListener((conflict) => {
          if (conflict.strategy === ConflictResolutionStrategy.MANUAL) {
            Alert.alert(
              'Data Conflict',
              `A conflict was detected in ${conflict.entity}. Please resolve manually.`,
              [
                {
                  text: 'View Conflicts',
                  onPress: () => {
                    // Navigate to conflicts screen
                    // navigation.navigate('Conflicts');
                  },
                },
                { text: 'Later', style: 'cancel' },
              ]
            );
          }
        });

        setIsInitialized(true);

        // Trigger initial sync if online
        if (status.isConnected && status.isInternetReachable) {
          engine.syncAll();
        }

        // Cleanup
        return () => {
          unsubscribeNetwork();
          unsubscribeSync();
          unsubscribeQueue();
          unsubscribeConflicts();
        };
      } catch {
        Alert.alert('Error', 'Failed to initialize app. Please restart.');
      }
    };

    init();
  }, []);

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <Text>Initializing...</Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ConnectionStatusBar networkState={networkState} syncStatus={syncStatus} />
    </QueryClientProvider>
  );
}

// ==================== Connection Status Bar ====================

/**
 * Status bar showing network and sync status
 */
function ConnectionStatusBar({
  networkState,
  syncStatus,
}: {
  networkState: NetStatus | null;
  syncStatus: SyncStatus | null;
}) {
  const [queueStats, setQueueStats] = useState(offlineQueue.getStats());

  useEffect(() => {
    const unsubscribe = offlineQueue.addListener(() => {
      setQueueStats(offlineQueue.getStats());
    });
    return unsubscribe;
  }, []);

  const isOffline = !networkState?.isConnected;
  const isSyncing = syncStatus?.issyncing;
  const hasPending = queueStats.pending > 0;

  if (!isOffline && !isSyncing && !hasPending) {
    return null; // All good, hide status bar
  }

  return (
    <View style={[styles.statusBar, isOffline && styles.offlineBar]}>
      {isOffline && (
        <Text style={styles.statusText}>🔴 Offline - Changes will sync when online</Text>
      )}

      {!isOffline && isSyncing && (
        <Text style={styles.statusText}>
          🔄 Syncing... {syncStatus?.progress ? `${syncStatus.progress}%` : ''}
        </Text>
      )}

      {!isOffline && hasPending && !isSyncing && (
        <TouchableOpacity
          onPress={() => {
            offlineQueue.processQueue();
          }}
        >
          <Text style={styles.statusText}>
            ⚠️ {queueStats.pending} pending operations - Tap to sync
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ==================== Example Usage in Screens ====================

/**
 * Example: Claims List Screen with offline support
 */
/*
import { useOfflineQuery } from '../hooks/useOfflineQuery';

export function ClaimsListScreen() {
  const { 
    data: claims, 
    isLoading, 
    isOffline, 
    error 
  } = useOfflineQuery(
    ['claims'],
    {
      entity: 'claims',
      fetchFn: () => apiService.getClaims(),
      cacheFirst: true,
      syncOnMount: true,
      offlineData: [],
    }
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <View>
      {isOffline && <OfflineBanner />}
      <FlatList
        data={claims}
        renderItem={({ item }) => <ClaimItem claim={item} />}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}
*/

/**
 * Example: Create Claim Form with offline support
 */
/*
import { useOfflineMutation } from '../hooks/useOfflineQuery';
import { OperationPriority } from '../services/offline-queue';

export function CreateClaimScreen() {
  const mutation = useOfflineMutation({
    entity: 'claims',
    mutationFn: (claim) => apiService.createClaim(claim),
    priority: OperationPriority.HIGH,
    optimisticUpdate: (variables) => ({
      id: `temp_${Date.now()}`,
      ...variables,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }),
    onSuccess: () => {
      Alert.alert('Success', 'Claim submitted!');
      navigation.goBack();
    },
    onError: (error) => {
      if (error.message.includes('offline')) {
        Alert.alert(
          'Queued',
          'You are offline. Claim will be submitted when online.'
        );
        navigation.goBack();
      } else {
        Alert.alert('Error', error.message);
      }
    },
  });

  const handleSubmit = async (formData) => {
    try {
      await mutation.mutateAsync(formData);
    } catch (error) {
      // Error already handled by onError
    }
  };

  return (
    <ClaimForm 
      onSubmit={handleSubmit}
      isSubmitting={mutation.isLoading}
      isOffline={mutation.isOffline}
    />
  );
}
*/

/**
 * Example: Sync Settings Screen
 */
/*
import { getSyncEngine } from '../services/sync-engine';
import { offlineQueue } from '../services/offline-queue';
import { localDB } from '../services/local-db';

export function SyncSettingsScreen() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const engine = getSyncEngine();
    const syncStats = engine.getStats();
    const queueStats = offlineQueue.getStats();
    const dbStats = await localDB.getStats();

    setStats({ syncStats, queueStats, dbStats });
  };

  const handleForceSync = async () => {
    try {
      const engine = getSyncEngine();
      await engine.forceSyncNow();
      Alert.alert('Success', 'Sync completed');
      loadStats();
    } catch (error) {
      Alert.alert('Error', 'Sync failed');
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure? This will delete all local data.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await localDB.clearAll();
            offlineQueue.clear();
            Alert.alert('Success', 'Cache cleared');
            loadStats();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Sync Statistics</Text>
      
      <View style={styles.section}>
        <Text>Pending Operations: {stats?.queueStats.pending}</Text>
        <Text>Failed Operations: {stats?.queueStats.failed}</Text>
        <Text>Local Entities: {stats?.dbStats.totalSize}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleForceSync}>
        <Text style={styles.buttonText}>Force Sync Now</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.dangerButton]} 
        onPress={handleClearCache}
      >
        <Text style={styles.buttonText}>Clear Local Cache</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
*/

// ==================== Styles ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    padding: 12,
    alignItems: 'center',
  },
  offlineBar: {
    backgroundColor: '#FF5722',
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#FF5722',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

// ==================== Export ====================

export default OfflineSyncProvider;

