import { useEffect, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Hash,
  Moon,
  PanelLeft,
  PanelRight,
  Plus,
  Search,
  Settings as SettingsIcon,
  Sun,
} from "lucide-react";
import { getConfig, listNotes, readAllNotes, writeNote, type ConfigResult, type Tier } from "./lib/api";
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
import { formatTaskDate, titleForDate } from "./lib/dateFormat";
import { isBrowserPreview } from "./dev/browserPreview";
import { localDateKey, isNoteDate, type NoteDate } from "./lib/noteFile";
import { backlinksForNote } from "./lib/backlinks";
import { collectWikiTargets } from "./lib/wikiAutocomplete";
import { parseTasks, toggleTask } from "./lib/tasks";
import { closeEvening, eveningClosed, ritualFor } from "./lib/ritual";
import { applyTheme, getThemeChoice, resolvedTheme, subscribeTheme } from "./lib/theme";

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

type CentreView = "journal" | "tasks" | "tags";
type TaskFilter = "open" | "all" | "done";

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
  const [eveningDismissedOn, setEveningDismissedOn] = useState<string | null>(null);
  const [hidePreviewRitual, setHidePreviewRitual] = useState(false);
  const [noteRevision, setNoteRevision] = useState(0);
  const [noteBodies, setNoteBodies] = useState<{ date: string; content: string }[]>([]);
  const [centreView, setCentreView] = useState<CentreView>("journal");
  const [companionOpen, setCompanionOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [keywordHits, setKeywordHits] = useState<{ date: string; content: string }[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchCursor, setSearchCursor] = useState(0);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("open");
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
      days.current === days.today ? "Vayu — Today" : `Vayu — ${titleForDay(days.current)}`;
  }, [days]);

  // Keyword search across notes (every tier — no AI).
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
    function onKey(e: globalThis.KeyboardEvent) {
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
        <p>Loading…</p>
      </main>
    );
  }

  if (config.notesDir === null) {
    return <FirstRunScreen defaultPath={config.defaultNotesDir} onSaved={() => loadConfig()} />;
  }

  if (config.tier === null) {
    return <SetupFlow notesDir={config.notesDir} onComplete={() => loadConfig()} />;
  }

  const today = days.today;
  const isToday = days.current === today;
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
  const taskGroups = groupedTasks(tasks, taskFilter);
  const openBacklinks = backlinksForNote(noteBodies, days.current);
  const wikiTargets = collectWikiTargets(noteBodies);
  const searchRows = keyword.trim()
    ? keywordHits.map((hit) => ({ date: hit.date, title: entryLabel(hit.date, noteBodies) }))
    : searchOpen
      ? noteDates
          .slice()
          .reverse()
          .slice(0, 8)
          .map((date) => ({ date, title: entryLabel(date, noteBodies) }))
      : [];
  const searchActive = searchRows.length === 0 ? 0 : Math.min(searchCursor, searchRows.length - 1);

  function closeSearch(blur: boolean) {
    setKeyword("");
    setKeywordHits([]);
    setSearchCursor(0);
    setSearchOpen(false);
    if (blur) document.getElementById("nav-search-input")?.blur();
  }

  function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSearch(true);
      return;
    }
    if (searchRows.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSearchCursor((index) => Math.min(index + 1, searchRows.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSearchCursor((index) => Math.max(index - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const row = searchRows[searchActive];
      if (!row) return;
      openDay(row.date);
      closeSearch(true);
    }
  }

  function bumpNote() {
    setNoteRevision((n) => n + 1);
  }

  function rememberIntention(status: "done" | "skipped") {
    setConfig((prev) => {
      if (prev.state !== "ready") return prev;
      return {
        ...prev,
        intention: [
          ...prev.intention.filter((item) => item.date !== today),
          { date: today, status },
        ],
      };
    });
  }

  function dismissEvening() {
    closeEvening(today);
    setEveningDismissedOn(today);
    setHidePreviewRitual(true);
  }

  const ritual = ritualFor(now());
  const previewRitual = hidePreviewRitual ? null : previewRitualParam();
  const morningOpen =
    aiOn &&
    (previewRitual === "morning" ||
      (ritual === "morning" && !config.intention.some((item) => item.date === today)));
  const eveningOpen =
    aiOn &&
    !morningOpen &&
    (previewRitual === "evening" ||
      (ritual === "evening" && eveningDismissedOn !== today && !eveningClosed(today)));

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
          <ThemeToggle />
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
            <Plus size={16} /> New entry <kbd>Win+N</kbd>
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
              role="combobox"
              aria-expanded={searchRows.length > 0}
              aria-controls="nav-search-list"
              aria-activedescendant={searchRows.length > 0 ? `nav-search-opt-${searchActive}` : undefined}
              onFocus={() => {
                setSearchOpen(true);
                setSearchCursor(0);
              }}
              onBlur={() => setSearchOpen(false)}
              onKeyDown={onSearchKey}
              onChange={(e) => {
                const next = e.currentTarget.value;
                setKeyword(next);
                setSearchCursor(0);
                if (!next.trim()) setKeywordHits([]);
              }}
            />
            {!keyword && (
              <kbd className="nav-search-key">Win+K</kbd>
            )}
          </label>
          {searchRows.length > 0 && (
            <ul className="nav-search-hits" id="nav-search-list" role="listbox">
              {searchRows.map((row, index) => (
                <li key={row.date}>
                  <button
                    type="button"
                    id={`nav-search-opt-${index}`}
                    role="option"
                    aria-selected={index === searchActive}
                    className={`nav-search-hit${index === searchActive ? " is-active" : ""}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setSearchCursor(index)}
                    onClick={() => {
                      openDay(row.date);
                      closeSearch(true);
                    }}
                  >
                    <strong>{row.title}</strong>
                    <span>{shortDay(row.date)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className={`nav-link${centreView === "journal" ? " nav-link-active" : ""}`} onClick={() => setCentreView("journal")}>
            <FileText size={16} /> All entries <b>{noteDates.length}</b>
          </button>
          <button type="button" className={`nav-link${centreView === "tasks" ? " nav-link-active" : ""}`} onClick={() => setCentreView("tasks")}>
            <ClipboardCheck size={16} /> Tasks {tasks.filter((task) => !task.done).length > 0 && <b>{tasks.filter((task) => !task.done).length}</b>}
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
          {centreView === "tasks" && (
            <div className="daily-flows">
              <div className="task-column">
                <header className="daily-hero">
                  <h1>Tasks</h1>
                </header>
                {aiOn && <BrainDump date={days.today} onFinish={bumpNote} />}
                <div className="task-filters" role="group" aria-label="Filter tasks">
                {(["open", "all", "done"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    aria-pressed={taskFilter === filter}
                    onClick={() => setTaskFilter(filter)}
                  >
                    {filter === "open" ? "Open" : filter === "all" ? "All" : "Done"}
                  </button>
                ))}
              </div>
              {taskGroups.length === 0 && (
                <p className="empty-tasks">
                  {taskFilter === "done"
                    ? "No finished tasks."
                    : taskFilter === "open"
                      ? "No open tasks."
                      : "No tasks in your notes yet."}
                </p>
              )}
              {taskGroups.map((group) => (
                <section key={group.date} className="task-group" data-testid="task-group">
                  <h2>{taskGroupHeading(group.date, noteBodies)}</h2>
                  <ul className="task-board">
                    {group.tasks.map((task) => (
                      <li key={task.date + String(task.line)}>
                        <button
                          type="button"
                          className={task.done ? "is-done" : ""}
                          onClick={() => {
                            const note = noteBodies.find((item) => item.date === task.date);
                            if (!note || !isNoteDate(task.date)) return;
                            void writeNote(task.date, toggleTask(note.content, task.line)).then(bumpNote);
                          }}
                          aria-pressed={task.done}
                        >
                          <span className="task-box" aria-hidden="true">{task.done ? "✓" : ""}</span>
                          <span>{task.text}</span>
                        </button>
                        <button type="button" className="task-open" onClick={() => openDay(task.date)}>
                          {formatTaskDate(noteDateFromKey(task.date))}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              </div>
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
                backlinkCount={openBacklinks.length}
                wikiTargets={wikiTargets}
                onToggleCompanion={() => setCompanionOpen((v) => !v)}
              />
            </>
          )}
        </section>

        {aiOn ? (
          <CompanionPanel date={days.current} open={companionOpen} refreshKey={noteRevision} onOpenDay={openDay} />
        ) : (
          <aside className={`note-backlinks-rail${companionOpen ? "" : " companion-closed"}`}>
            <BacklinksPanel noteDate={days.current} onOpenDay={openDay} refreshKey={noteRevision} />
          </aside>
        )}
      </div>
      <footer className="statusbar"><span>Win+K to search</span><span className="sync-pip"><i />Synced just now</span></footer>
      {morningOpen && (
        <div className="ritual-backdrop">
          <div className="ritual-dialog" role="dialog" aria-label="Morning intention">
            <MorningIntention
              date={today}
              onFinish={(status) => {
                rememberIntention(status);
                bumpNote();
              }}
            />
          </div>
        </div>
      )}
      {eveningOpen && (
        <div className="ritual-backdrop">
          <div className="ritual-dialog" role="dialog" aria-label="Evening reflection">
            <EveningReflection
              date={today}
              onDismiss={dismissEvening}
              onSaved={() => {
                dismissEvening();
                bumpNote();
              }}
            />
          </div>
        </div>
      )}
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}

function groupedTasks<T extends { date: string; done: boolean }>(tasks: T[], filter: TaskFilter): { date: string; tasks: T[] }[] {
  const visible = tasks.filter((task) =>
    filter === "all" ? true : filter === "done" ? task.done : !task.done,
  );
  const order: string[] = [];
  const byDate = new Map<string, T[]>();
  for (const task of visible) {
    const list = byDate.get(task.date);
    if (list) list.push(task);
    else {
      byDate.set(task.date, [task]);
      order.push(task.date);
    }
  }
  order.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  return order.map((date) => ({ date, tasks: byDate.get(date) ?? [] }));
}

function taskGroupHeading(date: string, notes: { date: string; content: string }[]): string {
  const label = entryLabel(date, notes).replace(/[#*_`]/g, "").trim();
  const day = shortDay(date);
  return label === "Untitled entry" ? day : `${day} · ${label}`;
}

function ThemeToggle() {
  useSyncExternalStore(subscribeTheme, getThemeChoice, getThemeChoice);
  const prefersDark =
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const mode = resolvedTheme(prefersDark);
  const next = mode === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      data-testid="theme-toggle-button"
      onClick={() => applyTheme(next)}
    >
      {mode === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

function previewRitualParam(): "morning" | "evening" | null {
  if (!isBrowserPreview() || typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("ritual");
  return value === "morning" || value === "evening" ? value : null;
}

function noteDateFromKey(date: string): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d, 12);
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
