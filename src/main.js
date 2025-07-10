const _ = UnderscoreString.load(Underscore.load());

const RegistrationType = {
  PRIVATE: 'private',
  GROUP: 'group',
}

const worker = new UnitOfWork();
const currentUser = Authenticator.getSignedInUser();
const isAdmin = worker.userRepositoryInstance.isAdmin(Authenticator.getSignedInUser());

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
    return fetchData(Authenticator.getSignedInUser);
  };

const getInstructors =
  () => {
    return fetchData(() => {
      return worker.userRepositoryInstance.getInstructors();
    });
  };

const getStudents =
  () => {
    return fetchData(() => {
      return worker.userRepositoryInstance.getStudents();
    });
  };

const getClasses =
  () => {
    return fetchData(() => {
      return worker.programRepositoryInstance.getClasses();
    });
  };

const getRegistrations =
  () => {
    return fetchData(() => {
      return worker.programRepositoryInstance.getRegistrations();
    });
  };

const getRooms =
  () => {
    return fetchData(() => {
      return worker.userRepositoryInstance.getRooms();
    });
  };

const searchStudentsByName =
  (request) => {
    throwIfNotAdmin();

    const data = retrieveDataFromRequest(request);
    console.log('Search students with name:', data.name);

    return fetchData(() => {
      let students = worker.userRepositoryInstance.searchStudentsByName(data.name);
      return students.map(student => { return { id: student.id, firstName: student.firstName, lastName: student.lastName } });
    });
  };

const registerPrivateLesson =
  (request) => {
    throwIfNotAdmin();

    const data = retrieveDataFromRequest(request);
    // const data = {
    //   day: "2",
    //   instructorId: "TEACHER8@EMAIL.COM",
    //   instrument: "Voice",
    //   length: "30",
    //   startTime: "16:00",
    //   studentId: "131509",
    //   transportationType: "pickup",
    // }

    const instructor = worker.userRepositoryInstance.getInstructorById(data.instructorId);

    const newRegistration = worker.programRepositoryInstance.register(data, instructor, currentUser);

    return respond({
      newRegistration
    });
  }

const unregisterPrivateLesson =
  (request) => {
    throwIfNotAdmin();

    const data = retrieveDataFromRequest(request);
    const success = worker.programRepositoryInstance.unregister(data.id, currentUser);

    return respond({
      success
    });
  }

const throwIfNotAdmin =
  (user) => {
    // only permit admins
    if (!isAdmin) {
      throw new Error('User is not an admin');
    }
  }

// Shared method for fetching data with optional pagination
const fetchData = (dataFunction, page, pageSize) => {
  console.log(`page ${page}, pageSize ${pageSize}`);

  throwIfNotAdmin(); // Ensure the user is authorized
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

// Utility function for pagination
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