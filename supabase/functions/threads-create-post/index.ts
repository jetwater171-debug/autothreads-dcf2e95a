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
    const { accountId, text, imageUrls, postType } = await req.json();

    if (!accountId) throw new Error('accountId é obrigatório');

    if (postType === 'text' && !text)
      throw new Error('Texto é obrigatório para posts de texto');

    if (postType === 'image' && (!imageUrls || imageUrls.length === 0))
      throw new Error('Imagem é obrigatória para posts de imagem');

    if (postType === 'carousel' && (!imageUrls || imageUrls.length < 2 || imageUrls.length > 10))
      throw new Error('Carrossel requer entre 2 e 10 imagens');

    // Autenticação do Supabase
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Token de autenticação não fornecido');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) throw new Error('Usuário não autenticado');

    // Buscar conta vinculada
    const { data: account, error: accountError } = await supabaseClient
      .from('threads_accounts')
      .select('account_id, access_token')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) throw new Error('Conta não encontrada');

    console.log(`Criando post tipo ${postType}...`);

    //
    // ================================
    // CRIAÇÃO DO CONTAINER
    // ================================
    //

    let creationId: string;

    //
    // POST DE CARROSSEL
    //
    if (postType === 'carousel') {
      const childrenIds: string[] = [];

      for (const imageUrl of imageUrls) {
        const childReq = {
          access_token: account.access_token,
          media_type: "IMAGE",
          upload_type: "external",
          image_url: imageUrl,
          is_carousel_item: true
        };

        const childResponse = await fetch(
          `https://graph.threads.net/v1.0/${account.account_id}/threads`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(childReq),
          }
        );

        if (!childResponse.ok) {
          const err = await childResponse.text();
          console.error("Erro ao criar item do carrossel:", err);
          throw new Error("Erro ao criar item do carrossel");
        }

        const childData = await childResponse.json();
        childrenIds.push(childData.id);
      }

      // Criar o container final com todos os children
      const carouselBody = {
        access_token: account.access_token,
        media_type: "CAROUSEL",
        children: childrenIds,
        text: text ?? ""
      };

      const createResponse = await fetch(
        `https://graph.threads.net/v1.0/${account.account_id}/threads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(carouselBody),
        }
      );

      if (!createResponse.ok) {
        const err = await createResponse.text();
        console.error("Erro ao criar post carousel:", err);
        throw new Error("Erro ao criar carrossel");
      }

      const createData = await createResponse.json();
      creationId = createData.id;
    }

    //
    // POST DE IMAGEM
    //
    else if (postType === "image") {
      const body = {
        access_token: account.access_token,
        media_type: "IMAGE",
        upload_type: "external",
        image_url: imageUrls[0],
        text: text ?? ""
      };

      const createResponse = await fetch(
        `https://graph.threads.net/v1.0/${account.account_id}/threads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!createResponse.ok) {
        const err = await createResponse.text();
        console.error("Erro ao criar post imagem:", err);
        throw new Error("Erro ao criar post de imagem");
      }

      const createData = await createResponse.json();
      creationId = createData.id;
    }

    //
    // POST APENAS TEXTO
    //
    else {
      const body = {
        access_token: account.access_token,
        media_type: "TEXT",
        text: text
      };

      const createResponse = await fetch(
        `https://graph.threads.net/v1.0/${account.account_id}/threads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!createResponse.ok) {
        const err = await createResponse.text();
        console.error("Erro ao criar post texto:", err);
        throw new Error("Erro ao criar post de texto");
      }

      const createData = await createResponse.json();
      creationId = createData.id;
    }

    console.log("Container criado:", creationId);
    console.log("Aguardando processamento...");

    await sleep(3000);

    //
    // ================================
    // PUBLICAR POST
    // ================================
    //

    const publishResponse = await fetch(
      `https://graph.threads.net/v1.0/${account.account_id}/threads_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: account.access_token,
          creation_id: creationId
        }),
      }
    );

    if (!publishResponse.ok) {
      const err = await publishResponse.text();
      console.error("Erro ao publicar post:", err);
      throw new Error("Erro ao publicar post");
    }

    const publishData = await publishResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        creationId,
        postId: publishData.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Erro geral:", error);

    return new Response(
      JSON.stringify({
        error: (error as Error).message || "Erro ao criar post"
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
