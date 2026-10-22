// Browser UI preview with in-memory dummy notes (no Tauri / Ollama).
// Active when:
//   • Vite DEV + `?dev=ui` (local design work), or
//   • `VITE_UI_PREVIEW=true` (GitHub Pages / static design host).
// Never used in the real Tauri app build (that build omits the flag).

import type { NoteDate } from "../lib/noteFile";
import { localDateKey, isNoteDate } from "../lib/noteFile";

export function isBrowserPreview(): boolean {
  if (typeof window === "undefined") return false;
  if (import.meta.env.VITE_UI_PREVIEW === "true") return true;
  if (!import.meta.env.DEV) return false;
  return new URLSearchParams(window.location.search).get("dev") === "ui";
}

function todayKey(): NoteDate {
  const key = localDateKey(new Date());
  return isNoteDate(key) ? key : "2026-10-22";
}

function yesterdayKey(): NoteDate {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const key = localDateKey(d);
  return isNoteDate(key) ? key : "2026-10-21";
}

type Store = {
  notes: Map<string, string>;
  tier: "Green" | "Yellow" | "Red";
  intention: { date: string; status: string }[];
};

let store: Store | null = null;

function bootStore(): Store {
  if (store) return store;
  const params = new URLSearchParams(window.location.search);
  const tier =
    params.get("tier") === "Red"
      ? "Red"
      : params.get("tier") === "Green"
        ? "Green"
        : "Yellow";
  const today = todayKey();
  const yesterday = yesterdayKey();
  const notes = new Map<string, string>();
  notes.set(
    today,
    [
      "Morning focus on [[Vayu]] design and a calm [[reading]] list.",
      "",
      "- [ ] Ship the Reflect-style layout",
      "- [x] Wire browser preview for design work",
      "",
      "Coffee notes from yesterday still matter.",
    ].join("\n"),
  );
  notes.set(
    yesterday,
    "Wrote about [[Berlin Marathon]] training and the [[Atlas redesign]] kickoff.\n\n- [ ] Book flights\n",
  );
  store = {
    notes,
    tier,
    intention: [{ date: today, status: "skipped" }],
  };
  return store;
}

async function streamTokens(
  text: string,
  onEvent: ((e: { event: string; value: string }) => void) | null,
): Promise<{ status: "Done" }> {
  const words = text.split(/(\s+)/);
  for (const part of words) {
    onEvent?.({ event: "token", value: part });
    await new Promise((r) => setTimeout(r, 12));
  }
  onEvent?.({ event: "done", value: "" });
  return { status: "Done" };
}

function channelCallback(
  args: Record<string, unknown> | undefined,
): ((e: { event: string; value: string }) => void) | null {
  const ch = args?.onEvent as { onmessage?: ((m: unknown) => void) | null } | undefined;
  if (!ch) return null;
  return (e) => {
    ch.onmessage?.(e);
  };
}

/** Handles every command the workspace may call during design preview. */
export async function previewInvoke(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<unknown> {
  const s = bootStore();
  const today = todayKey();

  switch (cmd) {
    case "get_config":
      return {
        notesDir: "C:\\preview\\Vayu",
        version: 1,
        defaultNotesDir: "C:\\preview\\Vayu",
        tier: s.tier,
        aiEnabled: s.tier !== "Red",
        intention: s.intention,
      };
    case "list_notes":
      return [...s.notes.keys()].sort();
    case "read_note": {
      const date = String(args?.date ?? "");
      const content = s.notes.get(date) ?? "";
      return { exists: s.notes.has(date), content };
    }
    case "ensure_note": {
      const date = String(args?.date ?? "");
      if (!s.notes.has(date)) s.notes.set(date, "");
      return null;
    }
    case "write_note": {
      const date = String(args?.date ?? "");
      s.notes.set(date, String(args?.content ?? ""));
      return null;
    }
    case "append_note": {
      const date = String(args?.date ?? "");
      const prev = s.notes.get(date) ?? "";
      s.notes.set(date, prev + String(args?.appendix ?? ""));
      return null;
    }
    case "read_all_notes":
      return [...s.notes.entries()].map(([date, content]) => ({ date, content }));
    case "ollama_status":
      return { kind: "Running", version: "0.12.0-preview" };
    case "list_models":
      return {
        present: ["gemma4-e4b-fast:latest"],
        missing: ["gemma3n:e4b", "gemma3n:e2b", "embeddinggemma"],
        status: { kind: "Running", version: "0.12.0-preview" },
        devChatModel: "gemma4-e4b-fast:latest",
      };
    case "hardware_check":
      return {
        ramGb: s.tier === "Green" ? 32 : s.tier === "Red" ? 4 : 8,
        freeDiskGb: 200,
        cpu: "Preview CPU",
        os: "windows preview",
        tier: s.tier,
        model: s.tier === "Green" ? "gemma3n:e4b" : s.tier === "Yellow" ? "gemma3n:e2b" : null,
        sizeGb: s.tier === "Green" ? 7.5 : s.tier === "Yellow" ? 5.6 : 0,
        ollamaPresent: true,
      };
    case "generate": {
      const prompt = String(args?.prompt ?? "");
      const reply = prompt.toLowerCase().includes("summarize")
        ? "You focused on Vayu's layout and kept a short reading list. Tomorrow: finish the Reflect-style shell."
        : prompt.toLowerCase().includes("extract")
          ? "- [ ] Ship the Reflect-style layout\n- [ ] Verify Ask in the browser"
          : "What felt most grounding about today's work?";
      return streamTokens(reply, channelCallback(args));
    }
    case "stop_generation":
      return null;
    case "search_index": {
      const q = String(args?.query ?? "").toLowerCase();
      const hits = [...s.notes.entries()]
        .filter(([, content]) => content.toLowerCase().includes(q) || q.length === 0)
        .slice(0, 3)
        .map(([date, content]) => ({
          date,
          text: content.slice(0, 160),
          score: 0.82,
        }));
      // Empty query → abstain path for demos
      if (!q.trim()) return [];
      return hits.filter((h) => h.text.toLowerCase().includes(q));
    }
    case "reindex":
      return { indexed: s.notes.size, chunks: s.notes.size * 2 };
    case "mark_intention": {
      const date = String(args?.date ?? today);
      const status = String(args?.status ?? "skipped");
      const existing = s.intention.find((e) => e.date === date);
      if (existing) existing.status = status;
      else s.intention.push({ date, status });
      return null;
    }
    case "update_config":
      if (typeof args?.tier === "string") {
        s.tier = args.tier as Store["tier"];
      }
      return null;
    case "pull_model":
    case "cancel_pull":
    case "verify_install":
    case "delete_model":
    case "embeddings":
    case "set_notes_dir":
      return null;
    default:
      console.warn(`[browserPreview] unhandled command: ${cmd}`, args);
      return null;
  }
}
