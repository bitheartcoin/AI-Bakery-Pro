-- Create a function to clear all data from the database except admin users
CREATE OR REPLACE FUNCTION clear_database()
RETURNS void AS $$
DECLARE
    table_name text;
BEGIN
    -- Delete data from all tables except auth tables and admin users
    
    -- Delete from vehicle_damage_reports if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicle_damage_reports') THEN
        DELETE FROM vehicle_damage_reports;
    END IF;
    
    -- Delete from vehicles if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicles') THEN
        DELETE FROM vehicles;
    END IF;
    
    -- Delete from production_steps if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'production_steps') THEN
        DELETE FROM production_steps;
    END IF;
    
    -- Delete from recipe_steps if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipe_steps') THEN
        DELETE FROM recipe_steps;
    END IF;
    
    -- Delete from order_items if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'order_items') THEN
        DELETE FROM order_items;
    END IF;
    
    -- Delete from orders if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
        DELETE FROM orders;
    END IF;
    
    -- Delete from sensor_data if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sensor_data') THEN
        DELETE FROM sensor_data;
    END IF;
    
    -- Delete from documents if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents') THEN
        DELETE FROM documents;
    END IF;
    
    -- Delete from notifications if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        DELETE FROM notifications;
    END IF;
    
    -- Delete from settings where not critical if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'settings') THEN
        DELETE FROM settings WHERE category NOT IN ('auth', 'system');
    END IF;
    
    -- Delete from inventory if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory') THEN
        DELETE FROM inventory;
    END IF;
    
    -- Delete from production_batches if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'production_batches') THEN
        DELETE FROM production_batches;
    END IF;
    
    -- Delete from recipes if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'recipes') THEN
        DELETE FROM recipes;
    END IF;
    
    -- Delete from products if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
        DELETE FROM products;
    END IF;
    
    -- Delete from feedback if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feedback') THEN
        DELETE FROM feedback;
    END IF;
    
    -- Delete from work_logs if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'work_logs') THEN
        DELETE FROM work_logs;
    END IF;
    
    -- Delete from schedules if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schedules') THEN
        DELETE FROM schedules;
    END IF;
    
    -- Delete from survey_responses if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'survey_responses') THEN
        DELETE FROM survey_responses;
    END IF;
    
    -- Delete from survey_questions if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'survey_questions') THEN
        DELETE FROM survey_questions;
    END IF;
    
    -- Delete from surveys if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'surveys') THEN
        DELETE FROM surveys;
    END IF;
    
    -- Delete from locations if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'locations') THEN
        DELETE FROM locations;
    END IF;
    
    -- Delete from employees if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employees') THEN
        DELETE FROM employees;
    END IF;
    
    -- Keep profiles for admin users only
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
        DELETE FROM profiles WHERE role != 'admin';
    END IF;
    
    RAISE NOTICE 'Database cleared successfully. Admin users preserved.';
END;
$$ LANGUAGE plpgsql;

-- Create a function to clear all data from a specific table
CREATE OR REPLACE FUNCTION clear_table(table_name text)
RETURNS void AS $$
BEGIN
    EXECUTE 'DELETE FROM ' || quote_ident(table_name);
    RAISE NOTICE 'Table % cleared successfully', table_name;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION clear_database() TO authenticated;
GRANT EXECUTE ON FUNCTION clear_table(text) TO authenticated;