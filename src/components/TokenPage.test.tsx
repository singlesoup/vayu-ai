import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TokenPage } from "./TokenPage";
import { tokenSwatches } from "./tokenData";

describe("TokenPage (task 1.3.4 — dev-only token test page)", () => {
  it("shows one swatch per colour token with name and value", () => {
    render(<TokenPage />);
    const rows = screen.getAllByTestId("token-swatch").map((el) => el.closest("li"));
    expect(rows.length).toBe(tokenSwatches.length);
    // Swatch rows render in token order; each row carries its own name/value
    // pair. Scoping per row because alias tokens legitimately share values.
    tokenSwatches.forEach(({ name, value }, i) => {
      const row = rows[i];
      expect(row).not.toBeNull();
      expect(within(row as HTMLElement).getByText(name)).toBeInTheDocument();
      expect(within(row as HTMLElement).getByText(value)).toBeInTheDocument();
    });
  });

  it("shows one sample per font token", () => {
    render(<TokenPage />);
    expect(screen.getByText('"DM Sans"')).toBeInTheDocument();
    expect(screen.getByText("Fraunces")).toBeInTheDocument();
    expect(screen.getByText('"DM Mono"')).toBeInTheDocument();
  });

  it("shows examples of the radius and spacing tokens", () => {
    render(<TokenPage />);
    expect(screen.getByTestId("radius-example")).toBeInTheDocument();
    expect(screen.getByTestId("spacing-example")).toBeInTheDocument();
  });

  it("shows the type sizes", () => {
    render(<TokenPage />);
    for (const size of ["2.125rem", "0.563rem", "0.625rem", "1.25rem", "1rem"]) {
      expect(screen.getByText(size)).toBeInTheDocument();
    }
  });
});
