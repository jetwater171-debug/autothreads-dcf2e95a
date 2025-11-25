import { Badge } from "@/components/ui/badge";
import { Flame, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WarmingStatusBadgeProps {
  status: "warmed" | "warming" | "not_warmed";
  className?: string;
  showIcon?: boolean;
}

export function WarmingStatusBadge({ status, className, showIcon = true }: WarmingStatusBadgeProps) {
  const configs = {
    warmed: {
      label: "Aquecido",
      icon: Check,
      className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    },
    warming: {
      label: "Aquecendo",
      icon: Loader2,
      className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 animate-pulse",
    },
    not_warmed: {
      label: "Não aquecido",
      icon: Flame,
      className: "bg-muted text-muted-foreground border-border",
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {showIcon && <Icon className={cn("h-3 w-3 mr-1", status === "warming" && "animate-spin")} />}
      {config.label}
    </Badge>
  );
}
