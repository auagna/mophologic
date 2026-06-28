"use client";

import { ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  variant?: "default" | "ghost" | "primary" | "danger";
};

export function Button({ className, active, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex h-8 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded border px-2.5 text-[11px] font-medium leading-none transition focus:outline-none focus:ring-2 focus:ring-lab-blue/40 disabled:pointer-events-none disabled:opacity-45",
        variant === "default" && "border-lab-border bg-lab-panel2 text-lab-text hover:border-lab-blue/45 hover:bg-[#1a1e25]",
        variant === "ghost" && "border-transparent bg-transparent text-lab-muted hover:bg-lab-panel2 hover:text-lab-text",
        variant === "primary" && "border-lab-blue/70 bg-lab-blue text-[#07101d] hover:bg-[#79b6ff]",
        variant === "danger" && "border-red-400/35 bg-red-500/10 text-red-100 hover:bg-red-500/20",
        active && "border-lab-blue bg-lab-blue/16 text-white shadow-[inset_0_0_0_1px_rgba(78,157,255,0.35)]",
        className
      )}
      {...props}
    />
  );
}
