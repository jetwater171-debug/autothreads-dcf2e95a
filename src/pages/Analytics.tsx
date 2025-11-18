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
import { TrendingUp, Users, Eye, Heart, MessageCircle, Repeat2, Share2, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

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

  const calculateGrowth = (metric: keyof Insight) => {
    if (insights.length < 2) return null;
    
    const latest = insights[insights.length - 1][metric] || 0;
    const previous = insights[insights.length - 2][metric] || 0;
    
    if (previous === 0) return null;
    
    const growth = ((Number(latest) - Number(previous)) / Number(previous)) * 100;
    return growth.toFixed(1);
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
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Seguidores</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{latestInsight.followers_count?.toLocaleString() || 0}</div>
                  {calculateGrowth('followers_count') && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      +{calculateGrowth('followers_count')}% desde última atualização
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Visualizações</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{latestInsight.views?.toLocaleString() || 0}</div>
                  {calculateGrowth('views') && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      +{calculateGrowth('views')}% desde última atualização
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Curtidas</CardTitle>
                  <Heart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{latestInsight.likes?.toLocaleString() || 0}</div>
                  {calculateGrowth('likes') && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      +{calculateGrowth('likes')}% desde última atualização
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Engajamento</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{latestInsight.engaged_audience?.toLocaleString() || 0}</div>
                  {calculateGrowth('engaged_audience') && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      +{calculateGrowth('engaged_audience')}% desde última atualização
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {chartData.length > 1 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Crescimento de Seguidores</CardTitle>
                    <CardDescription>Evolução ao longo do tempo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorSeguidores" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
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
                            borderRadius: '8px'
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="seguidores" 
                          stroke="hsl(var(--primary))" 
                          fillOpacity={1} 
                          fill="url(#colorSeguidores)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Engajamento</CardTitle>
                    <CardDescription>Curtidas, respostas e reposts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Legend />
                        <Line type="monotone" dataKey="curtidas" stroke="hsl(var(--primary))" name="Curtidas" />
                        <Line type="monotone" dataKey="respostas" stroke="#10b981" name="Respostas" />
                        <Line type="monotone" dataKey="reposts" stroke="#8b5cf6" name="Reposts" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Visualizações e Engajamento</CardTitle>
                    <CardDescription>Comparativo de métricas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Legend />
                        <Bar dataKey="visualizacoes" fill="hsl(var(--primary))" name="Visualizações" />
                        <Bar dataKey="engajamento" fill="#10b981" name="Engajamento" />
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
