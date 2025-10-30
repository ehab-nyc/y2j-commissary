import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const printerMac = url.searchParams.get('mac');
    
    if (!printerMac) {
      return new Response(JSON.stringify({ error: 'Printer MAC address required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle POST requests (job acknowledgment/deletion)
    if (req.method === 'POST' || req.method === 'DELETE') {
      const jobToken = url.searchParams.get('jobToken') || url.searchParams.get('token');
      
      if (!jobToken) {
        return new Response(JSON.stringify({ error: 'Job token required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Job ${jobToken} completed/deleted by printer ${printerMac}`);
      
      // Mark job as completed
      await supabase
        .from('cloudprnt_queue')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobToken);

      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Handle GET requests (polling for jobs)
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] CloudPRNT poll from printer: ${printerMac}`);
    console.log(`[${timestamp}] Request headers:`, Object.fromEntries(req.headers.entries()));

    // Get the oldest pending job for this printer
    const { data: jobs, error: fetchError } = await supabase
      .from('cloudprnt_queue')
      .select('*')
      .eq('printer_mac', printerMac)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    const job = jobs?.[0];

    if (fetchError || !job) {
      // No jobs available
      console.log(`[${timestamp}] No jobs for printer ${printerMac}`);
      return new Response(JSON.stringify({ jobReady: false }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    console.log(`[${timestamp}] Sending job ${job.id} to printer ${printerMac}`);
    console.log(`[${timestamp}] Job data:`, JSON.stringify(job.job_data).substring(0, 200));

    // Mark job as printing
    await supabase
      .from('cloudprnt_queue')
      .update({ status: 'printing' })
      .eq('id', job.id);

    // Return the job data in CloudPRNT format
    const cloudPrntResponse = {
      jobReady: true,
      mediaTypes: ['application/vnd.star.starprnt'],
      jobToken: job.id,
      ...job.job_data, // Contains the actual print data
    };

    return new Response(JSON.stringify(cloudPrntResponse), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('CloudPRNT server error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
