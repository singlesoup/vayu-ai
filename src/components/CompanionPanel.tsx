// Reflect with Vayu is Ask your notes: search the local index, answer only
// from those excerpts, and show the source days. The open entry stays on the
// context card so you can see where you are; it is not the answer's source.

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, ChevronDown, Lightbulb, Sparkles, Square, Wand2 } from "lucide-react";
import { generate, readAllNotes, readNote, searchIndex, stopGeneration, type SearchHit } from "../lib/api";
import { excerptsFromNotes } from "../lib/noteExcerpts";
import {
  GENERIC_SUGGESTIONS,
  entryReadyForSuggestions,
  parseSuggestions,
  suggestionPrompt,
} from "../lib/suggestions";
import { isApiErrorLike } from "../lib/apiErrors";
import { BacklinksPanel } from "./BacklinksPanel";
import { formatNoteHeader } from "../lib/dateFormat";
import { noteDateToDate, type NoteDate } from "../lib/noteFile";

const ABSTAIN = "I couldn't find anything in your notes about that.";

function buildPrompt(question: string, hits: SearchHit[]): string {
  const excerpts = hits.map((hit) => `[${hit.date}] ${hit.text}`).join("\n---\n");
  return (
    "You are Vayu's research helper. Answer the user's question using ONLY " +
    "the note excerpts below. If the excerpts do not contain the answer, " +
    'reply exactly: "I couldn\'t find anything in your notes about that." ' +
    "Do not invent anything.\n\n" +
    `Question: ${question}\n\nNote excerpts:\n${excerpts}`
  );
}

type Props = {
  date: NoteDate;
  open: boolean;
  refreshKey: number;
  onOpenDay: (date: string) => void;
};

type Turn =
  | { role: "you"; text: string }
  | { role: "ai"; text: string; sources: SearchHit[] };

type Phase = "idle" | "searching" | "answering";

