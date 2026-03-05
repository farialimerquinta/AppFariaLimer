import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CATEGORY_POINTS = {
  'Grand Slam': 2000,
  'ATP 1000': 1000,
  'ATP 500': 500,
  'ATP 250': 250,
  'Challenger': 125,
} as const;

export type Category = keyof typeof CATEGORY_POINTS;
