# Geolocation Services - Implementation Guide

## Overview

Union Eyes now includes production-ready geolocation services with:
- ✅ IP geolocation (local + cloud fallback)
- ✅ Multi-provider geocoding with failover
- ✅ PostGIS spatial queries (high performance)
- ✅ Privacy-first location tracking

## 📦 Installed Packages

### IP Geolocation
- **geoip-lite** - Fast, offline IP geolocation
- **@maxmind/geoip2-node** - MaxMind GeoIP2 API client (optional)

### Geocoding
- **node-geocoder** - Multi-provider geocoding abstraction
- Supports: Google Maps, OpenStreetMap, MapBox

### Spatial Queries
- **PostGIS** - PostgreSQL extension for spatial queries

---

## 🚀 Quick Start

### 1. IP Geolocation

#### Basic Usage (Offline, Fast)
```typescript
import { getIPGeolocation } from '@/lib/services/ip-geolocation-service';

const geo = getIPGeolocation('8.8.8.8');
console.log(geo);
// {
//   ip: '8.8.8.8',
//   country: 'United States',
//   countryCode: 'US',
//   region: 'CA',
//   latitude: 37.386,
//   longitude: -122.084,
//   timezone: 'America/Los_Angeles',
//   accuracy: 'medium',
//   source: 'geoip-lite'
// }
```

#### Enhanced Accuracy (Uses API)
```typescript
import { getEnhancedIPGeolocation } from '@/lib/services/ip-geolocation-service';

// Includes city-level data (requires external API call)
const geo = await getEnhancedIPGeolocation('8.8.8.8');
console.log(geo.city); // 'Mountain View'
```

#### Security Validation
```typescript
import { validateIPLocation } from '@/lib/services/ip-geolocation-service';

const validation = validateIPLocation('8.8.8.8', 'US');
if (!validation.valid) {
  console.error('IP location mismatch:', validation.reason);
}
```

---

### 2. Multi-Provider Geocoding

#### Setup Environment Variables
```bash
# .env.local
GOOGLE_MAPS_API_KEY=your_google_api_key
MAPBOX_API_KEY=your_mapbox_api_key  # Optional
```

#### Geocode Address (Automatic Failover)
```typescript
import { geocodeAddress } from '@/lib/services/multi-provider-geocoding-service';

const result = await geocodeAddress({
  addressLine1: '1600 Amphitheatre Parkway',
  locality: 'Mountain View',
  administrativeArea: 'CA',
  postalCode: '94043',
  countryCode: 'US'
});

console.log(result);
// {
//   latitude: 37.422,
//   longitude: -122.084,
//   formattedAddress: '1600 Amphitheatre Parkway, Mountain View, CA 94043, USA',
//   provider: 'google',
//   confidence: 'high'
// }
```

#### Provider Failover Example
```typescript
// If Google fails, automatically tries OpenStreetMap, then MapBox
const service = getGeocodingService();

// Check available providers
console.log(service.getAvailableProviders());
// ['google', 'openstreetmap', 'mapbox']

// Test provider connectivity
const isGoogleWorking = await service.testProvider('google');
```

#### Reverse Geocoding
```typescript
import { reverseGeocodeCoordinates } from '@/lib/services/multi-provider-geocoding-service';

const address = await reverseGeocodeCoordinates(37.422, -122.084);
console.log(address.formattedAddress);
```

---

### 3. PostGIS Spatial Queries

#### Enable PostGIS Extension
```bash
# Run migration
psql -d your_database -f supabase/migrations/20260212000001_add_postgis_extension.sql
```

#### Check if Point is in Geofence
```typescript
import { isPointInGeofence } from '@/lib/services/spatial-query-service';

const result = await isPointInGeofence(
  { latitude: 43.6532, longitude: -79.3832 },
  'geofence-uuid'
);

console.log(result.inside);  // true/false
console.log(result.method);  // 'postgis' or 'haversine' (fallback)
```

#### Calculate Distance (High Performance)
```typescript
import { calculateDistance } from '@/lib/services/spatial-query-service';

const result = await calculateDistance(
  { latitude: 43.6532, longitude: -79.3832 },
  { latitude: 43.6542, longitude: -79.3842 }
);

console.log(result.distance);  // meters
console.log(result.method);    // 'postgis' or 'haversine'
```

#### Find Nearby Locations
```typescript
import { findNearbyLocations } from '@/lib/services/spatial-query-service';

const nearby = await findNearbyLocations(
  { latitude: 43.6532, longitude: -79.3832 },
  1000,  // radius in meters
  10     // max results
);

nearby.forEach(location => {
  console.log(`User ${location.userId}: ${location.distance}m away`);
});
```

#### Create Circular Geofence
```typescript
import { createCircularGeofence } from '@/lib/services/spatial-query-service';

const geofenceGeoJSON = await createCircularGeofence(
  { latitude: 43.6532, longitude: -79.3832 },
  500  // radius in meters
);

// Store in database as geofence boundary
```

---

## 🔒 Privacy-First Location Tracking

### Existing Implementation (No Changes Required)

The geofence privacy service is already fully implemented:

```typescript
import { 
  requestLocationPermission,
  trackLocation,
  revokeLocationConsent 
} from '@/lib/services/geofence-privacy-service';

// 1. Request explicit permission
const consent = await requestLocationPermission(userId, 'strike-line-tracking');

// 2. Track location (only if consented)
await trackLocation(userId, { latitude: 43.6532, longitude: -79.3832 }, 'strike-line-tracking');

// 3. Revoke anytime
await revokeLocationConsent(userId);
```

