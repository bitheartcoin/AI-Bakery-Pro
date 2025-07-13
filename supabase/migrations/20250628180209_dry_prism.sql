/*
  # Add vehicles to database

  1. New Data
    - Add real vehicles with license plates and GPS tracker IDs
    - Set up proper relationships with drivers
    - Add GPS tracker settings
*/

-- Insert vehicles if they don't exist
INSERT INTO vehicles (id, license_plate, type, model, capacity, fuel_consumption, insurance_expiry, technical_inspection, mileage, status, driver_id, gps_tracker_id, last_service)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440101', 'RKA-376', 'Kisteherautó', 'Ford Transit', 1500, 8.5, '2024-12-15', '2024-08-20', 125000, 'active', NULL, 'szemesi_motor_blokk_1', '2024-01-10'),
  ('550e8400-e29b-41d4-a716-446655440102', 'JOV-030', 'Furgon', 'Mercedes Sprinter', 2000, 9.2, '2024-10-30', '2024-06-15', 89000, 'active', NULL, 'szemesi_motor_blokk_2', '2023-12-05'),
  ('550e8400-e29b-41d4-a716-446655440103', 'LSF-606', 'Kisteherautó', 'Iveco Daily', 1800, 7.8, '2025-03-12', '2024-11-08', 156000, 'maintenance', NULL, 'szemesi_motor_blokk_4', '2024-01-05'),
  ('550e8400-e29b-41d4-a716-446655440104', 'LVK-378', 'Kisteherautó', 'Renault Master', 1600, 8.0, '2025-02-20', '2024-10-15', 112000, 'active', NULL, 'szemesi_5', '2024-02-10')
ON CONFLICT (license_plate) DO UPDATE
SET 
  type = EXCLUDED.type,
  model = EXCLUDED.model,
  capacity = EXCLUDED.capacity,
  fuel_consumption = EXCLUDED.fuel_consumption,
  insurance_expiry = EXCLUDED.insurance_expiry,
  technical_inspection = EXCLUDED.technical_inspection,
  mileage = EXCLUDED.mileage,
  status = EXCLUDED.status,
  gps_tracker_id = EXCLUDED.gps_tracker_id,
  last_service = EXCLUDED.last_service;

-- Add GPS tracking settings
INSERT INTO settings (category, key, value, description, is_public)
VALUES 
  ('gps_tracking', 'api_url', '"https://api.trackgps.ro/api"', 'TrackGPS API URL', false),
  ('gps_tracking', 'username', '"testAPI"', 'TrackGPS API felhasználónév', false),
  ('gps_tracking', 'password', '"web"', 'TrackGPS API jelszó', false),
  ('gps_tracking', 'api_key', '"system"', 'TrackGPS API kulcs', false),
  ('gps_tracking', 'refresh_interval', '30', 'Frissítési gyakoriság másodpercben', false)
ON CONFLICT (category, key) DO UPDATE
SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description;

-- Add Blue Iris settings if they don't exist
INSERT INTO settings (category, key, value, description, is_public)
VALUES 
  ('blue_iris', 'server', '"http://45.130.240.216:82"', 'BlueIris szerver URL', false),
  ('blue_iris', 'username', '"webeye"', 'BlueIris felhasználónév', false),
  ('blue_iris', 'password', '"07230518Aa!"', 'BlueIris jelszó', false)
ON CONFLICT (category, key) DO UPDATE
SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description;