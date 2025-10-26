-- Add soft delete column to orders table
ALTER TABLE orders ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better query performance on soft-deleted orders
CREATE INDEX idx_orders_deleted_at ON orders(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN orders.deleted_at IS 'Timestamp when order was soft deleted. NULL means order is active.';