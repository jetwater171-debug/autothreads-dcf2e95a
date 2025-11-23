import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, X, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ThreadsAccount {
  id: string;
  account_id: string;
  username: string | null;
  profile_picture_url: string | null;
}

const ManualPost = () => {
  const [accounts, setAccounts] = useState<ThreadsAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [postType, setPostType] = useState<'text' | 'image' | 'carousel'>('text');
  const [text, setText] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
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
        .select("id, username, account_id, profile_picture_url")
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

    const filesToUpload = postType === 'carousel' ? Array.from(files) : [files[0]];

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const uploadPromises = filesToUpload.map(async (file) => {
        if (file.size > maxSize) {
          throw new Error(`${file.name} é muito grande (máx 10MB)`);
        }

        if (!allowedTypes.includes(file.type)) {
          throw new Error(`${file.name} tem formato não suportado`);
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(filePath);

        return publicUrl;
      });

      const urls = await Promise.all(uploadPromises);

      if (postType === 'carousel') {
        if (uploadedImages.length + urls.length > 10) {
          toast({
            variant: "destructive",
            title: "Máximo de 10 imagens",
          });
          return;
        }
        setUploadedImages(prev => [...prev, ...urls]);
      } else {
        setUploadedImages(urls);
      }

      toast({
        title: "Imagens enviadas!",
        description: `${urls.length} imagem(ns) adicionada(s).`,
      });

      e.target.value = '';
    } catch (error: any) {
      console.error("Error uploading images:", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar imagem",
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    // Validações
    if (postType === 'text' && !text.trim()) {
      toast({
        variant: "destructive",
        title: "Digite algum texto",
      });
      return;
    }

    if (postType === 'image' && uploadedImages.length === 0) {
      toast({
        variant: "destructive",
        title: "Selecione uma imagem",
      });
      return;
    }

    if (postType === 'carousel' && (uploadedImages.length < 2 || uploadedImages.length > 10)) {
      toast({
        variant: "destructive",
        title: "Carrossel precisa de 2 a 10 imagens",
      });
      return;
    }

    if (!selectedAccount) {
      toast({
        variant: "destructive",
        title: "Selecione uma conta",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("threads-create-post", {
        body: {
          accountId: selectedAccount,
          text: text.trim(),
          imageUrls: uploadedImages,
          postType: postType,
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
      setUploadedImages([]);
      setPostType('text');
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
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">Post Manual</h1>
          <p className="text-muted-foreground mt-2 text-base">
            Crie e publique um post imediatamente no Threads
          </p>
        </div>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-xl">Criar Post</CardTitle>
            <CardDescription className="text-base">
              Selecione a conta, tipo de post e conteúdo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="account">Conta do Threads</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger id="account">
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={account.profile_picture_url || undefined} alt={account.username || "Profile"} />
                          <AvatarFallback>{account.username?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                        </Avatar>
                        {account.username || account.account_id}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="postType">Tipo de Post</Label>
              <Select value={postType} onValueChange={(value: any) => {
                setPostType(value);
                setUploadedImages([]);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">📝 Apenas Texto</SelectItem>
                  <SelectItem value="image">🖼️ Imagem + Texto</SelectItem>
                  <SelectItem value="carousel">🖼️🖼️ Carrossel (2-10 imagens)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {postType === 'text' && (
              <div className="space-y-2">
                <Label htmlFor="text">Texto do Post</Label>
                <Textarea
                  id="text"
                  placeholder="Digite o texto do seu post..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  maxLength={500}
                  required
                />
                <p className="text-xs text-muted-foreground text-right">
                  {text.length}/500 caracteres
                </p>
              </div>
            )}

            {(postType === 'image' || postType === 'carousel') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="text">Legenda (opcional)</Label>
                  <Textarea
                    id="text"
                    placeholder="Adicione uma legenda..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {text.length}/500 caracteres
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="images">
                    {postType === 'image' ? 'Selecionar Imagem' : 'Selecionar Imagens (2-10)'}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="file-upload" className="cursor-pointer flex-1">
                      <Button disabled={uploading || (postType === 'image' && uploadedImages.length >= 1) || (postType === 'carousel' && uploadedImages.length >= 10)} className="w-full" asChild>
                        <span>
                          {uploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Enviar {postType === 'carousel' ? 'Imagens' : 'Imagem'}
                            </>
                          )}
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      multiple={postType === 'carousel'}
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>

                  {postType === 'image' && uploadedImages[0] && (
                    <div className="relative mt-2">
                      <img src={uploadedImages[0]} className="w-full h-64 object-cover rounded border" alt="Preview" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => setUploadedImages([])}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {postType === 'carousel' && uploadedImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {uploadedImages.map((url, index) => (
                        <div key={index} className="relative">
                          <img src={url} className="w-full h-32 object-cover rounded border" alt={`Preview ${index + 1}`} />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <div className="absolute top-1 left-1 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {postType === 'carousel' && (
                    <p className="text-sm text-muted-foreground">
                      {uploadedImages.length} de 10 imagens selecionadas
                      {uploadedImages.length < 2 && " (mínimo 2)"}
                    </p>
                  )}
                </div>
              </>
            )}

            <Button 
              onClick={handlePost} 
              disabled={loading || !selectedAccount}
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
