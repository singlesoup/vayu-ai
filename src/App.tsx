import { useEffect, useState, useSyncExternalStore } from "react";
import { getConfig, listNotes, readAllNotes, type ConfigResult, type Tier } from "./lib/api";
import { shouldShowTokenPage } from "./tokenPageGate";
import { TokenPage } from "./components/TokenPage";
import { FirstRunScreen } from "./components/FirstRunScreen";
import { SetupFlow } from "./components/SetupFlow";
import { MorningIntention } from "./components/MorningIntention";
import { BrainDump } from "./components/BrainDump";
import { EveningReflection } from "./components/EveningReflection";
import { CompanionPanel } from "./components/CompanionPanel";
import { BacklinksPanel } from "./components/BacklinksPanel";
import { AskNotes } from "./components/AskNotes";
import { RedModeBar } from "./components/RedModeBar";
import { DailyNote } from "./components/DailyNote";
import { Settings } from "./components/Settings";
import { now } from "./lib/appClock";
import { titleForDate } from "./lib/dateFormat";
import { localDateKey, isNoteDate, type NoteDate } from "./lib/noteFile";

type ConfigState =
  | { state: "loading" }
  | {
      state: "ready";
      notesDir: string | null;
      defaultNotesDir: string;
      tier: Tier | null;
      aiEnabled: boolean | null;
      intention: { date: string; status: string }[];
    };

function readyConfig(c: ConfigResult): ConfigState {
  return {
    state: "ready",
    notesDir: c.notesDir,
    defaultNotesDir: c.defaultNotesDir,
    tier: c.tier ?? null,
    aiEnabled: c.aiEnabled ?? null,
    intention: c.intention ?? [],
  };
}

type DayState = {
  today: NoteDate;
  current: NoteDate;
};

type CentreView = "journal" | "reset" | "tasks" | "tags" | "ask";

const NARROW_MQ = "(max-width: 1100px)";

