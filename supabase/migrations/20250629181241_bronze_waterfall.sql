-- Alter profiles table to rename salary to hourly_wage
ALTER TABLE profiles 
RENAME COLUMN salary TO hourly_wage;

-- Update any existing profiles to convert salary to hourly wage (assuming 160 hours per month)
UPDATE profiles 
SET hourly_wage = hourly_wage / 160 
WHERE hourly_wage > 5000;

-- Alter employees table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'employees' AND column_name = 'salary') THEN
        ALTER TABLE employees 
        RENAME COLUMN salary TO hourly_wage;
        
        -- Update any existing employees to convert salary to hourly wage
        UPDATE employees 
        SET hourly_wage = hourly_wage / 160 
        WHERE hourly_wage > 5000;
    END IF;
END $$;

-- Create a function to calculate total pay based on hours worked
CREATE OR REPLACE FUNCTION calculate_pay(hours_worked numeric, hourly_wage numeric)
RETURNS numeric AS $$
BEGIN
    RETURN hours_worked * hourly_wage;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION calculate_pay(numeric, numeric) TO authenticated;