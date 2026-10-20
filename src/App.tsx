import { shouldShowTokenPage } from "./tokenPageGate";
import { TokenPage } from "./components/TokenPage";

function App() {
  // Dev-only token reference (task 1.3.4): ?dev=tokens, never in release builds.
  if (shouldShowTokenPage(import.meta.env.DEV, new URLSearchParams(window.location.search).get("dev"))) {
    return <TokenPage />;
  }

  return (
    <main className="app">
      <h1>Vayu</h1>
      <p>The app shell is scaffolded. Phase 1 features are on their way.</p>
    </main>
  );
}

export default App;
