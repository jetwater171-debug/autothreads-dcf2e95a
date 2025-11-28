import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PostConfig } from "../WarmingPipelineWizard";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Zap } from "lucide-react";

interface WarmingPipelinePostConfigProps {
  post: PostConfig;
  onUpdate: (updatedPost: PostConfig) => void;
}

export const WarmingPipelinePostConfig = ({ post, onUpdate }: WarmingPipelinePostConfigProps) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [postsRes, foldersRes] = await Promise.all([
        supabase.from("posts").select("*").eq("user_id", user.id),
        supabase.from("content_folders").select("*").eq("user_id", user.id).eq("type", "post"),
      ]);

      setPosts(postsRes.data || []);
      setFolders(foldersRes.data || []);
    };

    loadData();
  }, []);

  const handleFieldChange = (field: string, value: any) => {
    onUpdate({ ...post, [field]: value });
  };

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

      <div className="space-y-3 p-3 rounded-lg border">
        <Label>Texto do Post (Opcional)</Label>
        <Textarea
          placeholder="Digite o texto para este post..."
          value={post.customText || ""}
          onChange={(e) => handleFieldChange("customText", e.target.value)}
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-3 p-3 rounded-lg border">
        <Label>Post (Opcional)</Label>
        <Select value={post.postId} onValueChange={(value) => handleFieldChange("postId", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecionar post existente..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhum</SelectItem>
            {posts.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.post_type === 'TEXT' ? '📝' : p.post_type === 'IMAGE' ? '🖼️' : '🎠'} {p.content?.substring(0, 50) || 'Sem texto'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
