import { ErrorHandling } from '../../common/errorHandling.js';

/**
 *
 */
export class RepositoryHelper {
  /**
   *
   */
  static async getAndSetData(getFieldFunc, setFieldFunc, name, forceRefresh = false) {
    // Check if data already exists and we're not forcing refresh
    if (!forceRefresh && getFieldFunc()) {
      return getFieldFunc();
    }

    // Prevent concurrent calls by checking if loading is already in progress
    const loadingKey = `_loading_${name}`;
    if (this[loadingKey]) {
      // Wait for the existing load to complete
      await this[loadingKey];
      return getFieldFunc();
    }

    // Set loading flag and start loading
    this.logger.info(`Loading ${name}`);
    this[loadingKey] = setFieldFunc();

    try {
      await this[loadingKey];
      this.logger.info(`${getFieldFunc().length} ${name} found`);
    } finally {
      // Clear the loading flag
      delete this[loadingKey];
    }

    ErrorHandling.throwIfNo(getFieldFunc(), `No ${name}`);
    return getFieldFunc();
  }
}
