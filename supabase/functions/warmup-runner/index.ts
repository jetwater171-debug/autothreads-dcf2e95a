import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Warmup Runner iniciado');

    // Fetch pending scheduled posts
    const { data: scheduledPosts, error: fetchError } = await supabase
      .from('warmup_scheduled_posts')
      .select(`
        *,
        warmup_runs!inner(*, warmup_sequences!inner(user_id)),
        warmup_day_posts!inner(*, warmup_day_post_carousel_images(*, images(*))),
        warmup_days!inner(*)
      `)
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .limit(50);

    if (fetchError) {
      console.error('❌ Erro ao buscar posts agendados:', fetchError);
      throw fetchError;
    }

    console.log(`📋 ${scheduledPosts?.length || 0} posts pendentes encontrados`);

    if (!scheduledPosts || scheduledPosts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;

    for (const scheduledPost of scheduledPosts) {
      try {
        // Check if run is still active
        if (scheduledPost.warmup_runs.status !== 'running') {
          console.log(`⏭️ Run ${scheduledPost.run_id} não está mais ativo, cancelando post`);
          await supabase
            .from('warmup_scheduled_posts')
            .update({ status: 'cancelled' })
            .eq('id', scheduledPost.id);
          continue;
        }

        // Mark as processing
        await supabase
          .from('warmup_scheduled_posts')
          .update({
            status: 'processing',
            attempts: scheduledPost.attempts + 1,
          })
          .eq('id', scheduledPost.id);

        const dayPost = scheduledPost.warmup_day_posts;

        // Build post content
        let text = null;
        const imageUrls: string[] = [];

        // NEW: Check if post_id is set (uses new posts table)
        let isSpoiler = false;
        if (dayPost.post_id) {
          const { data: postData } = await supabase
            .from('posts')
            .select('content, image_urls, post_type, is_spoiler')
            .eq('id', dayPost.post_id)
            .single();

          if (postData) {
            text = postData.content;
            if (postData.image_urls) {
              imageUrls.push(...postData.image_urls);
            }
            isSpoiler = postData.is_spoiler || false;
          }
        } else {
          // LEGACY: Use old method with phrases/images
          // Get text content - priority: custom_text > random phrase > specific phrase
          if (['text', 'text_image', 'carousel'].includes(dayPost.content_type)) {
            // First check for custom text (direct input from user)
            if (dayPost.custom_text) {
              text = dayPost.custom_text;
            } else if (dayPost.use_random_phrase) {
              let query = supabase
                .from('phrases')
                .select('content')
                .eq('user_id', scheduledPost.warmup_runs.warmup_sequences.user_id);

              if (dayPost.random_phrase_folder_id) {
                query = query.eq('folder_id', dayPost.random_phrase_folder_id);
              }

              const { data: phrases } = await query;
              if (phrases && phrases.length > 0) {
                const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
                text = randomPhrase.content;
              }
            } else if (dayPost.specific_phrase_id) {
              const { data: phrase } = await supabase
                .from('phrases')
                .select('content')
                .eq('id', dayPost.specific_phrase_id)
                .single();
              if (phrase) text = phrase.content;
            }
          }

          // Get image content
          if (['image', 'text_image'].includes(dayPost.content_type)) {
            if (dayPost.use_random_image) {
              let query = supabase
                .from('images')
                .select('public_url')
                .eq('user_id', scheduledPost.warmup_runs.warmup_sequences.user_id);

              if (dayPost.random_image_folder_id) {
                query = query.eq('folder_id', dayPost.random_image_folder_id);
              }

              const { data: images } = await query;
              if (images && images.length > 0) {
                const randomImage = images[Math.floor(Math.random() * images.length)];
                imageUrls.push(randomImage.public_url);
              }
            } else if (dayPost.specific_image_id) {
              const { data: image } = await supabase
                .from('images')
                .select('public_url')
                .eq('id', dayPost.specific_image_id)
                .single();
              if (image) imageUrls.push(image.public_url);
            }
          }

          // Get carousel images
          if (dayPost.content_type === 'carousel') {
            const carouselImages = dayPost.warmup_day_post_carousel_images || [];
            for (const carouselImage of carouselImages) {
              if (carouselImage.images) {
                imageUrls.push(carouselImage.images.public_url);
              }
            }
          }
        }

        console.log(`📤 Criando post para conta ${scheduledPost.warmup_runs.account_id}`);

        // Call threads-create-post
        const { data: postResult, error: postError } = await supabase.functions.invoke('threads-create-post', {
          body: {
            accountId: scheduledPost.warmup_runs.account_id,
            text: text || undefined,
            imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
            postType: dayPost.content_type,
            userId: scheduledPost.warmup_runs.warmup_sequences.user_id,
            warmupRunId: scheduledPost.run_id,
            isSpoiler: isSpoiler,
          },
        });

        if (postError) {
          console.error('❌ Erro ao criar post:', postError);
          await supabase
            .from('warmup_scheduled_posts')
            .update({
              status: 'failed',
              error_message: postError.message,
            })
            .eq('id', scheduledPost.id);
          continue;
        }

        console.log('✅ Post criado com sucesso');

        // Mark as success
        await supabase
          .from('warmup_scheduled_posts')
          .update({
            status: 'success',
            executed_at: new Date().toISOString(),
          })
          .eq('id', scheduledPost.id);

        processed++;

        // Check if all posts for this run are completed
        const { data: remainingPosts } = await supabase
          .from('warmup_scheduled_posts')
          .select('id')
          .eq('run_id', scheduledPost.run_id)
          .eq('status', 'pending');

        if (!remainingPosts || remainingPosts.length === 0) {
          console.log(`🎉 Run ${scheduledPost.run_id} completado!`);

          // Mark run as completed
          await supabase
            .from('warmup_runs')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', scheduledPost.run_id);

          // Update account status
          await supabase
            .from('threads_accounts')
            .update({
              warmup_status: 'warmed',
              active_warmup_run_id: null,
            })
            .eq('id', scheduledPost.warmup_runs.account_id);

          // Restore paused automations
          const { data: pausedAutomations } = await supabase
            .from('warmup_paused_automations')
            .select('*')
            .eq('run_id', scheduledPost.run_id);

          if (pausedAutomations) {
            for (const automation of pausedAutomations) {
              if (automation.automation_type === 'periodic_post') {
                await supabase
                  .from('periodic_posts')
                  .update({ is_active: true })
                  .eq('id', automation.automation_id);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Erro ao processar post:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await supabase
          .from('warmup_scheduled_posts')
          .update({
            status: 'failed',
            error_message: errorMessage,
          })
          .eq('id', scheduledPost.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Erro geral:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
