import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Clock, CheckCircle, XCircle } from "lucide-react";

interface PeriodicPost {
  id: string;
  interval_minutes: number;
  use_random_phrase: boolean;
  use_intelligent_delay: boolean;
  is_active: boolean;
  last_posted_at: string | null;
  threads_accounts: {
    username: string | null;
    account_id: string;
  };
  phrases: {
    content: string;
  } | null;
}

interface ThreadsAccount {
  id: string;
  username: string | null;
  account_id: string;
}

interface Phrase {
  id: string;
  content: string;
}

const PeriodicPosts = () => {
  const [posts, setPosts] = useState<PeriodicPost[]>([]);
  const [accounts, setAccounts] = useState<ThreadsAccount[]>([]);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  
  const [selectedAccount, setSelectedAccount] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState("10");
  const [useRandomPhrase, setUseRandomPhrase] = useState(true);
  const [selectedPhrase, setSelectedPhrase] = useState("");
  const [useIntelligentDelay, setUseIntelligentDelay] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await Promise.all([loadPosts(), loadAccounts(), loadPhrases()]);
    };

    checkAuth();
  }, [navigate]);

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("periodic_posts")
        .select(`
          *,
          threads_accounts (username, account_id),
          phrases (content)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error loading posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("threads_accounts")
        .select("id, username, account_id")
        .eq("is_active", true);

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Error loading accounts:", error);
    }
  };

  const loadPhrases = async () => {
    try {
      const { data, error } = await supabase
        .from("phrases")
        .select("id, content");

      if (error) throw error;
      setPhrases(data || []);
    } catch (error) {
      console.error("Error loading phrases:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("periodic_posts").insert({
        user_id: user.id,
        account_id: selectedAccount,
        interval_minutes: parseInt(intervalMinutes),
        use_random_phrase: useRandomPhrase,
        specific_phrase_id: useRandomPhrase ? null : selectedPhrase || null,
        use_intelligent_delay: useIntelligentDelay,
      });

      if (error) throw error;

      toast({
        title: "Post periódico configurado!",
        description: "A automação foi criada com sucesso.",
      });

      setOpen(false);
      resetForm();
      loadPosts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao configurar post",
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("periodic_posts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Post periódico removido",
        description: "A automação foi excluída com sucesso.",
      });

      loadPosts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover post",
        description: error.message,
      });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("periodic_posts")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: currentStatus ? "Post desativado" : "Post ativado",
        description: `A automação foi ${currentStatus ? "pausada" : "ativada"}.`,
      });

      loadPosts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setSelectedAccount("");
    setIntervalMinutes("10");
    setUseRandomPhrase(true);
    setSelectedPhrase("");
    setUseIntelligentDelay(false);
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Posts Periódicos</h1>
            <p className="text-muted-foreground">
              Configure automações de postagens
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={accounts.length === 0 || phrases.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Automação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Configurar Post Periódico</DialogTitle>
                <DialogDescription>
                  Configure uma nova automação de postagens
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="account">Conta</Label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.username || account.account_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interval">Intervalo (minutos)</Label>
                  <Input
                    id="interval"
                    type="number"
                    min="1"
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(e.target.value)}
                    required
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="random">Frase Aleatória</Label>
                  <Switch
                    id="random"
                    checked={useRandomPhrase}
                    onCheckedChange={setUseRandomPhrase}
                  />
                </div>

                {!useRandomPhrase && (
                  <div className="space-y-2">
                    <Label htmlFor="phrase">Frase Específica</Label>
                    <Select value={selectedPhrase} onValueChange={setSelectedPhrase} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma frase" />
                      </SelectTrigger>
                      <SelectContent>
                        {phrases.map((phrase) => (
                          <SelectItem key={phrase.id} value={phrase.id}>
                            {phrase.content.substring(0, 50)}...
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="delay">Delay Inteligente</Label>
                    <p className="text-xs text-muted-foreground">
                      Adiciona 30s a 2min de delay aleatório
                    </p>
                  </div>
                  <Switch
                    id="delay"
                    checked={useIntelligentDelay}
                    onCheckedChange={setUseIntelligentDelay}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Criar Automação
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {post.threads_accounts.username || post.threads_accounts.account_id}
                      {post.is_active ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      A cada {post.interval_minutes} minutos
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(post.id, post.is_active)}
                    >
                      {post.is_active ? "Pausar" : "Ativar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(post.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Modo:</span>
                    <span>
                      {post.use_random_phrase ? "Frase aleatória" : "Frase específica"}
                    </span>
                  </div>
                  {!post.use_random_phrase && post.phrases && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Frase:</span>
                      <span className="max-w-xs truncate">
                        {post.phrases.content}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Delay Inteligente:</span>
                    <span>{post.use_intelligent_delay ? "Sim" : "Não"}</span>
                  </div>
                  {post.last_posted_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Último post:</span>
                      <span>
                        {new Date(post.last_posted_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {posts.length === 0 && !loading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                Nenhuma automação configurada ainda
              </p>
              {accounts.length === 0 || phrases.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Você precisa ter pelo menos uma conta conectada e uma frase cadastrada
                  para criar automações.
                </p>
              ) : (
                <Button onClick={() => setOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeira Automação
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default PeriodicPosts;
