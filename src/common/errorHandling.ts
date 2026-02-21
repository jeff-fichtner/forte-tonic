/** Utility class for common error-handling patterns */
export class ErrorHandling {
  /** Assert that a value is non-null/undefined, throwing with a descriptive message if not */
  static throwIfNo<T>(obj: T | null | undefined, message: string): asserts obj is T {
    if (!obj) {
      throw new Error(message);
    }
  }
}
