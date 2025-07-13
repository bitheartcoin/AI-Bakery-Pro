/*
  # Fix VAT percentage and webshop orders processing

  1. Changes
    - Update default VAT percentage from 27% to 18%
    - Fix webshop orders to properly change status to 'confirmed' when paid
    - Restructure trigger to avoid deadlocks
*/

-- Update default VAT percentage to 18% for new products
ALTER TABLE products 
ALTER COLUMN vat_percentage SET DEFAULT 18.0;

-- Update existing products to use 18% VAT (in smaller batches to avoid locks)
DO $$
DECLARE
  product_id UUID;
BEGIN
  FOR product_id IN SELECT id FROM products WHERE vat_percentage = 27.0 LIMIT 100
  LOOP
    UPDATE products SET vat_percentage = 18.0 WHERE id = product_id;
  END LOOP;
END $$;

-- Drop the existing trigger first to avoid conflicts
DROP TRIGGER IF EXISTS trigger_production_from_webshop_order ON webshop_orders;

-- Create or replace the function with improved logic
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
    -- CRITICAL: Always set status to 'confirmed' when payment_status is 'paid'
    NEW.status := 'confirmed';
    
    -- Generate a batch number based on order number
    batch_number := 'WEB-' || SUBSTRING(NEW.order_number FROM 5);
    
    -- Loop through each item in the order
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
      -- Get product information
      BEGIN
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
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Log error but continue processing
        RAISE NOTICE 'Error processing product %: %', (item->>'id')::UUID, SQLERRM;
      END;
    END LOOP;
    
    -- Create a notification for bakers
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing
      RAISE NOTICE 'Error creating notifications: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger to run BEFORE UPDATE
CREATE TRIGGER trigger_production_from_webshop_order
BEFORE UPDATE ON webshop_orders
FOR EACH ROW
EXECUTE FUNCTION production_from_webshop_order();

-- Update any existing paid orders that aren't marked as confirmed
-- Do this in a separate transaction with a limit to avoid locks
DO $$
DECLARE
  order_id UUID;
BEGIN
  FOR order_id IN SELECT id FROM webshop_orders WHERE payment_status = 'paid' AND status != 'confirmed' LIMIT 50
  LOOP
    UPDATE webshop_orders SET status = 'confirmed' WHERE id = order_id;
  END LOOP;
END $$;