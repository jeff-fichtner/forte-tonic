import { Select } from '../components/select.js';
import { Duration, RegistrationType } from '../constants.js';

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
    this.students = students;
    this.#setStudentAutocomplete(students);
    this.classes = classes;
    const classOptions = classes.map(c => ({
      value: c.id,
      label: c.formattedName,
    }));
    this.classSelect = this.#buildClassSelect(classOptions);
    
    // Initialize hybrid registration interface
    this.selectedLesson = null;
    this.#initializeHybridInterface();
    
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
          // clear selections
          this.#clearForm();
        } catch (error) {
          console.error('Error creating registration:', error);
          M.toast({ html: 'Error creating registration.' });
        } finally {
          this.#setAdminRegistrationLoading(false);
        }
      });
  }
  
  /**
   * Initialize the hybrid registration interface
   */
      #initializeHybridInterface() {
        // Handle filter chips (instructors, days, lengths, instruments)
        const filterChips = document.querySelectorAll('.filter-chip');
        filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const chipType = chip.dataset.type;
                const chipValue = chip.dataset.value;
                
                // Handle "All" selections
                if (chipValue === 'all') {
                    document.querySelectorAll(`.filter-chip[data-type="${chipType}"]`).forEach(c => {
                        c.classList.remove('selected');
                    });
                    chip.classList.add('selected');
                } else {
                    // Deselect "All" when specific item is selected
                    const allChip = document.querySelector(`.filter-chip[data-type="${chipType}"][data-value="all"]`);
                    if (allChip) allChip.classList.remove('selected');
                    
                    chip.classList.toggle('selected');
                }
                
                this.#filterTimeSlots();
            });
        });

        // Handle time slot selection
        const timeSlots = document.querySelectorAll('.timeslot.available');
        timeSlots.forEach(slot => {
            slot.addEventListener('click', () => {
                // Remove previous selection
                document.querySelectorAll('.timeslot').forEach(s => s.classList.remove('selected'));
                
                // Select this slot
                slot.classList.add('selected');
                slot.style.border = '3px solid #1976d2';
                slot.style.background = '#e3f2fd';
                
                // Update selection display
                this.#updateSelectionDisplay(slot);
            });
        });
    }

    #filterTimeSlots() {
        const selectedInstructors = Array.from(document.querySelectorAll('.filter-chip[data-type="instructor"].selected')).map(c => c.dataset.value);
        const selectedDays = Array.from(document.querySelectorAll('.filter-chip[data-type="day"].selected')).map(c => c.dataset.value);
        const selectedLengths = Array.from(document.querySelectorAll('.filter-chip[data-type="length"].selected')).map(c => c.dataset.value);
        const selectedInstruments = Array.from(document.querySelectorAll('.filter-chip[data-type="instrument"].selected')).map(c => c.dataset.value);
        
        const timeSlots = document.querySelectorAll('.timeslot.available');
        
        timeSlots.forEach(slot => {
            const instructorId = slot.dataset.instructorId;
            const day = slot.dataset.day;
            const length = slot.dataset.length;
            const instrument = slot.dataset.instrument;
            
            const matchesInstructor = selectedInstructors.length === 0 || selectedInstructors.includes('all') || selectedInstructors.includes(instructorId);
            const matchesDay = selectedDays.length === 0 || selectedDays.includes('all') || selectedDays.includes(day);
            const matchesLength = selectedLengths.length === 0 || selectedLengths.includes('all') || selectedLengths.includes(length);
            const matchesInstrument = selectedInstruments.length === 0 || selectedInstruments.includes('all') || selectedInstruments.includes(instrument);
            
            if (matchesInstructor && matchesDay && matchesLength && matchesInstrument) {
                slot.style.display = 'block';
            } else {
                slot.style.display = 'none';
            }
        });
    }

    #updateSelectionDisplay(slot) {
        // Store the selected lesson data
        this.selectedLesson = {
            instructorId: slot.dataset.instructorId,
            day: slot.dataset.day,
            time: slot.dataset.time,
            length: parseInt(slot.dataset.length),
            instrument: slot.dataset.instrument
        };

        // Update the selection display area
        const selectionDisplay = document.querySelector('.selection-display');
        if (selectionDisplay) {
            const instructor = slot.dataset.instructorId; // Would need to map to instructor name
            const dayName = slot.dataset.day.charAt(0).toUpperCase() + slot.dataset.day.slice(1);
            const timeFormatted = this.#formatTime(slot.dataset.time);
            const instrument = slot.dataset.instrument;
            const length = slot.dataset.length;
            
            selectionDisplay.innerHTML = `
                <div style="padding: 16px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #1976d2;">
                    <div style="font-weight: bold; color: #1976d2; margin-bottom: 8px;">Selected Lesson</div>
                    <div style="font-size: 14px; color: #333;">
                        <div><strong>Instrument:</strong> ${instrument}</div>
                        <div><strong>Day:</strong> ${dayName}</div>
                        <div><strong>Time:</strong> ${timeFormatted}</div>
                        <div><strong>Duration:</strong> ${length} minutes</div>
                    </div>
                </div>
            `;
        }
    }
  
  /**
   * Format time from 24-hour to 12-hour format
   */
  #formatTime(time24) {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:${minutes} ${ampm}`;
  }
  
  /**
   * Clear the form after successful submission
   */
  #clearForm() {
    // Clear group class selection
    this.classSelect.clearSelectedOption();
    
    // Clear students
    this.#setCurrentStudent(null);
    
    // Clear transportation type
    const transportationTypeRadios = document.querySelectorAll('input[name="transportation-type"]');
    if (transportationTypeRadios.length > 0) {
      transportationTypeRadios[0].checked = true;
    }
    
    // Clear hybrid lesson selection
    this.selectedLesson = null;
    const selectedDisplay = document.getElementById('admin-selected-lesson-display');
    if (selectedDisplay) {
      selectedDisplay.style.display = 'none';
    }
    
    // Reset all timeslot selections
    document.querySelectorAll('#admin-instructor-timeslot-grid .timeslot').forEach(slot => {
      slot.style.border = slot.classList.contains('available') ? '2px solid #4caf50' : 
                         slot.classList.contains('limited') ? '2px solid #ff9800' : '2px solid #f44336';
    });

    // Reset hybrid interface filter chips
    document.querySelectorAll('.filter-chip.selected').forEach(chip => {
      chip.classList.remove('selected');
    });
    // Set "All" chips as selected by default
    document.querySelectorAll('.filter-chip[data-value="all"]').forEach(chip => {
      chip.classList.add('selected');
    });
    
    // Clear time slot selections
    document.querySelectorAll('.timeslot.selected').forEach(slot => {
      slot.classList.remove('selected');
      slot.style.border = '2px solid #4caf50';
      slot.style.background = '#e8f5e8';
    });
    
    // Clear selection display
    const selectionDisplay = document.querySelector('.selection-display');
    if (selectionDisplay) {
      selectionDisplay.innerHTML = '';
    }
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
          this.selectedLesson && // For hybrid interface, check if lesson is selected
          registrationData.instructorId &&
          registrationData.day !== null &&
          registrationData.startTime &&
          registrationData.length));
    
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
        if (!this.selectedLesson) {
          errors.push('Please select a lesson time slot from the grid above');
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
    
    // For private lessons, use hybrid interface selection
    if (registrationType === RegistrationType.PRIVATE) {
      // get transportation type response
      const transportationType = document.querySelector('input[name="transportation-type"]:checked');
      
      if (!this.selectedLesson) {
        return {
          studentId: studentId,
          registrationType: registrationType,
          transportationType: transportationType ? transportationType.value : null,
          instructorId: null,
          instrument: null,
          day: null,
          startTime: null,
          length: null,
        };
      }
      
      // Use data from hybrid interface selection
      const dayMap = {
        'monday': 0,
        'tuesday': 1,
        'wednesday': 2,
        'thursday': 3,
        'friday': 4
      };
      
      return {
        studentId: studentId,
        registrationType: registrationType,
        transportationType: transportationType ? transportationType.value : null,
        instructorId: this.selectedLesson.instructorId,
        instrument: this.selectedLesson.instrument || 'Piano', // Use instrument from selection
        day: dayMap[this.selectedLesson.day],
        startTime: this.selectedLesson.time,
        length: this.selectedLesson.length,
      };
    }
    
    return {
      studentId: studentId,
      registrationType: registrationType,
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
