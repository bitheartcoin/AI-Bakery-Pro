/*
  # Fix Production Batch Function JSONB Type Error

  1. Problem
    - The update_production_batch_simple function has a JSONB type mismatch
    - Column "value" is of type jsonb but expression is of type text
    
  2. Solution
    - Drop and recreate the function with proper type handling
    - Remove any JSONB assignments that cause type conflicts
    - Use direct table updates instead of problematic assignments
*/

-- Drop the problematic function completely
DROP FUNCTION IF EXISTS update_production_batch_simple(uuid, text, timestamp with time zone);

-- Create a new, corrected function that avoids JSONB type issues
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
  -- Simple update without any JSONB operations
  UPDATE production_batches 
  SET 
    status = p_status,
    end_time = CASE 
      WHEN p_end_time IS NOT NULL THEN p_end_time 
      ELSE end_time 
    END,
    start_time = CASE 
      WHEN p_status = 'in_progress' AND start_time IS NULL THEN NOW() 
      ELSE start_time 
    END,
    updated_at = NOW()
  WHERE id = p_batch_id;
  
  -- Check if the update affected any rows
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production batch with ID % not found', p_batch_id;
  END IF;
END;
$$;