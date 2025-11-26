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
    const { code } = await req.json();

    if (!code) {
      throw new Error('Código de autorização não fornecido');
    }

    const threadsAppId = Deno.env.get('THREADS_APP_ID');
    const threadsAppSecret = Deno.env.get('THREADS_APP_SECRET');
    const threadsRedirectUri = Deno.env.get('THREADS_REDIRECT_URI');

    if (!threadsAppId || !threadsAppSecret || !threadsRedirectUri) {
      throw new Error('Credenciais do Threads não configuradas');
    }

    // Trocar código por token de curta duração
    console.log('🔄 Iniciando troca de código por token...');
    console.log('📋 Endpoint:', 'https://graph.threads.net/oauth/access_token');
    console.log('📋 client_id:', threadsAppId);
    console.log('📋 client_secret:', threadsAppSecret);
    console.log('📋 redirect_uri:', threadsRedirectUri);
    console.log('📋 code (primeiros 10 chars):', code.substring(0, 10));
    console.log('📋 grant_type:', 'authorization_code');
    
    // Tentar com URLSearchParams + application/x-www-form-urlencoded
    // Isso corresponde ao formato usado em muitas APIs OAuth
    const params = new URLSearchParams();
    params.append('client_id', threadsAppId);
    params.append('client_secret', threadsAppSecret);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', threadsRedirectUri);
    params.append('code', code);
    
    console.log('📤 Enviando requisição POST...');
    const tokenResponse = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Erro ao trocar código:', errorText);
      throw new Error(`Erro ao obter token: ${errorText}`);
    }

    // Receber resposta como texto primeiro para evitar perda de precisão em números grandes
    const tokenText = await tokenResponse.text();
    console.log('Resposta bruta da API:', tokenText);
    
    const tokenData = JSON.parse(tokenText);
    const shortLivedToken = tokenData.access_token;
    
    console.log('Token de curta duração obtido, trocando por token de longa duração...');

    // Trocar token de curta duração por token de longa duração
    const longLivedResponse = await fetch(
      `https://graph.threads.net/access_token?` +
      `grant_type=th_exchange_token` +
      `&client_secret=${threadsAppSecret}` +
      `&access_token=${shortLivedToken}`,
      {
        method: 'GET',
      }
    );

    if (!longLivedResponse.ok) {
      const errorText = await longLivedResponse.text();
      console.error('Erro ao obter token de longa duração:', errorText);
      throw new Error(`Erro ao obter token de longa duração: ${errorText}`);
    }

    const longLivedData = await longLivedResponse.json();
    const longLivedToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in; // segundos até expirar
    
    // Calcular data de expiração
    const expiresAt = new Date(Date.now() + (expiresIn * 1000));

    console.log('Token de longa duração obtido, buscando ID correto do usuário...');

    // Buscar ID correto do usuário usando me?fields=id
    const meResponse = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id&access_token=${longLivedToken}`,
      {
        method: 'GET',
      }
    );

    if (!meResponse.ok) {
      const errorText = await meResponse.text();
      console.error('Erro ao buscar ID do usuário:', errorText);
      throw new Error(`Erro ao buscar ID: ${errorText}`);
    }

    const meData = await meResponse.json();
    const userId = String(meData.id); // ID correto como string
    
    console.log('ID correto obtido:', userId);
    console.log('Buscando informações do perfil...');

    // Buscar informações do perfil
    const profileResponse = await fetch(
      `https://graph.threads.net/v1.0/${userId}?fields=username,threads_profile_picture_url&access_token=${longLivedToken}`,
      {
        method: 'GET',
      }
    );

    let username = null;
    let profilePictureUrl = null;
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      username = profileData.username;
      profilePictureUrl = profileData.threads_profile_picture_url;
      console.log('Username obtido:', username);
      console.log('Profile picture URL obtida:', profilePictureUrl);
    }

    // Obter usuário autenticado
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Token de autenticação não fornecido');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    console.log('Salvando conta no banco de dados...');

    // Verificar se a conta já existe
    const { data: existingAccount } = await supabaseClient
      .from('threads_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('account_id', userId)
      .single();

    if (existingAccount) {
      // Atualizar conta existente
      const { error: updateError } = await supabaseClient
        .from('threads_accounts')
        .update({
          access_token: longLivedToken,
          username,
          profile_picture_url: profilePictureUrl,
          is_active: true,
          token_expires_at: expiresAt.toISOString(),
          token_refreshed_at: new Date().toISOString(),
        })
        .eq('id', existingAccount.id);

      if (updateError) throw updateError;
    } else {
      // Inserir nova conta
      const { error: insertError } = await supabaseClient
        .from('threads_accounts')
        .insert({
          user_id: user.id,
          account_id: userId,
          access_token: longLivedToken,
          username,
          profile_picture_url: profilePictureUrl,
          token_expires_at: expiresAt.toISOString(),
          token_refreshed_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;
    }

    console.log('Conta salva com sucesso!');

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        username,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro no callback OAuth:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
