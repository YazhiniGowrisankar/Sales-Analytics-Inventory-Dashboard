-- Manual Database Commands to Add completed_at Column
-- Execute these commands directly in PostgreSQL with superuser privileges

-- Step 1: Connect to your database
-- psql -U postgres -d sri_kannan_traders

-- Step 2: Add the completed_at column
ALTER TABLE orders ADD COLUMN completed_at TIMESTAMP NULL;

-- Step 3: Add comment to explain the purpose
COMMENT ON COLUMN orders.completed_at IS 'Timestamp when order status was changed to Completed';

-- Step 4: Create index for better query performance
CREATE INDEX idx_orders_completed_at ON orders(completed_at) WHERE completed_at IS NOT NULL;

-- Step 5: Create trigger function to automatically set completed_at
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

-- Step 6: Create trigger to automatically update completed_at
DROP TRIGGER IF EXISTS trigger_update_completed_at ON orders;
CREATE TRIGGER trigger_update_completed_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_completed_at();

-- Step 7: Update existing completed orders to have completed_at set to their order_date
-- This is a one-time update for existing data
UPDATE orders 
SET completed_at = order_date 
WHERE status = 'Completed' AND completed_at IS NULL;

-- Step 8: Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'completed_at';

-- Step 9: Test the new functionality
SELECT 
    order_id,
    status,
    order_date,
    completed_at,
    CASE 
        WHEN status = 'Completed' AND completed_at IS NOT NULL THEN '✅ Working'
        ELSE '❌ Needs Update'
    END as status_check
FROM orders 
WHERE status = 'Completed' 
LIMIT 5;
