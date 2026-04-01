import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "strong" | "subtle";
  hover?: boolean;
}

export function GlassCard({
  children,
  className,
  variant = "default",
  hover = false,
}: GlassCardProps) {
  const variantClass =
    variant === "strong"
      ? "glass-strong"
      : variant === "subtle"
      ? "glass-subtle"
      : "glass";

  return (
    <div
      className={cn(
        variantClass,
        "rounded-xl",
        hover && "hover-lift cursor-pointer",
        className
      )}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
