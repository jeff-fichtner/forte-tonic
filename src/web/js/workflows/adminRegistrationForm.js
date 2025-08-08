/**
 * Admin Registration Form - Simplified progressive filters without restrictions
 * This class handles a simplified registration workflow for admins with minimal validation
 */

import { RegistrationType } from '../../../utils/values/registrationType.js';
import { Select } from '../components/select.js';

/**
 * Admin Registration Form with simplified progressive filters
 */
export class AdminRegistrationForm {
  /**
   * Constructor
   */
  constructor(instructors, students, classes, sendDataFunction) {
    this.instructors = instructors;
    this.students = students;
    this.classes = classes;
    this.sendDataFunction = sendDataFunction;
    
    // Initialize form elements
    this.#initializeFormElements();
  }

  /**
   * Initialize form elements with progressive dropdowns
   */
  #initializeFormElements() {
    // Initialize students autocomplete
    this.#setStudentAutocomplete(this.students);
    
    // Initialize registration type selector
    this.registrationTypeSelect = this.#buildRegistrationTypeSelect();
    
    // Initialize instructor selector  
    this.instructorSelect = this.#buildInstructorSelect(
      this.instructors.map(instructor => ({
        value: instructor.id,
        label: `${instructor.firstName} ${instructor.lastName}`,
      }))
    );
    
    // Initialize class selector
    this.classSelect = this.#buildClassSelect(
      this.classes.map(cls => ({
        value: cls.id,
        label: cls.formattedName || cls.title || cls.instrument || `Class ${cls.id}`,
      }))
    );
    
    // Handle submit button
    this.#attachSubmitButtonListener();
  }

  /**
   * Set up student autocomplete
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
      const fullName = student.getFullName ? student.getFullName() : `${student.firstName || ''} ${student.lastName || ''}`.trim();
      acc[fullName] = null;
      return acc;
    }, {});
    
    this.studentMap = students.reduce((acc, student) => {
      const fullName = student.getFullName ? student.getFullName() : `${student.firstName || ''} ${student.lastName || ''}`.trim();
      acc[fullName] = student.id;
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
   * Build registration type selector
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
   * Build instructor selector
   */
  #buildInstructorSelect(instructorOptions) {
    return new Select(
      'instructor-select',
      'Select an instructor',
      'No instructors available',
      instructorOptions,
      event => {
        event.preventDefault();
        const selectedValue = event.target.value;
        const currentInstructor = this.instructors.find(x => x.id === selectedValue);
        console.log('Instructor selected:', currentInstructor);
        
        // Show lesson details when instructor is selected
        this.#showLessonDetailsContainer(!!selectedValue);
        
        // Initialize lesson detail selectors
        if (selectedValue) {
          this.#initializeLessonDetailsSelectors();
          // Update instrument options based on selected instructor
          this.#updateInstrumentOptions(currentInstructor);
        }
      }
    );
  }

  /**
   * Build class selector
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
   * Show/hide private registration container
   */
  #showPrivateRegistrationContainer(shouldShow) {
    this.#showContainer('private-registration-container', shouldShow);
  }

  /**
   * Show/hide group registration container
   */
  #showGroupRegistrationContainer(shouldShow) {
    this.#showContainer('group-registration-container', shouldShow);
  }

  /**
   * Show/hide container helper
   */
  #showContainer(containerId, shouldShow) {
    const container = document.getElementById(containerId);
    if (container) {
      container.hidden = !shouldShow;
    }
  }

  /**
   * Show/hide lesson details container
   */
  #showLessonDetailsContainer(shouldShow) {
    this.#showContainer('instructor-selected-info-container', shouldShow);
  }

  /**
   * Initialize lesson details selectors
   */
  #initializeLessonDetailsSelectors() {
    // Initialize day selector
    this.daySelect = new Select(
      'day-select',
      'Choose day',
      'No days available',
      [
        { value: '0', label: 'Monday' },
        { value: '1', label: 'Tuesday' },
        { value: '2', label: 'Wednesday' },
        { value: '3', label: 'Thursday' },
        { value: '4', label: 'Friday' }
      ],
      event => {
        console.log('Day selected:', event.target.value);
        // Show the lesson length and start time container when day is selected
        this.#showContainer('instructor-day-selected-info-container', !!event.target.value);
      }
    );

    // Note: Length is handled by radio buttons in the HTML, not a select dropdown

    // Initialize instrument selector
    this.instrumentSelect = new Select(
      'instrument-select',
      'Choose instrument',
      'No instruments available',
      [
        { value: 'Piano', label: 'Piano' },
        { value: 'Guitar', label: 'Guitar' },
        { value: 'Violin', label: 'Violin' },
        { value: 'Voice', label: 'Voice' },
        { value: 'Drums', label: 'Drums' },
        { value: 'Bass', label: 'Bass' },
        { value: 'Other', label: 'Other' }
      ],
      event => {
        console.log('Instrument selected:', event.target.value);
      }
    );

    // Initialize start time selector
    this.startTimeSelect = new Select(
      'start-time-select',
      'Choose start time',
      'No times available',
      this.#generateTimeOptions(),
      event => {
        console.log('Start time selected:', event.target.value);
      }
    );
  }

  /**
   * Generate time options for start time select
   */
  #generateTimeOptions() {
    const times = [];
    for (let hour = 14; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = this.#formatDisplayTime(timeString);
        times.push({ value: timeString, label: displayTime });
      }
    }
    return times;
  }

  /**
   * Format time for display (convert 24h to 12h format)
   */
  #formatDisplayTime(time24) {
    const [hours, minutes] = time24.split(':');
    const hour12 = parseInt(hours) % 12 || 12;
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  }

  /**
   * Update instrument options based on selected instructor
   */
  #updateInstrumentOptions(instructor) {
    if (!this.instrumentSelect || !instructor) {
      return;
    }

    // Get instructor's instruments from specialties field
    const instructorInstruments = instructor.specialties || [];
    
    // Create instrument options based on instructor's specialties
    let instrumentOptions = [];
    if (instructorInstruments.length > 0) {
      instrumentOptions = instructorInstruments.map(instrument => ({
        value: instrument,
        label: instrument
      }));
    } else {
      // Fallback to default instruments if instructor has no specialties
      instrumentOptions = [
        { value: 'Piano', label: 'Piano' },
        { value: 'Guitar', label: 'Guitar' },
        { value: 'Violin', label: 'Violin' },
        { value: 'Voice', label: 'Voice' },
        { value: 'Drums', label: 'Drums' },
        { value: 'Bass', label: 'Bass' },
        { value: 'Other', label: 'Other' }
      ];
    }

    // Update the instrument select with new options
    this.instrumentSelect.populateOptions(instrumentOptions, true);
    
    console.log('Updated instrument options for instructor:', instructor.firstName, instructor.lastName, 'with instruments:', instructorInstruments);
  }

  /**
   * Attach event listener to submit button
   */
  #attachSubmitButtonListener() {
    const submitButton = document.getElementById('create-registration-submit-btn');
    if (submitButton) {
      submitButton.addEventListener('click', async (event) => {
        event.preventDefault();
        
        if (!this.#validateRegistration()) {
          return;
        }
        
        try {
          this.#setAdminRegistrationLoading(true);
          const registrationData = this.#getCreateRegistrationData();
          await this.sendDataFunction(registrationData);
          this.#clearForm();
          M.toast({ html: 'Registration created successfully!' });
        } catch (error) {
          console.error('Error creating registration:', error);
          M.toast({ html: `Error creating registration: ${error.message}` });
        } finally {
          this.#setAdminRegistrationLoading(false);
        }
      });
    } else {
      console.warn('Submit button not found');
    }
  }

  /**
   * Simple validation without restrictions
   */
  #validateRegistration() {
    const registrationData = this.#getCreateRegistrationData();
    const isPrivate = registrationData.registrationType === RegistrationType.PRIVATE;
    const isGroup = registrationData.registrationType === RegistrationType.GROUP;
    
    const isValid =
      registrationData.studentId &&
      registrationData.registrationType &&
      ((isGroup && registrationData.classId) ||
        (isPrivate && registrationData.instructorId && 
         registrationData.day !== undefined && 
         registrationData.startTime && 
         registrationData.length && 
         registrationData.instrument));
    
    if (!isValid) {
      const errors = [];
      if (!registrationData.studentId) {
        errors.push('Student');
      }
      if (!registrationData.registrationType) {
        errors.push('Registration Type');
      }
      if (isGroup && !registrationData.classId) {
        errors.push('Class');
      }
      if (isPrivate) {
        if (!registrationData.instructorId) {
          errors.push('Instructor');
        }
        if (registrationData.day === undefined || registrationData.day === null || registrationData.day === '') {
          errors.push('Day');
        }
        if (!registrationData.startTime) {
          errors.push('Start Time');
        }
        if (!registrationData.length) {
          errors.push('Length');
        }
        if (!registrationData.instrument) {
          errors.push('Instrument');
        }
      }
      M.toast({ html: `Please fill out the following fields:<br>${errors.join('<br>')}` });
    }
    return isValid;
  }

  /**
   * Get registration data for submission
   */
  #getCreateRegistrationData() {
    // get student - extract the actual ID value if it's an object
    const studentId = this.selectedStudent ? 
      (typeof this.selectedStudent.id === 'object' ? this.selectedStudent.id.value : this.selectedStudent.id) : 
      null;
    const registrationType = this.registrationTypeSelect.getSelectedOption();
    
    if (registrationType === RegistrationType.GROUP) {
      return {
        studentId: studentId,
        registrationType: RegistrationType.GROUP,
        classId: this.classSelect.getSelectedOption(),
      };
    }
    
    // For private lessons, basic data only
    if (registrationType === RegistrationType.PRIVATE) {
      // get transportation type response
      const transportationType = document.querySelector('input[name="transportation-type"]:checked');
      
      // Get lesson details from selectors
      const dayValue = this.daySelect ? this.daySelect.getSelectedOption() : '0';
      const startTime = this.startTimeSelect ? this.startTimeSelect.getSelectedOption() : '15:00';
      const length = document.querySelector('input[name="lesson-length"]:checked')?.value || '30';
      const instrument = this.instrumentSelect ? this.instrumentSelect.getSelectedOption() : 'Piano';
      
      // Convert numeric day to day name
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const dayName = dayNames[parseInt(dayValue)] || 'Monday';
      
      return {
        studentId: studentId,
        registrationType: registrationType,
        transportationType: transportationType ? transportationType.value : null,
        instructorId: this.instructorSelect.getSelectedOption(),
        day: dayName,
        startTime: startTime,
        length: parseInt(length),
        instrument: instrument,
      };
    }
    
    return {
      studentId: studentId,
      registrationType: registrationType,
    };
  }

  /**
   * Set loading state
   */
  #setAdminRegistrationLoading(isLoading) {
    const submitButton = document.getElementById('create-registration-submit-btn');
    if (submitButton) {
      if (isLoading) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<b>Creating...</b>';
      } else {
        submitButton.disabled = false;
        submitButton.innerHTML = '<b>Create</b>';
      }
    }
  }

  /**
   * Clear the form after successful submission
   */
  #clearForm() {
    // Clear group class selection
    this.classSelect.clearSelectedOption();
    
    // Clear instructor selection
    this.instructorSelect.clearSelectedOption();
    
    // Clear lesson details
    if (this.daySelect) {
      this.daySelect.clearSelectedOption();
    }
    // Reset lesson length radio buttons to default (30 minutes)
    const lengthRadios = document.querySelectorAll('input[name="lesson-length"]');
    if (lengthRadios.length > 0) {
      lengthRadios[0].checked = true; // Default to 30 minutes
    }
    if (this.instrumentSelect) {
      this.instrumentSelect.clearSelectedOption();
    }
    if (this.startTimeSelect) {
      this.startTimeSelect.clearSelectedOption();
    }
    
    // Hide lesson details container
    this.#showLessonDetailsContainer(false);
    
    // Hide day-selected container
    this.#showContainer('instructor-day-selected-info-container', false);
    
    // Clear students
    this.#setCurrentStudent(null);
    
    // Clear transportation type
    const transportationTypeRadios = document.querySelectorAll('input[name="transportation-type"]');
    if (transportationTypeRadios.length > 0) {
      transportationTypeRadios[0].checked = true;
    }
  }

  /**
   * Set current student
   */
  #setCurrentStudent(student) {
    const elem = document.getElementById('student-autocomplete-input');
    elem.value = student ? student.fullName : ''; // Set the input value
    this.selectedStudent = student; // Update the selected student
  }
}
