// Injectable clock for tests (task 1.5.4). Production code always gets the
// real `new Date()`; tests replace the provider temporarily.

let provider: () => Date = () => new Date();

export function now(): Date {
  return provider();
}

export function setNowProvider(p: () => Date): void {
  provider = p;
}

export function resetNowProvider(): void {
  provider = () => new Date();
}
