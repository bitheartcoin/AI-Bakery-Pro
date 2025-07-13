/*
  # Add storage bucket for product images

  1. New Features
    - Creates a storage bucket for product images
    - Sets up public access for product images
    - Enables RLS policies for secure access
*/

-- Create a storage bucket for product images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Create a policy to allow authenticated users to upload images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'Authenticated users can upload images'
  ) THEN
    CREATE POLICY "Authenticated users can upload images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'images');
  END IF;
END $$;

-- Create a policy to allow public access to images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'Public can view images'
  ) THEN
    CREATE POLICY "Public can view images"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'images');
  END IF;
END $$;

-- Create a policy to allow authenticated users to update their own images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'Authenticated users can update their own images'
  ) THEN
    CREATE POLICY "Authenticated users can update their own images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'images' AND owner = auth.uid())
    WITH CHECK (bucket_id = 'images' AND owner = auth.uid());
  END IF;
END $$;

-- Create a policy to allow authenticated users to delete their own images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'Authenticated users can delete their own images'
  ) THEN
    CREATE POLICY "Authenticated users can delete their own images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'images' AND owner = auth.uid());
  END IF;
END $$;

-- Create a folder structure for product images
INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES 
  ('images', 'product-images/', auth.uid(), '{"mimetype": "application/x-directory"}')
ON CONFLICT (bucket_id, name) DO NOTHING;