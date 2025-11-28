import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Plus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { WarmingStatusBadge } from "./WarmingStatusBadge";
import { WarmingAccountDialog } from "./WarmingAccountDialog";
import { useAccountWarmingStatus } from "@/hooks/useAccountWarmingStatus";
import { supabase } from "@/integrations/supabase/client";

interface ThreadsAccount {
  id: string;
  username: string | null;
  account_id: string;
  profile_picture_url: string | null;
}

interface Campaign {
  id: string;
  title: string;
  status: string;
}

interface Post {
  id: string;
  content: string | null;
  post_type: string;
  image_urls: string[];
  folder_id: string | null;
}

interface Folder {
  id: string;
  name: string;
  type: string;
}

interface WizardProps {
  accounts: ThreadsAccount[];
  campaigns: Campaign[];
  posts: Post[];
  postFolders: Folder[];
  onSubmit: (data: WizardData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<WizardData>;
  initialStep?: number;
  onNavigateToAddContent?: (type: 'posts' | 'campaigns', currentData: WizardData, currentStep: number) => void;
}

export interface WizardData {
  title: string;
  selectedAccount: string;
  selectedCampaign: string;
  intervalMinutes: string;
  selectedPost: string;
  useIntelligentDelay: boolean;
}

export function PeriodicPostWizard({
  accounts,
  campaigns,
  posts,
  postFolders,
  onSubmit,
  onCancel,
  initialData,
  initialStep = 1,
  onNavigateToAddContent,
}: WizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWarmingDialog, setShowWarmingDialog] = useState(false);
  const [pendingAccountId, setPendingAccountId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { statuses: warmingStatuses } = useAccountWarmingStatus(accounts.map(a => a.id));

  const [title, setTitle] = useState(initialData?.title || "");
  const [selectedAccount, setSelectedAccount] = useState(initialData?.selectedAccount || "");
  const [selectedCampaign, setSelectedCampaign] = useState(initialData?.selectedCampaign || "none");
  const [intervalMinutes, setIntervalMinutes] = useState(initialData?.intervalMinutes || "60");
  const [useIntelligentDelay, setUseIntelligentDelay] = useState(initialData?.useIntelligentDelay || false);
  const [selectedPost, setSelectedPost] = useState(initialData?.selectedPost || "");

  const getCurrentWizardData = (): WizardData => ({
    title,
    selectedAccount,
    selectedCampaign,
    intervalMinutes,
    useIntelligentDelay,
    selectedPost,
  });

  const handleAccountChange = (accountId: string) => {
    const status = warmingStatuses[accountId];
    
    if (status?.status === "warming") {
      setPendingAccountId(accountId);
      setShowWarmingDialog(true);
    } else {
      setSelectedAccount(accountId);
    }
  };

  const handleStopWarming = async () => {
    try {
      const { data: account } = await supabase
        .from("threads_accounts")
        .select("active_warmup_run_id")
        .eq("id", pendingAccountId)
        .single();

      if (account?.active_warmup_run_id) {
        await supabase.functions.invoke('warmup-stop-run', {
          body: { runId: account.active_warmup_run_id }
        });
      }

      setSelectedAccount(pendingAccountId);
      setShowWarmingDialog(false);
    } catch (error) {
      console.error("Error stopping warming:", error);
    }
  };

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!title.trim()) newErrors.title = "Nome da automação é obrigatório";
      if (!selectedAccount) newErrors.account = "Selecione uma conta";
      if (!intervalMinutes || parseInt(intervalMinutes) < 1) newErrors.interval = "Intervalo inválido";
    }

    if (currentStep === 2) {
      if (!selectedPost) newErrors.post = "Selecione um post";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(getCurrentWizardData());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h2 className="text-2xl font-bold">Nova Automação</h2>
            <p className="text-sm text-muted-foreground">
              Passo {currentStep} de 2
            </p>
          </div>
          <Badge variant="secondary">
            {currentStep === 1 ? "Configurações" : "Selecionar Post"}
          </Badge>
        </div>

        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Nome da Automação</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Posts motivacionais"
                className={cn(errors.title && "border-destructive")}
              />
              {errors.title && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.title}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">Conta do Threads</Label>
              <Select value={selectedAccount} onValueChange={handleAccountChange}>
                <SelectTrigger className={cn(errors.account && "border-destructive")}>
                  <SelectValue placeholder="Selecione uma conta">
                    {selectedAccount && accounts.find(a => a.id === selectedAccount) && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage 
                            src={accounts.find(a => a.id === selectedAccount)?.profile_picture_url || undefined} 
                          />
                          <AvatarFallback className="text-xs">
                            {accounts.find(a => a.id === selectedAccount)?.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{accounts.find(a => a.id === selectedAccount)?.username}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={account.profile_picture_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {account.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {account.username || account.account_id}
                        <WarmingStatusBadge 
                          status={warmingStatuses[account.id]?.status || "not_warmed"} 
                          showIcon={false}
                          className="ml-auto"
                        />
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.account && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.account}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interval">Intervalo (minutos)</Label>
                <Input
                  id="interval"
                  type="number"
                  min="1"
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(e.target.value)}
                  className={cn(errors.interval && "border-destructive")}
                />
                {errors.interval && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.interval}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign">Campanha (Opcional)</Label>
                <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <Label htmlFor="delay" className="cursor-pointer">Delay Inteligente</Label>
              <Switch
                id="delay"
                checked={useIntelligentDelay}
                onCheckedChange={setUseIntelligentDelay}
              />
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <Label>Selecione o Post</Label>
            {posts.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground mb-4">Nenhum post disponível</p>
                <Button onClick={() => onNavigateToAddContent?.('posts', getCurrentWizardData(), currentStep)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Post
                </Button>
              </div>
            ) : (
              <>
                <Select value={selectedPost} onValueChange={setSelectedPost}>
                  <SelectTrigger className={cn(errors.post && "border-destructive")}>
                    <SelectValue placeholder="Escolha um post" />
                  </SelectTrigger>
                  <SelectContent>
                    {posts.map((post) => (
                      <SelectItem key={post.id} value={post.id}>
                        <div className="flex items-center gap-2">
                          {post.post_type === 'TEXT' ? '📝' : post.post_type === 'IMAGE' ? '🖼️' : '🎠'}
                          <span className="truncate max-w-[300px]">
                            {post.content?.slice(0, 60) || 'Post sem texto'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.post && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.post}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={currentStep === 1 ? onCancel : handleBack}>
            {currentStep === 1 ? "Cancelar" : "Voltar"}
          </Button>
          
          {currentStep === 1 ? (
            <Button onClick={handleNext}>
              Próximo
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Criar Automação
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <WarmingAccountDialog
        open={showWarmingDialog}
        onOpenChange={setShowWarmingDialog}
        daysRemaining={warmingStatuses[pendingAccountId]?.daysRemaining || 0}
        onConfirm={handleStopWarming}
        onCancel={() => setShowWarmingDialog(false)}
      />
    </>
  );
}
