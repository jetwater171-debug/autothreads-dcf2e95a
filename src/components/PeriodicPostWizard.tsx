import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
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
  Image as ImageIcon, 
  LayoutGrid,
  Sparkles,
  Clock,
  Target,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info
} from "lucide-react";
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

const STEPS = [
  {
    id: 1,
    title: "Configurações Básicas",
    description: "Defina nome, conta e intervalo de postagem",
    icon: Settings,
  },
  {
    id: 2,
    title: "Tipo de Conteúdo",
    description: "Escolha o formato ideal para seus posts",
    icon: Sparkles,
  },
  {
    id: 3,
    title: "Configuração do Conteúdo",
    description: "Personalize texto e imagens do seu post",
    icon: Target,
  },
  {
    id: 4,
    title: "Revisão Final",
    description: "Confira tudo antes de criar a automação",
    icon: CheckCircle2,
  },
];

export function PeriodicPostWizard({
  accounts,
  campaigns,
  phrases,
  images,
  phraseFolders,
  imageFolders,
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

  const { statuses: warmingStatuses } = useAccountWarmingStatus(accounts.map(a => a.id));

  // Form state
  const [title, setTitle] = useState(initialData?.title || "");
  const [selectedAccount, setSelectedAccount] = useState(initialData?.selectedAccount || "");
  const [selectedCampaign, setSelectedCampaign] = useState(initialData?.selectedCampaign || "none");
  const [intervalMinutes, setIntervalMinutes] = useState(initialData?.intervalMinutes || "10");
  const [useIntelligentDelay, setUseIntelligentDelay] = useState(initialData?.useIntelligentDelay || false);
  
  const [postType, setPostType] = useState<'text' | 'image' | 'carousel'>(initialData?.postType || 'text');
  
  const [useText, setUseText] = useState(initialData?.useText !== undefined ? initialData.useText : true);
  const [useRandomPhrase, setUseRandomPhrase] = useState(initialData?.useRandomPhrase !== undefined ? initialData.useRandomPhrase : true);
  const [selectedPhrase, setSelectedPhrase] = useState(initialData?.selectedPhrase || "");
  const [selectedRandomPhraseFolder, setSelectedRandomPhraseFolder] = useState<string | null>(initialData?.selectedRandomPhraseFolder || null);
  const [selectedPhraseFolder, setSelectedPhraseFolder] = useState<string | null>(null);
  
  const [useRandomImage, setUseRandomImage] = useState(initialData?.useRandomImage || false);
  const [selectedImage, setSelectedImage] = useState(initialData?.selectedImage || "");
  const [selectedImageFolder, setSelectedImageFolder] = useState<string | null>(null);
  const [carouselImages, setCarouselImages] = useState<string[]>(initialData?.carouselImages || []);

  const filteredPhrases = selectedPhraseFolder === null 
    ? phrases 
    : phrases.filter(p => p.folder_id === selectedPhraseFolder);

  const filteredImages = selectedImageFolder === null 
    ? images 
    : images.filter(img => img.folder_id === selectedImageFolder);

  const getCurrentWizardData = (): WizardData => ({
    title,
    selectedAccount,
    selectedCampaign,
    intervalMinutes,
    postType,
    useText,
    useRandomPhrase,
    selectedPhrase,
    selectedRandomPhraseFolder,
    useRandomImage,
    selectedImage,
    carouselImages,
    useIntelligentDelay,
  });

  const handleNavigateToAdd = (type: 'phrases' | 'images' | 'campaigns') => {
    if (onNavigateToAddContent) {
      onNavigateToAddContent(type, getCurrentWizardData(), currentStep);
    }
  };

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
      // Get the active run for this account
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

  const toggleCarouselImage = (imageId: string) => {
    setCarouselImages(prev => {
      if (prev.includes(imageId)) {
        return prev.filter(id => id !== imageId);
      } else {
        if (prev.length >= 10) {
          setErrors({ carousel: "Máximo de 10 imagens permitidas" });
          return prev;
        }
        setErrors({});
        return [...prev, imageId];
      }
    });
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!title.trim()) newErrors.title = "Nome da automação é obrigatório";
      if (!selectedAccount) newErrors.account = "Selecione uma conta";
      if (!intervalMinutes || parseInt(intervalMinutes) < 1) newErrors.interval = "Intervalo deve ser maior que 0";
    }

    if (step === 3) {
      if (postType === 'text' && !useRandomPhrase && !selectedPhrase) {
        newErrors.phrase = "Selecione uma frase específica";
      }
      if (postType === 'image' && !useRandomImage && !selectedImage) {
        newErrors.image = "Selecione uma imagem";
      }
      if (postType === 'carousel' && carouselImages.length < 2) {
        newErrors.carousel = "Selecione pelo menos 2 imagens";
      }
      if (postType === 'carousel' && carouselImages.length > 10) {
        newErrors.carousel = "Máximo de 10 imagens";
      }
      if ((postType === 'image' || postType === 'carousel') && useText && !useRandomPhrase && !selectedPhrase) {
        newErrors.phrase = "Selecione uma frase ou ative frase aleatória";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        selectedAccount,
        selectedCampaign,
        intervalMinutes,
        postType,
        useText,
        useRandomPhrase,
        selectedPhrase,
        selectedRandomPhraseFolder,
        useRandomImage,
        selectedImage,
        carouselImages,
        useIntelligentDelay,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercentage = (currentStep / 4) * 100;

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
              {STEPS.map((step, index) => {
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
          initial={{ opacity: 0, x: "8%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: "-8%" }}
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
                          {selectedAccount && accounts.find(a => a.id === selectedAccount) && (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage 
                                  src={accounts.find(a => a.id === selectedAccount)?.profile_picture_url || undefined} 
                                />
                                <AvatarFallback className="text-xs">
                                  {accounts.find(a => a.id === selectedAccount)?.username?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span>{accounts.find(a => a.id === selectedAccount)?.username}</span>
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
                      Campanha <span className="text-muted-foreground font-normal">(opcional)</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Permite agrupar múltiplas automações sob uma mesma estratégia.</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    {campaigns.length === 0 ? (
                      <Card className="border-2 border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 space-y-2">
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                Nenhuma campanha criada ainda. Crie uma para organizar suas automações.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleNavigateToAdd('campaigns')}
                                className="border-blue-600 text-blue-700 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-300"
                              >
                                Criar Campanha
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Sem campanha" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem campanha</SelectItem>
                          {campaigns.map((campaign) => (
                            <SelectItem key={campaign.id} value={campaign.id}>
                              {campaign.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="interval" className="text-base font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Intervalo entre Posts
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Tempo em minutos entre cada postagem automática.</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      id="interval"
                      type="number"
                      min="1"
                      value={intervalMinutes}
                      onChange={(e) => setIntervalMinutes(e.target.value)}
                      className={cn("h-12 flex-1", errors.interval && "border-destructive")}
                    />
                    <div className="flex items-center justify-center px-6 rounded-lg border bg-muted text-sm font-medium">
                      minutos
                    </div>
                  </div>
                  {errors.interval && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.interval}
                    </p>
                  )}
                </div>

                <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="delay" className="text-base font-semibold cursor-pointer flex items-center gap-2">
                          Delay Inteligente
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Adiciona variação aleatória no horário de postagem para simular comportamento humano.</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Varia automaticamente o horário para parecer mais natural
                        </p>
                      </div>
                      <Switch
                        id="delay"
                        checked={useIntelligentDelay}
                        onCheckedChange={setUseIntelligentDelay}
                      />
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        )}

          {/* Step 2: Tipo de Conteúdo */}
          {currentStep === 2 && (
            <div className="space-y-6">
            <div className="text-center space-y-2 pb-6">
              <Sparkles className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-2xl font-bold">{STEPS[1].title}</h3>
              <p className="text-muted-foreground">{STEPS[1].description}</p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
              <Card
                className={cn(
                  "cursor-pointer transition-all duration-300 hover:scale-105 border-2",
                  postType === 'text' 
                    ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/20" 
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => setPostType('text')}
              >
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className={cn(
                      "h-20 w-20 rounded-2xl flex items-center justify-center text-4xl transition-transform",
                      postType === 'text' ? "bg-primary/20 scale-110" : "bg-muted"
                    )}>
                      📝
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-lg">Texto</h4>
                    <p className="text-sm text-muted-foreground">
                      Posts apenas com texto
                    </p>
                  </div>
                  {postType === 'text' && (
                    <div className="flex justify-center">
                      <Badge className="bg-primary">
                        <Check className="h-3 w-3 mr-1" />
                        Selecionado
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card
                className={cn(
                  "cursor-pointer transition-all duration-300 hover:scale-105 border-2",
                  postType === 'image' 
                    ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/20" 
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => setPostType('image')}
              >
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className={cn(
                      "h-20 w-20 rounded-2xl flex items-center justify-center text-4xl transition-transform",
                      postType === 'image' ? "bg-primary/20 scale-110" : "bg-muted"
                    )}>
                      🖼️
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-lg">Imagem</h4>
                    <p className="text-sm text-muted-foreground">
                      Uma foto com texto opcional
                    </p>
                  </div>
                  {postType === 'image' && (
                    <div className="flex justify-center">
                      <Badge className="bg-primary">
                        <Check className="h-3 w-3 mr-1" />
                        Selecionado
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card
                className={cn(
                  "cursor-pointer transition-all duration-300 hover:scale-105 border-2",
                  postType === 'carousel' 
                    ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/20" 
                    : "border-border hover:border-primary/50"
                )}
                onClick={() => setPostType('carousel')}
              >
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className={cn(
                      "h-20 w-20 rounded-2xl flex items-center justify-center text-4xl transition-transform",
                      postType === 'carousel' ? "bg-primary/20 scale-110" : "bg-muted"
                    )}>
                      🎠
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-lg">Carrossel</h4>
                    <p className="text-sm text-muted-foreground">
                      Múltiplas fotos (2-10)
                    </p>
                  </div>
                  {postType === 'carousel' && (
                    <div className="flex justify-center">
                      <Badge className="bg-primary">
                        <Check className="h-3 w-3 mr-1" />
                        Selecionado
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-2 bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold">
                      {postType === 'text' && "Posts de Texto"}
                      {postType === 'image' && "Posts com Imagem"}
                      {postType === 'carousel' && "Posts com Carrossel"}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {postType === 'text' && "Ideal para frases motivacionais, citações e mensagens rápidas."}
                      {postType === 'image' && "Perfeito para compartilhar fotos com legendas e alcançar mais engajamento visual."}
                      {postType === 'carousel' && "Ótimo para contar histórias, tutoriais passo a passo ou mostrar múltiplas perspectivas."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

          {/* Step 3: Configuração do Conteúdo */}
          {currentStep === 3 && (
            <div className="space-y-6">
            <div className="text-center space-y-2 pb-6">
              <Target className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-2xl font-bold">{STEPS[2].title}</h3>
              <p className="text-muted-foreground">{STEPS[2].description}</p>
            </div>

            <Card className="border-2">
              <CardContent className="pt-6 space-y-6">
                {/* Aviso se não houver frases */}
                {phrases.length === 0 && (postType === 'text' || (postType === 'image' || postType === 'carousel')) && (
                  <Card className="border-2 border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <h4 className="font-semibold text-orange-900 dark:text-orange-100">
                              Nenhuma frase cadastrada
                            </h4>
                            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                              Você precisa cadastrar pelo menos uma frase para criar posts de texto.
                            </p>
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleNavigateToAdd('phrases')}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            Adicionar Agora
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Aviso se não houver imagens */}
                {images.length === 0 && (postType === 'image' || postType === 'carousel') && (
                  <Card className="border-2 border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <h4 className="font-semibold text-orange-900 dark:text-orange-100">
                              Nenhuma imagem cadastrada
                            </h4>
                            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                              Você precisa fazer upload de pelo menos uma imagem para criar posts visuais.
                            </p>
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleNavigateToAdd('images')}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            Adicionar Agora
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Texto para tipos image e carousel */}
                {phrases.length > 0 && (postType === 'image' || postType === 'carousel') && (
                  <Card className="bg-gradient-to-r from-muted/80 to-muted/40 border-border/50">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="useText" className="text-base font-semibold cursor-pointer">
                            Adicionar Texto (Legenda)
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Texto opcional que acompanha a imagem
                          </p>
                        </div>
                        <Switch
                          id="useText"
                          checked={useText}
                          onCheckedChange={setUseText}
                        />
                      </div>

                      {useText && (
                        <div className="space-y-4 pt-4 border-t animate-in fade-in-50">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-background/60 border">
                            <Label htmlFor="randomPhrase" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                              Frase Aleatória
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">O sistema escolhe automaticamente uma frase da pasta selecionada.</p>
                                </TooltipContent>
                              </Tooltip>
                            </Label>
                            <Switch
                              id="randomPhrase"
                              checked={useRandomPhrase}
                              onCheckedChange={setUseRandomPhrase}
                            />
                          </div>

                          {useRandomPhrase ? (
                            <div className="space-y-3">
                              <Label className="text-sm font-medium">Pasta (opcional)</Label>
                              <Select 
                                value={selectedRandomPhraseFolder || "all"} 
                                onValueChange={(v) => setSelectedRandomPhraseFolder(v === "all" ? null : v)}
                              >
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder="Todas as pastas" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todas as pastas</SelectItem>
                                  {phraseFolders.map((folder) => (
                                    <SelectItem key={folder.id} value={folder.id}>
                                      📁 {folder.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <Label className="text-sm font-medium">Filtrar por Pasta</Label>
                              <Select 
                                value={selectedPhraseFolder || "all"} 
                                onValueChange={(v) => setSelectedPhraseFolder(v === "all" ? null : v)}
                              >
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder="Todas" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Todas as pastas</SelectItem>
                                  {phraseFolders.map((folder) => (
                                    <SelectItem key={folder.id} value={folder.id}>
                                      📁 {folder.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Label className="text-sm font-medium">Escolher Frase</Label>
                              <Select value={selectedPhrase} onValueChange={setSelectedPhrase}>
                                <SelectTrigger className={cn("h-10", errors.phrase && "border-destructive")}>
                                  <SelectValue placeholder="Selecione uma frase" />
                                </SelectTrigger>
                                <SelectContent>
                                  {filteredPhrases.map((phrase) => (
                                    <SelectItem key={phrase.id} value={phrase.id}>
                                      {phrase.content.substring(0, 50)}
                                      {phrase.content.length > 50 && "..."}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {errors.phrase && (
                                <p className="text-sm text-destructive flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {errors.phrase}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Texto para tipo text */}
                {postType === 'text' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/60 border">
                      <Label htmlFor="randomPhraseText" className="text-base font-semibold cursor-pointer flex items-center gap-2">
                        Frase Aleatória
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">O sistema escolhe automaticamente uma frase da pasta selecionada.</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Switch
                        id="randomPhraseText"
                        checked={useRandomPhrase}
                        onCheckedChange={setUseRandomPhrase}
                      />
                    </div>

                    {useRandomPhrase ? (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Escolher Pasta (opcional)</Label>
                        <Select 
                          value={selectedRandomPhraseFolder || "all"} 
                          onValueChange={(v) => setSelectedRandomPhraseFolder(v === "all" ? null : v)}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Todas as pastas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas as pastas</SelectItem>
                            {phraseFolders.map((folder) => (
                              <SelectItem key={folder.id} value={folder.id}>
                                📁 {folder.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Filtrar por Pasta</Label>
                        <Select 
                          value={selectedPhraseFolder || "all"} 
                          onValueChange={(v) => setSelectedPhraseFolder(v === "all" ? null : v)}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas as pastas</SelectItem>
                            {phraseFolders.map((folder) => (
                              <SelectItem key={folder.id} value={folder.id}>
                                📁 {folder.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Label className="text-sm font-medium">Escolher Frase Específica</Label>
                        <Select value={selectedPhrase} onValueChange={setSelectedPhrase}>
                          <SelectTrigger className={cn("h-10", errors.phrase && "border-destructive")}>
                            <SelectValue placeholder="Selecione uma frase" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredPhrases.map((phrase) => (
                              <SelectItem key={phrase.id} value={phrase.id}>
                                {phrase.content.substring(0, 50)}
                                {phrase.content.length > 50 && "..."}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.phrase && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.phrase}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Imagem única */}
                {postType === 'image' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/60 border">
                      <Label htmlFor="randomImage" className="text-base font-semibold cursor-pointer flex items-center gap-2">
                        Imagem Aleatória
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Escolhe uma imagem da pasta selecionada ou do acervo completo.</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Switch
                        id="randomImage"
                        checked={useRandomImage}
                        onCheckedChange={setUseRandomImage}
                      />
                    </div>

                    {!useRandomImage && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Filtrar por Pasta</Label>
                        <Select 
                          value={selectedImageFolder || "all"} 
                          onValueChange={(v) => setSelectedImageFolder(v === "all" ? null : v)}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas as pastas</SelectItem>
                            {imageFolders.map((folder) => (
                              <SelectItem key={folder.id} value={folder.id}>
                                📁 {folder.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Label className="text-sm font-medium">Escolher Imagem</Label>
                        <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-1">
                          {filteredImages.map((image) => (
                            <div
                              key={image.id}
                              onClick={() => setSelectedImage(image.id)}
                              className={cn(
                                "relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                                selectedImage === image.id 
                                  ? "border-primary ring-2 ring-primary/50 scale-95" 
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              <img
                                src={image.public_url}
                                alt={image.alt_text || image.file_name}
                                className="w-full h-full object-cover"
                              />
                              {selectedImage === image.id && (
                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                  <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {errors.image && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.image}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Carrossel */}
                {postType === 'carousel' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-semibold">Selecione as Imagens</Label>
                        <p className="text-sm text-muted-foreground">
                          Escolha entre 2 e 10 imagens para o carrossel
                        </p>
                      </div>
                      <Badge variant={carouselImages.length >= 2 ? "default" : "secondary"}>
                        {carouselImages.length} / 10
                      </Badge>
                    </div>

                    <Select 
                      value={selectedImageFolder || "all"} 
                      onValueChange={(v) => setSelectedImageFolder(v === "all" ? null : v)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Todas as pastas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as pastas</SelectItem>
                        {imageFolders.map((folder) => (
                          <SelectItem key={folder.id} value={folder.id}>
                            📁 {folder.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-1">
                      {filteredImages.map((image) => {
                        const isSelected = carouselImages.includes(image.id);
                        const index = carouselImages.indexOf(image.id);
                        
                        return (
                          <div
                            key={image.id}
                            onClick={() => toggleCarouselImage(image.id)}
                            className={cn(
                              "relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                              isSelected 
                                ? "border-primary ring-2 ring-primary/50" 
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <img
                              src={image.public_url}
                              alt={image.alt_text || image.file_name}
                              className="w-full h-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <div className="bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center font-bold">
                                  {index + 1}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {errors.carousel && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.carousel}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

          {/* Step 4: Revisão Final */}
          {currentStep === 4 && (
            <div className="space-y-6">
            <div className="text-center space-y-2 pb-6">
              <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
              <h3 className="text-2xl font-bold">{STEPS[3].title}</h3>
              <p className="text-muted-foreground">{STEPS[3].description}</p>
            </div>

            <Card className="border-2 bg-gradient-to-br from-background to-muted/20">
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                    <Settings className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <h4 className="font-semibold">Configurações Básicas</h4>
                      <div className="space-y-1 text-sm">
                        <p className="flex justify-between">
                          <span className="text-muted-foreground">Nome:</span>
                          <span className="font-medium">{title}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-muted-foreground">Conta:</span>
                          <span className="font-medium">
                            {accounts.find(a => a.id === selectedAccount)?.username}
                          </span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-muted-foreground">Campanha:</span>
                          <span className="font-medium">
                            {selectedCampaign === "none" 
                              ? "Sem campanha" 
                              : campaigns.find(c => c.id === selectedCampaign)?.title}
                          </span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-muted-foreground">Intervalo:</span>
                          <span className="font-medium">{intervalMinutes} minutos</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-muted-foreground">Delay Inteligente:</span>
                          <Badge variant={useIntelligentDelay ? "default" : "secondary"}>
                            {useIntelligentDelay ? "Ativado" : "Desativado"}
                          </Badge>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <h4 className="font-semibold">Tipo de Conteúdo</h4>
                      <div className="flex items-center gap-2">
                        <Badge className="text-base px-4 py-1">
                          {postType === 'text' && "📝 Texto"}
                          {postType === 'image' && "🖼️ Imagem"}
                          {postType === 'carousel' && "🎠 Carrossel"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                    <Target className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <h4 className="font-semibold">Configuração do Conteúdo</h4>
                      <div className="space-y-1 text-sm">
                        {(postType === 'text' || useText) && (
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Texto:</span>
                            <Badge variant={useRandomPhrase ? "default" : "secondary"}>
                              {useRandomPhrase ? "Aleatório" : "Específico"}
                            </Badge>
                          </p>
                        )}
                        {postType === 'image' && (
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Imagem:</span>
                            <Badge variant={useRandomImage ? "default" : "secondary"}>
                              {useRandomImage ? "Aleatória" : "Específica"}
                            </Badge>
                          </p>
                        )}
                        {postType === 'carousel' && (
                          <p className="flex justify-between">
                            <span className="text-muted-foreground">Imagens:</span>
                            <Badge>{carouselImages.length} selecionadas</Badge>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        </motion.div>
      </AnimatePresence>

      {/* Footer com Botões */}
      <div className="flex items-center justify-between pt-8 border-t mt-8">
        <Button
          type="button"
          variant="ghost"
          onClick={currentStep === 1 ? onCancel : handleBack}
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 1 ? "Cancelar" : "Voltar"}
        </Button>

        <div className="flex items-center gap-3">
          {currentStep < 4 ? (
            <Button onClick={handleNext} size="lg">
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
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
        daysRemaining={warmingStatuses[pendingAccountId]?.daysRemaining}
        onConfirm={handleStopWarming}
        onCancel={() => {
          setShowWarmingDialog(false);
          setPendingAccountId("");
        }}
      />
      </div>
    </TooltipProvider>
  );
}
