import { useEffect, useState } from "react";
import { ArrowUp, Bot, ChevronDown, Lightbulb, Sparkles, Wand2 } from "lucide-react";
import { generate, readNote } from "../lib/api";
import { type NoteDate } from "../lib/noteFile";

type Props = {
  date: NoteDate;
  open: boolean;
  refreshKey: number;
};

export function CompanionPanel({ date, open, refreshKey }: Props) {
  const [title, setTitle] = useState("Today");
  const [body, setBody] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<{ role: "you" | "ai"; text: string }[]>([]);
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    void readNote(date)
      .then((note) => {
        const heading = note.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
        setTitle(heading || "Today");
        setBody(note.content);
      })
      .catch(() => {
        setTitle("Today");
        setBody("");
      });
  }, [date, refreshKey]);

  function ask(text: string) {
    const q = text.trim();
    if (!q) return;
    setMessages((items) => [...items, { role: "you", text: q }]);
    setDraft("");
    setThinking(true);
    let reply = "";
    void generate(
      `You are Vayu, a local journal companion. Answer using only this entry.\n\nTitle: ${title}\n\n${body}\n\nQuestion: ${q}`,
      (event) => {
        if (event.event === "done") setThinking(false);
        if (event.event === "token") {
          setThinking(false);
          reply += event.value;
          const snapshot = reply;
          setMessages((items) => {
            const next = items.slice();
            const last = next[next.length - 1];
            if (last?.role === "ai") next[next.length - 1] = { role: "ai", text: snapshot };
            else next.push({ role: "ai", text: snapshot });
            return next;
          });
        }
      },
    ).catch(() => {
      setThinking(false);
      setMessages((items) => [...items, { role: "ai", text: "Couldn't reach the local model." }]);
    });
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
      <p className="try-asking">Try asking</p>
      <div className="suggestions">
        <button type="button" data-testid="suggestion-emotion-button" onClick={() => ask("What is the emotional thread?")}>
          <Wand2 size={14} />
          What is the emotional thread?
        </button>
        <button type="button" data-testid="suggestion-summary-button" onClick={() => ask("Summarize this entry")}>
          <Bot size={14} />
          Summarize this entry
        </button>
      </div>
      <div className="chat-thread">
        {messages.map((item, i) =>
          item.role === "ai" ? (
            <div key={i} className="chat-ai-row">
              <Sparkles size={16} className="chat-ai-icon" aria-hidden="true" />
              <p className="chat-ai">{item.text}</p>
            </div>
          ) : (
            <div key={i} className="chat-you-block">
              <span className="message-icon">You</span>
              <p className="chat-you">{item.text}</p>
            </div>
          ),
        )}
        {thinking && (
          <div className="chat-ai-row">
            <Sparkles size={16} className="chat-ai-icon" aria-hidden="true" />
            <p className="chat-ai">Thinking…</p>
          </div>
        )}
      </div>
      <form
        className="chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
      >
        <input
          value={draft}
          placeholder="Ask about this entry..."
          onChange={(e) => setDraft(e.currentTarget.value)}
          data-testid="ai-chat-input"
        />
        <button type="submit" className="send-up" aria-label="Send message" data-testid="ai-chat-send-button" disabled={!draft.trim()}>
          <ArrowUp size={16} aria-hidden="true" />
        </button>
      </form>
      <p className="companion-foot">
        <i />
        Your thoughts stay on this device
      </p>
    </aside>
  );
}
