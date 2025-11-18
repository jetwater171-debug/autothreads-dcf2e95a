import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accountId, text } = await req.json();

    if (!accountId || !text) {
      throw new Error('accountId e text são obrigatórios');
    }

    // Obter usuário autenticado
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

    // Buscar conta do Threads
    const { data: account, error: accountError } = await supabaseClient
      .from('threads_accounts')
      .select('account_id, access_token')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      throw new Error('Conta não encontrada');
    }

    console.log('Criando post no Threads...');

    // Criar o post (container)
    const createResponse = await fetch(
      `https://graph.threads.net/v1.0/${account.account_id}/threads?` +
      `access_token=${account.access_token}` +
      `&domain=THREADS` +
      `&media_type=TEXT` +
      `&text=${encodeURIComponent(text)}`,
      {
        method: 'POST',
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Erro ao criar post:', errorText);
      throw new Error(`Erro ao criar post: ${errorText}`);
    }

    const createData = await createResponse.json();
    const creationId = createData.id;

    console.log('Post criado com ID:', creationId);
    console.log('Aguardando 10 segundos para processar container...');
    
    // Delay de 10 segundos para a API processar o container
    await sleep(10000);
    
    console.log('Publicando post...');

    // Publicar o post
    const publishResponse = await fetch(
      `https://graph.threads.net/v1.0/${account.account_id}/threads_publish?` +
      `access_token=${account.access_token}` +
      `&creation_id=${creationId}`,
      {
        method: 'POST',
      }
    );

    if (!publishResponse.ok) {
      const errorText = await publishResponse.text();
      console.error('Erro ao publicar post:', errorText);
      throw new Error(`Erro ao publicar post: ${errorText}`);
    }

    const publishData = await publishResponse.json();
    console.log('Post publicado com sucesso:', publishData.id);

    return new Response(
      JSON.stringify({
        success: true,
        postId: publishData.id,
        creationId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro ao criar post:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
