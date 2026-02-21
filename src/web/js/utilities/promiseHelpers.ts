/**
 *
 */
export class PromiseHelpers {
  // returns a function that can be used to execute a task and return a promise
  /**
   *
   */
  static promisify(fn) {
    return (...args) =>
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
  static promisifyWithResult(fn) {
    return (...args) =>
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
  static promisifyEvent(eventName, target, resolveOnce = true) {
    return new Promise(resolve => {
      target.addEventListener(eventName, resolve, { once: resolveOnce });
    });
  }
}

// Expose to window for console debugging and runtime access
window.PromiseHelpers = PromiseHelpers;
