import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';

export enum NetworkQuality {
  EXCELLENT = 'excellent', // Fast connection
  GOOD = 'good', // Normal connection
  POOR = 'poor', // Slow connection
  OFFLINE = 'offline', // No connection
}

export enum ConnectionType {
  WIFI = 'wifi',
  CELLULAR = 'cellular',
  ETHERNET = 'ethernet',
  BLUETOOTH = 'bluetooth',
  WIMAX = 'wimax',
  VPN = 'vpn',
  OTHER = 'other',
  NONE = 'none',
  UNKNOWN = 'unknown',
}

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: ConnectionType;
  quality: NetworkQuality;
  effectiveType?: string;
  downloadSpeed?: number; // Mbps
  uploadSpeed?: number; // Mbps
  latency?: number; // ms
  timestamp: number;
}

type NetworkChangeListener = (status: NetworkStatus) => void;
type ConnectionListener = (isConnected: boolean) => void;

/**
 * Network status manager with connection quality detection
 */
class NetworkStatusManager {
  private currentStatus: NetworkStatus | null = null;
  private changeListeners: Set<NetworkChangeListener> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private unsubscribe: (() => void) | null = null;
  private isInitialized = false;
  private qualityCheckInterval: NodeJS.Timeout | null = null;
  private connectionHistory: boolean[] = [];
  private readonly HISTORY_SIZE = 10;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize network monitoring
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Get initial state
      const initialState = await NetInfo.fetch();
      this.currentStatus = this.parseNetInfoState(initialState);
      this.isInitialized = true;

      console.log('[NetworkStatus] Initialized:', this.currentStatus);

