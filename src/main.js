const _ = UnderscoreString.load(Underscore.load());

const worker = new UnitOfWork();
const signedInEmail = Authenticator.getSignedInUser();
const currentUser = new AuthenticatedUserResponse(
    signedInEmail,
    !!worker.userRepositoryInstance.isOperator(signedInEmail),
    worker.userRepositoryInstance.getAdminByEmail(signedInEmail),
    worker.userRepositoryInstance.getInstructorByEmail(signedInEmail),
    worker.userRepositoryInstance.getParentByEmail(signedInEmail),
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
    throwIfNotAuthorized();

    return fetchData(() => currentUser);
  };

const getInstructors =
  () => {
    throwIfNotAuthorized();

    return fetchData(() => {
      return worker.userRepositoryInstance.getInstructors();
    });
  };

const getStudents =
  (request) => {
    throwIfNotAuthorized();

    return fetchData(() => {
      const students = worker.userRepositoryInstance.getStudents();
      return students.map(student => { return { id: student.id, firstName: student.firstName, lastName: student.lastName, grade: student.grade } });
    }, request.page, request.pageSize);
  };

const getClasses =
  () => {
    throwIfNotAuthorized();

    return fetchData(() => {
      return worker.programRepositoryInstance.getClasses();
    });
  };

const getRegistrations =
  (request) => {
    throwIfNotAuthorized();

    return fetchData(() => {
      return worker.programRepositoryInstance.getRegistrations();
    }, request.page, request.pageSize);
  };

const getRooms =
  () => {
    throwIfNotAuthorized();

    return fetchData(() => {
      return worker.userRepositoryInstance.getRooms();
    });
  };

const searchStudentsByName =
  (request) => {
    throwIfNotAuthorized();

    const data = retrieveDataFromRequest(request);
    console.log('Search students with name:', data.name);

    return fetchData(() => {
      const students = worker.userRepositoryInstance.searchStudentsByName(data.name);
      return students.map(student => { return { id: student.id, firstName: student.firstName, lastName: student.lastName } });
    });
  };

const registerPrivateLesson =
  (request) => {
    throwIfNotAuthorized();

    const data = retrieveDataFromRequest(request);

    const instructor = worker.userRepositoryInstance.getInstructorById(data.instructorId);

    const newRegistration = worker.programRepositoryInstance.register(data, instructor, currentUser);

    return respond({
      newRegistration
    });
  }

const unregisterPrivateLesson =
  (request) => {
    throwIfNotAuthorized();

    const data = retrieveDataFromRequest(request);
    const success = worker.programRepositoryInstance.unregister(data.id, currentUser);

    return respond({
      success
    });
  }

const throwIfNotAuthorized =
  () => {
    // only permit operators for now
    if (!currentUser.isOperator) {
      throw new Error(`User is not an operator: '${currentUser.email}'`);
    }
  }

const fetchData = (dataFunction, page, pageSize) => {
  console.log(`page ${page}, pageSize ${pageSize}`);

  const data = dataFunction(); // Execute the data-fetching logic

  if (page == null || !pageSize) {
    return respond(data); // Return full data if no pagination is requested
  }

  // Apply pagination if page and pageSize are provided
  return respond(paginate(data, page, pageSize));
};

const respond =
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

const retrieveDataFromRequest = (request) => {
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