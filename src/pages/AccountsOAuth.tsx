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
import { Plus, Trash2, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ThreadsAccount {
  id: string;
  account_id: string;
  username: string | null;
  profile_picture_url: string | null;
  is_active: boolean;
  connected_at: string;
}

const AccountsOAuth = () => {
  const [accounts, setAccounts] = useState<ThreadsAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

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
    const scope = "threads_basic,threads_content_publish";

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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
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
                  <div className="space-y-4 py-4">
                    <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Conexão Segura</p>
                        <p className="text-xs text-muted-foreground">
                          Conecte sua conta de forma segura através do OAuth do Threads
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleOAuthConnect} className="w-full">
                      Conectar com Threads
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="manual">
                  <form onSubmit={handleAddManual} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="account-id">ID da Conta</Label>
                      <Input
                        id="account-id"
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        required
                        placeholder="Ex: 123456789"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="access-token">Token de Acesso</Label>
                      <Input
                        id="access-token"
                        type="password"
                        value={accessToken}
                        onChange={(e) => setAccessToken(e.target.value)}
                        required
                        placeholder="Seu token de acesso"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username (opcional)</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="@seunome"
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Conectar Conta
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={account.profile_picture_url || undefined} alt={account.username || "Profile"} />
                      <AvatarFallback>{account.username?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-lg">
                      {account.username || "Conta Threads"}
                    </CardTitle>
                  </div>
                  {account.is_active ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                </div>
                <CardDescription>ID: {account.account_id}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Conectado em{" "}
                    {new Date(account.connected_at).toLocaleDateString("pt-BR")}
                  </span>
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
          ))}
        </div>

        {accounts.length === 0 && !loading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                Nenhuma conta conectada ainda
              </p>
              <Button onClick={() => setOpen(true)}>
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
