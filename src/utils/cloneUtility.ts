/** Deep clone utility with null/undefined serialization */
export class CloneUtility {
  /** Deep clone an object, converting null/undefined values to empty strings */
  static clone<T extends Record<string, unknown>>(obj: T): T {
    // make all null or undefined values inside the object serializable
    const replacer = (_key: string, value: unknown): unknown => {
      if (value === null || value === undefined) {
        return '';
      }
      return value;
    };

    const clonedObject: T = JSON.parse(JSON.stringify(obj, replacer));
    return obj && obj.constructor
      ? Object.assign(new (obj.constructor as new () => T)(), clonedObject)
      : clonedObject;
  }
}
