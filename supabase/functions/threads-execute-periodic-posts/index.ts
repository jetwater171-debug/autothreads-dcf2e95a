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
    console.log('Iniciando execução de posts periódicos...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar todos os posts periódicos ativos
    const { data: periodicPosts, error: postsError } = await supabaseClient
      .from('periodic_posts')
      .select(`
        *,
        threads_accounts (account_id, access_token, username)
      `)
      .eq('is_active', true);

    if (postsError) {
      console.error('Erro ao buscar posts periódicos:', postsError);
      throw postsError;
    }

    console.log(`Encontrados ${periodicPosts?.length || 0} posts periódicos ativos`);

    const results = [];

    for (const post of periodicPosts || []) {
      try {
        // Verificar se é hora de postar
        const now = new Date();
        const lastPosted = post.last_posted_at ? new Date(post.last_posted_at) : null;

        if (lastPosted) {
          const minutesSinceLastPost = (now.getTime() - lastPosted.getTime()) / (1000 * 60);
          if (minutesSinceLastPost < post.interval_minutes) {
            console.log(`Post ${post.id} ainda não está no intervalo. Minutos desde último: ${minutesSinceLastPost}`);
            continue;
          }
        }

        console.log(`Processando post ${post.id}...`);

        // Buscar frase
        let phraseContent = '';
        
        if (post.use_random_phrase) {
          // Buscar frase aleatória
          const { data: phrases, error: phrasesError } = await supabaseClient
            .from('phrases')
            .select('content')
            .eq('user_id', post.user_id);

          if (phrasesError || !phrases || phrases.length === 0) {
            console.error(`Nenhuma frase encontrada para post ${post.id}`);
            continue;
          }

          const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
          phraseContent = randomPhrase.content;
        } else if (post.specific_phrase_id) {
          // Buscar frase específica
          const { data: phrase, error: phraseError } = await supabaseClient
            .from('phrases')
            .select('content')
            .eq('id', post.specific_phrase_id)
            .single();

          if (phraseError || !phrase) {
            console.error(`Frase específica não encontrada para post ${post.id}`);
            continue;
          }

          phraseContent = phrase.content;
        } else {
          console.error(`Configuração inválida para post ${post.id}`);
          continue;
        }

        // Aplicar delay inteligente se configurado
        if (post.use_intelligent_delay) {
          const delaySeconds = Math.floor(Math.random() * (120 - 30 + 1)) + 30; // 30-120 segundos
          console.log(`Aplicando delay inteligente de ${delaySeconds} segundos...`);
          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        }

        console.log(`Criando post com texto: ${phraseContent.substring(0, 50)}...`);

        // Criar o post (container)
        const createResponse = await fetch(
          `https://graph.threads.net/v1.0/${post.threads_accounts.account_id}/threads?` +
          `access_token=${post.threads_accounts.access_token}` +
          `&domain=THREADS` +
          `&media_type=TEXT` +
          `&text=${encodeURIComponent(phraseContent)}`,
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

        // Publicar o post
        const publishResponse = await fetch(
          `https://graph.threads.net/v1.0/${post.threads_accounts.account_id}/threads_publish?` +
          `access_token=${post.threads_accounts.access_token}` +
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

        // Atualizar last_posted_at
        const { error: updateError } = await supabaseClient
          .from('periodic_posts')
          .update({ last_posted_at: now.toISOString() })
          .eq('id', post.id);

        if (updateError) {
          console.error('Erro ao atualizar last_posted_at:', updateError);
        }

        results.push({
          postId: post.id,
          success: true,
          threadsPostId: publishData.id,
        });

      } catch (error) {
        console.error(`Erro ao processar post ${post.id}:`, error);
        results.push({
          postId: post.id,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    console.log(`Execução concluída. Resultados: ${JSON.stringify(results)}`);

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
    console.error('Erro ao executar posts periódicos:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
