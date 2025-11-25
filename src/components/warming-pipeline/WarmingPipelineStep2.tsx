import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react";
import { DayConfig } from "../WarmingPipelineWizard";
import { WarmingPipelineDayCard } from "./WarmingPipelineDayCard";

interface WarmingPipelineStep2Props {
  data: { totalDays: number; days: DayConfig[] };
  onNext: (days: DayConfig[]) => void;
  onBack: () => void;
}

export const WarmingPipelineStep2 = ({ data, onNext, onBack }: WarmingPipelineStep2Props) => {
  const [days, setDays] = useState<DayConfig[]>([]);

  useEffect(() => {
    if (data.days.length > 0) {
      setDays(data.days);
    } else {
      const initialDays: DayConfig[] = Array.from({ length: data.totalDays }, (_, i) => ({
        dayNumber: i + 1,
        postsCount: 0,
        posts: [],
      }));
      setDays(initialDays);
    }
  }, [data.totalDays, data.days]);

  const handleDayUpdate = (dayNumber: number, updatedDay: DayConfig) => {
    setDays(days.map(day => day.dayNumber === dayNumber ? updatedDay : day));
  };

  const handleNext = () => {
    onNext(days);
  };

  return (
    <div className="space-y-6 py-4 animate-fade-in">
      <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border border-border/50">
        <div className="p-2 rounded-lg bg-primary/10">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold mb-1">Configuração por Dia</h3>
          <p className="text-sm text-muted-foreground">
            Configure quantos posts e em que horários cada dia terá
          </p>
        </div>
      </div>

      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
        {days.map((day) => (
          <WarmingPipelineDayCard
            key={day.dayNumber}
            day={day}
            onUpdate={handleDayUpdate}
          />
        ))}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button onClick={onBack} variant="outline" size="lg" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={handleNext} size="lg" className="gap-2">
          Próximo
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
