import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Settings, ArrowRight } from "lucide-react";

interface WarmingPipelineStep1Props {
  data: { name: string; totalDays: number };
  onNext: (data: { name: string; totalDays: number }) => void;
}

export const WarmingPipelineStep1 = ({ data, onNext }: WarmingPipelineStep1Props) => {
  const [name, setName] = useState(data.name);
  const [totalDays, setTotalDays] = useState(data.totalDays);

  const handleNext = () => {
    const finalName = name.trim() || `Esteira de ${totalDays} dias`;
    onNext({ name: finalName, totalDays });
  };

  return (
    <div className="space-y-6 py-4 animate-fade-in">
      <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border border-border/50">
        <div className="p-2 rounded-lg bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold mb-1">Configurações Gerais</h3>
          <p className="text-sm text-muted-foreground">
            Defina o nome e a duração da sua esteira de aquecimento
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pipeline-name">Nome da esteira (opcional)</Label>
          <Input
            id="pipeline-name"
            placeholder="Ex: Esteira de 7 dias para contas novas"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Se não preencher, será gerado automaticamente
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Duração da esteira</Label>
            <span className="text-2xl font-bold text-primary">{totalDays} dias</span>
          </div>
          <Slider
            value={[totalDays]}
            onValueChange={(value) => setTotalDays(value[0])}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 dia</span>
            <span>10 dias</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleNext} size="lg" className="gap-2">
          Próximo
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
