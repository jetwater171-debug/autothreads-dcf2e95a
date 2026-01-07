import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função para calcular hash SHA-256 do conteúdo
async function calculateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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

        // 2. Buscar conteúdo do post
        let phraseContent = "";
        let imageUrls: string[] = [];
        let actualPostType = post.post_type;
        let isSpoiler = false;

        // Se for post específico, buscar pelo post_id
        if (post.post_type === 'specific' && post.post_id) {
          const { data: postData } = await supabase
            .from('posts')
            .select('content, image_urls, post_type, is_spoiler')
            .eq('id', post.post_id)
            .single();

          if (postData) {
            phraseContent = postData.content || "";
            imageUrls = postData.image_urls || [];
            isSpoiler = postData.is_spoiler || false;
            // Determinar tipo real do post baseado no conteúdo
            if (imageUrls.length > 1) {
              actualPostType = 'carousel';
            } else if (imageUrls.length === 1) {
              actualPostType = 'image';
            } else {
              actualPostType = 'text';
            }
          }
        }
        // Se for post aleatório, buscar um post aleatório
        else if (post.post_type === 'random') {
          let query = supabase
            .from('posts')
            .select('content, image_urls, post_type, is_spoiler')
            .eq('user_id', post.user_id);

          // TODO: Filtrar por pasta se configurado (random_post_folder_id)
          
          const { data: randomPosts } = await query;

          if (randomPosts && randomPosts.length > 0) {
            const randomPost = randomPosts[Math.floor(Math.random() * randomPosts.length)];
            phraseContent = randomPost.content || "";
            imageUrls = randomPost.image_urls || [];
            isSpoiler = randomPost.is_spoiler || false;
            // Determinar tipo real do post baseado no conteúdo
            if (imageUrls.length > 1) {
              actualPostType = 'carousel';
            } else if (imageUrls.length === 1) {
              actualPostType = 'image';
            } else {
              actualPostType = 'text';
            }
          }
        }

        // 3. Calcular hash do conteúdo
        let contentForHash = "";
        if (actualPostType === "text") {
          contentForHash = phraseContent;
        } else if (actualPostType === "image") {
          contentForHash = imageUrls.join("");
        } else if (actualPostType === "carousel") {
          contentForHash = imageUrls.join("|");
        }

        const contentHash = await calculateContentHash(contentForHash);
        console.log(`🔐 Content hash calculado: ${contentHash}`);

        // 5. Verificar duplicação nos últimos 60 minutos (por conta)
        const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60 * 1000);
        console.log(`🔍 Verificando duplicados desde: ${sixtyMinutesAgo.toISOString()}`);
        
        const { data: duplicates } = await supabase
          .from("post_history")
          .select("id")
          .eq("content_hash", contentHash)
          .eq("account_id", post.account_id)
          .gte("posted_at", sixtyMinutesAgo.toISOString())
          .limit(1);

        console.log(`🔍 Duplicados encontrados: ${duplicates?.length || 0}`);

        if (duplicates && duplicates.length > 0) {
          console.log(`⚠️ Conteúdo duplicado detectado nos últimos 60 min — cancelando publicação`);
          
          // Registrar cancelamento por duplicação (sem atualizar last_posted_at)
          await supabase.from("post_history").insert({
            user_id: post.user_id,
            account_id: post.account_id,
            content: phraseContent,
            image_urls: imageUrls,
            post_type: actualPostType,
            posted_at: now.toISOString(),
            content_hash: contentHash,
            duplicate_skipped: true,
            error_message: "Execução cancelada — conteúdo idêntico postado recentemente.",
            attempts: 0,
          });

          results.push({
            postId: post.id,
            success: false,
            skipped: true,
            reason: "duplicate_content",
          });

          continue;
        }

        // 6. Atualizar last_posted_at ANTES de criar o post (evita duplicação)
        await supabase
          .from("periodic_posts")
          .update({ last_posted_at: now.toISOString() })
          .eq("id", post.id);

        // 7. Delay inteligente (diferente para cada post)
        if (post.use_intelligent_delay) {
          const delaySec = Math.floor(Math.random() * 16) + 5; // 5-20s aleatório por post
          console.log(`⌛ Delay inteligente de ${delaySec}s para este post`);
          await sleep(delaySec * 1000);
        }

        // 8. Criar post com retry automático
        const createPostUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/threads-create-post`;
        
        const result = await createPostWithRetry(
          createPostUrl,
          {
            accountId: post.account_id,
            text: phraseContent,
            imageUrls,
            postType: actualPostType,
            userId: post.user_id,
            isSpoiler: isSpoiler,
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
            content: phraseContent,
            image_urls: imageUrls,
            post_type: actualPostType,
            posted_at: now.toISOString(),
            content_hash: contentHash,
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

        // 9. Registrar histórico de sucesso
        await supabase.from("post_history").insert({
          user_id: post.user_id,
          account_id: post.account_id,
          content: phraseContent,
          image_urls: imageUrls,
          post_type: actualPostType,
          threads_post_id: result.data.postId,
          posted_at: now.toISOString(),
          content_hash: contentHash,
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
