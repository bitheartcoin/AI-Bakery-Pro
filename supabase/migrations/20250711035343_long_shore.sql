/*
  # Invoice Management System

  1. New Tables
    - `invoices` - Stores invoice information
    - `invoice_items` - Stores line items for invoices
    - `invoice_templates` - Stores templates for different invoice types
  
  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
*/

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  partner_id uuid REFERENCES partner_companies(id),
  customer_name text NOT NULL,
  customer_address text,
  customer_tax_number text,
  order_id uuid REFERENCES orders(id),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  payment_method text NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  subtotal numeric(10,2) NOT NULL,
  tax_amount numeric(10,2) NOT NULL,
  discount_amount numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) NOT NULL,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  tax_rate numeric(5,2) NOT NULL,
  tax_amount numeric(10,2) NOT NULL,
  total_amount numeric(10,2) NOT NULL
);

-- Create invoice templates table
CREATE TABLE IF NOT EXISTS invoice_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_data jsonb NOT NULL,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for invoices
CREATE POLICY "Admins can manage all invoices"
  ON invoices
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Partners can view their own invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    partner_id IN (
      SELECT partner_id FROM partner_users
      WHERE user_id = auth.uid()
    )
  );

-- Create policies for invoice items
CREATE POLICY "Admins can manage all invoice items"
  ON invoice_items
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Users can view invoice items for their invoices"
  ON invoice_items
  FOR SELECT
  TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE partner_id IN (
        SELECT partner_id FROM partner_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- Create policies for invoice templates
CREATE POLICY "Admins can manage all invoice templates"
  ON invoice_templates
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "All users can view invoice templates"
  ON invoice_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Create function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part text;
  sequence_number int;
  invoice_prefix text := 'INV';
BEGIN
  year_part := to_char(NEW.issue_date, 'YYYY');
  
  -- Get the next sequence number for this year
  SELECT COALESCE(MAX(SUBSTRING(invoice_number FROM '\d+')::int), 0) + 1
  INTO sequence_number
  FROM invoices
  WHERE invoice_number LIKE invoice_prefix || '-' || year_part || '-%';
  
  -- Format: INV-YYYY-NNNN
  NEW.invoice_number := invoice_prefix || '-' || year_part || '-' || LPAD(sequence_number::text, 4, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically generate invoice number
CREATE TRIGGER set_invoice_number
BEFORE INSERT ON invoices
FOR EACH ROW
WHEN (NEW.invoice_number IS NULL)
EXECUTE FUNCTION generate_invoice_number();

-- Create function to automatically generate delivery notes from completed batches
CREATE OR REPLACE FUNCTION generate_delivery_note_on_batch_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to 'completed'
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    -- Get order information if this batch is linked to an order
    IF NEW.webshop_order_id IS NOT NULL THEN
      -- Insert delivery note for webshop order
      INSERT INTO delivery_notes (
        order_number,
        batch_id,
        status,
        customer_name,
        items,
        created_at,
        updated_at
      )
      SELECT
        'SZL-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(CAST(nextval('delivery_note_seq') AS TEXT), 4, '0'),
        NEW.id,
        'pending',
        COALESCE(wo.customer_name, 'Webshop vásárló'),
        wo.items,
        now(),
        now()
      FROM webshop_orders wo
      WHERE wo.id = NEW.webshop_order_id;
    ELSE
      -- Check if there's an order associated with this batch
      INSERT INTO delivery_notes (
        order_id,
        order_number,
        batch_id,
        status,
        customer_name,
        customer_address,
        items,
        created_at,
        updated_at
      )
      SELECT
        o.id,
        o.order_number,
        NEW.id,
        'pending',
        o.customer_name,
        o.customer_address,
        o.items,
        now(),
        now()
      FROM orders o
      WHERE o.id = (
        SELECT order_id 
        FROM production_batches_orders 
        WHERE batch_id = NEW.id
        LIMIT 1
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for delivery note numbers
CREATE SEQUENCE IF NOT EXISTS delivery_note_seq START 1;

-- Create table to link production batches to orders
CREATE TABLE IF NOT EXISTS production_batches_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(batch_id, order_id)
);

-- Enable RLS on the new table
ALTER TABLE production_batches_orders ENABLE ROW LEVEL SECURITY;

-- Create policy for the new table
CREATE POLICY "Admins can manage all production_batches_orders"
  ON production_batches_orders
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- Create or replace the trigger on production_batches
DROP TRIGGER IF EXISTS trigger_generate_delivery_note_on_batch_completion ON production_batches;

CREATE TRIGGER trigger_generate_delivery_note_on_batch_completion
AFTER UPDATE OF status ON production_batches
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION generate_delivery_note_on_batch_completion();