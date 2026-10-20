import { useEffect, useState } from "react";
import { getConfig } from "./lib/api";
import { shouldShowTokenPage } from "./tokenPageGate";
import { TokenPage } from "./components/TokenPage";
import { FirstRunScreen } from "./components/FirstRunScreen";

type ConfigState = { state: "loading" } | { state: "ready"; notesDir: string | null; defaultNotesDir: string };

function App() {
  // Dev-only token reference (task 1.3.4): ?dev=tokens, never in release builds.
  if (shouldShowTokenPage(import.meta.env.DEV, new URLSearchParams(window.location.search).get("dev"))) {
    return <TokenPage />;
  }

  return <AppBody />;
}

function AppBody() {
  const [config, setConfig] = useState<ConfigState>({ state: "loading" });

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

  if (config.state === "loading") {
    return (
      <main className="app">
        <p>Loading…</p>
      </main>
    );
  }

  if (config.notesDir === null) {
    return (
      <FirstRunScreen
        defaultPath={config.defaultNotesDir}
        onSaved={() => loadConfig()}
      />
    );
  }

  // Workspace (daily note) arrives with task 1.5.4.
  return (
    <main className="app">
      <h1>Vayu</h1>
    </main>
  );
}

export default App;
