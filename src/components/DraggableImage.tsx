import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableImageProps {
  id: string;
  publicUrl: string;
  fileName: string;
  altText: string | null;
  onEdit: () => void;
  onDelete: () => void;
  isDragging?: boolean;
}

export const DraggableImage = ({ 
  id, 
  publicUrl, 
  fileName, 
  altText, 
  onEdit, 
  onDelete,
  isDragging = false
}: DraggableImageProps) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
    data: { type: 'image', id }
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  return (
    <Card 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "overflow-hidden group cursor-move transition-all",
        isDragging && "opacity-50 shadow-2xl scale-105 ring-2 ring-primary"
      )}
      {...listeners}
      {...attributes}
    >
      <div className="relative aspect-square">
        <img
          src={publicUrl}
          alt={altText || fileName}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <CardContent className="p-3">
        <p className="text-sm font-medium truncate">{fileName}</p>
        {altText && (
          <p className="text-xs text-muted-foreground truncate mt-1">
            {altText}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
