// Small type guard shared by UI code: does a caught value look like the
// ApiError `{ kind, message }` contract from src/lib/api.ts?

import type { ApiError } from "./api";

export function isApiErrorLike(e: unknown): e is ApiError {
  return (
    typeof e === "object" &&
    e !== null &&
    "kind" in e &&
    typeof (e as { kind: unknown }).kind === "string" &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  );
}
