// Live preview for the note backdrop. Disk markdown stays exact in the textarea.
// Markers that are only syntax (`**`, `- [ ]`, …) are omitted from the layout so
// they do not leave a gap. The cursor reveals a token when it sits on its markers.

import { TASK_LINE } from "./tasks";

export type HiddenRange = {
  start: number;
  end: number;
  /** Collapse a caret inside this range to `end` (opening mark) or `start` (closing). */
  edge: "start" | "end";
};

type Sel = { start: number; end: number };

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function cursorOnMarkers(
  cursor: number | null,
  start: number,
  innerStart: number,
  innerEnd: number,
  end: number,
): boolean {
  if (cursor == null) return false;
  if (innerStart === innerEnd && cursor === innerStart) return true;
  const onOpen = cursor > start && cursor < innerStart;
  const onClose = cursor > innerEnd && cursor < end;
  return onOpen || onClose;
}

function textSpans(text: string, start: number, className: string | undefined, sel: Sel | null): string {
  if (text.length === 0) return "";
  const pieces: Array<{ text: string; start: number; selected: boolean }> = [];
  const selStart = sel && sel.start !== sel.end ? Math.min(sel.start, sel.end) : null;
  const selEnd = sel && sel.start !== sel.end ? Math.max(sel.start, sel.end) : null;
  if (selStart == null || selEnd == null) {
    pieces.push({ text, start, selected: false });
  } else {
    const end = start + text.length;
    const a = Math.max(start, selStart);
    const b = Math.min(end, selEnd);
    if (a > start) pieces.push({ text: text.slice(0, a - start), start, selected: false });
    if (b > a) pieces.push({ text: text.slice(a - start, b - start), start: a, selected: true });
    if (end > b) pieces.push({ text: text.slice(b - start), start: b, selected: false });
    if (pieces.length === 0) pieces.push({ text, start, selected: false });
  }
  return pieces
    .filter((p) => p.text.length > 0)
    .map((p) => {
      const classes = [className, p.selected ? "md-selected" : ""].filter(Boolean).join(" ");
      const cls = classes ? ` class="${classes}"` : "";
      return `<span${cls} data-start="${p.start}" data-end="${p.start + p.text.length}">${escapeHtml(p.text)}</span>`;
    })
    .join("");
}

type Built = { html: string; hidden: HiddenRange[] };

