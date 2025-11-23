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
    const { accountId, text, imageUrls, postType, userId } = await req.json();

    if (!accountId) {
      throw new Error('accountId é obrigatório');
    }

    // Validações baseadas no tipo de post
    if (postType === 'text' && !text) {
      throw new Error('Texto é obrigatório para posts de texto');
    }

    if (postType === 'image' && (!imageUrls || imageUrls.length === 0)) {
      throw new Error('Imagem é obrigatória para posts de imagem');
    }

    if (postType === 'carousel' && (!imageUrls || imageUrls.length < 2 || imageUrls.length > 10)) {
      throw new Error('Carrossel requer entre 2 e 10 imagens');
    }

    // Obter usuário autenticado
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Token de autenticação não fornecido');
    }

    // Determinar se está usando SERVICE_ROLE_KEY ou token de usuário
    const isServiceRole = authHeader.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'SERVICE_ROLE');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      isServiceRole ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' : Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    let userIdToUse = userId;
    
    // Se não for chamada de service role, obter usuário autenticado
    if (!isServiceRole) {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      userIdToUse = user.id;
    }

    if (!userIdToUse) {
      throw new Error('userId é obrigatório para chamadas de service role');
    }

    // Buscar conta do Threads
    const { data: account, error: accountError } = await supabaseClient
      .from('threads_accounts')
      .select('account_id, access_token')
      .eq('id', accountId)
      .eq('user_id', userIdToUse)
      .single();

    if (accountError || !account) {
      throw new Error('Conta não encontrada');
    }

    console.log(`Criando post tipo ${postType || 'text'} no Threads...`);

    let createUrl = `https://graph.threads.net/v1.0/${account.account_id}/threads?access_token=${account.access_token}&domain=THREADS`;
    let creationId: string;

    // Construir request baseado no tipo de post
    if (postType === 'carousel') {
      // Criar containers individuais para cada imagem
      const childrenIds: string[] = [];

      for (const imageUrl of imageUrls) {
        const childResponse = await fetch(
          `https://graph.threads.net/v1.0/${account.account_id}/threads?` +
          `access_token=${account.access_token}` +
          `&domain=THREADS` +
          `&media_type=IMAGE` +
          `&image_url=${encodeURIComponent(imageUrl)}` +
          `&is_carousel_item=true`,
          { method: 'POST' }
        );

        if (!childResponse.ok) {
          const errorText = await childResponse.text();
          console.error('Erro ao criar item do carrossel:', errorText);
          throw new Error(`Erro ao criar item do carrossel: ${errorText}`);
        }

        const childData = await childResponse.json();
        childrenIds.push(childData.id);
      }

      // Criar container do carrossel com os children
      createUrl += `&media_type=CAROUSEL&children=${childrenIds.join(',')}`;
      if (text) {
        createUrl += `&text=${encodeURIComponent(text)}`;
      }
    } else if (postType === 'image') {
      // Post com 1 imagem + texto opcional
      createUrl += `&media_type=IMAGE&image_url=${encodeURIComponent(imageUrls[0])}`;
      if (text) {
        createUrl += `&text=${encodeURIComponent(text)}`;
      }
    } else {
      // Post apenas com texto (default)
      createUrl += `&media_type=TEXT&text=${encodeURIComponent(text)}`;
    }

    // Criar container
    const createResponse = await fetch(createUrl, { method: 'POST' });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('Erro ao criar post:', errorText);
      throw new Error(`Erro ao criar post: ${errorText}`);
    }

    const createData = await createResponse.json();
    creationId = createData.id;

    console.log('Post criado com ID:', creationId);
    console.log('Aguardando 3 segundos para processar container...');

    // Delay de 3 segundos para a API processar o container
    await sleep(3000);

    console.log('Publicando post...');

    // Publicar o post
    const publishResponse = await fetch(
      `https://graph.threads.net/v1.0/${account.account_id}/threads_publish?` +
      `access_token=${account.access_token}` +
      `&creation_id=${creationId}`,
      { method: 'POST' }
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
