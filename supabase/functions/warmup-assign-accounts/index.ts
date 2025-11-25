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
    const { sequenceId, accountIds } = body;

    console.log('📥 Atribuindo contas à sequência:', { sequenceId, accountIds });

    // Fetch sequence with days
    const { data: sequence, error: sequenceError } = await supabase
      .from('warmup_sequences')
      .select('*, warmup_days(*, warmup_day_posts(*, warmup_day_post_carousel_images(*)))')
      .eq('id', sequenceId)
      .single();

    if (sequenceError) {
      console.error('❌ Erro ao buscar sequência:', sequenceError);
      throw new Error(`Sequência não encontrada: ${sequenceError.message}`);
    }

    if (!sequence) {
      throw new Error('Sequência não encontrada');
    }

    const results = [];

    for (const accountId of accountIds) {
      console.log(`\n🔄 Processando conta: ${accountId}`);

      // Create warmup_run
      const { data: run, error: runError } = await supabase
        .from('warmup_runs')
        .insert({
          sequence_id: sequenceId,
          account_id: accountId,
          status: 'running',
          started_at: new Date().toISOString(),
          current_day_index: 1,
        })
        .select()
        .single();

      if (runError) {
        console.error('❌ Erro ao criar run:', runError);
        results.push({ accountId, success: false, error: runError.message });
        continue;
      }

      console.log('✅ Run criado:', run.id);

      // Update threads_account
      const { error: accountError } = await supabase
        .from('threads_accounts')
        .update({
          warmup_status: 'warming',
          active_warmup_run_id: run.id,
        })
        .eq('id', accountId);

      if (accountError) {
        console.error('❌ Erro ao atualizar conta:', accountError);
      }

      // Pause periodic posts
      const { data: periodicPosts, error: periodicError } = await supabase
        .from('periodic_posts')
        .select('*')
        .eq('account_id', accountId)
        .eq('is_active', true);

      if (periodicPosts && periodicPosts.length > 0) {
        console.log(`📴 Pausando ${periodicPosts.length} automações periódicas`);

        const pausedAutomations = periodicPosts.map(post => ({
          run_id: run.id,
          account_id: accountId,
          automation_type: 'periodic_post',
          automation_id: post.id,
          previous_state: { is_active: true },
        }));

        await supabase.from('warmup_paused_automations').insert(pausedAutomations);
        await supabase.from('periodic_posts').update({ is_active: false }).eq('account_id', accountId);
      }

      // Generate scheduled posts
      const scheduledPosts = [];
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      for (const day of sequence.warmup_days) {
        if (day.is_rest) {
          console.log(`⏭️ Dia ${day.day_index} é descanso, pulando`);
          continue;
        }

        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + (day.day_index - 1));

        for (const post of day.warmup_day_posts) {
          const [hours, minutes] = post.time_of_day.split(':');
          const scheduledAt = new Date(dayDate);
          scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

          // Add intelligent delay if enabled
          if (post.intelligent_delay) {
            const offset = Math.floor(Math.random() * 30) - 15; // ±15 minutes
            scheduledAt.setMinutes(scheduledAt.getMinutes() + offset);
          }

          scheduledPosts.push({
            run_id: run.id,
            day_id: day.id,
            day_post_id: post.id,
            scheduled_at: scheduledAt.toISOString(),
            status: 'pending',
          });
        }
      }

      const { error: scheduledError } = await supabase
        .from('warmup_scheduled_posts')
        .insert(scheduledPosts);

      if (scheduledError) {
        console.error('❌ Erro ao criar posts agendados:', scheduledError);
        results.push({ accountId, success: false, error: scheduledError.message });
        continue;
      }

      console.log(`✅ ${scheduledPosts.length} posts agendados criados`);
      results.push({ accountId, success: true, runId: run.id });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Erro geral:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
