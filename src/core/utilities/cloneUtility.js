class CloneUtility {
    static clone(obj, mapFunc = null) {
        // make all null or undefined values inside the object serializable
        const replacer = (key, value) => {
            if (value === null || value === undefined) {
                return '';
            }
            return value;
        };
        
        const clonedObject = JSON.parse(JSON.stringify(obj, replacer));
        return mapFunc ? mapFunc(clonedObject) : clonedObject;
    }
}