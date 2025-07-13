/*
  # Add location_id to delivery_notes table

  1. New Columns
    - Add `location_id` column to `delivery_notes` table as UUID with foreign key reference to locations table
  
  2. Security
    - No changes to RLS policies
*/

-- Add location_id column to delivery_notes table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'delivery_notes' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE delivery_notes ADD COLUMN location_id UUID REFERENCES locations(id);
  END IF;
END $$;