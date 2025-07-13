/*
  # Add Email System Tables

  1. New Tables
    - `email_templates` - Stores email templates
    - `sent_emails` - Tracks sent emails
    - `scheduled_emails` - Stores scheduled emails for future sending

  2. Security
    - Enable RLS on all tables
    - Add policies for admin access
*/

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sent Emails Table
CREATE TABLE IF NOT EXISTS sent_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES partner_companies(id),
  recipient_email text NOT NULL,
  recipient_name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz DEFAULT now()
);

-- Scheduled Emails Table
CREATE TABLE IF NOT EXISTS scheduled_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES partner_companies(id),
  recipient_email text NOT NULL,
  recipient_name text NOT NULL,
  template_id uuid REFERENCES email_templates(id),
  subject text NOT NULL,
  body text NOT NULL,
  scheduled_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage email templates" 
  ON email_templates 
  FOR ALL 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins can manage sent emails" 
  ON sent_emails 
  FOR ALL 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins can manage scheduled emails" 
  ON scheduled_emails 
  FOR ALL 
  TO authenticated 
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON email_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add function to send automatic order notifications
CREATE OR REPLACE FUNCTION send_order_notification()
RETURNS TRIGGER AS $$
DECLARE
  partner_email text;
  partner_name text;
BEGIN
  -- Get partner details
  SELECT email, name INTO partner_email, partner_name
  FROM partner_companies
  WHERE id = NEW.customer_id;
  
  -- If partner email exists, create a record in sent_emails
  IF partner_email IS NOT NULL THEN
    INSERT INTO sent_emails (
      recipient_id,
      recipient_email,
      recipient_name,
      subject,
      body,
      status
    ) VALUES (
      NEW.customer_id,
      partner_email,
      partner_name,
      'Új rendelés visszaigazolás - ' || NEW.order_number,
      '<h1>Rendelés visszaigazolás</h1><p>Tisztelt ' || partner_name || '!</p><p>Köszönjük rendelését! Az alábbiakban találja a rendelés részleteit:</p><p><strong>Rendelésszám:</strong> ' || NEW.order_number || '</p><p><strong>Rendelés dátuma:</strong> ' || NEW.created_at || '</p>',
      'sent'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to send notification on new order
CREATE TRIGGER trigger_order_notification
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION send_order_notification();