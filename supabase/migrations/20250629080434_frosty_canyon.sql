/*
  # Create feedback table for user feedback

  1. New Table
    - Add feedback table for storing user feedback
    - Set up proper relationships with users
    - Add RLS policies for security
*/

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

-- Create policies for feedback table
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can manage their own feedback" ON feedback;
  DROP POLICY IF EXISTS "Admins can manage all feedback" ON feedback;
  
  -- Create new policies
  CREATE POLICY "Users can manage their own feedback"
    ON feedback
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid());
  
  CREATE POLICY "Admins can manage all feedback"
    ON feedback
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid() 
        AND (auth.users.raw_user_meta_data->>'role' = 'admin')
      )
    );
END $$;