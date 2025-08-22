import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format amounts in Guinean Franc (GNF) with no decimal digits
export function formatCurrency(amount: number): string {
  try {
    return new Intl.NumberFormat('fr-GN', {
      style: 'currency',
      currency: 'GNF',
      maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0)
  } catch {
    // Fallback for environments lacking Intl support
    const safe = Math.round(Number.isFinite(amount) ? amount : 0).toLocaleString('fr-FR')
    return `${safe} GNF`
  }
}


