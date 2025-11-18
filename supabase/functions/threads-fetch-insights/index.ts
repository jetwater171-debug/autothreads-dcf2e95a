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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Token de autenticação não fornecido');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { accountId } = await req.json();

    if (!accountId) {
      throw new Error('ID da conta não fornecido');
    }

    console.log('Buscando insights para conta:', accountId);

    // Buscar dados da conta
    const { data: account, error: accountError } = await supabaseClient
      .from('threads_accounts')
      .select('account_id, access_token, username')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      throw new Error('Conta não encontrada');
    }

    console.log('Buscando insights da API do Threads para:', account.username);

    // Buscar insights do usuário da API do Threads, incluindo followers_count
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
      console.error('Erro ao buscar insights:', errorText);
      throw new Error(`Erro ao buscar insights: ${errorText}`);
    }

    const insightsData = await insightsResponse.json();
    console.log('Insights obtidos:', JSON.stringify(insightsData));

    // Processar os insights
    const insights: any = {
      user_id: user.id,
      account_id: accountId,
    };

    if (insightsData.data && Array.isArray(insightsData.data)) {
      for (const metric of insightsData.data) {
        const metricName = metric.name;
        
        // A API do Threads pode retornar métricas em diferentes formatos:
        // - total_value.value para métricas agregadas
        // - values[0].value para séries temporais
        let metricValue = 0;
        if (metric.total_value?.value !== undefined) {
          metricValue = metric.total_value.value;
        } else if (metric.values && Array.isArray(metric.values) && metric.values.length > 0) {
          metricValue = metric.values[0].value || 0;
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
      console.error('Erro ao salvar insights:', insertError);
      throw insertError;
    }

    console.log('Insights salvos com sucesso!');

    return new Response(
      JSON.stringify({
        success: true,
        insights,
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
