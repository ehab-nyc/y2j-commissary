import { z } from 'zod';

/**
 * Normalizes phone number to E.164 format
 * E.164 format: +[country code][number] (e.g., +12345678900)
 */
export function normalizePhoneToE164(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Assume US numbers if not starting with country code
  // For international support, you may want to use a library like libphonenumber-js
  if (digits.startsWith('1') && digits.length === 11) {
    return `+${digits}`;
  } else if (digits.length === 10) {
    // US number without country code
    return `+1${digits}`;
  } else if (digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // For other country codes, assume it's already complete
  return `+${digits}`;
}

/**
 * Phone validation schema that ensures E.164 format
 * Validates and normalizes phone numbers for SMS services
 */
export const phoneValidationSchema = z.string()
  .trim()
  .min(1, 'Phone number is required')
  .regex(
    /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
    'Invalid phone number format'
  )
  .transform(normalizePhoneToE164)
  .refine(
    (phone) => /^\+[1-9]\d{10,14}$/.test(phone),
    'Phone must be in valid E.164 format (e.g., +12345678900)'
  );

/**
 * Validates a phone number and returns the normalized E.164 format
 * @param phone - The phone number to validate
 * @returns Object with success status and either normalized phone or error message
 */
export function validateAndNormalizePhone(phone: string): {
  success: boolean;
  phone?: string;
  error?: string;
} {
  const result = phoneValidationSchema.safeParse(phone);
  
  if (result.success) {
    return {
      success: true,
      phone: result.data,
    };
  } else {
    return {
      success: false,
      error: result.error.errors[0].message,
    };
  }
}
