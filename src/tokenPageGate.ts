// Task 1.3.4: the token test page is dev-only. The gate lives in a tiny pure
// function so both branches can be unit-tested (see tokenPageGate.test.tsx).

export function shouldShowTokenPage(isDevBuild: boolean, param: string | null): boolean {
  return isDevBuild && param === "tokens";
}
