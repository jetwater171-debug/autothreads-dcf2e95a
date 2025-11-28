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
    console.log("🧹 Iniciando limpeza de histórico de posts antigos...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Calcular data de ontem (tudo antes de hoje)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`📅 Removendo posts anteriores a: ${today.toISOString()}`);

    // Deletar todos os posts anteriores a hoje
    const { data, error, count } = await supabase
      .from("post_history")
      .delete({ count: 'exact' })
      .lt("posted_at", today.toISOString());

    if (error) throw error;

    console.log(`✅ Limpeza concluída! ${count || 0} posts antigos removidos.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${count || 0} posts antigos removidos`,
        cleaned_before: today.toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("🔥 Erro na limpeza:", err.message);

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
