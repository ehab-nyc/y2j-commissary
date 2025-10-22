import { z } from 'zod';

/**
 * Normalizes a phone number to E.164 format
 * E.164 format: +[country code][number] (e.g., +12345678901)
 */
export function normalizePhoneToE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  
  // Assume US numbers if not starting with country code
  // If starts with 1 and has 11 digits total, add +
  // If has 10 digits, prepend +1
  if (digits.startsWith('1') && digits.length === 11) {
    return `+${digits}`;
  } else if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length >= 10) {
    // For international numbers, just add + if not present
    return `+${digits}`;
  }
  
  // If less than 10 digits, return as-is (will fail validation)
  return phone;
}

/**
 * Zod schema for phone number validation
 * Enforces E.164 format for consistency with SMS services
 */
export const phoneSchema = z.string()
  .trim()
  .min(1, 'Phone number is required')
  .regex(
    /^\+?[1-9]\d{10,14}$/,
    'Invalid phone number format. Please use format: +1234567890'
  )
  .transform(normalizePhoneToE164);

/**
 * Validates a phone number and returns the normalized E.164 format
 */
export function validateAndNormalizePhone(phone: string): { success: boolean; data?: string; error?: string } {
  const result = phoneSchema.safeParse(phone);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error.errors[0].message };
  }
}
