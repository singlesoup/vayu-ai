// Task 2.4/2.5: download screen — model name, exact size, PRD copy,
// progress + % + cancel.

type Props = {
  model: string;
  sizeGb: number;
  progress: { completed: number; total?: number; percent?: number } | null;
  onCancel: () => void;
};

function formatBytes(bytes: number): string {
  return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
}

export function DownloadScreen({ model, sizeGb, progress, onCancel }: Props) {
  const percent = progress
    ? progress.percent ?? (progress.total ? Math.round((progress.completed / progress.total) * 100) : 0)
    : 0;

  return (
    <main className="first-run">
      <h1>Downloading {model}</h1>
      <p>
        Vayu thinks on your PC, not in the cloud. To do that, it needs to
        download its brain once — one-time, free, no account, no API key.
        After this, it works fully offline and your notes never leave this PC.
      </p>
      <p>
        {model} · ≈ {sizeGb} GB one-time download
      </p>
      {progress && (
        <div
          className="download-progress"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span>{percent}%</span>
          <div className="download-progress-track">
            <div className="download-progress-fill" style={{ width: `${percent}%` }} />
          </div>
          <span>
            {formatBytes(progress.completed)} /{" "}
            {progress.total ? formatBytes(progress.total) : "?"}
          </span>
        </div>
      )}
      <button type="button" className="btn-ghost" onClick={onCancel}>
        Cancel
      </button>
    </main>
  );
}
