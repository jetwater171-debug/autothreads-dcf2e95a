import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

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
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log('[check-expired-campaigns] Starting check for expired campaigns...');

    // Find active campaigns that have passed their end date
    const now = new Date().toISOString();
    const { data: expiredCampaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, title')
      .eq('status', 'active')
      .lt('end_date', now);

    if (campaignsError) {
      console.error('[check-expired-campaigns] Error fetching campaigns:', campaignsError);
      throw campaignsError;
    }

    if (!expiredCampaigns || expiredCampaigns.length === 0) {
      console.log('[check-expired-campaigns] No expired campaigns found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired campaigns found',
          checked_at: now 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[check-expired-campaigns] Found ${expiredCampaigns.length} expired campaigns`);

    const results = [];

    for (const campaign of expiredCampaigns) {
      console.log(`[check-expired-campaigns] Processing campaign: ${campaign.title} (${campaign.id})`);

      // Update campaign status to 'ended'
      const { error: updateCampaignError } = await supabase
        .from('campaigns')
        .update({ status: 'ended' })
        .eq('id', campaign.id);

      if (updateCampaignError) {
        console.error(`[check-expired-campaigns] Error updating campaign ${campaign.id}:`, updateCampaignError);
        results.push({
          campaign_id: campaign.id,
          campaign_title: campaign.title,
          success: false,
          error: updateCampaignError.message
        });
        continue;
      }

      // Pause all automations in this campaign
      const { data: pausedPosts, error: pauseError } = await supabase
        .from('periodic_posts')
        .update({ is_active: false })
        .eq('campaign_id', campaign.id)
        .select('id');

      if (pauseError) {
        console.error(`[check-expired-campaigns] Error pausing automations for campaign ${campaign.id}:`, pauseError);
        results.push({
          campaign_id: campaign.id,
          campaign_title: campaign.title,
          success: false,
          error: pauseError.message
        });
        continue;
      }

      const pausedCount = pausedPosts?.length || 0;
      console.log(`[check-expired-campaigns] Successfully ended campaign ${campaign.title} and paused ${pausedCount} automations`);
      
      results.push({
        campaign_id: campaign.id,
        campaign_title: campaign.title,
        success: true,
        automations_paused: pausedCount
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed_campaigns: results.length,
        results,
        checked_at: now
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[check-expired-campaigns] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
