/*
  # Create update_production_batch function

  This function safely updates a production batch with proper handling of JSON fields.
  It's needed because direct updates can cause type conversion errors with JSON fields.
*/

CREATE OR REPLACE FUNCTION update_production_batch(
  p_batch_id uuid,
  p_status text DEFAULT NULL,
  p_end_time timestamptz DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE production_batches
  SET 
    status = COALESCE(p_status, status),
    end_time = COALESCE(p_end_time, end_time),
    updated_at = now()
  WHERE id = p_batch_id;
END;
$$ LANGUAGE plpgsql;