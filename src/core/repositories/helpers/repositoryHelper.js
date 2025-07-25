class RepositoryHelper {
  static getAndSetData(getFieldFunc, setFieldFunc, name, forceRefresh = false) {
    if (forceRefresh || !getFieldFunc()) {
      console.log(`Loading ${name}`);
      setFieldFunc();
      console.log(`${getFieldFunc().length} ${name} found`);
    }

    ErrorHandling.throwIfNo(getFieldFunc(), `No ${name}`);
    return getFieldFunc();
  }
}
