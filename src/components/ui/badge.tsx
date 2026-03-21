import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "active" | "warning" | "danger" | "info" | "neutral";
  className?: string;
}

const variantStyles = {
  active: "bg-[rgba(34,197,94,0.15)] text-[#22c55e] border-[rgba(34,197,94,0.3)]",
  warning: "bg-[rgba(234,179,8,0.15)] text-[#eab308] border-[rgba(234,179,8,0.3)]",
  danger: "bg-[rgba(239,68,68,0.15)] text-[#ef4444] border-[rgba(239,68,68,0.3)]",
  info: "bg-[rgba(59,130,246,0.15)] text-[#3b82f6] border-[rgba(59,130,246,0.3)]",
  neutral: "bg-[rgba(107,114,128,0.15)] text-[#6b7280] border-[rgba(107,114,128,0.3)]",
};

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", variantStyles[variant], className)}>
      {children}
    </span>
  );
}
