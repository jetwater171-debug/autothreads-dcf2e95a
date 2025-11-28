import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RepostRequest {
  threadPostId: string;
  accountIds: string[];
  userId: string;
}

interface RepostResult {
  accountId: string;
  username: string;
  success: boolean;
  repostId?: string;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { threadPostId, accountIds, userId }: RepostRequest = await req.json();

    console.log(`🔄 Iniciando reposts para o post ${threadPostId} em ${accountIds.length} contas`);

    if (!threadPostId || !accountIds || accountIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'threadPostId e accountIds são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar informações das contas
    const { data: accounts, error: accountsError } = await supabase
      .from('threads_accounts')
      .select('id, account_id, username, access_token')
      .in('id', accountIds)
      .eq('user_id', userId);

    if (accountsError || !accounts) {
      console.error('❌ Erro ao buscar contas:', accountsError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar contas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: RepostResult[] = [];

    // Processar reposts para cada conta
    for (const account of accounts) {
      try {
        console.log(`📤 Repostando para @${account.username}...`);

        // Fazer repost via API do Threads
        const repostUrl = `https://graph.threads.net/v1.0/${threadPostId}/repost?access_token=${account.access_token}`;
        const repostResponse = await fetch(repostUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const repostData = await repostResponse.json();

        if (!repostResponse.ok) {
          console.error(`❌ Erro ao repostar para @${account.username}:`, repostData);
          results.push({
            accountId: account.id,
            username: account.username,
            success: false,
            error: repostData.error?.message || 'Erro desconhecido',
          });

          // Registrar falha no histórico
          await supabase.from('post_history').insert({
            user_id: userId,
            account_id: account.id,
            content: `Repost do post ${threadPostId}`,
            post_type: 'repost',
            threads_post_id: null,
            error_message: repostData.error?.message || 'Erro ao repostar',
            attempts: 1,
          });

          continue;
        }

        console.log(`✅ Repost realizado com sucesso para @${account.username}`);

        results.push({
          accountId: account.id,
          username: account.username,
          success: true,
          repostId: repostData.id,
        });

        // Registrar sucesso no histórico
        await supabase.from('post_history').insert({
          user_id: userId,
          account_id: account.id,
          content: `Repost do post ${threadPostId}`,
          post_type: 'repost',
          threads_post_id: repostData.id,
          attempts: 1,
        });

        // Delay de 1 segundo entre reposts para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        console.error(`❌ Exceção ao repostar para @${account.username}:`, error);
        results.push({
          accountId: account.id,
          username: account.username,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`🏁 Reposts finalizados: ${successCount} sucesso(s), ${failureCount} falha(s)`);

    return new Response(
      JSON.stringify({
        results,
        summary: {
          total: results.length,
          success: successCount,
          failure: failureCount,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
