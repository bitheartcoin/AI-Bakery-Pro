/*
  # Automatic Production for Paid Webshop Orders

  1. New Features
    - Create a trigger function to automatically create production batches for paid webshop orders
    - Add trigger to webshop_orders table to run when payment_status changes to 'paid'
    - This automates the workflow between webshop and production system
  
  2. Changes
    - Create production_from_webshop_order() function
    - Add trigger to webshop_orders table
*/

-- Create a function to automatically create production batches from paid webshop orders
CREATE OR REPLACE FUNCTION production_from_webshop_order()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  batch_id UUID;
  product_record RECORD;
  batch_number TEXT;
BEGIN
  -- Only proceed if payment status changed to 'paid'
  IF (TG_OP = 'UPDATE' AND NEW.payment_status = 'paid' AND OLD.payment_status != 'paid') THEN
    -- Generate a batch number based on order number
    batch_number := 'WEB-' || SUBSTRING(NEW.order_number FROM 5);
    
    -- Loop through each item in the order
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
      -- Get product information
      SELECT * INTO product_record FROM products WHERE id = (item->>'id')::UUID;
      
      -- If product exists, create a production batch
      IF FOUND THEN
        -- Insert new production batch
        INSERT INTO production_batches (
          batch_number,
          recipe_id,
          batch_size,
          status,
          notes,
          location_id
        ) VALUES (
          batch_number || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4),
          product_record.id,
          (item->>'quantity')::INTEGER,
          'planned',
          'Automatikusan létrehozva a webshop rendelésből: ' || NEW.order_number,
          NEW.pickup_location_id
        )
        RETURNING id INTO batch_id;
        
        -- Log the action
        RAISE NOTICE 'Created production batch % for product % from webshop order %', 
          batch_number, 
          product_record.name, 
          NEW.order_number;
      END IF;
    END LOOP;
    
    -- Create a notification for bakers
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      priority,
      read,
      action_url
    )
    SELECT 
      profiles.id,
      'Új webshop rendelés gyártásba',
      'Egy új webshop rendelés (' || NEW.order_number || ') automatikusan gyártásba került.',
      'info',
      'high',
      false,
      '/production'
    FROM profiles
    WHERE role = 'baker';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger on webshop_orders table
DROP TRIGGER IF EXISTS trigger_production_from_webshop_order ON webshop_orders;

CREATE TRIGGER trigger_production_from_webshop_order
AFTER UPDATE ON webshop_orders
FOR EACH ROW
EXECUTE FUNCTION production_from_webshop_order();

-- Create webshop_orders table if it doesn't exist (for development environments)
CREATE TABLE IF NOT EXISTS webshop_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES profiles(id),
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  customer_address text,
  items jsonb NOT NULL DEFAULT '[]',
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  status text DEFAULT 'pending',
  payment_method text,
  payment_status text DEFAULT 'pending',
  transaction_id text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  pickup_location_id uuid REFERENCES locations(id),
  pickup_date timestamptz,
  need_invoice boolean DEFAULT false,
  invoice_data jsonb DEFAULT '{}'
);

-- Add RLS policies if the table was just created
DO $$
BEGIN
  -- Enable RLS if not already enabled
  ALTER TABLE webshop_orders ENABLE ROW LEVEL SECURITY;
  
  -- Check if policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'webshop_orders' AND policyname = 'Admins and salespersons can manage all orders'
  ) THEN
    CREATE POLICY "Admins and salespersons can manage all orders"
      ON webshop_orders
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = ANY (ARRAY['admin', 'salesperson'])
        )
      );
  END IF;

  -- Check if policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'webshop_orders' AND policyname = 'Customers can view their own orders'
  ) THEN
    CREATE POLICY "Customers can view their own orders"
      ON webshop_orders
      FOR SELECT
      TO authenticated
      USING (
        (customer_id = auth.uid() OR customer_id IS NULL)
      );
  END IF;
END $$;

-- Create a trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_webshop_orders_updated_at'
  ) THEN
    CREATE TRIGGER update_webshop_orders_updated_at
    BEFORE UPDATE ON webshop_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;