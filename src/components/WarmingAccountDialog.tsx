import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface WarmingAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  daysRemaining?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function WarmingAccountDialog({
  open,
  onOpenChange,
  daysRemaining,
  onConfirm,
  onCancel,
}: WarmingAccountDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <AlertDialogTitle>Conta em aquecimento</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            Esta conta está em esteira de aquecimento.
            {daysRemaining && (
              <>
                {" "}
                <strong>Faltam {daysRemaining} dia{daysRemaining > 1 ? "s" : ""} para finalizar.</strong>
              </>
            )}
            <br />
            <br />
            Se você continuar, a esteira será interrompida e a conta ficará disponível para uso imediato.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-orange-600 hover:bg-orange-700">
            Parar esteira e usar conta
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
