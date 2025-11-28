import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WarmingPipelineStep1 } from "./warming-pipeline/WarmingPipelineStep1";
import { WarmingPipelineStep2 } from "./warming-pipeline/WarmingPipelineStep2";
import { WarmingPipelineStep3 } from "./warming-pipeline/WarmingPipelineStep3";

interface WarmingPipelineWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface DayConfig {
  dayNumber: number;
  postsCount: number;
  posts: PostConfig[];
}

export interface PostConfig {
  postOrder: number;
  scheduledTime: string;
  useIntelligentDelay: boolean;
  postType?: "text" | "image" | "text_image" | "carousel";
  textMode?: "custom" | "specific" | "random" | "random_folder";
  customText?: string;
  specificPhraseId?: string;
  randomPhraseFolderId?: string;
  imageMode?: "specific" | "random" | "random_folder";
  specificImageId?: string;
  randomImageFolderId?: string;
  carouselImageIds?: string[];
  postId?: string;
}

export interface WarmingPipelineData {
  name: string;
  totalDays: number;
  days: DayConfig[];
}

export const WarmingPipelineWizard = ({ open, onOpenChange }: WarmingPipelineWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [pipelineData, setPipelineData] = useState<WarmingPipelineData>({
    name: "",
    totalDays: 1,
    days: [],
  });

  const handleStep1Complete = (data: { name: string; totalDays: number }) => {
    setPipelineData({ ...pipelineData, ...data });
    setCurrentStep(2);
  };

  const handleStep2Complete = (days: DayConfig[]) => {
    setPipelineData({ ...pipelineData, days });
    setCurrentStep(3);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setPipelineData({ name: "", totalDays: 1, days: [] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            {currentStep === 1 && "Configurações Gerais"}
            {currentStep === 2 && "Configuração dos Dias"}
            {currentStep === 3 && "Revisão Final"}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                step <= currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {currentStep === 1 && (
          <WarmingPipelineStep1
            data={pipelineData}
            onNext={handleStep1Complete}
          />
        )}

        {currentStep === 2 && (
          <WarmingPipelineStep2
            data={pipelineData}
            onNext={handleStep2Complete}
            onBack={handleBack}
          />
        )}

        {currentStep === 3 && (
          <WarmingPipelineStep3
            data={pipelineData}
            onBack={handleBack}
            onComplete={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
