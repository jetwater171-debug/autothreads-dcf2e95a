import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Repeat2, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { WarmingStatusBadge } from "@/components/WarmingStatusBadge";
import { useAccountWarmingStatus } from "@/hooks/useAccountWarmingStatus";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ThreadsAccount {
  id: string;
  username: string;
  profile_picture_url: string | null;
}

interface RepostResult {
  accountId: string;
  username: string;
  success: boolean;
  repostId?: string;
  error?: string;
}

const Repost = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [postLink, setPostLink] = useState("");
  const [accounts, setAccounts] = useState<ThreadsAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RepostResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [warmingAccountsToStop, setWarmingAccountsToStop] = useState<string[]>([]);

  const { statuses: warmingStatuses } = useAccountWarmingStatus(
    accounts.map((acc) => acc.id)
  );

  useEffect(() => {
    checkAuth();
    fetchAccounts();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchAccounts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("threads_accounts")
      .select("id, username, profile_picture_url")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("username");

    if (error) {
      console.error("Erro ao buscar contas:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as contas",
        variant: "destructive",
      });
      return;
    }

    setAccounts(data || []);
  };

  const extractPostId = (link: string): string | null => {
    // Remove espaços em branco
    link = link.trim();

    // Se for apenas um ID numérico
    if (/^\d+$/.test(link)) {
      return link;
    }

    // Extrair ID de URLs do Threads
    // Exemplos: https://threads.net/t/ABC123, https://www.threads.net/@user/post/ABC123
    const patterns = [
      /threads\.net\/t\/([^/?]+)/,
      /threads\.net\/@[^/]+\/post\/([^/?]+)/,
    ];

    for (const pattern of patterns) {
      const match = link.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };

  const handleSelectAll = () => {
    if (selectedAccounts.length === accounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(accounts.map((acc) => acc.id));
    }
  };

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleRepost = async () => {
    const postId = extractPostId(postLink);
    if (!postId) {
      toast({
        title: "Link inválido",
        description: "Por favor, insira um link válido do Threads ou um ID de post",
        variant: "destructive",
      });
      return;
    }

    if (selectedAccounts.length === 0) {
      toast({
        title: "Nenhuma conta selecionada",
        description: "Selecione pelo menos uma conta para repostar",
        variant: "destructive",
      });
      return;
    }

    // Verificar se há contas em aquecimento
    const warmingAccounts = selectedAccounts.filter(
      (id) => warmingStatuses[id]?.status === "warming"
    );

    if (warmingAccounts.length > 0) {
      setWarmingAccountsToStop(warmingAccounts);
      setShowWarningDialog(true);
      return;
    }

    await executeRepost(postId);
  };

  const executeRepost = async (postId: string) => {
    setLoading(true);
    setResults([]);
    setShowResults(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.functions.invoke("threads-repost", {
        body: {
          threadPostId: postId,
          accountIds: selectedAccounts,
          userId: user.id,
        },
      });

      if (error) throw error;

      setResults(data.results || []);
      setShowResults(true);

      const successCount = data.summary.success;
      const failureCount = data.summary.failure;

      if (successCount > 0 && failureCount === 0) {
        toast({
          title: "Reposts realizados com sucesso!",
          description: `${successCount} repost(s) publicado(s)`,
        });
      } else if (successCount > 0 && failureCount > 0) {
        toast({
          title: "Reposts parcialmente realizados",
          description: `${successCount} sucesso(s), ${failureCount} falha(s)`,
          variant: "default",
        });
      } else {
        toast({
          title: "Falha nos reposts",
          description: "Todos os reposts falharam. Verifique os detalhes abaixo.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Erro ao repostar:", error);
      toast({
        title: "Erro ao repostar",
        description: error.message || "Ocorreu um erro ao processar os reposts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWarningConfirm = async () => {
    setShowWarningDialog(false);
    const postId = extractPostId(postLink);
    if (postId) {
      await executeRepost(postId);
    }
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Repost
          </h1>
          <p className="text-muted-foreground text-lg">
            Reposte um post do Threads em várias contas simultaneamente
          </p>
        </div>

        <Card className="border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Repeat2 className="h-5 w-5 text-primary" />
              Link do Post
            </CardTitle>
            <CardDescription>
              Cole o link completo do post do Threads ou apenas o ID do post
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="https://threads.net/t/ABC123 ou apenas ABC123"
              value={postLink}
              onChange={(e) => setPostLink(e.target.value)}
              className="text-base"
            />
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Selecionar Contas</CardTitle>
                <CardDescription>
                  Escolha as contas onde o post será repostado
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={accounts.length === 0}
              >
                {selectedAccounts.length === accounts.length ? "Limpar" : "Todas"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhuma conta conectada</p>
                <Button
                  variant="link"
                  onClick={() => navigate("/accounts")}
                  className="mt-2"
                >
                  Conectar conta
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => {
                  const warmingStatus = warmingStatuses[account.id];
                  return (
                    <motion.div
                      key={account.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-accent/5 transition-all duration-200"
                    >
                      <Checkbox
                        id={account.id}
                        checked={selectedAccounts.includes(account.id)}
                        onCheckedChange={() => handleAccountToggle(account.id)}
                      />
                      <label
                        htmlFor={account.id}
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                      >
                        <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                          <AvatarImage src={account.profile_picture_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {account.username?.charAt(0).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">@{account.username}</p>
                        </div>
                        {warmingStatus && (
                          <WarmingStatusBadge status={warmingStatus.status} />
                        )}
                      </label>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            size="lg"
            onClick={handleRepost}
            disabled={loading || selectedAccounts.length === 0 || !postLink.trim()}
            className="flex-1 h-14 text-base shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Repostando...
              </>
            ) : (
              <>
                <Repeat2 className="mr-2 h-5 w-5" />
                Repostar em {selectedAccounts.length} conta(s)
              </>
            )}
          </Button>
        </div>

        <AnimatePresence>
          {showResults && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="border-border/50 shadow-lg bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Resultados</CardTitle>
                  <CardDescription>Status dos reposts por conta</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {results.map((result) => (
                      <div
                        key={result.accountId}
                        className="flex items-center gap-3 p-4 rounded-lg border border-border/50"
                      >
                        {result.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">@{result.username}</p>
                          {result.error && (
                            <p className="text-sm text-muted-foreground">{result.error}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Contas em Aquecimento
              </AlertDialogTitle>
              <AlertDialogDescription>
                {warmingAccountsToStop.length} conta(s) selecionada(s) está(ão) em processo de
                aquecimento. Repostar agora irá interromper o aquecimento dessas contas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleWarningConfirm}>
                Parar aquecimento e repostar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default Repost;
