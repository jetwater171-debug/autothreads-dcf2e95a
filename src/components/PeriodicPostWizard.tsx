import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Settings, 
  FileText, 
  Sparkles,
  Clock,
  Target,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  Plus,
  FolderOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WarmingStatusBadge } from "./WarmingStatusBadge";
import { WarmingAccountDialog } from "./WarmingAccountDialog";
import { useAccountWarmingStatus } from "@/hooks/useAccountWarmingStatus";
import { supabase } from "@/integrations/supabase/client";
import { ThreadsPostPreview } from "./ThreadsPostPreview";

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

const STEPS = [
  {
    id: 1,
    title: "Configurações Básicas",
    description: "Defina nome, conta e intervalo de postagem",
    icon: Settings,
  },
  {
    id: 2,
    title: "Selecionar Conteúdo",
    description: "Escolha o post que será publicado",
    icon: FileText,
  },
  {
    id: 3,
    title: "Revisão Final",
    description: "Confira tudo antes de criar a automação",
    icon: CheckCircle2,
  },
];

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showWarmingDialog, setShowWarmingDialog] = useState(false);
  const [pendingAccountId, setPendingAccountId] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const { statuses: warmingStatuses } = useAccountWarmingStatus(accounts.map(a => a.id));

  const [title, setTitle] = useState(initialData?.title || "");
  const [selectedAccount, setSelectedAccount] = useState(initialData?.selectedAccount || "");
  const [selectedCampaign, setSelectedCampaign] = useState(initialData?.selectedCampaign || "none");
  const [intervalMinutes, setIntervalMinutes] = useState(initialData?.intervalMinutes || "60");
  const [useIntelligentDelay, setUseIntelligentDelay] = useState(initialData?.useIntelligentDelay || false);
  const [selectedPost, setSelectedPost] = useState(initialData?.selectedPost || "");

  const filteredPosts = selectedFolder === null 
    ? posts 
    : posts.filter(p => p.folder_id === selectedFolder);

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

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!title.trim()) newErrors.title = "Nome da automação é obrigatório";
      if (!selectedAccount) newErrors.account = "Selecione uma conta";
      if (!intervalMinutes || parseInt(intervalMinutes) < 1) newErrors.interval = "Intervalo deve ser maior que 0";
    }

    if (step === 2) {
      if (!selectedPost) newErrors.post = "Selecione um post";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;

    setIsSubmitting(true);
    try {
      await onSubmit(getCurrentWizardData());
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPostData = posts.find(p => p.id === selectedPost);
  const selectedAccountData = accounts.find(a => a.id === selectedAccount);

  return (
    <TooltipProvider>
      <div className="w-full max-w-5xl mx-auto">
        {/* Header com Progress */}
        <div className="mb-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Nova Automação
              </h2>
              <p className="text-sm text-muted-foreground">
                Passo {currentStep} de {STEPS.length}
              </p>
            </div>
            <Badge variant="secondary" className="h-8 px-4 text-sm font-medium">
              {STEPS[currentStep - 1].title}
            </Badge>
          </div>

          <div className="space-y-3">
            {/* Linha de progresso conectando os steps */}
            <div className="relative">
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-border -z-10">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                />
              </div>
              <div className="flex justify-between relative">
                {STEPS.map((step) => {
                  const StepIcon = step.icon;
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  
                  return (
                    <motion.div
                      key={step.id}
                      className="flex flex-col items-center gap-2 flex-1"
                      initial={false}
                      animate={{
                        scale: isActive ? 1.05 : 1,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all bg-background relative z-10",
                          isCompleted && "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20",
                          isActive && "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30",
                          !isActive && !isCompleted && "border-border bg-background text-muted-foreground"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <StepIcon className="h-5 w-5" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-xs text-center hidden sm:block transition-all",
                          isActive && "text-primary font-semibold",
                          isCompleted && "text-foreground font-medium",
                          !isActive && !isCompleted && "text-muted-foreground"
                        )}
                      >
                        {step.title}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="min-h-[400px]"
          >
            {/* Step 1: Configurações Básicas */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center space-y-2 pb-6">
                  <Settings className="h-12 w-12 mx-auto text-primary" />
                  <h3 className="text-2xl font-bold">{STEPS[0].title}</h3>
                  <p className="text-muted-foreground">{STEPS[0].description}</p>
                </div>

                <Card className="border-2">
                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="title" className="text-base font-semibold flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Nome da Automação
                      </Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Posts motivacionais da manhã"
                        className={cn("h-12 text-base", errors.title && "border-destructive")}
                      />
                      {errors.title && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.title}
                        </p>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="account" className="text-base font-semibold">
                          Conta do Threads
                        </Label>
                        <Select value={selectedAccount} onValueChange={handleAccountChange}>
                          <SelectTrigger className={cn("h-12", errors.account && "border-destructive")}>
                            <SelectValue placeholder="Selecione uma conta">
                              {selectedAccount && selectedAccountData && (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={selectedAccountData.profile_picture_url || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {selectedAccountData.username?.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{selectedAccountData.username}</span>
                                  <WarmingStatusBadge 
                                    status={warmingStatuses[selectedAccount]?.status || "not_warmed"} 
                                    showIcon={false}
                                    className="ml-auto"
                                  />
                                </div>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                <div className="flex items-center gap-2 justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage src={account.profile_picture_url || undefined} />
                                      <AvatarFallback className="text-xs">
                                        {account.username?.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    {account.username || account.account_id}
                                  </div>
                                  <WarmingStatusBadge 
                                    status={warmingStatuses[account.id]?.status || "not_warmed"} 
                                    showIcon={false}
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

                      <div className="space-y-3">
                        <Label htmlFor="campaign" className="text-base font-semibold flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" />
                          Campanha
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">Associe esta automação a uma campanha para melhor organização e rastreamento</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Nenhuma campanha" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhuma campanha</SelectItem>
                            {campaigns.map((campaign) => (
                              <SelectItem key={campaign.id} value={campaign.id}>
                                {campaign.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="interval" className="text-base font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        Intervalo entre posts
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Define quanto tempo (em minutos) o sistema aguardará entre cada postagem automática</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input
                          id="interval"
                          type="number"
                          min="1"
                          value={intervalMinutes}
                          onChange={(e) => setIntervalMinutes(e.target.value)}
                          className={cn("h-12 text-base", errors.interval && "border-destructive")}
                        />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">minutos</span>
                      </div>
                      {errors.interval && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.interval}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <div>
                          <Label htmlFor="delay" className="text-base font-semibold cursor-pointer">
                            Delay Inteligente
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                                <Info className="h-3 w-3" />
                                Adiciona variação aleatória no horário
                              </p>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">Adiciona uma variação aleatória de tempo (±5 minutos) para tornar os posts mais naturais e menos detectáveis como automação</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      <Switch
                        id="delay"
                        checked={useIntelligentDelay}
                        onCheckedChange={setUseIntelligentDelay}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 2: Selecionar Post */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center space-y-2 pb-6">
                  <FileText className="h-12 w-12 mx-auto text-primary" />
                  <h3 className="text-2xl font-bold">{STEPS[1].title}</h3>
                  <p className="text-muted-foreground">{STEPS[1].description}</p>
                </div>

                {posts.length === 0 ? (
                  <Card className="border-2 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-2">Nenhum post disponível</p>
                      <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                        Você precisa criar pelo menos um post antes de configurar uma automação
                      </p>
                      <Button onClick={() => onNavigateToAddContent?.('posts', getCurrentWizardData(), currentStep)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Criar Primeiro Post
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {/* Filtro por pasta */}
                    {postFolders.length > 0 && (
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <Select value={selectedFolder || "all"} onValueChange={(v) => setSelectedFolder(v === "all" ? null : v)}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Todas as pastas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas as pastas</SelectItem>
                            {postFolders.map((folder) => (
                              <SelectItem key={folder.id} value={folder.id}>
                                {folder.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Grid de posts */}
                    <div className="grid gap-4 max-h-[500px] overflow-y-auto pr-2">
                      {filteredPosts.map((post) => (
                        <Card
                          key={post.id}
                          className={cn(
                            "cursor-pointer transition-all hover:border-primary/50",
                            selectedPost === post.id && "border-primary border-2 shadow-lg shadow-primary/20"
                          )}
                          onClick={() => setSelectedPost(post.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">
                                    {post.post_type === 'TEXT' ? '📝 Texto' : 
                                     post.post_type === 'IMAGE' ? '🖼️ Imagem' : 
                                     '🎠 Carrossel'}
                                  </Badge>
                                  {selectedPost === post.id && (
                                    <Badge className="bg-primary">
                                      <Check className="h-3 w-3 mr-1" />
                                      Selecionado
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm line-clamp-3">
                                  {post.content || <span className="text-muted-foreground italic">Post sem texto</span>}
                                </p>
                                {post.image_urls && post.image_urls.length > 0 && (
                                  <div className="flex gap-2 flex-wrap">
                                    {post.image_urls.slice(0, 3).map((url, i) => (
                                      <img
                                        key={i}
                                        src={url}
                                        alt=""
                                        className="h-16 w-16 object-cover rounded border"
                                      />
                                    ))}
                                    {post.image_urls.length > 3 && (
                                      <div className="h-16 w-16 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                        +{post.image_urls.length - 3}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    {errors.post && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.post}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Revisão */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center space-y-2 pb-6">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
                  <h3 className="text-2xl font-bold">{STEPS[2].title}</h3>
                  <p className="text-muted-foreground">{STEPS[2].description}</p>
                </div>

                <Card className="border-2">
                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between py-3 border-b">
                        <span className="text-muted-foreground">Nome da Automação</span>
                        <span className="font-semibold">{title}</span>
                      </div>
                      <div className="flex justify-between py-3 border-b">
                        <span className="text-muted-foreground">Conta</span>
                        <div className="flex items-center gap-2">
                          {selectedAccountData && (
                            <>
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={selectedAccountData.profile_picture_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {selectedAccountData.username?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-semibold">{selectedAccountData.username}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between py-3 border-b">
                        <span className="text-muted-foreground">Intervalo</span>
                        <span className="font-semibold">A cada {intervalMinutes} minutos</span>
                      </div>
                      <div className="flex justify-between py-3 border-b">
                        <span className="text-muted-foreground">Campanha</span>
                        <span className="font-semibold">
                          {selectedCampaign === "none" 
                            ? "Nenhuma" 
                            : campaigns.find(c => c.id === selectedCampaign)?.title}
                        </span>
                      </div>
                      <div className="flex justify-between py-3 border-b">
                        <span className="text-muted-foreground">Delay Inteligente</span>
                        <Badge variant={useIntelligentDelay ? "default" : "secondary"}>
                          {useIntelligentDelay ? "Ativado" : "Desativado"}
                        </Badge>
                      </div>
                    </div>

                    {selectedPostData && (
                      <div className="space-y-3">
                        <Label className="text-base font-semibold">Preview do Post</Label>
                        <div className="max-w-md mx-auto">
                          <ThreadsPostPreview
                            username={selectedAccountData?.username || "username"}
                            profilePicture={selectedAccountData?.profile_picture_url || undefined}
                            content={selectedPostData.content || ""}
                            images={selectedPostData.image_urls}
                            timestamp={new Date().toISOString()}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? onCancel : handleBack}
            className="h-11 px-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {currentStep === 1 ? "Cancelar" : "Voltar"}
          </Button>

          {currentStep < 3 ? (
            <Button onClick={handleNext} className="h-11 px-6">
              Próximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting} className="h-11 px-6">
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
    </TooltipProvider>
  );
}
