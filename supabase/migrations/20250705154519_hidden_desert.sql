/*
  # Add notifications table

  1. New Table
    - Create notifications table for storing user notifications
    - Set up proper relationships with users
    - Add RLS policies for security
    
  2. Schema
    - user_id: User who receives the notification
    - title: Notification title
    - message: Notification content
    - type: Type of notification (info, warning, error, success)
    - priority: Priority level (low, normal, high, urgent)
    - read: Whether the notification has been read
    - action_url: Optional URL to navigate to when clicked
    - metadata: Additional data in JSON format
    - expires_at: Optional expiration date
    - created_at: Timestamp when the notification was created
*/

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id),
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info',
  priority text DEFAULT 'normal',
  read boolean DEFAULT false,
  action_url text,
  metadata jsonb DEFAULT '{}',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT notifications_type_check CHECK (type IN ('info', 'warning', 'error', 'success')),
  CONSTRAINT notifications_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$
BEGIN
  -- Check if policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' AND policyname = 'Users can read own notifications'
  ) THEN
    CREATE POLICY "Users can read own notifications"
      ON notifications
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;

  -- Check if policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications"
      ON notifications
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- Check if policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' AND policyname = 'Admins can read all notifications'
  ) THEN
    CREATE POLICY "Admins can read all notifications"
      ON notifications
      FOR SELECT
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
    WHERE tablename = 'notifications' AND policyname = 'Authenticated users can insert notifications'
  ) THEN
    CREATE POLICY "Authenticated users can insert notifications"
      ON notifications
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  -- Check if policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' AND policyname = 'Everyone can read notifications'
  ) THEN
    CREATE POLICY "Everyone can read notifications"
      ON notifications
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Insert some example notifications
INSERT INTO notifications (user_id, title, message, type, priority, read, action_url)
SELECT 
  id, 
  'Üdvözöljük a rendszerben!', 
  'Köszöntjük a Szemesi Pékség adminisztrációs rendszerében. Kattintson ide a kezdéshez.', 
  'info', 
  'normal', 
  false, 
  '/'
FROM profiles
WHERE role = 'admin'
AND NOT EXISTS (
  SELECT 1 FROM notifications 
  WHERE title = 'Üdvözöljük a rendszerben!' 
  AND user_id = profiles.id
)
LIMIT 1;