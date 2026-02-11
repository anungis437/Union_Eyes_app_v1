import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryKey,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { localDB } from '../services/local-db';
import { networkStatus } from '../services/network-status';
import { offlineQueue, OperationPriority, OperationType } from '../services/offline-queue';
import { getSyncEngine } from '../services/sync-engine';

export interface OfflineQueryOptions<TData, TError = Error>
  extends Omit<UseQueryOptions<TData, TError>, 'queryFn'> {
  entity: string;
  fetchFn: () => Promise<TData>;
  cacheFirst?: boolean; // Always return cached data first, then fetch in background
  offlineData?: TData; // Fallback data when offline
  syncOnMount?: boolean; // Trigger entity sync when component mounts
}

export interface OfflineMutationOptions<TData, TVariables, TError = Error>
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  entity: string;
  mutationFn: (variables: TVariables) => Promise<TData>;
  optimisticUpdate?: (variables: TVariables) => any;
  priority?: OperationPriority;
  updateCache?: (oldData: any, newData: TData, variables: TVariables) => any;
}

/**
 * Enhanced useQuery hook with offline support
 */
export function useOfflineQuery<TData = unknown, TError = Error>(
  queryKey: QueryKey,
  options: OfflineQueryOptions<TData, TError>
) {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(networkStatus.isOnline());
  const {
    entity,
    fetchFn,
    cacheFirst = true,
    offlineData,
    syncOnMount = false,
    queryKey: omittedQueryKey, // Extract to avoid duplicate with parameter
    ...restQueryOptions
  } = options;

  // Monitor network status
  useEffect(() => {
    const unsubscribe = networkStatus.addConnectionListener((connected) => {
      setIsOnline(connected);

      // Refetch when coming back online
      if (connected) {
        queryClient.invalidateQueries({ queryKey });
      }
    });

    return unsubscribe;
  }, [queryKey, queryClient]);

  // Sync entity on mount if requested
  useEffect(() => {
    if (syncOnMount && networkStatus.isOnline()) {
      try {
        const syncEngine = getSyncEngine();
        syncEngine.sync(entity, 'pull').catch((error) => {
        });
      } catch (error) {
        // SyncEngine not initialized, skip
      }
    }
  }, [entity, syncOnMount]);

  const query = useQuery<TData, TError>({
    queryKey,
    queryFn: async () => {
      // Check if online
      const online = networkStatus.isOnline();

      if (!online) {
        // Try to get from local database
        const localData = await localDB.findAll(entity);

        if (localData && localData.length > 0) {
          return localData as TData;
        }

        // Use fallback offline data if provided
        if (offlineData) {
          return offlineData;
        }

        throw new Error('No cached data available offline');
      }

      // If cache-first, return cached data and fetch in background
      if (cacheFirst) {
        const cachedData = queryClient.getQueryData<TData>(queryKey);

        if (cachedData) {
          // Fetch in background
          fetchFn()
            .then(async (freshData) => {
              // Save to local DB
              if (Array.isArray(freshData)) {
                await localDB.saveMany(entity, freshData as any[]);
              } else if ((freshData as any)?.id) {
                await localDB.save(entity, freshData as any);
              }

              // Update cache
              queryClient.setQueryData(queryKey, freshData);
            })
            .catch((error) => {
            });

          return cachedData;
        }
      }

      // Fetch from network
      try {
        const data = await fetchFn();

        // Save to local DB for offline access
        if (data) {
          if (Array.isArray(data)) {
            await localDB.saveMany(entity, data as any[]);
          } else if ((data as any)?.id) {
            await localDB.save(entity, data as any);
          }
        }

        return data;
      } catch (error: any) {
        // Fallback to local DB
        const localData = await localDB.findAll(entity);
        if (localData && localData.length > 0) {
          return localData as TData;
        }

        // Use offline data if provided
        if (offlineData) {
          return offlineData;
        }

        throw error;
      }
    },
    staleTime: isOnline ? 30000 : Infinity, // 30s when online, infinite when offline
    gcTime: 24 * 60 * 60 * 1000, // 24 hours (renamed from cacheTime)
    refetchOnMount: isOnline,
    refetchOnWindowFocus: isOnline,
    refetchOnReconnect: true,
    retry: isOnline ? 3 : 0,
    ...restQueryOptions,
  });

  return {
    ...query,
    isOnline,
    isOffline: !isOnline,
  };
}

/**
 * Enhanced useMutation hook with offline support and optimistic updates
 */
