-- Create admin user if it doesn't exist
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