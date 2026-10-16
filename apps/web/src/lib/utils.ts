import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge class names, letting later Tailwind classes override earlier ones (shadcn/ui helper). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const GOOGLE_SETUP_GUIDE_URL =
  "https://github.com/roystondwork-dev/contact-fuse/blob/main/docs/guides/google-cloud-setup.md";
