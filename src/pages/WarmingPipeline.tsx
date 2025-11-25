import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Flame } from "lucide-react";
import { WarmingPipelineWizard } from "@/components/WarmingPipelineWizard";
import { WarmingPipelineList } from "@/components/WarmingPipelineList";

const WarmingPipeline = () => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Esteira de Aquecimento
              </h1>
            </div>
            <p className="text-muted-foreground">
              Configure esteiras automáticas para aquecer suas contas de forma segura
            </p>
          </div>
          <Button
            onClick={() => setIsWizardOpen(true)}
            size="lg"
            className="gap-2 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Plus className="h-4 w-4" />
            Criar nova esteira
          </Button>
        </div>

        {/* Lista de esteiras */}
        <WarmingPipelineList />

        {/* Wizard */}
        <WarmingPipelineWizard
          open={isWizardOpen}
          onOpenChange={setIsWizardOpen}
        />
      </div>
    </Layout>
  );
};

export default WarmingPipeline;
