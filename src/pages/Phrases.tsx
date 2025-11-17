import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit } from "lucide-react";

interface Phrase {
  id: string;
  content: string;
  created_at: string;
}

const Phrases = () => {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingPhrase, setEditingPhrase] = useState<Phrase | null>(null);
  const [content, setContent] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await loadPhrases();
    };

    checkAuth();
  }, [navigate]);

  const loadPhrases = async () => {
    try {
      const { data, error } = await supabase
        .from("phrases")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPhrases(data || []);
    } catch (error) {
      console.error("Error loading phrases:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar frases",
        description: "Não foi possível carregar as frases.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (editingPhrase) {
        const { error } = await supabase
          .from("phrases")
          .update({ content })
          .eq("id", editingPhrase.id);

        if (error) throw error;

        toast({
          title: "Frase atualizada!",
          description: "A frase foi atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase.from("phrases").insert({
          user_id: user.id,
          content,
        });

        if (error) throw error;

        toast({
          title: "Frase adicionada!",
          description: "A frase foi salva com sucesso.",
        });
      }

      setOpen(false);
      setContent("");
      setEditingPhrase(null);
      loadPhrases();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar frase",
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("phrases").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Frase removida",
        description: "A frase foi excluída com sucesso.",
      });

      loadPhrases();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover frase",
        description: error.message,
      });
    }
  };

  const handleEdit = (phrase: Phrase) => {
    setEditingPhrase(phrase);
    setContent(phrase.content);
    setOpen(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEditingPhrase(null);
      setContent("");
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Frases</h1>
            <p className="text-muted-foreground">
              Gerencie as frases para seus posts automáticos
            </p>
          </div>
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Frase
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPhrase ? "Editar Frase" : "Adicionar Nova Frase"}
                </DialogTitle>
                <DialogDescription>
                  {editingPhrase
                    ? "Edite o conteúdo da frase"
                    : "Digite o conteúdo que será postado"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content">Conteúdo</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    rows={4}
                    placeholder="Digite aqui o conteúdo do seu post..."
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingPhrase ? "Atualizar" : "Adicionar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {phrases.map((phrase) => (
            <Card key={phrase.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-normal flex-1">
                    {phrase.content}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(phrase)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(phrase.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {phrases.length === 0 && !loading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                Nenhuma frase cadastrada ainda
              </p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeira Frase
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Phrases;
