-- Add SMS consent fields to customer_phones table
ALTER TABLE public.customer_phones 
ADD COLUMN sms_consent boolean DEFAULT false NOT NULL,
ADD COLUMN sms_consent_date timestamp with time zone;