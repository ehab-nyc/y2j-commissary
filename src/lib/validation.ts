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
  category_id: z.string().uuid('Invalid category'),
  low_stock_threshold: z.number()
    .int('Low stock threshold must be a whole number')
    .min(0, 'Low stock threshold cannot be negative')
    .max(99999, 'Low stock threshold too large')
    .optional(),
  reorder_point: z.number()
    .int('Reorder point must be a whole number')
    .min(0, 'Reorder point cannot be negative')
    .max(99999, 'Reorder point too large')
    .optional(),
  reorder_quantity: z.number()
    .int('Reorder quantity must be a whole number')
    .min(0, 'Reorder quantity cannot be negative')
    .max(99999, 'Reorder quantity too large')
    .optional()
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

// Violation validation schema
export const violationSchema = z.object({
  customer_id: z.string().uuid('Invalid customer'),
  violation_type: z.string()
    .trim()
    .min(1, 'Violation type is required')
    .max(100, 'Violation type must be less than 100 characters'),
  severity: z.enum(['low', 'medium', 'high', 'critical'], {
    errorMap: () => ({ message: 'Invalid severity level' })
  }),
  description: z.string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  cart_name: z.string()
    .trim()
    .max(200, 'Cart name must be less than 200 characters')
    .optional(),
  cart_number: z.string()
    .trim()
    .max(50, 'Cart number must be less than 50 characters')
    .optional()
});
