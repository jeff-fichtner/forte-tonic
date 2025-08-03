import { Select } from '../components/select.js';
import { Duration } from '../constants.js';

/**
 *
 */
export class AdminRegistrationForm {
  /**
   *
   */
  constructor(instructors, students, classes, sendDataFunction) {
    this.registrationTypeSelect = this.#buildRegistrationTypeSelect();
    this.instructors = instructors;
    const instructorOptions = instructors.map(instructor => ({
      value: instructor.id,
      label: instructor.lastFirst,
    }));
    this.instructorSelect = this.#buildInstructorSelect(instructorOptions);
    this.students = students;
    this.#setStudentAutocomplete(students);
    this.classes = classes;
    const classOptions = classes.map(c => ({
      value: c.id,
      label: c.formattedName,
    }));
    this.classSelect = this.#buildClassSelect(classOptions);
    // instrument select
    // start time select
    // day select
    // when day changes
    document
      .getElementById('instructor-day-select-options-container')
      .addEventListener('change', event => {
        if (event.target.id !== 'day-select') {
          return;
        }
        event.preventDefault();
        const selectedDay = event.target.value;
        this.#setInstructorDayStartTimeOptions();
        const instructorDaySelectedInfoContainer = document.getElementById(
          'instructor-day-selected-info-container'
        );
        instructorDaySelectedInfoContainer.hidden = !selectedDay;
      });
    // when instrument changes
    document
      .getElementById('instrument-select-options-container')
      .addEventListener('change', event => {
        if (event.target.id !== 'instrument-select') {
          return;
        }
        event.preventDefault();
        const selectedValue = event.target.value;
        console.log('Instrument changed to:', selectedValue);
      });
    // when start time changes
    document
      .getElementById('instructor-day-start-time-container')
      .addEventListener('change', event => {
        if (event.target.id !== 'start-time-select') {
          return;
        }
        const selectedValue = event.target.value;
        console.log('Start time changed to:', selectedValue);
      });
    // when lesson length changes
    document.getElementById('lesson-length-container').addEventListener('change', event => {
      if (event.target.type !== 'radio') {
        return;
      }
      console.log('Lesson length changed to:', event.target.value);
      this.#setInstructorDayStartTimeOptions();
    });
    // when create is clicked
    document
      .getElementById('create-registration-submit-btn')
      .addEventListener('click', async event => {
        event.preventDefault();
        if (!this.#validateRegistration()) {
          return;
        }
        try {
          this.#setAdminRegistrationLoading(true);
          const data = this.#getCreateRegistrationData();
          await sendDataFunction(data);
          // clear group class selection
          this.classSelect.clearSelectedOption();
          // clear students
          this.#setCurrentStudent(null);
          // transportation type
          const transportationTypeRadios = document.querySelectorAll(
            'input[name="transportation-type"]'
          );
          // check first
          if (transportationTypeRadios.length > 0) {
            transportationTypeRadios[0].checked = true;
          }
          // reset instructor
          this.instructorSelect.clearSelectedOption();
          this.#showInstructorInfoContainer(false);
          // instrument
          this.#setInstructorInstrumentOptions(null);
          // day
          this.#setInstructorDayOptions(null);
          // lesson length
          const lessonLengthRadios = document.querySelectorAll('input[name="lesson-length"]');
          // check first
          if (lessonLengthRadios.length > 0) {
            lessonLengthRadios[0].checked = true;
          }
          // start time
          this.#setInstructorDayStartTimeOptions();
        } catch (error) {
          console.error('Error creating registration:', error);
          M.toast({ html: 'Error creating registration.' });
        } finally {
          this.#setAdminRegistrationLoading(false);
        }
      });
  }
  // TODO duplicated
  /**
   *
   */
  #setAdminRegistrationLoading(isLoading) {
    const adminRegistrationLoadingContainer = document.getElementById(
      'admin-registration-loading-container'
    );
    const adminRegistrationContainer = document.getElementById('admin-registration-container');
    adminRegistrationLoadingContainer.hidden = !isLoading;
    adminRegistrationContainer.hidden = isLoading;
  }
  /**
   *
   */
  #validateRegistration() {
    const registrationData = this.#getCreateRegistrationData();
    const isPrivate = registrationData.registrationType === RegistrationType.PRIVATE;
    const isGroup = registrationData.registrationType === RegistrationType.GROUP;
    const isValid =
      registrationData.studentId &&
      registrationData.registrationType &&
      ((isGroup && registrationData.classId) ||
        (isPrivate &&
          registrationData.transportationType &&
          registrationData.instructorId &&
          registrationData.instrument &&
          registrationData.day &&
          registrationData.startTime &&
          registrationData.length));
    // TODO additional validation for start time/length is valid (with api call/response)
    if (!isValid) {
      const errors = [];
      if (!registrationData.studentId) {
        errors.push('Student');
      }
      if (!registrationData.registrationType) {
        errors.push('Registration Type');
      }
      if (isGroup) {
        if (!registrationData.classId) {
          errors.push('Class');
        }
      } else if (isPrivate) {
        if (!registrationData.transportationType) {
          errors.push('Transportation Type');
        }
        if (!registrationData.instructorId) {
          errors.push('Instructor');
        }
        if (!registrationData.instrument) {
          errors.push('Instrument');
        }
        if (!registrationData.day) {
          errors.push('Day');
        }
        if (!registrationData.startTime) {
          errors.push('Start Time');
        }
        if (!registrationData.length) {
          errors.push('Lesson Length');
        }
      }
      M.toast({ html: `Please fill out the following fields:<br>${errors.join('<br>')}` });
    }
    return isValid;
  }
  /**
   *
   */
  #getCreateRegistrationData() {
    // get student
    const studentId = this.selectedStudent ? this.selectedStudent.id : null;
    const registrationType = this.registrationTypeSelect.getSelectedOption();
    if (registrationType === RegistrationType.GROUP) {
      return {
        studentId: studentId,
        registrationType: RegistrationType.GROUP,
        classId: this.classSelect.getSelectedOption(),
      };
    }
    // get selected length
    const lessonLengthRadios = document.querySelectorAll('input[name="lesson-length"]');
    const checkedRadio = Array.from(lessonLengthRadios).find(radio => radio.checked);
    // get selected instructor
    const instructorId = this.instructorSelect.getSelectedOption();
    // get selected instrument
    const instrumentSelect = document.getElementById('instrument-select');
    // get selected day
    const daySelect = document.getElementById('day-select');
    // get selected start time
    const startTimeSelect = document.getElementById('start-time-select');
    const startTimeDuration = startTimeSelect.value
      ? DurationHelpers.minutesToDuration(startTimeSelect.value)
      : null;
    const formattedStartTime = startTimeDuration ? startTimeDuration.to24HourFormat() : '';
    // get transportation type response
    const transportationType = document.querySelector('input[name="transportation-type"]:checked');
    // add to object
    return {
      studentId: studentId,
      registrationType: registrationType,
      transportationType: transportationType ? transportationType.value : null,
      instructorId: this.instructorSelect.getSelectedOption(),
      instrument: instrumentSelect.value,
      day: daySelect.value,
      startTime: formattedStartTime,
      length: checkedRadio ? checkedRadio.value : null,
    };
  }
  /**
   *
   */
  #setInstructorInstrumentOptions(instructor) {
    if (!instructor) {
      this.#updateSelectOptions('instrument-select', [], 'Select an instrument');
      return;
    }
    const instruments = [
      instructor.instrument1,
      instructor.instrument2,
      instructor.instrument3,
      instructor.instrument4,
    ].filter(x => x);
    this.#updateSelectOptions(
      'instrument-select',
      instruments.map(instrument => ({
        value: instrument,
        label: instrument,
      })),
      'Select an instrument'
    );
  }
  /**
   *
   */
  #setInstructorDayOptions(instructor) {
    try {
      if (!instructor) {
        this.#updateSelectOptions('day-select', [], 'Select a day');
        return;
      }
      const weekDays = {
        0: { label: 'Monday', startTime: instructor.mondayStartTime },
        1: { label: 'Tuesday', startTime: instructor.tuesdayStartTime },
        2: { label: 'Wednesday', startTime: instructor.wednesdayStartTime },
        3: { label: 'Thursday', startTime: instructor.thursdayStartTime },
        4: { label: 'Friday', startTime: instructor.fridayStartTime },
      };
      const days = [];
      for (const [index, day] of Object.entries(weekDays)) {
        if (day.startTime) {
          days.push({
            value: index,
            label: day.label,
          });
        }
      }
      this.#updateSelectOptions('day-select', days, 'Select a day', true);
    } finally {
      const daySelectedInfoContainer = document.getElementById(
        'instructor-day-selected-info-container'
      );
      daySelectedInfoContainer.hidden = true;
    }
  }
  /**
   *
   */
  #setInstructorDayStartTimeOptions() {
    const selectedInstructorId = this.instructorSelect.getSelectedOption();
    const selectedDay = document.getElementById('day-select').value;
    const selectedLength = document.querySelector('input[name="lesson-length"]:checked')?.value * 1;
    if (!selectedInstructorId || !selectedDay || !selectedLength) {
      this.#updateSelectOptions('start-time-select', [], 'Select a start time');
      // reset to first option
      const lessonLengthRadios = document.querySelectorAll('input[name="lesson-length"]');
      if (lessonLengthRadios.length > 0) {
        lessonLengthRadios[0].checked = true;
      }
      return;
    }
    const instructor = this.instructors.find(x => x.id === selectedInstructorId);
    const startTimes = [
      instructor.mondayStartTime,
      instructor.tuesdayStartTime,
      instructor.wednesdayStartTime,
      instructor.thursdayStartTime,
      instructor.fridayStartTime,
    ];
    const endTimes = [
      instructor.mondayEndTime,
      instructor.tuesdayEndTime,
      instructor.wednesdayEndTime,
      instructor.thursdayEndTime,
      instructor.fridayEndTime,
    ];
    const dayIndex = selectedDay * 1; // Convert string to number
    const startTime = startTimes[dayIndex];
    const endTime = endTimes[dayIndex];
    const options = [];
    if (!startTime || !endTime) {
      this.#updateSelectOptions('start-time-select', [], 'Not available');
      return;
    }
    const startTimeDuration = DurationHelpers.stringToDuration(startTime);
    const endTimeDuration = DurationHelpers.stringToDuration(endTime);
    for (
      let i = startTimeDuration.hours * 60 + startTimeDuration.minutes;
      i <= endTimeDuration.hours * 60 + endTimeDuration.minutes - selectedLength;
      i += 15
    ) {
      const duration = DurationHelpers.minutesToDuration(i);
      options.push({
        value: i,
        label: duration.to12HourFormat(),
      });
    }
    this.#updateSelectOptions('start-time-select', options, 'Select a start time', true);
  }
  /**
   *
   */
  #setCurrentStudent(student) {
    const elem = document.getElementById('student-autocomplete-input');
    elem.value = student ? student.fullName : ''; // Set the input value
    this.selectedStudent = student; // Update the selected student
  }
  // TODO duplicated
  /**
   *
   */
  #updateSelectOptions(selectId, options, defaultOptionText, forceRefresh = false) {
    const select = document.getElementById(selectId);
    if (!select) {
      console.error(`Select element with ID "${selectId}" not found.`);
      return;
    }
    // get current selected option
    const currentSelectedValue = select.value;
    // Clear existing options
    select.innerHTML = '';
    // Create a default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = defaultOptionText;
    select.appendChild(defaultOption);
    // Populate new options
    options.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      if (!forceRefresh && currentSelectedValue && option.value == currentSelectedValue) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });
    M.FormSelect.init(select, {
      classes: selectId,
      dropdownOptions: {
        alignment: 'left',
        coverTrigger: false,
        constrainWidth: false,
      },
    });
  }
  /**
   *
   */
  #setStudentAutocomplete(students) {
    const elem = document.getElementById('student-autocomplete-input');
    if (!students.length) {
      this.studentMap = {};
      this.selectedStudent = null;
      M.Autocomplete.init(elem, { data: {} });
      return;
    }
    const data = students.reduce((acc, student) => {
      acc[student.fullName] = null;
      return acc;
    }, {});
    this.studentMap = students.reduce((acc, student) => {
      acc[student.fullName] = student.id;
      return acc;
    }, {});
    const options = {
      data: data,
      limit: 20,
      onAutocomplete: selectedOption => {
        const studentId = this.studentMap[selectedOption];
        this.selectedStudent = students.find(x => x.id === studentId);
      },
    };
    M.Autocomplete.init(elem, options);
  }
  /**
   *
   */
  #buildInstructorSelect(instructorOptions) {
    this.#showInstructorInfoContainer(false);
    return new Select(
      'instructor-select',
      'Select an instructor',
      'No instructors available',
      instructorOptions,
      event => {
        event.preventDefault();
        const selectedValue = event.target.value;
        const currentInstructor = this.instructors.find(x => x.id === selectedValue);
        this.#setInstructorInstrumentOptions(currentInstructor);
        this.#setInstructorDayOptions(currentInstructor);
        this.#showInstructorDayInfoContainer(false);
        this.#showInstructorInfoContainer(!!selectedValue);
      }
    );
  }
  /**
   *
   */
  #buildRegistrationTypeSelect() {
    this.#showPrivateRegistrationContainer(false);
    this.#showGroupRegistrationContainer(false);
    return new Select(
      'registration-type-select',
      'Select registration type',
      'No registration types available',
      Object.keys(RegistrationType).map(key => ({
        value: RegistrationType[key],
        label: RegistrationType[key].capitalize(),
      })),
      event => {
        event.preventDefault();
        const selectedValue = event.target.value;
        console.log('Registration type changed to:', selectedValue);
        this.#showPrivateRegistrationContainer(selectedValue === RegistrationType.PRIVATE);
        this.#showGroupRegistrationContainer(selectedValue === RegistrationType.GROUP);
      }
    );
  }
  /**
   *
   */
  #buildClassSelect(classOptions) {
    return new Select(
      'class-select',
      'Select a class',
      'No classes available',
      classOptions,
      event => {
        event.preventDefault();
        const selectedValue = event.target.value;
        console.log('Class changed to:', selectedValue);
      }
    );
  }
  /**
   *
   */
  #showInstructorInfoContainer(shouldShow) {
    this.#showContainer('instructor-selected-info-container', shouldShow);
  }
  /**
   *
   */
  #showInstructorDayInfoContainer(shouldShow) {
    this.#showContainer('instructor-day-selected-info-container', shouldShow);
  }
  /**
   *
   */
  #showPrivateRegistrationContainer(shouldShow) {
    this.#showContainer('private-registration-container', shouldShow);
  }
  /**
   *
   */
  #showGroupRegistrationContainer(shouldShow) {
    this.#showContainer('group-registration-container', shouldShow);
  }
  /**
   *
   */
  #showContainer(containerId, shouldShow) {
    const container = document.getElementById(containerId);
    container.hidden = !shouldShow;
  }
}

// For backwards compatibility with existing code
window.AdminRegistrationForm = AdminRegistrationForm;
