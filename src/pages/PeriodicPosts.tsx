import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Clock, CheckCircle, XCircle, Send, Loader2, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PeriodicPostWizard, WizardData } from "@/components/PeriodicPostWizard";

interface PeriodicPost {
  id: string;
  title: string;
  interval_minutes: number;
  use_random_phrase: boolean;
  use_intelligent_delay: boolean;
  is_active: boolean;
  last_posted_at: string | null;
  post_type: string;
  use_random_image: boolean;
  specific_image_id: string | null;
  specific_phrase_id: string | null;
  random_phrase_folder_id: string | null;
  carousel_image_ids: string[] | null;
  account_id: string;
  campaign_id: string | null;
  threads_accounts: {
    username: string | null;
    account_id: string;
    profile_picture_url: string | null;
  };
  phrases: {
    content: string;
  } | null;
  images?: {
    public_url: string;
  } | null;
  campaigns?: {
    title: string;
  } | null;
  has_missing_phrase?: boolean;
  has_missing_images?: boolean;
  last_error?: string | null;
}

interface Image {
  id: string;
  file_name: string;
  public_url: string;
  alt_text: string | null;
  folder_id: string | null;
}

interface ThreadsAccount {
  id: string;
  username: string | null;
  account_id: string;
  profile_picture_url: string | null;
}

interface Phrase {
  id: string;
  content: string;
  folder_id: string | null;
}

interface Campaign {
  id: string;
  title: string;
  status: string;
}

interface Folder {
  id: string;
  name: string;
  type: string;
}

