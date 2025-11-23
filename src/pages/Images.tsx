import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Edit, Loader2, ImageIcon, FolderInput as FolderInputIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FolderManager } from "@/components/FolderManager";

interface Image {
  id: string;
  file_name: string;
  file_path: string;
  public_url: string;
  alt_text: string | null;
  folder_id: string | null;
  created_at: string;
}

interface Folder {
  id: string;
  name: string;
  type: string;
  item_count?: number;
}

const Images = () => {
  const [images, setImages] = useState<Image[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingImage, setEditingImage] = useState<Image | null>(null);
  const [altText, setAltText] = useState("");
  const [movingImageId, setMovingImageId] = useState<string | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string>("none");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await Promise.all([loadImages(), loadFolders()]);
    };

    checkAuth();
  }, [navigate]);

  const loadImages = async () => {
    try {
      const { data, error } = await supabase
        .from("images")
        .select("id, file_name, file_path, public_url, alt_text, folder_id, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error("Error loading images:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar imagens",
        description: "Não foi possível carregar suas imagens.",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const { data, error } = await supabase
        .from("content_folders")
        .select("*")
        .eq("type", "image")
        .order("name");

      if (error) throw error;

      // Count items in each folder
      const foldersWithCounts = await Promise.all(
        (data || []).map(async (folder) => {
          const { count } = await supabase
            .from("images")
            .select("*", { count: "exact", head: true })
            .eq("folder_id", folder.id);

          return {
            ...folder,
            item_count: count || 0,
          };
        })
      );

      setFolders(foldersWithCounts);
    } catch (error) {
      console.error("Error loading folders:", error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validações
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

    if (file.size > maxSize) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 10MB.",
      });
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Formato não suportado",
        description: "Use apenas JPG, PNG, WEBP ou GIF.",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Upload para storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath);

      // Salvar no banco
      const { error: dbError } = await supabase
        .from('images')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          public_url: publicUrl,
        });

      if (dbError) throw dbError;

      toast({
        title: "Imagem enviada!",
        description: "Sua imagem foi adicionada com sucesso.",
      });

      loadImages();
      e.target.value = '';
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar imagem",
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (image: Image) => {
    try {
      // Deletar do storage
      const { error: storageError } = await supabase.storage
        .from('post-images')
        .remove([image.file_path]);

      if (storageError) throw storageError;

      // Deletar do banco
      const { error: dbError } = await supabase
        .from('images')
        .delete()
        .eq('id', image.id);

      if (dbError) throw dbError;

      toast({
        title: "Imagem removida",
        description: "A imagem foi excluída com sucesso.",
      });

      loadImages();
    } catch (error: any) {
      console.error("Error deleting image:", error);
      toast({
        variant: "destructive",
        title: "Erro ao remover imagem",
        description: error.message,
      });
    }
  };

  const handleUpdateAltText = async () => {
    if (!editingImage) return;

    try {
      const { error } = await supabase
        .from('images')
        .update({ alt_text: altText })
        .eq('id', editingImage.id);

      if (error) throw error;

      toast({
        title: "Alt text atualizado",
        description: "O texto alternativo foi salvo.",
      });

      setEditingImage(null);
      setAltText("");
      loadImages();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message,
      });
    }
  };

  const handleMoveToFolder = async (imageId: string, folderId: string | null) => {
    try {
      const { error } = await supabase
        .from("images")
        .update({ folder_id: folderId })
        .eq("id", imageId);

      if (error) throw error;

      toast({
        title: "Imagem movida!",
        description: folderId ? "Imagem movida para a pasta." : "Imagem movida para raiz.",
      });

      setMovingImageId(null);
      setTargetFolderId("none");
      await Promise.all([loadImages(), loadFolders()]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao mover imagem",
        description: error.message,
      });
    }
  };

  const filteredImages = selectedFolder === null 
    ? images 
    : images.filter(img => img.folder_id === selectedFolder);

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Imagens</h1>
            <p className="text-muted-foreground">
              Gerencie suas imagens para posts
            </p>
          </div>
          <div>
            <Label htmlFor="file-upload" className="cursor-pointer">
              <Button disabled={uploading} asChild>
                <span>
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Enviar Imagem
                    </>
                  )}
                </span>
              </Button>
            </Label>
            <Input
              id="file-upload"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        <FolderManager
          folders={folders}
          type="image"
          selectedFolder={selectedFolder}
          onFolderSelect={setSelectedFolder}
          onFoldersUpdate={() => {
            loadFolders();
            loadImages();
          }}
        />

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-square bg-muted animate-pulse" />
              </Card>
            ))}
          </div>
        ) : filteredImages.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {selectedFolder ? "Nenhuma imagem nesta pasta" : "Nenhuma imagem cadastrada ainda"}
              </p>
            </CardContent>
          </Card>
        ) : images.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Nenhuma imagem cadastrada ainda
              </p>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                Faça upload de imagens para usar em seus posts
              </p>
              <Label htmlFor="file-upload-empty" className="cursor-pointer">
                <Button asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Enviar Primeira Imagem
                  </span>
                </Button>
              </Label>
              <Input
                id="file-upload-empty"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredImages.map((image) => (
              <Card key={image.id} className="overflow-hidden group">
                <div className="relative aspect-square">
                  <img
                    src={image.public_url}
                    alt={image.alt_text || image.file_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Dialog open={movingImageId === image.id} onOpenChange={(open) => {
                      if (!open) {
                        setMovingImageId(null);
                        setTargetFolderId("none");
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => setMovingImageId(image.id)}
                        >
                          <FolderInputIcon className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Mover para Pasta</DialogTitle>
                          <DialogDescription>
                            Selecione a pasta de destino
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Select value={targetFolderId} onValueChange={setTargetFolderId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma pasta" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem pasta (raiz)</SelectItem>
                              {folders.map((folder) => (
                                <SelectItem key={folder.id} value={folder.id}>
                                  {folder.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            onClick={() => handleMoveToFolder(image.id, targetFolderId === "none" ? null : targetFolderId)}
                            className="w-full"
                          >
                            Mover
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={editingImage?.id === image.id} onOpenChange={(open) => {
                      if (!open) {
                        setEditingImage(null);
                        setAltText("");
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => {
                            setEditingImage(image);
                            setAltText(image.alt_text || "");
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Alt Text</DialogTitle>
                          <DialogDescription>
                            Adicione uma descrição para acessibilidade
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <img
                              src={image.public_url}
                              alt={image.file_name}
                              className="w-full h-48 object-cover rounded"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="alt-text">Texto Alternativo</Label>
                            <Textarea
                              id="alt-text"
                              value={altText}
                              onChange={(e) => setAltText(e.target.value)}
                              placeholder="Descreva a imagem..."
                              rows={3}
                            />
                          </div>
                          <Button onClick={handleUpdateAltText} className="w-full">
                            Salvar
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir esta imagem? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(image)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="text-sm font-medium truncate">{image.file_name}</p>
                  {image.alt_text && (
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {image.alt_text}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Images;
