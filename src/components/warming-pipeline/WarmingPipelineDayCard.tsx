import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { DayConfig, PostConfig } from "../WarmingPipelineWizard";
import { WarmingPipelinePostConfig } from "./WarmingPipelinePostConfig";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface WarmingPipelineDayCardProps {
  day: DayConfig;
  onUpdate: (dayNumber: number, updatedDay: DayConfig) => void;
}

export const WarmingPipelineDayCard = ({ day, onUpdate }: WarmingPipelineDayCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [postsCount, setPostsCount] = useState(day.postsCount);

  const handlePostsCountChange = (count: number) => {
    const validCount = Math.max(0, Math.min(10, count));
    setPostsCount(validCount);
    
    const newPosts: PostConfig[] = Array.from({ length: validCount }, (_, i) => {
      if (day.posts[i]) return day.posts[i];
      return {
        postOrder: i + 1,
        scheduledTime: "09:00",
        useIntelligentDelay: false,
        postType: "text",
      };
    });
    
    onUpdate(day.dayNumber, { ...day, postsCount: validCount, posts: newPosts });
  };

  const handlePostUpdate = (postOrder: number, updatedPost: PostConfig) => {
    const newPosts = day.posts.map(post => 
      post.postOrder === postOrder ? updatedPost : post
    );
    onUpdate(day.dayNumber, { ...day, posts: newPosts });
  };

  const handleRemovePost = (postOrder: number) => {
    const newPosts = day.posts
      .filter(post => post.postOrder !== postOrder)
      .map((post, index) => ({ ...post, postOrder: index + 1 }));
    
    onUpdate(day.dayNumber, { 
      ...day, 
      postsCount: newPosts.length, 
      posts: newPosts 
    });
    setPostsCount(newPosts.length);
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
              {day.dayNumber}
            </div>
            <div>
              <h4 className="font-semibold">Dia {day.dayNumber}</h4>
              <p className="text-sm text-muted-foreground">
                {postsCount === 0 ? "Dia de descanso" : `${postsCount} post${postsCount > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="pt-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Quantidade de posts</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={postsCount}
                onChange={(e) => handlePostsCountChange(parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            {postsCount > 0 && postsCount < 10 && (
              <Button
                onClick={() => handlePostsCountChange(postsCount + 1)}
                variant="outline"
                size="sm"
                className="mt-6"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar post
              </Button>
            )}
          </div>

          {postsCount > 0 && (
            <div className="space-y-3 pt-2">
              {day.posts.map((post) => (
                <div key={post.postOrder} className="relative pl-4 border-l-2 border-primary/20">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <WarmingPipelinePostConfig
                        post={post}
                        onUpdate={(updatedPost) => handlePostUpdate(post.postOrder, updatedPost)}
                      />
                    </div>
                    <Button
                      onClick={() => handleRemovePost(post.postOrder)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
