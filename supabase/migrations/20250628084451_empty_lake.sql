-- Add barcode and QR code fields to inventory table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE inventory ADD COLUMN barcode text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory' AND column_name = 'qr_code'
  ) THEN
    ALTER TABLE inventory ADD COLUMN qr_code text;
  END IF;
END $$;

-- Create indexes for faster barcode/QR code lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inventory_barcode'
  ) THEN
    CREATE INDEX idx_inventory_barcode ON inventory(barcode);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inventory_qr_code'
  ) THEN
    CREATE INDEX idx_inventory_qr_code ON inventory(qr_code);
  END IF;
END $$;

-- Fix RLS policies for inventory table
DO $$
BEGIN
  -- Drop existing problematic policies if they exist
  DROP POLICY IF EXISTS "Everyone can read inventory" ON inventory;
  DROP POLICY IF EXISTS "Admins and bakers can manage inventory" ON inventory;
  DROP POLICY IF EXISTS "Authenticated users can read inventory" ON inventory;
  DROP POLICY IF EXISTS "Authenticated users can manage inventory" ON inventory;
  
  -- Create new policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inventory' AND policyname = 'Everyone can read inventory'
  ) THEN
    CREATE POLICY "Everyone can read inventory"
      ON inventory
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inventory' AND policyname = 'Authenticated users can manage inventory'
  ) THEN
    CREATE POLICY "Authenticated users can manage inventory"
      ON inventory
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Create feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  message text NOT NULL,
  status text DEFAULT 'pending',
  admin_response text,
  responded_by uuid REFERENCES profiles(id),
  responded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT feedback_status_check CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected'))
);

-- Create indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_feedback_user_id'
  ) THEN
    CREATE INDEX idx_feedback_user_id ON feedback(user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_feedback_status'
  ) THEN
    CREATE INDEX idx_feedback_status ON feedback(status);
  END IF;
END $$;

-- Enable RLS on feedback table
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for feedback table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'feedback' AND policyname = 'Users can manage their own feedback'
  ) THEN
    CREATE POLICY "Users can manage their own feedback"
      ON feedback
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'feedback' AND policyname = 'Admins can manage all feedback'
  ) THEN
    CREATE POLICY "Admins can manage all feedback"
      ON feedback
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
END $$;