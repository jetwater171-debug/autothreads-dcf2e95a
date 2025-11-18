import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Users, Eye, Heart, MessageCircle, Repeat2, Loader2, RefreshCw, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ThreadsAccount {
  id: string;
  account_id: string;
  username: string | null;
  profile_picture_url: string | null;
}

interface Insight {
  followers_count: number | null;
  views: number | null;
  likes: number | null;
  replies: number | null;
  reposts: number | null;
  quotes: number | null;
  shares: number | null;
  engaged_audience: number | null;
  collected_at: string;
}

const Analytics = () => {
  const [accounts, setAccounts] = useState<ThreadsAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [latestInsight, setLatestInsight] = useState<Insight | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await loadAccounts();
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (selectedAccount) {
      loadInsights();
    }
  }, [selectedAccount]);

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("threads_accounts")
        .select("id, account_id, username, profile_picture_url")
        .eq("is_active", true);

      if (error) throw error;
      setAccounts(data || []);
      
      if (data && data.length > 0) {
        setSelectedAccount(data[0].id);
      }
    } catch (error) {
      console.error("Error loading accounts:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar contas",
        description: "Não foi possível carregar as contas disponíveis.",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async () => {
    if (!selectedAccount) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("account_insights")
        .select("*")
        .eq("account_id", selectedAccount)
        .order("collected_at", { ascending: true });

      if (error) throw error;
      setInsights(data || []);
      
      if (data && data.length > 0) {
        setLatestInsight(data[data.length - 1]);
      } else {
        setLatestInsight(null);
      }
    } catch (error) {
      console.error("Error loading insights:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshInsights = async () => {
    if (!selectedAccount) return;

    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("threads-fetch-insights", {
        body: {
          accountId: selectedAccount,
        },
      });

      if (error) throw error;

      toast({
        title: "Insights atualizados!",
        description: "Os dados mais recentes foram carregados.",
      });

      await loadInsights();
    } catch (error: any) {
      console.error("Error refreshing insights:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar insights",
        description: error.message,
      });
    } finally {
      setRefreshing(false);
    }
  };

  const formatChartData = () => {
    return insights.map((insight) => ({
      date: format(new Date(insight.collected_at), "dd/MM"),
      seguidores: insight.followers_count || 0,
      visualizacoes: insight.views || 0,
      curtidas: insight.likes || 0,
      respostas: insight.replies || 0,
      reposts: insight.reposts || 0,
      engajamento: insight.engaged_audience || 0,
    }));
  };

  const calculateGrowth = (metric: keyof Insight): { value: string | null; trend: 'up' | 'down' | 'neutral' } => {
    if (insights.length < 2) return { value: null, trend: 'neutral' };
    
    const latest = insights[insights.length - 1][metric] || 0;
    const previous = insights[insights.length - 2][metric] || 0;
    
    if (previous === 0) return { value: null, trend: 'neutral' };
    
    const growth = ((Number(latest) - Number(previous)) / Number(previous)) * 100;
    const trend: 'up' | 'down' | 'neutral' = growth > 0 ? 'up' : growth < 0 ? 'down' : 'neutral';
    
    return { value: growth.toFixed(1), trend };
  };

  const renderTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') {
      return <ArrowUp className="h-4 w-4 text-green-500" />;
    } else if (trend === 'down') {
      return <ArrowDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const selectedAccountData = accounts.find(acc => acc.id === selectedAccount);

  if (loading && accounts.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (accounts.length === 0) {
    return (
      <Layout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">
              Acompanhe o crescimento das suas contas do Threads
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Nenhuma conta conectada</CardTitle>
              <CardDescription>
                Conecte uma conta do Threads para visualizar os analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/accounts")}>
                Conectar Conta
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const chartData = formatChartData();

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">
              Acompanhe o crescimento das suas contas do Threads
            </p>
          </div>
          <Button
            onClick={handleRefreshInsights}
            disabled={refreshing}
            className="gap-2"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Atualizar Dados
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Selecionar Conta</CardTitle>
            <CardDescription>
              Escolha a conta que deseja analisar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={account.profile_picture_url || undefined} alt={account.username || "Profile"} />
                        <AvatarFallback>{account.username?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                      </Avatar>
                      {account.username || account.account_id}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {latestInsight && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="hover-scale">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Seguidores</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary animate-fade-in">{latestInsight.followers_count?.toLocaleString() || 0}</div>
                  {calculateGrowth('followers_count').value && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 animate-fade-in">
                      {renderTrendIcon(calculateGrowth('followers_count').trend)}
                      <span className={cn(
                        calculateGrowth('followers_count').trend === 'up' && 'text-green-500',
                        calculateGrowth('followers_count').trend === 'down' && 'text-red-500'
                      )}>
                        {calculateGrowth('followers_count').value}%
                      </span>
                      {' '}desde última atualização
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="hover-scale">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Visualizações</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary animate-fade-in">{latestInsight.views?.toLocaleString() || 0}</div>
                  {calculateGrowth('views').value && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 animate-fade-in">
                      {renderTrendIcon(calculateGrowth('views').trend)}
                      <span className={cn(
                        calculateGrowth('views').trend === 'up' && 'text-green-500',
                        calculateGrowth('views').trend === 'down' && 'text-red-500'
                      )}>
                        {calculateGrowth('views').value}%
                      </span>
                      {' '}desde última atualização
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="hover-scale">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Curtidas</CardTitle>
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary animate-fade-in">{latestInsight.likes?.toLocaleString() || 0}</div>
                  {calculateGrowth('likes').value && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 animate-fade-in">
                      {renderTrendIcon(calculateGrowth('likes').trend)}
                      <span className={cn(
                        calculateGrowth('likes').trend === 'up' && 'text-green-500',
                        calculateGrowth('likes').trend === 'down' && 'text-red-500'
                      )}>
                        {calculateGrowth('likes').value}%
                      </span>
                      {' '}desde última atualização
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="hover-scale">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Engajamento</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary animate-fade-in">{latestInsight.engaged_audience?.toLocaleString() || 0}</div>
                  {calculateGrowth('engaged_audience').value && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 animate-fade-in">
                      {renderTrendIcon(calculateGrowth('engaged_audience').trend)}
                      <span className={cn(
                        calculateGrowth('engaged_audience').trend === 'up' && 'text-green-500',
                        calculateGrowth('engaged_audience').trend === 'down' && 'text-red-500'
                      )}>
                        {calculateGrowth('engaged_audience').value}%
                      </span>
                      {' '}desde última atualização
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {chartData.length > 1 && (
              <>
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Crescimento de Seguidores
                    </CardTitle>
                    <CardDescription>Evolução ao longo do tempo - Quanto mais alto, melhor!</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorSeguidores" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="seguidores" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorSeguidores)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-primary" />
                      Engajamento Total
                    </CardTitle>
                    <CardDescription>Curtidas, respostas e reposts - Sua audiência está interagindo!</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }} 
                        />
                        <Legend />
                        <Line type="monotone" dataKey="curtidas" stroke="hsl(var(--primary))" strokeWidth={2} name="Curtidas" />
                        <Line type="monotone" dataKey="respostas" stroke="#10b981" strokeWidth={2} name="Respostas" />
                        <Line type="monotone" dataKey="reposts" stroke="#8b5cf6" strokeWidth={2} name="Reposts" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-primary" />
                      Visualizações vs Engajamento
                    </CardTitle>
                    <CardDescription>Comparação de alcance - O AutoThreads está funcionando!</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }} 
                        />
                        <Legend />
                        <Bar dataKey="visualizacoes" fill="hsl(var(--primary))" name="Visualizações" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="engajamento" fill="#10b981" name="Engajamento" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}

        {!latestInsight && !loading && (
          <Card>
            <CardHeader>
              <CardTitle>Sem dados ainda</CardTitle>
              <CardDescription>
                Clique em "Atualizar Dados" para buscar os primeiros insights desta conta
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Analytics;
