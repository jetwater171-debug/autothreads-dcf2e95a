import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, MessageSquare, Calendar, LogOut, Sparkles, Send, Moon, Sun } from "lucide-react";
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
    path: "/periodic-posts",
    label: "Posts Periódicos",
    icon: Calendar
  }, {
    path: "/manual-post",
    label: "Post Manual",
    icon: Send
  }];
  return <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card relative overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="p-6 relative z-10">
          <div className="mb-8 flex items-center justify-center">
            <img src={logo} alt="Auto Threads" className="h-16 w-auto object-contain" />
          </div>
          
          <nav className="space-y-1">
            {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return <Link key={item.path} to={item.path} className="block">
                  <Button variant="ghost" className={cn("w-full justify-start relative overflow-hidden transition-all duration-300", "hover:bg-primary/10 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/10", "group", isActive && "bg-primary/20 text-primary font-medium border border-primary/30 shadow-md shadow-primary/20")}>
                    <Icon className={cn("mr-3 h-4 w-4 transition-transform duration-300 group-hover:scale-110", isActive && "text-primary")} />
                    <span className="relative z-10">{item.label}</span>
                    {isActive && <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent" />}
                  </Button>
                </Link>;
          })}
          </nav>
        </div>
        
        <div className="absolute bottom-6 left-6 right-6 z-10 space-y-2">
          <Button variant="ghost" className="w-full justify-start hover:bg-primary/10 transition-all duration-300" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
          </Button>
          <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-300 hover:shadow-lg hover:shadow-destructive/10" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto p-8">{children}</div>
      </main>
    </div>;
};
export default Layout;