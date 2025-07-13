-- Add SMTP settings if they don't exist
INSERT INTO settings (category, key, value, description, is_public)
VALUES 
  ('smtp', 'host', '"mail.szemesipekseg.hu"', 'SMTP szerver host', false),
  ('smtp', 'port', '465', 'SMTP szerver port', false),
  ('smtp', 'username', '"info@szemesipekseg.hu"', 'SMTP felhasználónév', false),
  ('smtp', 'password', '"07230518Aa!"', 'SMTP jelszó', false),
  ('smtp', 'from_name', '"Szemesi Pékség"', 'Küldő neve', false),
  ('smtp', 'from_email', '"szemesipekseg@gmail.com"', 'Küldő email címe', false),
  ('weather', 'api_key', '"5b301599e54040cea5100830252806"', 'WeatherAPI kulcs', false)
ON CONFLICT (category, key) DO UPDATE
SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description;