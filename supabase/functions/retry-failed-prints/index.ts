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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Checking for failed jobs to retry...');

    // Get retry settings
    const { data: settings } = await supabaseClient
      .from('app_settings')
      .select('*')
      .in('key', ['star_cloudprnt_retry_enabled']);

    const retryEnabled = settings?.find(s => s.key === 'star_cloudprnt_retry_enabled')?.value === 'true';

    if (!retryEnabled) {
      console.log('Retry is disabled');
      return new Response(
        JSON.stringify({ message: 'Retry disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find failed jobs ready for retry
    const { data: failedJobs, error: fetchError } = await supabaseClient
      .from('star_cloudprnt_jobs')
      .select('*')
      .eq('status', 'failed')
      .lte('next_retry_at', new Date().toISOString())
      .not('next_retry_at', 'is', null);

    if (fetchError) {
      console.error('Error fetching failed jobs:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${failedJobs?.length || 0} jobs to retry`);

    let retriedCount = 0;

    // Retry each job
    for (const job of failedJobs || []) {
      if (job.retry_count >= job.max_retries) {
        console.log(`Job ${job.id} exceeded max retries, skipping`);
        continue;
      }

      console.log(`Retrying job ${job.id} (attempt ${job.retry_count + 1}/${job.max_retries})`);

      // Reset job to pending
      const { error: updateError } = await supabaseClient
        .from('star_cloudprnt_jobs')
        .update({
          status: 'pending',
          retry_count: job.retry_count + 1,
          error_message: null,
          next_retry_at: null,
        })
        .eq('id', job.id);

      if (updateError) {
        console.error(`Error updating job ${job.id}:`, updateError);
      } else {
        retriedCount++;
      }
    }

    console.log(`Successfully queued ${retriedCount} jobs for retry`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Queued ${retriedCount} jobs for retry`,
        retried: retriedCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Retry function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
