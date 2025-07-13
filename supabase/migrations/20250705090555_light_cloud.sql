/*
  # Add Weather API Key to Settings

  1. New Settings
    - Add WeatherAPI key to settings table
    - Ensure it's available for the weather page
*/

-- Add Weather API key to settings if it doesn't exist
INSERT INTO settings (category, key, value, description, is_public)
VALUES 
  ('weather', 'api_key', '"5b301599e54040cea5100830252806"', 'WeatherAPI kulcs', false)
ON CONFLICT (category, key) DO UPDATE
SET 
  value = '"5b301599e54040cea5100830252806"',
  description = 'WeatherAPI kulcs';