import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Sparkles, RefreshCw, Clock, Key } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WarmingStatusBadge } from "@/components/WarmingStatusBadge";
import { useAccountWarmingStatus } from "@/hooks/useAccountWarmingStatus";

interface ThreadsAccount {
  id: string;
  account_id: string;
  username: string | null;
  profile_picture_url: string | null;
  is_active: boolean;
  connected_at: string;
  token_expires_at: string | null;
  token_refreshed_at: string | null;
}

const AccountsOAuth = () => {
  const [accounts, setAccounts] = useState<ThreadsAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [username, setUsername] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { statuses: warmingStatuses } = useAccountWarmingStatus(accounts.map(a => a.id));

  const getTimeUntilExpiration = (expiresAt: string | null) => {
    if (!expiresAt) return { text: 'Desconhecido', color: 'text-muted-foreground', urgent: false };
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffMs < 0) {
      return { text: 'Expirado', color: 'text-destructive', urgent: true };
    }
    
    if (diffDays < 7) {
      return { 
        text: `${diffDays}d ${diffHours}h`, 
        color: 'text-destructive', 
        urgent: true 
      };
    }
    
    if (diffDays < 30) {
      return { 
        text: `${diffDays} dias`, 
        color: 'text-yellow-500', 
        urgent: false 
      };
    }
    
    return { 
      text: `${diffDays} dias`, 
      color: 'text-success', 
      urgent: false 
    };
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await loadAccounts();
    };

    checkAuth();
  }, [navigate]);

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("threads_accounts")
        .select("*")
        .order("connected_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Error loading accounts:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar contas",
        description: "Não foi possível carregar as contas conectadas.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthConnect = () => {
    const threadsAppId = import.meta.env.VITE_THREADS_APP_ID;
    const threadsRedirectUri = import.meta.env.VITE_THREADS_REDIRECT_URI || 
      `${window.location.origin}/auth/threads/callback`;
    const scope = "threads_basic,threads_content_publish,threads_manage_insights";

    if (!threadsAppId) {
      toast({
        variant: "destructive",
        title: "Erro de configuração",
        description: "ID do aplicativo Threads não configurado.",
      });
      return;
    }

    const authUrl = `https://threads.net/oauth/authorize?client_id=${threadsAppId}&redirect_uri=${encodeURIComponent(threadsRedirectUri)}&scope=${scope}&response_type=code`;
    window.location.href = authUrl;
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("threads_accounts").insert({
        user_id: user.id,
        account_id: accountId,
        access_token: accessToken,
        username: username || null,
      });

      if (error) throw error;

      toast({
        title: "Conta conectada!",
        description: "A conta foi adicionada com sucesso.",
      });

      setOpen(false);
      setAccountId("");
      setAccessToken("");
      setUsername("");
      loadAccounts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao conectar conta",
        description: error.message,
      });
    }
  };

  const handleRefreshToken = async (accountId: string) => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('threads-refresh-token', {
        body: { accountId },
      });
      
      if (error) throw error;
      
      toast({
        title: "Token renovado!",
        description: "Token válido por mais 60 dias.",
      });
      
      await loadAccounts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao renovar token",
        description: error.message,
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshAccountInfo = async (accountId: string) => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('threads-refresh-account-info', {
        body: { accountId },
      });
      
      if (error) throw error;
      
      toast({
        title: "Informações atualizadas!",
        description: "Foto de perfil e username atualizados.",
      });
      
      await loadAccounts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message,
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshAllAccounts = async () => {
    setRefreshing(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const account of accounts) {
        try {
          await supabase.functions.invoke('threads-refresh-account-info', {
            body: { accountId: account.id },
          });
          
          if (account.token_expires_at) {
            const daysUntilExpiry = Math.floor(
              (new Date(account.token_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            
            if (daysUntilExpiry < 30) {
              await supabase.functions.invoke('threads-refresh-token', {
                body: { accountId: account.id },
              });
            }
          }
          
          successCount++;
        } catch (error) {
          console.error(`Erro ao atualizar conta ${account.username}:`, error);
          errorCount++;
        }
      }
      
      toast({
        title: "Atualização concluída",
        description: `${successCount} contas atualizadas${errorCount > 0 ? `, ${errorCount} com erro` : ''}.`,
      });
      
      await loadAccounts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro na atualização",
        description: error.message,
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("threads_accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Conta removida",
        description: "A conta foi desconectada com sucesso.",
      });

      loadAccounts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover conta",
        description: error.message,
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contas do Threads</h1>
            <p className="text-muted-foreground">
              Gerencie suas contas conectadas
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefreshAllAccounts}
              disabled={refreshing}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
              Atualizar Todas
            </Button>
            
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Conta
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Conectar Conta do Threads</DialogTitle>
                  <DialogDescription>
                    Escolha como deseja conectar sua conta
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="oauth" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="oauth">OAuth (Recomendado)</TabsTrigger>
                    <TabsTrigger value="manual">Manual</TabsTrigger>
                  </TabsList>
                  <TabsContent value="oauth" className="space-y-4">
                    <div className="space-y-6 py-4">
                      <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
                        <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Conexão Segura</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Conecte sua conta de forma segura através do OAuth do Threads
                          </p>
                        </div>
                      </div>
                      <Button onClick={handleOAuthConnect} className="w-full" size="lg">
                        Conectar com Threads
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="manual">
                    <form onSubmit={handleAddManual} className="space-y-6 py-4">
                      <div className="space-y-3">
                        <Label htmlFor="account-id" className="text-base font-semibold">ID da Conta</Label>
                        <Input
                          id="account-id"
                          value={accountId}
                          onChange={(e) => setAccountId(e.target.value)}
                          required
                          placeholder="Ex: 123456789"
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="access-token" className="text-base font-semibold">Token de Acesso</Label>
                        <Input
                          id="access-token"
                          type="password"
                          value={accessToken}
                          onChange={(e) => setAccessToken(e.target.value)}
                          required
                          placeholder="Seu token de acesso"
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="username" className="text-base font-semibold">Username (opcional)</Label>
                        <Input
                          id="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="@seunome"
                          className="h-12"
                        />
                      </div>
                      <Button type="submit" className="w-full" size="lg">
                        Conectar Conta
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const timeInfo = getTimeUntilExpiration(account.token_expires_at);
            
            return (
              <Card key={account.id} className="border-2 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={account.profile_picture_url || undefined} alt={account.username || "Profile"} />
                        <AvatarFallback className="text-lg">{account.username?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {account.username || "Conta Threads"}
                        </CardTitle>
                        <CardDescription className="text-xs">ID: {account.account_id}</CardDescription>
                      </div>
                    </div>
                    <WarmingStatusBadge status={warmingStatuses[account.id]?.status || "not_warmed"} />
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Token expira em:</span>
                    </div>
                    <Badge variant={timeInfo.urgent ? "destructive" : "secondary"}>
                      <span className={timeInfo.color}>{timeInfo.text}</span>
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Conectado em</span>
                    <span>{new Date(account.connected_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  
                  {account.token_refreshed_at && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Última renovação</span>
                      <span>{new Date(account.token_refreshed_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleRefreshToken(account.id)}
                      disabled={refreshing}
                    >
                      <Key className="mr-2 h-4 w-4" />
                      Renovar Token
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleRefreshAccountInfo(account.id)}
                      disabled={refreshing}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Atualizar Info
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(account.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {accounts.length === 0 && !loading && (
          <Card className="border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-muted-foreground mb-4">
                Nenhuma conta conectada ainda
              </p>
              <Button onClick={() => setOpen(true)} size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeira Conta
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default AccountsOAuth;
