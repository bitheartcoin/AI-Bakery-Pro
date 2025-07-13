-- Create a function to update production batch status
CREATE OR REPLACE FUNCTION update_production_batch(
  p_batch_id UUID,
  p_status TEXT,
  p_end_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE production_batches
  SET 
    status = p_status,
    end_time = COALESCE(p_end_time, end_time)
  WHERE id = p_batch_id;
END;
$$ LANGUAGE plpgsql;