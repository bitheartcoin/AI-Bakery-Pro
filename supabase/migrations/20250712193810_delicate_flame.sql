/*
  # Fix delivery_notes table

  1. Changes
    - Add driver_name column to delivery_notes table
    - Add profiles and vehicles columns as JSONB to store denormalized data
*/

-- Add driver_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_notes' AND column_name = 'driver_name'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN driver_name text;
  END IF;
END $$;

-- Add profiles column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_notes' AND column_name = 'profiles'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN profiles jsonb;
  END IF;
END $$;

-- Add vehicles column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_notes' AND column_name = 'vehicles'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN vehicles jsonb;
  END IF;
END $$;

-- Update existing records to populate the new columns
UPDATE delivery_notes
SET 
  driver_name = p.full_name,
  profiles = jsonb_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'email', p.email,
    'phone', p.phone
  ),
  vehicles = jsonb_build_object(
    'id', v.id,
    'license_plate', v.license_plate,
    'model', v.model
  )
FROM profiles p, vehicles v
WHERE delivery_notes.driver_id = p.id AND delivery_notes.vehicle_id = v.id;