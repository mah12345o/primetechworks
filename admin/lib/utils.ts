import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Standard Indian Rupee currency formatter (e.g. ₹1,25,000.00)
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  const num = Number(amount);
  const safeNum = Number.isFinite(num) ? num : 0;
  return `₹${safeNum.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
