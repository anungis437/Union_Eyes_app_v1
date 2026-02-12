-- Enable PostGIS Extension for Spatial Queries
-- Provides high-performance geographic calculations and spatial indexing

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add spatial columns to location tracking table (if not already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'location_tracking' 
    AND column_name = 'geom'
  ) THEN
    ALTER TABLE location_tracking
    ADD COLUMN geom GEOGRAPHY(POINT, 4326);
  END IF;
END $$;

-- Create spatial index on location_tracking
CREATE INDEX IF NOT EXISTS idx_location_tracking_geom 
ON location_tracking USING GIST (geom);

-- Create function to update geometry from lat/lon
CREATE OR REPLACE FUNCTION update_location_geom()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update geometry
DROP TRIGGER IF EXISTS location_tracking_geom_trigger ON location_tracking;
CREATE TRIGGER location_tracking_geom_trigger
  BEFORE INSERT OR UPDATE ON location_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_location_geom();

-- Add spatial columns to geofence definitions (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'geofences') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'geofences' 
      AND column_name = 'boundary'
    ) THEN
      ALTER TABLE geofences
      ADD COLUMN boundary GEOGRAPHY(POLYGON, 4326);
    END IF;
    
    CREATE INDEX IF NOT EXISTS idx_geofences_boundary 
    ON geofences USING GIST (boundary);
  END IF;
END $$;

-- Useful PostGIS functions for geolocation features:

-- Function: Check if point is within geofence (high performance)
CREATE OR REPLACE FUNCTION is_point_in_geofence(
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  geofence_id UUID
)
RETURNS BOOLEAN AS $$
  SELECT ST_Covers(
    boundary,
    ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography
  )
  FROM geofences
  WHERE id = geofence_id;
$$ LANGUAGE sql STABLE;

-- Function: Get distance between two points (meters)
CREATE OR REPLACE FUNCTION get_distance_meters(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
  SELECT ST_Distance(
    ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
    ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
  );
$$ LANGUAGE sql IMMUTABLE;

-- Function: Find nearby locations within radius (meters)
CREATE OR REPLACE FUNCTION find_nearby_locations(
  center_lat DOUBLE PRECISION,
  center_lon DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION,
  max_results INT DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION,
  timestamp TIMESTAMPTZ
) AS $$
  SELECT 
    user_id,
    latitude,
    longitude,
    ST_Distance(
      geom,
      ST_SetSRID(ST_MakePoint(center_lon, center_lat), 4326)::geography
    ) as distance_meters,
    timestamp
  FROM location_tracking
  WHERE ST_DWithin(
    geom,
    ST_SetSRID(ST_MakePoint(center_lon, center_lat), 4326)::geography,
    radius_meters
  )
  AND expires_at > NOW()
  ORDER BY distance_meters
  LIMIT max_results;
$$ LANGUAGE sql STABLE;

-- Function: Create circular geofence
CREATE OR REPLACE FUNCTION create_circular_geofence(
  center_lat DOUBLE PRECISION,
  center_lon DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION,
  num_segments INT DEFAULT 32
)
RETURNS GEOGRAPHY AS $$
  SELECT ST_Buffer(
    ST_SetSRID(ST_MakePoint(center_lon, center_lat), 4326)::geography,
    radius_meters,
    num_segments
  );
$$ LANGUAGE sql IMMUTABLE;

-- Comments for documentation
COMMENT ON FUNCTION is_point_in_geofence IS 'Check if a lat/lon point is within a defined geofence boundary';
COMMENT ON FUNCTION get_distance_meters IS 'Calculate distance between two geographic points in meters using PostGIS';
COMMENT ON FUNCTION find_nearby_locations IS 'Find all locations within a radius of a center point, sorted by distance';
COMMENT ON FUNCTION create_circular_geofence IS 'Create a circular geofence polygon from center point and radius';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_point_in_geofence TO authenticated;
GRANT EXECUTE ON FUNCTION get_distance_meters TO authenticated;
GRANT EXECUTE ON FUNCTION find_nearby_locations TO authenticated;
GRANT EXECUTE ON FUNCTION create_circular_geofence TO authenticated;
