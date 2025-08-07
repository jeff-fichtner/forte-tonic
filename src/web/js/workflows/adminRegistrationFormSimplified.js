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
        label: cls.name || cls.type,
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
        (isPrivate && registrationData.instructorId));
    
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
      if (isPrivate && !registrationData.instructorId) {
        errors.push('Instructor');
      }
      M.toast({ html: `Please fill out the following fields:<br>${errors.join('<br>')}` });
    }
    return isValid;
  }

  /**
   * Get registration data for submission
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
    
    // For private lessons, basic data only
    if (registrationType === RegistrationType.PRIVATE) {
      // get transportation type response
      const transportationType = document.querySelector('input[name="transportation-type"]:checked');
      
      return {
        studentId: studentId,
        registrationType: registrationType,
        transportationType: transportationType ? transportationType.value : null,
        instructorId: this.instructorSelect.getSelectedOption(),
        // Admin can create without specific time constraints
        day: 0, // Default to Monday
        startTime: '15:00', // Default time
        length: 30, // Default length
        instrument: 'Piano', // Default instrument
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
