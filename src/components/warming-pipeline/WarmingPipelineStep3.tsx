import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Check, Clock, Zap } from "lucide-react";
import { WarmingPipelineData } from "../WarmingPipelineWizard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WarmingPipelineStep3Props {
  data: WarmingPipelineData;
  onBack: () => void;
  onComplete: () => void;
}

export const WarmingPipelineStep3 = ({ data, onBack, onComplete }: WarmingPipelineStep3Props) => {
  const [isCreating, setIsCreating] = useState(false);

  const totalPosts = data.days.reduce((sum, day) => sum + day.postsCount, 0);

  const handleCreate = async () => {
    setIsCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Prepare days data
      const days = data.days.map(day => ({
        dayIndex: day.dayNumber,
        isRest: day.postsCount === 0,
        posts: day.posts.map(post => ({
          orderIndex: post.postOrder,
          time: post.scheduledTime,
          intelligentDelay: post.useIntelligentDelay,
          contentType: post.postType,
          customText: post.textMode === 'custom' ? post.customText : undefined,
          useRandomPhrase: post.textMode === 'random' || post.textMode === 'random_folder',
          specificPhraseId: post.textMode === 'specific' ? post.specificPhraseId : undefined,
          randomPhraseFolderId: post.textMode === 'random_folder' ? post.randomPhraseFolderId : undefined,
          useRandomImage: post.imageMode === 'random' || post.imageMode === 'random_folder',
          specificImageId: post.imageMode === 'specific' ? post.specificImageId : undefined,
          randomImageFolderId: post.imageMode === 'random_folder' ? post.randomImageFolderId : undefined,
          carouselImageIds: post.carouselImageIds || [],
        })),
      }));

      // Call warmup-create-sequence edge function
      const { error } = await supabase.functions.invoke('warmup-create-sequence', {
        body: {
          name: data.name,
          totalDays: data.totalDays,
          days,
        },
      });

      if (error) throw error;

      toast.success("Esteira de aquecimento criada com sucesso!");
      
      // Refresh the list
      if ((window as any).refreshWarmingPipelines) {
        (window as any).refreshWarmingPipelines();
      }
      
      onComplete();
    } catch (error: any) {
      console.error("Erro ao criar esteira:", error);
      toast.error(error.message || "Erro ao criar esteira de aquecimento");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Check className="h-6 w-6 text-primary" />
        </div>
        <p className="text-muted-foreground">
          Revise as configurações da esteira antes de criar
        </p>
      </div>

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl">Resumo da Esteira</CardTitle>
          <CardDescription>Configurações gerais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Nome:</span>
            <span className="font-medium">{data.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Duração:</span>
            <Badge variant="secondary">{data.totalDays} dias</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total de posts:</span>
            <Badge variant="secondary">{totalPosts} posts</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Cronograma</h3>
        {data.days.map((day) => (
          <Card key={day.dayNumber} className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Dia {day.dayNumber}</CardTitle>
                {day.postsCount === 0 ? (
                  <Badge variant="secondary">Descanso</Badge>
                ) : (
                  <Badge variant="default">{day.postsCount} posts</Badge>
                )}
              </div>
            </CardHeader>
            {day.postsCount > 0 && (
              <CardContent className="space-y-2">
                {day.posts.map((post) => (
                  <div
                    key={post.postOrder}
                    className="flex items-center gap-3 p-2 rounded-lg bg-background/50"
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{post.scheduledTime}</span>
                    <Badge variant="outline" className="text-xs">
                      {post.postType}
                    </Badge>
                    {post.useIntelligentDelay && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Zap className="h-3 w-3" />
                        Delay
                      </Badge>
                    )}
                    {post.customText && (
                      <span className="text-xs text-muted-foreground truncate flex-1">
                        {post.customText}
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isCreating}
          className="flex-1"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button
          onClick={handleCreate}
          disabled={isCreating}
          className="flex-1"
        >
          {isCreating ? "Criando..." : "Criar esteira"}
        </Button>
      </div>
    </div>
  );
};
