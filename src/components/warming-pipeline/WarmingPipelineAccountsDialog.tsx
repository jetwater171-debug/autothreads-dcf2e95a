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
}

export const WarmingPipelineAccountsDialog = ({ 
  open, 
  onOpenChange, 
  pipelineId,
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

      // Load accounts and linked runs in parallel
      const [accountsResult, linkedResult] = await Promise.all([
        (supabase as any)
          .from("threads_accounts")
          .select("id, username, profile_picture_url, account_id")
          .eq("user_id", user.id)
          .eq("is_active", true),
        (supabase as any)
          .from("warmup_runs")
          .select("account_id")
          .eq("sequence_id", pipelineId)
          .in("status", ["running", "scheduled"])
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
      toast.error("Esta conta já está em aquecimento");
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
      const toAdd = selectedAccounts.filter(id => !linkedAccounts.includes(id));

      // Remove accounts
      if (toRemove.length > 0) {
        for (const accountId of toRemove) {
          // Call warmup-stop-run for each run
          const { data: runs } = await (supabase as any)
            .from("warmup_runs")
            .select("id")
            .eq("sequence_id", pipelineId)
            .eq("account_id", accountId)
            .in("status", ["running", "scheduled"]);

          if (runs) {
            for (const run of runs) {
              await supabase.functions.invoke('warmup-stop-run', {
                body: { runId: run.id }
              });
            }
          }
        }
      }

      // Add accounts
      if (toAdd.length > 0) {
        const { error } = await supabase.functions.invoke('warmup-assign-accounts', {
          body: {
            sequenceId: pipelineId,
            accountIds: toAdd,
          }
        });

        if (error) throw error;
      }

      toast.success("Contas atualizadas com sucesso!");
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
