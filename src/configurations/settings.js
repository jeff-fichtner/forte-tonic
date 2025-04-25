class Settings {

    constructor(release) {
        this.release = release ?? false;
    }

    get tonicFolderId() {
        if (this.release) {
            return "1JsJh5ImNnyI7BjI77qOwTr0ypMLHcOil";
        }

        return "13pPa0eo2xyn6j_s1aCHqXR2egzO4g0IB";
    }

    get externalSpreadsheetId() {
        return "1LDXnOBaLJz_Zkb5RZZCFhJ0art007ebDDjicK-hJDqQ";
    }

    get workingSpreadsheetId() {
        if (this.release) {
            return "1lHu34pMVTnvULkCTSJX9hGQAxD4RcBY-1mFOr2QDNF0";
        }

        return "17zTUME5PD3FHQmxyUIUn1S_u8QCVeMNf0VRPZXR0FlE";
    }

    get workingFolderId() {
        if (this.release) {
            return "1rhEzFfFSMqzPPr-2LUCj_WYfex3iAMPL";
        }

        return "1O1MyaSCY_gHr6UdHSaegeAK5xZgtrxhA";
    }
}