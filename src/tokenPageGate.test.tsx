import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { shouldShowTokenPage } from "./tokenPageGate";
import App from "./App";

describe("token page gate (task 1.3.4 AC3)", () => {
  it("is shown in dev when the dev=tokens query param is present", () => {
    expect(shouldShowTokenPage(true, "tokens")).toBe(true);
  });

  it("is never shown without the query param", () => {
    expect(shouldShowTokenPage(true, null)).toBe(false);
    expect(shouldShowTokenPage(true, "other")).toBe(false);
  });

  it("is never shown in a release build, even with the param", () => {
    expect(shouldShowTokenPage(false, "tokens")).toBe(false);
  });

  it("the app shell renders the token page under ?dev=tokens in dev builds", () => {
    window.history.replaceState(null, "", "/?dev=tokens");
    render(<App />);
    expect(screen.getAllByTestId("token-swatch").length).toBeGreaterThan(0);
  });

  it("the app shell does not show token cards without the param", () => {
    window.history.replaceState(null, "", "/");
    render(<App />);
    expect(screen.queryByTestId("token-swatch")).not.toBeInTheDocument();
  });
});
