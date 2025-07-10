class RepositoryHelper {
  static getAndSetData(getFieldFunc, setFieldFunc, name, prepFunc = null) {
    if (!getFieldFunc()) {
      console.log(`Loading ${name}`);
      if (prepFunc) {
        console.log(`Preparing ${name}`);
        prepFunc();
      }
      setFieldFunc();
      console.log(`${getFieldFunc().length} ${name} found`);
    }

    ErrorHandling.throwIfNo(getFieldFunc(), `No ${name}`);
    return getFieldFunc();
  }
}
