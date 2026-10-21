// Task 3.1/3.2: Journal chat — one italic Newsreader Gemma question at a time,
// streamed with Stop + thinking state, saved to the day's note. Deleted turns
// leave context (the prompt is rebuilt from the remaining turns).
import { useEffect, useRef, useState } from "react";
import { appendNote, generate, stopGeneration } from "../lib/api";
import { isApiErrorLike } from "../lib/apiErrors";
import { formatNoteHeader } from "../lib/dateFormat";
import { type NoteDate } from "../lib/noteFile";

const SYSTEM =
  "You are Vayu's journaling companion. Ask ONE short, warm question at a time " +
  "to help the user reflect on their day. Never list multiple questions. Keep " +
  "replies under three sentences.";

type Role = "gemma" | "user";

type Message = { role: Role; text: string };

type Props = {
  date: NoteDate;
  /** Fired after the journal is saved to the note, so the parent can refresh. */
  onSaved?: () => void;
};

function buildPrompt(messages: Message[]): string {
  const lines = messages.map((m) => (m.role === "user" ? "User: " : "Gemma: ") + m.text);
  return `${SYSTEM}\n\nConversation:\n${lines.join("\n")}\nGemma:`;
}

export function JournalChat({ date, onSaved }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accumulator = useRef("");

  /** Start the journal: Gemma asks the first question. */
  useEffect(() => {
    const timer = setTimeout(() => {
      setStreaming(true);
      accumulator.current = "";
      void generate(
        `${SYSTEM}\n\nStart the journal with ONE short, warm opening question.`,
        (event) => {
          if (event.event === "token") accumulator.current += event.value;
          if (event.event === "done") {
            setStreaming(false);
            setMessages((msgs) => [...msgs, { role: "gemma", text: accumulator.current.trim() }]);
          }
        },
      ).catch((err) => {
        setStreaming(false);
        setError(isApiErrorLike(err) ? err.message : "Couldn't start the journal.");
      });
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const sendUserMessage = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setError(null);
    setStreaming(true);
    accumulator.current = "";
    setMessages((msgs) => [...msgs, { role: "user", text }]);

    try {
      await generate(buildPrompt([...messages, { role: "user", text }]), (event) => {
        if (event.event === "token") accumulator.current += event.value;
        if (event.event === "done") {
          setStreaming(false);
          setMessages((msgs) => [...msgs, { role: "gemma", text: accumulator.current.trim() }]);
        }
      });
    } catch (err) {
      setStreaming(false);
      setError(isApiErrorLike(err) ? err.message : "Couldn't get a reply.");
    }
  };

  const deleteTurn = (index: number) => {
    setMessages((msgs) => msgs.filter((_, i) => i !== index));
  };

  const save = async () => {
    if (messages.length === 0) return;
    const lines = messages.map((m) => (m.role === "user" ? "> " : "") + m.text);
    const section =
      "\n\n## Journal — " +
      formatNoteHeader(new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), 12)) +
      "\n\n" +
      lines.join("\n") +
      "\n";
    await appendNote(date, section);
    onSaved?.();
  };

  const stop = async () => {
    await stopGeneration();
    setStreaming(false);
    if (accumulator.current.trim()) {
      setMessages((msgs) => [...msgs, { role: "gemma", text: accumulator.current.trim() }]);
    }
  };

  return (
    <section className="journal-chat" aria-label="Journal chat">
      <h2>Journal chat</h2>
      {error && (
        <p className="form-error" role="status">
          {error}
          <button type="button" onClick={() => setError(null)}>Dismiss</button>
        </p>
      )}
      <div className="journal-transcript">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "journal-user" : "journal-gemma"}>
            <span className="journal-role">{m.role === "user" ? "You" : "Gemma"}</span>
            <span className="journal-text">{m.text}</span>
            <button type="button" className="btn-ghost" onClick={() => deleteTurn(i)} aria-label="Delete turn">
              ×
            </button>
          </div>
        ))}
        {streaming && <p className="journal-streaming">Gemma is thinking…</p>}
      </div>
      {streaming && (
        <button type="button" className="btn-ghost" onClick={stop} aria-label="Stop">
          Stop
        </button>
      )}
      <div className="journal-input">
        <textarea
          placeholder="Write your reply…"
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendUserMessage();
            }
          }}
        />
        <button type="button" className="btn-primary" disabled={!input.trim() || streaming} onClick={sendUserMessage}>
          Send
        </button>
      </div>
      <button type="button" className="btn-primary" onClick={save} disabled={messages.length === 0}>
        Save to today's note
      </button>
    </section>
  );
}
