// Appearance preference. Dark is the shipped look. Light remaps the same tokens.

export type ThemeChoice = "dark" | "light" | "system";

const KEY = "vayu-theme";
const listeners = new Set<() => void>();

function stored(): ThemeChoice {
  if (typeof localStorage === "undefined") return "dark";
  const value = localStorage.getItem(KEY);
  if (value === "light" || value === "system" || value === "dark") return value;
  return "dark";
}

let choice: ThemeChoice = stored();

export function getThemeChoice(): ThemeChoice {
  return choice;
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resolvedTheme(prefersDark = false): "dark" | "light" {
  if (choice === "system") return prefersDark ? "dark" : "light";
  return choice;
}

export function applyTheme(next: ThemeChoice = choice): void {
  choice = next;
  if (typeof localStorage !== "undefined") localStorage.setItem(KEY, next);
  if (typeof document === "undefined") return;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
  document.documentElement.dataset.theme = resolvedTheme(prefersDark);
  listeners.forEach((listener) => listener());
}

export function bindSystemTheme(): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (choice === "system") applyTheme("system");
  };
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
