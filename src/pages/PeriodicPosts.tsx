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
  use_intelligent_delay: boolean;
  is_active: boolean;
  last_posted_at: string | null;
  post_type: string;
  post_id: string | null;
  account_id: string;
  campaign_id: string | null;
  threads_accounts: {
    username: string | null;
    account_id: string;
    profile_picture_url: string | null;
  };
  posts?: {
    content: string | null;
    image_urls: string[];
    post_type: string;
  } | null;
  campaigns?: {
    title: string;
  } | null;
  has_missing_post?: boolean;
  last_error?: string | null;
}

interface Post {
  id: string;
  content: string | null;
  post_type: string;
  image_urls: string[];
  folder_id: string | null;
}

interface ThreadsAccount {
  id: string;
  username: string | null;
  account_id: string;
  profile_picture_url: string | null;
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
  const [availablePosts, setAvailablePosts] = useState<Post[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [postFolders, setPostFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [postingNow, setPostingNow] = useState<string | null>(null);
  
  // Estado para salvar dados temporários do wizard
  const [wizardDraftData, setWizardDraftData] = useState<Partial<WizardData> | null>(null);
  const [wizardDraftStep, setWizardDraftStep] = useState<number>(1);
  const [shouldReopenWizard, setShouldReopenWizard] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Detectar quando voltar de outra página e reabrir o wizard
  useEffect(() => {
    if (shouldReopenWizard && wizardDraftData) {
      setOpen(true);
      setShouldReopenWizard(false);
    }
  }, [shouldReopenWizard, wizardDraftData]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await Promise.all([loadPosts(), loadAccounts(), loadAvailablePosts(), loadCampaigns(), loadPostFolders()]);
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
          posts (content, image_urls, post_type),
          campaigns (title)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Buscar último erro e validar conteúdo de cada automação
      const postsWithErrors = await Promise.all((data || []).map(async (post) => {
        let has_missing_post = false;
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

        // Verificar se post_id existe
        if (post.post_id) {
          const { data: postData } = await supabase
            .from("posts")
            .select("id")
            .eq("id", post.post_id)
            .maybeSingle();
          has_missing_post = !postData;
        }

        return {
          ...post,
          has_missing_post,
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

  const loadAvailablePosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("id, content, post_type, image_urls, folder_id")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAvailablePosts(data || []);
    } catch (error) {
      console.error("Error loading posts:", error);
    }
  };

  const loadPostFolders = async () => {
    try {
      const { data, error } = await supabase
        .from("content_folders")
        .select("*")
        .eq("type", "post")
        .order("name");

      if (error) throw error;
      setPostFolders(data || []);
    } catch (error) {
      console.error("Error loading post folders:", error);
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
        post_id: data.useRandomPost ? null : data.selectedPost,
        post_type: data.useRandomPost ? 'random' : 'specific',
        use_intelligent_delay: data.useIntelligentDelay,
      });

      if (error) throw error;

      toast({
        title: "Automação criada com sucesso! 🎉",
        description: "Sua nova automação está pronta para começar a postar.",
      });

      setOpen(false);
      setWizardDraftData(null);
      setWizardDraftStep(1);
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

  const handleNavigateToAddContent = (
    type: 'posts' | 'campaigns',
    currentData: WizardData,
    currentStep: number
  ) => {
    setWizardDraftData(currentData);
    setWizardDraftStep(currentStep);
    setOpen(false);
    
    const routes = {
      posts: '/posts',
      campaigns: '/campaigns',
    };
    
    navigate(routes[type]);
    
    setTimeout(() => {
      setShouldReopenWizard(true);
    }, 500);
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

      let text = "";
      let imageUrls: string[] = [];

      // Se for post específico, buscar o post
      if (post.post_type === 'specific' && post.post_id) {
        const { data: postData } = await supabase
          .from("posts")
          .select("content, image_urls")
          .eq("id", post.post_id)
          .maybeSingle();
        
        if (postData) {
          text = postData.content || "";
          imageUrls = postData.image_urls || [];
        }
      } 
      // Se for post aleatório, selecionar um post aleatoriamente
      else if (post.post_type === 'random') {
        const { data: randomPosts } = await supabase
          .from("posts")
          .select("content, image_urls")
          .eq("user_id", session.user.id);
        
        if (randomPosts && randomPosts.length > 0) {
          const randomPost = randomPosts[Math.floor(Math.random() * randomPosts.length)];
          text = randomPost.content || "";
          imageUrls = randomPost.image_urls || [];
        }
      }

      // Chamar edge function para criar o post
      const { data, error } = await supabase.functions.invoke("threads-create-post", {
        body: {
          accountId: post.account_id,
          text: text || undefined,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          postType: imageUrls.length > 1 ? 'carousel' : (imageUrls.length === 1 ? 'image' : 'text'),
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
                posts={availablePosts}
                postFolders={postFolders}
                onSubmit={handleWizardSubmit}
                onCancel={() => {
                  setOpen(false);
                  setWizardDraftData(null);
                  setWizardDraftStep(1);
                }}
                initialData={wizardDraftData || undefined}
                initialStep={wizardDraftStep}
                onNavigateToAddContent={handleNavigateToAddContent}
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
                      {post.has_missing_post && (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          Post removido
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
                        {post.post_type === 'random' ? '🎲 Aleatório' : 
                         post.posts ? (
                           post.posts.post_type === 'TEXT' ? '📝 Texto' : 
                           post.posts.post_type === 'IMAGE' ? '🖼️ Imagem' : 
                           '🎠 Carrossel'
                         ) : '📝 Post'}
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
                      {post.post_type === 'random' ? "Post Aleatório 🎲" : "Post Específico"}
                    </span>
                  </div>
                  {post.posts && post.post_type === 'specific' && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Tipo:</span>
                        <Badge variant="outline">
                          {post.posts.post_type === 'TEXT' ? '📝 Texto' : 
                           post.posts.post_type === 'IMAGE' ? '🖼️ Imagem' : 
                           '🎠 Carrossel'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Conteúdo:</span>
                        <span className="max-w-xs truncate">
                          {post.posts.content?.slice(0, 50) || 'Post sem texto'}
                        </span>
                      </div>
                    </>
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
          {accounts.length === 0 || availablePosts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Você precisa ter pelo menos uma conta conectada e um post cadastrado
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
