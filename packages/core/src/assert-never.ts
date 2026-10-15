/** Exhaustiveness check for discriminated unions: a compile error appears if a variant is unhandled. */
export function assertNever(_value: never): never {
  // The value is not included in the message: it could contain personal data.
  throw new Error("Unexpected variant in exhaustive switch");
}
