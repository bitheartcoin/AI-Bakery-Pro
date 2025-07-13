/*
  # Create trigger for automatic delivery note generation

  1. New Functions
    - `generate_delivery_note_on_batch_completion` - Automatically creates delivery notes when a production batch is completed
  
  2. Triggers
    - Add trigger on production_batches table to call the function when status is updated to 'completed'
  
  3. Security
    - Enable RLS on all tables
    - Add appropriate policies
*/

-- Function to generate delivery notes when a production batch is completed
CREATE OR REPLACE FUNCTION generate_delivery_note_on_batch_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_customer_name TEXT;
  v_customer_address TEXT;
  v_items JSONB;
  v_location_id UUID;
BEGIN
  -- Check if this batch is linked to an order
  SELECT order_id INTO v_order_id
  FROM production_batches_orders
  WHERE batch_id = NEW.id
  LIMIT 1;
  
  -- If no direct order link, check if there's a webshop order
  IF v_order_id IS NULL AND NEW.webshop_order_id IS NOT NULL THEN
    -- Try to find a regular order linked to this webshop order
    SELECT id INTO v_order_id
    FROM orders
    WHERE webshop_order_id = NEW.webshop_order_id
    LIMIT 1;
  END IF;
  
  -- If we have an order, get its details
  IF v_order_id IS NOT NULL THEN
    SELECT 
      order_number, 
      customer_name, 
      customer_address,
      items,
      location_id
    INTO 
      v_order_number, 
      v_customer_name, 
      v_customer_address,
      v_items,
      v_location_id
    FROM orders
    WHERE id = v_order_id;
  ELSE
    -- No order found, use batch information
    v_order_number := 'SZL-' || to_char(now(), 'YYYYMMDD') || '-' || floor(random() * 10000)::text;
    
    -- Get product name from recipe
    SELECT 
      p.name INTO v_customer_name
    FROM 
      products p
    WHERE 
      p.id = NEW.recipe_id;
      
    v_customer_name := COALESCE(v_customer_name, 'Belső gyártás');
    v_customer_address := NULL;
    
    -- Create items array with the product
    v_items := json_build_array(
      json_build_object(
        'product_id', NEW.recipe_id,
        'product_name', v_customer_name,
        'quantity', NEW.batch_size
      )
    )::jsonb;
    
    v_location_id := NEW.location_id;
  END IF;
  
  -- Create delivery note
  INSERT INTO delivery_notes (
    order_id,
    order_number,
    batch_id,
    status,
    customer_name,
    customer_address,
    items,
    location_id
  ) VALUES (
    v_order_id,
    v_order_number,
    NEW.id,
    'pending',
    v_customer_name,
    v_customer_address,
    v_items,
    v_location_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on production_batches table
DROP TRIGGER IF EXISTS trigger_generate_delivery_note_on_batch_completion ON production_batches;
CREATE TRIGGER trigger_generate_delivery_note_on_batch_completion
AFTER UPDATE OF status ON production_batches
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION generate_delivery_note_on_batch_completion();

-- Enable RLS on delivery_notes if not already enabled
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;

-- Add policies for delivery_notes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'delivery_notes' AND policyname = 'Admins can manage all delivery notes'
  ) THEN
    CREATE POLICY "Admins can manage all delivery notes"
      ON delivery_notes
      FOR ALL
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      ));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'delivery_notes' AND policyname = 'Drivers can view and update their own delivery notes'
  ) THEN
    CREATE POLICY "Drivers can view and update their own delivery notes"
      ON delivery_notes
      FOR ALL
      TO authenticated
      USING (
        driver_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'driver'
        )
      )
      WITH CHECK (
        driver_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'driver'
        )
      );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'delivery_notes' AND policyname = 'Everyone can read delivery notes'
  ) THEN
    CREATE POLICY "Everyone can read delivery notes"
      ON delivery_notes
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;