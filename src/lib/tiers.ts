// Task 3.8: tier names in plain words (PRD wording), used by Settings.
import { type Tier } from "../lib/api";

export const TIER_LABELS: Record<Tier, string> = {
  Green: "Full",
  Yellow: "Lite",
  Red: "No-AI",
};

export function tierLabel(tier: Tier | null | undefined): string {
  if (!tier) return "Not chosen yet";
  return `${TIER_LABELS[tier]} (${tier})`;
}