function subscribeNarrow(cb: () => void) {
  const mq = window.matchMedia(NARROW_MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function readNarrow() {
  return window.matchMedia(NARROW_MQ).matches;
}

function App() {
  if (
    shouldShowTokenPage(import.meta.env.DEV, new URLSearchParams(window.location.search).get("dev"))
  ) {
    return <TokenPage />;
  }

  return <AppBody />;
}

function initialDays(): DayState | null {
  const key = safeDateKey(now());
  return key === null ? null : { today: key, current: key };
}

function AppBody() {
  const [config, setConfig] = useState<ConfigState>({ state: "loading" });
  const [days, setDays] = useState<DayState | null>(initialDays);
  const [noteDates, setNoteDates] = useState<NoteDate[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [noteRevision, setNoteRevision] = useState(0);
  const [noteBodies, setNoteBodies] = useState<{ date: string; content: string }[]>([]);
  const [centreView, setCentreView] = useState<CentreView>("journal");
  const [companionOpen, setCompanionOpen] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [keywordHits, setKeywordHits] = useState<{ date: string; content: string }[]>([]);
  const narrow = useSyncExternalStore(subscribeNarrow, readNarrow, () => false);

  function loadConfig() {
    void getConfig()
      .then((c) => setConfig(readyConfig(c)))
      .catch(() =>
        setConfig({
          state: "ready",
          notesDir: null,
          defaultNotesDir: "",
          tier: null,
          aiEnabled: null,
          intention: [],
        }),
      );
  }

  useEffect(loadConfig, []);

  const currentDay = days?.current ?? null;
  useEffect(() => {
    if (currentDay === null) return;
    void listNotes()
      .then((dates) => setNoteDates(dates.filter((d) => isNoteDate(d))))
      .catch(() => setNoteDates([]));
    void readAllNotes()
      .then((notes) => setNoteBodies(notes))
      .catch(() => setNoteBodies([]));
  }, [currentDay, noteRevision]);

  useEffect(() => {
    function checkDayRollover() {
      const key = safeDateKey(now());
      if (key !== null && key !== days?.today) {
        setDays({ today: key, current: key });
      }
    }
    const onFocus = () => checkDayRollover();
    const onVisible = () => {
      if (document.visibilityState === "visible") checkDayRollover();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [days?.today]);

  useEffect(() => {
    if (days === null) return;
    document.title =
      days.current === days.today ? "Vayu â€” Today" : `Vayu â€” ${titleForDay(days.current)}`;
  }, [days]);

  // Keyword search across notes (every tier â€” no AI).
  useEffect(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return;
    let cancelled = false;
    void readAllNotes()
      .then((notes) => {
        if (!cancelled) {
          setKeywordHits(notes.filter((n) => n.content.toLowerCase().includes(q)).slice(0, 12));
        }
      })
      .catch(() => {
        if (!cancelled) setKeywordHits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [keyword, noteRevision]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("nav-search-input")?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (config.state === "loading" || days === null) {
    return (
      <main className="app">
        <p>Loadingâ€¦</p>
      </main>
    );
  }

  if (config.notesDir === null) {
    return <FirstRunScreen defaultPath={config.defaultNotesDir} onSaved={() => loadConfig()} />;
  }

  if (config.tier === null) {
    return <SetupFlow notesDir={config.notesDir} onComplete={() => loadConfig()} />;
  }

  const isToday = days.current === days.today;
  const aiOn = config.aiEnabled !== false && config.tier !== "Red";

  function openDay(date: string) {
    if (!isNoteDate(date)) return;
    setDays((prev) => (prev ? { ...prev, current: date } : prev));
    setCentreView("journal");
  }

  const week = weekDays(days.today);
  const tasks = noteBodies.flatMap((note) =>
    note.content
      .split("\n")
      .filter((line) => /^-\s*\[[ x]\]/.test(line))
      .map((line) => ({ date: note.date, line })),
  );

  function bumpNote() {
    setNoteRevision((n) => n + 1);
  }

  return (
    <main className={`app journal-shell${companionOpen && !narrow ? "" : " companion-collapsed"}`}>
      <header className="topbar">
        <div className="brand-mark">vayu <span>AI</span></div>
        <p className="local-pill"><i />All notes are local</p>
        <div className="topbar-actions">
          <button type="button" className="icon-button" aria-label={companionOpen ? "Hide companion" : "Show companion"} onClick={() => setCompanionOpen((v) => !v)}>
            <PanelIcon />
          </button>
        </div>
      </header>
      <div className="journal-workspace">
        <nav className="app-nav" aria-label="Main">
          <button type="button" className="new-entry" onClick={() => openDay(days.today)}>
            <PlusIcon /> New entry <kbd>N</kbd>
          </button>
          <label className="nav-search">
            <span className="visually-hidden">Search notes</span>
            <input
              id="nav-search-input"
              type="search"
              placeholder="Search entries"
              value={keyword}
              onChange={(e) => {
                const next = e.currentTarget.value;
                setKeyword(next);
                if (!next.trim()) setKeywordHits([]);
              }}
            />
          </label>
          {keywordHits.length > 0 && (
            <ul className="nav-search-hits">
              {keywordHits.map((hit) => (
                <li key={hit.date}>
                  <button type="button" className="nav-link" onClick={() => openDay(hit.date)}>
                    {shortDay(hit.date)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className={`nav-link${centreView === "journal" ? " nav-link-active" : ""}`} onClick={() => setCentreView("journal")}>
            <DocIcon /> All entries <b>{noteDates.length}</b>
          </button>
          <button type="button" className={`nav-link${centreView === "reset" ? " nav-link-active" : ""}`} onClick={() => setCentreView("reset")}>
            <SparkIcon /> Daily reset
          </button>
          <button type="button" className={`nav-link${centreView === "tasks" ? " nav-link-active" : ""}`} onClick={() => setCentreView("tasks")}>
            <CheckIcon /> Tasks
          </button>
          <button type="button" className={`nav-link${centreView === "tags" ? " nav-link-active" : ""}`} onClick={() => setCentreView("tags")}>
            <HashIcon /> Tags
          </button>
          {aiOn && (
            <button type="button" className={`nav-link${centreView === "ask" ? " nav-link-active" : ""}`} onClick={() => setCentreView("ask")}>
              Ask your notes
            </button>
          )}
          <section className="calendar-section">
            <div className="section-heading"><span>{monthLabel(days.today)}</span></div>
          <div className="week-row" aria-label="This week">
            {week.map((date) => (
              <button
                key={date}
                type="button"
                className={`day-cell${date === days.current ? " selected" : ""}`}
                onClick={() => openDay(date)}
              >
                <small>{weekdayShort(date)}</small>
                <strong>{Number(date.slice(8, 10))}</strong>
              </button>
            ))}
          </div>
          </section>
          <div className="nav-section-label">Recent entries <b>{noteDates.length}</b></div>
          <div className="entries-section">
            {noteDates.slice().reverse().slice(0, 8).map((date) => (
              <button key={date} type="button" className={`entry-card${date === days.current ? " selected" : ""}`} onClick={() => openDay(date)}>
                <span className="entry-date">{shortDay(date)}</span>
                <strong>{entryLabel(date, noteBodies)}</strong>
                <p>{entrySnippet(date, noteBodies)}</p>
              </button>
            ))}
          </div>
          <button type="button" className="nav-settings" onClick={() => setSettingsOpen(true)}>
            Preferences
          </button>
        </nav>

        <section className="note-column" aria-label="Note">
          {centreView === "reset" && aiOn && (
            <div className="daily-flows">
              <header className="daily-hero">
                <p className="flow-kicker">Your daily reset</p>
                <h1>Make room for today.</h1>
                <p>A little structure for the thoughts that are asking for your attention.</p>
              </header>
              <div className="flow-grid">
                <MorningIntention date={days.today} onFinish={bumpNote} />
                <BrainDump date={days.today} onFinish={bumpNote} />
                <EveningReflection date={days.today} onSaved={bumpNote} />
              </div>
            </div>
          )}
          {centreView === "tasks" && (
            <div className="daily-flows">
              <header className="daily-hero">
                <h1>Tasks</h1>
              </header>
              <ul className="task-board">
                {tasks.map((task) => (
                  <li key={task.date + task.line}>
                    <button type="button" onClick={() => openDay(task.date)}>{task.line}</button>
                  </li>
                ))}
                {tasks.length === 0 && <li>No open tasks in your notes yet.</li>}
              </ul>
            </div>
          )}
          {centreView === "tags" && (
            <div className="daily-flows">
              <header className="daily-hero"><h1>Tags</h1></header>
              <BacklinksPanel onOpenDay={openDay} refreshKey={noteRevision} />
            </div>
          )}
          {centreView === "ask" && aiOn && <AskNotes onOpenDay={openDay} />}
          {centreView === "journal" && (
            <>
              {!aiOn && isToday && <RedModeBar onOpenDay={openDay} refreshKey={noteRevision} />}
              <DailyNote
                key={days.current}
                date={days.current}
                isToday={isToday}
                create={isToday}
                chrome="journal"
              />
            </>
          )}
        </section>

        {companionOpen && !narrow && aiOn && (
          <CompanionPanel date={days.current} open refreshKey={noteRevision} />
        )}
      </div>
      <footer className="statusbar"><span>⌘ K to search</span><span>On this device</span></footer>
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}

function weekDays(today: NoteDate): NoteDate[] {
  const start = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)), 12);
  start.setDate(start.getDate() - 6);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = localDateKey(d);
    return isNoteDate(key) ? key : today;
  });
}

function weekdayShort(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][new Date(y, m - 1, d, 12).getDay()] ?? "";
}

function shortDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d, 12).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function safeDateKey(d: Date): NoteDate | null {
  const key = localDateKey(d);
  return isNoteDate(key) ? key : null;
}

function monthLabel(date: NoteDate): string {
  const d = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, 1, 12);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
}

function noteBody(date: string, notes: { date: string; content: string }[]): string {
  return notes.find((note) => note.date === date)?.content ?? "";
}

function entrySnippet(date: string, notes: { date: string; content: string }[]): string {
  const body = noteBody(date, notes);
  const rest = /^#\s+/m.test(body) ? body.replace(/^#\s+.+\n+/, "") : body.split("\n").slice(1).join("\n");
  return rest.replace(/\s+/g, " ").trim().slice(0, 55);
}

function entryLabel(date: string, notes: { date: string; content: string }[]): string {
  const body = noteBody(date, notes);
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading;
  const line = body.split("\n").find((row) => row.trim() !== "" && !row.startsWith("- ["));
  return line?.trim().slice(0, 42) || "Untitled entry";
}

function titleForDay(day: NoteDate): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return titleForDate(new Date(y, m - 1, d, 12));
}

function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8"/></svg>;
}
function PanelIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M15 4v16" stroke="currentColor" strokeWidth="1.5"/></svg>;
}
function DocIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M7 3h7l5 5v13H7V3z" stroke="currentColor" strokeWidth="1.5"/><path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.5"/></svg>;
}
function SparkIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M12 3l1.6 5.2L19 10l-5.4 1.8L12 17l-1.6-5.2L5 10l5.4-1.8L12 3z" stroke="currentColor" strokeWidth="1.4"/></svg>;
}
function CheckIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M8 12.5l2.5 2.5L16 9.5" stroke="currentColor" strokeWidth="1.5"/></svg>;
}
function HashIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M9 4l-2 16M17 4l-2 16M4 9h16M3 15h16" stroke="currentColor" strokeWidth="1.5"/></svg>;
}

export default App;
