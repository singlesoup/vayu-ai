import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Command,
  FileText,
  Hash,
  PanelLeft,
  PanelRight,
  Plus,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Sunrise,
} from "lucide-react";
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
import { RedModeBar } from "./components/RedModeBar";
import { DailyNote } from "./components/DailyNote";
import { Settings } from "./components/Settings";
import { now } from "./lib/appClock";
import { titleForDate } from "./lib/dateFormat";
import { localDateKey, isNoteDate, type NoteDate } from "./lib/noteFile";
import { parseTasks } from "./lib/tasks";

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

type CentreView = "journal" | "reset" | "tasks" | "tags";

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [keywordHits, setKeywordHits] = useState<{ date: string; content: string }[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);

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

  const week = weekDays(days.today, weekOffset);
  const tasks = noteBodies.flatMap((note) =>
    parseTasks(note.content).map((task) => ({ date: note.date, text: task.text, done: task.done, line: task.line })),
  );

  function bumpNote() {
    setNoteRevision((n) => n + 1);
  }

  return (
    <main
      className={`app journal-shell${sidebarOpen ? "" : " sidebar-collapsed"}${companionOpen ? "" : " companion-collapsed"}`}
      data-testid="journal-app"
    >
      <header className="topbar">
        <div className="brand-mark">
          vayu<span className="brand-ai">AI</span>
        </div>
        <p className="topbar-center">
          <i className="status-pip" aria-hidden="true" />
          All notes are local
        </p>
        <div className="topbar-actions">
          <button
            type="button"
            className="icon-button"
            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            data-testid="sidebar-toggle-button"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <PanelLeft size={17} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={companionOpen ? "Hide companion" : "Show companion"}
            data-testid="ai-panel-toggle-button"
            onClick={() => setCompanionOpen((v) => !v)}
          >
            <PanelRight size={17} />
          </button>
          <span className="user-avatar" data-testid="user-avatar">
            JD
          </span>
        </div>
      </header>
      <div className="journal-workspace">
        <nav className={`app-nav${sidebarOpen ? "" : " mini-sidebar"}`} aria-label="Main">
          {!sidebarOpen && (
            <button type="button" className="new-entry mini-new" aria-label="New entry" data-testid="collapsed-new-note-button" onClick={() => openDay(days.today)}>
              <Plus size={17} />
            </button>
          )}
          {sidebarOpen && (
          <>
          <button type="button" className="new-entry" data-testid="new-note-button" onClick={() => openDay(days.today)}>
            <Plus size={16} /> New entry <kbd><Command size={11} strokeWidth={2} /> N</kbd>
          </button>
          <label className="nav-search">
            <span className="visually-hidden">Search notes</span>
            <Search size={16} strokeWidth={2} />
            <input
              id="nav-search-input"
              data-testid="journal-search-input"
              type="search"
              placeholder="Search entries"
              value={keyword}
              onChange={(e) => {
                const next = e.currentTarget.value;
                setKeyword(next);
                if (!next.trim()) setKeywordHits([]);
              }}
            />
            {!keyword && (
              <kbd className="nav-search-key"><Command size={11} strokeWidth={2} /> K</kbd>
            )}
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
            <FileText size={16} /> All entries <b>{noteDates.length}</b>
          </button>
          <button type="button" className={`nav-link${centreView === "reset" ? " nav-link-active" : ""}`} onClick={() => setCentreView("reset")}>
            <Sparkles size={16} /> Daily reset
          </button>
          <button type="button" className={`nav-link${centreView === "tasks" ? " nav-link-active" : ""}`} onClick={() => setCentreView("tasks")}>
            <ClipboardCheck size={16} /> Tasks
          </button>
          <button type="button" className={`nav-link${centreView === "tags" ? " nav-link-active" : ""}`} onClick={() => setCentreView("tags")}>
            <Hash size={16} /> Tags
          </button>
          <section className="calendar-section">
            <div className="section-heading">
              <span>{monthLabel(week[week.length - 1] ?? days.today)}</span>
              <span className="week-nav">
                <button type="button" aria-label="Previous week" onClick={() => setWeekOffset((n) => n - 1)}>
                  <ChevronLeft size={12} />
                </button>
                <button type="button" aria-label="Next week" onClick={() => setWeekOffset((n) => n + 1)}>
                  <ChevronRight size={12} />
                </button>
              </span>
            </div>
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
          <div className="nav-section-label">
            <span>Recent entries</span>
            <span className="entry-count">{noteDates.length}</span>
          </div>
          <div className="entries-section">
            {noteDates.slice().reverse().slice(0, 8).map((date) => (
              <button key={date} type="button" className={`entry-card${date === days.current ? " selected" : ""}`} onClick={() => openDay(date)}>
                <span className="entry-date">{shortDay(date)}</span>
                <strong>{entryLabel(date, noteBodies)}</strong>
                <p>{entrySnippet(date, noteBodies)}</p>
              </button>
            ))}
          </div>
          <button type="button" className="nav-settings" data-testid="settings-button" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon size={14} /> Settings
          </button>
          </>
          )}
        </nav>

        <section className="note-column" aria-label="Note">
          {centreView === "reset" && aiOn && (
            <div className="daily-flows">
              <header className="daily-hero">
                <p className="eyebrow"><Sunrise size={13} /> Your daily reset</p>
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
                  <li key={task.date + String(task.line)}>
                    <button type="button" className={task.done ? "is-done" : ""} onClick={() => openDay(task.date)}>
                      <span className="task-box" aria-hidden="true">{task.done ? "✓" : ""}</span>
                      <span>{task.text}</span>
                    </button>
                  </li>
                ))}
                {tasks.length === 0 && <li className="empty-tasks">No open tasks in your notes yet.</li>}
              </ul>
            </div>
          )}
          {centreView === "tags" && (
            <div className="daily-flows">
              <header className="daily-hero"><h1>Tags</h1></header>
              <BacklinksPanel onOpenDay={openDay} refreshKey={noteRevision} />
            </div>
          )}
          {centreView === "journal" && (
            <>
              {!aiOn && isToday && <RedModeBar onOpenDay={openDay} refreshKey={noteRevision} />}
              <DailyNote
                key={days.current}
                date={days.current}
                isToday={isToday}
                create={isToday}
                chrome="journal"
                onToggleCompanion={() => setCompanionOpen((v) => !v)}
              />
            </>
          )}
        </section>

        {aiOn && (
          <CompanionPanel date={days.current} open={companionOpen} refreshKey={noteRevision} />
        )}
      </div>
      <footer className="statusbar"><span><Command size={12} /> K to search</span><span className="sync-pip"><i />Synced just now</span></footer>
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}

function weekDays(today: NoteDate, offsetWeeks = 0): NoteDate[] {
  const start = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)), 12);
  start.setDate(start.getDate() - 6 + offsetWeeks * 7);
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

export default App;
