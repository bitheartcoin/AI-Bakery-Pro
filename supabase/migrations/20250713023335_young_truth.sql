/*
  # Fix update_production_batch function overload

  1. Changes
    - Rename the existing update_production_batch function with fewer parameters to update_production_batch_simple
    - Keep the full version with all parameters as update_production_batch
    - Update function signatures to avoid ambiguity
*/

-- First, drop both existing functions
DROP FUNCTION IF EXISTS public.update_production_batch(uuid, text, timestamp with time zone);
DROP FUNCTION IF EXISTS public.update_production_batch(uuid, text, timestamp with time zone, integer, integer, numeric, numeric, text);

-- Create the simple version with a new name
CREATE OR REPLACE FUNCTION public.update_production_batch_simple(
  p_batch_id uuid,
  p_status text,
  p_end_time timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch production_batches;
BEGIN
  -- Update the batch
  UPDATE production_batches
  SET 
    status = p_status,
    end_time = p_end_time,
    updated_at = now()
  WHERE id = p_batch_id
  RETURNING * INTO v_batch;
  
  -- Check if batch was found
  IF v_batch.id IS NULL THEN
    RAISE EXCEPTION 'Batch with ID % not found', p_batch_id;
  END IF;
  
  -- Return the updated batch
  RETURN row_to_json(v_batch)::jsonb;
END;
$$;

-- Create the full version with the original name
CREATE OR REPLACE FUNCTION public.update_production_batch(
  p_batch_id uuid,
  p_status text,
  p_end_time timestamp with time zone,
  p_actual_yield integer,
  p_quality_score integer,
  p_temperature numeric,
  p_humidity numeric,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch production_batches;
BEGIN
  -- Update the batch
  UPDATE production_batches
  SET 
    status = p_status,
    end_time = p_end_time,
    actual_yield = p_actual_yield,
    quality_score = p_quality_score,
    temperature = p_temperature,
    humidity = p_humidity,
    notes = p_notes,
    updated_at = now()
  WHERE id = p_batch_id
  RETURNING * INTO v_batch;
  
  -- Check if batch was found
  IF v_batch.id IS NULL THEN
    RAISE EXCEPTION 'Batch with ID % not found', p_batch_id;
  END IF;
  
  -- Return the updated batch
  RETURN row_to_json(v_batch)::jsonb;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_production_batch_simple(uuid, text, timestamp with time zone) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_production_batch(uuid, text, timestamp with time zone, integer, integer, numeric, numeric, text) TO anon, authenticated, service_role;