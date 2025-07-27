const _ = UnderscoreString.load(Underscore.load());

const worker = new UnitOfWork();
const signedInEmail = Authenticator.getSignedInUser();
const operator = worker.userRepositoryInstance.getOperatorByEmail(signedInEmail);
const currentUser = new AuthenticatedUserResponse(
    signedInEmail,
    !!operator,
    operator.isAdmin() ? worker.userRepositoryInstance.getAdminByEmail(operator.admin) : null,
    operator.isInstructor() ? worker.userRepositoryInstance.getInstructorByEmail(operator.instructor) : null,
    operator.isParent() ? worker.userRepositoryInstance.getParentByEmail(operator.parent) : null,
);

// main entry point for the web app
// mandatory to be deployed as a web app
const doGet =
    (request) => {
        return HtmlService.createTemplateFromFile('web/index')
            .evaluate();
    }

// used for including client-side scripts outside of the main HTML file
const include =
    (filename) => {
        return HtmlService.createTemplateFromFile(filename)
            .evaluate()
            .getContent();
    }

const getAuthenticatedUser =
    () => {
        _throwIfNotAuthorized();

        return _fetchData(() => currentUser);
    };

const getAdmins =
    () => {
        _throwIfNotAuthorized();

        return _fetchData(() => {
            return worker.userRepositoryInstance.getAdmins();
        });
    };

const getInstructors =
    () => {
        _throwIfNotAuthorized();

        return _fetchData(() => {
            return worker.userRepositoryInstance.getInstructors();
        });
    };

const getStudents =
    (request) => {
        _throwIfNotAuthorized();

        return _fetchData(() => {
            const allStudents = worker.userRepositoryInstance.getStudents();

            let filteredStudents = [];
            let filterMessage = '';
            if (operator.isInstructor()) {
                filterMessage = 'Filtering students by instructor';
                const registrations = worker.programRepositoryInstance.getRegistrations();
                filteredStudents = allStudents.filter(student => {
                    return registrations.some(registration => {
                        return registration.instructorId === currentUser.instructor.id && registration.studentId === student.id;
                    });
                });
            } else if (operator.isParent()) {
                filterMessage = 'Filtering students by parent';
                filteredStudents = allStudents.filter(student => student.parent1Id === currentUser.parent.id || student.parent2Id === currentUser.parent.id);
            } else {
                filterMessage = 'No filtering applied, returning all students';
                filteredStudents = allStudents;
            }
            console.log(`${filterMessage}: ${filteredStudents.length}`);
            
            return filteredStudents.map(student => { return { id: student.id, firstName: student.firstName, lastName: student.lastName, grade: student.grade } });
        }, request.page, request.pageSize);
    };

const getClasses =
    () => {
        _throwIfNotAuthorized();

        return _fetchData(() => {
            return worker.programRepositoryInstance.getClasses();
        });
    };

const getRegistrations =
    (request) => {
        _throwIfNotAuthorized();

        return _fetchData(() => {
            const allRegistrations = worker.programRepositoryInstance.getRegistrations();

            let filteredRegistrations = [];
            let filterMessage = '';
            if (operator.isInstructor()) {
                filterMessage = 'Filtering registrations by instructor';
                filteredRegistrations = allRegistrations.filter(registration => registration.instructorId === currentUser.instructor.id);
            } else if (operator.isParent()) {
                filterMessage = 'Filtering registrations by parent';
                const allStudents = worker.userRepositoryInstance.getStudents();
                const studentIds = allStudents
                    .filter(student => student.parent1Id === currentUser.parent.id || student.parent2Id === currentUser.parent.id)
                    .map(student => student.id);
                filteredRegistrations = allRegistrations.filter(registration => studentIds.includes(registration.studentId));
            } else {
                filterMessage = 'No filtering applied, returning all registrations';
                filteredRegistrations = allRegistrations;
            }
            console.log(`${filterMessage}: ${filteredRegistrations.length}`);
            
            return filteredRegistrations;
        }, request.page, request.pageSize);
    };

const getRooms =
    () => {
        _throwIfNotAuthorized();

        return _fetchData(() => {
            return worker.userRepositoryInstance.getRooms();
        });
    };

const registerPrivateLesson =
    (request) => {
        _throwIfNotAuthorized();

        const data = _retrieveDataFromRequest(request);

        const instructor = worker.userRepositoryInstance.getInstructorById(data.instructorId);

        const newRegistration = worker.programRepositoryInstance.register(data, instructor, currentUser);

        return _respond({
            newRegistration
        });
    }

const unregisterPrivateLesson =
    (request) => {
        _throwIfNotAuthorized();

        const data = _retrieveDataFromRequest(request);

        const success = worker.programRepositoryInstance.unregister(data.id, currentUser);

        return _respond({
            success
        });
    }

const _throwIfNotAuthorized =
    () => {
        // only permit operators for now
        if (!currentUser.isOperator) {
            throw new Error(`User is not an operator: '${currentUser.email}'`);
        }
    }

const _fetchData = (dataFunction, page, pageSize) => {
    console.log(`page ${page}, pageSize ${pageSize}`);

    const data = dataFunction(); // Execute the data-fetching logic

    if (page == null || !pageSize) {
        return _respond(data); // Return full data if no pagination is requested
    }

    // Apply pagination if page and pageSize are provided
    return _respond(paginate(data, page, pageSize));
};

const _respond =
    (response) => {
        const serializedResponse = JSON.stringify(response);
        console.log(`Response: ${serializedResponse}`);
        return serializedResponse;
    };

const paginate = (data, page = 0, pageSize = 10) => {
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = data.slice(startIndex, endIndex);

    return {
        data: paginatedData,
        total: data.length,
        page,
        pageSize,
    };
};

const _retrieveDataFromRequest = (request) => {
    // Extract the data object from the request body
    console.log('Received request:', request);
    const { data } = request;

    // Validate that the data object is provided
    if (!data) {
        throw new Error('Data object is required');
    }

    // Process the data object (example: log it)
    console.log('Received data:', data);

    return data;
};