import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="text-center animate-fade-in space-y-6 p-8">
        <h1 className="text-9xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">404</h1>
        <p className="text-2xl text-muted-foreground font-medium">Página não encontrada</p>
        <a href="/" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors duration-200 text-lg font-medium group">
          ← Voltar ao início
          <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
        </a>
      </div>
    </div>
  );
};

export default NotFound;
