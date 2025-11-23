import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Calendar, Users, Sparkles } from "lucide-react";
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
    postsToday: 0
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
        account_username: post.threads_accounts?.username || null
      })) || [];

      setPostHistory(formattedHistory);
    } catch (error) {
      console.error("Error loading post history:", error);
    }
  };

  return (
    <Layout>
      <div className="space-y-12">
        <div className="space-y-2">
          <h1 className="text-[32px] font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-[15px]">
            Visão geral da sua automação no Threads
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Contas Conectadas",
              value: stats.accounts,
              icon: Users,
              description: "Contas do Threads"
            },
            {
              title: "Frases Cadastradas",
              value: stats.phrases,
              icon: MessageSquare,
              description: "Frases disponíveis"
            },
            {
              title: "Posts Periódicos",
              value: stats.periodicPosts,
              icon: Calendar,
              description: "Automações ativas"
            },
            {
              title: "Posts Hoje",
              value: stats.postsToday,
              icon: Sparkles,
              description: "Posts realizados"
            }
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={stat.title} 
                className="border border-border/40 shadow-apple hover:shadow-apple-md transition-all duration-300 ease-out hover:-translate-y-0.5"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-3 pt-6">
                  <CardTitle className="text-[13px] font-medium text-muted-foreground tracking-normal">
                    {stat.title}
                  </CardTitle>
                  <div className="p-2 rounded-xl bg-primary/[0.08]">
                    <Icon className="h-[18px] w-[18px] text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="pb-6">
                  <div className="text-[36px] font-semibold text-primary leading-none mb-2">
                    {stat.value}
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border border-border/40 shadow-apple overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent pointer-events-none" />
          <CardHeader className="relative pb-4 pt-7">
            <CardTitle className="text-[17px] font-semibold">Bem-vindo ao AutoThreads!</CardTitle>
            <CardDescription className="text-[14px] mt-1.5">
              Comece configurando suas contas e frases para automatizar seus posts
            </CardDescription>
          </CardHeader>
          <CardContent className="relative pb-7">
            <div className="space-y-4">
              <h3 className="text-[15px] font-medium">Próximos passos</h3>
              <ul className="space-y-3">
                {[
                  { text: "Conecte suas contas do Threads", icon: Users },
                  { text: "Adicione frases que deseja postar", icon: MessageSquare },
                  { text: "Configure posts periódicos", icon: Calendar }
                ].map((step) => {
                  const Icon = step.icon;
                  return (
                    <li key={step.text} className="flex items-start gap-3 text-[14px] text-muted-foreground">
                      <div className="p-1.5 rounded-lg bg-primary/[0.08] mt-0.5 flex-shrink-0">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="leading-relaxed">{step.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40 shadow-apple">
          <CardHeader className="pb-4 pt-7">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/[0.08]">
                <MessageSquare className="h-[18px] w-[18px] text-primary" />
              </div>
              <div>
                <CardTitle className="text-[17px] font-semibold">Histórico de Posts</CardTitle>
                <CardDescription className="text-[13px] mt-0.5">
                  Últimos posts realizados
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-7">
            {postHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 rounded-2xl bg-muted/30 w-fit mx-auto mb-4">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <p className="text-[14px] text-muted-foreground">Nenhum post realizado ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {postHistory.map((post) => (
                  <div
                    key={post.id}
                    className="group p-4 rounded-xl border border-border/40 hover:border-border hover:shadow-apple transition-all duration-200 ease-out"
                  >
                    <p className="text-[14px] font-medium leading-relaxed">{post.content}</p>
                    <div className="flex items-center gap-5 mt-3 text-[13px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {post.account_username || "Conta desconhecida"}
                      </span>
                      <span className="flex items-center gap-1.5">
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
