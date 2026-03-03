/**
 *
 */
export class PromiseHelpers {
  // returns a function that can be used to execute a task and return a promise
  /**
   *
   */
  static promisify(fn: (...args: unknown[]) => void): (...args: unknown[]) => Promise<boolean> {
    return (...args: unknown[]) =>
      new Promise((resolve, reject) => {
        try {
          fn(...args);
          resolve(true);
        } catch (error) {
          reject(error);
        }
      });
  }
  // returns a function that can be used to execute a task and return a promise with the result
  /**
   *
   */
  static promisifyWithResult<T>(fn: (...args: unknown[]) => T): (...args: unknown[]) => Promise<T> {
    return (...args: unknown[]) =>
      new Promise((resolve, reject) => {
        try {
          const result = fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
  }

  // returns a promise that resolves when the specified event is fired on the target
  /**
   *
   */
  static promisifyEvent(
    eventName: string,
    target: EventTarget,
    resolveOnce: boolean = true
  ): Promise<Event> {
    return new Promise(resolve => {
      target.addEventListener(eventName, resolve, { once: resolveOnce });
    });
  }
}
