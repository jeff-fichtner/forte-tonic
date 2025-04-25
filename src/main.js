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

// data load requested from the client-side
const checkAuthentication =
  () => {
    throwIfNotAdmin();

    return respond({
      authenticatedUser: Authenticator.getSignedInUser()
    });
  }

const getAllInstructors =
  () => {
    throwIfNotAdmin();

    const worker = new UnitOfWork();

    return respond({
      instructors: worker.userRepositoryInstance.getInstructors()
    });
  }

const getAllStudents =
  () => {
    throwIfNotAdmin();

    const worker = new UnitOfWork();

    return respond({
      students: worker.userRepositoryInstance.getStudents()
    });
  }

const getAllClasses =
  () => {
    throwIfNotAdmin();

    const worker = new UnitOfWork();

    return respond({
      classes: worker.lessonRepositoryInstance.getClasses()
    });
  }

const getAllRegistrations =
  () => {
    throwIfNotAdmin();

    const worker = new UnitOfWork();

    return respond({
      registrations: worker.lessonRepositoryInstance.getRegistrations()
    });
  }

// const register =
//   () => {
//     throwIfNotAdmin();

//     const worker = new UnitOfWork();

//     const user = Authenticator.getSignedInUser();
//     const lessonId = ;

//     if (!lessonId) {
//       throw new Error('Lesson ID is required');
//     }

//     const registration = worker.lessonRepositoryInstance.register(user, lessonId);

//     return respond({
//       registration
//     });
//   }

// const unregister =
//   () => {
//     throwIfNotAdmin();

//     const worker = new UnitOfWork();

//     const user = Authenticator.getSignedInUser();
//     const lessonId = ;

//     if (!lessonId) {
//       throw new Error('Lesson ID is required');
//     }

//     const registration = worker.lessonRepositoryInstance.unregister(user, lessonId);

//     return respond({
//       registration
//     });
//   }

const throwIfNotAdmin =
  (user) => {
    const worker = new UnitOfWork();

    // only permit admins
    if (!worker.userRepositoryInstance.isAdmin(Authenticator.getSignedInUser())) {
      throw new Error('User is not an admin');
    }
  }

const respond =
  (response) => {
    console.log(`Response: ${JSON.stringify(response)}`);
    return response;
  };