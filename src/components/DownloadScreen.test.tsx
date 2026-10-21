// Task 2.4/2.5: download screen — model name, exact size, PRD copy,
// progress + % + cancel.
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DownloadScreen } from "./DownloadScreen";

describe("DownloadScreen (task 2.4/2.5)", () => {
  const renderScreen = (progress: Parameters<typeof DownloadScreen>[0]["progress"] | null = null) =>
    render(<DownloadScreen model="gemma3n:e2b" sizeGb={5.6} progress={progress} onCancel={() => {}} />);

  it("shows model name, exact size, PRD copy", () => {
    renderScreen(null);
    expect(screen.getByText(/Downloading gemma3n:e2b/)).toBeInTheDocument();
    expect(screen.getByText(/gemma3n:e2b · ≈ 5\.6 GB/)).toBeInTheDocument();
    expect(screen.getByText(/not in the cloud/)).toBeInTheDocument();
    expect(screen.getByText(/one-time download/)).toBeInTheDocument();
    expect(screen.getByText(/free/)).toBeInTheDocument();
    expect(screen.getByText(/no account/)).toBeInTheDocument();
    expect(screen.getByText(/no API key/)).toBeInTheDocument();
  });

  it("progress updates the bar and the percent", () => {
    renderScreen({ completed: 400, total: 1000, percent: 40 });
    expect(screen.getByText(/40%/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
  });

  it("no progress before the pull starts", () => {
    renderScreen(null);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("Cancel calls onCancel", () => {
    const onCancel = vi.fn();
    render(<DownloadScreen model="gemma3n:e2b" sizeGb={5.6} progress={null} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
