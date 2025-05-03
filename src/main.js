
// mandatory to be deployed as a web app
const doGet =
  (request) => {
    return HtmlService.createTemplateFromFile('index')
      .evaluate();
  }

// used for including client-side scripts outside of the main HTML file
const include =
  (filename) => {
    return HtmlService.createTemplateFromFile(filename)
      .evaluate()
      .getContent();
  }

const initialize =
  () => {
    // This is a note
    const userRepository = new UserRepository(new DbClient());
    
    // if (!userRepository.isAdmin()) {
    //   throw new Error('User is not an admin');
    // }
    
    const response = {
      email: userRepository.getSignedInUser()
    };
    debugger
    return response;
  };

  // addLesson
  // removeLesson
  