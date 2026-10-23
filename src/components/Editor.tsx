// The note editor (task 1.6.1). What the user types is exactly what reaches
// the disk as Markdown. A highlight layer paints [[topics]] in Breeze while
// the textarea itself stays the single source of truth (transparent text).

import { useLayoutEffect, useRef } from "react";
import { Bold, Italic, Link2, List, Quote } from "lucide-react";

type Props = {
  value: string;
  onChange: (content: string) => void;
  ariaLabel?: string;
  /** Quiet markdown toolbar (journal redesign). */
  formatBar?: boolean;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Highlight `[[topic]]` — brackets muted, topic text in Breeze. */
function highlightWikiLinks(md: string): string {
  const escaped = escapeHtml(md);
  return escaped.replace(
    /\[\[([^\][]+?)\]\]/g,
    (_m, topic: string) =>
      `<span class="wiki-brackets">[[</span><span class="wiki-topic">${topic}</span><span class="wiki-brackets">]]</span>`,
  );
}

export function Editor({ value, onChange, ariaLabel = "Note", formatBar = false }: Props) {
  const backdropRef = useRef<HTMLPreElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const area = areaRef.current;
    const backdrop = backdropRef.current;
    if (!area || !backdrop) return;
    backdrop.scrollTop = area.scrollTop;
    backdrop.scrollLeft = area.scrollLeft;
  }, [value]);

  function wrap(before: string, after = before) {
    const area = areaRef.current;
    if (!area) return;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const selected = value.slice(start, end);
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
  }

  return (
    <div className="note-body">
      <div className="note-editor-stack">
        <pre
          ref={backdropRef}
          className="note-editor-backdrop"
          aria-hidden="true"
          dangerouslySetInnerHTML={{
            __html: highlightWikiLinks(value) + (value.endsWith("\n") ? " " : ""),
          }}
        />
        <textarea
          ref={areaRef}
          className="note-editor note-editor-overlay"
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          onScroll={(e) => {
            const backdrop = backdropRef.current;
            if (!backdrop) return;
            backdrop.scrollTop = e.currentTarget.scrollTop;
            backdrop.scrollLeft = e.currentTarget.scrollLeft;
          }}
          spellCheck={false}
        />
      </div>
      {formatBar && (
        <div className="format-bar">
          <div className="format-tools">
            <button type="button" aria-label="Bold" data-testid="format-bold-button" onClick={() => wrap("**")}>
              <Bold size={15} />
            </button>
            <button type="button" aria-label="Italic" data-testid="format-italic-button" onClick={() => wrap("*")}>
              <Italic size={15} />
            </button>
            <button type="button" aria-label="Quote" data-testid="format-quote-button" onClick={() => wrap("> ", "")}>
              <Quote size={15} />
            </button>
            <button type="button" aria-label="List" data-testid="format-list-button" onClick={() => wrap("- ", "")}>
              <List size={15} />
            </button>
            <button type="button" aria-label="Link" data-testid="format-link-button" onClick={() => wrap("[", "](https://)")}>
              <Link2 size={15} />
            </button>
          </div>
          <span>Markdown supported</span>
        </div>
      )}
    </div>
  );
}
