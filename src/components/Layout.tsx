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
      <aside className="w-72 border-r border-border/40 glass relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] via-transparent to-transparent pointer-events-none" />
        
        <div className="py-8 px-6 relative z-10">
          <div className="mb-12 flex items-center justify-center">
            <img src={logo} alt="Auto Threads" className="h-14 w-auto object-contain opacity-90" />
          </div>
          
          <nav className="space-y-1.5">
            {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return <Link key={item.path} to={item.path} className="block">
                  <Button 
                    variant="ghost" 
                    className={cn(
                      "w-full justify-start text-[15px] h-11 px-4 font-normal",
                      "transition-all duration-200 ease-out",
                      "hover:bg-primary/[0.06] hover:translate-x-0.5",
                      "group relative",
                      isActive && "bg-primary/[0.08] text-primary font-medium shadow-apple"
                    )}
                  >
                    <Icon className={cn(
                      "mr-3.5 h-[18px] w-[18px] transition-all duration-200",
                      "group-hover:scale-105",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span>{item.label}</span>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-7 bg-primary rounded-r" />
                    )}
                  </Button>
                </Link>;
          })}
          </nav>
        </div>
        
        <div className="absolute bottom-8 left-6 right-6 z-10 space-y-1.5">
          <Button 
            variant="ghost" 
            className="w-full justify-start h-10 font-normal text-[15px] hover:bg-muted/50 transition-all duration-200" 
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun className="mr-3 h-[17px] w-[17px]" /> : <Moon className="mr-3 h-[17px] w-[17px]" />}
            {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start h-10 font-normal text-[15px] text-destructive/80 hover:text-destructive hover:bg-destructive/[0.06] transition-all duration-200" 
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-[17px] w-[17px]" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background">
        <div className="max-w-[1400px] mx-auto px-12 py-10">{children}</div>
      </main>
    </div>;
};
export default Layout;