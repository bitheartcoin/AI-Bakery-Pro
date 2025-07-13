/*
  # Fix multiple system issues

  1. New Features
    - Add automatic payment calculation based on work logs
    - Generate delivery notes when production batches are completed
    - Fix webshop order integration with production
    - Update dashboard to show sales data
    
  2. Changes
    - Create function to calculate payments from work logs
    - Create trigger to generate delivery notes on batch completion
    - Fix dashboard stats calculation
    - Add partner type to locations
*/

-- Create a function to calculate payments from work logs
CREATE OR REPLACE FUNCTION calculate_payment_from_work_logs(employee_id UUID, start_date DATE, end_date DATE)
RETURNS NUMERIC AS $$
DECLARE
  total_payment NUMERIC := 0;
  hourly_wage NUMERIC;
  total_hours NUMERIC := 0;
BEGIN
  -- Get employee's hourly wage
  SELECT p.hourly_wage INTO hourly_wage
  FROM profiles p
  WHERE p.id = employee_id;
  
  -- If no hourly wage is set, return 0
  IF hourly_wage IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate total hours worked
  SELECT COALESCE(SUM(duration) / 3600.0, 0) INTO total_hours
  FROM work_logs
  WHERE work_logs.employee_id = calculate_payment_from_work_logs.employee_id
    AND work_logs.status = 'completed'
    AND DATE(work_logs.start_time) BETWEEN start_date AND end_date;
  
  -- Calculate total payment
  total_payment := total_hours * hourly_wage;
  
  RETURN total_payment;
END;
$$ LANGUAGE plpgsql;

-- Create a function to generate delivery notes when production batches are completed
CREATE OR REPLACE FUNCTION generate_delivery_note_on_batch_completion()
RETURNS TRIGGER AS $$
DECLARE
  delivery_note_id UUID;
  product_name TEXT;
  order_id UUID;
  order_number TEXT;
  customer_name TEXT;
  customer_address TEXT;
  location_id UUID;
BEGIN
  -- Only proceed if status changed to 'completed'
  IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') THEN
    -- Get product name
    SELECT name INTO product_name
    FROM products
    WHERE id = NEW.recipe_id;
    
    -- Check if this batch is associated with a webshop order
    IF NEW.webshop_order_id IS NOT NULL THEN
      -- Get order details from webshop_orders
      SELECT 
        id, 
        order_number, 
        customer_name, 
        customer_address,
        pickup_location_id
      INTO 
        order_id, 
        order_number, 
        customer_name, 
        customer_address,
        location_id
      FROM webshop_orders
      WHERE id = NEW.webshop_order_id;
    ELSE
      -- Use batch information
      order_id := NULL;
      order_number := 'SZL-' || NEW.batch_number;
      customer_name := 'Belső szállítás';
      customer_address := NULL;
      location_id := NEW.location_id;
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
      location_id,
      created_at,
      updated_at
    ) VALUES (
      order_id,
      order_number,
      NEW.id,
      'pending',
      customer_name,
      customer_address,
      jsonb_build_array(
        jsonb_build_object(
          'product_id', NEW.recipe_id,
          'product_name', product_name,
          'quantity', NEW.batch_size,
          'unit', 'db'
        )
      ),
      location_id,
      now(),
      now()
    )
    RETURNING id INTO delivery_note_id;
    
    -- Create notification for drivers
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
      'Új szállítólevél létrehozva',
      'Egy új szállítólevél (' || order_number || ') automatikusan létrejött egy gyártási tétel befejezésekor.',
      'info',
      'normal',
      false,
      '/delivery-notes'
    FROM profiles
    WHERE role = 'driver';
    
    RAISE NOTICE 'Created delivery note % for batch %', delivery_note_id, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger on production_batches table
DROP TRIGGER IF EXISTS trigger_generate_delivery_note_on_batch_completion ON production_batches;

CREATE TRIGGER trigger_generate_delivery_note_on_batch_completion
AFTER UPDATE ON production_batches
FOR EACH ROW
EXECUTE FUNCTION generate_delivery_note_on_batch_completion();

-- Add partner type to locations if not exists
DO $$
BEGIN
  -- Check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'locations_type_check'
  ) THEN
    -- Add the constraint
    ALTER TABLE locations
    ADD CONSTRAINT locations_type_check
    CHECK (type = ANY (ARRAY['store', 'warehouse', 'production', 'partner']));
  ELSE
    -- Update the constraint to include 'partner'
    ALTER TABLE locations DROP CONSTRAINT locations_type_check;
    ALTER TABLE locations
    ADD CONSTRAINT locations_type_check
    CHECK (type = ANY (ARRAY['store', 'warehouse', 'production', 'partner']));
  END IF;
