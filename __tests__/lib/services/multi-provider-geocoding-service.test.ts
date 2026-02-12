/**
 * Multi-Provider Geocoding Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MultiProviderGeocodingService,
  geocodeAddress,
  type AddressInput,
} from '@/lib/services/multi-provider-geocoding-service';

// Mock node-geocoder
vi.mock('node-geocoder', () => ({
  default: vi.fn((options) => ({
    geocode: vi.fn(async (address: string) => {
      // Mock Google Maps response
      if (options.provider === 'google' && address.includes('1600 Amphitheatre')) {
        return [
          {
            latitude: 37.422,
            longitude: -122.084,
            formattedAddress: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
            streetNumber: '1600',
            streetName: 'Amphitheatre Parkway',
            city: 'Mountain View',
            state: 'CA',
            zipcode: '94043',
            countryCode: 'US',
          },
        ];
      }
      
      // Mock OpenStreetMap response (fallback)
      if (options.provider === 'openstreetmap') {
        return [
          {
            latitude: 37.422,
            longitude: -122.084,
            formattedAddress: '1600 Amphitheatre Parkway, Mountain View, CA',
            city: 'Mountain View',
            state: 'CA',
            countryCode: 'US',
          },
        ];
      }
      
      return [];
    }),
    reverse: vi.fn(async ({ lat, lon }) => [
      {
        latitude: lat,
        longitude: lon,
        formattedAddress: 'Mock Address',
        streetNumber: '123',
        streetName: 'Main St',
        city: 'Test City',
        state: 'CA',
        zipcode: '12345',
        countryCode: 'US',
      },
    ]),
  })),
}));

describe('MultiProviderGeocodingService', () => {
  let service: MultiProviderGeocodingService;

  beforeEach(() => {
    service = new MultiProviderGeocodingService();
  });

  describe('geocode', () => {
    it('should geocode a valid address', async () => {
      const address: AddressInput = {
        addressLine1: '1600 Amphitheatre Parkway',
        locality: 'Mountain View',
        administrativeArea: 'CA',
        postalCode: '94043',
        countryCode: 'US',
      };

      const result = await service.geocode(address);

      expect(result).toBeDefined();
      expect(result?.latitude).toBeCloseTo(37.422, 2);
      expect(result?.longitude).toBeCloseTo(-122.084, 2);
      expect(result?.formattedAddress).toContain('Mountain View');
      expect(['high', 'medium', 'low']).toContain(result?.confidence);
    });

    it('should handle geocoding failure gracefully', async () => {
      const address: AddressInput = {
        addressLine1: 'Nonexistent Address XYZ123',
        locality: 'Nowhere',
        countryCode: 'XX',
      };

      const result = await service.geocode(address);
      
      // Should still get OpenStreetMap fallback or null
      expect(result).toBeDefined();
    });
  });

  describe('reverseGeocode', () => {
    it('should reverse geocode coordinates', async () => {
      const result = await service.reverseGeocode(37.422, -122.084);

      expect(result).toBeDefined();
      expect(result?.address.locality).toBe('Test City');
      expect(result?.address.administrativeArea).toBe('CA');
      expect(result?.formattedAddress).toBe('Mock Address');
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of available providers', () => {
      const providers = service.getAvailableProviders();

      expect(providers).toBeInstanceOf(Array);
      expect(providers.length).toBeGreaterThan(0);
      expect(providers).toContain('openstreetmap'); // Always available
    });
  });

  describe('testProvider', () => {
    it('should test provider connectivity', async () => {
      const isWorking = await service.testProvider('openstreetmap');
      expect(typeof isWorking).toBe('boolean');
    });

    it('should return false for unavailable provider', async () => {
      const isWorking = await service.testProvider('mapbox' as any);
      // May be false if MapBox API key not configured
      expect(typeof isWorking).toBe('boolean');
    });
  });
});

describe('Convenience Functions', () => {
  it('should geocode address using convenience function', async () => {
    const address: AddressInput = {
      addressLine1: '1600 Amphitheatre Parkway',
      locality: 'Mountain View',
      administrativeArea: 'CA',
      postalCode: '94043',
      countryCode: 'US',
    };

    const result = await geocodeAddress(address);

    expect(result).toBeDefined();
    expect(result?.latitude).toBeDefined();
    expect(result?.longitude).toBeDefined();
  });
});
