import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TokenPage } from "./TokenPage";
import { tokenSwatches } from "./tokenData";

describe("TokenPage (task 1.3.4 — dev-only token test page)", () => {
  it("shows one swatch per colour token with name and value", () => {
    render(<TokenPage />);
    const swatches = screen.getAllByTestId("token-swatch");
    expect(swatches.length).toBe(tokenSwatches.length);
    for (const { name, value } of tokenSwatches) {
      expect(screen.getByText(name)).toBeInTheDocument();
      expect(screen.getByText(value)).toBeInTheDocument();
    }
  });

  it("shows one sample per font token", () => {
    render(<TokenPage />);
    expect(screen.getByText("Inter")).toBeInTheDocument();
    expect(screen.getByText("Newsreader")).toBeInTheDocument();
    expect(screen.getByText("JetBrains Mono")).toBeInTheDocument();
  });

  it("shows examples of the radius and spacing tokens", () => {
    render(<TokenPage />);
    expect(screen.getByTestId("radius-example")).toBeInTheDocument();
    expect(screen.getByTestId("spacing-example")).toBeInTheDocument();
  });

  it("shows the type sizes", () => {
    render(<TokenPage />);
    for (const size of ["34px", "22px", "15px", "13px", "12px"]) {
      expect(screen.getByText(size)).toBeInTheDocument();
    }
  });
});
