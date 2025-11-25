import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Clock, Calendar, Type, Image as ImageIcon } from "lucide-react";
import { WarmingPipelineData } from "../WarmingPipelineWizard";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

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

      // Criar a esteira
      const { data: pipeline, error: pipelineError } = await supabase
        .from("warming_pipelines")
        .insert({
          user_id: user.id,
          name: data.name,
          total_days: data.totalDays,
          status: "active",
        })
        .select()
        .single();

      if (pipelineError) throw pipelineError;

      // Criar os dias e posts
      for (const day of data.days) {
        const { data: dayRecord, error: dayError } = await supabase
          .from("warming_pipeline_days")
          .insert({
            pipeline_id: pipeline.id,
            day_number: day.dayNumber,
            posts_count: day.postsCount,
          })
          .select()
          .single();

        if (dayError) throw dayError;

        if (day.posts.length > 0) {
          const postsToInsert = day.posts.map((post) => ({
            day_id: dayRecord.id,
            post_order: post.postOrder,
            scheduled_time: post.scheduledTime,
            use_intelligent_delay: post.useIntelligentDelay,
            post_type: post.postType,
            text_mode: post.textMode,
            specific_phrase_id: post.specificPhraseId,
            random_phrase_folder_id: post.randomPhraseFolderId,
            image_mode: post.imageMode,
            specific_image_id: post.specificImageId,
            random_image_folder_id: post.randomImageFolderId,
            carousel_image_ids: post.carouselImageIds,
          }));

          const { error: postsError } = await supabase
            .from("warming_pipeline_posts")
            .insert(postsToInsert);

          if (postsError) throw postsError;
        }
      }

      toast.success("Esteira criada com sucesso!");
      onComplete();
    } catch (error: any) {
      console.error("Erro ao criar esteira:", error);
      toast.error("Erro ao criar esteira: " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6 py-4 animate-fade-in">
      <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border border-border/50">
        <div className="p-2 rounded-lg bg-primary/10">
          <Check className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold mb-1">Revisão Final</h3>
          <p className="text-sm text-muted-foreground">
            Confira todas as configurações antes de criar a esteira
          </p>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Nome da esteira</p>
            <p className="font-semibold">{data.name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Duração</p>
            <p className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {data.totalDays} dias
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total de posts</p>
            <p className="font-semibold">{totalPosts} posts</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Dias de descanso</p>
            <p className="font-semibold">
              {data.days.filter(d => d.postsCount === 0).length} dias
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-3 max-h-[40vh] overflow-y-auto">
        {data.days.map((day) => (
          <Card key={day.dayNumber} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                  {day.dayNumber}
                </div>
                <span className="font-semibold">Dia {day.dayNumber}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {day.postsCount === 0 ? "Descanso" : `${day.postsCount} post${day.postsCount > 1 ? "s" : ""}`}
              </span>
            </div>

            {day.posts.length > 0 && (
              <div className="space-y-2">
                {day.posts.map((post) => (
                  <div key={post.postOrder} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-muted/30">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{post.scheduledTime}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="capitalize">{post.postType.replace("_", " + ")}</span>
                    {post.useIntelligentDelay && (
                      <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Delay inteligente
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button onClick={onBack} variant="outline" size="lg" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button
          onClick={handleCreate}
          disabled={isCreating}
          size="lg"
          className="gap-2"
        >
          {isCreating ? "Criando..." : "Criar esteira"}
          <Check className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