      // Start monitoring
      this.startMonitoring();
      this.startQualityChecks();
    } catch (error) {
      console.error('[NetworkStatus] Initialization failed:', error);
    }
  }

  /**
   * Start monitoring network changes
   */
  private startMonitoring(): void {
    this.unsubscribe = NetInfo.addEventListener((state) => {
      const newStatus = this.parseNetInfoState(state);
      const wasConnected = this.currentStatus?.isConnected ?? false;
      const isNowConnected = newStatus.isConnected;

      this.currentStatus = newStatus;
      this.updateConnectionHistory(isNowConnected);

      console.log('[NetworkStatus] Status changed:', {
        type: newStatus.type,
        quality: newStatus.quality,
        isConnected: newStatus.isConnected,
      });

      // Notify all listeners
      this.notifyChangeListeners(newStatus);

      // Notify connection listeners if status changed
      if (wasConnected !== isNowConnected) {
        this.notifyConnectionListeners(isNowConnected);
      }
    });
  }

  /**
   * Start periodic quality checks
   */
  private startQualityChecks(): void {
    // Check quality every 30 seconds
    this.qualityCheckInterval = setInterval(() => {
      this.checkConnectionQuality();
    }, 30000);
  }

  /**
   * Parse NetInfo state to NetworkStatus
   */
  private parseNetInfoState(state: NetInfoState): NetworkStatus {
    const type = this.mapConnectionType(state.type);
    const isConnected = state.isConnected ?? false;
    const isInternetReachable = state.isInternetReachable;

    // Determine quality based on connection type and details
    let quality = NetworkQuality.OFFLINE;
    if (isConnected && isInternetReachable) {
      quality = this.determineQuality(state);
    }

    return {
      isConnected,
      isInternetReachable,
      type,
      quality,
      effectiveType: (state.details as any)?.effectiveConnectionType,
      downloadSpeed: (state.details as any)?.downlinkMax,
      timestamp: Date.now(),
    };
  }

  /**
   * Map NetInfo connection type to our enum
   */
  private mapConnectionType(type: NetInfoStateType): ConnectionType {
    const typeMap: Record<NetInfoStateType, ConnectionType> = {
      wifi: ConnectionType.WIFI,
      cellular: ConnectionType.CELLULAR,
      ethernet: ConnectionType.ETHERNET,
      bluetooth: ConnectionType.BLUETOOTH,
      wimax: ConnectionType.WIMAX,
      vpn: ConnectionType.VPN,
      other: ConnectionType.OTHER,
      none: ConnectionType.NONE,
      unknown: ConnectionType.UNKNOWN,
    };

    return typeMap[type] || ConnectionType.UNKNOWN;
  }

  /**
   * Determine connection quality
   */
  private determineQuality(state: NetInfoState): NetworkQuality {
    const { type, details } = state;

    // WiFi is generally good quality
    if (type === 'wifi') {
      return NetworkQuality.EXCELLENT;
    }

    // For cellular, check effective type
    if (type === 'cellular') {
      const effectiveType = (details as any)?.effectiveConnectionType;

      if (effectiveType === '4g' || effectiveType === '5g') {
        return NetworkQuality.EXCELLENT;
      } else if (effectiveType === '3g') {
        return NetworkQuality.GOOD;
      } else if (effectiveType === '2g') {
        return NetworkQuality.POOR;
      }

      // Check cellular generation
      const generation = (details as any)?.cellularGeneration;
      if (generation === '5g' || generation === '4g') {
        return NetworkQuality.EXCELLENT;
      } else if (generation === '3g') {
        return NetworkQuality.GOOD;
      } else {
        return NetworkQuality.POOR;
      }
    }

    // Ethernet is excellent
    if (type === 'ethernet') {
      return NetworkQuality.EXCELLENT;
    }

    // Default to good for other types
    return NetworkQuality.GOOD;
  }

  /**
   * Check connection quality with ping test
   */
  private async checkConnectionQuality(): Promise<void> {
    if (!this.currentStatus?.isConnected) return;

    try {
      const startTime = Date.now();
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        cache: 'no-cache',
      });
      const latency = Date.now() - startTime;

      if (this.currentStatus) {
        this.currentStatus.latency = latency;

        // Update quality based on latency
        if (latency < 100) {
          this.currentStatus.quality = NetworkQuality.EXCELLENT;
        } else if (latency < 300) {
          this.currentStatus.quality = NetworkQuality.GOOD;
        } else {
          this.currentStatus.quality = NetworkQuality.POOR;
        }

        this.notifyChangeListeners(this.currentStatus);
      }
    } catch (error) {
      console.warn('[NetworkStatus] Quality check failed:', error);
      if (this.currentStatus) {
        this.currentStatus.quality = NetworkQuality.POOR;
      }
    }
  }

  /**
   * Update connection history for stability tracking
   */
  private updateConnectionHistory(isConnected: boolean): void {
    this.connectionHistory.push(isConnected);
    if (this.connectionHistory.length > this.HISTORY_SIZE) {
      this.connectionHistory.shift();
    }
  }

  /**
   * Check if connection is stable
   */
  isConnectionStable(): boolean {
    if (this.connectionHistory.length < 3) return true;

    const recentChanges = this.connectionHistory.slice(-5);
    const changes = recentChanges.reduce((count, current, index) => {
      if (index === 0) return count;
      return count + (current !== recentChanges[index - 1] ? 1 : 0);
    }, 0);

    // Stable if less than 2 changes in recent history
    return changes < 2;
  }

  /**
   * Get current network status
   */
  async getStatus(): Promise<NetworkStatus> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.currentStatus!;
  }

  /**
   * Get current network status synchronously (may be stale)
   */
  getCurrentStatus(): NetworkStatus | null {
    return this.currentStatus;
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return !!(this.currentStatus?.isConnected && this.currentStatus?.isInternetReachable === true);
  }

  /**
   * Check if currently offline
   */
  isOffline(): boolean {
    return !this.isOnline();
  }

  /**
   * Check if on WiFi
   */
  isOnWiFi(): boolean {
    return this.currentStatus?.type === ConnectionType.WIFI && this.isOnline();
  }

  /**
   * Check if on cellular
   */
  isOnCellular(): boolean {
    return this.currentStatus?.type === ConnectionType.CELLULAR && this.isOnline();
  }

  /**
   * Check if connection is good enough for given operation
   */
  isGoodEnoughFor(operation: 'sync' | 'upload' | 'download' | 'streaming'): boolean {
    if (!this.isOnline()) return false;

    const quality = this.currentStatus?.quality;

    switch (operation) {
      case 'streaming':
        return quality === NetworkQuality.EXCELLENT;
      case 'upload':
      case 'download':
        return quality === NetworkQuality.EXCELLENT || quality === NetworkQuality.GOOD;
      case 'sync':
        return quality !== NetworkQuality.OFFLINE;
      default:
        return false;
    }
  }

  /**
   * Should sync now based on connection quality and type
   */
  shouldSyncNow(options: { wifiOnly?: boolean; minQuality?: NetworkQuality } = {}): boolean {
    if (!this.isOnline()) return false;

    const { wifiOnly = false, minQuality = NetworkQuality.POOR } = options;

    if (wifiOnly && !this.isOnWiFi()) {
      return false;
    }

    const qualityOrder = {
      [NetworkQuality.OFFLINE]: 0,
      [NetworkQuality.POOR]: 1,
      [NetworkQuality.GOOD]: 2,
      [NetworkQuality.EXCELLENT]: 3,
    };

    const currentQuality = this.currentStatus?.quality || NetworkQuality.OFFLINE;
    return qualityOrder[currentQuality] >= qualityOrder[minQuality];
  }

  /**
   * Add network change listener
   */
  addChangeListener(listener: NetworkChangeListener): () => void {
    this.changeListeners.add(listener);

    // Immediately notify with current status
    if (this.currentStatus) {
      listener(this.currentStatus);
    }

    return () => this.changeListeners.delete(listener);
  }

  /**
   * Add connection status listener (online/offline only)
   */
  addConnectionListener(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);

    // Immediately notify with current status
    if (this.currentStatus) {
      listener(this.currentStatus.isConnected);
    }

    return () => this.connectionListeners.delete(listener);
  }

  /**
   * Notify change listeners
   */
  private notifyChangeListeners(status: NetworkStatus): void {
    this.changeListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error('[NetworkStatus] Listener error:', error);
      }
    });
  }

  /**
   * Notify connection listeners
   */
  private notifyConnectionListeners(isConnected: boolean): void {
    this.connectionListeners.forEach((listener) => {
      try {
        listener(isConnected);
      } catch (error) {
        console.error('[NetworkStatus] Listener error:', error);
      }
    });
  }

  /**
   * Cleanup and stop monitoring
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
      this.qualityCheckInterval = null;
    }

    this.changeListeners.clear();
    this.connectionListeners.clear();
    this.isInitialized = false;

    console.log('[NetworkStatus] Destroyed');
  }
}

// Export singleton instance
export const networkStatus = new NetworkStatusManager();
export default networkStatus;

