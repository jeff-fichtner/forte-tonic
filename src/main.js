
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
    const userRepository = new UserRepository(new DbClient());
    debugger
    return {
      email: userRepository.getSignedInUser()
    }
  };
