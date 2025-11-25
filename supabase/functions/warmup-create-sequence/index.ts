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

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const body = await req.json();
    const { name, totalDays, days } = body;

    console.log('📥 Criando nova sequência de aquecimento:', { name, totalDays, daysCount: days?.length });

    // Create warmup_sequence
    const { data: sequence, error: sequenceError } = await supabase
      .from('warmup_sequences')
      .insert({
        user_id: user.id,
        name,
        total_days: totalDays,
        status: 'active',
      })
      .select()
      .single();

    if (sequenceError) {
      console.error('❌ Erro ao criar sequência:', sequenceError);
      throw sequenceError;
    }

    console.log('✅ Sequência criada:', sequence.id);

    // Create days and posts
    for (const day of days) {
      const { data: warmupDay, error: dayError } = await supabase
        .from('warmup_days')
        .insert({
          sequence_id: sequence.id,
          day_index: day.dayIndex,
          is_rest: day.isRest,
        })
        .select()
        .single();

      if (dayError) {
        console.error('❌ Erro ao criar dia:', dayError);
        throw dayError;
      }

      console.log(`✅ Dia ${day.dayIndex} criado:`, warmupDay.id);

      if (!day.isRest && day.posts) {
        for (const post of day.posts) {
          const { data: warmupPost, error: postError } = await supabase
            .from('warmup_day_posts')
            .insert({
              day_id: warmupDay.id,
              order_index: post.orderIndex,
              time_of_day: post.time,
              intelligent_delay: post.intelligentDelay,
              content_type: post.contentType,
              use_random_phrase: post.useRandomPhrase,
              specific_phrase_id: post.specificPhraseId || null,
              random_phrase_folder_id: post.randomPhraseFolderId || null,
              use_random_image: post.useRandomImage,
              specific_image_id: post.specificImageId || null,
              random_image_folder_id: post.randomImageFolderId || null,
            })
            .select()
            .single();

          if (postError) {
            console.error('❌ Erro ao criar post:', postError);
            throw postError;
          }

          console.log(`✅ Post ${post.orderIndex} do dia ${day.dayIndex} criado:`, warmupPost.id);

          // If carousel, add images
          if (post.contentType === 'carousel' && post.carouselImageIds?.length > 0) {
            const carouselImages = post.carouselImageIds.map((imageId: string, index: number) => ({
              day_post_id: warmupPost.id,
              image_id: imageId,
              position: index + 1,
            }));

            const { error: carouselError } = await supabase
              .from('warmup_day_post_carousel_images')
              .insert(carouselImages);

            if (carouselError) {
              console.error('❌ Erro ao adicionar imagens de carrossel:', carouselError);
              throw carouselError;
            }

            console.log(`✅ ${carouselImages.length} imagens de carrossel adicionadas`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sequenceId: sequence.id }),
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
