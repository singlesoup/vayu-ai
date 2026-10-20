// The note editor (task 1.6.1). A plain textarea: what the user types is
// exactly what reaches the disk as Markdown — no added markup, no
// reformatting. Styling (Newsreader body, single column) comes from tokens.

type Props = {
  value: string;
  onChange: (content: string) => void;
  ariaLabel?: string;
};

export function Editor({ value, onChange, ariaLabel = "Note" }: Props) {
  return (
    <div className="note-column">
      <textarea
        className="note-editor"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        spellCheck={false}
      />
    </div>
  );
}
