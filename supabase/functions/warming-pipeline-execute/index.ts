import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("🔥 Iniciando execução de esteiras de aquecimento...");

    // Buscar todas as contas em aquecimento
    const { data: warmingAccounts, error: accountsError } = await supabase
      .from("warming_pipeline_accounts")
      .select(`
        *,
        warming_pipelines!inner(*),
        threads_accounts!inner(*)
      `)
      .eq("status", "warming");

    if (accountsError) {
      console.error("Erro ao buscar contas:", accountsError);
      throw accountsError;
    }

    if (!warmingAccounts || warmingAccounts.length === 0) {
      console.log("✅ Nenhuma conta em aquecimento no momento");
      return new Response(JSON.stringify({ message: "No accounts warming" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`📊 ${warmingAccounts.length} conta(s) em aquecimento encontrada(s)`);

    // Processar cada conta
    for (const warmingAccount of warmingAccounts) {
      console.log(`\n🔄 Processando conta ${warmingAccount.threads_accounts.username}...`);
      console.log(`   Dia atual: ${warmingAccount.current_day}`);

      // Buscar o dia atual
      const { data: currentDay, error: dayError } = await supabase
        .from("warming_pipeline_days")
        .select("*")
        .eq("pipeline_id", warmingAccount.pipeline_id)
        .eq("day_number", warmingAccount.current_day)
        .single();

      if (dayError || !currentDay) {
        console.error("   ❌ Erro ao buscar dia:", dayError);
        continue;
      }

      // Se é dia de descanso
      if (currentDay.posts_count === 0) {
        console.log("   💤 Dia de descanso");
        await checkAndAdvanceDay(supabase, warmingAccount);
        continue;
      }

      // Buscar os posts do dia
      const { data: posts, error: postsError } = await supabase
        .from("warming_pipeline_posts")
        .select("*")
        .eq("day_id", currentDay.id)
        .order("post_order", { ascending: true });

      if (postsError || !posts) {
        console.error("   ❌ Erro ao buscar posts:", postsError);
        continue;
      }

      // Verificar quais posts já foram executados hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: executedToday } = await supabase
        .from("post_history")
        .select("id")
        .eq("account_id", warmingAccount.account_id)
        .gte("posted_at", today.toISOString());

      const executedCount = executedToday?.length || 0;
      console.log(`   📝 ${executedCount}/${posts.length} posts executados hoje`);

      // Executar posts pendentes
      for (const post of posts) {
        if (post.post_order <= executedCount) {
          console.log(`   ⏭️ Post ${post.post_order} já foi executado`);
          continue;
        }

        // Verificar se chegou o horário do post
        const now = new Date();
        const [hours, minutes] = post.scheduled_time.split(":");
        const scheduledTime = new Date();
        scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        if (now < scheduledTime) {
          console.log(`   ⏰ Post ${post.post_order} agendado para ${post.scheduled_time} - aguardando`);
          continue;
        }

        console.log(`   🚀 Executando post ${post.post_order}...`);

        try {
          // Aplicar delay inteligente se configurado
          if (post.use_intelligent_delay) {
            const delay = Math.floor(Math.random() * (30000 - 10000 + 1)) + 10000;
            console.log(`   ⌛ Delay inteligente de ${delay / 1000}s`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          // Preparar conteúdo do post
          let phraseContent = null;
          let imageUrl = null;
          let imageUrls: string[] = [];

          // Buscar frase se necessário
          if (["text", "text_image"].includes(post.post_type)) {
            if (post.text_mode === "specific" && post.specific_phrase_id) {
              const { data: phrase } = await supabase
                .from("phrases")
                .select("content")
                .eq("id", post.specific_phrase_id)
                .single();
              phraseContent = phrase?.content;
            } else if (post.text_mode === "random") {
              const { data: phrases } = await supabase
                .from("phrases")
                .select("content")
                .eq("user_id", warmingAccount.warming_pipelines.user_id);
              if (phrases && phrases.length > 0) {
                phraseContent = phrases[Math.floor(Math.random() * phrases.length)].content;
              }
            } else if (post.text_mode === "random_folder" && post.random_phrase_folder_id) {
              const { data: phrases } = await supabase
                .from("phrases")
                .select("content")
                .eq("folder_id", post.random_phrase_folder_id);
              if (phrases && phrases.length > 0) {
                phraseContent = phrases[Math.floor(Math.random() * phrases.length)].content;
              }
            }
          }

          // Buscar imagem(ns) se necessário
          if (post.post_type === "carousel" && post.carousel_image_ids) {
            const { data: images } = await supabase
              .from("images")
              .select("public_url")
              .in("id", post.carousel_image_ids);
            imageUrls = images?.map(img => img.public_url) || [];
          } else if (["image", "text_image"].includes(post.post_type)) {
            if (post.image_mode === "specific" && post.specific_image_id) {
              const { data: image } = await supabase
                .from("images")
                .select("public_url")
                .eq("id", post.specific_image_id)
                .single();
              imageUrl = image?.public_url;
            } else if (post.image_mode === "random") {
              const { data: images } = await supabase
                .from("images")
                .select("public_url")
                .eq("user_id", warmingAccount.warming_pipelines.user_id);
              if (images && images.length > 0) {
                imageUrl = images[Math.floor(Math.random() * images.length)].public_url;
              }
            } else if (post.image_mode === "random_folder" && post.random_image_folder_id) {
              const { data: images } = await supabase
                .from("images")
                .select("public_url")
                .eq("folder_id", post.random_image_folder_id);
              if (images && images.length > 0) {
                imageUrl = images[Math.floor(Math.random() * images.length)].public_url;
              }
            }
          }

          // Chamar função de criar post
          const { error: postError } = await supabase.functions.invoke("threads-create-post", {
            body: {
              accountId: warmingAccount.account_id,
              content: phraseContent || "",
              imageUrl: imageUrl,
              imageUrls: post.post_type === "carousel" ? imageUrls : undefined,
              postType: post.post_type,
            },
          });

          if (postError) {
            console.error(`   ❌ Erro ao criar post:`, postError);
          } else {
            console.log(`   ✅ Post ${post.post_order} executado com sucesso`);
          }
        } catch (error) {
          console.error(`   ❌ Erro ao executar post:`, error);
        }
      }

      // Verificar se todos os posts do dia foram executados
      await checkAndAdvanceDay(supabase, warmingAccount);
    }

    console.log("\n🏁 Execução concluída.");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ Erro:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function checkAndAdvanceDay(supabase: any, warmingAccount: any) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: currentDay } = await supabase
    .from("warming_pipeline_days")
    .select("posts_count")
    .eq("pipeline_id", warmingAccount.pipeline_id)
    .eq("day_number", warmingAccount.current_day)
    .single();

  const { data: executedToday } = await supabase
    .from("post_history")
    .select("id")
    .eq("account_id", warmingAccount.account_id)
    .gte("posted_at", today.toISOString());

  const executedCount = executedToday?.length || 0;

  // Se todos os posts do dia foram executados
  if (executedCount >= (currentDay?.posts_count || 0)) {
    // Verificar se é o último dia
    if (warmingAccount.current_day >= warmingAccount.warming_pipelines.total_days) {
      console.log("   🎉 Esteira concluída! Reativando automações...");
      
      // Marcar como completo
      await supabase
        .from("warming_pipeline_accounts")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", warmingAccount.id);

      // Reativar automações pausadas
      if (warmingAccount.paused_automations && warmingAccount.paused_automations.length > 0) {
        for (const automationId of warmingAccount.paused_automations) {
          await supabase
            .from("periodic_posts")
            .update({ is_active: true })
            .eq("id", automationId);
        }
      }
    } else {
      // Avançar para o próximo dia
      console.log(`   📅 Avançando para o dia ${warmingAccount.current_day + 1}`);
      await supabase
        .from("warming_pipeline_accounts")
        .update({ current_day: warmingAccount.current_day + 1 })
        .eq("id", warmingAccount.id);
    }
  }
}
