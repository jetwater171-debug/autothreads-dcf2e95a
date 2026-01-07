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
    const { accountId, text, imageUrls, postType, userId, isSpoiler } = await req.json();

    console.log(`📥 Recebido: accountId=${accountId}, postType=${postType}, userId=${userId}, isSpoiler=${isSpoiler}`);

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

    // Verificar se é uma chamada com SERVICE_ROLE_KEY
    const isServiceRole = authHeader.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    
    let authenticatedUserId: string;

    if (isServiceRole && userId) {
      // Chamada interna (cron/periodic posts) com SERVICE_ROLE_KEY e userId fornecido
      console.log(`🔐 Autenticação via SERVICE_ROLE para user: ${userId}`);
      authenticatedUserId = userId;
    } else {
      // Chamada normal do frontend - validar usuário
      console.log(`🔐 Autenticação via token do usuário`);
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
      authenticatedUserId = user.id;
    }

    // Buscar conta vinculada usando SERVICE_ROLE_KEY para evitar problemas de RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: account, error: accountError } = await supabaseAdmin
      .from('threads_accounts')
      .select('account_id, access_token, username')
      .eq('id', accountId)
      .eq('user_id', authenticatedUserId)
      .single();

    if (accountError || !account) {
      console.error(`❌ Conta não encontrada: accountId=${accountId}, userId=${authenticatedUserId}`, accountError);
      throw new Error('Conta não encontrada');
    }

    console.log(`✅ Conta encontrada: @${account.username}`);

    console.log(`📤 Criando post tipo ${postType} para @${account.username}...`);
    if (imageUrls && imageUrls.length > 0) {
      console.log(`🖼️  Imagens: ${imageUrls.length}x`);
    }
    if (text) {
      console.log(`📝 Texto: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
    }
    if (isSpoiler) {
      console.log(`⚠️ Post marcado como SPOILER`);
    }

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
        const childReq: Record<string, any> = {
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
      const carouselBody: Record<string, any> = {
        access_token: account.access_token,
        media_type: "CAROUSEL",
        children: childrenIds,
        text: text ?? ""
      };

      // Adicionar flag de spoiler se ativado
      if (isSpoiler) {
        carouselBody.is_spoiler_media = true;
      }

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
      const body: Record<string, any> = {
        access_token: account.access_token,
        media_type: "IMAGE",
        upload_type: "external",
        image_url: imageUrls[0],
        text: text ?? ""
      };

      // Adicionar flag de spoiler se ativado
      if (isSpoiler) {
        body.is_spoiler_media = true;
      }

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
      const body: Record<string, any> = {
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

    console.log(`✅ Container criado: ${creationId}`);
    console.log("⏳ Aguardando 3s para processamento...");

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

    console.log(`🎉 Post publicado com sucesso! ID: ${publishData.id}`);

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
    console.error("❌ ERRO:", error);
    console.error("❌ Stack:", (error as Error).stack);

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
