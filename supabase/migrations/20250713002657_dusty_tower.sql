/*
  # Fix QR Code Generation

  1. New Functions
    - Create a function to generate standardized QR code content for products
    - Create a function to generate standardized QR code content for inventory items
  
  2. Triggers
    - Add triggers to automatically generate QR codes for products and inventory items
*/

-- Function to generate standardized QR code content for products
CREATE OR REPLACE FUNCTION generate_product_qr_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate a JSON structure with product details
  NEW.qr_code := json_build_object(
    'type', 'product',
    'id', NEW.id,
    'name', NEW.name,
    'category', NEW.category,
    'price', NEW.retail_price
  )::text;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate standardized QR code content for inventory items
CREATE OR REPLACE FUNCTION generate_inventory_qr_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate a JSON structure with inventory details
  NEW.qr_code := json_build_object(
    'type', 'inventory',
    'id', NEW.id,
    'name', NEW.name,
    'category', NEW.category,
    'unit', NEW.unit
  )::text;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically generate QR codes for new products
CREATE TRIGGER trigger_generate_product_qr_code
BEFORE INSERT ON products
FOR EACH ROW
WHEN (NEW.qr_code IS NULL)
EXECUTE FUNCTION generate_product_qr_code();

-- Trigger to automatically generate QR codes for updated products
CREATE TRIGGER trigger_update_product_qr_code
BEFORE UPDATE ON products
FOR EACH ROW
WHEN (NEW.qr_code IS NULL OR OLD.name != NEW.name OR OLD.category != NEW.category OR OLD.retail_price != NEW.retail_price)
EXECUTE FUNCTION generate_product_qr_code();

-- Trigger to automatically generate QR codes for new inventory items
CREATE TRIGGER trigger_generate_inventory_qr_code
BEFORE INSERT ON inventory
FOR EACH ROW
WHEN (NEW.qr_code IS NULL)
EXECUTE FUNCTION generate_inventory_qr_code();

-- Trigger to automatically generate QR codes for updated inventory items
CREATE TRIGGER trigger_update_inventory_qr_code
BEFORE UPDATE ON inventory
FOR EACH ROW
WHEN (NEW.qr_code IS NULL OR OLD.name != NEW.name OR OLD.category != NEW.category OR OLD.unit != NEW.unit)
EXECUTE FUNCTION generate_inventory_qr_code();

-- Function to generate standardized barcode for products
CREATE OR REPLACE FUNCTION generate_product_barcode()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if barcode is null
  IF NEW.barcode IS NULL THEN
    -- Generate a simple barcode format: PRD-{timestamp}-{random}
    NEW.barcode := 'PRD-' || extract(epoch from now())::text || '-' || floor(random() * 1000)::text;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate standardized barcode for inventory items
CREATE OR REPLACE FUNCTION generate_inventory_barcode()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if barcode is null
  IF NEW.barcode IS NULL THEN
    -- Generate a simple barcode format: INV-{timestamp}-{random}
    NEW.barcode := 'INV-' || extract(epoch from now())::text || '-' || floor(random() * 1000)::text;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically generate barcodes for new products
CREATE TRIGGER trigger_generate_product_barcode
BEFORE INSERT ON products
FOR EACH ROW
WHEN (NEW.barcode IS NULL)
EXECUTE FUNCTION generate_product_barcode();

-- Trigger to automatically generate barcodes for new inventory items
CREATE TRIGGER trigger_generate_inventory_barcode
BEFORE INSERT ON inventory
FOR EACH ROW
WHEN (NEW.barcode IS NULL)
EXECUTE FUNCTION generate_inventory_barcode();