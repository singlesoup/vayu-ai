import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
// Import order matters: the Tauri invoke mock must be registered before the
// component (and its api module) resolves @tauri-apps/api/core.
import { mockInvoke } from "../test/mocks";

const { dialogOpenMock } = vi.hoisted(() => ({ dialogOpenMock: vi.fn<() => Promise<unknown>>() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: dialogOpenMock }));

import { FirstRunScreen } from "./FirstRunScreen";

describe("FirstRunScreen (task 1.4.4)", () => {
  it("shows the default notes folder pre-filled", () => {
    render(<FirstRunScreen defaultPath="C:/Users/samon/Documents/Vayu" onSaved={vi.fn()} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("C:/Users/samon/Documents/Vayu");
  });

  it("lets the user type a different path", async () => {
    const user = userEvent.setup();
    render(<FirstRunScreen defaultPath="C:/docs/Vayu" onSaved={vi.fn()} />);
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "E:/notes");
    expect(input).toHaveValue("E:/notes");
  });

  it("Choose folder opens the dialog and updates the path", async () => {
    const user = userEvent.setup();
    dialogOpenMock.mockResolvedValueOnce("C:/Users/chosen");
    render(<FirstRunScreen defaultPath="C:/docs/Vayu" onSaved={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Choose folder…" }));
    expect(dialogOpenMock).toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toHaveValue("C:/Users/chosen");
  });

  it("dialog cancelled keeps the current path", async () => {
    const user = userEvent.setup();
    dialogOpenMock.mockResolvedValueOnce(null);
    render(<FirstRunScreen defaultPath="C:/docs/Vayu" onSaved={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Choose folder…" }));
    expect(screen.getByRole("textbox")).toHaveValue("C:/docs/Vayu");
  });

  it("Continue calls set_notes_dir and reports success", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const tauri = mockInvoke();
    tauri.given("set_notes_dir", null);
    render(<FirstRunScreen defaultPath="C:/docs/Vayu" onSaved={onSaved} />);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("C:/docs/Vayu"));
    expect(tauri.ran("set_notes_dir")).toBe(true);
    expect(tauri.args("set_notes_dir")).toEqual({ path: "C:/docs/Vayu" });
  });

  it("a set_notes_dir error shows a plain message and the screen stays", async () => {
    const user = userEvent.setup();
    const tauri = mockInvoke();
    tauri.givenError("set_notes_dir", {
      kind: "NotADirectory",
      message: "that path is a file",
    });
    const onSaved = vi.fn();
    render(<FirstRunScreen defaultPath="C:/docs/Vayu" onSaved={onSaved} />);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText(/Couldn't use that folder/, { exact: false })).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(tauri.ran("set_notes_dir")).toBe(true);
  });
});
