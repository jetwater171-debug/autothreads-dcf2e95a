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
    console.log('Trocando código por token de acesso...');
    const tokenResponse = await fetch(
      `https://graph.threads.net/oauth/access_token?` +
      `client_id=${threadsAppId}` +
      `&client_secret=${threadsAppSecret}` +
      `&grant_type=authorization_code` +
      `&redirect_uri=${encodeURIComponent(threadsRedirectUri)}` +
      `&code=${code}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Erro ao trocar código:', errorText);
      throw new Error(`Erro ao obter token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const shortLivedToken = tokenData.access_token;
    const userId = String(tokenData.user_id); // Armazenar ID original como string

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

    console.log('Token de longa duração obtido, buscando informações do perfil...');

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
