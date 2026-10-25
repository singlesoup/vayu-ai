// The note editor (task 1.6.1). What the user types is exactly what reaches
// the disk as Markdown. The backdrop paints live preview; the textarea keeps
// the source and receives keyboard input. A drawn caret follows the preview,
// because hidden syntax markers are not given layout width.

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Bold, Italic, Link2, List, Quote } from "lucide-react";
import {
  deleteBackward,
  deleteForward,
  renderNoteBackdrop,
  stepCursor,
} from "../lib/noteLivePreview";
import { toggleTask } from "../lib/tasks";
import {
  insertWikiLink,
  wikiTriggerAt,
  type WikiTrigger,
} from "../lib/wikiAutocomplete";

type Props = {
  value: string;
  onChange: (content: string) => void;
  ariaLabel?: string;
  /** Quiet markdown toolbar (journal redesign). */
  formatBar?: boolean;
  /** Link targets for wiki `[[` autocomplete. Defaults to none (classic editor). */
  wikiTargets?: string[];
};

type Range = { start: number; end: number };

export function Editor({ value, onChange, ariaLabel = "Note", formatBar = false, wikiTargets = [] }: Props) {
  const stackRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const savedSel = useRef<Range>({ start: 0, end: 0 });
  const [range, setRange] = useState<Range>({ start: 0, end: 0 });
  const [wikiOpen, setWikiOpen] = useState(false);
  const [wikiMatches, setWikiMatches] = useState<string[]>([]);
  const [wikiBox, setWikiBox] = useState<{ left: number; top: number; height: number } | null>(null);
  const [wikiIndex, setWikiIndex] = useState(0);
  const wikiStart = useRef(0);
  const undoStackRef = useRef<Array<{ text: string; caret: number }>>([]);
  const redoStackRef = useRef<Array<{ text: string; caret: number }>>([]);
  const isUndoRedoRef = useRef(false);

  const backdropHtml = renderNoteBackdrop(value, range.end, range.start === range.end ? null : range);

  function apply(next: string, caret: number) {
    if (!isUndoRedoRef.current && next !== value) {
      undoStackRef.current.push({ text: value, caret: range.end });
      if (undoStackRef.current.length > 50) undoStackRef.current.shift();
      redoStackRef.current = [];
    }
    pendingCaret.current = caret;
    setRange({ start: caret, end: caret });
    onChange(next);
    isUndoRedoRef.current = false;
  }

  /** Screen-relative caret box (relative to the editor stack), or null. */
  function findCaretBox(pos: number): { left: number; top: number; height: number } | null {
    const stack = stackRef.current;
    const backdrop = backdropRef.current;
    if (!stack || !backdrop) return null;
    const spans = [...backdrop.querySelectorAll<HTMLElement>("[data-start]")];
    let box: { left: number; top: number; height: number } | null = null;

    for (const el of spans) {
      const start = Number(el.dataset.start);
      const end = Number(el.dataset.end);
      const text = el.textContent ?? "";
      if (el.dataset.widget || text === "\u200b" || text.length !== end - start) continue;
      if (pos < start || pos > end) continue;
      const node = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
      if (!node) continue;
      const probe = document.createRange();
      const offset = Math.min(pos - start, node.textContent?.length ?? 0);
      probe.setStart(node, offset);
      probe.setEnd(node, offset);
      if (typeof probe.getBoundingClientRect !== "function") continue;
      const rect = probe.getBoundingClientRect();
      if (rect.height === 0) continue;
      box = { left: rect.left, top: rect.top, height: rect.height };
      break;
    }

    if (!box) {
      const anchors = spans.filter((el) => Number(el.dataset.end) <= pos);
      const el = anchors[anchors.length - 1];
      if (el) {
        const rect = el.getBoundingClientRect();
        box = { left: rect.right, top: rect.top, height: rect.height || 24 };
      }
    }
    if (!box) {
      // Defensive fallback: place the dropdown at the top-left of the stack.
      box = { left: 0, top: 0, height: 24 };
    }
    const stackRect = stack.getBoundingClientRect();
    return {
      left: box.left - stackRect.left + stack.scrollLeft,
      top: box.top - stackRect.top + stack.scrollTop,
      height: box.height,
    };
  }

  function placeCaret() {
    const stack = stackRef.current;
    const backdrop = backdropRef.current;
    const caret = caretRef.current;
    const area = areaRef.current;
    if (!stack || !backdrop || !caret || !area) return;
    const collapsed = range.start === range.end;
    caret.hidden = !collapsed;
    if (!collapsed) return;
    const pos = range.end;
    const box = findCaretBox(pos);
    if (!box) return;
    if (
      wikiBox &&
      wikiBox.left === box.left &&
      wikiBox.top === box.top &&
      wikiBox.height === box.height
    )
      return;
    setWikiBox(box);
    const top = box.top;
    const left = box.left;
    caret.style.top = `${top}px`;
    caret.style.left = `${left}px`;
    caret.style.height = `${box.height}px`;
    const viewTop = stack.scrollTop;
    const viewBottom = viewTop + stack.clientHeight;
    if (top < viewTop) stack.scrollTop = Math.max(0, top - 8);
    else if (top + box.height > viewBottom) stack.scrollTop = top + box.height - stack.clientHeight + 8;
  }

  const placeCaretRef = useRef(placeCaret);

  useLayoutEffect(() => {
    const area = areaRef.current;
    if (area && pendingCaret.current != null) {
      const caret = pendingCaret.current;
      pendingCaret.current = null;
      area.setSelectionRange(caret, caret);
    }
    placeCaretRef.current = placeCaret;
    placeCaretRef.current();
  }, [range]);

  function hitElement(clientX: number, clientY: number): Element | null {
    const area = areaRef.current;
    const backdrop = backdropRef.current;
    if (!area || !backdrop || typeof document.elementFromPoint !== "function") return null;
    const prevArea = area.style.pointerEvents;
    const prevBack = backdrop.style.pointerEvents;
    area.style.pointerEvents = "none";
    backdrop.style.pointerEvents = "auto";
    const hit = document.elementFromPoint(clientX, clientY);
    area.style.pointerEvents = prevArea;
    backdrop.style.pointerEvents = prevBack;
    return hit;
  }

  function indexFromPoint(clientX: number, clientY: number): { index: number; taskLine?: number } {
    const backdrop = backdropRef.current;
    if (!backdrop) return { index: 0 };
    const hit = hitElement(clientX, clientY);
    if (!hit || !backdrop.contains(hit)) return { index: value.length };
    const widget = (hit as HTMLElement).closest<HTMLElement>("[data-widget]");
    if (widget?.dataset.widget === "task") {
      return { index: Number(widget.dataset.end), taskLine: Number(widget.dataset.line) };
    }
    const span = (hit as HTMLElement).closest<HTMLElement>("[data-start]");
    if (span) {
      const start = Number(span.dataset.start);
      const end = Number(span.dataset.end);
      if (span.dataset.widget || span.textContent === "\u200b" || start === end) return { index: end || start };
      const text = span.textContent ?? "";
      const node = [...span.childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
      if (!node || text.length !== end - start) return { index: start };
      const len = node.textContent?.length ?? 0;
      let best = start;
      const probe = document.createRange();
      for (let i = 0; i <= len; i++) {
        probe.setStart(node, i);
        probe.setEnd(node, i);
        if (typeof probe.getBoundingClientRect !== "function") return { index: start };
        const rect = probe.getBoundingClientRect();
        best = start + i;
        if (rect.left >= clientX - 0.5) break;
      }
      return { index: best };
    }
    const line = (hit as HTMLElement).closest<HTMLElement>(".md-line");
    if (line) return { index: Number(line.dataset.lineEnd) };
    return { index: value.length };
  }

  function rememberSelection() {
    const area = areaRef.current;
    if (!area) return;
    savedSel.current = { start: area.selectionStart, end: area.selectionEnd };
  }

  function currentSelection(): Range {
    const area = areaRef.current;
    if (area && document.activeElement === area) {
      return { start: area.selectionStart, end: area.selectionEnd };
    }
    return savedSel.current;
  }

  function applyWrap(before: string, after = before) {
    const area = areaRef.current;
    if (!area) return;
    const { start, end } = currentSelection();
    const selected = value.slice(start, end);
    if (value.slice(start - before.length, start) === before && value.slice(end, end + after.length) === after) {
      const next = value.slice(0, start - before.length) + selected + value.slice(end + after.length);
      apply(next, start - before.length + selected.length);
      return;
    }
    if (selected.startsWith(before) && selected.endsWith(after) && selected.length >= before.length + after.length) {
      const inner = selected.slice(before.length, selected.length - after.length);
      apply(value.slice(0, start) + inner + value.slice(end), start + inner.length);
      return;
    }
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    const caret = selected.length === 0 ? start + before.length : start + before.length + selected.length + after.length;
    apply(next, caret);
  }

  function togglePrefix(prefix: string) {
    const area = areaRef.current;
    if (!area) return;
    const { start } = currentSelection();
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const nl = value.indexOf("\n", start);
    const lineEnd = nl === -1 ? value.length : nl;
    const line = value.slice(lineStart, lineEnd);
    if (/^[-*]\s+\[[ xX]\]/.test(line)) return;
    if (line.startsWith(prefix)) {
      const next = value.slice(0, lineStart) + line.slice(prefix.length) + value.slice(lineEnd);
      apply(next, Math.max(lineStart, start - prefix.length));
      return;
    }
    const next = value.slice(0, lineStart) + prefix + line + value.slice(lineEnd);
    apply(next, start + prefix.length);
  }

  function onAreaMouseDown(e: MouseEvent<HTMLTextAreaElement>) {
    if (e.button !== 0) return;
    setWikiOpen(false);
    setWikiMatches([]);
    if (typeof document.elementFromPoint !== "function") return;
    e.preventDefault();
    const area = areaRef.current;
    const backdrop = backdropRef.current;
    if (!area || !backdrop) return;
    area.focus();
    const direct = hitElement(e.clientX, e.clientY);
    const box = (direct as HTMLElement | null)?.closest<HTMLElement>("[data-widget='task']");
    if (box && backdrop.contains(box)) {
      apply(toggleTask(value, Number(box.dataset.line)), range.end);
      return;
    }
    const origin = indexFromPoint(e.clientX, e.clientY).index;
    area.setSelectionRange(origin, origin);
    savedSel.current = { start: origin, end: origin };
    setRange({ start: origin, end: origin });
    const move = (ev: globalThis.MouseEvent) => {
      const next = indexFromPoint(ev.clientX, ev.clientY).index;
      const a = Math.min(origin, next);
      const b = Math.max(origin, next);
      area.setSelectionRange(a, b);
      savedSel.current = { start: a, end: b };
      setRange({ start: a, end: b });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  function onEnterList(e: KeyboardEvent<HTMLTextAreaElement>): boolean {
    if (e.key !== "Enter") return false;
    const area = areaRef.current;
    if (!area) return false;
    const caret = area.selectionStart;
    const before = value.slice(0, caret);
    const after = value.slice(caret);
    const lineStart = before.lastIndexOf("\n") + 1;
    const lineEndRel = after.indexOf("\n");
    const lineEndAbs = lineEndRel === -1 ? value.length : caret + lineEndRel;
    // List continuation only when the caret sits at the end of the line.
    if (caret !== lineEndAbs) return false;
    const line = value.slice(lineStart, lineEndAbs);

    // Task line: `- [ ] text` / `- [x] text`
    const t = /^(\s*)([-*])\s+\[( |x|X)\]\s*(.*)$/.exec(line);
    if (t) {
      const indent = t[1];
      const marker = t[2];
      const done = t[3] !== " ";
      const text = t[4];
      if (text.trim() === "") {
        const next = value.slice(0, lineStart) + value.slice(lineEndAbs);
        e.preventDefault();
        apply(next, lineStart);
      } else {
        const next =
          value.slice(0, lineEndAbs) +
          "\n" +
          indent +
          marker +
          ` [${done ? "x" : " "}] ` +
          value.slice(lineEndAbs);
        const pos =
          lineEndAbs +
          1 +
          indent.length +
          marker.length +
          ` [${done ? "x" : " "}] `.length;
        e.preventDefault();
        apply(next, pos);
      }
      return true;
    }

    // Bullet line: `- text` / `* text`
    const b = /^(\s*)([-*])\s+(.*)$/.exec(line);
    if (b) {
      const indent = b[1];
      const marker = b[2];
      const text = b[3];
      if (text.trim() === "") {
        const next = value.slice(0, lineStart) + value.slice(lineEndAbs);
        e.preventDefault();
        apply(next, lineStart);
      } else {
        const next = value.slice(0, lineEndAbs) + "\n" + indent + marker + " " + value.slice(lineEndAbs);
        const pos = lineEndAbs + 1 + indent.length + marker.length + 1;
        e.preventDefault();
        apply(next, pos);
      }
      return true;
    }

    // Numbered list: `1. text`
    const n = /^(\s*)(\d+)\.\s+(.*)$/.exec(line);
    if (n) {
      const indent = n[1];
      const num = Number(n[2]) + 1;
      const text = n[3];
      if (text.trim() === "") {
        const next = value.slice(0, lineStart) + value.slice(lineEndAbs);
        e.preventDefault();
        apply(next, lineStart);
      } else {
        const next = value.slice(0, lineEndAbs) + "\n" + indent + num + ". " + value.slice(lineEndAbs);
        const pos = lineEndAbs + 1 + indent.length + String(num).length + 2;
        e.preventDefault();
        apply(next, pos);
      }
      return true;
    }

    // Plain Enter: insert a newline at the caret.
    e.preventDefault();
    const next = value.slice(0, caret) + "\n" + value.slice(caret);
    apply(next, caret + 1);
    return true;
  }

  function onFormatShortcut(e: KeyboardEvent<HTMLTextAreaElement>): boolean {
    if (!e.ctrlKey || e.altKey || e.metaKey) return false;
    if (!e.shiftKey && (e.code === "KeyB" || e.key.toLowerCase() === "b")) {
      e.preventDefault();
      applyWrap("**");
      return true;
    }
    if (!e.shiftKey && (e.code === "KeyI" || e.key.toLowerCase() === "i")) {
      e.preventDefault();
      applyWrap("*");
      return true;
    }
    // Ctrl+K stays with the sidebar search. Do not wrap a link here.
    if (e.shiftKey && (e.code === "Quote" || e.key === "'" || e.key === "\"")) {
      e.preventDefault();
      togglePrefix("> ");
      return true;
    }
    if (e.shiftKey && (e.code === "Digit8" || e.key === "8" || e.key === "*")) {
      e.preventDefault();
      togglePrefix("- ");
      return true;
    }
    return false;
  }

  function onAreaKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    const area = areaRef.current;
    if (!area) return;
    const caret = area.selectionStart;

    // Wiki `[[` autocomplete takes precedence over caret navigation while open.
    if (wikiOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setWikiIndex((i) => (i + 1) % wikiMatches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setWikiIndex((i) => (i - 1 + wikiMatches.length) % wikiMatches.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const topic = wikiMatches[wikiIndex];
        if (topic) {
          const { text, caret: nextCaret } = insertWikiLink(value, caret, wikiStart.current, topic);
          apply(text, nextCaret);
        }
        setWikiOpen(false);
        setWikiMatches([]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setWikiOpen(false);
        setWikiMatches([]);
        return;
      }
      // Any other key falls through to normal editing (keeps typing the prefix).
    }

    // System shortcut parity: explicit undo/redo stack, because a controlled
    // value replacement breaks the browser's native undo.
    if (e.ctrlKey && !e.altKey && !e.metaKey && (e.key === "z" || e.key === "y")) {
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const entry = undoStackRef.current.pop();
        if (entry) {
          redoStackRef.current.push({ text: value, caret: range.end });
          isUndoRedoRef.current = true;
          apply(entry.text, entry.caret);
        }
        return;
      }
      const isRedo = e.key === "y" && !e.shiftKey || e.key === "z" && e.shiftKey;
      if (isRedo) {
        e.preventDefault();
        const entry = redoStackRef.current.pop();
        if (entry) {
          undoStackRef.current.push({ text: value, caret: range.end });
          isUndoRedoRef.current = true;
          apply(entry.text, entry.caret);
        }
        return;
      }
    }

    if (onEnterList(e)) return;
    if (onFormatShortcut(e)) return;
    const collapsed = area.selectionStart === area.selectionEnd;
    if (e.key === "Backspace" && collapsed) {
      e.preventDefault();
      const next = deleteBackward(value, area.selectionStart);
      apply(next.text, next.cursor);
      return;
    }
    if (e.key === "Delete" && collapsed) {
      e.preventDefault();
      const next = deleteForward(value, area.selectionStart);
      apply(next.text, next.cursor);
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const dir = e.key === "ArrowLeft" ? -1 : 1;
      const focus = e.shiftKey ? range.end : area.selectionEnd;
      const next = stepCursor(value, focus, dir);
      const anchor = e.shiftKey ? range.start : next;
      const a = Math.min(anchor, next);
      const b = Math.max(anchor, next);
      area.setSelectionRange(a, b);
      setRange(e.shiftKey ? { start: anchor, end: next } : { start: next, end: next });
      return;
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const going = e.key === "ArrowUp" ? -1 : 1;
      const box = findCaretBox(range.end);
      if (!box) return;
      const hit = indexFromPoint(
        box.left + 1,
        going < 0 ? box.top - 4 : box.top + box.height + 4,
      );
      area.setSelectionRange(hit.index, hit.index);
      setRange({ start: hit.index, end: hit.index });
    }
  }

  return (
    <div className="note-body">
      <div className="note-editor-stack" ref={stackRef}>
        <div
          ref={backdropRef}
          className="note-editor-backdrop"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: backdropHtml }}
        />
        <span ref={caretRef} className="note-caret" aria-hidden="true" />
          <textarea
            ref={areaRef}
            className="note-editor note-editor-overlay"
            aria-label={ariaLabel}
            value={value}
            onChange={(e) => {
              const { value: nextValue, selectionStart, selectionEnd } = e.currentTarget;
              const next = { start: selectionStart, end: selectionEnd };
              savedSel.current = next;
              apply(nextValue, selectionEnd);

              const trigger: WikiTrigger | null = wikiTriggerAt(nextValue, next.start);
              if (trigger && trigger.prefix.length < 60) {
                const matches = wikiTargets.filter((t) =>
                  t.startsWith(trigger.prefix.toLowerCase()),
                );
                setWikiOpen(matches.length > 0);
                setWikiMatches(matches);
                setWikiIndex(0);
                wikiStart.current = trigger.start;
              } else {
                setWikiOpen(false);
                setWikiMatches([]);
              }
            }}
            onMouseDown={onAreaMouseDown}
            onKeyDown={onAreaKeyDown}
            spellCheck={false}
          />
          {wikiOpen && wikiMatches.length > 0 && (
            <div
              role="listbox"
              aria-label="Wiki links"
              data-testid="wiki-dropdown"
              style={{
                position: "absolute",
                left: wikiBox?.left ?? 0,
                top: (wikiBox?.top ?? 0) + (wikiBox?.height ?? 24),
                minWidth: 120,
                maxHeight: 160,
                overflowY: "auto",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "6px",
                boxShadow: "var(--shadow-lg)",
                zIndex: 10,
                padding: 0,
                margin: 0,
              }}
            >
              {wikiMatches.map((topic, i) => {
                const active = i === wikiIndex;
                return (
                  <button
                    key={topic}
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-testid={`wiki-option-${i}`}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "6px 10px",
                      textAlign: "left",
                      background: active ? "var(--color-breeze)" : "transparent",
                      color: active ? "var(--color-on-accent)" : "var(--color-text)",
                      border: 0,
                      borderBottom: "1px solid var(--color-border)",
                      fontFamily: "var(--font-ui)",
                      fontSize: "var(--text-small)",
                      cursor: "pointer",
                    }}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      const area = areaRef.current;
                      const { text, caret: nextCaret } = insertWikiLink(
                        value,
                        area?.selectionStart ?? 0,
                        wikiStart.current,
                        topic,
                      );
                      apply(text, nextCaret);
                      setWikiOpen(false);
                      setWikiMatches([]);
                    }}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      {formatBar && (
        <div className="format-bar" data-testid="format-bar">
          <div className="format-tools">
            <button type="button" aria-label="Bold" data-testid="format-bold-button" onMouseDown={rememberSelection} onClick={() => applyWrap("**")}>
              <Bold size={15} />
            </button>
            <button type="button" aria-label="Italic" data-testid="format-italic-button" onMouseDown={rememberSelection} onClick={() => applyWrap("*")}>
              <Italic size={15} />
            </button>
            <button type="button" aria-label="Quote" data-testid="format-quote-button" onMouseDown={rememberSelection} onClick={() => togglePrefix("> ")}>
              <Quote size={15} />
            </button>
            <button type="button" aria-label="List" data-testid="format-list-button" onMouseDown={rememberSelection} onClick={() => togglePrefix("- ")}>
              <List size={15} />
            </button>
            <button type="button" aria-label="Link" data-testid="format-link-button" onMouseDown={rememberSelection} onClick={() => applyWrap("[", "](https://)")}>
              <Link2 size={15} />
            </button>
          </div>
          <span data-testid="markdown-supported-label">Markdown supported</span>
        </div>
      )}
    </div>
  );
}
