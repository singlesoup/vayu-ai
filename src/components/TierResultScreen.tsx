// Task 2.3: tier result screen — plain words, specs under "details",
// one primary action. Styled like the first-run card (Surface card on Ink)
// so it feels like one continuous first-run flow.
import { HardwareReport } from "../lib/api";

type Props = {
  report: HardwareReport;
  /** Whether the tier's model is already installed (from list_models). */
  modelInstalled: boolean;
  onDownload: () => void;
  onSkipAI: () => void;
  /** User confirms Ollama is now installed; re-runs the hardware check. */
  onRecheckOllama: () => void;
  onOpenApp: () => void;
};

function tierHeading(tier: HardwareReport["tier"]): string {
  switch (tier) {
    case "Green":
      return "Your PC: Green tier";
    case "Yellow":
      return "Your PC: Yellow tier";
    default:
      return "No AI chat on this PC";
  }
}

function tierBody(tier: HardwareReport["tier"]): string {
  switch (tier) {
    case "Green":
      return "The full model (Gemma E4B) is right for this PC.";
    case "Yellow":
      return "The lite model (Gemma E2B) is right for this PC — same features, simpler answers.";
    default:
      return "This PC can't run AI chat locally. Vayu still works as a calm notes + tasks app.";
  }
}

export function TierResultScreen({
  report,
  modelInstalled,
  onDownload,
  onSkipAI,
  onRecheckOllama,
  onOpenApp,
}: Props) {
  const { tier, model, sizeGb, ollamaPresent } = report;
  const red = tier === "Red";
  const canDownload = !red && ollamaPresent && !modelInstalled;

  return (
    <main className="first-run">
      <h1>{tierHeading(tier)}</h1>
      <p>{tierBody(tier)}</p>

      {!ollamaPresent && (
        <>
          <p>Ollama isn't installed on this PC yet.</p>
          <button type="button" className="btn-ghost" onClick={onRecheckOllama}>
            I already have Ollama
          </button>
        </>
      )}
      {ollamaPresent && modelInstalled && (
        <button type="button" className="btn-primary" onClick={onOpenApp}>
          Open Vayu
        </button>
      )}
      {ollamaPresent && canDownload && (
        <button type="button" className="btn-primary" onClick={onDownload}>
          Download now
        </button>
      )}
      {red && (
        <button type="button" className="btn-primary" onClick={onSkipAI}>
          Continue without AI
        </button>
      )}

      <details className="tier-details">
        <summary>Specs</summary>
        <ul>
          <li>RAM: {report.ramGb.toFixed(1)} GB</li>
          <li>Free disk: {report.freeDiskGb.toFixed(1)} GB</li>
          <li>CPU: {report.cpu}</li>
          <li>OS: {report.os}</li>
          {model && (
            <li>
              Recommended model: {model} · ≈ {sizeGb} GB one-time download
            </li>
          )}
        </ul>
      </details>
    </main>
  );
}
