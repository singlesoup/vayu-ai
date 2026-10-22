import { useEffect, useState, useSyncExternalStore } from "react";
import { getConfig, listNotes, readAllNotes, type ConfigResult, type Tier } from "./lib/api";
import { shouldShowTokenPage } from "./tokenPageGate";
import { TokenPage } from "./components/TokenPage";
import { FirstRunScreen } from "./components/FirstRunScreen";
import { SetupFlow } from "./components/SetupFlow";
import { MorningIntention } from "./components/MorningIntention";
import { BrainDump } from "./components/BrainDump";
import { JournalChat } from "./components/JournalChat";
import { EveningReflection } from "./components/EveningReflection";
import { BacklinksPanel } from "./components/BacklinksPanel";
import { InThisNote } from "./components/InThisNote";
import { AskNotes } from "./components/AskNotes";
import { RedModeBar } from "./components/RedModeBar";
import { DailyNote } from "./components/DailyNote";
import { Calendar } from "./components/Calendar";
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

/** Which centre view / AI panel is open (Reflect-style: one at a time). */
type CentreView = "today" | "ask";
type AiPanel = "none" | "intention" | "dump" | "journal" | "reflect";

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
  const [intentionClosed, setIntentionClosed] = useState(false);
  const [centreView, setCentreView] = useState<CentreView>("today");
  const [aiPanel, setAiPanel] = useState<AiPanel>("none");
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
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAiPanel("none");
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

  const isToday = days.current === days.today;
  const aiOn = config.aiEnabled !== false && config.tier !== "Red";
  const intentionToday = config.intention.find((entry) => entry.date === days.today)?.status;
  const showIntentionAuto =
    isToday &&
    aiOn &&
    !intentionClosed &&
    intentionToday !== "done" &&
    intentionToday !== "skipped" &&
    aiPanel === "none";

  function openDay(date: string) {
    if (!isNoteDate(date)) return;
    setDays((prev) => (prev ? { ...prev, current: date } : prev));
    setCentreView("today");
  }

  function bumpNote() {
    setNoteRevision((n) => n + 1);
  }

  return (
    <main className="app workspace" data-layout="three-zone">
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Left — Reflect-style nav */}
      <nav className="app-nav" aria-label="Main">
        <div className="nav-search">
          <label className="visually-hidden" htmlFor="nav-search-input">
            Search notes
          </label>
          <input
            id="nav-search-input"
            type="search"
            placeholder="Search anything…"
            value={keyword}
            onChange={(e) => {
              const next = e.currentTarget.value;
              setKeyword(next);
              if (!next.trim()) setKeywordHits([]);
            }}
          />
        </div>
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

        <button
          type="button"
          className={`nav-link${centreView === "today" ? " nav-link-active" : ""}`}
          onClick={() => setCentreView("today")}
        >
          Daily notes
        </button>
        {aiOn && (
          <button
            type="button"
            className={`nav-link${centreView === "ask" ? " nav-link-active" : ""}`}
            onClick={() => {
              setCentreView("ask");
              setAiPanel("none");
            }}
          >
            Ask your notes
          </button>
        )}

        <div className="nav-section-label">Topics</div>
        <BacklinksPanel onOpenDay={openDay} refreshKey={noteRevision} />

        {narrow && (
          <div className="nav-calendar-slot">
            <Calendar
              today={days.today}
              noteDates={noteDates}
              onSelect={(date) => {
                setDays((prev) => (prev ? { ...prev, current: date } : prev));
                setCentreView("today");
              }}
            />
          </div>
        )}

        <div className="nav-footer">
          <button
            type="button"
            className="nav-settings"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
              <path
                d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M19.4 13a7.7 7.7 0 0 0 .06-2l2.02-1.57-2-3.46-2.4.96a7.6 7.6 0 0 0-1.73-1L15 3h-4l-.35 2.93a7.6 7.6 0 0 0-1.73 1l-2.4-.96-2 3.46L6.54 11a7.7 7.7 0 0 0 0 2l-2.02 1.57 2 3.46 2.4-.96a7.6 7.6 0 0 0 1.73 1L11 21h4l.35-2.93a7.6 7.6 0 0 0 1.73-1l2.4.96 2-3.46L19.4 13Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </nav>

      {/* Centre — note as hero (title first; AI under it) */}
      <section className="note-column" aria-label="Note">
        {centreView === "ask" && aiOn ? (
          <AskNotes onOpenDay={openDay} />
        ) : (
          <>
            {!aiOn && isToday && (
              <RedModeBar onOpenDay={openDay} refreshKey={noteRevision} />
            )}

            <DailyNote
              key={days.current}
              date={days.current}
              isToday={isToday}
              create={isToday}
              afterTitle={
                aiOn && isToday ? (
                  <>
                    <div className="ai-action-row" role="toolbar" aria-label="AI for today">
                      <button
                        type="button"
                        className={`ai-action${
                          aiPanel === "intention" || showIntentionAuto ? " ai-action-active" : ""
                        }`}
                        onClick={() =>
                          setAiPanel(aiPanel === "intention" ? "none" : "intention")
                        }
                      >
                        Plan my day
                      </button>
                      <button
                        type="button"
                        className={`ai-action${aiPanel === "dump" ? " ai-action-active" : ""}`}
                        onClick={() => setAiPanel(aiPanel === "dump" ? "none" : "dump")}
                      >
                        Brain dump
                      </button>
                      <button
                        type="button"
                        className={`ai-action${aiPanel === "journal" ? " ai-action-active" : ""}`}
                        onClick={() => setAiPanel(aiPanel === "journal" ? "none" : "journal")}
                      >
                        Journal
                      </button>
                      <button
                        type="button"
                        className={`ai-action${aiPanel === "reflect" ? " ai-action-active" : ""}`}
                        onClick={() => setAiPanel(aiPanel === "reflect" ? "none" : "reflect")}
                      >
                        Reflect
                      </button>
                    </div>
                    {(showIntentionAuto || aiPanel === "intention") && (
                      <MorningIntention
                        date={days.today}
                        onFinish={() => {
                          setIntentionClosed(true);
                          setAiPanel("none");
                          bumpNote();
                        }}
                      />
                    )}
                    {aiPanel === "dump" && (
                      <BrainDump
                        date={days.today}
                        onFinish={() => {
                          setAiPanel("none");
                          bumpNote();
                        }}
                      />
                    )}
                    {aiPanel === "journal" && (
                      <JournalChat
                        date={days.today}
                        onSaved={() => {
                          bumpNote();
                        }}
                      />
                    )}
                    {aiPanel === "reflect" && (
                      <EveningReflection
                        date={days.today}
                        onSaved={() => {
                          bumpNote();
                        }}
                      />
                    )}
                  </>
                ) : null
              }
            />
          </>
        )}
      </section>

      {/* Right — calendar + in-note topics (Reflect-style); collapses under 1100px */}
      {!narrow && (
        <aside className="app-rail" aria-label="Day tools">
          <Calendar
            today={days.today}
            noteDates={noteDates}
            onSelect={(date) => {
              setDays((prev) => (prev ? { ...prev, current: date } : prev));
              setCentreView("today");
            }}
          />
          <InThisNote date={days.current} refreshKey={noteRevision} />
        </aside>
      )}
    </main>
  );
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

function titleForDay(day: NoteDate): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return titleForDate(new Date(y, m - 1, d, 12));
}

export default App;
