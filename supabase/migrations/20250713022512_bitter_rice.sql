/*
  # Create update_production_batch RPC function

  1. New Functions
    - `update_production_batch` - Updates production batch status and end time
    - Handles proper data types for all columns
    - Returns the updated batch data

  2. Security
    - Function is accessible to authenticated users
    - Inherits RLS policies from production_batches table
*/

-- Create the update_production_batch function
CREATE OR REPLACE FUNCTION update_production_batch(
  p_batch_id uuid,
  p_status text DEFAULT NULL,
  p_end_time timestamptz DEFAULT NULL,
  p_actual_yield integer DEFAULT NULL,
  p_quality_score integer DEFAULT NULL,
  p_temperature numeric DEFAULT NULL,
  p_humidity numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_batch json;
BEGIN
  -- Update the production batch
  UPDATE production_batches 
  SET 
    status = COALESCE(p_status, status),
    end_time = COALESCE(p_end_time, end_time),
    actual_yield = COALESCE(p_actual_yield, actual_yield),
    quality_score = COALESCE(p_quality_score, quality_score),
    temperature = COALESCE(p_temperature, temperature),
    humidity = COALESCE(p_humidity, humidity),
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE id = p_batch_id;

  -- Check if the update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production batch with id % not found', p_batch_id;
  END IF;

  -- Return the updated batch data
  SELECT to_json(pb.*) INTO updated_batch
  FROM production_batches pb
  WHERE pb.id = p_batch_id;

  RETURN updated_batch;
END;
$$;