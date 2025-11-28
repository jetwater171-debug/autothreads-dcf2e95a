import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, MessageSquare, Calendar, LogOut, Sparkles, Send, Moon, Sun, TrendingUp, ImageIcon, Megaphone, History, Flame, Repeat2 } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LayoutProps {
  children: React.ReactNode;
}
const Layout = ({
  children
}: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!"
    });
    navigate("/auth");
  };
  const navItems = [{
    path: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    disabled: false
  }, {
    path: "/accounts",
    label: "Contas",
    icon: Sparkles,
    disabled: false
  }, {
    path: "/posts",
    label: "Posts",
    icon: MessageSquare,
    disabled: false
  }, {
    path: "/warming-pipeline",
    label: "Esteira de Aquecimento",
    icon: Flame,
    disabled: false
  }, {
    path: "/periodic-posts",
    label: "Posts Periódicos",
    icon: Calendar,
    disabled: false
  }, {
    path: "/campaigns",
    label: "Campanhas",
    icon: Megaphone,
    disabled: false
  }, {
    path: "/manual-post",
    label: "Post Manual",
    icon: Send,
    disabled: false
  }, {
    path: "/repost",
    label: "Repost",
    icon: Repeat2,
    disabled: false
  }, {
    path: "/analytics",
    label: "Analytics",
    icon: TrendingUp,
    disabled: true,
    maintenanceMessage: "Funcionalidade em manutenção"
  }, {
    path: "/post-history",
    label: "Histórico",
    icon: History,
    disabled: false
  }];
  return <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-72 border-r border-border bg-sidebar-background/95 backdrop-blur-xl relative flex flex-col shadow-xl">
        {/* Blue glow gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] via-primary/[0.02] to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/10 to-transparent blur-2xl pointer-events-none" />
        
        <div className="p-8 relative z-10 flex-1 flex flex-col">
          <div className="mb-12 flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <img src={logo} alt="Auto Threads" className="h-14 w-auto object-contain relative z-10" />
            </div>
          </div>
          
          <nav className="space-y-2 flex-1">
            <TooltipProvider>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                const buttonContent = (
                  <Button 
                    variant="ghost" 
                    disabled={item.disabled}
                    className={cn(
                      "w-full justify-start relative overflow-hidden transition-all duration-300 rounded-xl h-12 font-medium",
                      "hover:bg-primary/10 hover:shadow-lg hover:shadow-primary/20 group text-[14px]",
                      isActive && "bg-primary/15 text-primary shadow-lg shadow-primary/30 border border-primary/30",
                      item.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:shadow-none"
                    )}
                  >
                    <Icon className={cn(
                      "mr-3 h-5 w-5 transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]", 
                      isActive && "text-primary drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]",
                      item.disabled && "group-hover:scale-100 group-hover:drop-shadow-none"
                    )} />
                    <span className="relative z-10">{item.label}</span>
                    {isActive && !item.disabled && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent" />
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary rounded-l-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                      </>
                    )}
                  </Button>
                );

                if (item.disabled) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>
                        <div className="block">
                          {buttonContent}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.maintenanceMessage}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <Link key={item.path} to={item.path} className="block">
                    {buttonContent}
                  </Link>
                );
              })}
            </TooltipProvider>
          </nav>
          
          <div className="pt-6 space-y-2 border-t border-border/50 mt-auto">
            <Button 
              variant="ghost" 
              className="w-full justify-start hover:bg-accent/10 hover:shadow-md transition-all duration-300 rounded-xl h-12 font-medium text-[14px]" 
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="mr-3 h-5 w-5" /> : <Moon className="mr-3 h-5 w-5" />}
              <span>{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 hover:shadow-md hover:shadow-destructive/20 transition-all duration-300 rounded-xl h-12 font-medium text-[14px]" 
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-5 w-5" />
              <span>Sair</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gradient-to-br from-background via-background to-primary/[0.03]">
        <div className="container mx-auto p-8 max-w-7xl">{children}</div>
      </main>
    </div>;
};
export default Layout;