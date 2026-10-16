/** Injected so code never reads the wall clock directly (see docs/standards/testing.md#6-determinism). */
export interface Clock {
  now(): Date;
}

/** Injected so code never generates random IDs directly. */
export interface IdGenerator {
  next(): string;
}
