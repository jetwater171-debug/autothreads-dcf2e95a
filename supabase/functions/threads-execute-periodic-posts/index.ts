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

        console.log(`Processando post ${post.id} (tipo: ${post.post_type})...`);

        // Buscar frase se necessário
        let phraseContent = '';

        if (post.post_type === 'text') {
          // Texto obrigatório para posts de texto
          if (post.use_random_phrase) {
            const { data: phrases, error: phrasesError } = await supabaseClient
              .from('phrases')
              .select('content, id')
              .eq('user_id', post.user_id);

            if (phrasesError || !phrases || phrases.length === 0) {
              console.error(`Nenhuma frase encontrada para post ${post.id}`);
              continue;
            }

            const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
            phraseContent = randomPhrase.content;
          } else if (post.specific_phrase_id) {
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
        } else {
          // Texto opcional para posts com imagem ou carrossel
          if (post.use_random_phrase) {
            const { data: phrases } = await supabaseClient
              .from('phrases')
              .select('content')
              .eq('user_id', post.user_id);

            if (phrases && phrases.length > 0) {
              const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
              phraseContent = randomPhrase.content;
            }
          } else if (post.specific_phrase_id) {
            const { data: phrase } = await supabaseClient
              .from('phrases')
              .select('content')
              .eq('id', post.specific_phrase_id)
              .single();

            if (phrase) phraseContent = phrase.content;
          }
        }

        // Buscar imagem(ns) se necessário
        let imageUrls: string[] = [];

        if (post.post_type === 'carousel') {
          // Carousel: usar IDs específicos
          if (post.carousel_image_ids && post.carousel_image_ids.length >= 2) {
            const { data: images } = await supabaseClient
              .from('images')
              .select('public_url')
              .in('id', post.carousel_image_ids);

            if (images) {
              // Manter a ordem dos IDs
              imageUrls = post.carousel_image_ids
                .map((id: string) => images.find((img: any) => images.indexOf(img) !== -1))
                .filter((img: any) => img)
                .map((img: any) => img.public_url);
            }
          }

          if (imageUrls.length < 2) {
            console.error(`Carousel precisa de 2-10 imagens para post ${post.id}`);
            continue;
          }
        } else if (post.post_type === 'image') {
          // Image: 1 imagem (aleatória ou específica)
          if (post.use_random_image) {
            const { data: images } = await supabaseClient
              .from('images')
              .select('public_url')
              .eq('user_id', post.user_id);

            if (images && images.length > 0) {
              const randomIndex = Math.floor(Math.random() * images.length);
              imageUrls = [images[randomIndex].public_url];
            }
          } else if (post.specific_image_id) {
            const { data: image } = await supabaseClient
              .from('images')
              .select('public_url')
              .eq('id', post.specific_image_id)
              .single();

            if (image) imageUrls = [image.public_url];
          }

          if (imageUrls.length === 0) {
            console.error(`Nenhuma imagem disponível para post ${post.id}`);
            continue;
          }
        }

        // Aplicar delay inteligente se configurado
        if (post.use_intelligent_delay) {
          const delaySeconds = Math.floor(Math.random() * (120 - 30 + 1)) + 30;
          console.log(`Aplicando delay inteligente de ${delaySeconds} segundos...`);
          await sleep(delaySeconds * 1000);
        }

        console.log(`Criando post ${post.post_type}...`);

        // Criar o post chamando a função threads-create-post
        const createPostUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/threads-create-post`;
        const createResponse = await fetch(createPostUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            accountId: post.account_id,
            text: phraseContent,
            imageUrls: imageUrls,
            postType: post.post_type,
            userId: post.user_id,
          }),
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error('Erro ao criar post:', errorText);
          throw new Error(`Erro ao criar post: ${errorText}`);
        }

        const publishData = await createResponse.json();

        if (!publishData.success) {
          throw new Error(publishData.error || 'Erro ao criar post');
        }

        console.log('Post publicado com sucesso:', publishData.postId);

        // Registrar no histórico
        await supabaseClient.from('post_history').insert({
          user_id: post.user_id,
          account_id: post.account_id,
          phrase_id: post.specific_phrase_id || null,
          content: phraseContent,
          image_urls: imageUrls,
          post_type: post.post_type,
          threads_post_id: publishData.postId,
          posted_at: now.toISOString(),
        });

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
          threadsPostId: publishData.postId,
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
