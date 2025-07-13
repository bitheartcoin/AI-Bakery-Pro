/*
  # Add trigger for automatic delivery note generation

  1. New Functions
    - `generate_delivery_note_on_batch_completion` function that creates a delivery note when a production batch is completed
  
  2. New Triggers
    - Trigger on production_batches table that fires when status changes to 'completed'
*/

-- Create function to generate delivery note on batch completion
CREATE OR REPLACE FUNCTION generate_delivery_note_on_batch_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id uuid;
  v_order_number text;
  v_customer_name text;
  v_customer_address text;
  v_items jsonb;
  v_location_id uuid;
BEGIN
  -- Only proceed if status changed to 'completed'
  IF (NEW.status = 'completed' AND OLD.status != 'completed') THEN
    -- Check if this batch is associated with an order
    IF NEW.webshop_order_id IS NOT NULL THEN
      -- Get order details from webshop_orders
      SELECT 
        id, 
        order_number, 
        customer_name, 
        customer_address,
        items,
        pickup_location_id
      INTO 
        v_order_id, 
        v_order_number, 
        v_customer_name, 
        v_customer_address,
        v_items,
        v_location_id
      FROM webshop_orders
      WHERE id = NEW.webshop_order_id::uuid;
    ELSE
      -- Get order details from orders if available
      SELECT 
        id, 
        order_number, 
        customer_name, 
        customer_address,
        items,
        location_id
      INTO 
        v_order_id, 
        v_order_number, 
        v_customer_name, 
        v_customer_address,
        v_items,
        v_location_id
      FROM orders
      WHERE id = NEW.order_id;
    END IF;
    
    -- If we have order details, create a delivery note
    IF v_order_number IS NOT NULL THEN
      INSERT INTO delivery_notes (
        order_id,
        order_number,
        batch_id,
        status,
        customer_name,
        customer_address,
        items,
        location_id,
        delivery_date
      ) VALUES (
        v_order_id,
        v_order_number,
        NEW.id,
        'pending',
        v_customer_name,
        v_customer_address,
        COALESCE(v_items, '[]'::jsonb),
        v_location_id,
        CURRENT_TIMESTAMP + interval '1 day'
      );
    ELSE
      -- If no order is associated, create a delivery note with batch information
      -- Get product information
      INSERT INTO delivery_notes (
        batch_id,
        order_number,
        status,
        customer_name,
        items,
        delivery_date
      ) VALUES (
        NEW.id,
        'SZL-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || NEW.batch_number,
        'pending',
        'Belső szállítás',
        (
          SELECT jsonb_build_array(
            jsonb_build_object(
              'product_id', p.id,
              'product_name', p.name,
              'quantity', NEW.batch_size,
              'price', p.wholesale_price
            )
          )
          FROM products p
          WHERE p.id = NEW.recipe_id
        ),
        CURRENT_TIMESTAMP + interval '1 day'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on production_batches table
DROP TRIGGER IF EXISTS trigger_generate_delivery_note_on_batch_completion ON production_batches;

CREATE TRIGGER trigger_generate_delivery_note_on_batch_completion
AFTER UPDATE OF status ON production_batches
FOR EACH ROW
EXECUTE FUNCTION generate_delivery_note_on_batch_completion();