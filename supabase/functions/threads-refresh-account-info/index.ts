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
    const { accountId } = await req.json();
    
    console.log('🔄 Atualizando informações para conta:', accountId);
    
    // Autenticar
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header não fornecido');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');
    
    // Buscar conta
    const { data: account, error } = await supabase
      .from('threads_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();
    
    if (error || !account) throw new Error('Conta não encontrada');
    
    console.log('📡 Buscando perfil atualizado do Threads...');
    
    // Buscar informações atualizadas do perfil
    const profileResponse = await fetch(
      `https://graph.threads.net/v1.0/${account.account_id}?` +
      `fields=username,threads_profile_picture_url&` +
      `access_token=${account.access_token}`,
      { method: 'GET' }
    );
    
    if (!profileResponse.ok) {
      console.error('❌ Erro ao buscar perfil - Token inválido ou conta desconectada');
      // Token inválido ou conta desconectada
      await supabase
        .from('threads_accounts')
        .update({ is_active: false })
        .eq('id', accountId);
      
      throw new Error('Conta desconectada ou token inválido');
    }
    
    const profileData = await profileResponse.json();
    
    console.log('✅ Perfil atualizado:', profileData.username);
    
    // Atualizar informações no banco
    await supabase
      .from('threads_accounts')
      .update({
        username: profileData.username,
        profile_picture_url: profileData.threads_profile_picture_url,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId);
    
    return new Response(
      JSON.stringify({
        success: true,
        username: profileData.username,
        profilePictureUrl: profileData.threads_profile_picture_url,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('🔥 Erro ao atualizar info:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
