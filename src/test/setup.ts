import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Vitest runs without `globals: true`, so Testing Library's automatic cleanup
// doesn't fire on its own — do it explicitly after every test.
afterEach(() => {
  cleanup();
});
