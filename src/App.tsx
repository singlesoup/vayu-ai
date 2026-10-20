import { useEffect, useState } from "react";
import { getConfig } from "./lib/api";
import { shouldShowTokenPage } from "./tokenPageGate";
import { TokenPage } from "./components/TokenPage";
import { FirstRunScreen } from "./components/FirstRunScreen";
import { DailyNote } from "./components/DailyNote";
import { now } from "./lib/appClock";
import { titleForDate } from "./lib/dateFormat";
import { localDateKey, isNoteDate, type NoteDate } from "./lib/noteFile";

type ConfigState = {
  state: "loading";
} | {
  state: "ready";
  notesDir: string | null;
  defaultNotesDir: string;
};

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

  function loadConfig() {
    void getConfig()
      .then((c) =>
        setConfig({ state: "ready", notesDir: c.notesDir, defaultNotesDir: c.defaultNotesDir }),
      )
      .catch(() =>
        // A failed config read should not strand the user; ask for a folder.
        setConfig({ state: "ready", notesDir: null, defaultNotesDir: "" }),
      );
  }

  useEffect(loadConfig, []);

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

  const isToday = days.current === days.today;
  return (
    <main className="app workspace">
      <DailyNote key={days.current} date={days.current} isToday={isToday} create={isToday} />
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
