// Task 3.8 (Settings → Model card) + 3.4 (Re-index button): the stored tier
// as plain words (Full / Lite / No-AI), the recommended model + its one-time
// size, a Re-run check action, a Re-index action for the local search index,
// and the BYOK row as a "coming soon" label only.
import { useEffect, useState } from "react";
import { getConfig, hardwareCheck, reindex, type HardwareReport, type Tier } from "../lib/api";
import { tierLabel } from "../lib/tiers";

function sizeLine(report: HardwareReport | null): string {
  if (!report) return "";
  return report.model
    ? `${report.model} — about ${report.sizeGb} GB of disk space`
    : "No chat model for this tier";
}

type Props = {
  /** Let the parent (ModelStatus) refresh the model list too. */
  onModelsChanged?: () => void;
};

export function ModelCard({ onModelsChanged }: Props) {
  const [storedTier, setStoredTier] = useState<Tier | null>(null);
  const [report, setReport] = useState<HardwareReport | null>(null);
  const [indexInfo, setIndexInfo] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);

  useEffect(() => {
    void getConfig()
      .then((c) => setStoredTier((c.tier as Tier) ?? null))
      .catch(() => setStoredTier(null));
    void hardwareCheck()
      .then(setReport)
      .catch(() => setReport(null));
  }, []);

  const runCheck = () => {
    void hardwareCheck()
      .then(setReport)
      .catch(() => setReport(null));
  };

  const reindexNow = () => {
    setReindexing(true);
    void reindex()
      .then((stats) => {
        setIndexInfo(
          `Index rebuilt: ${stats.indexed} day(s), ${stats.chunks} chunks`,
        );
        onModelsChanged?.();
      })
      .catch(() => setIndexInfo("Index failed — is Ollama running?"))
      .finally(() => setReindexing(false));
  };

  return (
    <div className="model-card">
      <p className="model-tier" role="status">
        Tier: {tierLabel(storedTier ?? report?.tier ?? null)}
      </p>
      <p className="model-size" role="status">
        {sizeLine(report)}
      </p>
      <div className="model-actions">
        <button type="button" className="btn-ghost" onClick={runCheck}>
          Re-run check
        </button>
        <button type="button" className="btn-ghost" onClick={reindexNow} disabled={reindexing}>
          {reindexing ? "Indexing…" : "Re-index"}
        </button>
      </div>
      {indexInfo && <p className="settings-reason" role="status">{indexInfo}</p>}
      <p className="byok-coming-soon" role="status">
        Use your own API key — coming soon
      </p>
    </div>
  );
}
