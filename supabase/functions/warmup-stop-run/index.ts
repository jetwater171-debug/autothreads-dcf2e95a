import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const body = await req.json();
    const { runId } = body;

    console.log('🛑 Parando run:', runId);

    // Get run details
    const { data: run, error: runError } = await supabase
      .from('warmup_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (runError || !run) {
      throw new Error('Run não encontrado');
    }

    // Mark run as cancelled
    await supabase
      .from('warmup_runs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);

    // Cancel all pending scheduled posts
    await supabase
      .from('warmup_scheduled_posts')
      .update({ status: 'cancelled' })
      .eq('run_id', runId)
      .eq('status', 'pending');

    // Update account status
    await supabase
      .from('threads_accounts')
      .update({
        warmup_status: 'not_warmed',
        active_warmup_run_id: null,
      })
      .eq('id', run.account_id);

    // Restore paused automations
    const { data: pausedAutomations } = await supabase
      .from('warmup_paused_automations')
      .select('*')
      .eq('run_id', runId);

    if (pausedAutomations) {
      console.log(`🔄 Restaurando ${pausedAutomations.length} automações`);

      for (const automation of pausedAutomations) {
        if (automation.automation_type === 'periodic_post') {
          await supabase
            .from('periodic_posts')
            .update({ is_active: true })
            .eq('id', automation.automation_id);
        }
      }
    }

    console.log('✅ Run cancelado e automações restauradas');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
