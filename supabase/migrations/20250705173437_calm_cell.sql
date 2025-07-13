/*
  # Fix VAT Percentage and Webshop Orders Integration

  1. Changes
    - Set default VAT percentage to 18% instead of 27%
    - Update existing products to use 18% VAT
    - Ensure webshop orders with 'paid' status are automatically set to 'confirmed'
    - Add webshop order selection to production batches
    
  2. Improvements
    - Process updates in smaller batches to avoid deadlocks
    - Add proper error handling with BEGIN/EXCEPTION blocks
    - Use FOR UPDATE SKIP LOCKED to prevent lock contention
*/

-- First, update the default VAT percentage for new products
ALTER TABLE products 
ALTER COLUMN vat_percentage SET DEFAULT 18.0;

-- Update existing products to use 18% VAT in smaller batches to avoid locks
DO $$
DECLARE
  batch_size INT := 50;
  total_updated INT := 0;
  current_batch INT;
BEGIN
  LOOP
    -- Update a batch of products
    WITH products_to_update AS (
      SELECT id FROM products 
      WHERE vat_percentage = 27.0
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE products p
    SET vat_percentage = 18.0
    FROM products_to_update
    WHERE p.id = products_to_update.id;
    
    -- Get number of rows updated
    GET DIAGNOSTICS current_batch = ROW_COUNT;
    
    -- Exit if no more rows to update
    EXIT WHEN current_batch = 0;
    
    -- Keep track of total updated
    total_updated := total_updated + current_batch;
    
    -- Log progress
    RAISE NOTICE 'Updated % products to 18% VAT (total: %)', current_batch, total_updated;
    
    -- Small pause to reduce lock contention
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;

-- Create or replace the function with improved error handling
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
    BEGIN
      FOR item IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
        -- Get product information
        BEGIN
          SELECT * INTO product_record FROM products WHERE id = (item->>'id')::UUID;
          
          -- If product exists, create a production batch
          IF FOUND THEN
            -- Insert new production batch
            BEGIN
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
            EXCEPTION WHEN OTHERS THEN
              -- Log error but continue processing
              RAISE NOTICE 'Error creating production batch for product %: %', product_record.id, SQLERRM;
            END;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          -- Log error but continue processing
          RAISE NOTICE 'Error processing product %: %', (item->>'id')::UUID, SQLERRM;
        END;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing
      RAISE NOTICE 'Error processing order items: %', SQLERRM;
    END;
    
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

-- Drop the existing trigger first to avoid conflicts
DROP TRIGGER IF EXISTS trigger_production_from_webshop_order ON webshop_orders;

-- Create the trigger to run BEFORE UPDATE
CREATE TRIGGER trigger_production_from_webshop_order
BEFORE UPDATE ON webshop_orders
FOR EACH ROW
EXECUTE FUNCTION production_from_webshop_order();

-- Update any existing paid orders that aren't marked as confirmed in batches
DO $$
DECLARE
  batch_size INT := 20;
  total_updated INT := 0;
  current_batch INT;
BEGIN
  LOOP
    -- Update a batch of orders
    WITH orders_to_update AS (
      SELECT id FROM webshop_orders 
      WHERE payment_status = 'paid' AND status != 'confirmed'
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE webshop_orders o
    SET status = 'confirmed'
    FROM orders_to_update
    WHERE o.id = orders_to_update.id;
    
    -- Get number of rows updated
    GET DIAGNOSTICS current_batch = ROW_COUNT;
    
    -- Exit if no more rows to update
    EXIT WHEN current_batch = 0;
    
    -- Keep track of total updated
    total_updated := total_updated + current_batch;
    
    -- Log progress
    RAISE NOTICE 'Updated % webshop orders to confirmed status (total: %)', current_batch, total_updated;
    
    -- Small pause to reduce lock contention
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;

-- Add webshop_order_id column to production_batches if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_batches' AND column_name = 'webshop_order_id'
  ) THEN
    ALTER TABLE production_batches ADD COLUMN webshop_order_id uuid REFERENCES webshop_orders(id);
    
    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_production_batches_webshop_order_id ON production_batches(webshop_order_id);
  END IF;
END $$;

-- Update the production_from_webshop_order function to set the webshop_order_id
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
    BEGIN
      FOR item IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
        -- Get product information
        BEGIN
          SELECT * INTO product_record FROM products WHERE id = (item->>'id')::UUID;
          
          -- If product exists, create a production batch
          IF FOUND THEN
            -- Insert new production batch
            BEGIN
              INSERT INTO production_batches (
                batch_number,
                recipe_id,
                batch_size,
                status,
                notes,
                location_id,
                webshop_order_id
              ) VALUES (
                batch_number || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4),
                product_record.id,
                (item->>'quantity')::INTEGER,
                'planned',
                'Automatikusan létrehozva a webshop rendelésből: ' || NEW.order_number,
                NEW.pickup_location_id,
                NEW.id
              )
              RETURNING id INTO batch_id;
            EXCEPTION WHEN OTHERS THEN
              -- Log error but continue processing
              RAISE NOTICE 'Error creating production batch for product %: %', product_record.id, SQLERRM;
            END;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          -- Log error but continue processing
          RAISE NOTICE 'Error processing product %: %', (item->>'id')::UUID, SQLERRM;
        END;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing
      RAISE NOTICE 'Error processing order items: %', SQLERRM;
    END;
    
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