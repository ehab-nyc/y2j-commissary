-- Add UPDATE and DELETE policies for order_items table

-- Allow customers to update items in their pending orders
CREATE POLICY "Customers can update pending order items"
  ON public.order_items 
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_id = auth.uid()
        AND orders.status = 'pending'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_id = auth.uid()
        AND orders.status = 'pending'
    )
  );

-- Allow customers to delete items from their pending orders
CREATE POLICY "Customers can delete pending order items"
  ON public.order_items 
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_id = auth.uid()
        AND orders.status = 'pending'
    )
  );

-- Allow managers and admins to manage all order items
CREATE POLICY "Staff can manage all order items"
  ON public.order_items 
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'manager'::app_role) OR 
    public.has_role(auth.uid(), 'admin'::app_role)
  );