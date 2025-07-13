/*
  # Add Storage Bucket for Product Images

  1. New Features
    - Creates a storage bucket for product images
    - Sets up public access policies for the bucket
    - Ensures images can be uploaded and accessed by authenticated users
*/

-- Create storage bucket for product images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the images bucket
DO $$
BEGIN
  -- Allow authenticated users to upload images
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'Authenticated users can upload images'
  ) THEN
    CREATE POLICY "Authenticated users can upload images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'images' AND
      (storage.foldername(name))[1] = 'products'
    );
  END IF;

  -- Allow anyone to view images
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'Anyone can view images'
  ) THEN
    CREATE POLICY "Anyone can view images"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'images');
  END IF;

  -- Allow authenticated users to update their own images
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'Authenticated users can update their own images'
  ) THEN
    CREATE POLICY "Authenticated users can update their own images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'images')
    WITH CHECK (bucket_id = 'images');
  END IF;

  -- Allow authenticated users to delete their own images
  IF NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE name = 'Authenticated users can delete their own images'
  ) THEN
    CREATE POLICY "Authenticated users can delete their own images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'images');
  END IF;
END $$;