export function CompanionPanel({ date, open, refreshKey, onOpenDay }: Props) {
  const [title, setTitle] = useState("Today");
  const [body, setBody] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Turn[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [suggestions, setSuggestions] = useState<string[]>(GENERIC_SUGGESTIONS);
  const suggestedFor = useRef("");
  const suggesting = useRef(false);
  const seenDate = useRef(date);

  useEffect(() => {
    void readNote(date)
      .then((note) => {
        // Date changed: reset AI suggestions to the generic set so the
        // previous entry's chips never bleed into the new one. Runs in the
        // promise callback (not synchronously in the effect) and only on a
        // real date change, so refreshKey autosave bumps keep live chips.
        if (seenDate.current !== date) {
          seenDate.current = date;
          setSuggestions(GENERIC_SUGGESTIONS);
          suggestedFor.current = "";
        }
        const heading = note.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
        setTitle(heading || "Today");
        setBody(note.content);
      })
      .catch(() => {
        setTitle("Today");
        setBody("");
      });
  }, [date, refreshKey]);

  useEffect(() => {
    if (!open || phase !== "idle" || !entryReadyForSuggestions(body)) return;
    if (suggestedFor.current === body) return;
    const snapshot = body;
    let reply = "";
    let cancelled = false;
    suggesting.current = true;
    void generate(suggestionPrompt(snapshot), (event) => {
      if (cancelled) return;
      if (event.event === "token") reply += event.value;
      if (event.event === "done") {
        suggesting.current = false;
        const next = parseSuggestions(reply);
        if (next) {
          suggestedFor.current = snapshot;
          setSuggestions(next);
        }
      }
    }).catch(() => {
      suggesting.current = false;
    });
    return () => {
      cancelled = true;
      suggesting.current = false;
    };
  }, [body, open, phase]);

  function pushAi(text: string, sources: SearchHit[] = []) {
    setMessages((items) => [...items, { role: "ai", text, sources }]);
  }

  async function ask(text: string) {
    const q = text.trim();
    if (!q || phase !== "idle") return;
    if (suggesting.current) {
      suggesting.current = false;
      await stopGeneration();
    }
    setMessages((items) => [...items, { role: "you", text: q }]);
    setDraft("");
    setPhase("searching");
    try {
      let hits: SearchHit[] = [];
      try {
        hits = await searchIndex(q, 5);
      } catch {
        hits = [];
      }
      // embeddinggemma is often missing, and an empty index abstains before the
      // chat model ever runs. Fall back to the notes on disk.
      if (hits.length === 0) {
        const notes = await readAllNotes();
        hits = excerptsFromNotes(notes, q, date);
      }
      if (hits.length === 0) {
        pushAi(ABSTAIN);
        setPhase("idle");
        return;
      }
      setPhase("answering");
      let reply = "";
      await generate(buildPrompt(q, hits), (event) => {
        if (event.event === "token") {
          reply += event.value;
          const snapshot = reply;
          setMessages((items) => {
            const next = items.slice();
            const last = next[next.length - 1];
            if (last?.role === "ai") next[next.length - 1] = { role: "ai", text: snapshot, sources: hits };
            else next.push({ role: "ai", text: snapshot, sources: hits });
            return next;
          });
        }
        if (event.event === "done") {
          const finalText = reply.trim() || ABSTAIN;
          setMessages((items) => {
            const next = items.slice();
            const last = next[next.length - 1];
            if (last?.role === "ai") next[next.length - 1] = { role: "ai", text: finalText, sources: hits };
            else next.push({ role: "ai", text: finalText, sources: hits });
            return next;
          });
          setPhase("idle");
        }
      });
    } catch (err) {
      setPhase("idle");
      pushAi(isApiErrorLike(err) ? err.message : "Ask failed. Try again.");
    }
  }

  async function stop() {
    await stopGeneration();
    setMessages((items) => {
      const next = items.slice();
      const last = next[next.length - 1];
      if (last?.role === "ai" && last.text.trim()) return next;
      if (last?.role === "ai") {
        next[next.length - 1] = { ...last, text: ABSTAIN };
        return next;
      }
      next.push({ role: "ai", text: ABSTAIN, sources: [] });
      return next;
    });
    setPhase("idle");
  }

  const excerpt = body.replace(/^#.*\n/, "").trim().slice(0, 105);

  return (
    <aside className={`companion${open ? "" : " companion-closed"}`} aria-label="Reflect with Vayu" data-testid="ai-context-panel">
      <div className="companion-heading">
        <div>
          <p className="companion-eyebrow">
            <Sparkles size={13} />
            LOCAL COMPANION
          </p>
          <h2>Reflect with Vayu</h2>
        </div>
        <button type="button" className="companion-menu" aria-label="Companion options" data-testid="ai-panel-menu-button">
          <ChevronDown size={16} />
        </button>
      </div>
      <div className="context-card">
        <p className="context-label">
          <Lightbulb size={12} />
          CURRENT CONTEXT
        </p>
        <strong>{title}</strong>
        <p>{excerpt || "This entry is still empty."}{excerpt.length === 105 ? "…" : ""}</p>
        <span className="context-tag">This entry</span>
      </div>
      <BacklinksPanel noteDate={date} onOpenDay={onOpenDay} refreshKey={refreshKey} />
      <p className="try-asking">Try asking</p>
      <div className="suggestions">
        <button type="button" data-testid="suggestion-emotion-button" onClick={() => void ask(suggestions[0])}>
          <Wand2 size={14} />
          {suggestions[0]}
        </button>
        <button type="button" data-testid="suggestion-summary-button" onClick={() => void ask(suggestions[1])}>
          <Bot size={14} />
          {suggestions[1]}
        </button>
      </div>
      <div className="chat-thread">
        {messages.map((item, i) =>
          item.role === "ai" ? (
            <div key={i} className="chat-ai-block">
              <div className="chat-ai-row">
                <Sparkles size={16} className="chat-ai-icon" aria-hidden="true" />
                <p className="chat-ai">{item.text}</p>
              </div>
              {item.sources.length > 0 && (
                <div className="ask-sources" aria-label="Sources">
                  {item.sources.map((hit) => (
                    <button
                      key={`${hit.date}-${hit.score}`}
                      type="button"
                      className="ask-source-chip"
                      onClick={() => onOpenDay(hit.date)}
                      title={formatNoteHeader(noteDateToDate(hit.date))}
                    >
                      {noteDateToDate(hit.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div key={i} className="chat-you-block">
              <span className="message-icon">You</span>
              <p className="chat-you">{item.text}</p>
            </div>
          ),
        )}
        {phase === "searching" && (
          <p className="chat-ai" role="status">
            Searching your notes…
          </p>
        )}
        {phase === "answering" && !messages.some((item) => item.role === "ai" && item.text) && (
          <p className="chat-ai" role="status">
            Thinking…
          </p>
        )}
      </div>
      <form
        className="chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(draft);
        }}
      >
        <input
          value={draft}
          placeholder="Ask about your notes..."
          aria-label="Ask about your notes"
          onChange={(e) => setDraft(e.currentTarget.value)}
          data-testid="ai-chat-input"
        />
        {phase === "answering" ? (
          <button type="button" className="send-up" aria-label="Stop" data-testid="ai-chat-stop-button" onClick={() => void stop()}>
            <Square size={12} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="submit"
            className="send-up"
            aria-label="Send message"
            data-testid="ai-chat-send-button"
            disabled={!draft.trim() || phase === "searching"}
          >
            <ArrowUp size={16} aria-hidden="true" />
          </button>
        )}
      </form>
      <p className="companion-foot">
        <i />
        Your thoughts stay on this device
      </p>
    </aside>
  );
}