function inline(
  text: string,
  base: number,
  cursor: number | null,
  sel: Sel | null,
): Built {
  const hidden: HiddenRange[] = [];
  const re =
    /\[\[([^\][]+?)\]\]|\*\*([^*\n]+?)\*\*|\*([^*\n]+?)\*|`([^`\n]+)`|\[([^\]\n]+)\]\(([^)\n]+)\)/g;
  let html = "";
  let last = 0;
  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > last) {
      html += textSpans(text.slice(last, index), base + last, undefined, sel);
    }
    const raw = match[0];
    const abs = base + index;
    const absEnd = abs + raw.length;
    if (match[1] != null) {
      const topic = match[1];
      const innerStart = abs + 2;
      const innerEnd = innerStart + topic.length;
      const onLink = cursor != null && cursor > abs && cursor < absEnd;
      if (onLink) {
        html += textSpans(raw, abs, undefined, sel);
      } else {
        hidden.push({ start: abs, end: innerStart, edge: "end" });
        hidden.push({ start: innerEnd, end: absEnd, edge: "start" });
        html += `<span class="wiki-topic">${textSpans(topic, innerStart, undefined, sel)}</span>`;
      }
    } else if (match[2] != null) {
      const inner = match[2];
      const innerStart = abs + 2;
      const innerEnd = innerStart + inner.length;
      if (cursorOnMarkers(cursor, abs, innerStart, innerEnd, absEnd)) {
        html += textSpans(raw, abs, undefined, sel);
      } else {
        hidden.push({ start: abs, end: innerStart, edge: "end" });
        hidden.push({ start: innerEnd, end: absEnd, edge: "start" });
        html += textSpans(inner, innerStart, "md-bold", sel);
      }
    } else if (match[3] != null) {
      const inner = match[3];
      const innerStart = abs + 1;
      const innerEnd = innerStart + inner.length;
      if (cursorOnMarkers(cursor, abs, innerStart, innerEnd, absEnd)) {
        html += textSpans(raw, abs, undefined, sel);
      } else {
        hidden.push({ start: abs, end: innerStart, edge: "end" });
        hidden.push({ start: innerEnd, end: absEnd, edge: "start" });
        html += textSpans(inner, innerStart, "md-em", sel);
      }
    } else if (match[4] != null) {
      const inner = match[4];
      const innerStart = abs + 1;
      const innerEnd = innerStart + inner.length;
      if (cursorOnMarkers(cursor, abs, innerStart, innerEnd, absEnd)) {
        html += textSpans(raw, abs, undefined, sel);
      } else {
        hidden.push({ start: abs, end: innerStart, edge: "end" });
        hidden.push({ start: innerEnd, end: absEnd, edge: "start" });
        html += textSpans(inner, innerStart, "md-code", sel);
      }
    } else if (match[5] != null && match[6] != null) {
      const label = match[5];
      const innerStart = abs + 1;
      const innerEnd = innerStart + label.length;
      if (cursorOnMarkers(cursor, abs, innerStart, innerEnd, absEnd) || (cursor != null && cursor > innerEnd && cursor < absEnd)) {
        html += textSpans(raw, abs, undefined, sel);
      } else {
        hidden.push({ start: abs, end: innerStart, edge: "end" });
        hidden.push({ start: innerEnd, end: absEnd, edge: "start" });
        html += textSpans(label, innerStart, "md-link-label", sel);
      }
    }
    last = index + raw.length;
  }
  if (last < text.length) html += textSpans(text.slice(last), base + last, undefined, sel);
  return { html, hidden };
}

function lineModel(line: string, lineStart: number, lineIndex: number, cursor: number | null, inFence: boolean, sel: Sel | null): Built {
  if (inFence || line.length === 0) {
    const html = line.length === 0
      ? `<span class="md-anchor" data-start="${lineStart}" data-end="${lineStart}">\u200b</span>`
      : textSpans(line, lineStart, undefined, sel);
    return { html, hidden: [] };
  }

  const task = TASK_LINE.exec(line);
  if (task) {
    const prefixLen = line.length - task[4].length;
    const prefixEnd = lineStart + prefixLen;
    const onPrefix = cursor != null && cursor > lineStart && cursor < prefixEnd;
    if (onPrefix) return { html: textSpans(line, lineStart, undefined, sel), hidden: [] };
    const body = inline(task[4], prefixEnd, cursor, sel);
    const box = task[3] === " " ? "md-task-box" : "md-task-box is-checked";
    const done = task[3] === " " ? "" : " is-done";
    const html =
      `<span class="${box}" data-start="${lineStart}" data-end="${prefixEnd}" data-widget="task" data-line="${lineIndex}"></span>` +
      `<span class="md-task-text${done}">${body.html}</span>`;
    return {
      html,
      hidden: [{ start: lineStart, end: prefixEnd, edge: "end" }, ...body.hidden],
    };
  }

  const quote = /^(\s*>\s?)(.*)$/.exec(line);
  if (quote) {
    const prefixLen = quote[1].length;
    const prefixEnd = lineStart + prefixLen;
    const onPrefix = cursor != null && cursor > lineStart && cursor < prefixEnd;
    if (onPrefix) return { html: textSpans(line, lineStart, undefined, sel), hidden: [] };
    const body = inline(quote[2], prefixEnd, cursor, sel);
    return {
      html: body.html,
      hidden: [{ start: lineStart, end: prefixEnd, edge: "end" }, ...body.hidden],
    };
  }

  const bullet = /^(\s*)([-*])\s+(?!\[)(.*)$/.exec(line);
  if (bullet && bullet[2]) {
    const prefixLen = line.length - bullet[3].length;
    const prefixEnd = lineStart + prefixLen;
    const onPrefix = cursor != null && cursor > lineStart && cursor < prefixEnd;
    if (onPrefix) return { html: textSpans(line, lineStart, undefined, sel), hidden: [] };
    const body = inline(bullet[3], prefixEnd, cursor, sel);
    const html =
      `<span class="md-bullet" data-start="${lineStart}" data-end="${prefixEnd}" data-widget="bullet">•</span>` +
      body.html;
    return {
      html,
      hidden: [{ start: lineStart, end: prefixEnd, edge: "end" }, ...body.hidden],
    };
  }

  return inline(line, lineStart, cursor, sel);
}

export function previewModel(md: string, cursor: number, sel: Sel | null = null): { html: string; hidden: HiddenRange[] } {
  const lines = md.split(/\r?\n/);
  const hidden: HiddenRange[] = [];
  let inFence = false;
  let pos = 0;
  const blocks: string[] = [];
  lines.forEach((line, i) => {
    const lineStart = pos;
    const lineEnd = pos + line.length;
    const onLine = cursor >= lineStart && cursor <= lineEnd;
    const fenceLine = /^\s*(```|~~~)/.test(line);
    const built = lineModel(line, lineStart, i, onLine ? cursor : null, inFence, sel);
    const quote = !inFence && !fenceLine && /^(\s*>\s?)/.test(line) && !(onLine && cursor > lineStart && cursor < lineStart + (line.match(/^(\s*>\s?)/)?.[1].length ?? 0));
    const cls = quote ? "md-line md-quote" : "md-line";
    blocks.push(
      `<div class="${cls}" data-line="${i}" data-line-start="${lineStart}" data-line-end="${lineEnd}">${built.html}</div>`,
    );
    hidden.push(...built.hidden);
    if (fenceLine) inFence = !inFence;
    pos = lineEnd + 1;
  });
  return { html: blocks.join(""), hidden };
}

