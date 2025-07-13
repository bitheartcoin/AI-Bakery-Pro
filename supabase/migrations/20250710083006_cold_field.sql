/*
  # Add recipe ingredients calculation functionality

  1. New Features
    - Add function to calculate required ingredients for a production batch
    - Create a view to show ingredient requirements for each batch
    - Add trigger to update inventory when a batch is completed
  
  2. Changes
    - Create calculate_batch_ingredients function
    - Create batch_ingredients view
    - Add trigger on production_batches table
*/

-- Create a function to calculate required ingredients for a production batch
CREATE OR REPLACE FUNCTION calculate_batch_ingredients(batch_id UUID)
RETURNS TABLE (
  ingredient_name TEXT,
  required_amount NUMERIC,
  unit TEXT
) AS $$
DECLARE
  recipe_id UUID;
  batch_size INTEGER;
  recipe_ingredients JSONB;
BEGIN
  -- Get the recipe ID and batch size
  SELECT pb.recipe_id, pb.batch_size INTO recipe_id, batch_size
  FROM production_batches pb
  WHERE pb.id = batch_id;
  
  -- Get the recipe ingredients
  SELECT p.ingredients INTO recipe_ingredients
  FROM products p
  WHERE p.id = recipe_id;
  
  -- Calculate required ingredients based on batch size
  RETURN QUERY
  SELECT 
    (ingredient->>'name')::TEXT AS ingredient_name,
    (ingredient->>'amount')::NUMERIC * batch_size AS required_amount,
    (ingredient->>'unit')::TEXT AS unit
  FROM jsonb_array_elements(recipe_ingredients) AS ingredient;
END;
$$ LANGUAGE plpgsql;

-- Create a view to show ingredient requirements for each batch
CREATE OR REPLACE VIEW batch_ingredients AS
SELECT 
  pb.id AS batch_id,
  pb.batch_number,
  pb.recipe_id,
  p.name AS recipe_name,
  pb.batch_size,
  pb.status,
  ing.ingredient_name,
  ing.required_amount,
  ing.unit
FROM 
  production_batches pb
  JOIN products p ON pb.recipe_id = p.id
  CROSS JOIN LATERAL calculate_batch_ingredients(pb.id) AS ing;

-- Create a function to update inventory when a batch is completed
CREATE OR REPLACE FUNCTION update_inventory_on_batch_completion()
RETURNS TRIGGER AS $$
DECLARE
  ingredient RECORD;
  inventory_item_id UUID;
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

-- Create a trigger on production_batches table
DROP TRIGGER IF EXISTS trigger_update_inventory_on_batch_completion ON production_batches;

CREATE TRIGGER trigger_update_inventory_on_batch_completion
AFTER UPDATE ON production_batches
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_batch_completion();