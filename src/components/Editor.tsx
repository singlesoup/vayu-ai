// The note editor (task 1.6.1). What the user types is exactly what reaches
// the disk as Markdown. A highlight layer paints [[topics]] in Breeze while
// the textarea itself stays the single source of truth (transparent text).

import { useLayoutEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (content: string) => void;
  ariaLabel?: string;
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

export function Editor({ value, onChange, ariaLabel = "Note" }: Props) {
  const backdropRef = useRef<HTMLPreElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const area = areaRef.current;
    const backdrop = backdropRef.current;
    if (!area || !backdrop) return;
    backdrop.scrollTop = area.scrollTop;
    backdrop.scrollLeft = area.scrollLeft;
  }, [value]);

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
    </div>
  );
}
