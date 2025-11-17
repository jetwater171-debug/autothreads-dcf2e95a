import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2 } from "lucide-react";

interface ThreadsAccount {
  id: string;
  account_id: string;
  username: string | null;
}

const ManualPost = () => {
  const [accounts, setAccounts] = useState<ThreadsAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
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
        .select("id, username, account_id")
        .eq("is_active", true);

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Error loading accounts:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar contas",
        description: "Não foi possível carregar as contas disponíveis.",
      });
    }
  };

  const handlePost = async () => {
    if (!selectedAccount || !text.trim()) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Selecione uma conta e digite o texto do post.",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("threads-create-post", {
        body: {
          accountId: selectedAccount,
          text: text.trim(),
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Erro ao criar post");
      }

      toast({
        title: "Post criado!",
        description: "Seu post foi publicado com sucesso no Threads.",
      });

      setText("");
      setSelectedAccount("");
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast({
        variant: "destructive",
        title: "Erro ao criar post",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Post Manual</h1>
          <p className="text-muted-foreground">
            Crie e publique um post imediatamente no Threads
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Criar Post</CardTitle>
            <CardDescription>
              Selecione a conta e digite o texto para publicar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account">Conta do Threads</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger id="account">
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
              <Label htmlFor="text">Texto do Post</Label>
              <Textarea
                id="text"
                placeholder="Digite o texto do seu post..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {text.length}/500 caracteres
              </p>
            </div>

            <Button 
              onClick={handlePost} 
              disabled={loading || !selectedAccount || !text.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Publicar Agora
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ManualPost;
