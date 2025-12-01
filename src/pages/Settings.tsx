import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertTriangle, ExternalLink, Eye, EyeOff, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [threadsAppId, setThreadsAppId] = useState("");
  const [threadsAppSecret, setThreadsAppSecret] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const redirectUri = "https://autothreads.lovable.app/auth/callback";

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await loadSettings();
    };

    checkAuth();
  }, [navigate]);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setThreadsAppId(data.threads_app_id || "");
        setThreadsAppSecret(data.threads_app_secret || "");
        setIsConfigured(data.is_meta_configured || false);
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar configurações",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const settingsData = {
        user_id: user.id,
        threads_app_id: threadsAppId,
        threads_app_secret: threadsAppSecret,
        is_meta_configured: !!(threadsAppId && threadsAppSecret),
      };

      const { error } = await supabase
        .from("user_settings")
        .upsert(settingsData, { onConflict: "user_id" });

      if (error) throw error;

      setIsConfigured(!!(threadsAppId && threadsAppSecret));

      toast({
        title: "Configurações salvas!",
        description: "Suas credenciais do Meta foram atualizadas com sucesso.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, type: 'id' | 'secret') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Configure suas credenciais do Meta Developers
          </p>
        </div>

        <Card className={cn(
          "border-2 transition-all duration-300",
          isConfigured ? "border-success/50 shadow-lg shadow-success/10" : "border-yellow-500/50 shadow-lg shadow-yellow-500/10"
        )}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">App do Meta Developers</CardTitle>
                <CardDescription>
                  Configure suas credenciais para conectar contas do Threads
                </CardDescription>
              </div>
              {isConfigured ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-success/10 rounded-lg border border-success/30">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="text-sm font-medium text-success">Configurado</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-500">Não configurado</span>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert className="border-primary/30 bg-primary/5">
              <AlertDescription className="text-sm">
                <strong>Importante:</strong> Cada usuário deve criar seu próprio app no Meta Developers para evitar limites de taxa compartilhados e possíveis banimentos.
              </AlertDescription>
            </Alert>

            <Accordion type="single" collapsible className="border rounded-lg">
              <AccordionItem value="tutorial" className="border-none">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">📚 Como criar seu App no Meta Developers</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4 text-sm">
                    <div className="space-y-2">
                      <p className="font-semibold flex items-center gap-2">
                        1. Acesse o Meta for Developers
                        <a
                          href="https://developers.facebook.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                      <p className="text-muted-foreground">
                        Faça login com sua conta do Facebook/Meta
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="font-semibold">2. Criar novo App</p>
                      <p className="text-muted-foreground">
                        Clique em "Criar App" → Selecione tipo "Business" → Dê um nome ao seu app
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="font-semibold">3. Adicionar produto Threads API</p>
                      <p className="text-muted-foreground">
                        Na página do app, procure por "Threads API" e clique em "Configurar"
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="font-semibold">4. Copiar credenciais</p>
                      <p className="text-muted-foreground">
                        Em "Configurações" → "Básico", copie o <strong>App ID</strong> e o <strong>App Secret</strong>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="font-semibold">5. Configurar Redirect URI</p>
                      <p className="text-muted-foreground">
                        Em "Threads API" → "Configurações", adicione a seguinte URL em "Redirect URIs":
                      </p>
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg font-mono text-xs">
                        <code className="flex-1">{redirectUri}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(redirectUri);
                            toast({ title: "Copiado!", description: "Redirect URI copiada para a área de transferência" });
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="font-semibold">6. Ativar o App</p>
                      <p className="text-muted-foreground">
                        No topo da página, mude o status do app de "Desenvolvimento" para <strong>"Live"</strong> (Ao vivo)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="font-semibold">7. Configurar escopos (scopes)</p>
                      <p className="text-muted-foreground">
                        Certifique-se de que todos os escopos necessários estão habilitados:
                      </p>
                      <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
                        <li>threads_basic</li>
                        <li>threads_content_publish</li>
                        <li>threads_read_replies</li>
                        <li>threads_manage_replies</li>
                        <li>threads_manage_insights</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="app-id" className="text-base font-semibold">
                  App ID *
                </Label>
                <div className="relative">
                  <Input
                    id="app-id"
                    value={threadsAppId}
                    onChange={(e) => setThreadsAppId(e.target.value)}
                    placeholder="Ex: 123456789012345"
                    required
                    className="h-12 pr-10"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1 h-10 w-10"
                    onClick={() => copyToClipboard(threadsAppId, 'id')}
                    disabled={!threadsAppId}
                  >
                    {copiedId ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="app-secret" className="text-base font-semibold">
                  App Secret *
                </Label>
                <div className="relative">
                  <Input
                    id="app-secret"
                    type={showSecret ? "text" : "password"}
                    value={threadsAppSecret}
                    onChange={(e) => setThreadsAppSecret(e.target.value)}
                    placeholder="Seu App Secret"
                    required
                    className="h-12 pr-20"
                  />
                  <div className="absolute right-1 top-1 flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10"
                      onClick={() => copyToClipboard(threadsAppSecret, 'secret')}
                      disabled={!threadsAppSecret}
                    >
                      {copiedSecret ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <Alert className="border-muted">
                <AlertDescription className="text-sm">
                  <strong>Redirect URI (fixa para todos):</strong>
                  <div className="mt-2 p-2 bg-muted/30 rounded font-mono text-xs break-all">
                    {redirectUri}
                  </div>
                </AlertDescription>
              </Alert>

              <Button type="submit" size="lg" className="w-full" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Configurações
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;
