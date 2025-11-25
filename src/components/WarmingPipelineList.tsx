import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Calendar, Users, Settings, Trash2 } from "lucide-react";
import { WarmingPipelineManageDialog } from "./warming-pipeline/WarmingPipelineManageDialog";
import { WarmingPipelineAccountsDialog } from "./warming-pipeline/WarmingPipelineAccountsDialog";
import { toast } from "sonner";

interface WarmingPipelineListProps {
  onRefresh?: () => void;
}

export const WarmingPipelineList = ({ onRefresh }: WarmingPipelineListProps = {}) => {
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [isAccountsDialogOpen, setIsAccountsDialogOpen] = useState(false);

  useEffect(() => {
    loadPipelines();

    // Expose function globally
    (window as any).refreshWarmingPipelines = loadPipelines;
  }, []);

  const loadPipelines = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load sequences
      const { data: sequences, error: sequencesError } = await (supabase as any)
        .from('warmup_sequences')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (sequencesError) throw sequencesError;

      // Load runs count for each sequence
      const pipelinesWithCounts = await Promise.all(
        (sequences || []).map(async (seq: any) => {
          const { count } = await (supabase as any)
            .from('warmup_runs')
            .select('*', { count: 'exact', head: true })
            .eq('sequence_id', seq.id);

          return {
            ...seq,
            warmup_runs: Array(count || 0).fill(null), // Mock array for length
          };
        })
      );

      setPipelines(pipelinesWithCounts);
    } catch (error) {
      console.error('Error loading pipelines:', error);
      toast.error("Erro ao carregar esteiras de aquecimento");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pipelineId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta esteira?")) return;

    try {
      // 1. Get all runs for this sequence
      const { data: runs } = await (supabase as any)
        .from('warmup_runs')
        .select('id')
        .eq('sequence_id', pipelineId);

      if (runs && runs.length > 0) {
        const runIds = runs.map((r: any) => r.id);

        // 2. Clear active_warmup_run_id from threads_accounts
        await (supabase as any)
          .from('threads_accounts')
          .update({ active_warmup_run_id: null, warmup_status: 'not_warmed' })
          .in('active_warmup_run_id', runIds);

        // 3. Delete paused automations
        await (supabase as any)
          .from('warmup_paused_automations')
          .delete()
          .in('run_id', runIds);

        // 4. Delete scheduled posts
        await (supabase as any)
          .from('warmup_scheduled_posts')
          .delete()
          .in('run_id', runIds);

        // 5. Delete runs
        await (supabase as any)
          .from('warmup_runs')
          .delete()
          .in('id', runIds);
      }

      // 6. Get all days for this sequence
      const { data: days } = await (supabase as any)
        .from('warmup_days')
        .select('id')
        .eq('sequence_id', pipelineId);

      if (days && days.length > 0) {
        const dayIds = days.map((d: any) => d.id);

        // 7. Get all day posts
        const { data: dayPosts } = await (supabase as any)
          .from('warmup_day_posts')
          .select('id')
          .in('day_id', dayIds);

        if (dayPosts && dayPosts.length > 0) {
          const dayPostIds = dayPosts.map((p: any) => p.id);

          // 8. Delete carousel images
          await (supabase as any)
            .from('warmup_day_post_carousel_images')
            .delete()
            .in('day_post_id', dayPostIds);

          // 9. Delete day posts
          await (supabase as any)
            .from('warmup_day_posts')
            .delete()
            .in('id', dayPostIds);
        }

        // 10. Delete days
        await (supabase as any)
          .from('warmup_days')
          .delete()
          .in('id', dayIds);
      }

      // 11. Finally delete the sequence
      const { error } = await (supabase as any)
        .from('warmup_sequences')
        .delete()
        .eq('id', pipelineId);

      if (error) throw error;

      toast.success("Esteira excluída com sucesso!");
      loadPipelines();
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting pipeline:', error);
      toast.error("Erro ao excluir esteira");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      active: { variant: "default", label: "Ativa" },
      archived: { variant: "secondary", label: "Arquivada" },
    };

    const config = variants[status] || variants.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  if (!pipelines || pipelines.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Flame className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Nenhuma esteira criada</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            Crie sua primeira esteira de aquecimento para começar a preparar suas contas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pipelines.map((pipeline) => (
          <Card key={pipeline.id} className="group hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    {pipeline.name}
                  </CardTitle>
                  <CardDescription>{getStatusBadge(pipeline.status)}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(pipeline.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{pipeline.total_days} dias</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {Array.isArray(pipeline.warmup_runs) ? pipeline.warmup_runs.length : 0} contas
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedPipeline(pipeline.id);
                    setIsManageDialogOpen(true);
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Gerenciar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedPipeline(pipeline.id);
                    setIsAccountsDialogOpen(true);
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Contas
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedPipeline && (
        <>
          <WarmingPipelineManageDialog
            open={isManageDialogOpen}
            onOpenChange={setIsManageDialogOpen}
            pipelineId={selectedPipeline}
            onUpdate={loadPipelines}
          />
          <WarmingPipelineAccountsDialog
            open={isAccountsDialogOpen}
            onOpenChange={setIsAccountsDialogOpen}
            pipelineId={selectedPipeline}
          />
        </>
      )}
    </>
  );
};
