-- Add completed_at column to orders table
ALTER TABLE orders 
ADD COLUMN completed_at TIMESTAMP NULL;

-- Add comment to explain the purpose
COMMENT ON COLUMN orders.completed_at IS 'Timestamp when order status was changed to Completed';

-- Create index for better query performance on analytics
CREATE INDEX idx_orders_completed_at ON orders(completed_at) WHERE completed_at IS NOT NULL;

-- Create trigger to automatically set completed_at when status changes to 'Completed'
CREATE OR REPLACE FUNCTION update_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    -- If status is being updated to 'Completed' and completed_at is NULL, set it to current timestamp
    IF NEW.status = 'Completed' AND (OLD.status IS DISTINCT FROM 'Completed' OR OLD.completed_at IS NULL) THEN
        NEW.completed_at = CURRENT_TIMESTAMP;
    ELSIF NEW.status IS DISTINCT FROM 'Completed' THEN
        -- If status is changed from 'Completed' to something else, clear completed_at
        NEW.completed_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update completed_at
DROP TRIGGER IF EXISTS trigger_update_completed_at ON orders;
CREATE TRIGGER trigger_update_completed_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_completed_at();

-- Update existing completed orders to have completed_at set to their order_date
-- This is a one-time update for existing data
UPDATE orders 
SET completed_at = order_date 
WHERE status = 'Completed' AND completed_at IS NULL;
