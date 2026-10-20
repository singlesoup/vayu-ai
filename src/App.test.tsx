import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockInvoke } from "./test/mocks";

const { dialogOpenMock } = vi.hoisted(() => ({ dialogOpenMock: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: dialogOpenMock }));

import App from "./App";

describe("First-run flow (task 1.4.4)", () => {
  it("no config → the folder screen shows with the default path", async () => {
    const tauri = mockInvoke();
    tauri.given("get_config", {
      notesDir: null,
      version: 1,
      defaultNotesDir: "C:/Users/samon/Documents/Vayu",
    });
    render(<App />);
    const input = await screen.findByRole("textbox");
    expect(input).toHaveValue("C:/Users/samon/Documents/Vayu");
  });

  it("config present → the folder screen doesn't show; the app goes to today's note", async () => {
    const tauri = mockInvoke();
    tauri.given("get_config", {
      notesDir: "C:/Users/samon/Documents/Vayu",
      version: 1,
      defaultNotesDir: "C:/Users/samon/Documents/Vayu",
    });
    render(<App />);
    // workspace appears (heading "Vayu"); folder screen absent
    await screen.findByText("Vayu");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
  });
});
