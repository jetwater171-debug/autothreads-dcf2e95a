import { useState } from "react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Trash2, Users, Flame } from "lucide-react";
import { toast } from "sonner";
import { WarmingPipelineManageDialog } from "./warming-pipeline/WarmingPipelineManageDialog";
import { WarmingPipelineAccountsDialog } from "./warming-pipeline/WarmingPipelineAccountsDialog";

interface WarmingPipelineListProps {
  onRefresh?: () => void;
}

export const WarmingPipelineList = ({ onRefresh }: WarmingPipelineListProps = {}) => {
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [accountsDialogOpen, setAccountsDialogOpen] = useState(false);

  useEffect(() => {
    loadPipelines();
  }, []);

  useEffect(() => {
    if (onRefresh) {
      // Expor função de reload para componente pai
      (window as any).__reloadWarmingPipelines = loadPipelines;
    }
  }, [onRefresh]);

  const loadPipelines = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("warming_pipelines")
        .select(`
          *,
          warming_pipeline_days(count),
          warming_pipeline_accounts(count)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPipelines(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar esteiras:", error);
      toast.error("Erro ao carregar esteiras");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar esta esteira?")) return;

    try {
      const { error } = await supabase
        .from("warming_pipelines")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Esteira deletada com sucesso");
      loadPipelines();
    } catch (error: any) {
      console.error("Erro ao deletar esteira:", error);
      toast.error("Erro ao deletar esteira");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  if (pipelines.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-muted">
            <Flame className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Nenhuma esteira criada ainda</h3>
            <p className="text-muted-foreground">
              Crie sua primeira esteira de aquecimento para começar
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      active: { variant: "default", label: "Ativa" },
      paused: { variant: "secondary", label: "Pausada" },
      completed: { variant: "outline", label: "Finalizada" },
    };
    const config = variants[status] || variants.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pipelines.map((pipeline) => {
          const totalDays = pipeline.warming_pipeline_days?.[0]?.count || 0;
          const accountsCount = pipeline.warming_pipeline_accounts?.[0]?.count || 0;

          return (
            <Card key={pipeline.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/10">
                    <Flame className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{pipeline.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {pipeline.total_days} dias • {accountsCount} conta(s)
                    </p>
                  </div>
                </div>
                {getStatusBadge(pipeline.status)}
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPipeline(pipeline.id);
                    setManageDialogOpen(true);
                  }}
                >
                  <Settings className="h-4 w-4" />
                  Gerenciar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPipeline(pipeline.id);
                    setAccountsDialogOpen(true);
                  }}
                >
                  <Users className="h-4 w-4" />
                  Contas
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(pipeline.id);
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {selectedPipeline && (
        <>
          <WarmingPipelineManageDialog
            open={manageDialogOpen}
            onOpenChange={setManageDialogOpen}
            pipelineId={selectedPipeline}
            onManageAccounts={() => {
              setManageDialogOpen(false);
              setAccountsDialogOpen(true);
            }}
          />
          <WarmingPipelineAccountsDialog
            open={accountsDialogOpen}
            onOpenChange={setAccountsDialogOpen}
            pipelineId={selectedPipeline}
            pipelineName={pipelines.find(p => p.id === selectedPipeline)?.name || ""}
            onSuccess={() => {
              loadPipelines();
            }}
          />
        </>
      )}
    </>
  );
};
