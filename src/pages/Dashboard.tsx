import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, MessageSquare, Calendar, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PostHistory {
  id: string;
  content: string;
  posted_at: string;
  account_username: string | null;
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    accounts: 0,
    phrases: 0,
    periodicPosts: 0,
    postsToday: 0,
  });
  const [postHistory, setPostHistory] = useState<PostHistory[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await loadStats();
      await loadPostHistory();
    };

    checkAuth();
  }, [navigate]);

  const loadStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [accountsRes, phrasesRes, postsRes, postsTodayRes] = await Promise.all([
        supabase.from("threads_accounts").select("id", { count: "exact" }),
        supabase.from("phrases").select("id", { count: "exact" }),
        supabase.from("periodic_posts").select("id", { count: "exact" }),
        supabase
          .from("post_history")
          .select("id", { count: "exact" })
          .gte("posted_at", today.toISOString()),
      ]);

      setStats({
        accounts: accountsRes.count || 0,
        phrases: phrasesRes.count || 0,
        periodicPosts: postsRes.count || 0,
        postsToday: postsTodayRes.count || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPostHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("post_history")
        .select(`
          id,
          content,
          posted_at,
          threads_accounts!post_history_account_id_fkey (username)
        `)
        .order("posted_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedHistory = data?.map((post: any) => ({
        id: post.id,
        content: post.content,
        posted_at: post.posted_at,
        account_username: post.threads_accounts?.username || null,
      })) || [];

      setPostHistory(formattedHistory);
    } catch (error) {
      console.error("Error loading post history:", error);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="animate-fade-in">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Visão geral da sua automação no Threads
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { title: "Contas Conectadas", value: stats.accounts, icon: Users, color: "from-blue-500 to-cyan-500", delay: "0s" },
            { title: "Frases Cadastradas", value: stats.phrases, icon: MessageSquare, color: "from-purple-500 to-pink-500", delay: "0.1s" },
            { title: "Posts Periódicos", value: stats.periodicPosts, icon: Calendar, color: "from-orange-500 to-red-500", delay: "0.2s" },
            { title: "Posts Hoje", value: stats.postsToday, icon: Sparkles, color: "from-green-500 to-emerald-500", delay: "0.3s" }
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={stat.title}
                className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:scale-105 group animate-scale-in"
                style={{ animationDelay: stat.delay }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <div className="relative">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                    <div className="absolute inset-0 blur-lg bg-primary/0 group-hover:bg-primary/20 transition-all duration-300" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.title === "Contas Conectadas" && "Contas do Threads conectadas"}
                    {stat.title === "Frases Cadastradas" && "Frases disponíveis para posts"}
                    {stat.title === "Posts Periódicos" && "Automações configuradas"}
                    {stat.title === "Posts Hoje" && "Posts realizados hoje"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm animate-fade-in-delayed overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-32 translate-x-32" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary animate-glow" />
              Bem-vindo ao Threads Automation!
            </CardTitle>
            <CardDescription>
              Comece configurando suas contas e frases para automatizar seus posts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 relative">
            <div className="space-y-3">
              <h3 className="font-semibold text-primary">Próximos passos:</h3>
              <ul className="space-y-2">
                {[
                  { text: "Conecte suas contas do Threads na aba 'Contas'", icon: Users },
                  { text: "Adicione frases que deseja postar na aba 'Frases'", icon: MessageSquare },
                  { text: "Configure posts periódicos na aba 'Posts Periódicos'", icon: Calendar }
                ].map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <li 
                      key={index} 
                      className="flex items-start gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 group"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <Icon className="h-4 w-4 mt-0.5 text-primary group-hover:scale-110 transition-transform duration-200" />
                      <span>{step.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm animate-fade-in-delayed overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-32 -translate-x-32" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Histórico de Posts
            </CardTitle>
            <CardDescription>
              Últimos posts realizados
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            {postHistory.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum post realizado ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {postHistory.map((post, index) => (
                  <div 
                    key={post.id} 
                    className="border-l-2 border-primary/50 pl-4 py-3 hover:border-primary hover:bg-primary/5 transition-all duration-300 rounded-r-lg group animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors duration-200">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5 hover:text-primary transition-colors duration-200">
                        <Users className="h-3.5 w-3.5" />
                        {post.account_username || "Conta desconhecida"}
                      </span>
                      <span className="flex items-center gap-1.5 hover:text-primary transition-colors duration-200">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(post.posted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
