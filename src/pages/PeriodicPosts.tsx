// Versão REFINADA, CLEAN e MAIS BONITA do formulário de criação de automação.
// Mantém toda lógica essencial, porém com UI simplificada, etapas mais claras,
// menos poluição visual, botões mais intuitivos e estrutura mais curta.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Clock, CheckCircle, XCircle } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const PeriodicPosts = () => {
  const [posts, setPosts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [phrases, setPhrases] = useState([]);
  const [images, setImages] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // FORM STATE (Simplificado e organizado)
  const [form, setForm] = useState({
    accountId: "",
    interval: "10",
    type: "text",
    intelligentDelay: false,
    randomPhrase: true,
    phraseId: "",
    randomImage: false,
    imageId: "",
    carousel: [],
    includeText: false,
  });

  const { toast } = useToast();
  const navigate = useNavigate();

  const updateForm = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate("/auth");
      await Promise.all([loadPosts(), loadAccounts(), loadPhrases(), loadImages()]);
    };
    init();
  }, []);

  const loadPosts = async () => {
    const { data } = await supabase
      .from("periodic_posts")
      .select("*, threads_accounts(username, account_id, profile_picture_url), phrases(content)")
      .order("created_at", { ascending: false });
    setPosts(data || []);
    setLoading(false);
  };

  const loadAccounts = async () => {
    const { data } = await supabase
      .from("threads_accounts")
      .select("id, username, account_id, profile_picture_url")
      .eq("is_active", true);
    setAccounts(data || []);
  };

  const loadPhrases = async () => {
    const { data } = await supabase.from("phrases").select("id, content");
    setPhrases(data || []);
  };

  const loadImages = async () => {
    const { data } = await supabase.from("images").select("id, file_name, public_url");
    setImages(data || []);
  };

  const toggleCarousel = (id) => {
    setForm((prev) => {
      const exists = prev.carousel.includes(id);
      if (exists) return { ...prev, carousel: prev.carousel.filter((x) => x !== id) };
      if (prev.carousel.length === 10) {
        toast({ variant: "destructive", title: "Máximo de 10 imagens" });
        return prev;
      }
      return { ...prev, carousel: [...prev.carousel, id] };
    });
  };

  const resetForm = () =>
    setForm({
      accountId: "",
      interval: "10",
      type: "text",
      intelligentDelay: false,
      randomPhrase: true,
      phraseId: "",
      randomImage: false,
      imageId: "",
      carousel: [],
      includeText: false,
    });

  const saveAutomation = async (e) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      account_id: form.accountId,
      interval_minutes: Number(form.interval),
      post_type: form.type,
      use_intelligent_delay: form.intelligentDelay,
      use_random_phrase:
        form.type === "text" || form.includeText ? form.randomPhrase : false,
      specific_phrase_id:
        !form.randomPhrase && (form.type === "text" || form.includeText)
          ? form.phraseId
          : null,
      use_random_image: form.type === "image" ? form.randomImage : false,
      specific_image_id:
        form.type === "image" && !form.randomImage ? form.imageId : null,
      carousel_image_ids: form.type === "carousel" ? form.carousel : [],
    };

    const { error } = await supabase.from("periodic_posts").insert(payload);

    if (error)
      return toast({ variant: "destructive", title: "Erro ao criar automação" });

    toast({ title: "Automação criada com sucesso!" });
    resetForm();
    setOpen(false);
    loadPosts();
  };

  return (
    <Layout>
      <div className="space-y-10">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Posts Periódicos</h1>
            <p className="text-muted-foreground">Automatize suas postagens no Threads</p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Nova Automação
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl p-6 space-y-6">
              <DialogHeader>
                <DialogTitle>Criar Automação</DialogTitle>
              </DialogHeader>

              <form onSubmit={saveAutomation} className="space-y-8">
                {/* ------------------------------ */}
                {/* SEÇÃO 1: CONTA E INTERVALO       */}
                {/* ------------------------------ */}
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-2">
                      <Label>Conta do Threads</Label>
                      <Select
                        value={form.accountId}
                        onValueChange={(v) => updateForm("accountId", v)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={acc.profile_picture_url || undefined} />
                                  <AvatarFallback>
                                    {acc.username?.[0]?.toUpperCase() || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                {acc.username || acc.account_id}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Intervalo entre posts (minutos)</Label>
                      <Input
                        value={form.interval}
                        onChange={(e) => updateForm("interval", e.target.value)}
                        type="number"
                        min="1"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <Label>Delay Inteligente</Label>
                      <Switch
                        checked={form.intelligentDelay}
                        onCheckedChange={(v) => updateForm("intelligentDelay", v)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* ------------------------------ */}
                {/* SEÇÃO 2: TIPO DE CONTEÚDO      */}
                {/* ------------------------------ */}
                <Card>
                  <CardHeader>
                    <CardTitle>Tipo de Conteúdo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: "text", icon: "📝", label: "Texto" },
                        { key: "image", icon: "🖼️", label: "Imagem" },
                        { key: "carousel", icon: "🎠", label: "Carrossel" },
                      ].map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => updateForm("type", t.key)}
                          className={`p-4 border rounded-lg text-center space-y-2 transition-all ${
                            form.type === t.key
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-muted-foreground/40"
                          }`}
                        >
                          <div className="text-2xl">{t.icon}</div>
                          <div className="text-sm font-medium">{t.label}</div>
                        </button>
                      ))}
                    </div>

                    {/* TEXTO */}
                    {form.type === "text" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                          <Label>Frase Aleatória</Label>
                          <Switch
                            checked={form.randomPhrase}
                            onCheckedChange={(v) => updateForm("randomPhrase", v)}
                          />
                        </div>

                        {!form.randomPhrase && (
                          <div className="space-y-2">
                            <Label>Selecione uma frase</Label>
                            <Select
                              value={form.phraseId}
                              onValueChange={(v) => updateForm("phraseId", v)}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Frase" />
                              </SelectTrigger>
                              <SelectContent>
                                {phrases.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.content.slice(0, 80)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}

                    {/* IMAGEM */}
                    {form.type === "image" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                          <Label>Imagem Aleatória</Label>
                          <Switch
                            checked={form.randomImage}
                            onCheckedChange={(v) => updateForm("randomImage", v)}
                          />
                        </div>

                        {!form.randomImage && (
                          <div className="space-y-2">
                            <Label>Selecione uma imagem</Label>
                            <Select
                              value={form.imageId}
                              onValueChange={(v) => updateForm("imageId", v)}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Imagem" />
                              </SelectTrigger>
                              <SelectContent>
                                {images.map((img) => (
                                  <SelectItem key={img.id} value={img.id}>
                                    <div className="flex items-center gap-2">
                                      <img src={img.public_url} className="h-8 w-8 rounded object-cover" />
                                      {img.file_name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                          <Label>Adicionar Texto</Label>
                          <Switch
                            checked={form.includeText}
                            onCheckedChange={(v) => updateForm("includeText", v)}
                          />
                        </div>

                        {form.includeText && (
                          <div className="space-y-4 border-l pl-4">
                            <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                              <Label>Frase Aleatória</Label>
                              <Switch
                                checked={form.randomPhrase}
                                onCheckedChange={(v) => updateForm("randomPhrase", v)}
                              />
                            </div>

                            {!form.randomPhrase && (
                              <div className="space-y-2">
                                <Label>Selecione uma frase</Label>
                                <Select
                                  value={form.phraseId}
                                  onValueChange={(v) => updateForm("phraseId", v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Frase" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {phrases.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.content}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* CARROSSEL */}
                    {form.type === "carousel" && (
                      <div className="space-y-4">
                        <Label>Selecione até 10 imagens</Label>

                        <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto p-2 border rounded-lg">
                          {images.map((img) => (
                            <button
                              key={img.id}
                              type="button"
                              onClick={() => toggleCarousel(img.id)}
                              className={`relative aspect-square rounded-lg border overflow-hidden transition-all ${
                                form.carousel.includes(img.id)
                                  ? "border-primary ring-2 ring-primary/40"
                                  : "border-muted"
                              }`}
                            >
                              <img src={img.public_url} className="object-cover w-full h-full" />
                              {form.carousel.includes(img.id) && (
                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                  <div className="bg-primary text-white rounded-full px-2 py-1 text-xs font-bold">
                                    {form.carousel.indexOf(img.id) + 1}
                                  </div>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                          <Label>Adicionar Texto</Label>
                          <Switch
                            checked={form.includeText}
                            onCheckedChange={(v) => updateForm("includeText", v)}
                          />
                        </div>

                        {form.includeText && (
                          <div className="border-l pl-4 space-y-4">
                            <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                              <Label>Frase Aleatória</Label>
                              <Switch
                                checked={form.randomPhrase}
                                onCheckedChange={(v) => updateForm("randomPhrase", v)}
                              />
                            </div>

                            {!form.randomPhrase && (
                              <div className="space-y-2">
                                <Label>Selecione a frase</Label>
                                <Select
                                  value={form.phraseId}
                                  onValueChange={(v) => updateForm("phraseId", v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Frase" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {phrases.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.content}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Criar Automação</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* LISTA DE AUTOMAÇÕES */}
        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-lg font-medium">
                    {post.threads_accounts.username || post.threads_accounts.account_id}
                    {post.is_active ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" /> A cada {post.interval_minutes} min
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    supabase
                      .from("periodic_posts")
                      .update({ is_active: !post.is_active })
                      .eq("id", post.id)
                      .then(loadPosts)
                  }
                >
                  {post.is_active ? "Pausar" : "Ativar"}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    supabase
                      .from("periodic_posts")
                      .delete()
                      .eq("id", post.id)
                      .then(loadPosts)
                  }
                  className="text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default PeriodicPosts;
