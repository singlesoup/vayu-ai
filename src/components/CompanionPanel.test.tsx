import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockInvoke } from "../test/mocks";
import { CompanionPanel } from "./CompanionPanel";

describe("CompanionPanel", () => {
  it("shows the companion chrome: header, context, try-asking, composer", async () => {
    const tauri = mockInvoke();
    tauri.given("read_note", {
      exists: true,
      content: "# A softer start\n\nI gave myself permission to begin slowly today.",
    });
    render(<CompanionPanel date="2026-10-21" open refreshKey={0} />);

    expect(await screen.findByText("LOCAL COMPANION")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reflect with Vayu" })).toBeInTheDocument();
    expect(screen.getByText("CURRENT CONTEXT")).toBeInTheDocument();
    expect(await screen.findByText("A softer start")).toBeInTheDocument();
    expect(screen.getByText("This entry")).toBeInTheDocument();
    expect(screen.getByText("Try asking")).toBeInTheDocument();
    expect(screen.getByTestId("suggestion-emotion-button")).toHaveTextContent("What is the emotional thread?");
    expect(screen.getByTestId("suggestion-summary-button")).toHaveTextContent("Summarize this entry");
    expect(screen.getByPlaceholderText("Ask about this entry...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
    expect(screen.getByText("Your thoughts stay on this device")).toBeInTheDocument();
  });
});
