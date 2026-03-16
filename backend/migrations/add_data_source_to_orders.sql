-- Add data_source column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS data_source VARCHAR(20) DEFAULT 'database';

-- Update existing records to have 'database' as their data source
UPDATE orders SET data_source = 'database' WHERE data_source IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_data_source ON orders(data_source);
