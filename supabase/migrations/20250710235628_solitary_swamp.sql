-- Add 'partner' to the allowed roles in profiles
DO $$
BEGIN
  -- Check if the constraint already exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_role_check'
  ) THEN
    -- Drop the existing constraint
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
    
    -- Add the new constraint with 'partner' role
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role = ANY (ARRAY['admin'::text, 'baker'::text, 'salesperson'::text, 'driver'::text, 'partner'::text]));
  END IF;
END $$;

-- Drop the function if it exists to avoid the parameter naming error
DROP FUNCTION IF EXISTS create_partner_user(TEXT, TEXT, TEXT, UUID, BOOLEAN);

-- Create a function to create partner user accounts that works with Supabase auth
CREATE OR REPLACE FUNCTION create_partner_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_partner_id UUID,
  p_is_admin BOOLEAN DEFAULT false
) RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
  user_exists BOOLEAN;
BEGIN
  -- Check if user already exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = p_email
  ) INTO user_exists;
  
  IF user_exists THEN
    -- Get existing user ID
    SELECT id INTO new_user_id FROM auth.users WHERE email = p_email;
  ELSE
    -- Generate a new UUID for the user
    new_user_id := gen_random_uuid();
    
    -- Insert into auth.users with the pre-generated UUID
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      last_sign_in_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      confirmation_sent_at,
      recovery_sent_at,
      email_change_sent_at,
      aud,
      role
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      p_email,
      crypt(p_password, gen_salt('bf')),
      now(),
      jsonb_build_object(
        'full_name', p_full_name,
        'partner_id', p_partner_id,
        'is_partner', true
      ),
      now(),
      now(),
      now(),
      '',
      '',
      '',
      '',
      now(),
      now(),
      now(),
      'authenticated',
      'authenticated'
    );
  END IF;
  
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = new_user_id) THEN
    -- Create profile
    INSERT INTO public.profiles (
      id,
      full_name,
      email,
      role,
      status
    ) VALUES (
      new_user_id,
      p_full_name,
      p_email,
      'partner',
      'active'
    );
  END IF;
  
  -- Check if partner_user association exists
  IF NOT EXISTS (
    SELECT 1 FROM public.partner_users 
    WHERE user_id = new_user_id AND partner_id = p_partner_id
  ) THEN
    -- Create partner_user association
    INSERT INTO public.partner_users (
      user_id,
      partner_id,
      role,
      is_admin
    ) VALUES (
      new_user_id,
      p_partner_id,
      CASE WHEN p_is_admin THEN 'admin' ELSE 'member' END,
      p_is_admin
    );
  END IF;
  
  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a sample partner user (only if partner_companies table exists and has data)
DO $$
DECLARE
  partner_id UUID;
  partner_exists BOOLEAN;
BEGIN
  -- Check if partner_companies table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'partner_companies'
  ) INTO partner_exists;
  
  IF partner_exists THEN
    -- Get the first partner company
    SELECT id INTO partner_id FROM partner_companies LIMIT 1;
    
    -- Only create if we have a partner and the user doesn't exist
    IF partner_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM auth.users WHERE email = 'partner@example.com'
    ) THEN
      PERFORM create_partner_user(
        'partner@example.com',
        'partner123',
        'Partner User',
        partner_id,
        true
      );
    END IF;
  END IF;
END $$;

-- Create a table for default orders if it doesn't exist
CREATE TABLE IF NOT EXISTS default_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id uuid REFERENCES partner_companies(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on default_orders
ALTER TABLE default_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for default_orders
DO $$
BEGIN
  -- Check if policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'default_orders' AND policyname = 'Admins can manage all default orders'
  ) THEN
    CREATE POLICY "Admins can manage all default orders"
      ON default_orders
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
      WITH CHECK (
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
    WHERE tablename = 'default_orders' AND policyname = 'Partners can view their own default orders'
  ) THEN
    CREATE POLICY "Partners can view their own default orders"
      ON default_orders
      FOR SELECT
      TO authenticated
      USING (
        partner_id IN (
          SELECT partner_id
          FROM partner_users
          WHERE user_id = auth.uid()
        )
      );
  END IF;

  -- Check if policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'default_orders' AND policyname = 'Partners can update their own default orders'
  ) THEN
    CREATE POLICY "Partners can update their own default orders"
      ON default_orders
      FOR UPDATE
      TO authenticated
      USING (
        partner_id IN (
          SELECT partner_id
          FROM partner_users
          WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        partner_id IN (
          SELECT partner_id
          FROM partner_users
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Create a trigger to update updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_default_orders_updated_at'
  ) THEN
    CREATE TRIGGER update_default_orders_updated_at
      BEFORE UPDATE ON default_orders
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create a table for previous orders if it doesn't exist
CREATE TABLE IF NOT EXISTS previous_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id uuid REFERENCES partner_companies(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  order_date date NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on previous_orders
ALTER TABLE previous_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for previous_orders
DO $$
BEGIN
  -- Check if policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'previous_orders' AND policyname = 'Admins can manage all previous orders'
  ) THEN
    CREATE POLICY "Admins can manage all previous orders"
      ON previous_orders
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
    WHERE tablename = 'previous_orders' AND policyname = 'Partners can view their own previous orders'
  ) THEN
    CREATE POLICY "Partners can view their own previous orders"
      ON previous_orders
      FOR SELECT
      TO authenticated
      USING (
        partner_id IN (
          SELECT partner_id
          FROM partner_users
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Create a function to save previous orders
CREATE OR REPLACE FUNCTION save_previous_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Only save completed orders for partners
  IF NEW.status = 'completed' AND NEW.customer_id IS NOT NULL THEN
    -- Insert into previous_orders
    INSERT INTO previous_orders (
      partner_id,
      order_id,
      order_date,
      items
    ) VALUES (
      NEW.customer_id,
      NEW.id,
      CURRENT_DATE,
      NEW.items
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to save previous orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_save_previous_order'
  ) THEN
    CREATE TRIGGER trigger_save_previous_order
      AFTER UPDATE OF status ON orders
      FOR EACH ROW
      WHEN (NEW.status = 'completed')
      EXECUTE FUNCTION save_previous_order();
  END IF;
END $$;