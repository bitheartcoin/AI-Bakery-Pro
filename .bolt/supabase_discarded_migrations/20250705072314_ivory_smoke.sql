/*
  # Add Fehérkenyér product to database

  1. New Data
    - Add Fehérkenyér product to products table
    - Set up proper pricing and details
*/

-- Insert Fehérkenyér product if it doesn't exist
INSERT INTO products (
  id, 
  name, 
  description, 
  ingredients, 
  instructions, 
  prep_time, 
  bake_time, 
  difficulty, 
  category, 
  yield_amount, 
  cost_per_unit, 
  ai_generated, 
  created_at, 
  updated_at, 
  image_url, 
  wholesale_price, 
  retail_price
)
VALUES (
  uuid_generate_v4(), 
  'Fehérkenyér', 
  'Klasszikus fehér kenyér, tökéletes mindennapi fogyasztásra', 
  '[{"name": "liszt", "amount": "1000", "unit": "g"}, {"name": "víz", "amount": "650", "unit": "ml"}, {"name": "élesztő", "amount": "30", "unit": "g"}, {"name": "só", "amount": "20", "unit": "g"}]', 
  ARRAY['Keverd össze a száraz hozzávalókat', 'Add hozzá a vizet és dagaszd 10 percig', 'Keleszd 1 órát', 'Formázd és keleszd még 30 percet', 'Süsd 200°C-on 35 percig'], 
  90, 
  35, 
  'medium', 
  'bread', 
  1, 
  350, 
  false, 
  now(), 
  now(), 
  'https://images.pexels.com/photos/1775043/pexels-photo-1775043.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1', 
  450, 
  550
)
ON CONFLICT (name) DO UPDATE
SET 
  description = EXCLUDED.description,
  ingredients = EXCLUDED.ingredients,
  instructions = EXCLUDED.instructions,
  prep_time = EXCLUDED.prep_time,
  bake_time = EXCLUDED.bake_time,
  difficulty = EXCLUDED.difficulty,
  category = EXCLUDED.category,
  yield_amount = EXCLUDED.yield_amount,
  cost_per_unit = EXCLUDED.cost_per_unit,
  image_url = EXCLUDED.image_url,
  wholesale_price = EXCLUDED.wholesale_price,
  retail_price = EXCLUDED.retail_price,
  updated_at = now();

-- Clear all other products
DELETE FROM products WHERE name != 'Fehérkenyér';