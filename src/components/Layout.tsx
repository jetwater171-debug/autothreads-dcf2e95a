import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, MessageSquare, Calendar, LogOut, Sparkles, Send, Moon, Sun, TrendingUp, ImageIcon, Megaphone, History } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { useEffect, useState } from "react";

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
    icon: LayoutDashboard
  }, {
    path: "/accounts",
    label: "Contas",
    icon: Sparkles
  }, {
    path: "/phrases",
    label: "Frases",
    icon: MessageSquare
  }, {
    path: "/images",
    label: "Imagens",
    icon: ImageIcon
  }, {
    path: "/periodic-posts",
    label: "Posts Periódicos",
    icon: Calendar
  }, {
    path: "/campaigns",
    label: "Campanhas",
    icon: Megaphone
  }, {
    path: "/manual-post",
    label: "Post Manual",
    icon: Send
  }, {
    path: "/analytics",
    label: "Analytics",
    icon: TrendingUp
  }, {
    path: "/post-history",
    label: "Histórico",
    icon: History
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
            {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return <Link key={item.path} to={item.path} className="block">
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "w-full justify-start relative overflow-hidden transition-all duration-300 rounded-xl h-12 font-medium",
                      "hover:bg-primary/10 hover:shadow-lg hover:shadow-primary/20 group text-[14px]",
                      isActive && "bg-primary/15 text-primary shadow-lg shadow-primary/30 border border-primary/30"
                    )}
                  >
                    <Icon className={cn(
                      "mr-3 h-5 w-5 transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]", 
                      isActive && "text-primary drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                    )} />
                    <span className="relative z-10">{item.label}</span>
                    {isActive && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent" />
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary rounded-l-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                      </>
                    )}
                  </Button>
                </Link>;
          })}
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