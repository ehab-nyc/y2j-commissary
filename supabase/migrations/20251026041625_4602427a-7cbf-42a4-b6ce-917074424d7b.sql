-- Add foreign key constraint to weekly_balance_history table
ALTER TABLE public.weekly_balance_history
ADD CONSTRAINT weekly_balance_history_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;