import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PostConfig } from "../WarmingPipelineWizard";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Zap } from "lucide-react";

interface WarmingPipelinePostConfigProps {
  post: PostConfig;
  onUpdate: (updatedPost: PostConfig) => void;
}

export const WarmingPipelinePostConfig = ({ post, onUpdate }: WarmingPipelinePostConfigProps) => {
  const [phrases, setPhrases] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [phrasesRes, imagesRes, foldersRes] = await Promise.all([
        supabase.from("phrases").select("*").eq("user_id", user.id),
        supabase.from("images").select("*").eq("user_id", user.id),
        supabase.from("content_folders").select("*").eq("user_id", user.id),
      ]);

      setPhrases(phrasesRes.data || []);
      setImages(imagesRes.data || []);
      setFolders(foldersRes.data || []);
    };

    loadData();
  }, []);

  const handleFieldChange = (field: string, value: any) => {
    onUpdate({ ...post, [field]: value });
  };

  const needsText = ["text", "text_image"].includes(post.postType);
  const needsImage = ["image", "text_image", "carousel"].includes(post.postType);
  const isCarousel = post.postType === "carousel";

  return (
    <div className="space-y-4 p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Clock className="h-4 w-4" />
        Post #{post.postOrder}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Horário</Label>
          <Input
            type="time"
            value={post.scheduledTime}
            onChange={(e) => handleFieldChange("scheduledTime", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Tipo de conteúdo</Label>
          <Select value={post.postType} onValueChange={(value) => handleFieldChange("postType", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Texto</SelectItem>
              <SelectItem value="image">Imagem</SelectItem>
              <SelectItem value="text_image">Texto + Imagem</SelectItem>
              <SelectItem value="carousel">Carrossel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <Label className="cursor-pointer">Delay inteligente</Label>
        </div>
        <Switch
          checked={post.useIntelligentDelay}
          onCheckedChange={(checked) => handleFieldChange("useIntelligentDelay", checked)}
        />
      </div>

      {needsText && (
        <div className="space-y-3 p-3 rounded-lg border">
          <Label>Configuração de Texto</Label>
          <Select value={post.textMode} onValueChange={(value) => handleFieldChange("textMode", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="specific">Frase específica</SelectItem>
              <SelectItem value="random">Frase aleatória</SelectItem>
              <SelectItem value="random_folder">Pasta de frases</SelectItem>
            </SelectContent>
          </Select>

          {post.textMode === "specific" && (
            <Select value={post.specificPhraseId} onValueChange={(value) => handleFieldChange("specificPhraseId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha uma frase" />
              </SelectTrigger>
              <SelectContent>
                {phrases.map((phrase) => (
                  <SelectItem key={phrase.id} value={phrase.id}>
                    {phrase.content.substring(0, 50)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {post.textMode === "random_folder" && (
            <Select value={post.randomPhraseFolderId} onValueChange={(value) => handleFieldChange("randomPhraseFolderId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha uma pasta" />
              </SelectTrigger>
              <SelectContent>
                {folders.filter(f => f.type === "phrase").map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {needsImage && !isCarousel && (
        <div className="space-y-3 p-3 rounded-lg border">
          <Label>Configuração de Imagem</Label>
          <Select value={post.imageMode} onValueChange={(value) => handleFieldChange("imageMode", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="specific">Imagem específica</SelectItem>
              <SelectItem value="random">Imagem aleatória</SelectItem>
              <SelectItem value="random_folder">Pasta de imagens</SelectItem>
            </SelectContent>
          </Select>

          {post.imageMode === "specific" && (
            <Select value={post.specificImageId} onValueChange={(value) => handleFieldChange("specificImageId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha uma imagem" />
              </SelectTrigger>
              <SelectContent>
                {images.map((image) => (
                  <SelectItem key={image.id} value={image.id}>
                    {image.file_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {post.imageMode === "random_folder" && (
            <Select value={post.randomImageFolderId} onValueChange={(value) => handleFieldChange("randomImageFolderId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha uma pasta" />
              </SelectTrigger>
              <SelectContent>
                {folders.filter(f => f.type === "image").map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {isCarousel && (
        <div className="space-y-2 p-3 rounded-lg border">
          <Label>Selecione 2 a 10 imagens para o carrossel</Label>
          <p className="text-xs text-muted-foreground">
            Funcionalidade de seleção múltipla será implementada
          </p>
        </div>
      )}
    </div>
  );
};
