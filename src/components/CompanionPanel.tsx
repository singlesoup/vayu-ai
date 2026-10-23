import { useEffect, useState } from "react";
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
    let reply = "";
    void generate(
      `You are Vayu, a local journal companion. Answer using only this entry.\n\nTitle: ${title}\n\n${body}\n\nQuestion: ${q}`,
      (event) => {
        if (event.event === "token") {
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
      setMessages((items) => [...items, { role: "ai", text: "Couldn't reach the local model." }]);
    });
  }

  if (!open) return null;

  return (
    <aside className="companion" aria-label="Reflect with Vayu">
      <p className="flow-kicker">Local companion</p>
      <h2>Reflect with Vayu</h2>
      <div className="context-card">
        <p className="flow-kicker">Current context</p>
        <strong>{title}</strong>
        <p>{body.replace(/^#.*\n/, "").trim().slice(0, 140) || "This entry is still empty."}</p>
      </div>
      <div className="suggestions">
        <button type="button" onClick={() => ask("What is the emotional thread?")}>
          What is the emotional thread?
        </button>
        <button type="button" onClick={() => ask("Summarize this entry")}>
          Summarize this entry
        </button>
      </div>
      <div className="chat-thread">
        {messages.map((item, i) => (
          <p key={i} className={item.role === "ai" ? "chat-ai" : "chat-you"}>
            {item.text}
          </p>
        ))}
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
        />
        <button type="submit" className="btn-primary" disabled={!draft.trim()}>
          Send
        </button>
      </form>
      <p className="companion-foot">Your thoughts stay on this device</p>
    </aside>
  );
}
