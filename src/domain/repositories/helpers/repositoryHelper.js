import { ErrorHandling } from '../../../common/errorHandling.js';

/**
 *
 */
export class RepositoryHelper {
  /**
   *
   */
  static async getAndSetData(getFieldFunc, setFieldFunc, name, forceRefresh = false) {
    if (forceRefresh || !getFieldFunc()) {
      console.log(`Loading ${name}`);
      await setFieldFunc();
      console.log(`${getFieldFunc().length} ${name} found`);
    }

    ErrorHandling.throwIfNo(getFieldFunc(), `No ${name}`);
    return getFieldFunc();
  }
}
