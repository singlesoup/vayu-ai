// Wires the Phase 2 first-run screens into the running app: hardware tier,
// then either "the model is already here" or the download screen.
import { useEffect, useState } from "react";
import {
  hardwareCheck,
  listModels,
  pullModel,
  cancelPull,
  updateConfig,
  verifyInstall,
  type HardwareReport,
  type PullProgress,
  type Tier,
} from "../lib/api";
import { isApiErrorLike } from "../lib/apiErrors";
import { TierResultScreen } from "./TierResultScreen";
import { DownloadScreen } from "./DownloadScreen";

type Props = {
  notesDir: string;
  onComplete: () => void;
};

type Phase = "checking" | "tier" | "downloading" | "ready" | "error";

export function SetupFlow({ notesDir, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [report, setReport] = useState<HardwareReport | null>(null);
  const [modelInstalled, setModelInstalled] = useState(false);
  const [progress, setProgress] = useState<PullProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([hardwareCheck(notesDir), listModels()])
      .then(([hw, models]) => {
        if (cancelled) return;
        setReport(hw);
        const recommended = hw.model !== null && models.present.includes(hw.model);
        // A debug chat model (VAYU_DEV_CHAT_MODEL) can already talk, so this PC
        // skips the multi-gig pull the same way an installed PRD model does.
        setModelInstalled(recommended || models.devChatModel !== null);
        setPhase("tier");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(isApiErrorLike(err) ? err.message : "Couldn't check this PC.");
        setPhase("error");
      });
    return () => {
      cancelled = true;
    };
  }, [notesDir, attempt]);

  function recheck() {
    setError(null);
    setPhase("checking");
    setAttempt((n) => n + 1);
  }

  async function remember(tier: Tier, aiEnabled: boolean, modelTag?: string) {
    await updateConfig({
      tier,
      aiEnabled,
      ...(modelTag !== undefined ? { modelTag } : {}),
    });
    onComplete();
  }

  async function startDownload() {
    if (report?.model == null) return;
    const model = report.model;
    setProgress(null);
    setError(null);
    setPhase("downloading");
    try {
      await pullModel(model, (event) => {
        if (event.event === "progress") setProgress(event.value);
      });
      const verified = await verifyInstall(model);
      if (!verified.generationOk) {
        setError("The model downloaded, but a test reply didn't come back. Your notes still work.");
        setPhase("tier");
        return;
      }
      setPhase("ready");
    } catch (err) {
      setError(isApiErrorLike(err) ? err.message : "The download didn't finish. Your notes still work.");
      setPhase("tier");
    }
  }

  if (phase === "checking" || report === null) {
    return (
      <main className="first-run">
        <h1>Checking this PC…</h1>
        {phase === "error" && (
          <>
            <p className="form-error" role="status">
              {error}
            </p>
            <button type="button" className="btn-primary" onClick={recheck}>
              Try again
            </button>
          </>
        )}
      </main>
    );
  }

  if (phase === "downloading" && report.model) {
    return (
      <DownloadScreen
        model={report.model}
        sizeGb={report.sizeGb}
        progress={progress}
        onCancel={() => {
          void cancelPull();
          setPhase("tier");
        }}
      />
    );
  }

  if (phase === "ready" && report.model) {
    return (
      <main className="first-run">
        <h1>You're ready</h1>
        <p>The model answered a test question. Vayu can plan your morning on this PC.</p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => void remember(report.tier, true, report.model ?? undefined)}
        >
          Open Vayu
        </button>
      </main>
    );
  }

  return (
    <>
      {error && (
        <p className="form-error setup-error" role="status">
          {error}
        </p>
      )}
      <TierResultScreen
        report={report}
        modelInstalled={modelInstalled}
        onDownload={() => void startDownload()}
        onSkipAI={() => void remember("Red", false)}
        onRecheckOllama={recheck}
        onOpenApp={() => void remember(report.tier, report.tier !== "Red", report.model ?? undefined)}
      />
    </>
  );
}
