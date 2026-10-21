import { useEffect, useState } from "react";
import { getConfig, listNotes, type ConfigResult, type Tier } from "./lib/api";
import { shouldShowTokenPage } from "./tokenPageGate";
import { TokenPage } from "./components/TokenPage";
import { FirstRunScreen } from "./components/FirstRunScreen";
import { SetupFlow } from "./components/SetupFlow";
import { MorningIntention } from "./components/MorningIntention";
import { BrainDump } from "./components/BrainDump";
import { DailyNote } from "./components/DailyNote";
import { Calendar } from "./components/Calendar";
import { Settings } from "./components/Settings";
import { now } from "./lib/appClock";
import { titleForDate } from "./lib/dateFormat";
import { localDateKey, isNoteDate, type NoteDate } from "./lib/noteFile";

type ConfigState = {
  state: "loading";
} | {
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
  /** The day the clock says it is right now. */
  today: NoteDate;
  /** The day being edited. */
  current: NoteDate;
};

function App() {
  // Dev-only token reference (task 1.3.4): ?dev=tokens, never in release builds.
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
  // Notes that already exist on disk (from list_notes), for the calendar marks.
  const [noteDates, setNoteDates] = useState<NoteDate[]>([]);
  // Settings panel (task 1.9.2): Phase 1 holds the Model (Ollama) section.
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Bumped when Morning Intention or Brain Dump writes into today's file,
  // so the note reloads and the new tasks show up.
  const [noteRevision, setNoteRevision] = useState(0);
  const [intentionClosed, setIntentionClosed] = useState(false);

  function loadConfig() {
    void getConfig()
      .then((c) => setConfig(readyConfig(c)))
      .catch(() =>
        // A failed config read should not strand the user; ask for a folder.
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

  // Calendar marks (task 1.7.2): which days have notes. Refreshed whenever the
  // viewed day changes (opening a future day for today's date adds a file).
  const currentDay = days?.current ?? null;
  useEffect(() => {
    if (currentDay === null) return;
    void listNotes()
      .then((dates) => setNoteDates(dates.filter((d) => isNoteDate(d))))
      .catch(() => setNoteDates([]));
  }, [currentDay]);

  // Midnight handling: when the window regains focus (or becomes visible), move
  // the editor to the new day — which makes Rust create that day's file.
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

  // Window title: "Vayu — Today" on today's note, otherwise the weekday/date.
  useEffect(() => {
    if (days === null) return;
    document.title =
      days.current === days.today ? "Vayu — Today" : `Vayu — ${titleForDay(days.current)}`;
  }, [days]);

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

  // Tier has never been chosen: hardware screen, then download or straight in.
  if (config.tier === null) {
    return <SetupFlow notesDir={config.notesDir} onComplete={() => loadConfig()} />;
  }

  const isToday = days.current === days.today;
  const aiOn = config.aiEnabled !== false && config.tier !== "Red";
  const intentionToday = config.intention.find((entry) => entry.date === days.today)?.status;
  const showIntention =
    isToday && aiOn && !intentionClosed && intentionToday !== "done" && intentionToday !== "skipped";

  return (
    <main className="app workspace">
      <button
        type="button"
        className="settings-open"
        aria-label="Settings"
        onClick={() => setSettingsOpen(true)}
      >
        ⚙
      </button>
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <aside className="calendar-rail">
        <Calendar
          today={days.today}
          noteDates={noteDates}
          onSelect={(date) => setDays((prev) => (prev ? { ...prev, current: date } : prev))}
        />
      </aside>
      <div className="note-column">
        {showIntention && (
          <MorningIntention
            date={days.today}
            onFinish={() => {
              setIntentionClosed(true);
              setNoteRevision((n) => n + 1);
            }}
          />
        )}
        {isToday && aiOn && (
          <BrainDump date={days.today} onFinish={() => setNoteRevision((n) => n + 1)} />
        )}
        <DailyNote
          key={`${days.current}-${noteRevision}`}
          date={days.current}
          isToday={isToday}
          create={isToday}
        />
      </div>
    </main>
  );
}

function safeDateKey(d: Date): NoteDate | null {
  const key = localDateKey(d);
  return isNoteDate(key) ? key : null;
}

function titleForDay(day: NoteDate): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return titleForDate(new Date(y, m - 1, d, 12));
}

export default App;
