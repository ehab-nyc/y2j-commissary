-- Allow customers to update notes on their own pending orders
CREATE POLICY "Customers can update notes on pending orders"
ON orders
FOR UPDATE
USING (
  customer_id = auth.uid() 
  AND status = 'pending'::order_status
)
WITH CHECK (
  customer_id = auth.uid() 
  AND status = 'pending'::order_status
);