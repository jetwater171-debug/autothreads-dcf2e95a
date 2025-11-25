import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ScheduledPost {
  id: string;
  scheduled_at: string;
  executed_at: string | null;
  status: string;
  error_message: string | null;
  attempts: number;
  warmup_day_posts: {
    content_type: string;
    time_of_day: string;
  };
  warmup_days: {
    day_index: number;
  };
}

interface WarmingScheduledPostsListProps {
  runId: string;
}

export const WarmingScheduledPostsList = ({ runId }: WarmingScheduledPostsListProps) => {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScheduledPosts();

    // Subscribe to changes
    const channel = (supabase as any)
      .channel('scheduled-posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'warmup_scheduled_posts',
          filter: `run_id=eq.${runId}`,
        },
        () => {
          loadScheduledPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId]);

  const loadScheduledPosts = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('warmup_scheduled_posts')
        .select(`
          *,
          warmup_day_posts!inner(content_type, time_of_day),
          warmup_days!inner(day_index)
        `)
        .eq('run_id', runId)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Erro ao carregar posts agendados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendente', variant: 'secondary' as const, icon: Clock },
      processing: { label: 'Processando', variant: 'default' as const, icon: Loader2 },
      success: { label: 'Sucesso', variant: 'default' as const, icon: CheckCircle2 },
      failed: { label: 'Falhou', variant: 'destructive' as const, icon: XCircle },
      cancelled: { label: 'Cancelado', variant: 'secondary' as const, icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1.5">
        <Icon className={`h-3 w-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    );
  };

  const getContentTypeBadge = (type: string) => {
    const typeLabels = {
      text: 'Texto',
      image: 'Imagem',
      text_image: 'Texto + Imagem',
      carousel: 'Carrossel',
    };

    return (
      <Badge variant="outline">
        {typeLabels[type as keyof typeof typeLabels] || type}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Nenhum post agendado encontrado</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <Card key={post.id} className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  Dia {post.warmup_days.day_index}
                </span>
                {getContentTypeBadge(post.warmup_day_posts.content_type)}
                {getStatusBadge(post.status)}
              </div>

              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Agendado: {format(new Date(post.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>

                {post.executed_at && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>
                      Executado: {format(new Date(post.executed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                )}

                {post.attempts > 0 && (
                  <span className="text-xs">
                    Tentativas: {post.attempts}
                  </span>
                )}
              </div>

              {post.error_message && (
                <div className="mt-2 rounded-md bg-destructive/10 p-2">
                  <p className="text-xs text-destructive">{post.error_message}</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
