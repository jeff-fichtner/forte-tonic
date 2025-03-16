const studentNames = [
  "Jhaveri-Weeks, Henry",
  "Jishi, Ava",
  "Johnson, August",
  "Johnson, Ingrid",
  "Jones, Louisa",
  "Kahn, Orianna",
  "Kaminski, Nate",
  "Katz, Zoe",
  "Kay, Noah",
  "Kim, Sienna",
  "Krassner, Felix",
  "Krieger, Iris",
  "Krieger, Uma",
  "Kroeker, Finn",
  "L'Heureux, George",
  "L'Heureux, Helen",
  "Lannon, Liv",
  "Lassar, Elliot",
  "Lassar, Sam",
  "Lewis, Jack",
  "Lo, Campbell",
  "Lo, Oliver",
  "Loft, Jamie",
  "Lott, Cole",
  "Luckhurst, Frankie",
  "Mansfield, Sejal",
  "Mansfield, Simi",
  "Mast, Juniper",
  "Mayle, August",
  "McCloskey, Max",
  "McCrath, Keira",
  "McDonald, Arden",
  "McDonald, Calder",
  "McGuire, Graham",
  "McGuire, Henry",
  "McLean, Scarlett",
  "Meleis, Alex",
  "Meleis, Lena",
  "Meleis, Nile",
  "Mock, Alexander",
  "Monsees, Maddie",
  "Montgomery, James",
  "Montgomery, Katherine",
  "Moritz MacAdams, Lena",
  "Nishiguchi, TJ",
  "O'Brien, Abigail",
  "O'Brien, Owen"
];

const teachers = [
  "Andrew Kunz",
  "Cal Reichenbach",
  "Cesar Cancino",
  "Daria Mautner",
  "Jeanette Wilkin",
  "Jeff Rosen",
  "Jesse Brewster",
  "Justin McCoy",
  "Lisa Gorman",
  "Melody Nishinaga",
  "Paul Montes",
  "Phoebe Dinga",
  "Rob Caniglia",
  "Rob Thomure",
  "Ruth Chou",
  "Ryan Low"
];

function populateFormOnOpen() {
  const form = FormApp.getActiveForm();

  const getGenericItem = (item) => form.getItemById(item.getId());

  const studentNamesReversed =
    studentNames.map(
      x => {
        let splitName = x.split(', ');
        return `${splitName[1]} ${splitName[0]}`
      });
  const studentNamesFirstNameOnly =
    studentNames.map(
      x => {
        let splitName = x.split(', ');
        return splitName[1];
      });

  // reset
  const items = form.getItems();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    Logger.log(`Clearing choices for ${item.getTitle()}`);

    switch (item.getType()) {
      case FormApp.ItemType.CHECKBOX:
        item.asCheckboxItem().setChoices([item.asCheckboxItem().createChoice("")]);
        continue;
      case FormApp.ItemType.LIST:
        item.asListItem().setChoices([item.asListItem().createChoice("")]);
        continue;
      case FormApp.ItemType.MULTIPLE_CHOICE:
        item.asMultipleChoiceItem().setChoices([item.asMultipleChoiceItem().createChoice("")]);
        continue;
    }
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    Logger.log(`Deleting existing section ${item.getTitle()}`);
    form.deleteItem(item);
  }
  
  form.addPageBreakItem()
    .setTitle("Student Selection");
  
  const studentSelectionList =
    form.addListItem()
      .setTitle("Select Your Student")
      .setRequired(true);

  const studentSections = {};
  for (let i = 0; i < studentNames.length; i++) {
    const student = studentNames[i];
    Logger.log(`Creating newSectionForStudent for ${student}`);
    const newSectionForStudent =
      form.addPageBreakItem()
        .setTitle(studentNamesReversed[i])
        .setHelpText("In the questions below you will find the lesson(s) and/or group class(es) your student was enrolled in for the Fall Trimester. Only answer the question below that is relevant to your situation (re-enrolling, dropping, or changing).");
    studentSections[student] = newSectionForStudent;
  }

  const choices = Object.keys(studentSections).map(x => studentSelectionList.createChoice(x, studentSections[x]));
  studentSelectionList.setChoices(choices);

  const gradeList = form.addListItem();
  gradeList
    .setTitle("What grade level is your student in?")
    .setChoices([
      gradeList.createChoice("K"),
      ...Array(8).keys().map(x => gradeList.createChoice(`${x + 1}`))
    ])
    .setRequired(true);

  const pickupQuestion = form.addMultipleChoiceItem();
  pickupQuestion
    .setTitle("Will your student be doing Late Bus or Late Pickup for Winter Trimester?")
    .setHelpText("Late Bus leaves at 5pm on Monday, Tuesday, Thursday, Friday and 4:30pm on Wednesday")
    .setChoices([
      pickupQuestion.createChoice("Late Bus"),
      pickupQuestion.createChoice("Late Pickup")
    ])
    .setRequired(true);
  
  const availableLessonsPageBreak =
    form.addPageBreakItem()
      .setTitle("Winter Trimester Available Private Lessons")
      .setHelpText (`Below you will find the Winter Trimester availability for every instructor in Forte. This list is live and is actively being updated based on family responses to this form. On your end, the list you see below is updated every time you open the form. \n\nIf no available slot below works for you, please select the final option of the teacher(s) section you are trying to schedule with. ("None of the lessons above work for our schedule...") This will flag your response in our system to follow up with you. While we cannot guarantee we will be able to fit you into the schedule, we are happy to work through options and try!  \n\nPlease note: If you have left this form open for a day or two, you should close this window and reopen the form using the link you have received to see the most updated list of available private lesson slots.`)

  const additionalCommentsPageBreak =
    form.addPageBreakItem()
      .setTitle("Additional Comments");

  for (let i = 0; i < studentNames.length; i++) {
    const student = studentNames[i];
    Logger.log(`Populating section for ${student}`);

    const matchingSection = studentSections[student];
    form.moveItem(getGenericItem(matchingSection), form.getItems().length - 1);

    form.addCheckboxItem()
      .setTitle(`Which of the private lessons and/or group classes below would you like to re-enroll ${student} in for the Winter Trimester?`);

    form.addCheckboxItem()
      .setTitle(`Which of the private lessons and/or group classes below would you like to drop ${student} from for the Winter Trimester?`);

    const yesNoQuestion = form.addMultipleChoiceItem();
      yesNoQuestion
        .setTitle(`Would you like to change your private lesson(s) to another time or sign up for a new private lesson for the Winter Trimester?`)
        .setChoices([
            yesNoQuestion.createChoice('Yes', availableLessonsPageBreak),
            yesNoQuestion.createChoice('No', additionalCommentsPageBreak)
        ])
        .setRequired(true);

    form.addCheckboxItem()
      .setTitle(`Which of the private lessons below would you like to change to another time for ${student} for the Winter Trimester?`)
      .setHelpText("Please only answer this question if you are trying to change your lesson time.");
    
    form.addCheckboxItem()
      .setTitle(`Would you like to sign your student up for any of these group classes we are offering in the Winter Trimester?`)
      .setHelpText("Please note: If you have already re-enrolled your student in a Group Class up above, you do not need to select the class again in this question.");
  }

  form.moveItem(getGenericItem(availableLessonsPageBreak), form.getItems().length - 1);
  for (let i = 0; i < teachers.length; i++) {
    form.addCheckboxItem()
      .setTitle(`Available Lessons for ${teachers[i]}`);
  }

  form.moveItem(getGenericItem(additionalCommentsPageBreak), form.getItems().length - 1);
  form.addParagraphTextItem()
    .setTitle("Any additional requests or comments?");
}