const PeriodicPosts = () => {
  const [posts, setPosts] = useState<PeriodicPost[]>([]);
  const [accounts, setAccounts] = useState<ThreadsAccount[]>([]);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [phraseFolders, setPhraseFolders] = useState<Folder[]>([]);
  const [imageFolders, setImageFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [postingNow, setPostingNow] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await Promise.all([loadPosts(), loadAccounts(), loadPhrases(), loadImages(), loadCampaigns(), loadPhraseFolders(), loadImageFolders()]);
    };

    checkAuth();
  }, [navigate]);

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("periodic_posts")
        .select(`
          *,
          threads_accounts (username, account_id, profile_picture_url),
          phrases (content),
          campaigns (title)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Buscar último erro e validar conteúdo de cada automação
      const postsWithErrors = await Promise.all((data || []).map(async (post) => {
        let has_missing_phrase = false;
        let has_missing_images = false;
        let last_error = null;

        // Buscar último post no histórico para esta automação/conta
        const { data: lastHistory } = await supabase
          .from("post_history")
          .select("error_message, attempts")
          .eq("account_id", post.account_id)
          .order("posted_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastHistory?.error_message) {
          last_error = lastHistory.error_message;
        }

        // Verificar frase específica
        if (post.specific_phrase_id && !post.use_random_phrase) {
          const { data: phrase } = await supabase
            .from("phrases")
            .select("id")
            .eq("id", post.specific_phrase_id)
            .maybeSingle();
          has_missing_phrase = !phrase;
        }

        // Verificar imagem específica
        if (post.post_type === 'image' && post.specific_image_id && !post.use_random_image) {
          const { data: image } = await supabase
            .from("images")
            .select("id")
            .eq("id", post.specific_image_id)
            .maybeSingle();
          has_missing_images = !image;
        }

        // Verificar imagens do carrossel
        if (post.post_type === 'carousel' && post.carousel_image_ids && post.carousel_image_ids.length > 0) {
          const { data: carouselImgs } = await supabase
            .from("images")
            .select("id")
            .in("id", post.carousel_image_ids);
          has_missing_images = !carouselImgs || carouselImgs.length !== post.carousel_image_ids.length;
        }

        return {
          ...post,
          has_missing_phrase,
          has_missing_images,
          last_error,
        };
      }));

      setPosts(postsWithErrors);
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
        .select("id, username, account_id, profile_picture_url")
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
        .select("id, content, folder_id");

      if (error) throw error;
      setPhrases(data || []);
    } catch (error) {
      console.error("Error loading phrases:", error);
    }
  };

  const loadImages = async () => {
    try {
      const { data, error } = await supabase
        .from("images")
        .select("id, file_name, public_url, alt_text, folder_id");

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error("Error loading images:", error);
    }
  };

  const loadPhraseFolders = async () => {
    try {
      const { data, error } = await supabase
        .from("content_folders")
        .select("*")
        .eq("type", "phrase")
        .order("name");

      if (error) throw error;
      setPhraseFolders(data || []);
    } catch (error) {
      console.error("Error loading phrase folders:", error);
    }
  };

  const loadImageFolders = async () => {
    try {
      const { data, error } = await supabase
        .from("content_folders")
        .select("*")
        .eq("type", "image")
        .order("name");

      if (error) throw error;
      setImageFolders(data || []);
    } catch (error) {
      console.error("Error loading image folders:", error);
    }
  };

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, title, status")
        .eq("status", "active");

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error("Error loading campaigns:", error);
    }
  };

  const handleWizardSubmit = async (data: WizardData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("periodic_posts").insert({
        user_id: user.id,
        title: data.title.trim(),
        account_id: data.selectedAccount,
        campaign_id: data.selectedCampaign === "none" ? null : data.selectedCampaign,
        interval_minutes: parseInt(data.intervalMinutes),
        post_type: data.postType,
        use_random_phrase: data.postType === 'text' ? data.useRandomPhrase : (data.useText ? data.useRandomPhrase : false),
        specific_phrase_id: data.postType === 'text' && !data.useRandomPhrase ? data.selectedPhrase || null : (data.useText && !data.useRandomPhrase ? data.selectedPhrase || null : null),
        random_phrase_folder_id: (data.postType === 'text' && data.useRandomPhrase) || (data.postType !== 'text' && data.useText && data.useRandomPhrase) ? data.selectedRandomPhraseFolder : null,
        use_random_image: data.postType === 'image' ? data.useRandomImage : false,
        specific_image_id: data.postType === 'image' && !data.useRandomImage ? data.selectedImage || null : null,
        carousel_image_ids: data.postType === 'carousel' ? data.carouselImages : [],
        use_intelligent_delay: data.useIntelligentDelay,
      });

      if (error) throw error;

      toast({
        title: "Automação criada com sucesso! 🎉",
        description: "Sua nova automação está pronta para começar a postar.",
      });

      setOpen(false);
      loadPosts();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar automação",
        description: error.message,
      });
      throw error;
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


  const handlePostNow = async (post: PeriodicPost) => {
    setPostingNow(post.id);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      // Buscar frase se necessário
      let phraseContent = "";
      if (post.post_type === 'text' || (post.post_type !== 'text' && post.specific_phrase_id)) {
        if (post.use_random_phrase) {
          // Buscar frase aleatória respeitando a pasta (se especificada)
          let query = supabase.from("phrases").select("content");
          
          if (post.random_phrase_folder_id) {
            query = query.eq("folder_id", post.random_phrase_folder_id);
          }
          
          const { data: allPhrases } = await query;
          if (allPhrases && allPhrases.length > 0) {
            const randomPhrase = allPhrases[Math.floor(Math.random() * allPhrases.length)];
            phraseContent = randomPhrase.content;
          }
        } else if (post.phrases) {
          phraseContent = post.phrases.content;
        }
      }

      // Buscar imagens se necessário
      let imageUrls: string[] = [];
      if (post.post_type === 'image') {
        if (post.use_random_image) {
          const { data: randomImage } = await supabase
            .from("images")
            .select("public_url")
            .limit(1)
            .single();
          if (randomImage) imageUrls = [randomImage.public_url];
        } else if (post.specific_image_id) {
          const { data: image } = await supabase
            .from("images")
            .select("public_url")
            .eq("id", post.specific_image_id)
            .single();
          if (image) imageUrls = [image.public_url];
        }
      } else if (post.post_type === 'carousel' && post.carousel_image_ids) {
        const { data: carouselImgs } = await supabase
          .from("images")
          .select("public_url")
          .in("id", post.carousel_image_ids);
        if (carouselImgs) imageUrls = carouselImgs.map(img => img.public_url);
      }

      // Chamar edge function para criar o post
      const { data, error } = await supabase.functions.invoke("threads-create-post", {
        body: {
          accountId: post.account_id,
          text: phraseContent || undefined,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          postType: post.post_type,
        },
      });

      if (error) throw error;

      toast({
        title: "Post enviado com sucesso!",
        description: "O post foi publicado imediatamente no Threads.",
      });
    } catch (error: any) {
      console.error("Erro ao postar agora:", error);
      toast({
        variant: "destructive",
        title: "Erro ao postar",
        description: error.message || "Não foi possível publicar o post.",
      });
    } finally {
      setPostingNow(null);
    }
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
              <Button disabled={accounts.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Automação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-8">
              <PeriodicPostWizard
                accounts={accounts}
                campaigns={campaigns}
                phrases={phrases}
                images={images}
                phraseFolders={phraseFolders}
                imageFolders={imageFolders}
                onSubmit={handleWizardSubmit}
                onCancel={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                      {post.title}
                      {post.is_active ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      {post.has_missing_phrase && (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          Frase removida
                        </Badge>
                      )}
                      {post.has_missing_images && (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          Imagem removida
                        </Badge>
                      )}
                      {post.last_error && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="destructive" className="gap-1 text-xs cursor-help">
                                <AlertCircle className="h-3 w-3" />
                                Última execução falhou
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">{post.last_error}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        A cada {post.interval_minutes} minutos
                      </span>
                      <span className="text-muted-foreground/60">•</span>
                      <span>{post.threads_accounts.username || post.threads_accounts.account_id}</span>
                      <span className="text-muted-foreground/60">•</span>
                      <span className="capitalize">
                        {post.post_type === 'text' ? '📝 Texto' : 
                         post.post_type === 'image' ? '🖼️ Imagem' : 
                         '🎠 Carrossel'}
                      </span>
                      {post.campaigns && (
                        <>
                          <span className="text-muted-foreground/60">•</span>
                          <Badge variant="outline" className="text-xs">
                            📢 {post.campaigns.title}
                          </Badge>
                        </>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handlePostNow(post)}
                      disabled={postingNow === post.id}
                      className="gap-2"
                    >
                      {postingNow === post.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Postando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Postar Agora
                        </>
                      )}
                    </Button>
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
