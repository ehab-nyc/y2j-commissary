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
    // Two authentication methods:
    // 1. JWT token (from authenticated frontend users)
    // 2. Trigger secret (from database triggers)
    const authHeader = req.headers.get('Authorization');
    const triggerSecret = req.headers.get('x-trigger-secret');
    const expectedSecret = Deno.env.get('SMS_TRIGGER_SECRET');
    
    let isAuthenticated = false;
    
    // Check JWT authentication
    if (authHeader) {
      const jwt = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      ).auth.getUser(jwt);
      
      if (user && !error) {
        console.log('Request authenticated via JWT for user:', user.id);
        isAuthenticated = true;
      }
    }
    
    // Check trigger secret authentication
    if (!isAuthenticated && triggerSecret && expectedSecret) {
      if (triggerSecret === expectedSecret) {
        console.log('Request authenticated via trigger secret');
        isAuthenticated = true;
      }
    }
    
    if (!isAuthenticated) {
      console.error('Unauthorized - No valid authentication provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
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

    // Get Twilio credentials - first try database, then environment
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: settings } = await supabaseAdmin
      .from('app_settings')
      .select('key, value')
      .in('key', ['twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number']);

    const dbSettings = settings?.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>) || {};

    const accountSid = dbSettings.twilio_account_sid || Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = dbSettings.twilio_auth_token || Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = dbSettings.twilio_phone_number || Deno.env.get("TWILIO_PHONE_NUMBER");

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
