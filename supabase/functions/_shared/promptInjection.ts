/**
 * Detects potential prompt injection attacks in user input
 * @param text - The user input to check
 * @returns true if potential injection detected, false otherwise
 */
export function detectPromptInjection(text: string): boolean {
  const suspiciousPatterns = [
    /ignore (previous|above|prior|all) (instructions?|prompts?|commands?)/i,
    /you are now/i,
    /forget (everything|all instructions?|previous|above)/i,
    /system\s*:/i,
    /new instructions?:/i,
    /override (previous|all|system)/i,
    /disregard (previous|all|above)/i,
    /\[system\]/i,
    /\(system\)/i,
    /<system>/i,
    /act as if/i,
    /pretend (you are|to be)/i,
    /roleplay as/i,
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(text));
}

/**
 * Sanitizes user input to reduce prompt injection risk
 * @param text - The user input to sanitize
 * @returns Sanitized text
 */
export function sanitizeForAI(text: string): string {
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/\[system\]/gi, '[user-system]')
    .replace(/<system>/gi, '<user-system>')
    .trim();
}