export function renderNoteBackdrop(md: string, cursor: number, sel: Sel | null = null): string {
  return previewModel(md, cursor, sel).html;
}

function visualKey(index: number, hidden: HiddenRange[]): number {
  for (const h of hidden) {
    if (index >= h.start && index <= h.end) return h.edge === "end" ? h.end : h.start;
  }
  return index;
}

/** Move one visible character, skipping syntax that is not drawn. */
export function stepCursor(md: string, cursor: number, dir: -1 | 1): number {
  const { hidden } = previewModel(md, cursor);
  const origin = visualKey(cursor, hidden);
  let i = cursor + dir;
  while (i >= 0 && i <= md.length) {
    if (visualKey(i, hidden) !== origin) return i;
    i += dir;
  }
  return Math.max(0, Math.min(md.length, cursor));
}

function charHidden(index: number, hidden: HiddenRange[]): boolean {
  return hidden.some((h) => index >= h.start && index < h.end);
}

/** Delete the previous visible character, leaving surrounding markers in place. */
export function deleteBackward(md: string, cursor: number): { text: string; cursor: number } {
  const { hidden } = previewModel(md, cursor);
  let i = cursor - 1;
  while (i >= 0 && charHidden(i, hidden)) {
    const h = hidden.find((r) => i >= r.start && i < r.end);
    i = h ? h.start - 1 : i - 1;
  }
  if (i < 0) return { text: md, cursor };
  return { text: md.slice(0, i) + md.slice(i + 1), cursor: cursor - 1 };
}

/** Delete the next visible character. */
export function deleteForward(md: string, cursor: number): { text: string; cursor: number } {
  const { hidden } = previewModel(md, cursor);
  let i = cursor;
  while (i < md.length && charHidden(i, hidden)) {
    const h = hidden.find((r) => i >= r.start && i < r.end);
    i = h ? h.end : i + 1;
  }
  if (i >= md.length) return { text: md, cursor };
  return { text: md.slice(0, i) + md.slice(i + 1), cursor };
}
