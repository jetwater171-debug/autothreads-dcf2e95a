import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WarmingScheduledPostsList } from "./WarmingScheduledPostsList";

interface WarmingPipelineManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  onUpdate?: () => void;
}

export const WarmingPipelineManageDialog = ({ 
  open, 
  onOpenChange, 
  pipelineId,
  onUpdate
}: WarmingPipelineManageDialogProps) => {
  const [pipeline, setPipeline] = useState<any>(null);
  const [days, setDays] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadPipeline();
    }
  }, [open, pipelineId]);

  const loadPipeline = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load all data in parallel
      const [pipelineResult, daysResult, runsResult] = await Promise.all([
        (supabase as any)
          .from("warmup_sequences")
          .select("*")
          .eq("id", pipelineId)
          .eq("user_id", user.id)
          .single(),
        (supabase as any)
          .from("warmup_days")
          .select(`
            *,
            warmup_day_posts(*)
          `)
          .eq("sequence_id", pipelineId)
          .order("day_index"),
        (supabase as any)
          .from("warmup_runs")
          .select(`
            *,
            threads_accounts(username, profile_picture_url)
          `)
          .eq("sequence_id", pipelineId)
      ]);

      if (pipelineResult.error) throw pipelineResult.error;
      if (daysResult.error) throw daysResult.error;
      if (runsResult.error) throw runsResult.error;

      setPipeline(pipelineResult.data);
      setDays(daysResult.data || []);
      setRuns(runsResult.data || []);

    } catch (error: any) {
      console.error("Erro ao carregar esteira:", error);
      toast.error("Erro ao carregar esteira");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      active: { variant: "default", label: "Ativa" },
      archived: { variant: "secondary", label: "Arquivada" },
    };
    const config = variants[status] || variants.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getRunStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      running: { variant: "default", label: "Em execução" },
      scheduled: { variant: "secondary", label: "Agendado" },
      completed: { variant: "outline", label: "Concluído" },
      cancelled: { variant: "destructive", label: "Cancelado" },
    };
    const config = variants[status] || variants.running;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{pipeline?.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {pipeline?.total_days} dias • {runs.length} execução(ões)
              </p>
            </div>
            {pipeline && getStatusBadge(pipeline.status)}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : (
          <Tabs defaultValue="schedule" className="w-full">
            <TabsList>
              <TabsTrigger value="schedule">Cronograma</TabsTrigger>
              <TabsTrigger value="runs">Execuções ({runs.length})</TabsTrigger>
              <TabsTrigger value="scheduled">
                <ListChecks className="h-3.5 w-3.5 mr-1.5" />
                Posts Agendados
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="space-y-4 mt-6">
              {days.map((day) => (
                <Card key={day.id} className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                      {day.day_index}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Dia {day.day_index}</h4>
                      <p className="text-xs text-muted-foreground">
                        {day.is_rest ? "Descanso" : `${day.warmup_day_posts?.length || 0} post(s)`}
                      </p>
                    </div>
                  </div>

                  {day.warmup_day_posts && day.warmup_day_posts.length > 0 && (
                    <div className="space-y-2">
                      {day.warmup_day_posts.map((post: any) => (
                        <div key={post.id} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/30">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{post.time_of_day.substring(0, 5)}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="capitalize">{post.content_type.replace("_", " + ")}</span>
                          {post.intelligent_delay && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              Delay
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="runs" className="space-y-3 mt-6">
              {runs.length === 0 ? (
                <Card className="p-8 text-center">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold text-sm mb-2">Nenhuma execução</h3>
                  <p className="text-xs text-muted-foreground">
                    Adicione contas para iniciar o aquecimento
                  </p>
                </Card>
              ) : (
                runs.map((run: any) => (
                  <Card key={run.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {run.threads_accounts?.profile_picture_url && (
                          <img
                            src={run.threads_accounts.profile_picture_url}
                            alt={run.threads_accounts.username}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-sm">@{run.threads_accounts?.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {run.current_day_index ? `Dia ${run.current_day_index} de ${pipeline?.total_days}` : 'Aguardando início'}
                          </p>
                        </div>
                      </div>
                      {getRunStatusBadge(run.status)}
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="scheduled" className="space-y-3 mt-6">
              {runs.length === 0 ? (
                <Card className="p-8 text-center">
                  <ListChecks className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold text-sm mb-2">Nenhuma execução ativa</h3>
                  <p className="text-xs text-muted-foreground">
                    Adicione contas para visualizar os posts agendados
                  </p>
                </Card>
              ) : (
                <div className="space-y-6">
                  {runs.filter(run => run.status === 'running').map((run: any) => (
                    <div key={run.id}>
                      <div className="flex items-center gap-3 mb-3">
                        {run.threads_accounts?.profile_picture_url && (
                          <img
                            src={run.threads_accounts.profile_picture_url}
                            alt={run.threads_accounts.username}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <h3 className="font-semibold text-sm">@{run.threads_accounts?.username}</h3>
                        {getRunStatusBadge(run.status)}
                      </div>
                      <WarmingScheduledPostsList runId={run.id} />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
