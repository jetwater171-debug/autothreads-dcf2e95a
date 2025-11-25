import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Calendar, Users, Settings, Trash2, Activity, TrendingUp } from "lucide-react";
import { WarmingPipelineManageDialog } from "./warming-pipeline/WarmingPipelineManageDialog";
import { WarmingPipelineAccountsDialog } from "./warming-pipeline/WarmingPipelineAccountsDialog";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

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
      active: { variant: "default", label: "Ativa", className: "bg-primary/10 text-primary border-primary/20 animate-pulse" },
      archived: { variant: "secondary", label: "Arquivada", className: "" },
    };

    const config = variants[status] || variants.active;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const calculateProgress = (pipeline: any) => {
    if (!pipeline.warmup_runs || pipeline.warmup_runs.length === 0) return 0;
    // Simplified progress calculation
    return 45; // Mock value, would need actual run data
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pipelines.map((pipeline) => {
          const accountsCount = Array.isArray(pipeline.warmup_runs) ? pipeline.warmup_runs.length : 0;
          const progress = calculateProgress(pipeline);
          const hasActiveRuns = pipeline.status === 'active' && accountsCount > 0;

          return (
            <Card 
              key={pipeline.id} 
              className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 backdrop-blur-sm bg-gradient-to-br from-card to-card/50"
            >
              {/* Gradient overlay for active pipelines */}
              {hasActiveRuns && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
              )}
              
              <CardHeader className="space-y-4 relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20">
                        <Flame className="h-5 w-5 text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl font-bold tracking-tight">
                          {pipeline.name}
                        </CardTitle>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(pipeline.status)}
                      {hasActiveRuns && (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          <Activity className="h-3 w-3 mr-1" />
                          Em execução
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(pipeline.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 relative">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium text-muted-foreground">Duração</span>
                    </div>
                    <p className="text-2xl font-bold tracking-tight">{pipeline.total_days}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">dias</p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium text-muted-foreground">Contas</span>
                    </div>
                    <p className="text-2xl font-bold tracking-tight">{accountsCount}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {accountsCount === 0 ? 'nenhuma' : accountsCount === 1 ? 'ativa' : 'ativas'}
                    </p>
                  </div>
                </div>

                {/* Progress Bar (if active and has accounts) */}
                {hasActiveRuns && (
                  <div className="space-y-2 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-primary" />
                        Progresso médio
                      </span>
                      <span className="text-muted-foreground font-semibold">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                {/* No accounts message */}
                {accountsCount === 0 && (
                  <div className="p-4 rounded-xl bg-muted/30 border border-dashed border-border text-center">
                    <Users className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Nenhuma conta atribuída ainda
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
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
                    className="flex-1 hover:bg-accent hover:text-accent-foreground transition-colors"
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
          );
        })}
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
