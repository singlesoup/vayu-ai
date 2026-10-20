// Task 1.4.4: first-run screen — ask for (or confirm) the notes folder.
// On "Continue" it validates + saves via set_notes_dir (the Rust side creates
// a missing folder and rejects paths that are files). No folder is touched
// beyond that here.

import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { setNotesDir } from "../lib/api";
import { isApiErrorLike } from "../lib/apiErrors";

type Props = {
  defaultPath: string;
  onSaved: (dir: string) => void;
};

export function FirstRunScreen({ defaultPath, onSaved }: Props) {
  const [path, setPath] = useState(defaultPath);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function chooseFolder() {
    const picked = await open({ directory: true, multiple: false });
    if (typeof picked === "string" && picked.length > 0) {
      setPath(picked);
    }
  }

  async function continueWithFolder() {
    setBusy(true);
    setError(null);
    try {
      await setNotesDir(path);
      onSaved(path);
    } catch (e) {
      setError(
        isApiErrorLike(e)
          ? `Couldn't use that folder. ${e.message}`
          : "Couldn't use that folder. Please try another one.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="first-run">
      <h1>Where should Vayu keep your notes?</h1>
      <p>
        Your notes stay as plain <code>.md</code> files in a folder you choose — readable in
        Notepad, survivable if Vayu disappears.
      </p>
      <div className="first-run-row">
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.currentTarget.value)}
          aria-label="Notes folder"
        />
        <button type="button" onClick={() => void chooseFolder()}>
          Choose folder…
        </button>
      </div>
      <button type="button" onClick={() => void continueWithFolder()} disabled={busy}>
        Continue
      </button>
      {error && (
        <p className="form-error" role="status">
          {error}
        </p>
      )}
    </main>
  );
}
