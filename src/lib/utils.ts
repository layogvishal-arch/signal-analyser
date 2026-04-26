import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for composing Tailwind class names while resolving conflicts.
// Standard pattern used across shadcn-style component libraries.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
