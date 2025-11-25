import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, Flame, Settings, Users } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const WarmingPipelineManage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState<any>(null);
  const [days, setDays] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPipeline();
  }, [id]);

  const loadPipeline = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Carregar esteira
      const { data: pipelineData, error: pipelineError } = await supabase
        .from("warming_pipelines")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (pipelineError) throw pipelineError;
      setPipeline(pipelineData);

      // Carregar dias e posts
      const { data: daysData, error: daysError } = await supabase
        .from("warming_pipeline_days")
        .select(`
          *,
          warming_pipeline_posts(*)
        `)
        .eq("pipeline_id", id)
        .order("day_number");

      if (daysError) throw daysError;
      setDays(daysData || []);

      // Carregar contas vinculadas
      const { data: accountsData, error: accountsError } = await supabase
        .from("warming_pipeline_accounts")
        .select(`
          *,
          threads_accounts(username, profile_picture_url)
        `)
        .eq("pipeline_id", id);

      if (accountsError) throw accountsError;
      setAccounts(accountsData || []);

    } catch (error: any) {
      console.error("Erro ao carregar esteira:", error);
      toast.error("Erro ao carregar esteira");
      navigate("/warming-pipeline");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">Carregando...</div>
      </Layout>
    );
  }

  if (!pipeline) {
    return (
      <Layout>
        <div className="text-center py-12">Esteira não encontrada</div>
      </Layout>
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
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/warming-pipeline")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{pipeline.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {pipeline.total_days} dias • {accounts.length} conta(s)
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(pipeline.status)}
            <Button
              onClick={() => navigate(`/warming-pipeline/${id}/accounts`)}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              Gerenciar contas
            </Button>
          </div>
        </div>

        <Tabs defaultValue="schedule" className="w-full">
          <TabsList>
            <TabsTrigger value="schedule">Cronograma</TabsTrigger>
            <TabsTrigger value="accounts">Contas ({accounts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-4 mt-6">
            {days.map((day) => (
              <Card key={day.id} className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {day.day_number}
                  </div>
                  <div>
                    <h3 className="font-semibold">Dia {day.day_number}</h3>
                    <p className="text-sm text-muted-foreground">
                      {day.posts_count === 0 ? "Dia de descanso" : `${day.posts_count} post${day.posts_count > 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>

                {day.warming_pipeline_posts && day.warming_pipeline_posts.length > 0 && (
                  <div className="space-y-2">
                    {day.warming_pipeline_posts.map((post: any, idx: number) => (
                      <div key={post.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{post.scheduled_time.substring(0, 5)}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="capitalize">{post.post_type.replace("_", " + ")}</span>
                        {post.use_intelligent_delay && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            Delay inteligente
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="accounts" className="space-y-4 mt-6">
            {accounts.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <Users className="h-12 w-12 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold mb-2">Nenhuma conta vinculada</h3>
                    <p className="text-muted-foreground mb-4">
                      Adicione contas para começar o aquecimento
                    </p>
                    <Button onClick={() => navigate(`/warming-pipeline/${id}/accounts`)}>
                      Adicionar contas
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4">
                {accounts.map((account: any) => (
                  <Card key={account.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {account.threads_accounts?.profile_picture_url && (
                          <img
                            src={account.threads_accounts.profile_picture_url}
                            alt={account.threads_accounts.username}
                            className="w-10 h-10 rounded-full"
                          />
                        )}
                        <div>
                          <p className="font-semibold">@{account.threads_accounts?.username}</p>
                          <p className="text-sm text-muted-foreground">
                            Dia atual: {account.current_day} de {pipeline.total_days}
                          </p>
                        </div>
                      </div>
                      <Badge variant={account.status === "warming" ? "default" : "secondary"}>
                        {account.status === "warming" ? "Aquecendo" : account.status === "completed" ? "Concluído" : "Parado"}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default WarmingPipelineManage;
