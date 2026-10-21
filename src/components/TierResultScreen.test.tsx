// Task 2.3: tier result screen — plain words, specs under "details",
// one primary action.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HardwareReport } from "../lib/api";
import { TierResultScreen } from "./TierResultScreen";

const report = (overrides: Partial<HardwareReport> = {}): HardwareReport => ({
  ramGb: 8,
  freeDiskGb: 200,
  cpu: "Intel i3",
  os: "windows x64",
  tier: "Yellow",
  model: "gemma3n:e2b",
  sizeGb: 5.6,
  ollamaPresent: true,
  ...overrides,
});

describe("TierResultScreen (task 2.3)", () => {
  it("Green tier: plain words, E4B, primary action is Download now", () => {
    render(<TierResultScreen report={report({ tier: "Green", model: "gemma3n:e4b", sizeGb: 7.5 })} modelInstalled={false} onDownload={() => {}} onSkipAI={() => {}} onRecheckOllama={() => {}} onOpenApp={() => {}} />);
    expect(screen.getByText(/Your PC: Green tier/)).toBeInTheDocument();
    expect(screen.getByText(/Gemma E4B/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download now" })).toBeInTheDocument();
  });

  it("Yellow tier: E2B", () => {
    render(<TierResultScreen report={report()} modelInstalled={false} onDownload={() => {}} onSkipAI={() => {}} onRecheckOllama={() => {}} onOpenApp={() => {}} />);
    expect(screen.getByText(/Your PC: Yellow tier/)).toBeInTheDocument();
    expect(screen.getByText(/Gemma E2B/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download now" })).toBeInTheDocument();
  });

  it("Red tier: calm no-AI line, Continue without AI", () => {
    render(<TierResultScreen report={report({ tier: "Red", model: null, sizeGb: 0 })} modelInstalled={false} onDownload={() => {}} onSkipAI={() => {}} onRecheckOllama={() => {}} onOpenApp={() => {}} />);
    expect(screen.getByText(/can't run AI chat locally/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue without AI" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download now" })).not.toBeInTheDocument();
  });

  it("specs live under 'Details'", () => {
    render(<TierResultScreen report={report()} modelInstalled={false} onDownload={() => {}} onSkipAI={() => {}} onRecheckOllama={() => {}} onOpenApp={() => {}} />);
    expect(screen.getByText(/specs/i)).toBeInTheDocument();
    expect(screen.getByText(/8\.0 GB/)).toBeInTheDocument();
    expect(screen.getByText(/gemma3n:e2b · ≈ 5\.6 GB/)).toBeInTheDocument();
  });

  it("Ollama absent: offers 'I already have Ollama' instead of Download now", () => {
    render(<TierResultScreen report={report({ ollamaPresent: false })} modelInstalled={false} onDownload={() => {}} onSkipAI={() => {}} onRecheckOllama={() => {}} onOpenApp={() => {}} />);
    expect(screen.getByRole("button", { name: "I already have Ollama" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download now" })).not.toBeInTheDocument();
  });

  it("model already installed: Open Vayu instead of downloading", () => {
    render(<TierResultScreen report={report()} modelInstalled={true} onDownload={() => {}} onSkipAI={() => {}} onRecheckOllama={() => {}} onOpenApp={() => {}} />);
    expect(screen.getByRole("button", { name: "Open Vayu" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download now" })).not.toBeInTheDocument();
  });
});