export function useOfflineMutation<TData = unknown, TVariables = unknown, TError = Error>(
  options: OfflineMutationOptions<TData, TVariables, TError>
) {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(networkStatus.isOnline());
  const {
    entity,
    mutationFn,
    optimisticUpdate,
    priority = OperationPriority.HIGH,
    updateCache,
    onSuccess,
    onError,
    ...mutationOptions
  } = options;

  // Monitor network status
  useEffect(() => {
    const unsubscribe = networkStatus.addConnectionListener(setIsOnline);
    return unsubscribe;
  }, []);

  const mutation = useMutation<TData, TError, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const online = networkStatus.isOnline();

      // Optimistic update
      let previousData: any;
      if (optimisticUpdate) {
        const optimisticData = optimisticUpdate(variables);
        const queryKey = [entity];

        // Store previous data for rollback
        previousData = queryClient.getQueryData(queryKey);

        // Apply optimistic update to cache
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return optimisticData;

          if (Array.isArray(old)) {
            // Handle array updates
            const id = (optimisticData as any)?.id;
            const index = old.findIndex((item: any) => item.id === id);

            if (index !== -1) {
              const newArray = [...old];
              newArray[index] = optimisticData;
              return newArray;
            } else {
              return [...old, optimisticData];
            }
          }

          return optimisticData;
        });

        // Save optimistic update to local DB
        if ((optimisticData as any)?.id) {
          await localDB.save(entity, optimisticData);
        }
      }

      if (!online) {
        // Queue operation for when back online
        const operationData = variables as any;
        const operationType = operationData.id ? OperationType.UPDATE : OperationType.CREATE;
        const url = operationData.id
          ? `${process.env.API_URL}/${entity}/${operationData.id}`
          : `${process.env.API_URL}/${entity}`;

        await offlineQueue.enqueue({
          type: operationType,
          entity,
          priority,
          data: operationData,
          url,
          method: operationType === OperationType.CREATE ? 'POST' : 'PUT',
          maxRetries: 3,
        });

        // Return optimistic data
        return optimisticUpdate ? optimisticUpdate(variables) : (variables as any);
      }

      // Execute mutation online
      try {
        const result = await mutationFn(variables);

        // Save to local DB
        if ((result as any)?.id) {
          await localDB.save(entity, result as any);
        }

        return result;
      } catch (error: any) {
        // Rollback optimistic update on error
        if (previousData !== undefined) {
          queryClient.setQueryData([entity], previousData);
        }

        throw error;
      }
    },
    onSuccess: (data, variables, context) => {
      // Update cache with server response
      if (updateCache) {
        const queryKey = [entity];
        queryClient.setQueryData(queryKey, (old: any) => {
          return updateCache(old, data, variables);
        });
      }

      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: [entity] });
    },
    onError: () => {
    },
    ...mutationOptions,
  });

  return {
    ...mutation,
    isOnline,
    isOffline: !isOnline,
  };
}

/**
 * Hook for monitoring sync status
 */
export function useSyncStatus(entity?: string) {
  const [status, setStatus] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(networkStatus.isOnline());

  useEffect(() => {
    // Monitor network status
    const unsubscribeNetwork = networkStatus.addConnectionListener(setIsOnline);

    // Monitor sync status
    try {
      const syncEngine = getSyncEngine();

      const unsubscribeSync = syncEngine.addListener((syncStatus) => {
        if (!entity || syncStatus.entity === entity) {
          setStatus(syncStatus);
        }
      });

      // Get initial status
      const initialStatus = entity ? syncEngine.getStatus(entity) : null;
      if (initialStatus) {
        setStatus(initialStatus);
      }

      return () => {
        unsubscribeNetwork();
        unsubscribeSync();
      };
    } catch (error) {
      // SyncEngine not initialized
      return unsubscribeNetwork;
    }
  }, [entity]);

  return {
    status,
    isOnline,
    isOffline: !isOnline,
    isSyncing: status?.issyncing || false,
  };
}

/**
 * Hook for monitoring offline queue
 */
export function useOfflineQueue() {
  const [stats, setStats] = useState(offlineQueue.getStats());
  const [operations, setOperations] = useState(offlineQueue.getOperations());

  useEffect(() => {
    const updateStats = () => {
      setStats(offlineQueue.getStats());
      setOperations(offlineQueue.getOperations());
    };

    // Update on queue events
    const unsubscribe = offlineQueue.addListener(() => {
      updateStats();
    });

    // Update on network change
    const unsubscribeNetwork = networkStatus.addConnectionListener(() => {
      updateStats();
    });

    return () => {
      unsubscribe();
      unsubscribeNetwork();
    };
  }, []);

  return {
    stats,
    operations,
    hasPending: offlineQueue.hasPendingOperations(),
    processQueue: () => offlineQueue.processQueue(),
    clearFailed: () => offlineQueue.clearFailed(),
    retryFailed: () => offlineQueue.retryFailed(),
  };
}

/**
 * Hook for monitoring conflicts
 */
export function useConflicts(entity?: string) {
  const [conflicts, setConflicts] = useState<any[]>([]);

  useEffect(() => {
    const conflictResolver = require('../services/conflict-resolver').default;

    const updateConflicts = () => {
      const unresolved = conflictResolver.getUnresolvedConflicts(entity);
      setConflicts(unresolved);
    };

    // Initial load
    updateConflicts();

    // Listen for new conflicts
    const unsubscribe = conflictResolver.addListener(() => {
      updateConflicts();
    });

    return unsubscribe;
  }, [entity]);

  return {
    conflicts,
    hasConflicts: conflicts.length > 0,
    conflictCount: conflicts.length,
  };
}

/**
 * Hook for cache-first data loading
 */
export function useCachedData<T>(entity: string, id?: string) {
  const [data, setData] = useState<T | T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (id) {
          const item = await localDB.find<T>(entity, id);
          setData(item);
        } else {
          const items = await localDB.findAll<T>(entity);
          setData(items);
        }
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [entity, id]);

  return {
    data,
    isLoading,
  };
}

export default useOfflineQuery;

