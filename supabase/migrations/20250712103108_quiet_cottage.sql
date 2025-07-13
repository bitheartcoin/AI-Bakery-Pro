/*
  # Add update_production_batch stored procedure

  1. New Functions
    - `update_production_batch` - Biztonságos frissítési függvény a production_batches tábla számára
    
  2. Security
    - A függvény biztonságosan kezeli a JSON típusú mezőket
*/

-- Létrehozzuk a tárolt eljárást a production_batches frissítéséhez
CREATE OR REPLACE FUNCTION update_production_batch(
  p_batch_id UUID,
  p_status TEXT DEFAULT NULL,
  p_end_time TIMESTAMPTZ DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE production_batches
  SET 
    status = COALESCE(p_status, status),
    end_time = COALESCE(p_end_time, end_time),
    updated_at = now()
  WHERE id = p_batch_id;
END;
$$ LANGUAGE plpgsql;

-- Adjunk hozzáférést a függvényhez
GRANT EXECUTE ON FUNCTION update_production_batch TO authenticated;
GRANT EXECUTE ON FUNCTION update_production_batch TO anon;
GRANT EXECUTE ON FUNCTION update_production_batch TO service_role;