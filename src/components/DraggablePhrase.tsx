import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, FolderInput as FolderInputIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggablePhraseProps {
  id: string;
  content: string;
  onEdit: () => void;
  onDelete: () => void;
  onMove: () => void;
  isDragging?: boolean;
}

export const DraggablePhrase = ({ 
  id, 
  content, 
  onEdit, 
  onDelete,
  onMove,
  isDragging = false
}: DraggablePhraseProps) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
    data: { type: 'phrase', id }
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-move transition-all",
        isDragging && "opacity-50 shadow-2xl scale-105 ring-2 ring-primary"
      )}
      {...listeners}
      {...attributes}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-normal flex-1">
            {content}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onMove();
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <FolderInputIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
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
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};
