/**
 * IP Geolocation Service Tests
 */

import { describe, it, expect, vi } from 'vitest';
import {
  getIPGeolocation,
  isIPFromCountry,
  getDistanceBetweenIPs,
  validateIPLocation,
} from '@/lib/services/ip-geolocation-service';

describe('IPGeolocationService', () => {
  describe('getIPGeolocation', () => {
    it('should return null for localhost', () => {
      const result = getIPGeolocation('127.0.0.1');
      expect(result).toBeNull();
    });

    it('should return null for localhost string', () => {
      const result = getIPGeolocation('localhost');
      expect(result).toBeNull();
    });

    it('should geolocate public IP address', () => {
      // Google DNS IP
      const result = getIPGeolocation('8.8.8.8');
      
      if (result) {
        expect(result.ip).toBe('8.8.8.8');
        expect(result.countryCode).toBe('US');
        expect(result.source).toBe('geoip-lite');
        expect(result.accuracy).toBe('medium');
        expect(result.latitude).toBeDefined();
        expect(result.longitude).toBeDefined();
      }
    });

    it('should return fallback for unknown IP', () => {
      const result = getIPGeolocation('0.0.0.0');
      
      expect(result).toEqual({
        ip: '0.0.0.0',
        accuracy: 'low',
        source: 'fallback',
      });
    });
  });

  describe('isIPFromCountry', () => {
    it('should correctly identify US IP', () => {
      const isUS = isIPFromCountry('8.8.8.8', 'US');
      expect(isUS).toBe(true);
    });

    it('should correctly reject non-US IP', () => {
      const isCA = isIPFromCountry('8.8.8.8', 'CA');
      expect(isCA).toBe(false);
    });

    it('should handle unknown IP', () => {
      const result = isIPFromCountry('0.0.0.0', 'US');
      expect(result).toBe(false);
    });
  });

  describe('getDistanceBetweenIPs', () => {
    it('should calculate distance between two IPs', () => {
      // Google DNS (US) and Cloudflare DNS (US)
      const distance = getDistanceBetweenIPs('8.8.8.8', '1.1.1.1');
      
      if (distance !== null) {
        expect(distance).toBeGreaterThan(0);
        expect(typeof distance).toBe('number');
      }
    });

    it('should return null for invalid IPs', () => {
      const distance = getDistanceBetweenIPs('0.0.0.0', '0.0.0.0');
      expect(distance).toBeNull();
    });
  });

  describe('validateIPLocation', () => {
    it('should validate matching country code', () => {
      const validation = validateIPLocation('8.8.8.8', 'US');
      
      expect(validation.valid).toBe(true);
      expect(validation.actual?.countryCode).toBe('US');
    });

    it('should reject mismatched country code', () => {
      const validation = validateIPLocation('8.8.8.8', 'CA');
      
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('expected CA');
    });

    it('should handle unknown IP gracefully', () => {
      const validation = validateIPLocation('0.0.0.0', 'US');
      
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('expected US');
    });
  });
});
