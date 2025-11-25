import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, ListChecks, Settings, Calendar, Image, Type, Activity, CheckCircle2, XCircle, Loader2, Edit2, Save } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WarmingScheduledPostsList } from "./WarmingScheduledPostsList";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [saving, setSaving] = useState(false);

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
            threads_accounts!warmup_runs_account_id_fkey(username, profile_picture_url)
          `)
          .eq("sequence_id", pipelineId)
      ]);

      if (pipelineResult.error) throw pipelineResult.error;
      if (daysResult.error) throw daysResult.error;
      if (runsResult.error) throw runsResult.error;

      setPipeline(pipelineResult.data);
      setDays(daysResult.data || []);
      setRuns(runsResult.data || []);
      setEditedName(pipelineResult.data?.name || "");

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
    const variants: Record<string, { variant: any; label: string; icon: any }> = {
      running: { variant: "default", label: "Em execução", icon: Activity },
      scheduled: { variant: "secondary", label: "Agendado", icon: Clock },
      completed: { variant: "outline", label: "Concluído", icon: CheckCircle2 },
      cancelled: { variant: "destructive", label: "Cancelado", icon: XCircle },
    };
    const config = variants[status] || variants.running;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      toast.error("Nome não pode estar vazio");
      return;
    }

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("warmup_sequences")
        .update({ name: editedName })
        .eq("id", pipelineId);

      if (error) throw error;

      setPipeline({ ...pipeline, name: editedName });
      setIsEditing(false);
      toast.success("Nome atualizado com sucesso!");
      onUpdate?.();
    } catch (error: any) {
      console.error("Erro ao salvar nome:", error);
      toast.error("Erro ao salvar nome");
    } finally {
      setSaving(false);
    }
  };

  const getPostTypeIcon = (contentType: string) => {
    if (contentType.includes("carousel")) return Image;
    if (contentType.includes("image")) return Image;
    return Type;
  };

  const getPostTypeLabel = (contentType: string) => {
    const labels: Record<string, string> = {
      text: "Texto",
      image: "Imagem",
      text_image: "Texto + Imagem",
      carousel: "Carrossel",
    };
    return labels[contentType] || contentType;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-4 pb-4 border-b border-border/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-2xl font-bold h-12"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    onClick={handleSaveName}
                    disabled={saving}
                    className="shrink-0"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedName(pipeline?.name || "");
                    }}
                    className="shrink-0"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <DialogTitle className="text-3xl font-bold tracking-tight">{pipeline?.name}</DialogTitle>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    className="h-8 w-8"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">{pipeline?.total_days} dias</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">{runs.length} conta(s)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity className="h-4 w-4" />
                  <span className="font-medium">
                    {days.reduce((acc, day) => acc + (day.warmup_day_posts?.length || 0), 0)} posts
                  </span>
                </div>
              </div>
            </div>
            {pipeline && getStatusBadge(pipeline.status)}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="schedule" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
              <TabsTrigger 
                value="schedule" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Cronograma
              </TabsTrigger>
              <TabsTrigger 
                value="runs" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Users className="h-4 w-4 mr-2" />
                Execuções
                <Badge variant="secondary" className="ml-2">{runs.length}</Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="scheduled"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <ListChecks className="h-4 w-4 mr-2" />
                Posts Agendados
              </TabsTrigger>
              <TabsTrigger 
                value="settings"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-6">
              <TabsContent value="schedule" className="space-y-3 mt-0">
                {/* Timeline Visual */}
                <div className="relative">
                  {days.map((day, index) => {
                    const isRestDay = day.is_rest;
                    const postsCount = day.warmup_day_posts?.length || 0;

                    return (
                      <div key={day.id} className="relative pl-12 pb-8 last:pb-0">
                        {/* Timeline line */}
                        {index < days.length - 1 && (
                          <div className="absolute left-5 top-12 w-0.5 h-full bg-gradient-to-b from-primary/50 to-primary/10" />
                        )}

                        {/* Timeline dot */}
                        <div className={`absolute left-2 top-2 w-6 h-6 rounded-full border-2 flex items-center justify-center font-bold text-xs ${
                          isRestDay 
                            ? 'bg-muted border-muted-foreground/30 text-muted-foreground' 
                            : 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20'
                        }`}>
                          {day.day_index}
                        </div>

                        {/* Day Card */}
                        <Card className={`hover:shadow-md transition-all duration-300 ${
                          isRestDay ? 'border-dashed bg-muted/20' : 'bg-card hover:border-primary/30'
                        }`}>
                          <div className="p-5">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h4 className="font-semibold text-base flex items-center gap-2">
                                  Dia {day.day_index}
                                  {isRestDay && (
                                    <Badge variant="outline" className="text-xs">
                                      Descanso
                                    </Badge>
                                  )}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {isRestDay ? "Sem posts agendados" : `${postsCount} post${postsCount !== 1 ? 's' : ''} configurado${postsCount !== 1 ? 's' : ''}`}
                                </p>
                              </div>
                            </div>

                            {!isRestDay && day.warmup_day_posts && day.warmup_day_posts.length > 0 && (
                              <div className="space-y-2">
                                {day.warmup_day_posts.map((post: any, postIndex: number) => {
                                  const PostIcon = getPostTypeIcon(post.content_type);
                                  return (
                                    <div 
                                      key={post.id} 
                                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors border border-transparent hover:border-primary/20"
                                    >
                                      <div className="p-2 rounded-lg bg-background border border-border/50">
                                        <PostIcon className="h-4 w-4 text-primary" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                          <span className="font-semibold text-sm">{post.time_of_day.substring(0, 5)}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {getPostTypeLabel(post.content_type)}
                                          </Badge>
                                          {post.intelligent_delay && (
                                            <Badge variant="secondary" className="text-xs">
                                              Delay inteligente
                                            </Badge>
                                          )}
                                        </div>
                                        {post.custom_text && (
                                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                            {post.custom_text}
                                          </p>
                                        )}
                                      </div>
                                      <div className="text-xs font-medium text-muted-foreground">
                                        #{postIndex + 1}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="runs" className="space-y-4 mt-0">
                {runs.length === 0 ? (
                  <Card className="p-12 text-center border-dashed">
                    <div className="rounded-full bg-muted p-4 w-fit mx-auto mb-4">
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Nenhuma execução</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Adicione contas para iniciar o aquecimento e acompanhar o progresso
                    </p>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {runs.map((run: any) => {
                      const progress = run.current_day_index ? (run.current_day_index / (pipeline?.total_days || 1)) * 100 : 0;
                      
                      return (
                        <Card key={run.id} className="p-5 hover:shadow-lg transition-all duration-300 border-border/50">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12 border-2 border-primary/20">
                                  <AvatarImage src={run.threads_accounts?.profile_picture_url} />
                                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                    {run.threads_accounts?.username?.[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold text-base">@{run.threads_accounts?.username}</p>
                                  <p className="text-sm text-muted-foreground mt-0.5">
                                    {run.current_day_index ? `Dia ${run.current_day_index} de ${pipeline?.total_days}` : 'Aguardando início'}
                                  </p>
                                </div>
                              </div>
                              {getRunStatusBadge(run.status)}
                            </div>

                            {run.status === 'running' && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Progresso</span>
                                  <span className="font-semibold">{Math.round(progress)}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                              </div>
                            )}

                            {run.started_at && (
                              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/50">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>Início: {new Date(run.started_at).toLocaleDateString('pt-BR')}</span>
                                </div>
                                {run.completed_at && (
                                  <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Concluído: {new Date(run.completed_at).toLocaleDateString('pt-BR')}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="scheduled" className="space-y-6 mt-0">
                {runs.length === 0 ? (
                  <Card className="p-12 text-center border-dashed">
                    <div className="rounded-full bg-muted p-4 w-fit mx-auto mb-4">
                      <ListChecks className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Nenhuma execução ativa</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Adicione contas para visualizar os posts agendados
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {runs.filter(run => run.status === 'running').map((run: any) => (
                      <div key={run.id}>
                        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={run.threads_accounts?.profile_picture_url} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {run.threads_accounts?.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <h3 className="font-semibold text-sm">@{run.threads_accounts?.username}</h3>
                          {getRunStatusBadge(run.status)}
                        </div>
                        <WarmingScheduledPostsList runId={run.id} />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="settings" className="space-y-6 mt-0">
                <Card className="p-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Configurações da Esteira
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Gerencie as configurações e informações desta esteira de aquecimento
                      </p>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/50">
                      <div className="space-y-2">
                        <Label>Nome da Esteira</Label>
                        <div className="flex gap-2">
                          <Input
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            placeholder="Nome da esteira"
                          />
                          <Button onClick={handleSaveName} disabled={saving || editedName === pipeline?.name}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30">
                        <div>
                          <Label className="text-xs text-muted-foreground">Status</Label>
                          <p className="font-semibold mt-1">{pipeline?.status === 'active' ? 'Ativa' : 'Arquivada'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Total de Dias</Label>
                          <p className="font-semibold mt-1">{pipeline?.total_days} dias</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Contas Atribuídas</Label>
                          <p className="font-semibold mt-1">{runs.length} conta(s)</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Posts Totais</Label>
                          <p className="font-semibold mt-1">
                            {days.reduce((acc, day) => acc + (day.warmup_day_posts?.length || 0), 0)} posts
                          </p>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg bg-muted/30 border-l-4 border-primary">
                        <p className="text-sm text-muted-foreground">
                          <strong className="text-foreground">Nota:</strong> Para editar o cronograma completo (dias e posts), 
                          você precisará criar uma nova esteira. A edição avançada estará disponível em breve.
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
