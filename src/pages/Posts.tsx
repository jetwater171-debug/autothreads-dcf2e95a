import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Upload, X, FolderInput as FolderInputIcon, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ThreadsPostPreview } from "@/components/ThreadsPostPreview";
import { FolderManager } from "@/components/FolderManager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

interface Post {
  id: string;
  content: string | null;
  post_type: string;
  image_urls: string[];
  folder_id: string | null;
  created_at: string;
}

interface Folder {
  id: string;
  name: string;
  type: string;
  itemCount?: number;
}

export default function Posts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [content, setContent] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [postToMove, setPostToMove] = useState<Post | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    loadPosts();
    loadFolders();
  };

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar posts",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const { data: foldersData, error: foldersError } = await supabase
        .from("content_folders")
        .select("*")
        .eq("type", "post")
        .order("name");

      if (foldersError) throw foldersError;

      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("id, folder_id");

      if (postsError) throw postsError;

      const foldersWithCount = (foldersData || []).map(folder => ({
        ...folder,
        itemCount: postsData?.filter(p => p.folder_id === folder.id).length || 0,
      }));

      setFolders(foldersWithCount);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar pastas",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const detectPostType = (text: string, images: string[]): 'text' | 'image' | 'carousel' => {
    if (images.length >= 2) return 'carousel';
    if (images.length === 1) return 'image';
    return 'text';
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setImageFiles(prev => [...prev, ...files]);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageUrls(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() && imageUrls.length === 0) {
      toast({
        title: "Post vazio",
        description: "Adicione texto ou imagens para criar o post",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      let uploadedUrls: string[] = [];

      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${session.user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('post-images')
            .getPublicUrl(filePath);

          uploadedUrls.push(publicUrl);
        }
      }

      const postType = detectPostType(content, uploadedUrls);

      if (editingPost) {
        const { error } = await supabase
          .from("posts")
          .update({
            content: content.trim() || null,
            post_type: postType,
            image_urls: uploadedUrls.length > 0 ? uploadedUrls : editingPost.image_urls,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingPost.id);

        if (error) throw error;

        toast({
          title: "Post atualizado",
          description: "Seu post foi atualizado com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from("posts")
          .insert({
            user_id: session.user.id,
            content: content.trim() || null,
            post_type: postType,
            image_urls: uploadedUrls,
          });

        if (error) throw error;

        toast({
          title: "Post criado",
          description: "Seu post foi criado com sucesso!",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      loadPosts();
      loadFolders();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar post",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setContent("");
    setImageFiles([]);
    setImageUrls([]);
    setEditingPost(null);
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setContent(post.content || "");
    setImageUrls(post.image_urls);
    setIsDialogOpen(true);
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Tem certeza que deseja excluir este post?")) return;

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

      if (error) throw error;

      toast({
        title: "Post excluído",
        description: "Post removido com sucesso",
      });

      loadPosts();
      loadFolders();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir post",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMoveToFolder = async () => {
    if (!postToMove) return;

    try {
      const { error } = await supabase
        .from("posts")
        .update({ folder_id: targetFolderId })
        .eq("id", postToMove.id);

      if (error) throw error;

      toast({
        title: "Post movido",
        description: targetFolderId ? "Post movido para a pasta" : "Post movido para Todas as Itens",
      });

      setIsMoveDialogOpen(false);
      setPostToMove(null);
      setTargetFolderId(null);
      loadPosts();
      loadFolders();
    } catch (error: any) {
      toast({
        title: "Erro ao mover post",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredPosts = selectedFolder === null
    ? posts.filter(p => p.folder_id === null)
    : posts.filter(p => p.folder_id === selectedFolder);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Posts
            </h1>
            <p className="text-muted-foreground mt-1">
              Crie e gerencie seus posts para o Threads
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Post
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <FolderManager
                folders={folders}
                type="post" 
                selectedFolder={selectedFolder}
                onFolderSelect={setSelectedFolder}
                onFoldersUpdate={loadFolders}
              />
            </div>
          </div>

          <div className="lg:col-span-4">
            {filteredPosts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground mb-4">
                    {selectedFolder ? "Nenhum post nesta pasta" : "Nenhum post criado ainda"}
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar primeiro post
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                <AnimatePresence mode="popLayout">
                  {filteredPosts.map((post) => (
                    <motion.div
                      key={post.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="group hover:shadow-xl hover:scale-[1.01] transition-all duration-200 h-full flex flex-col overflow-hidden border-border/50">
                        <CardContent className="p-0 flex-1 flex flex-col">
                          {/* Preview de imagens */}
                          {post.image_urls.length > 0 && (
                            <div className="relative w-full h-40 bg-muted/30 flex items-center justify-center">
                              <img
                                src={post.image_urls[0]}
                                alt=""
                                className="max-w-full max-h-full object-contain"
                              />
                              {post.image_urls.length > 1 && (
                                <div className="absolute top-2 right-2 bg-background/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold shadow-lg border border-border/50">
                                  +{post.image_urls.length - 1}
                                </div>
                              )}
                              {/* Tipo do post badge sobreposto */}
                              <div className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/95 backdrop-blur-sm text-foreground text-xs font-medium border border-border/50 shadow-lg">
                                {post.post_type === 'text' && "📝 Texto"}
                                {post.post_type === 'image' && "🖼️ Imagem"}
                                {post.post_type === 'carousel' && "🎠 Carrossel"}
                              </div>
                            </div>
                          )}

                          {/* Conteúdo */}
                          <div className="p-4 flex-1 flex flex-col gap-3">
                            {/* Se não houver imagem, mostrar o badge do tipo no topo */}
                            {post.image_urls.length === 0 && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium w-fit">
                                📝 Texto
                              </div>
                            )}
                            
                            {/* Conteúdo de texto */}
                            {post.content && (
                              <p className="text-sm text-foreground/80 line-clamp-3 flex-1">
                                {post.content}
                              </p>
                            )}

                            {/* Footer com data e ações */}
                            <div className="flex items-center justify-between pt-3 border-t border-border/50">
                              <span className="text-xs text-muted-foreground">
                                {new Date(post.created_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'short',
                                })}
                              </span>
                              
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                  onClick={() => {
                                    setPostToMove(post);
                                    setTargetFolderId(post.folder_id);
                                    setIsMoveDialogOpen(true);
                                  }}
                                >
                                  <FolderInputIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                  onClick={() => handleEdit(post)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => handleDelete(post.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog de criar/editar post */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? "Editar Post" : "Novo Post"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Texto (opcional)
                </label>
                <Textarea
                  placeholder="Digite o texto do seu post..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  maxLength={500}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {content.length}/500 caracteres
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Imagens (opcional)
                </label>
                <div className="space-y-3">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Clique para enviar imagens
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                    />
                  </label>

                  {imageUrls.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {imageUrls.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={url}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Tipo detectado:{" "}
                  <span className="text-primary font-semibold">
                    {detectPostType(content, imageUrls).toUpperCase()}
                  </span>
                </p>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-4">
              <label className="text-sm font-medium block">Preview</label>
              <ThreadsPostPreview
                username="seu_usuario"
                profilePicture="https://api.dicebear.com/7.x/avataaars/svg?seed=preview"
                content={content}
                images={imageUrls}
                timestamp={new Date().toISOString()}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={uploading}>
              {uploading ? "Salvando..." : editingPost ? "Atualizar" : "Salvar Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de mover para pasta */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover para pasta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select
              value={targetFolderId || "none"}
              onValueChange={(value) => setTargetFolderId(value === "none" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma pasta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Todas as Itens</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMoveToFolder}>Mover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
