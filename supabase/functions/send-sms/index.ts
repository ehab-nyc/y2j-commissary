import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// SMS message sanitization helper
function sanitizeSMSMessage(message: string): string {
  // Remove control characters and potentially harmful sequences
  return message
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
    .replace(/\r\n/g, ' ') // Replace newlines with spaces
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .trim()
    .slice(0, 1600); // Ensure max length
}

// Validation schema for SMS requests
const smsSchema = z.object({
  to: z.string()
    .trim()
    .regex(/^\+?[1-9]\d{10,14}$/, 'Invalid phone number format (must be E.164 format, e.g., +1234567890)'),
  message: z.string()
    .trim()
    .min(1, 'Message is required')
    .max(1600, 'Message too long (Twilio maximum is 1600 characters)')
    .transform(sanitizeSMSMessage) // Sanitize the message
});

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate using trigger secret (for database triggers)
    const triggerSecret = req.headers.get('x-trigger-secret');
    const expectedSecret = Deno.env.get('SMS_TRIGGER_SECRET');
    
    if (!triggerSecret || triggerSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid trigger secret' }), 
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse and validate request body
    const requestBody = await req.json();
    const validationResult = smsSchema.safeParse(requestBody);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0].message;
      console.error("SMS validation error:", errorMessage);
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          success: false 
        }),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json", 
            ...corsHeaders 
          },
        }
      );
    }

    const { to, message } = validationResult.data;

    console.log("Sending SMS to:", to, "- Message length:", message.length);

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error("Twilio credentials not configured");
    }

    // Send SMS using Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append("To", to);
    formData.append("From", twilioPhone);
    formData.append("Body", message);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioData);
      throw new Error(`Twilio API error: ${twilioData.message || 'Unknown error'}`);
    }

    console.log("SMS sent successfully:", twilioData.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: twilioData.sid 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-sms function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
