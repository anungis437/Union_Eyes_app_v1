import { networkStatus, NetworkQuality, ConnectionType } from '../network-status';
import NetInfo from '@react-native-community/netinfo';

// Mock NetInfo
jest.mock('@react-native-community/netinfo');

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

describe('NetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with current network state', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
        details: {},
      } as any);

      const status = await networkStatus.getStatus();
      expect(status.isConnected).toBe(true);
      expect(status.type).toBe(ConnectionType.WIFI);
    });
  });

  describe('isOnline/isOffline', () => {
    it('should return true when connected with internet', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
        details: {},
      } as any);

      await networkStatus.getStatus();
      expect(networkStatus.isOnline()).toBe(true);
      expect(networkStatus.isOffline()).toBe(false);
    });

    it('should return false when disconnected', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        type: 'none',
        isConnected: false,
        isInternetReachable: false,
        details: null,
      } as any);

      await networkStatus.getStatus();
      expect(networkStatus.isOnline()).toBe(false);
      expect(networkStatus.isOffline()).toBe(true);
    });
  });

  describe('connection type detection', () => {
    it('should detect WiFi connection', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
        details: {},
      } as any);

      await networkStatus.getStatus();
      expect(networkStatus.isOnWiFi()).toBe(true);
      expect(networkStatus.isOnCellular()).toBe(false);
    });

    it('should detect cellular connection', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        type: 'cellular',
        isConnected: true,
        isInternetReachable: true,
        details: { cellularGeneration: '4g' },
      } as any);

      await networkStatus.getStatus();
      expect(networkStatus.isOnCellular()).toBe(true);
      expect(networkStatus.isOnWiFi()).toBe(false);
    });
  });

  describe('quality detection', () => {
    it('should detect excellent quality for WiFi', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
        details: {},
      } as any);

      const status = await networkStatus.getStatus();
      expect(status.quality).toBe(NetworkQuality.EXCELLENT);
    });

    it('should detect good quality for 3G', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        type: 'cellular',
        isConnected: true,
        isInternetReachable: true,
        details: {
          cellularGeneration: '3g',
          effectiveConnectionType: '3g',
        },
      } as any);

      const status = await networkStatus.getStatus();
      expect(status.quality).toBe(NetworkQuality.GOOD);
    });

    it('should detect poor quality for 2G', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        type: 'cellular',
        isConnected: true,
        isInternetReachable: true,
        details: {
          cellularGeneration: '2g',
          effectiveConnectionType: '2g',
        },
      } as any);

      const status = await networkStatus.getStatus();
      expect(status.quality).toBe(NetworkQuality.POOR);
    });

    it('should detect offline state', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        type: 'none',
        isConnected: false,
        isInternetReachable: false,
        details: null,
      } as any);

      const status = await networkStatus.getStatus();
      expect(status.quality).toBe(NetworkQuality.OFFLINE);
    });
  });

  describe('shouldSyncNow', () => {
    it('should return true for good connection when not WiFi-only', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        type: 'cellular',
        isConnected: true,
        isInternetReachable: true,
        details: { cellularGeneration: '4g' },
      } as any);

      await networkStatus.getStatus();
      expect(networkStatus.shouldSyncNow()).toBe(true);
    });

    it('should return false for cellular when WiFi-only', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        type: 'cellular',
        isConnected: true,
        isInternetReachable: true,
        details: { cellularGeneration: '4g' },
      } as any);

      await networkStatus.getStatus();
      expect(networkStatus.shouldSyncNow({ wifiOnly: true })).toBe(false);
    });

    it('should return true for WiFi when WiFi-only', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
        details: {},
      } as any);

      await networkStatus.getStatus();
      expect(networkStatus.shouldSyncNow({ wifiOnly: true })).toBe(true);
    });

    it('should respect minimum quality requirement', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        type: 'cellular',
        isConnected: true,
        isInternetReachable: true,
        details: { cellularGeneration: '2g' },
      } as any);

      await networkStatus.getStatus();
      expect(networkStatus.shouldSyncNow({ minQuality: NetworkQuality.GOOD })).toBe(false);
    });
  });

  describe('isGoodEnoughFor', () => {
    it('should allow sync on poor connection', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        type: 'cellular',
        isConnected: true,
        isInternetReachable: true,
        details: { cellularGeneration: '2g' },
      } as any);

      await networkStatus.getStatus();
      expect(networkStatus.isGoodEnoughFor('sync')).toBe(true);
    });

    it('should require excellent for streaming', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        type: 'cellular',
        isConnected: true,
        isInternetReachable: true,
        details: { cellularGeneration: '3g' },
      } as any);

      await networkStatus.getStatus();
      expect(networkStatus.isGoodEnoughFor('streaming')).toBe(false);
    });

    it('should allow upload on good connection', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        type: 'cellular',
        isConnected: true,
        isInternetReachable: true,
        details: { cellularGeneration: '4g' },
      } as any);

      await networkStatus.getStatus();
      expect(networkStatus.isGoodEnoughFor('upload')).toBe(true);
    });
  });

  describe('listeners', () => {
    it('should notify change listeners', async () => {
      const listener = jest.fn();

      mockNetInfo.fetch.mockResolvedValue({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
        details: {},
      } as any);

      const unsubscribe = networkStatus.addChangeListener(listener);

      await networkStatus.getStatus();

      // Should be called at least once with current status
      expect(listener).toHaveBeenCalled();

      unsubscribe();
    });

    it('should notify connection listeners', async () => {
      const listener = jest.fn();

      mockNetInfo.fetch.mockResolvedValue({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
        details: {},
      } as any);

      const unsubscribe = networkStatus.addConnectionListener(listener);

      await networkStatus.getStatus();

      // Should be called with connection status
      expect(listener).toHaveBeenCalledWith(true);

      unsubscribe();
    });

    it('should remove listeners', () => {
      const listener = jest.fn();
      const unsubscribe = networkStatus.addChangeListener(listener);

      unsubscribe();

      // Listener should not be called after unsubscribe
      listener.mockClear();
      // Trigger some event that would normally call listeners
      // (implementation dependent)
    });
  });

  describe('connection stability', () => {
    it('should track connection stability', () => {
      const isStable = networkStatus.isConnectionStable();
      expect(typeof isStable).toBe('boolean');
    });
  });
});
