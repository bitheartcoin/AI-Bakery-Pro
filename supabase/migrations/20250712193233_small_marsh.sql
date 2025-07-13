/*
  # Fix delivery_notes table

  1. Changes
    - Add missing columns to delivery_notes table
    - Add driver_name column to delivery_notes table
    - Add vehicle_name column to delivery_notes table
    - Add location_name column to delivery_notes table
    - Add customer_phone column to delivery_notes table
    - Add customer_email column to delivery_notes table
*/

-- Add missing columns to delivery_notes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_notes' AND column_name = 'driver_name'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN driver_name text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_notes' AND column_name = 'vehicle_name'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN vehicle_name text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_notes' AND column_name = 'location_name'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN location_name text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_notes' AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN customer_phone text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_notes' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN customer_email text;
  END IF;
END $$;