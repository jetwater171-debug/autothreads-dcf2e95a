import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function createPostWithRetry(
  url: string,
  body: any,
  authHeader: string,
  maxAttempts: number = 3
): Promise<{ success: boolean; data?: any; error?: string; attempts: number }> {
  const delays = [0, 10000, 30000]; // 0s, 10s, 30s
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        const delayMs = delays[attempt - 1];
        console.log(`🔄 Tentativa ${attempt}/${maxAttempts} após ${delayMs / 1000}s...`);
        await sleep(delayMs);
      } else {
        console.log(`📤 Tentativa ${attempt}/${maxAttempts}...`);
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        console.log(`✅ Sucesso na tentativa ${attempt}`);
        return { success: true, data, attempts: attempt };
      }

      console.log(`⚠️ Falha na tentativa ${attempt}: ${data.error || 'Erro desconhecido'}`);
      
      // Se não for a última tentativa, continua
      if (attempt < maxAttempts) {
        continue;
      }

      // Última tentativa falhou
      return {
        success: false,
        error: data.error || 'Erro desconhecido',
        attempts: attempt
      };

    } catch (err: any) {
      console.log(`⚠️ Exceção na tentativa ${attempt}: ${err.message}`);
      
      // Se não for a última tentativa, continua
      if (attempt < maxAttempts) {
        continue;
      }

      // Última tentativa falhou
      return {
        success: false,
        error: err.message,
        attempts: attempt
      };
    }
  }

  // Fallback (nunca deve chegar aqui)
  return {
    success: false,
    error: 'Todas as tentativas falharam',
    attempts: maxAttempts
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Iniciando execução dos posts periódicos...");

    // Supabase Service Role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Buscar todos os posts ativos
    const { data: periodicPosts, error: postsError } = await supabase
      .from("periodic_posts")
      .select(`
        *,
        threads_accounts ( account_id, access_token, username )
      `)
      .eq("is_active", true);

    if (postsError) throw postsError;

    console.log(`📌 ${periodicPosts?.length || 0} posts periódicos encontrados.`);

    const results: any[] = [];

    for (const post of periodicPosts || []) {
      try {
        console.log(`\n📝 Processando post ID ${post.id}...`);
        console.log(`   Tipo: ${post.post_type}`);
        console.log(`   Conta: ${post.threads_accounts?.username || 'desconhecida'}`);

        // 1. Verificar tempo desde o último post
        const now = new Date();
        const last = post.last_posted_at ? new Date(post.last_posted_at) : null;

        if (last) {
          const diffMinutes = (now.getTime() - last.getTime()) / (1000 * 60);

          if (diffMinutes < post.interval_minutes) {
            console.log(`⏳ Ainda não está no intervalo. (${diffMinutes.toFixed(1)} min)`);
            continue;
          }
        }

        // 2. Obter frase (se necessário)
        let phraseContent = "";

        if (post.post_type !== "image" || post.use_random_phrase || post.specific_phrase_id) {
          phraseContent = await getPhraseForPost(supabase, post);
        }

        // 3. Obter imagem(ns) (se necessário)
        const imageUrls = await getImagesForPost(supabase, post);

        // 4. Atualizar last_posted_at ANTES de criar o post (evita duplicação)
        await supabase
          .from("periodic_posts")
          .update({ last_posted_at: now.toISOString() })
          .eq("id", post.id);

        // 5. Delay inteligente (diferente para cada post)
        if (post.use_intelligent_delay) {
          const delaySec = Math.floor(Math.random() * 16) + 5; // 5-20s aleatório por post
          console.log(`⌛ Delay inteligente de ${delaySec}s para este post`);
          await sleep(delaySec * 1000);
        }

        // 6. Criar post com retry automático
        const createPostUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/threads-create-post`;
        
        const result = await createPostWithRetry(
          createPostUrl,
          {
            accountId: post.account_id,
            text: phraseContent,
            imageUrls,
            postType: post.post_type,
            userId: post.user_id,
          },
          `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          3
        );

        if (!result.success) {
          console.error(`❌ Todas as tentativas falharam após ${result.attempts} attempts`);
          
          // Registrar falha no histórico
          await supabase.from("post_history").insert({
            user_id: post.user_id,
            account_id: post.account_id,
            phrase_id: post.specific_phrase_id ?? null,
            content: phraseContent,
            image_urls: imageUrls,
            post_type: post.post_type,
            posted_at: now.toISOString(),
            error_message: result.error,
            attempts: result.attempts,
          });

          results.push({
            postId: post.id,
            success: false,
            error: result.error,
            attempts: result.attempts,
          });

          continue;
        }

        console.log(`✅ Publicado com sucesso após ${result.attempts} tentativa(s)!`);
        console.log(`   Threads ID: ${result.data.postId}`);

        // 7. Registrar histórico de sucesso
        await supabase.from("post_history").insert({
          user_id: post.user_id,
          account_id: post.account_id,
          phrase_id: post.specific_phrase_id ?? null,
          content: phraseContent,
          image_urls: imageUrls,
          post_type: post.post_type,
          threads_post_id: result.data.postId,
          posted_at: now.toISOString(),
          attempts: result.attempts,
        });

        results.push({
          postId: post.id,
          success: true,
          threadsPostId: result.data.postId,
          attempts: result.attempts,
        });

      } catch (err: any) {
        console.error(`❌ ERRO no post ${post.id}:`);
        console.error(`   Mensagem: ${err.message}`);
        console.error(`   Stack:`, err.stack);

        results.push({
          postId: post.id,
          success: false,
          error: err.message,
        });
      }
    }

    console.log("\n🏁 Execução concluída.");

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("🔥 Erro geral:", err.message);

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


