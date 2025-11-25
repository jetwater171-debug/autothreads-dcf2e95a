import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WarmingPipelineManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  onManageAccounts: () => void;
}

export const WarmingPipelineManageDialog = ({ 
  open, 
  onOpenChange, 
  pipelineId,
  onManageAccounts 
}: WarmingPipelineManageDialogProps) => {
  const [pipeline, setPipeline] = useState<any>(null);
  const [days, setDays] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
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

      const { data: pipelineData, error: pipelineError } = await supabase
        .from("warming_pipelines")
        .select("*")
        .eq("id", pipelineId)
        .eq("user_id", user.id)
        .single();

      if (pipelineError) throw pipelineError;
      setPipeline(pipelineData);

      const { data: daysData, error: daysError } = await supabase
        .from("warming_pipeline_days")
        .select(`
          *,
          warming_pipeline_posts(*)
        `)
        .eq("pipeline_id", pipelineId)
        .order("day_number");

      if (daysError) throw daysError;
      setDays(daysData || []);

      const { data: accountsData, error: accountsError } = await supabase
        .from("warming_pipeline_accounts")
        .select(`
          *,
          threads_accounts(username, profile_picture_url)
        `)
        .eq("pipeline_id", pipelineId);

      if (accountsError) throw accountsError;
      setAccounts(accountsData || []);

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
      paused: { variant: "secondary", label: "Pausada" },
      completed: { variant: "outline", label: "Finalizada" },
    };
    const config = variants[status] || variants.active;
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
                {pipeline?.total_days} dias • {accounts.length} conta(s)
              </p>
            </div>
            <div className="flex items-center gap-3">
              {pipeline && getStatusBadge(pipeline.status)}
              <Button onClick={onManageAccounts} size="sm" className="gap-2">
                <Users className="h-4 w-4" />
                Gerenciar contas
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : (
          <Tabs defaultValue="schedule" className="w-full">
            <TabsList>
              <TabsTrigger value="schedule">Cronograma</TabsTrigger>
              <TabsTrigger value="accounts">Contas ({accounts.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="space-y-4 mt-6">
              {days.map((day) => (
                <Card key={day.id} className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                      {day.day_number}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Dia {day.day_number}</h4>
                      <p className="text-xs text-muted-foreground">
                        {day.posts_count === 0 ? "Descanso" : `${day.posts_count} post${day.posts_count > 1 ? "s" : ""}`}
                      </p>
                    </div>
                  </div>

                  {day.warming_pipeline_posts && day.warming_pipeline_posts.length > 0 && (
                    <div className="space-y-2">
                      {day.warming_pipeline_posts.map((post: any) => (
                        <div key={post.id} className="space-y-1">
                          <div className="flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/30">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{post.scheduled_time.substring(0, 5)}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="capitalize">{post.post_type.replace("_", " + ")}</span>
                            {post.use_intelligent_delay && (
                              <Badge variant="secondary" className="ml-auto text-xs">
                                Delay
                              </Badge>
                            )}
                          </div>
                          {post.custom_text && (
                            <div className="pl-5 text-xs text-muted-foreground italic">
                              "{post.custom_text.substring(0, 80)}{post.custom_text.length > 80 ? "..." : ""}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="accounts" className="space-y-3 mt-6">
              {accounts.length === 0 ? (
                <Card className="p-8 text-center">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold text-sm mb-2">Nenhuma conta vinculada</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Adicione contas para começar o aquecimento
                  </p>
                  <Button onClick={onManageAccounts} size="sm">
                    Adicionar contas
                  </Button>
                </Card>
              ) : (
                accounts.map((account: any) => (
                  <Card key={account.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {account.threads_accounts?.profile_picture_url && (
                          <img
                            src={account.threads_accounts.profile_picture_url}
                            alt={account.threads_accounts.username}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-sm">@{account.threads_accounts?.username}</p>
                          <p className="text-xs text-muted-foreground">
                            Dia {account.current_day} de {pipeline?.total_days}
                          </p>
                        </div>
                      </div>
                      <Badge variant={account.status === "warming" ? "default" : "secondary"} className="text-xs">
                        {account.status === "warming" ? "Aquecendo" : account.status === "completed" ? "Concluído" : "Parado"}
                      </Badge>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
