const _ = UnderscoreString.load(Underscore.load());
const worker = new UnitOfWork();

// main entry point for the web app
// mandatory to be deployed as a web app
const doGet =
  (request) => {
    return HtmlService.createTemplateFromFile('web/incomingIndex')
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
  ({ page, pageSize }) => {
    return fetchData(() => {
      return worker.userRepositoryInstance.getInstructors();
    }, page, pageSize);
  };

const getStudents =
  ({ page, pageSize }) => {
    return fetchData(() => {
      return worker.userRepositoryInstance.getStudents();
    }, page, pageSize);
  };

const getClasses =
  ({ page, pageSize }) => {
    return fetchData(() => {
      return worker.programRepositoryInstance.getClasses();
    }, page, pageSize);
  };

const getRegistrations =
  ({ page, pageSize }) => {
    return fetchData(() => {
      return worker.programRepositoryInstance.getRegistrations();
    }, page, pageSize);
  };

const getRooms =
  ({ page, pageSize }) => {
    return fetchData(() => {
      return worker.userRepositoryInstance.getRooms();
    }, page, pageSize);
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


const register =
  (request) => {
    throwIfNotAdmin();

    const data = retrieveDataFromRequest(request);

    const registration = worker.programRepositoryInstance.register(user, data);

    return respond({
      registration
    });
  }

// const unregister =
//   () => {
//     throwIfNotAdmin();

//     const worker = new UnitOfWork();

//     const user = Authenticator.getSignedInUser();
//     const lessonId = ;

//     if (!lessonId) {
//       throw new Error('Lesson ID is required');
//     }

//     const registration = worker.programRepositoryInstance.unregister(user, lessonId);

//     return respond({
//       registration
//     });
//   }

const throwIfNotAdmin =
  (user) => {
    // only permit admins
    if (!worker.userRepositoryInstance.isAdmin(Authenticator.getSignedInUser())) {
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