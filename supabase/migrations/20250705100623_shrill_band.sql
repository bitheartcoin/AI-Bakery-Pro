/*
  # Add Delivery Notes Table

  1. New Table
    - Create delivery_notes table for tracking deliveries
    - Set up proper relationships with orders, drivers, and vehicles
    - Add RLS policies for security
    
  2. Schema Changes
    - Add driver_id and vehicle_id to orders table
*/

-- Create delivery_notes table if it doesn't exist
CREATE TABLE IF NOT EXISTS delivery_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id),
  order_number text NOT NULL,
  batch_id uuid REFERENCES production_batches(id),
  status text NOT NULL DEFAULT 'pending',
  driver_id uuid REFERENCES profiles(id),
  vehicle_id uuid REFERENCES vehicles(id),
  customer_name text NOT NULL,
  customer_address text,
  items jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  delivery_date timestamptz,
  notes text,
  
  CONSTRAINT delivery_notes_status_check CHECK (status IN ('pending', 'in_progress', 'delivered', 'cancelled'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_delivery_notes_order_id ON delivery_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_batch_id ON delivery_notes(batch_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_driver_id ON delivery_notes(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_vehicle_id ON delivery_notes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_status ON delivery_notes(status);

-- Enable RLS
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;

-- Create policies only if they don't exist
DO $$
BEGIN
  -- Check if policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'delivery_notes' AND policyname = 'Admins can manage all delivery notes'
  ) THEN
    CREATE POLICY "Admins can manage all delivery notes"
      ON delivery_notes
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;

  -- Check if policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'delivery_notes' AND policyname = 'Drivers can view and update their own delivery notes'
  ) THEN
    CREATE POLICY "Drivers can view and update their own delivery notes"
      ON delivery_notes
      FOR ALL
      TO authenticated
      USING (
        driver_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'driver'
        )
      )
      WITH CHECK (
        driver_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'driver'
        )
      );
  END IF;

  -- Check if policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'delivery_notes' AND policyname = 'Everyone can read delivery notes'
  ) THEN
    CREATE POLICY "Everyone can read delivery notes"
      ON delivery_notes
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_delivery_notes_updated_at'
  ) THEN
    CREATE TRIGGER update_delivery_notes_updated_at
    BEFORE UPDATE ON delivery_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add driver_id and vehicle_id to orders table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'driver_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN driver_id uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'vehicle_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN vehicle_id uuid REFERENCES vehicles(id);
  END IF;
END $$;