-- Create tracking_periods table
CREATE TABLE IF NOT EXISTS tracking_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_tracking_periods_active ON tracking_periods(is_active);
CREATE INDEX IF NOT EXISTS idx_tracking_periods_dates ON tracking_periods(start_date, end_date);

-- Enable RLS (Row Level Security)
ALTER TABLE tracking_periods ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth needs)
CREATE POLICY "Enable all operations for tracking_periods" ON tracking_periods
  FOR ALL
  USING (true)
  WITH CHECK (true);
