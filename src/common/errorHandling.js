/**
 *
 */
export class ErrorHandling {
  /**
   *
   */
  static throwIfNo(obj, message) {
    if (!obj) {
      throw new Error(message);
    }
  }
}
