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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Clock, CheckCircle, XCircle, Send, Loader2, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
  const [selectedPhraseFolder, setSelectedPhraseFolder] = useState<string | null>(null);
  const [selectedImageFolder, setSelectedImageFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [postingNow, setPostingNow] = useState<string | null>(null);
  
  const [title, setTitle] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("none");
  const [intervalMinutes, setIntervalMinutes] = useState("10");
  const [postType, setPostType] = useState<'text' | 'image' | 'carousel'>('text');
  const [useText, setUseText] = useState(true);
  const [useRandomPhrase, setUseRandomPhrase] = useState(true);
  const [selectedPhrase, setSelectedPhrase] = useState("");
  const [useRandomImage, setUseRandomImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [carouselImages, setCarouselImages] = useState<string[]>([]);
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
      
      // Validar se frases e imagens ainda existem
      const validatedPosts = await Promise.all((data || []).map(async (post) => {
        let has_missing_phrase = false;
        let has_missing_images = false;

        // Verificar frase específica
        if (post.specific_phrase_id && !post.use_random_phrase) {
          const { data: phrase } = await supabase
            .from("phrases")
            .select("id")
            .eq("id", post.specific_phrase_id)
            .single();
          has_missing_phrase = !phrase;
        }

        // Verificar imagem específica
        if (post.post_type === 'image' && post.specific_image_id && !post.use_random_image) {
          const { data: image } = await supabase
            .from("images")
            .select("id")
            .eq("id", post.specific_image_id)
            .single();
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
        };
      }));

      setPosts(validatedPosts);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: "Digite um nome para a automação",
      });
      return;
    }

    if (postType === 'text' && !selectedPhrase && !useRandomPhrase) {
      toast({
        variant: "destructive",
        title: "Selecione uma frase",
      });
      return;
    }

    if (postType === 'image' && !selectedImage && !useRandomImage) {
      toast({
        variant: "destructive",
        title: "Selecione uma imagem",
      });
      return;
    }

    if (postType === 'carousel' && (carouselImages.length < 2 || carouselImages.length > 10)) {
      toast({
        variant: "destructive",
        title: "Selecione entre 2 e 10 imagens",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("periodic_posts").insert({
        user_id: user.id,
        title: title.trim(),
        account_id: selectedAccount,
        campaign_id: selectedCampaign === "none" ? null : selectedCampaign,
        interval_minutes: parseInt(intervalMinutes),
        post_type: postType,
        use_random_phrase: postType === 'text' ? useRandomPhrase : (useText ? useRandomPhrase : false),
        specific_phrase_id: postType === 'text' && !useRandomPhrase ? selectedPhrase || null : (useText && !useRandomPhrase ? selectedPhrase || null : null),
        use_random_image: postType === 'image' ? useRandomImage : false,
        specific_image_id: postType === 'image' && !useRandomImage ? selectedImage || null : null,
        carousel_image_ids: postType === 'carousel' ? carouselImages : [],
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
    setTitle("");
    setSelectedAccount("");
    setSelectedCampaign("none");
    setIntervalMinutes("10");
    setPostType('text');
    setUseText(true);
    setUseRandomPhrase(true);
    setSelectedPhrase("");
    setUseRandomImage(false);
    setSelectedImage("");
    setCarouselImages([]);
    setUseIntelligentDelay(false);
    setSelectedPhraseFolder(null);
    setSelectedImageFolder(null);
  };

  const filteredPhrases = selectedPhraseFolder === null 
    ? phrases 
    : phrases.filter(p => p.folder_id === selectedPhraseFolder);

  const filteredImages = selectedImageFolder === null 
    ? images 
    : images.filter(img => img.folder_id === selectedImageFolder);

  const toggleCarouselImage = (imageId: string) => {
    setCarouselImages(prev => {
      if (prev.includes(imageId)) {
        return prev.filter(id => id !== imageId);
      } else {
        if (prev.length >= 10) {
          toast({
            variant: "destructive",
            title: "Máximo de 10 imagens",
          });
          return prev;
        }
        return [...prev, imageId];
      }
    });
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
          const { data: randomPhrase } = await supabase
            .from("phrases")
            .select("content")
            .limit(1)
            .single();
          if (randomPhrase) phraseContent = randomPhrase.content;
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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-background via-background to-muted/20">
              <DialogHeader className="space-y-3 pb-6 border-b">
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  ✨ Nova Automação
                </DialogTitle>
                <DialogDescription className="text-base">
                  Configure posts automáticos inteligentes para sua conta do Threads
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-8 pt-2">
                {/* Nome da Automação */}
                <div className="space-y-3">
                  <Label htmlFor="title" className="text-sm font-medium flex items-center gap-2">
                    <span className="text-base">✏️</span>
                    Nome da Automação
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={100}
                    className="h-12 border-border/60 hover:border-primary/50 transition-colors text-base"
                    placeholder="Ex: Frases motivacionais da manhã"
                  />
                </div>

                {/* Configurações Básicas */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/25">
                      <span className="text-sm font-bold">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">Configurações Básicas</h3>
                      <p className="text-xs text-muted-foreground">Conta e frequência de postagem</p>
                    </div>
                  </div>
                  
                  <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-6 space-y-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-3">
                          <Label htmlFor="account" className="text-sm font-medium flex items-center gap-2">
                            <span className="text-base">👤</span>
                            Conta do Threads
                          </Label>
                          <Select value={selectedAccount} onValueChange={setSelectedAccount} required>
                            <SelectTrigger className="h-12 border-border/60 hover:border-primary/50 transition-colors">
                              <SelectValue placeholder="Selecione uma conta">
                                {selectedAccount && accounts.find(a => a.id === selectedAccount) && (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage 
                                        src={accounts.find(a => a.id === selectedAccount)?.profile_picture_url || undefined} 
                                        alt={accounts.find(a => a.id === selectedAccount)?.username || "Profile"} 
                                      />
                                      <AvatarFallback className="text-xs">
                                        {accounts.find(a => a.id === selectedAccount)?.username?.charAt(0).toUpperCase() || "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{accounts.find(a => a.id === selectedAccount)?.username || accounts.find(a => a.id === selectedAccount)?.account_id}</span>
                                  </div>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage src={account.profile_picture_url || undefined} />
                                      <AvatarFallback className="text-xs">{account.username?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                                    </Avatar>
                                    {account.username || account.account_id}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="campaign" className="text-sm font-medium flex items-center gap-2">
                            <span className="text-base">📢</span>
                            Campanha (opcional)
                          </Label>
                          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                            <SelectTrigger className="h-12 border-border/60 hover:border-primary/50 transition-colors">
                              <SelectValue placeholder="Sem campanha" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem campanha</SelectItem>
                              {campaigns.map((campaign) => (
                                <SelectItem key={campaign.id} value={campaign.id}>
                                  {campaign.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-3">
                          <Label htmlFor="interval" className="text-sm font-medium flex items-center gap-2">
                            <span className="text-base">⏱️</span>
                            Intervalo entre posts
                          </Label>
                          <div className="flex gap-3">
                            <Input
                              id="interval"
                              type="number"
                              min="1"
                              value={intervalMinutes}
                              onChange={(e) => setIntervalMinutes(e.target.value)}
                              required
                              className="h-12 border-border/60 hover:border-primary/50 transition-colors"
                              placeholder="10"
                            />
                            <div className="flex items-center px-4 border rounded-lg bg-muted/80 text-muted-foreground text-sm font-medium whitespace-nowrap">
                              minutos
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="relative overflow-hidden flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 hover:border-primary/30 transition-all">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🎯</span>
                            <Label htmlFor="delay" className="text-sm font-semibold">Delay Inteligente</Label>
                          </div>
                          <p className="text-xs text-muted-foreground pl-6">
                            Varia o horário automaticamente para parecer mais humano
                          </p>
                        </div>
                        <Switch
                          id="delay"
                          checked={useIntelligentDelay}
                          onCheckedChange={setUseIntelligentDelay}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tipo de Conteúdo */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/25">
                      <span className="text-sm font-bold">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-base">Tipo de Conteúdo</h3>
                      <p className="text-xs text-muted-foreground">Escolha o formato do seu post</p>
                    </div>
                  </div>
                  
                  <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-6 space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <button
                          type="button"
                          onClick={() => setPostType('text')}
                          className={`group relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-300 ${
                            postType === 'text'
                              ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/20 scale-105'
                              : 'border-border/40 hover:border-primary/40 hover:bg-muted/30'
                          }`}
                        >
                          <div className={`text-4xl transition-transform duration-300 ${
                            postType === 'text' ? 'scale-110' : 'group-hover:scale-110'
                          }`}>
                            📝
                          </div>
                          <div className="text-center">
                            <span className="text-sm font-semibold block">Texto</span>
                            <span className="text-xs text-muted-foreground">Apenas texto</span>
                          </div>
                          {postType === 'text' && (
                            <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-lg">
                              <CheckCircle className="h-4 w-4" />
                            </div>
                          )}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setPostType('image')}
                          className={`group relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-300 ${
                            postType === 'image'
                              ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/20 scale-105'
                              : 'border-border/40 hover:border-primary/40 hover:bg-muted/30'
                          }`}
                        >
                          <div className={`text-4xl transition-transform duration-300 ${
                            postType === 'image' ? 'scale-110' : 'group-hover:scale-110'
                          }`}>
                            🖼️
                          </div>
                          <div className="text-center">
                            <span className="text-sm font-semibold block">Imagem</span>
                            <span className="text-xs text-muted-foreground">Foto + texto</span>
                          </div>
                          {postType === 'image' && (
                            <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-lg">
                              <CheckCircle className="h-4 w-4" />
                            </div>
                          )}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setPostType('carousel')}
                          className={`group relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-300 ${
                            postType === 'carousel'
                              ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/20 scale-105'
                              : 'border-border/40 hover:border-primary/40 hover:bg-muted/30'
                          }`}
                        >
                          <div className={`text-4xl transition-transform duration-300 ${
                            postType === 'carousel' ? 'scale-110' : 'group-hover:scale-110'
                          }`}>
                            🎠
                          </div>
                          <div className="text-center">
                            <span className="text-sm font-semibold block">Carrossel</span>
                            <span className="text-xs text-muted-foreground">Múltiplas fotos</span>
                          </div>
                          {postType === 'carousel' && (
                            <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-lg">
                              <CheckCircle className="h-4 w-4" />
                            </div>
                          )}
                        </button>
                      </div>

                      {/* Configurações de Texto */}
                      {postType === 'text' && (
                        <div className="space-y-4 pt-6 border-t border-border/50">
                          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/80 to-muted/40 border border-border/40">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">🎲</span>
                              <Label htmlFor="random" className="text-sm font-medium cursor-pointer">Frase Aleatória</Label>
                            </div>
                            <Switch
                              id="random"
                              checked={useRandomPhrase}
                              onCheckedChange={setUseRandomPhrase}
                            />
                          </div>

                          {!useRandomPhrase && (
                            <div className="space-y-3 animate-in fade-in-50 slide-in-from-top-3">
                              <Label htmlFor="phraseFolder" className="text-sm font-medium flex items-center gap-2">
                                <span>📁</span>
                                Filtrar por pasta (opcional)
                              </Label>
                              <Select value={selectedPhraseFolder || "all"} onValueChange={(v) => setSelectedPhraseFolder(v === "all" ? null : v)}>
                                <SelectTrigger className="h-10 border-border/60 hover:border-primary/50 transition-colors">
                                  <SelectValue placeholder="Todas as frases" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todas as frases</SelectItem>
                                  {phraseFolders.map((folder) => (
                                    <SelectItem key={folder.id} value={folder.id}>
                                      {folder.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Label htmlFor="phrase" className="text-sm font-medium flex items-center gap-2">
                                <span>💭</span>
                                Selecione uma frase
                              </Label>
                              <Select value={selectedPhrase} onValueChange={setSelectedPhrase} required>
                                <SelectTrigger className="h-11 border-border/60 hover:border-primary/50 transition-colors">
                                  <SelectValue placeholder="Escolha a frase que será postada" />
                                </SelectTrigger>
                                <SelectContent>
                                  {filteredPhrases.map((phrase) => (
                                    <SelectItem key={phrase.id} value={phrase.id}>
                                      <div className="max-w-md truncate">{phrase.content}</div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Configurações de Imagem */}
                      {postType === 'image' && (
                        <div className="space-y-5 pt-6 border-t border-border/50">
                          {images.length === 0 ? (
                            <div className="p-6 text-center text-sm text-muted-foreground bg-muted/50 rounded-xl border-2 border-dashed border-border">
                              <span className="text-3xl mb-2 block">📸</span>
                              Você precisa cadastrar pelo menos 1 imagem na aba Imagens
                            </div>
                          ) : (
                            <>
                              {/* Seção de Texto (Destaque) */}
                              <div className="relative overflow-hidden space-y-4 p-5 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border-2 border-primary/30 shadow-lg">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10" />
                                <div className="flex items-center justify-between">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-2xl">💬</span>
                                      <Label htmlFor="useText" className="text-base font-bold">Texto da Legenda</Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground pl-8">Recomendado para melhor engajamento</p>
                                  </div>
                                  <Switch
                                    id="useText"
                                    checked={useText}
                                    onCheckedChange={setUseText}
                                    className="data-[state=checked]:bg-primary"
                                  />
                                </div>

                                {useText && (
                                  <div className="space-y-3 pt-3 animate-in fade-in-50 slide-in-from-top-3">
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-background/80 backdrop-blur border border-border/50">
                                      <div className="flex items-center gap-2">
                                        <span className="text-lg">🎲</span>
                                        <Label htmlFor="randomPhrase" className="text-sm font-medium">Frase Aleatória</Label>
                                      </div>
                                      <Switch
                                        id="randomPhrase"
                                        checked={useRandomPhrase}
                                        onCheckedChange={setUseRandomPhrase}
                                      />
                                    </div>

                                    {!useRandomPhrase && (
                                      <div className="space-y-2.5 animate-in fade-in-50 slide-in-from-top-3">
                                        <Label htmlFor="phraseFolderImage" className="text-sm font-medium flex items-center gap-2">
                                          <span>📁</span>
                                          Filtrar por pasta (opcional)
                                        </Label>
                                        <Select value={selectedPhraseFolder || "all"} onValueChange={(v) => setSelectedPhraseFolder(v === "all" ? null : v)}>
                                          <SelectTrigger className="bg-background h-10 border-border/60 hover:border-primary/50 transition-colors">
                                            <SelectValue placeholder="Todas as frases" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="all">Todas as frases</SelectItem>
                                            {phraseFolders.map((folder) => (
                                              <SelectItem key={folder.id} value={folder.id}>
                                                {folder.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>

                                        <Label htmlFor="phrase" className="text-sm font-medium flex items-center gap-2">
                                          <span>💭</span>
                                          Selecione uma frase
                                        </Label>
                                        <Select value={selectedPhrase} onValueChange={setSelectedPhrase} required>
                                          <SelectTrigger className="bg-background h-11 border-border/60 hover:border-primary/50 transition-colors">
                                            <SelectValue placeholder="Escolha a frase" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {filteredPhrases.map((phrase) => (
                                              <SelectItem key={phrase.id} value={phrase.id}>
                                                <div className="max-w-md truncate">{phrase.content}</div>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Seção de Imagem */}
                              <div className="space-y-4 p-5 rounded-2xl bg-muted/30 border border-border/40">
                                <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 backdrop-blur">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">🎲</span>
                                    <Label htmlFor="randomImage" className="text-sm font-medium">Imagem Aleatória</Label>
                                  </div>
                                  <Switch
                                    id="randomImage"
                                    checked={useRandomImage}
                                    onCheckedChange={setUseRandomImage}
                                  />
                                </div>

                                {!useRandomImage && (
                                  <div className="space-y-2.5 animate-in fade-in-50 slide-in-from-top-3">
                                    <Label htmlFor="imageFolder" className="text-sm font-medium flex items-center gap-2">
                                      <span>📁</span>
                                      Filtrar por pasta (opcional)
                                    </Label>
                                    <Select value={selectedImageFolder || "all"} onValueChange={(v) => setSelectedImageFolder(v === "all" ? null : v)}>
                                      <SelectTrigger className="h-10 border-border/60 hover:border-primary/50 transition-colors bg-background">
                                        <SelectValue placeholder="Todas as imagens" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="all">Todas as imagens</SelectItem>
                                        {imageFolders.map((folder) => (
                                          <SelectItem key={folder.id} value={folder.id}>
                                            {folder.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    <Label htmlFor="image" className="text-sm font-medium flex items-center gap-2">
                                      <span>🖼️</span>
                                      Selecione uma imagem
                                    </Label>
                                    <Select value={selectedImage} onValueChange={setSelectedImage} required>
                                      <SelectTrigger className="h-11 border-border/60 hover:border-primary/50 transition-colors bg-background">
                                        <SelectValue placeholder="Escolha a imagem" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {filteredImages.map((image) => (
                                          <SelectItem key={image.id} value={image.id}>
                                            <div className="flex items-center gap-3">
                                              <img src={image.public_url} className="h-10 w-10 object-cover rounded-lg border-2 border-border" alt="" />
                                              <span className="truncate font-medium">{image.file_name}</span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Configurações de Carrossel */}
                      {postType === 'carousel' && (
                        <div className="space-y-5 pt-6 border-t border-border/50">
                          {images.length < 2 ? (
                            <div className="p-6 text-center text-sm text-muted-foreground bg-muted/50 rounded-xl border-2 border-dashed border-border">
                              <span className="text-3xl mb-2 block">🎠</span>
                              Você precisa cadastrar pelo menos 2 imagens na aba Imagens
                            </div>
                          ) : (
                            <>
                              {/* Seção de Texto (Destaque) */}
                              <div className="relative overflow-hidden space-y-4 p-5 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border-2 border-primary/30 shadow-lg">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10" />
                                <div className="flex items-center justify-between">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-2xl">💬</span>
                                      <Label htmlFor="useTextCarousel" className="text-base font-bold">Texto da Legenda</Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground pl-8">Recomendado para melhor engajamento</p>
                                  </div>
                                  <Switch
                                    id="useTextCarousel"
                                    checked={useText}
                                    onCheckedChange={setUseText}
                                    className="data-[state=checked]:bg-primary"
                                  />
                                </div>

                                {useText && (
                                  <div className="space-y-3 pt-3 animate-in fade-in-50 slide-in-from-top-3">
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-background/80 backdrop-blur border border-border/50">
                                      <div className="flex items-center gap-2">
                                        <span className="text-lg">🎲</span>
                                        <Label htmlFor="randomPhraseCarousel" className="text-sm font-medium">Frase Aleatória</Label>
                                      </div>
                                      <Switch
                                        id="randomPhraseCarousel"
                                        checked={useRandomPhrase}
                                        onCheckedChange={setUseRandomPhrase}
                                      />
                                    </div>

                                    {!useRandomPhrase && (
                                      <div className="space-y-2.5 animate-in fade-in-50 slide-in-from-top-3">
                                        <Label htmlFor="phraseFolderCarousel" className="text-sm font-medium flex items-center gap-2">
                                          <span>📁</span>
                                          Filtrar por pasta (opcional)
                                        </Label>
                                        <Select value={selectedPhraseFolder || "all"} onValueChange={(v) => setSelectedPhraseFolder(v === "all" ? null : v)}>
                                          <SelectTrigger className="bg-background h-10 border-border/60 hover:border-primary/50 transition-colors">
                                            <SelectValue placeholder="Todas as frases" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="all">Todas as frases</SelectItem>
                                            {phraseFolders.map((folder) => (
                                              <SelectItem key={folder.id} value={folder.id}>
                                                {folder.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>

                                        <Label htmlFor="phraseCarousel" className="text-sm font-medium flex items-center gap-2">
                                          <span>💭</span>
                                          Selecione uma frase
                                        </Label>
                                        <Select value={selectedPhrase} onValueChange={setSelectedPhrase} required>
                                          <SelectTrigger className="bg-background h-11 border-border/60 hover:border-primary/50 transition-colors">
                                            <SelectValue placeholder="Escolha a frase" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {filteredPhrases.map((phrase) => (
                                              <SelectItem key={phrase.id} value={phrase.id}>
                                                <div className="max-w-md truncate">{phrase.content}</div>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Seção de Imagens do Carrossel */}
                              <div className="space-y-4 p-5 rounded-2xl bg-muted/30 border border-border/40">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-semibold flex items-center gap-2">
                                    <span className="text-lg">🎠</span>
                                    Selecione as imagens
                                  </Label>
                                  <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
                                    <span className="text-xs font-bold text-primary">
                                      {carouselImages.length}/10
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-2.5">
                                  <Label htmlFor="imageFolderCarousel" className="text-sm font-medium flex items-center gap-2">
                                    <span>📁</span>
                                    Filtrar por pasta (opcional)
                                  </Label>
                                  <Select value={selectedImageFolder || "all"} onValueChange={(v) => setSelectedImageFolder(v === "all" ? null : v)}>
                                    <SelectTrigger className="h-10 border-border/60 hover:border-primary/50 transition-colors bg-background">
                                      <SelectValue placeholder="Todas as imagens" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">Todas as imagens</SelectItem>
                                      {imageFolders.map((folder) => (
                                        <SelectItem key={folder.id} value={folder.id}>
                                          {folder.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="grid grid-cols-4 gap-3 max-h-72 overflow-y-auto p-4 border-2 border-dashed rounded-xl bg-background/50 backdrop-blur">
                                  {filteredImages.map((image) => (
                                    <button
                                      type="button"
                                      key={image.id}
                                      onClick={() => toggleCarouselImage(image.id)}
                                      className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300 aspect-square hover:scale-105 ${
                                        carouselImages.includes(image.id)
                                          ? 'border-primary ring-4 ring-primary/30 shadow-lg shadow-primary/20'
                                          : 'border-transparent hover:border-primary/30 hover:shadow-md'
                                      }`}
                                    >
                                      <img
                                        src={image.public_url}
                                        alt={image.alt_text || image.file_name}
                                        className="w-full h-full object-cover"
                                      />
                                      {carouselImages.includes(image.id) && (
                                        <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-primary/20 to-transparent flex items-center justify-center">
                                          <div className="bg-primary text-primary-foreground rounded-full w-9 h-9 flex items-center justify-center text-base font-bold shadow-2xl ring-2 ring-background">
                                            {carouselImages.indexOf(image.id) + 1}
                                          </div>
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                                {carouselImages.length > 0 && carouselImages.length < 2 && (
                                  <p className="text-xs text-destructive font-medium flex items-center gap-1.5 px-3 py-2 bg-destructive/10 rounded-lg border border-destructive/30">
                                    <span>⚠️</span>
                                    Selecione pelo menos 2 imagens
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Botões de Ação */}
                <div className="flex justify-end gap-4 pt-6 border-t border-border/50">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      resetForm();
                    }}
                    className="px-8 h-11 hover:bg-muted/80 transition-all"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="min-w-40 h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all font-semibold"
                  >
                    ✨ Criar Automação
                  </Button>
                </div>
              </form>
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
