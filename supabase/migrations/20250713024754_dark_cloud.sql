/*
  # Fix update_production_batch_simple function JSONB error

  1. Database Function Fix
    - Drop and recreate the update_production_batch_simple function
    - Ensure proper handling of JSONB columns
    - Fix any type mismatches between text and JSONB

  2. Function Definition
    - Simple version with basic parameters only
    - Proper error handling
    - Correct data types for all columns
*/

-- Drop the existing function that's causing the JSONB error
DROP FUNCTION IF EXISTS update_production_batch_simple(uuid, text, timestamp with time zone);

-- Create a corrected version of the function
CREATE OR REPLACE FUNCTION update_production_batch_simple(
  p_batch_id uuid,
  p_status text,
  p_end_time timestamp with time zone DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the production batch with basic fields only
  UPDATE production_batches 
  SET 
    status = p_status,
    end_time = CASE 
      WHEN p_end_time IS NOT NULL THEN p_end_time 
      WHEN p_status = 'in_progress' THEN now()
      ELSE end_time 
    END,
    start_time = CASE 
      WHEN p_status = 'in_progress' AND start_time IS NULL THEN now()
      ELSE start_time 
    END,
    updated_at = now()
  WHERE id = p_batch_id;
  
  -- Check if the update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production batch with ID % not found', p_batch_id;
  END IF;
END;
$$;