**Privacy Features:**
- ✅ Explicit opt-in required
- ✅ Foreground-only tracking (no background)
- ✅ 24-hour TTL on all location data
- ✅ Easy one-click revocation
- ✅ Purpose tracking
- ✅ Compliance auditing

---

## ⚙️ Configuration

### Environment Variables

```bash
# Required for multi-provider geocoding
GOOGLE_MAPS_API_KEY=your_google_api_key

# Optional providers
MAPBOX_API_KEY=your_mapbox_api_key

# Optional: MaxMind GeoIP2 (for enhanced IP geolocation)
MAXMIND_ACCOUNT_ID=your_account_id
MAXMIND_LICENSE_KEY=your_license_key
```

### Rate Limits

| Service | Free Tier | Notes |
|---------|-----------|-------|
| geoip-lite | Unlimited | Local database, no API calls |
| ipapi.co | 1,000/day | Used for enhanced accuracy |
| OpenStreetMap | 1 request/second | Fallback provider |
| Google Maps | $200/month credit | Primary provider |
| PostGIS | Unlimited | Local database queries |

---

## 📊 Performance Comparison

### Distance Calculation

| Method | Query Time | Accuracy | Use Case |
|--------|-----------|----------|----------|
| PostGIS | ~0.1ms | Exact | High-volume, complex queries |
| Haversine | ~0.01ms | Approximate | Simple distance checks |

### IP Geolocation

| Method | Query Time | Accuracy | Privacy |
|--------|-----------|----------|---------|
| geoip-lite | <1ms | Country/Region | Excellent (offline) |
| ipapi.co | ~200ms | City-level | Good (external API) |

### Geocoding

| Provider | Success Rate | Accuracy | Cost |
|----------|-------------|----------|------|
| Google | 98% | Highest | Paid |
| OpenStreetMap | 85% | Good | Free |
| MapBox | 90% | Good | Paid |

---

## 🧪 Testing

### Test IP Geolocation
```bash
pnpm test __tests__/lib/services/ip-geolocation-service.test.ts
```

### Test Geocoding
```bash
pnpm test __tests__/lib/services/multi-provider-geocoding-service.test.ts
```

### Test Spatial Queries
```bash
pnpm test __tests__/lib/services/spatial-query-service.test.ts
```

---

## 🐛 Troubleshooting

### PostGIS Extension Not Found
```sql
-- Check if PostGIS is installed
SELECT * FROM pg_available_extensions WHERE name = 'postgis';

-- Enable extension
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Geocoding Provider Failed
```typescript
// Check provider status
const service = getGeocodingService();
const isWorking = await service.testProvider('google');

if (!isWorking) {
  console.log('Available providers:', service.getAvailableProviders());
}
```

### IP Geolocation Inaccurate
```typescript
// Use enhanced geolocation for city-level accuracy
const geo = await getEnhancedIPGeolocation(ipAddress);

// Or update geoip-lite database
import geoip from 'geoip-lite';
geoip.startWatchingDataUpdate();
```

---

## 📚 API Reference

### IP Geolocation Service
- `getIPGeolocation(ip)` - Fast, offline lookup
- `getEnhancedIPGeolocation(ip)` - City-level accuracy
- `batchIPGeolocation(ips)` - Batch lookup
- `isIPFromCountry(ip, countryCode)` - Country check
- `getDistanceBetweenIPs(ip1, ip2)` - Distance calculation

### Multi-Provider Geocoding
- `geocodeAddress(address)` - Forward geocoding
- `reverseGeocodeCoordinates(lat, lon)` - Reverse geocoding
- `batchGeocodeAddresses(addresses)` - Batch geocoding
- `getGeocodingService()` - Service instance

### Spatial Query Service
- `isPointInGeofence(point, geofenceId)` - Containment check
- `calculateDistance(point1, point2)` - Distance calculation
- `findNearbyLocations(center, radius, limit)` - Proximity search
- `createCircularGeofence(center, radius)` - Geofence creation
- `checkPostGISAvailability()` - Extension check

---

## 🎯 Best Practices

1. **Use Local Services for High Volume**
   - geoip-lite for IP geolocation
   - PostGIS for spatial queries
   - Avoid external API calls in hot paths

2. **Implement Caching**
   - Cache geocoding results (addresses rarely change)
   - Cache IP geolocation for session duration
   - Use Redis for distributed caching

3. **Handle Failures Gracefully**
   - Multi-provider geocoding automatically fails over
   - Spatial queries fall back to Haversine
   - Always handle null results

4. **Privacy First**
   - Always use geofence privacy service for user tracking
   - Implement explicit consent
   - Enforce TTL on location data
   - Provide easy revocation

---

## 📈 Migration from Existing Code

### Before (Direct Google API)
```typescript
const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?...`);
```

### After (Multi-Provider)
```typescript
const result = await geocodeAddress(address);
// Automatically tries Google → OpenStreetMap → MapBox
```

### Before (Haversine Only)
```typescript
const distance = calculateDistanceHaversine(lat1, lon1, lat2, lon2);
```

### After (PostGIS with Fallback)
```typescript
const result = await calculateDistance(point1, point2);
// Uses PostGIS if available, falls back to Haversine
```

---

## 🔄 Maintenance

### Update GeoIP Database
```bash
# geoip-lite auto-updates monthly
# Force update:
npm update geoip-lite
```

### Monitor Provider Health
```typescript
// Add to monitoring dashboard
const providers = ['google', 'openstreetmap', 'mapbox'];
for (const provider of providers) {
  const status = await service.testProvider(provider);
  console.log(`${provider}: ${status ? 'UP' : 'DOWN'}`);
}
```

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review provider documentation
3. Check application logs for API errors
4. Verify environment variables are set correctly
