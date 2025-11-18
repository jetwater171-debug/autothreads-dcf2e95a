import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Iniciando busca de insights de todas as contas...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar todas as contas ativas
    const { data: accounts, error: accountsError } = await supabaseClient
      .from('threads_accounts')
      .select('id, user_id, account_id, access_token, username')
      .eq('is_active', true);

    if (accountsError) {
      console.error('Erro ao buscar contas:', accountsError);
      throw accountsError;
    }

    console.log(`Encontradas ${accounts?.length || 0} contas ativas`);

    const results = [];

    for (const account of accounts || []) {
      try {
        console.log(`Buscando insights para: ${account.username || account.account_id}`);

        // Métricas válidas segundo a API (inclui followers_count)
        const metricsToFetch = [
          'followers_count',
          'views',
          'likes',
          'replies',
          'reposts',
          'quotes',
          'clicks'
        ].join(',');

        const insightsUrl = `https://graph.threads.net/v1.0/${account.account_id}/threads_insights?metric=${metricsToFetch}&access_token=${account.access_token}`;
        
        const insightsResponse = await fetch(insightsUrl, {
          method: 'GET',
        });

        if (!insightsResponse.ok) {
          const errorText = await insightsResponse.text();
          console.error(`Erro ao buscar insights para ${account.username}:`, errorText);
          results.push({
            account_id: account.id,
            username: account.username,
            success: false,
            error: errorText,
          });
          continue;
        }

        const insightsData = await insightsResponse.json();

        // Processar os insights
        const insights: any = {
          user_id: account.user_id,
          account_id: account.id,
        };

        if (insightsData.data && Array.isArray(insightsData.data)) {
          for (const metric of insightsData.data) {
            const metricName = metric.name;
            let metricValue = 0;

            // Alguns insights retornam total_value, outros retornam values array
            if (metric.total_value?.value !== undefined) {
              metricValue = metric.total_value.value;
            } else if (metric.values && metric.values.length > 0) {
              // Somar todos os valores do período
              metricValue = metric.values.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
            }
            
            switch (metricName) {
              case 'followers_count':
                insights.followers_count = metricValue;
                break;
              case 'views':
                insights.views = metricValue;
                break;
              case 'likes':
                insights.likes = metricValue;
                break;
              case 'replies':
                insights.replies = metricValue;
                break;
              case 'reposts':
                insights.reposts = metricValue;
                break;
              case 'quotes':
                insights.quotes = metricValue;
                break;
              case 'clicks':
                insights.engaged_audience = metricValue;
                break;
            }
          }
        }

        // Salvar insights no banco de dados
        const { error: insertError } = await supabaseClient
          .from('account_insights')
          .insert(insights);

        if (insertError) {
          console.error(`Erro ao salvar insights para ${account.username}:`, insertError);
          results.push({
            account_id: account.id,
            username: account.username,
            success: false,
            error: insertError.message,
          });
        } else {
          console.log(`Insights salvos com sucesso para ${account.username}!`);
          results.push({
            account_id: account.id,
            username: account.username,
            success: true,
            insights,
          });
        }
      } catch (error) {
        console.error(`Erro ao processar conta ${account.username}:`, error);
        results.push({
          account_id: account.id,
          username: account.username,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    console.log('Busca de insights concluída!');

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro ao buscar insights:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
