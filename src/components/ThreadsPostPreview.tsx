import { motion } from "framer-motion";
import { Heart, MessageCircle, Repeat2, Send, BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ThreadsPostPreviewProps {
  username: string;
  profilePicture?: string;
  content: string;
  images?: string[];
  timestamp?: string;
}

export const ThreadsPostPreview = ({
  username,
  profilePicture,
  content,
  images = [],
  timestamp = "Agora"
}: ThreadsPostPreviewProps) => {
  const getImageGridClass = () => {
    if (!images || images.length === 0) return "";
    if (images.length === 1) return "grid-cols-1";
    if (images.length === 2) return "grid-cols-2";
    if (images.length === 3) return "grid-cols-3";
    return "grid-cols-2";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-primary/50 rounded-full blur-sm opacity-75" />
                <Avatar className="relative h-10 w-10 border-2 border-background">
                  <AvatarImage src={profilePicture} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-sm">{username}</span>
                  <BadgeCheck className="h-4 w-4 text-primary fill-primary/20" />
                </div>
                <span className="text-xs text-muted-foreground">{timestamp}</span>
              </div>
            </div>
          </div>

          {/* Content */}
          {content && (
            <div className="text-sm whitespace-pre-wrap leading-relaxed">
              {content}
            </div>
          )}

          {/* Images Grid */}
          {images && images.length > 0 && (
            <div className={`grid ${getImageGridClass()} gap-1 rounded-lg overflow-hidden max-w-sm`}>
              {images.slice(0, 4).map((image, index) => (
                <div
                  key={index}
                  className={`relative ${
                    images.length === 1 ? "aspect-[4/3]" : "aspect-video"
                  } ${images.length === 3 && index === 0 ? "row-span-2" : ""}`}
                >
                  <img
                    src={image}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {images.length > 4 && index === 3 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        +{images.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1 pt-2 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              className="hover:scale-105 transition-transform"
            >
              <Heart className="h-4 w-4 mr-1.5" />
              <span className="text-xs">Curtir</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hover:scale-105 transition-transform"
            >
              <MessageCircle className="h-4 w-4 mr-1.5" />
              <span className="text-xs">Comentar</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hover:scale-105 transition-transform"
            >
              <Repeat2 className="h-4 w-4 mr-1.5" />
              <span className="text-xs">Repostar</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hover:scale-105 transition-transform"
            >
              <Send className="h-4 w-4 mr-1.5" />
              <span className="text-xs">Compartilhar</span>
            </Button>
          </div>

          {/* Footer */}
          <div className="text-center pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground font-medium">
              Preview • Threads
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
