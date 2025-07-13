/*
  # Add partner_id to locations table

  1. New Fields
    - Add `partner_id` field to locations table to link locations to partner companies
  
  2. Foreign Keys
    - Add foreign key constraint to link locations to partner_companies
*/

-- Add partner_id column to locations table
ALTER TABLE IF EXISTS public.locations
ADD COLUMN partner_id uuid REFERENCES public.partner_companies(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_locations_partner_id ON public.locations(partner_id);

-- Update RLS policies to allow partners to manage their own locations
CREATE POLICY "Partners can view their own locations" 
ON public.locations
FOR SELECT
TO authenticated
USING (
  partner_id IN (
    SELECT partner_id FROM partner_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Partners can update their own locations" 
ON public.locations
FOR UPDATE
TO authenticated
USING (
  partner_id IN (
    SELECT partner_id FROM partner_users WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  partner_id IN (
    SELECT partner_id FROM partner_users WHERE user_id = auth.uid()
  )
);