import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BulkSMSRequest {
  message: string;
  targetGroup: 'all_customers' | 'staff';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Create Supabase client with user's auth
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: corsHeaders }
      );
    }

    // Check for admin/super_admin role
    const { data: roles } = await supabaseAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'super_admin']);

    if (!roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }), 
        { status: 403, headers: corsHeaders }
      );
    }

    const { message, targetGroup }: BulkSMSRequest = await req.json();

    console.log("Sending bulk SMS to:", targetGroup);

    // Validate input
    if (!message || !targetGroup) {
      throw new Error("Missing required fields: message and targetGroup");
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error("Twilio credentials not configured");
    }

    // Initialize Supabase client with service role for data access
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let phoneNumbers: string[] = [];

    // Fetch phone numbers based on target group
    if (targetGroup === 'all_customers') {
      const { data: phones } = await supabase
        .from('customer_phones')
        .select('phone');
      
      phoneNumbers = phones?.map((p: any) => p.phone) || [];
    } else if (targetGroup === 'staff') {
      // Get staff phone numbers
      const { data: staffProfiles } = await supabase
        .from('profiles')
        .select('phone, id')
        .not('phone', 'is', null);
      
      if (staffProfiles) {
        // Filter to only include staff (workers, managers, admins)
        const { data: staffRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['worker', 'manager', 'admin', 'super_admin'])
          .in('user_id', staffProfiles.map((p: any) => p.id));
        
        const staffIds = new Set(staffRoles?.map((r: any) => r.user_id) || []);
        phoneNumbers = staffProfiles
          .filter((p: any) => staffIds.has(p.id) && p.phone)
          .map((p: any) => p.phone!);
      }
    }

    if (phoneNumbers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No phone numbers found for target group',
          sentCount: 0
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    console.log(`Sending SMS to ${phoneNumbers.length} recipients`);

    // Send SMS to all phone numbers
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const results = await Promise.allSettled(
      phoneNumbers.map(async (phoneNumber) => {
        const formData = new URLSearchParams();
        formData.append("To", phoneNumber);
        formData.append("From", twilioPhone);
        formData.append("Body", message);

        const response = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          console.error(`Failed to send SMS to ${phoneNumber}:`, error);
          throw new Error(`Failed to send to ${phoneNumber}`);
        }

        return response.json();
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;

    console.log(`SMS sent successfully to ${successCount} recipients, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentCount: successCount,
        failedCount: failCount,
        totalRecipients: phoneNumbers.length
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
    console.error("Error in send-bulk-sms function:", error);
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
