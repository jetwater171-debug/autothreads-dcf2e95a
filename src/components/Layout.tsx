import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, MessageSquare, Calendar, LogOut, Sparkles, Send, Moon, Sun, TrendingUp, ImageIcon, Megaphone } from "lucide-react";
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
  }];
  return <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-72 border-r border-border/50 bg-card/50 backdrop-blur-xl relative overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/3 via-transparent to-transparent pointer-events-none" />
        
        <div className="p-8 relative z-10">
          <div className="mb-12 flex items-center justify-center">
            <img src={logo} alt="Auto Threads" className="h-14 w-auto object-contain" />
          </div>
          
          <nav className="space-y-1.5">
            {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return <Link key={item.path} to={item.path} className="block">
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "w-full justify-start relative overflow-hidden transition-all duration-200 rounded-lg h-11",
                      "hover:bg-primary/8 hover:shadow-sm group",
                      isActive && "bg-primary/12 text-primary font-medium shadow-sm border border-primary/10"
                    )}
                  >
                    <Icon className={cn("mr-3 h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-105", isActive && "text-primary")} />
                    <span className="relative z-10 text-[13px]">{item.label}</span>
                    {isActive && <div className="absolute inset-0 bg-gradient-to-r from-primary/8 to-transparent" />}
                  </Button>
                </Link>;
          })}
          </nav>
        </div>
        
        <div className="absolute bottom-8 left-8 right-8 z-10 space-y-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start hover:bg-accent/50 transition-all duration-200 rounded-lg h-11" 
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun className="mr-3 h-[18px] w-[18px]" /> : <Moon className="mr-3 h-[18px] w-[18px]" />}
            <span className="text-[13px]">{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200 rounded-lg h-11" 
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-[18px] w-[18px]" />
            <span className="text-[13px]">Sair</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gradient-to-br from-background via-background to-primary/[0.02]">
        <div className="container mx-auto p-8 max-w-7xl">{children}</div>
      </main>
    </div>;
};
export default Layout;