class Settings {

    constructor(release) {
        this.release = release ?? false;
    }

    // forte_external
    get externalSpreadsheetId() {
        return "1LDXnOBaLJz_Zkb5RZZCFhJ0art007ebDDjicK-hJDqQ";
    }
    
    // _dev|_prod
    get workingFolderId() {
        if (this.release) {
            return "";
        }

        return "1O1MyaSCY_gHr6UdHSaegeAK5xZgtrxhA";
    }

    get workingSpreadsheetName() {
        if (this.release) {
            return "forte_tonic_prod";
        }

        return "forte_tonic_dev";
    }
}