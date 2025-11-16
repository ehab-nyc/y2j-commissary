import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create authenticated Supabase client
    const authHeader = req.headers.get('Authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: authHeader ? { Authorization: authHeader } : {},
        },
      }
    );

    // Verify authentication for all operations
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const deviceId = url.searchParams.get('deviceId') || url.searchParams.get('device_id');

    console.log('CloudPRNT request:', { method: req.method, deviceId });

    // Printer polling endpoint (GET) - returns pending jobs
    if (req.method === 'GET') {
      if (!deviceId) {
        return new Response(
          JSON.stringify({ error: 'device_id parameter required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch pending jobs for this device
      const { data: jobs, error } = await supabaseClient
        .from('star_cloudprnt_jobs')
        .select('*')
        .eq('device_id', deviceId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) {
        console.error('Error fetching jobs:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch jobs' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If no jobs, return empty response
      if (!jobs || jobs.length === 0) {
        return new Response(
          JSON.stringify({ message: 'No pending jobs' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const job = jobs[0];

      // Return job data (Star CloudPRNT format)
      return new Response(
        JSON.stringify({
          jobReady: true,
          mediaTypes: ['application/vnd.star.starprnt'],
          jobToken: job.id,
          request: job.job_data.request,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Submit print job endpoint (POST)
    if (req.method === 'POST') {
      let body;
      try {
        const text = await req.text();
        body = text ? JSON.parse(text) : {};
      } catch (e) {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { device_id, job_data } = body;

      if (!device_id || !job_data) {
        return new Response(
          JSON.stringify({ error: 'device_id and job_data required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get retry settings
      const { data: retrySettings } = await supabaseClient
        .from('app_settings')
        .select('*')
        .in('key', ['star_cloudprnt_retry_attempts']);

      const maxRetries = retrySettings?.find(s => s.key === 'star_cloudprnt_retry_attempts')?.value || '3';

      // Create new print job
      const { data, error } = await supabaseClient
        .from('star_cloudprnt_jobs')
        .insert({
          device_id,
          job_data,
          status: 'pending',
          max_retries: parseInt(maxRetries),
          retry_count: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating job:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create print job' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Print job created:', data.id);

      return new Response(
        JSON.stringify({ success: true, job_id: data.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update job status endpoint (PUT)
    if (req.method === 'PUT') {
      let body;
      try {
        const text = await req.text();
        body = text ? JSON.parse(text) : {};
      } catch (e) {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON body' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { jobToken, status: jobStatus, error: jobError } = body;

      if (!jobToken) {
        return new Response(
          JSON.stringify({ error: 'jobToken required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update job status
      const updateData: any = {
        status: jobStatus || 'completed',
        printed_at: new Date().toISOString(),
      };

      if (jobError) {
        updateData.error_message = jobError;
        updateData.status = 'failed';

        // Get job and retry settings for auto-retry logic
        const { data: job } = await supabaseClient
          .from('star_cloudprnt_jobs')
          .select('retry_count, max_retries')
          .eq('id', jobToken)
          .single();

        const { data: retrySettings } = await supabaseClient
          .from('app_settings')
          .select('*')
          .in('key', ['star_cloudprnt_retry_enabled', 'star_cloudprnt_retry_delay_minutes']);

        const retryEnabled = retrySettings?.find(s => s.key === 'star_cloudprnt_retry_enabled')?.value === 'true';
        const retryDelay = parseInt(retrySettings?.find(s => s.key === 'star_cloudprnt_retry_delay_minutes')?.value || '5');

        // Schedule retry if enabled and under retry limit
        if (retryEnabled && job && job.retry_count < job.max_retries) {
          const nextRetry = new Date();
          nextRetry.setMinutes(nextRetry.getMinutes() + retryDelay);
          updateData.next_retry_at = nextRetry.toISOString();
        }
      }

      const { error } = await supabaseClient
        .from('star_cloudprnt_jobs')
        .update(updateData)
        .eq('id', jobToken);

      if (error) {
        console.error('Error updating job:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update job status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Job updated:', jobToken, jobStatus);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('CloudPRNT error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
