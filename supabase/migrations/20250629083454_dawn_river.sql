-- Fix admin user role
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Find the admin user by email
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@szemesipekseg.hu';
  
  -- If admin user exists, update their role in profiles table
  IF admin_user_id IS NOT NULL THEN
    -- Update the role in profiles table
    UPDATE profiles
    SET role = 'admin'
    WHERE id = admin_user_id;
    
    -- Update the role in user_metadata
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"admin"')
    WHERE id = admin_user_id;
    
    RAISE NOTICE 'Admin user role updated successfully';
  ELSE
    RAISE NOTICE 'Admin user not found';
  END IF;
END $$;

-- Create a new admin user if none exists
DO $$
DECLARE
  admin_exists boolean;
  admin_id uuid;
BEGIN
  -- Check if admin user exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = 'admin@szemesipekseg.hu'
  ) INTO admin_exists;
  
  IF NOT admin_exists THEN
    -- Create admin user
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@szemesipekseg.hu',
      crypt('admin123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"role": "admin", "full_name": "Admin Felhasználó"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO admin_id;
    
    -- Create admin profile
    IF admin_id IS NOT NULL THEN
      INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        status,
        created_at,
        updated_at
      )
      VALUES (
        admin_id,
        'admin@szemesipekseg.hu',
        'Admin Felhasználó',
        'admin',
        'active',
        now(),
        now()
      );
    END IF;
  END IF;
END $$;