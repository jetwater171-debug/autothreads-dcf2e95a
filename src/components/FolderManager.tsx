import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Folder, FolderPlus, MoreVertical, Edit, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Folder {
  id: string;
  name: string;
  type: string;
  item_count?: number;
}

interface FolderManagerProps {
  folders: Folder[];
  type: "image" | "phrase";
  selectedFolder: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onFoldersUpdate: () => void;
}

export const FolderManager = ({ folders, type, selectedFolder, onFolderSelect, onFoldersUpdate }: FolderManagerProps) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderName, setFolderName] = useState("");
  const { toast } = useToast();

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!folderName.trim()) {
      toast({
        variant: "destructive",
        title: "Digite um nome para a pasta",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("content_folders").insert({
        user_id: user.id,
        name: folderName.trim(),
        type,
      });

      if (error) throw error;

      toast({
        title: "Pasta criada!",
      });

      setCreateOpen(false);
      setFolderName("");
      onFoldersUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar pasta",
        description: error.message,
      });
    }
  };

  const handleRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!folderName.trim() || !editingFolder) return;

    try {
      const { error } = await supabase
        .from("content_folders")
        .update({ name: folderName.trim() })
        .eq("id", editingFolder.id);

      if (error) throw error;

      toast({
        title: "Pasta renomeada!",
      });

      setEditingFolder(null);
      setFolderName("");
      onFoldersUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao renomear pasta",
        description: error.message,
      });
    }
  };

  const handleDeleteFolder = async (folder: Folder) => {
    if (folder.item_count && folder.item_count > 0) {
      toast({
        variant: "destructive",
        title: "Pasta não está vazia",
        description: "Mova ou exclua os itens antes de deletar a pasta.",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("content_folders")
        .delete()
        .eq("id", folder.id);

      if (error) throw error;

      toast({
        title: "Pasta excluída!",
      });

      if (selectedFolder === folder.id) {
        onFolderSelect(null);
      }
      onFoldersUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir pasta",
        description: error.message,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Pastas</h3>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <FolderPlus className="mr-2 h-4 w-4" />
              Nova Pasta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Pasta</DialogTitle>
              <DialogDescription>
                Organize suas {type === "image" ? "imagens" : "frases"} em pastas
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Pasta</Label>
                <Input
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Ex: Motivacionais"
                  maxLength={50}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <Card
          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
            selectedFolder === null ? "border-primary shadow-md" : ""
          }`}
          onClick={() => onFolderSelect(null)}
        >
          <div className="flex items-center gap-3">
            <Folder className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">Todos</p>
              <p className="text-xs text-muted-foreground">
                Todos os itens
              </p>
            </div>
          </div>
        </Card>

        {folders.map((folder) => (
          <Card
            key={folder.id}
            className={`p-4 cursor-pointer transition-all hover:shadow-md ${
              selectedFolder === folder.id ? "border-primary shadow-md" : ""
            }`}
            onClick={() => onFolderSelect(folder.id)}
          >
            <div className="flex items-start gap-3">
              <Folder className="h-8 w-8 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{folder.name}</p>
                <p className="text-xs text-muted-foreground">
                  {folder.item_count || 0} {folder.item_count === 1 ? "item" : "itens"}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-50 bg-background">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFolder(folder);
                      setFolderName(folder.name);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Renomear
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(folder);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!editingFolder} onOpenChange={(open) => !open && setEditingFolder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Pasta</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRenameFolder} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Pasta</Label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                maxLength={50}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingFolder(null)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