//
// 🔧 Função auxiliar — Selecionar frase
//
async function getPhraseForPost(supabase: any, post: any) {
  if (post.use_random_phrase) {
    let query = supabase
      .from("phrases")
      .select("content")
      .eq("user_id", post.user_id);

    // Filtrar por pasta se especificado
    if (post.random_phrase_folder_id) {
      query = query.eq("folder_id", post.random_phrase_folder_id);
    }

    const { data: phrases } = await query;

    if (!phrases || phrases.length === 0) return "";

    const random = phrases[Math.floor(Math.random() * phrases.length)];
    return random.content;
  }

  if (post.specific_phrase_id) {
    const { data: phrase } = await supabase
      .from("phrases")
      .select("content")
      .eq("id", post.specific_phrase_id)
      .single();

    return phrase?.content ?? "";
  }

  return "";
}

//
// 🔧 Função auxiliar — Selecionar imagens
//
async function getImagesForPost(supabase: any, post: any) {
  if (post.post_type === "image") {
    if (post.use_random_image) {
      const { data: images } = await supabase
        .from("images")
        .select("public_url")
        .eq("user_id", post.user_id);

      if (!images || images.length === 0) return [];

      return [images[Math.floor(Math.random() * images.length)].public_url];
    }

    if (post.specific_image_id) {
      const { data: img } = await supabase
        .from("images")
        .select("public_url")
        .eq("id", post.specific_image_id)
        .single();

      return img ? [img.public_url] : [];
    }

    return [];
  }

  if (post.post_type === "carousel") {
    if (!post.carousel_image_ids || post.carousel_image_ids.length < 2)
      return [];

    const { data: imgs } = await supabase
      .from("images")
      .select("id, public_url")
      .in("id", post.carousel_image_ids);

    if (!imgs) return [];

    // Manter ordem exata dos IDs
    return post.carousel_image_ids
      .map((id: string) => imgs.find((img: any) => img.id === id))
      .filter(Boolean)
      .map((img: any) => img!.public_url);
  }

  return [];
}
