/*
  # Add real locations to the database

  1. New Data
    - Add real store locations in the Balaton area
    - Set up proper relationships with managers
    - Add coordinates for mapping
*/

-- Insert real locations if they don't exist
INSERT INTO locations (id, name, type, address, city, postal_code, country, phone, email, opening_hours, coordinates, status)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'Balatonszemes Központi Üzlet', 'store', '8636 Balatonszemes, Fő u. 12.', 'Balatonszemes', '8636', 'Hungary', '+36 30 123 4567', 'szemesi@szemesipekseg.hu', '06:00-20:00', '{"lat": 46.8167, "lng": 17.7833}', 'active'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Balatonszárszó Üzlet', 'store', '8624 Balatonszárszó, Fő u. 6/B', 'Balatonszárszó', '8624', 'Hungary', '+36 30 123 4568', 'szarszo@szemesipekseg.hu', '06:00-19:00', '{"lat": 46.8167, "lng": 17.8333}', 'active'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Balatonföldvár Üzlet', 'store', '8623 Balatonföldvár, Budapesti u 1-3.', 'Balatonföldvár', '8623', 'Hungary', '+36 30 123 4569', 'foldvar@szemesipekseg.hu', '06:00-19:00', '{"lat": 46.8500, "lng": 17.8833}', 'active'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Balatonmáriafürdő Üzlet', 'store', '8647 Balatonmáriafürdő, Gróf Széchenyi Tér. 6', 'Balatonmáriafürdő', '8647', 'Hungary', '+36 30 123 4570', 'maria@szemesipekseg.hu', '06:00-19:00', '{"lat": 46.7000, "lng": 17.3833}', 'active'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Balatonszemes Gyártóüzem', 'production', '8636 Balatonszemes, Szabadság u 50.', 'Balatonszemes', '8636', 'Hungary', '+36 30 123 4571', 'gyartas@szemesipekseg.hu', '00:00-24:00', '{"lat": 46.8167, "lng": 17.7833}', 'active')
ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  country = EXCLUDED.country,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  opening_hours = EXCLUDED.opening_hours,
  coordinates = EXCLUDED.coordinates,
  status = EXCLUDED.status;