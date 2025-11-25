import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { WarmingStatusBadge } from "@/components/WarmingStatusBadge";
import { useAccountWarmingStatus } from "@/hooks/useAccountWarmingStatus";

interface WarmingPipelineAccountsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  pipelineName: string;
  onSuccess?: () => void;
}

export const WarmingPipelineAccountsDialog = ({ 
  open, 
  onOpenChange, 
  pipelineId,
  pipelineName,
  onSuccess 
}: WarmingPipelineAccountsDialogProps) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [linkedAccounts, setLinkedAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const accountIds = accounts.map(a => a.id);
  const { statuses } = useAccountWarmingStatus(accountIds);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, pipelineId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Carregar contas e dados linkados em paralelo para melhor performance
      const [accountsResult, linkedResult] = await Promise.all([
        supabase
          .from("threads_accounts")
          .select("id, username, profile_picture_url, account_id")
          .eq("user_id", user.id)
          .eq("is_active", true),
        supabase
          .from("warming_pipeline_accounts")
          .select("account_id")
          .eq("pipeline_id", pipelineId)
      ]);

      if (accountsResult.error) throw accountsResult.error;
      if (linkedResult.error) throw linkedResult.error;
      
      setAccounts(accountsResult.data || []);
      const linked = linkedResult.data?.map(l => l.account_id) || [];
      setLinkedAccounts(linked);
      setSelectedAccounts(linked);

    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAccount = (accountId: string) => {
    const status = statuses[accountId];
    
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
      const toRemove = linkedAccounts.filter(id => !selectedAccounts.includes(id));
      if (toRemove.length > 0) {
        for (const accountId of toRemove) {
          const { data: pipelineAccount } = await supabase
            .from("warming_pipeline_accounts")
            .select("paused_automations")
            .eq("account_id", accountId)
            .eq("pipeline_id", pipelineId)
            .maybeSingle();

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

        const { error: deleteError } = await supabase
          .from("warming_pipeline_accounts")
          .delete()
          .eq("pipeline_id", pipelineId)
          .in("account_id", toRemove);

        if (deleteError) throw deleteError;
      }

      const toAdd = selectedAccounts.filter(id => !linkedAccounts.includes(id));
      if (toAdd.length > 0) {
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

          const { error: insertError } = await supabase
            .from("warming_pipeline_accounts")
            .insert({
              pipeline_id: pipelineId,
              account_id: accountId,
              status: "warming",
              current_day: 1,
              paused_automations: pausedIds,
            });

          if (insertError) throw insertError;
        }
      }

      toast.success("Contas atualizadas com sucesso!");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao salvar contas:", error);
      toast.error("Erro ao salvar contas");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Selecionar Contas</DialogTitle>
          <p className="text-sm text-muted-foreground">{pipelineName}</p>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : accounts.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Nenhuma conta disponível</h3>
            <p className="text-muted-foreground">
              Conecte contas do Threads para usar a esteira
            </p>
          </Card>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {accounts.map((account) => {
              const status = statuses[account.id];
              const isLinked = linkedAccounts.includes(account.id);
              const isSelected = selectedAccounts.includes(account.id);
              const isWarmingElsewhere = status?.status === "warming" && !isLinked;

              return (
                <Card
                  key={account.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    isSelected ? "border-primary bg-primary/5" : ""
                  } ${isWarmingElsewhere ? "opacity-50" : ""}`}
                  onClick={() => handleToggleAccount(account.id)}
                >
                  <div className="flex items-center gap-3">
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
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-sm">@{account.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {account.account_id.substring(0, 16)}...
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
