-- Create a simple site_settings table to store key/value site-wide settings
CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Insert default orders_enabled = true
INSERT INTO site_settings (key, value)
VALUES ('orders_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
