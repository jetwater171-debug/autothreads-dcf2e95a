import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const ThreadsCallback = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const errorParam = searchParams.get("error");

        if (errorParam) {
          setError("Autorização negada pelo usuário");
          setLoading(false);
          return;
        }

        if (!code) {
          setError("Código de autorização não encontrado");
          setLoading(false);
          return;
        }

        // Obter sessão
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError("Sessão não encontrada. Faça login novamente.");
          setLoading(false);
          setTimeout(() => navigate("/auth"), 2000);
          return;
        }

        // Chamar edge function para processar o callback
        const { data, error: functionError } = await supabase.functions.invoke(
          "threads-oauth-callback",
          {
            body: { code },
          }
        );

        if (functionError) {
          throw new Error(functionError.message);
        }

        if (!data.success) {
          throw new Error(data.error || "Erro desconhecido");
        }

        setSuccess(true);
        toast({
          title: "Conta conectada!",
          description: `Sua conta ${data.username || "Threads"} foi conectada com sucesso.`,
        });

        setTimeout(() => navigate("/accounts"), 2000);
      } catch (error: any) {
        console.error("Erro no callback:", error);
        setError(error.message);
        toast({
          variant: "destructive",
          title: "Erro ao conectar conta",
          description: error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            {loading && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            {success && <CheckCircle className="h-6 w-6 text-success" />}
            {error && <XCircle className="h-6 w-6 text-destructive" />}
            {loading && "Conectando conta..."}
            {success && "Conta conectada!"}
            {error && "Erro na conexão"}
          </CardTitle>
          <CardDescription className="text-center">
            {loading && "Processando autorização do Threads..."}
            {success && "Redirecionando para suas contas..."}
            {error && error}
          </CardDescription>
        </CardHeader>
        {(success || error) && (
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate("/accounts")}>
              Ir para Contas
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ThreadsCallback;
