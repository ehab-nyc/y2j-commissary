import { z } from 'zod';

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Product validation schema
export const productSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Product name is required')
    .max(200, 'Product name must be less than 200 characters'),
  description: z.string()
    .trim()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  price: z.number()
    .positive('Price must be positive')
    .max(999999.99, 'Price must be less than 1,000,000'),
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(0, 'Quantity cannot be negative')
    .max(999999, 'Quantity must be less than 1,000,000'),
  category_id: z.string().uuid('Invalid category')
});

// Category validation schema
export const categorySchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be less than 100 characters'),
  description: z.string()
    .trim()
    .max(500, 'Description must be less than 500 characters')
    .optional()
});

// Company settings validation schema
export const settingsSchema = z.object({
  company_name: z.string()
    .trim()
    .min(1, 'Company name is required')
    .max(200, 'Company name must be less than 200 characters'),
  company_email: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  company_phone: z.string()
    .trim()
    .max(50, 'Phone number must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  company_address: z.string()
    .trim()
    .max(500, 'Address must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  logo_url: z.string()
    .trim()
    .url('Invalid logo URL')
    .optional()
    .or(z.literal('')),
  background_url: z.string()
    .trim()
    .url('Invalid background URL')
    .optional()
    .or(z.literal(''))
});
