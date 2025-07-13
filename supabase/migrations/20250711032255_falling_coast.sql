/*
  # Add partner delivery addresses table

  1. New Tables
    - `partner_delivery_addresses`
      - `id` (uuid, primary key)
      - `partner_id` (uuid, foreign key to partner_companies)
      - `address` (text)
      - `contact_person` (text)
      - `phone` (text)
      - `email` (text)
      - `notes` (text)
      - `is_default` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `partner_delivery_addresses` table
    - Add policies for admins and partners
*/

-- Create partner_delivery_addresses table
CREATE TABLE IF NOT EXISTS partner_delivery_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partner_companies(id) ON DELETE CASCADE,
  address text NOT NULL,
  contact_person text,
  phone text,
  email text,
  notes text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on partner_id
CREATE INDEX IF NOT EXISTS idx_partner_delivery_addresses_partner_id ON partner_delivery_addresses(partner_id);

-- Create trigger for updated_at
CREATE TRIGGER update_partner_delivery_addresses_updated_at
BEFORE UPDATE ON partner_delivery_addresses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE partner_delivery_addresses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all partner delivery addresses"
  ON partner_delivery_addresses
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Partners can view their own delivery addresses"
  ON partner_delivery_addresses
  FOR SELECT
  TO authenticated
  USING (
    partner_id IN (
      SELECT partner_users.partner_id
      FROM partner_users
      WHERE partner_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Partners can update their own delivery addresses"
  ON partner_delivery_addresses
  FOR UPDATE
  TO authenticated
  USING (
    partner_id IN (
      SELECT partner_users.partner_id
      FROM partner_users
      WHERE partner_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    partner_id IN (
      SELECT partner_users.partner_id
      FROM partner_users
      WHERE partner_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Partners can insert their own delivery addresses"
  ON partner_delivery_addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    partner_id IN (
      SELECT partner_users.partner_id
      FROM partner_users
      WHERE partner_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Partners can delete their own delivery addresses"
  ON partner_delivery_addresses
  FOR DELETE
  TO authenticated
  USING (
    partner_id IN (
      SELECT partner_users.partner_id
      FROM partner_users
      WHERE partner_users.user_id = auth.uid()
    )
  );