import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Flame, Users } from "lucide-react";
import { toast } from "sonner";
import { WarmingStatusBadge } from "@/components/WarmingStatusBadge";
import { useAccountWarmingStatus } from "@/hooks/useAccountWarmingStatus";

const WarmingPipelineAccounts = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [linkedAccounts, setLinkedAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const accountIds = accounts.map(a => a.id);
  const { statuses } = useAccountWarmingStatus(accountIds);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
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

      // Carregar todas as contas do usuário
      const { data: accountsData, error: accountsError } = await supabase
        .from("threads_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (accountsError) throw accountsError;
      setAccounts(accountsData || []);

      // Carregar contas já vinculadas
      const { data: linkedData, error: linkedError } = await supabase
        .from("warming_pipeline_accounts")
        .select("account_id")
        .eq("pipeline_id", id);

      if (linkedError) throw linkedError;
      const linked = linkedData?.map(l => l.account_id) || [];
      setLinkedAccounts(linked);
      setSelectedAccounts(linked);

    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
      navigate("/warming-pipeline");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAccount = (accountId: string) => {
    const status = statuses[accountId];
    
    // Se a conta está aquecendo em outra esteira, não permite seleção
    if (status?.status === "warming" && !linkedAccounts.includes(accountId)) {
      toast.error("Esta conta está em aquecimento em outra esteira");
      return;
    }

    setSelectedAccounts(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Remover contas desmarcadas
      const toRemove = linkedAccounts.filter(id => !selectedAccounts.includes(id));
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("warming_pipeline_accounts")
          .delete()
          .eq("pipeline_id", id)
          .in("account_id", toRemove);

        if (deleteError) throw deleteError;

        // Reativar automações pausadas
        for (const accountId of toRemove) {
          const { data: pipelineAccount } = await supabase
            .from("warming_pipeline_accounts")
            .select("paused_automations")
            .eq("account_id", accountId)
            .eq("pipeline_id", id)
            .single();

          if (pipelineAccount?.paused_automations) {
            const pausedIds = pipelineAccount.paused_automations as string[];
            if (pausedIds.length > 0) {
              await supabase
                .from("periodic_posts")
                .update({ is_active: true })
                .in("id", pausedIds);
            }
          }
        }
      }

      // Adicionar novas contas
      const toAdd = selectedAccounts.filter(id => !linkedAccounts.includes(id));
      if (toAdd.length > 0) {
        // Para cada conta, pausar automações ativas
        for (const accountId of toAdd) {
          const { data: activePosts } = await supabase
            .from("periodic_posts")
            .select("id")
            .eq("account_id", accountId)
            .eq("is_active", true);

          const pausedIds = activePosts?.map(p => p.id) || [];

          if (pausedIds.length > 0) {
            await supabase
              .from("periodic_posts")
              .update({ is_active: false })
              .in("id", pausedIds);
          }

          // Inserir conta na esteira
          const { error: insertError } = await supabase
            .from("warming_pipeline_accounts")
            .insert({
              pipeline_id: id,
              account_id: accountId,
              status: "warming",
              current_day: 1,
              paused_automations: pausedIds,
            });

          if (insertError) throw insertError;
        }
      }

      toast.success("Contas atualizadas com sucesso!");
      navigate(`/warming-pipeline/${id}`);
    } catch (error: any) {
      console.error("Erro ao salvar contas:", error);
      toast.error("Erro ao salvar contas");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">Carregando...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/warming-pipeline/${id}`)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
                <Users className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Selecionar Contas</h1>
                <p className="text-sm text-muted-foreground">
                  {pipeline?.name}
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="gap-2"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>

        {accounts.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Nenhuma conta disponível</h3>
            <p className="text-muted-foreground">
              Conecte contas do Threads para usar a esteira
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {accounts.map((account) => {
              const status = statuses[account.id];
              const isLinked = linkedAccounts.includes(account.id);
              const isSelected = selectedAccounts.includes(account.id);
              const isWarmingElsewhere = status?.status === "warming" && !isLinked;

              return (
                <Card
                  key={account.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected ? "border-primary bg-primary/5" : ""
                  } ${isWarmingElsewhere ? "opacity-50" : ""}`}
                  onClick={() => handleToggleAccount(account.id)}
                >
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={isSelected}
                      disabled={isWarmingElsewhere}
                      onCheckedChange={() => handleToggleAccount(account.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {account.profile_picture_url && (
                      <img
                        src={account.profile_picture_url}
                        alt={account.username}
                        className="w-12 h-12 rounded-full"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">@{account.username}</p>
                      <p className="text-sm text-muted-foreground">
                        {account.account_id}
                      </p>
                    </div>
                    <WarmingStatusBadge
                      status={status?.status || "not_warmed"}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default WarmingPipelineAccounts;
