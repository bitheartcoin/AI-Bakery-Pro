/*
  # Fix webshop order status and production trigger

  1. Changes
    - Update the production_from_webshop_order function to run BEFORE UPDATE instead of AFTER
    - Ensure status is set to 'confirmed' when payment_status changes to 'paid'
    - Fix any existing paid orders that aren't marked as confirmed
    - Improve the production batch creation process
*/

-- Update the production_from_webshop_order function to ensure orders are properly confirmed
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

-- Recreate the trigger to ensure it runs BEFORE UPDATE (not AFTER)
DROP TRIGGER IF EXISTS trigger_production_from_webshop_order ON webshop_orders;

CREATE TRIGGER trigger_production_from_webshop_order
BEFORE UPDATE ON webshop_orders
FOR EACH ROW
EXECUTE FUNCTION production_from_webshop_order();

-- Update any existing paid orders that aren't marked as confirmed
UPDATE webshop_orders
SET status = 'confirmed'
WHERE payment_status = 'paid' AND status != 'confirmed';