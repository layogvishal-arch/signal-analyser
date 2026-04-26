// Minimal UI primitives inspired by shadcn/ui. Kept in one file to avoid
// unnecessary abstraction for a demo-sized project while giving us a
// consistent design system.

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Button ------------------------------------------------------------------
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
};

export function Button({ className, variant = "primary", size = "md", ...rest }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-muted text-foreground hover:bg-muted/80",
    ghost: "bg-transparent hover:bg-muted text-foreground",
    outline: "border border-border bg-transparent hover:bg-muted text-foreground",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 text-sm",
    lg: "h-10 px-6 text-sm",
  };
  return <button className={cn(base, variants[variant], sizes[size], className)} {...rest} />;
}

// Card --------------------------------------------------------------------
export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-foreground shadow-sm",
        className
      )}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pb-2 flex items-start justify-between gap-3", className)} {...rest} />;
}

export function CardContent({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pt-2", className)} {...rest} />;
}

// Badge -------------------------------------------------------------------
type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "danger";
};

export function Badge({ className, variant = "default", ...rest }: BadgeProps) {
  const variants = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-muted text-foreground",
    outline: "border border-border text-foreground",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-rose-100 text-rose-800",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...rest}
    />
  );
}

// Select ------------------------------------------------------------------
// Plain native <select> styled to match the rest of the UI.
type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...rest }: SelectProps) {
  return (
    <select
      className={cn(
        "h-8 rounded-md border border-border bg-card px-2 pr-7 text-sm text-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring",
        className
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

// Switch ------------------------------------------------------------------
type SwitchProps = {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  id?: string;
  disabled?: boolean;
};

export function Switch({ checked, onCheckedChange, id, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

// Sheet (simple right-side drawer) ---------------------------------------
// Non-modal by default — it slides in but doesn't block interaction with
// the underlying page, so PM Mode can stay open while you click through
// emails in the inbox.
type SheetProps = {
  open: boolean;
  children: React.ReactNode;
  width?: string;
};

export function Sheet({ open, children, width = "28rem" }: SheetProps) {
  return (
    <aside
      aria-hidden={!open}
      className={cn(
        "fixed right-0 top-14 z-30 border-l border-border bg-card shadow-xl transition-transform overflow-y-auto",
        open ? "translate-x-0" : "translate-x-full"
      )}
      style={{ width, height: "calc(100vh - 3.5rem)" }}
    >
      {children}
    </aside>
  );
}

// Section title -----------------------------------------------------------
export function SectionTitle({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "text-xs uppercase tracking-wider font-semibold text-muted-foreground",
        className
      )}
      {...rest}
    />
  );
}
