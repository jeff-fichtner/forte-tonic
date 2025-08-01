function addClassNamesToRegistration() {

    const worker = new UnitOfWork();

    const registrations = worker.programRepositoryInstance.getRegistrations();
    const classes = worker.programRepositoryInstance.getClasses();

    const classMap = new Map();
    classes.forEach((cls) => {
        classMap.set(cls.id, cls.title);
    });

    const editedRegistrations = [];
    registrations.forEach((registration) => {
        if (registration.classId && classMap.has(registration.classId)) {
            registration.className = classMap.get(registration.classId);
            editedRegistrations.push(registration);
        }
    });

    if (editedRegistrations.length === 0) {
        console.log('No registrations to update.');
        return;
    }
    
    editedRegistrations.forEach((registration) => {
        worker.dbClient.updateRecord(Keys.REGISTRATIONS, registration);
    });
}