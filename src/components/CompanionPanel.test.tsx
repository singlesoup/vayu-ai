import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockInvoke } from "../test/mocks";
import { CompanionPanel } from "./CompanionPanel";

const HITS = [
  { date: "2026-10-20", text: "Reading two chapters of the design book.", score: 0.91 },
  { date: "2026-10-14", text: "Finished the design book notes.", score: 0.85 },
];

describe("CompanionPanel", () => {
  it("shows the companion chrome: header, context, try-asking, composer", async () => {
    const tauri = mockInvoke();
    tauri.given("read_note", {
      exists: true,
      content: "# A softer start\n\nI gave myself permission to begin slowly today.",
    });
    render(<CompanionPanel date="2026-10-21" open refreshKey={0} onOpenDay={vi.fn()} />);

    expect(await screen.findByText("LOCAL COMPANION")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reflect with Vayu" })).toBeInTheDocument();
    expect(screen.getByText("CURRENT CONTEXT")).toBeInTheDocument();
    expect(await screen.findByText("A softer start")).toBeInTheDocument();
    expect(screen.getByText("This entry")).toBeInTheDocument();
    expect(screen.getByText("Try asking")).toBeInTheDocument();
    expect(screen.getByTestId("suggestion-emotion-button")).toHaveTextContent("What is the emotional thread?");
    expect(screen.getByTestId("suggestion-summary-button")).toHaveTextContent("Summarize this entry");
    expect(screen.getByPlaceholderText("Ask about your notes...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
    expect(screen.getByText("Your thoughts stay on this device")).toBeInTheDocument();
  });

  it("replaces the chips with two questions about a long entry", async () => {
    const tauri = mockInvoke();
    tauri.given("read_note", {
      exists: true,
      content: "Caring deeply is the opposite of surface level. ".repeat(8),
    });
    tauri.on("generate", (args) => {
      const ch = args.onEvent as { onmessage: ((e: unknown) => void) | null };
      ch.onmessage?.({ event: "token", value: "What made this feel costly?\nWho did you want to tell?" });
      ch.onmessage?.({ event: "done", value: "" });
      return { status: "Done" };
    });
    render(<CompanionPanel date="2026-10-24" open refreshKey={0} onOpenDay={vi.fn()} />);

    expect(await screen.findByRole("button", { name: /What made this feel costly/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Who did you want to tell/ })).toBeInTheDocument();
    expect(String(tauri.args("generate")!.prompt)).toContain("Caring deeply");
  });

  it("searches the note index, answers from those excerpts, and opens a source day", async () => {
    const tauri = mockInvoke();
    tauri.given("read_note", { exists: true, content: "# Today\n\nA quiet morning." });
    tauri.on("search_index", () => HITS);
    tauri.on("generate", (args) => {
      const ch = args.onEvent as { onmessage: ((e: unknown) => void) | null };
      ch.onmessage?.({ event: "token", value: "You read two chapters on Oct 20." });
      ch.onmessage?.({ event: "done", value: "" });
      return { status: "Done" };
    });
    const onOpenDay = vi.fn();
    render(<CompanionPanel date="2026-10-21" open refreshKey={0} onOpenDay={onOpenDay} />);

    fireEvent.input(screen.getByPlaceholderText("Ask about your notes..."), {
      target: { value: "What did I read this month?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await act(async () => {});

    expect(tauri.ran("search_index")).toBe(true);
    expect(tauri.args("search_index")?.query).toBe("What did I read this month?");
    expect(String(tauri.args("generate")!.prompt)).toContain("Reading two chapters of the design book.");
    expect(String(tauri.args("generate")!.prompt)).not.toContain("A quiet morning.");
    expect(screen.getByText(/You read two chapters on Oct 20/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tue, Oct 20" }));
    expect(onOpenDay).toHaveBeenCalledWith("2026-10-20");
  });

  it("answers from the notes on disk when the embedding index is empty", async () => {
    const tauri = mockInvoke();
    tauri.given("read_note", { exists: true, content: "" });
    tauri.on("search_index", () => []);
    tauri.given("read_all_notes", [
      { date: "2026-10-21", content: "Caring deeply is the opposite of surface level." },
    ]);
    tauri.on("generate", (args) => {
      const ch = args.onEvent as { onmessage: ((e: unknown) => void) | null };
      ch.onmessage?.({ event: "token", value: "The note is about caring deeply." });
      ch.onmessage?.({ event: "done", value: "" });
      return { status: "Done" };
    });
    render(<CompanionPanel date="2026-10-21" open refreshKey={0} onOpenDay={vi.fn()} />);

    fireEvent.click(screen.getByTestId("suggestion-summary-button"));
    await act(async () => {});

    expect(String(tauri.args("generate")!.prompt)).toContain("Caring deeply");
    expect(screen.getByText(/about caring deeply/)).toBeInTheDocument();
  });

  it("abstains without calling the model when there are no notes to read", async () => {
    const tauri = mockInvoke();
    tauri.given("read_note", { exists: true, content: "" });
    tauri.on("search_index", () => []);
    tauri.given("read_all_notes", []);
    render(<CompanionPanel date="2026-10-21" open refreshKey={0} onOpenDay={vi.fn()} />);

    fireEvent.click(screen.getByTestId("suggestion-summary-button"));
    await act(async () => {});

    expect(screen.getByText(/couldn't find anything in your notes/)).toBeInTheDocument();
    expect(tauri.ran("generate")).toBe(false);
  });

  it("shows a calm error when both search and reading notes fail", async () => {
    const tauri = mockInvoke();
    tauri.given("read_note", { exists: false, content: "" });
    tauri.on("search_index", () => {
      throw new Error("boom");
    });
    tauri.on("read_all_notes", () => {
      throw new Error("boom");
    });
    render(<CompanionPanel date="2026-10-21" open refreshKey={0} onOpenDay={vi.fn()} />);

    fireEvent.input(screen.getByPlaceholderText("Ask about your notes..."), {
      target: { value: "anything" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await act(async () => {});

    expect(screen.getByText(/Ask failed\. Try again\./)).toBeInTheDocument();
    expect(tauri.ran("generate")).toBe(false);
  });
});
