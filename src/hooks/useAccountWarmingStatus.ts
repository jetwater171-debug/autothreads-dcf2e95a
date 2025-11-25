import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WarmingStatus {
  status: "warmed" | "warming" | "not_warmed";
  daysRemaining?: number;
  pipelineId?: string;
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
        // Buscar status de warming para cada conta
        const { data: warmingData, error } = await supabase
          .from("warming_pipeline_accounts")
          .select(`
            account_id,
            status,
            current_day,
            pipeline_id,
            warming_pipelines!inner(total_days)
          `)
          .in("account_id", accountIds)
          .in("status", ["warming", "completed"]);

        if (error) throw error;

        const newStatuses: Record<string, WarmingStatus> = {};

        // Inicializar todos como "não aquecido"
        accountIds.forEach(id => {
          newStatuses[id] = { status: "not_warmed" };
        });

        // Atualizar com dados reais
        warmingData?.forEach((item: any) => {
          if (item.status === "warming") {
            const daysRemaining = item.warming_pipelines.total_days - item.current_day + 1;
            newStatuses[item.account_id] = {
              status: "warming",
              daysRemaining,
              pipelineId: item.pipeline_id,
            };
          } else if (item.status === "completed") {
            newStatuses[item.account_id] = {
              status: "warmed",
            };
          }
        });

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
