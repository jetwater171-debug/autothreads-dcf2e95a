import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WarmingStatus {
  status: "warmed" | "warming" | "not_warmed";
  daysRemaining?: number;
  runId?: string;
}

export function useAccountWarmingStatus(accountIds: string[]) {
  const [statuses, setStatuses] = useState<Record<string, WarmingStatus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accountIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchStatuses = async () => {
      try {
        // Check threads_accounts for warmup_status
        const { data: accounts, error } = await (supabase as any)
          .from('threads_accounts')
          .select('id, warmup_status, active_warmup_run_id')
          .in('id', accountIds);

        if (error) throw error;

        const newStatuses: Record<string, WarmingStatus> = {};

        // Initialize all as "not_warmed"
        accountIds.forEach(id => {
          newStatuses[id] = { status: "not_warmed" };
        });

        // Update with real data
        for (const account of accounts || []) {
          if (account.warmup_status === 'warming' && account.active_warmup_run_id) {
            // Get run details to calculate days remaining
            const { data: run } = await (supabase as any)
              .from('warmup_runs')
              .select(`
                *,
                warmup_sequences!inner(total_days)
              `)
              .eq('id', account.active_warmup_run_id)
              .single();

            if (run) {
              const daysRemaining = (run.warmup_sequences as any).total_days - (run.current_day_index || 1) + 1;
              newStatuses[account.id] = {
                status: "warming",
                daysRemaining,
                runId: account.active_warmup_run_id,
              };
            }
          } else if (account.warmup_status === 'warmed') {
            newStatuses[account.id] = {
              status: "warmed",
            };
          }
        }

        setStatuses(newStatuses);
      } catch (error) {
        console.error("Error fetching warming statuses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatuses();
  }, [accountIds.join(",")]);

  return { statuses, loading };
}
