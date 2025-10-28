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

    console.log(`CloudPRNT poll from printer: ${printerMac}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      console.log(`No jobs for printer ${printerMac}`);
      return new Response(JSON.stringify({ jobReady: false }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    console.log(`Sending job ${job.id} to printer ${printerMac}`);

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
