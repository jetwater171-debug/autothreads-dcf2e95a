import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Calendar, Users, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ThreadsPostPreview } from "@/components/ThreadsPostPreview";

interface PostHistory {
  id: string;
  content: string;
  posted_at: string;
  account_username: string | null;
  account_profile_picture: string | null;
  error_message: string | null;
  duplicate_skipped: boolean;
  attempts: number | null;
  image_urls: string[] | null;
}

const PostHistory = () => {
  const [loading, setLoading] = useState(true);
  const [postHistory, setPostHistory] = useState<PostHistory[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      await loadPostHistory();
    };

    checkAuth();
  }, [navigate]);

  const loadPostHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("post_history")
        .select(`
          id,
          content,
          posted_at,
          error_message,
          duplicate_skipped,
          attempts,
          image_urls,
          threads_accounts!post_history_account_id_fkey (username, profile_picture_url)
        `)
        .order("posted_at", { ascending: false });

      if (error) throw error;

      const formattedHistory = data?.map((post: any) => ({
        id: post.id,
        content: post.content,
        posted_at: post.posted_at,
        account_username: post.threads_accounts?.username || null,
        account_profile_picture: post.threads_accounts?.profile_picture_url || null,
        error_message: post.error_message,
        duplicate_skipped: post.duplicate_skipped,
        attempts: post.attempts,
        image_urls: post.image_urls
      })) || [];

      setPostHistory(formattedHistory);
    } catch (error) {
      console.error("Error loading post history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (post: PostHistory) => {
    if (post.duplicate_skipped) {
      return (
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
          <AlertCircle className="h-3 w-3 mr-1" />
          Duplicado
        </Badge>
      );
    }
    if (post.error_message) {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
          <XCircle className="h-3 w-3 mr-1" />
          Falhou ({post.attempts || 1}x)
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-success/10 text-success border-success/30">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Publicado
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Histórico de Posts
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            Todos os posts realizados e tentativas de publicação
          </p>
        </div>

        <Card className="border-2 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              {postHistory.length} {postHistory.length === 1 ? "Post" : "Posts"} Registrados
            </CardTitle>
            <CardDescription>
              Histórico completo de todas as publicações
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Carregando histórico...</p>
              </div>
            ) : postHistory.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Nenhum post realizado ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {postHistory.map((post) => (
                  <div
                    key={post.id}
                    className="border-2 rounded-xl p-4 hover:border-primary/50 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="font-medium text-sm">Detalhes da Publicação</h3>
                      {getStatusBadge(post)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap mb-4">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {post.account_username || "Conta desconhecida"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(post.posted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>

                    {post.error_message && (
                      <div className="mb-4 p-3 border-l-2 border-destructive bg-destructive/5 rounded-r">
                        <p className="text-xs text-destructive flex items-start gap-2">
                          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                          <span className="flex-1">{post.error_message}</span>
                        </p>
                      </div>
                    )}

                    {/* Preview do Post */}
                    <ThreadsPostPreview
                      username={post.account_username || "usuario"}
                      profilePicture={post.account_profile_picture || undefined}
                      content={post.content}
                      images={post.image_urls || undefined}
                      timestamp={format(new Date(post.posted_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    />
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

export default PostHistory;
