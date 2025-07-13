-- Update dashboard stats function to properly handle string concatenation
CREATE OR REPLACE FUNCTION update_dashboard_stats()
RETURNS TRIGGER AS $$
DECLARE
  daily_revenue NUMERIC := 0;
  completed_orders INTEGER := 0;
  low_stock_count INTEGER := 0;
  active_vehicles INTEGER := 0;
  total_vehicles INTEGER := 0;
  active_employees INTEGER := 0;
  employees_in_shift INTEGER := 0;
BEGIN
  -- Calculate daily revenue
  SELECT COALESCE(SUM(total_amount), 0) INTO daily_revenue
  FROM orders
  WHERE DATE(created_at) = CURRENT_DATE
  AND status = 'completed';
  
  -- Count completed orders
  SELECT COUNT(*) INTO completed_orders
  FROM orders
  WHERE DATE(created_at) = CURRENT_DATE
  AND status = 'completed';
  
  -- Count low stock items
  SELECT COUNT(*) INTO low_stock_count
  FROM inventory
  WHERE current_stock <= min_threshold;
  
  -- Count active vehicles
  SELECT COUNT(*) INTO active_vehicles
  FROM vehicles
  WHERE status = 'active';
  
  -- Count total vehicles
  SELECT COUNT(*) INTO total_vehicles
  FROM vehicles;
  
  -- Count active employees
  SELECT COUNT(*) INTO active_employees
  FROM profiles
  WHERE status = 'active';
  
  -- Count employees in shift today
  SELECT COUNT(*) INTO employees_in_shift
  FROM schedules
  WHERE date = CURRENT_DATE
  AND status = 'confirmed';
  
  -- Update dashboard stats
  -- Daily revenue
  INSERT INTO settings (category, key, value, description, is_public)
  VALUES ('dashboard', 'daily_revenue', to_jsonb(daily_revenue), 'Daily revenue for dashboard', true)
  ON CONFLICT (category, key) 
  DO UPDATE SET 
    value = to_jsonb(daily_revenue),
    updated_at = now();
  
  -- Completed orders
  INSERT INTO settings (category, key, value, description, is_public)
  VALUES ('dashboard', 'completed_orders', to_jsonb(completed_orders), 'Completed orders count for dashboard', true)
  ON CONFLICT (category, key) 
  DO UPDATE SET 
    value = to_jsonb(completed_orders),
    updated_at = now();
  
  -- Low stock items
  INSERT INTO settings (category, key, value, description, is_public)
  VALUES ('dashboard', 'low_stock_count', to_jsonb(low_stock_count), 'Low stock items count for dashboard', true)
  ON CONFLICT (category, key) 
  DO UPDATE SET 
    value = to_jsonb(low_stock_count),
    updated_at = now();
  
  -- Active vehicles - convert to string first to avoid jsonb issues
  INSERT INTO settings (category, key, value, description, is_public)
  VALUES ('dashboard', 'active_vehicles', to_jsonb(active_vehicles || '/' || total_vehicles), 'Active vehicles for dashboard', true)
  ON CONFLICT (category, key) 
  DO UPDATE SET 
    value = to_jsonb(active_vehicles || '/' || total_vehicles),
    updated_at = now();
  
  -- Active employees
  INSERT INTO settings (category, key, value, description, is_public)
  VALUES ('dashboard', 'active_employees', to_jsonb(active_employees), 'Active employees for dashboard', true)
  ON CONFLICT (category, key) 
  DO UPDATE SET 
    value = to_jsonb(active_employees),
    updated_at = now();
  
  -- Employees in shift
  INSERT INTO settings (category, key, value, description, is_public)
  VALUES ('dashboard', 'employees_in_shift', to_jsonb(employees_in_shift), 'Employees in shift for dashboard', true)
  ON CONFLICT (category, key) 
  DO UPDATE SET 
    value = to_jsonb(employees_in_shift),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Insert sample partner companies
INSERT INTO partner_companies (name, tax_number, address, city, postal_code, country, phone, email, contact_person, status, discount_percentage, payment_terms, notes)
VALUES 
  ('Balaton Hotel Kft.', '12345678-1-42', 'Fő utca 1.', 'Balatonszemes', '8636', 'Hungary', '+36 30 123 4567', 'info@balatonhotel.hu', 'Kovács János', 'active', 10, 'net30', 'Rendszeres nagyobb rendelések'),
  ('Siófoki Étterem Kft.', '87654321-1-42', 'Petőfi sétány 10.', 'Siófok', '8600', 'Hungary', '+36 30 765 4321', 'rendeles@siofokietterem.hu', 'Nagy Péter', 'active', 5, 'immediate', 'Napi rendelések'),
  ('Zamárdi Büfé', '13579246-1-42', 'Strand utca 5.', 'Zamárdi', '8621', 'Hungary', '+36 20 111 2222', 'zamardibüfe@gmail.com', 'Szabó Anna', 'inactive', 0, 'immediate', 'Szezonális partner')
ON CONFLICT DO NOTHING;

-- Initialize dashboard stats manually instead of calling the trigger function
-- Daily revenue
INSERT INTO settings (category, key, value, description, is_public)
VALUES ('dashboard', 'daily_revenue', '0', 'Daily revenue for dashboard', true)
ON CONFLICT (category, key) 
DO UPDATE SET 
  value = '0',
  updated_at = now();

-- Completed orders
INSERT INTO settings (category, key, value, description, is_public)
VALUES ('dashboard', 'completed_orders', '0', 'Completed orders count for dashboard', true)
ON CONFLICT (category, key) 
DO UPDATE SET 
  value = '0',
  updated_at = now();

-- Low stock items
INSERT INTO settings (category, key, value, description, is_public)
VALUES ('dashboard', 'low_stock_count', '0', 'Low stock items count for dashboard', true)
ON CONFLICT (category, key) 
DO UPDATE SET 
  value = '0',
  updated_at = now();

-- Active vehicles
INSERT INTO settings (category, key, value, description, is_public)
VALUES ('dashboard', 'active_vehicles', '"0/0"', 'Active vehicles for dashboard', true)
ON CONFLICT (category, key) 
DO UPDATE SET 
  value = '"0/0"',
  updated_at = now();

-- Active employees
INSERT INTO settings (category, key, value, description, is_public)
VALUES ('dashboard', 'active_employees', '0', 'Active employees for dashboard', true)
ON CONFLICT (category, key) 
DO UPDATE SET 
  value = '0',
  updated_at = now();

-- Employees in shift
INSERT INTO settings (category, key, value, description, is_public)
VALUES ('dashboard', 'employees_in_shift', '0', 'Employees in shift for dashboard', true)
ON CONFLICT (category, key) 
DO UPDATE SET 
  value = '0',
  updated_at = now();