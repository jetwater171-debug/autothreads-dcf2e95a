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
    
    console.log('🔄 Renovando token para conta:', accountId);
    
    // Autenticar usuário
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
    
    // Verificar se token está válido (não expirado)
    if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
      throw new Error('Token expirado. Reconecte a conta via OAuth.');
    }

    // Buscar credenciais do usuário no user_settings
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('threads_app_secret')
      .eq('user_id', user.id)
      .single();

    if (settingsError || !userSettings || !userSettings.threads_app_secret) {
      throw new Error('Credenciais do Meta não configuradas. Configure em Configurações.');
    }

    const threadsAppSecret = userSettings.threads_app_secret;
    
    console.log('📡 Chamando API do Threads para renovar token...');
    
    // Renovar token na API do Threads (usando o app_secret do usuário)
    const refreshResponse = await fetch(
      `https://graph.threads.net/access_token?` +
      `grant_type=th_refresh_token&` +
      `access_token=${account.access_token}&` +
      `client_secret=${threadsAppSecret}`,
      { method: 'GET' }
    );
    
    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      console.error('❌ Erro ao renovar token:', errorText);
      throw new Error('Erro ao renovar token. Reconecte a conta.');
    }
    
    const refreshData = await refreshResponse.json();
    const newToken = refreshData.access_token;
    const expiresIn = refreshData.expires_in; // segundos até expirar
    
    // Calcular nova data de expiração
    const expiresAt = new Date(Date.now() + (expiresIn * 1000));
    
    console.log('✅ Token renovado! Nova expiração:', expiresAt.toISOString());
    
    // Atualizar no banco
    await supabase
      .from('threads_accounts')
      .update({
        access_token: newToken,
        token_expires_at: expiresAt.toISOString(),
        token_refreshed_at: new Date().toISOString(),
      })
      .eq('id', accountId);
    
    return new Response(
      JSON.stringify({
        success: true,
        expiresAt: expiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('🔥 Erro ao renovar token:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