END $$;

-- Create a function to update dashboard stats
CREATE OR REPLACE FUNCTION update_dashboard_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats in settings table
  -- Daily revenue
  IF TG_TABLE_NAME = 'orders' AND NEW.status = 'completed' THEN
    -- Update daily revenue
    INSERT INTO settings (category, key, value, description, is_public)
    VALUES (
      'dashboard', 
      'daily_revenue', 
      (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM orders
        WHERE DATE(created_at) = CURRENT_DATE
        AND status = 'completed'
      )::text,
      'Daily revenue for dashboard',
      true
    )
    ON CONFLICT (category, key) 
    DO UPDATE SET 
      value = (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM orders
        WHERE DATE(created_at) = CURRENT_DATE
        AND status = 'completed'
      )::text,
      updated_at = now();
    
    -- Update completed orders count
    INSERT INTO settings (category, key, value, description, is_public)
    VALUES (
      'dashboard', 
      'completed_orders', 
      (
        SELECT COUNT(*)
        FROM orders
        WHERE status = 'completed'
        AND DATE(created_at) = CURRENT_DATE
      )::text,
      'Completed orders count for dashboard',
      true
    )
    ON CONFLICT (category, key) 
    DO UPDATE SET 
      value = (
        SELECT COUNT(*)
        FROM orders
        WHERE status = 'completed'
        AND DATE(created_at) = CURRENT_DATE
      )::text,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for dashboard stats
DROP TRIGGER IF EXISTS trigger_update_dashboard_stats_orders ON orders;

CREATE TRIGGER trigger_update_dashboard_stats_orders
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_dashboard_stats();

-- Initialize dashboard stats
INSERT INTO settings (category, key, value, description, is_public)
VALUES 
  ('dashboard', 'daily_revenue', '0', 'Daily revenue for dashboard', true),
  ('dashboard', 'completed_orders', '0', 'Completed orders count for dashboard', true),
  ('dashboard', 'low_stock_count', '0', 'Low stock items count for dashboard', true)
ON CONFLICT (category, key) DO NOTHING;

-- Update inventory trigger to update dashboard stats
CREATE OR REPLACE FUNCTION update_inventory_on_batch_completion()
RETURNS TRIGGER AS $$
DECLARE
  ingredient RECORD;
  inventory_item_id UUID;
  low_stock_count INTEGER := 0;
BEGIN
  -- Only proceed if status changed to 'completed'
  IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') THEN
    -- Loop through each required ingredient
    FOR ingredient IN 
      SELECT * FROM calculate_batch_ingredients(NEW.id)
    LOOP
      -- Find the inventory item
      SELECT id INTO inventory_item_id
      FROM inventory
      WHERE name ILIKE ingredient.ingredient_name
      AND unit = ingredient.unit
      LIMIT 1;
      
      -- If inventory item exists, update it
      IF inventory_item_id IS NOT NULL THEN
        UPDATE inventory
        SET current_stock = current_stock - ingredient.required_amount
        WHERE id = inventory_item_id;
        
        -- Log the action
        RAISE NOTICE 'Updated inventory for %: reduced by % %', 
          ingredient.ingredient_name, 
          ingredient.required_amount,
          ingredient.unit;
      END IF;
    END LOOP;
    
    -- Count low stock items
    SELECT COUNT(*) INTO low_stock_count
    FROM inventory
    WHERE current_stock <= min_threshold;
    
    -- Update dashboard stats for low stock
    INSERT INTO settings (category, key, value, description, is_public)
    VALUES ('dashboard', 'low_stock_count', low_stock_count::text, 'Low stock items count for dashboard', true)
    ON CONFLICT (category, key) 
    DO UPDATE SET 
      value = low_stock_count::text,
      updated_at = now();
    
    -- Create a notification for inventory manager if any items are below threshold
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
      'Alacsony készlet figyelmeztetés',
      'Egy gyártási tétel befejezése után egyes alapanyagok készlete a minimum szint alá csökkent.',
      'warning',
      'high',
      false,
      '/inventory'
    FROM profiles
    WHERE role = 'admin'
    AND EXISTS (
      SELECT 1 FROM inventory
      WHERE current_stock <= min_threshold
    )
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_update_inventory_on_batch_completion ON production_batches;

CREATE TRIGGER trigger_update_inventory_on_batch_completion
AFTER UPDATE ON production_batches
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_batch_completion();