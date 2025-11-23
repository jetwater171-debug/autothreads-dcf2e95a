import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Calendar, Users, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    accounts: 0,
    phrases: 0,
    periodicPosts: 0,
    postsToday: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await loadStats();
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
        supabase.from("post_history").select("id", { count: "exact" }).gte("posted_at", today.toISOString())
      ]);

      setStats({
        accounts: accountsRes.count || 0,
        phrases: phrasesRes.count || 0,
        periodicPosts: postsRes.count || 0,
        postsToday: postsTodayRes.count || 0
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Visão geral da sua automação no Threads
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Contas Conectadas",
              value: stats.accounts,
              icon: Users,
              description: "Contas do Threads conectadas"
            },
            {
              title: "Frases Cadastradas",
              value: stats.phrases,
              icon: MessageSquare,
              description: "Frases disponíveis para posts"
            },
            {
              title: "Posts Periódicos",
              value: stats.periodicPosts,
              icon: Calendar,
              description: "Automações configuradas"
            },
            {
              title: "Posts Hoje",
              value: stats.postsToday,
              icon: Sparkles,
              description: "Posts realizados hoje"
            }
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="border-2 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-2 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-32 translate-x-32" />
          <CardHeader className="relative">
            <CardTitle>Bem-vindo ao AutoThreads!</CardTitle>
            <CardDescription>
              Comece configurando suas contas e frases para automatizar seus posts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 relative">
            <div className="space-y-3">
              <h3 className="font-semibold">Próximos passos:</h3>
              <ul className="space-y-2">
                {[
                  { text: "Conecte suas contas do Threads na aba 'Contas'", icon: Users },
                  { text: "Adicione frases que deseja postar na aba 'Frases'", icon: MessageSquare },
                  { text: "Configure posts periódicos na aba 'Posts Periódicos'", icon: Calendar }
                ].map((step) => {
                  const Icon = step.icon;
                  return (
                    <li key={step.text} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <Icon className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                      <span>{step.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
