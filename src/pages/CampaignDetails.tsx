import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Clock, CheckCircle, XCircle, Calendar, Save } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Campaign {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface PeriodicPost {
  id: string;
  title: string;
  interval_minutes: number;
  is_active: boolean;
  post_type: string;
  threads_accounts: {
    username: string | null;
    account_id: string;
  };
}

const CampaignDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [automations, setAutomations] = useState<PeriodicPost[]>([]);
  const [availableAutomations, setAvailableAutomations] = useState<PeriodicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState("");

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await loadData();
    };

    checkAuth();
  }, [id, navigate]);

  const loadData = async () => {
    try {
      // Load campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);
      setTitle(campaignData.title);
      setStartDate(campaignData.start_date.slice(0, 16)); // Format for datetime-local
      setEndDate(campaignData.end_date.slice(0, 16));

      // Load automations in this campaign
      const { data: automationsData, error: automationsError } = await supabase
        .from("periodic_posts")
        .select(`
          *,
          threads_accounts (username, account_id)
        `)
        .eq("campaign_id", id);

      if (automationsError) throw automationsError;
      setAutomations(automationsData || []);

      // Load available automations (without campaign)
      const { data: availableData, error: availableError } = await supabase
        .from("periodic_posts")
        .select(`
          *,
          threads_accounts (username, account_id)
        `)
        .is("campaign_id", null);

      if (availableError) throw availableError;
      setAvailableAutomations(availableData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar campanha",
      });
      navigate("/campaigns");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Digite um nome para a campanha",
      });
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      toast({
        variant: "destructive",
        title: "A data de término deve ser após a data de início",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("campaigns")
        .update({
          title: title.trim(),
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Campanha atualizada!",
      });

      setEditMode(false);
      loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar campanha",
        description: error.message,
      });
    }
  };

  const handleAddAutomation = async () => {
    if (!selectedAutomation) return;

    try {
      const { error } = await supabase
        .from("periodic_posts")
        .update({ campaign_id: id })
        .eq("id", selectedAutomation);

      if (error) throw error;

      toast({
        title: "Automação adicionada à campanha",
      });

      setAddDialogOpen(false);
      setSelectedAutomation("");
      loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar automação",
        description: error.message,
      });
    }
  };

  const handleRemoveAutomation = async (automationId: string) => {
    try {
      const { error } = await supabase
        .from("periodic_posts")
        .update({ campaign_id: null })
        .eq("id", automationId);

      if (error) throw error;

      toast({
        title: "Automação removida da campanha",
      });

      loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover automação",
        description: error.message,
      });
    }
  };

  if (loading || !campaign) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Detalhes da Campanha</h1>
            <p className="text-muted-foreground">
              Gerencie automações e configurações
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                {editMode ? (
                  <div className="space-y-4 max-w-2xl">
                    <div className="space-y-2">
                      <Label>Nome da Campanha</Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={100}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Data de Início</Label>
                        <Input
                          type="datetime-local"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Data de Término</Label>
                        <Input
                          type="datetime-local"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <CardTitle className="text-2xl">{campaign.title}</CardTitle>
                    <CardDescription className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(campaign.start_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          {" → "}
                          {format(new Date(campaign.end_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                        {campaign.status === 'active' ? 'Ativa' : 'Encerrada'}
                      </Badge>
                    </CardDescription>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <Button variant="outline" onClick={() => {
                      setEditMode(false);
                      setTitle(campaign.title);
                      setStartDate(campaign.start_date.slice(0, 16));
                      setEndDate(campaign.end_date.slice(0, 16));
                    }}>
                      Cancelar
                    </Button>
                    <Button onClick={handleUpdate}>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setEditMode(true)}>
                    Editar
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Automações ({automations.length})
            </h2>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={availableAutomations.length === 0}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Automação
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Automação</DialogTitle>
                  <DialogDescription>
                    Selecione uma automação para incluir nesta campanha
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={selectedAutomation} onValueChange={setSelectedAutomation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma automação" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAutomations.map((automation) => (
                        <SelectItem key={automation.id} value={automation.id}>
                          {automation.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddAutomation} disabled={!selectedAutomation}>
                      Adicionar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {automations.map((automation) => (
              <Card key={automation.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {automation.title}
                        {automation.is_active ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {automation.interval_minutes} min
                        </span>
                        <span>•</span>
                        <span>{automation.threads_accounts.username || automation.threads_accounts.account_id}</span>
                        <span>•</span>
                        <span className="capitalize">
                          {automation.post_type === 'text' ? '📝 Texto' : 
                           automation.post_type === 'image' ? '🖼️ Imagem' : 
                           '🎠 Carrossel'}
                        </span>
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAutomation(automation.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {automations.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">
                  Nenhuma automação adicionada ainda
                </p>
                {availableAutomations.length > 0 && (
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Primeira Automação
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CampaignDetails;
