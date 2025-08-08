/**
 * Parent Registration Form - Hybrid interface with validation
 * This class handles the registration workflow for parents with full validation and restrictions
 */

import { RegistrationType } from '../../../utils/values/registrationType.js';
import { Select } from '../components/select.js';

/**
 * Parent Registration Form with hybrid interface (progressive filters + time slot grid)
 */
export class ParentRegistrationForm {
  /**
   * Constructor
   */
  constructor(instructors, students, classes, sendDataFunction) {
    this.instructors = instructors;
    this.students = students;
    this.classes = classes;
    this.sendDataFunction = sendDataFunction;
    
    // Initialize basic properties
    this.selectedLesson = null;
    
    // Defer complex initialization to avoid private method ordering issues
    setTimeout(() => {
      this.#initializeHybridInterface();
    }, 0);
  }

  /**
   * Parse time string (HH:MM) to minutes since midnight
   */
  #parseTime(timeStr) {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  /**
   * Create a filter chip with appropriate styling
   */
  #createFilterChip(type, value, text, isDefault = false, availability = 'available') {
    const chip = document.createElement('div');
    chip.className = `chip ${type}-chip`;
    chip.dataset.type = type;
    chip.dataset.value = value;
    chip.textContent = text;
    
    // Apply base styles
    const styles = {
      padding: '8px 12px',
      borderRadius: '16px',
      display: 'flex',
      alignItems: 'center',
      border: '2px solid',
      transition: 'all 0.3s'
    };
    
    // Set active state for default chips
    if (isDefault) {
      chip.classList.add('active', 'selected');
      styles.background = '#2b68a4';
      styles.color = 'white';
      styles.borderColor = '#2b68a4';
      styles.cursor = 'pointer';
    } else {
      // Apply availability-based styling
      if (availability === 'unavailable') {
        chip.classList.add('disabled', 'unavailable');
        styles.background = '#ffebee';
        styles.borderColor = '#f44336';
        styles.cursor = 'not-allowed';
        styles.opacity = '0.6';
      } else if (availability === 'limited') {
        chip.classList.add('limited');
        styles.background = '#fff3e0';
        styles.borderColor = '#ff9800';
        styles.cursor = 'pointer';
      } else {
        chip.classList.add('available');
        styles.background = '#e8f5e8';
        styles.borderColor = '#4caf50';
        styles.cursor = 'pointer';
      }
    }
    
    // Apply inline styles
    chip.style.cssText = Object.entries(styles)
      .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
      .join('; ');
    
    return chip;
  }

  /**
   * Calculate available time slots for each instructor
   */
  #calculateInstructorAvailability() {
    const availability = {};
    
    this.instructors.forEach(instructor => {
      let slotCount = 0;
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      
      days.forEach(day => {
        const daySchedule = instructor[day];
        if (daySchedule && daySchedule.startTime && daySchedule.isAvailable) {
          // Simple calculation - assume 2-3 slots per day for each instructor
          slotCount += 2;
        }
      });
      
      availability[instructor.id] = slotCount;
    });
    
    return availability;
  }

  /**
   * Calculate available time slots for each day of the week
   */
  #calculateDayAvailability() {
    const availability = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    // Initialize all days to 0
    days.forEach(day => {
      availability[day] = 0;
    });
    
    // Count slots for each day across all instructors
    this.instructors.forEach(instructor => {
      days.forEach(day => {
        const daySchedule = instructor[day];
        if (daySchedule && daySchedule.startTime && daySchedule.isAvailable) {
          // Simple calculation - assume 2-3 slots per day for each instructor
          availability[day] += 2;
        }
      });
    });
    
    return availability;
  }

  /**
   * Generate instructor filter chips dynamically from instructor data
   */
  #generateInstructorChips() {
    // Find the instructor container specifically in parent registration
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;
    
    const instructorSection = Array.from(parentContainer.querySelectorAll('.filter-section')).find(section => {
      const label = section.querySelector('label');
      return label && label.textContent.includes('Instructors');
    });
    
    if (!instructorSection) {
      console.warn('Parent instructor chip container not found');
      return;
    }
    
    const instructorContainer = instructorSection.querySelector('.chip-container');
    if (!instructorContainer) {
      console.warn('Parent instructor chip container not found');
      return;
    }

    // Clear existing instructor chips
    const existingInstructorChips = instructorContainer.querySelectorAll('.instructor-chip');
    existingInstructorChips.forEach(chip => chip.remove());

    // Calculate availability counts for each instructor
    const instructorAvailability = this.#calculateInstructorAvailability();
    const totalSlots = Object.values(instructorAvailability).reduce((sum, count) => sum + count, 0);

    // Create "All Instructors" chip
    const allChip = this.#createFilterChip('instructor', 'all', `All Instructors (${totalSlots} slots)`, true);
    instructorContainer.appendChild(allChip);

    // Create individual instructor chips
    this.instructors.forEach(instructor => {
      const slots = instructorAvailability[instructor.id] || 0;
      const chipText = `${instructor.firstName} ${instructor.lastName} (${slots} slots)`;
      const availability = slots > 3 ? 'available' : slots > 0 ? 'limited' : 'unavailable';
      const chip = this.#createFilterChip('instructor', instructor.id, chipText, false, availability);
      instructorContainer.appendChild(chip);
    });
  }

  /**
   * Generate day filter chips dynamically based on instructor availability
   */
  #generateDayChips() {
    // Find the day container specifically in parent registration
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;
    
    const dayContainer = parentContainer.querySelector('#day-chips-container');
    if (!dayContainer) {
      console.warn('Parent day chip container not found');
      return;
    }

    // Clear existing day chips
    const existingDayChips = dayContainer.querySelectorAll('.day-chip');
    existingDayChips.forEach(chip => chip.remove());

    // Calculate availability counts for each day
    const dayAvailability = this.#calculateDayAvailability();
    const totalSlots = Object.values(dayAvailability).reduce((sum, count) => sum + count, 0);

    // Create "All Days" chip
    const allChip = this.#createFilterChip('day', 'all', `All Days (${totalSlots} slots)`, true);
    dayContainer.appendChild(allChip);

    // Create individual day chips
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    days.forEach((day, index) => {
      const slots = dayAvailability[day] || 0;
      const chipText = `${dayNames[index]} (${slots} slots)`;
      const availability = slots > 3 ? 'available' : slots > 0 ? 'limited' : 'unavailable';
      const chip = this.#createFilterChip('day', day, chipText, false, availability);
      dayContainer.appendChild(chip);
    });
  }

  /**
   * Generate instrument filter chips dynamically based on selected instructor(s)
   */
  #generateInstrumentChips() {
    // Find the instrument container specifically in parent registration
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;
    
    const instrumentContainer = parentContainer.querySelector('#instrument-chips-container');
    if (!instrumentContainer) {
      console.warn('Parent instrument chip container not found');
      return;
    }

    // Clear existing instrument chips
    const existingInstrumentChips = instrumentContainer.querySelectorAll('.instrument-chip');
    existingInstrumentChips.forEach(chip => chip.remove());

    // Get selected instructor(s)
    const selectedInstructorChip = parentContainer.querySelector('.instructor-chip.active');
    const selectedInstructorId = selectedInstructorChip?.dataset.value;

    // Determine which instructors to consider
    let instructorsToConsider = this.instructors;
    if (selectedInstructorId && selectedInstructorId !== 'all') {
      instructorsToConsider = this.instructors.filter(instructor => instructor.id === selectedInstructorId);
    }

    // Get unique instruments from selected instructor(s)
    const instrumentsSet = new Set();
    instructorsToConsider.forEach(instructor => {
      // Check multiple possible fields for instruments
      const instruments = instructor.specialties || instructor.instruments || instructor.primaryInstrument 
        ? [instructor.primaryInstrument] : [];
      
      if (Array.isArray(instruments)) {
        instruments.forEach(instrument => {
          if (instrument && instrument.trim()) {
            instrumentsSet.add(instrument.trim());
          }
        });
      } else if (typeof instruments === 'string' && instruments.trim()) {
        instrumentsSet.add(instruments.trim());
      }
    });

    const uniqueInstruments = Array.from(instrumentsSet).sort();
    
    // Calculate availability for each instrument
    const instrumentAvailability = this.#calculateInstrumentAvailability(uniqueInstruments, instructorsToConsider);
    const totalSlots = Object.values(instrumentAvailability).reduce((sum, count) => sum + count, 0);

    // Create "All Instruments" chip
    const allChip = this.#createFilterChip('instrument', 'all', `All Instruments (${totalSlots} slots)`, true);
    instrumentContainer.appendChild(allChip);

    // Create individual instrument chips
    uniqueInstruments.forEach(instrument => {
      const slots = instrumentAvailability[instrument] || 0;
      const chipText = `${instrument} (${slots} slots)`;
      const availability = slots > 3 ? 'available' : slots > 0 ? 'limited' : 'unavailable';
      const chip = this.#createFilterChip('instrument', instrument, chipText, false, availability);
      instrumentContainer.appendChild(chip);
    });
  }

  /**
   * Calculate available time slots for each instrument based on selected instructors
   */
  #calculateInstrumentAvailability(instruments, instructorsToConsider) {
    const availability = {};
    
    // Initialize all instruments to 0
    instruments.forEach(instrument => {
      availability[instrument] = 0;
    });
    
    // Count slots for each instrument across selected instructors
    instructorsToConsider.forEach(instructor => {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      
      // Get instructor's instruments
      const instructorInstruments = instructor.specialties || instructor.instruments || 
        (instructor.primaryInstrument ? [instructor.primaryInstrument] : []);
      
      const normalizedInstruments = Array.isArray(instructorInstruments) 
        ? instructorInstruments 
        : [instructorInstruments].filter(Boolean);
      
      days.forEach(day => {
        const startTime = instructor[`${day}StartTime`];
        if (startTime) {
          // Add slots for each instrument this instructor teaches
          normalizedInstruments.forEach(instrument => {
            if (instrument && instrument.trim() && availability.hasOwnProperty(instrument.trim())) {
              availability[instrument.trim()] += 2; // Simple calculation - assume 2 slots per day
            }
          });
        }
      });
    });
    
    return availability;
  }

  /**
   * Generate length chips based on available lesson lengths from selected instructors
   */
  #generateLengthChips() {
    const lengthChipsContainer = document.getElementById('length-chips-container');
    if (!lengthChipsContainer) return;

    // Clear existing chips
    lengthChipsContainer.innerHTML = '';

    // Get available lesson lengths based on current instructor selection
    const availableLengths = this.#calculateLengthAvailability();

    // Standard lesson lengths in minutes
    const standardLengths = [30, 45, 60];

    standardLengths.forEach(length => {
      const isAvailable = availableLengths[length] > 0;
      const availabilityCount = availableLengths[length] || 0;

      const chip = document.createElement('div');
      chip.className = `chip ${isAvailable ? '' : 'disabled'}`;
      chip.innerHTML = `
        ${length} min
        ${isAvailable ? `<small class="availability-count">(${availabilityCount} slots)</small>` : '<small class="unavailable-text">(unavailable)</small>'}
      `;
      
      if (isAvailable) {
        chip.addEventListener('click', () => {
          chip.classList.toggle('selected');
          this.#generateInstructorTimeSlots();
        });
      }

      lengthChipsContainer.appendChild(chip);
    });
  }

  /**
   * Calculate availability for each lesson length based on selected instructors
   */
  #calculateLengthAvailability() {
    const selectedInstructorChips = document.querySelectorAll('#instructor-chips-container .chip.selected');
    const availability = { 30: 0, 45: 0, 60: 0 };

    if (selectedInstructorChips.length === 0) {
      // If no instructors selected, show all available from current filter
      this.instructors.forEach(instructor => {
        this.#addInstructorLengthAvailability(instructor, availability);
      });
    } else {
      // Calculate based on selected instructors
      selectedInstructorChips.forEach(chip => {
        const instructorId = chip.dataset.instructorId;
        const instructor = this.instructors.find(inst => inst.id === instructorId);
        if (instructor) {
          this.#addInstructorLengthAvailability(instructor, availability);
        }
      });
    }

    return availability;
  }

  /**
   * Helper method to add lesson length availability for a specific instructor
   */
  #addInstructorLengthAvailability(instructor, availability) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
      const daySchedule = instructor[day];
      if (daySchedule && daySchedule.startTime && daySchedule.isAvailable) {
        // Assume all lesson lengths are available for any instructor with time slots
        // In a real system, this might be configurable per instructor
        availability[30] += 1;
        availability[45] += 1;
        availability[60] += 1;
      }
    });
  }

  /**
   * Generate time slots for all instructors
   */
  #generateTimeSlots() {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;
    
    const timeslotGrid = parentContainer.querySelector('.instructor-timeslot-grid');
    if (!timeslotGrid) return;

    // Clear existing instructor cards
    const existingCards = timeslotGrid.querySelectorAll('.instructor-card');
    existingCards.forEach(card => card.remove());

    // Generate cards for each instructor
    this.instructors.forEach(instructor => {
      const timeSlots = this.#generateInstructorTimeSlots(instructor);
      if (timeSlots.length > 0) {
        const card = this.#createInstructorCard(instructor, timeSlots);
        timeslotGrid.appendChild(card);
      }
    });
    
    // Attach listeners after generating
    this.#attachTimeSlotListeners();
  }

  /**
   * Generate time slots for a specific instructor
   */
  #generateInstructorTimeSlots(instructor) {
    const timeSlots = [];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    days.forEach((day, index) => {
      const startTime = instructor[`${day}StartTime`];
      if (startTime) {
        const startMinutes = this.#parseTime(startTime);
        if (startMinutes !== null) {
          // Get all instruments this instructor teaches
          const instructorInstruments = instructor.specialties || instructor.instruments || 
            (instructor.primaryInstrument ? [instructor.primaryInstrument] : ['Piano']);
          
          const normalizedInstruments = Array.isArray(instructorInstruments) 
            ? instructorInstruments 
            : [instructorInstruments].filter(Boolean);
          
          // If no instruments found, default to Piano
          const instruments = normalizedInstruments.length > 0 ? normalizedInstruments : ['Piano'];
          
          // Generate slots for each instrument and length combination
          instruments.forEach(instrument => {
            [30, 45].forEach(length => {
              const slotTime = this.#formatTime(startTime);
              timeSlots.push({
                day: day,
                dayName: dayNames[index],
                time: startTime,
                timeFormatted: slotTime,
                length: length,
                instrument: instrument.trim(),
                instructor: instructor
              });
            });
          });
        }
      }
    });
    
    return timeSlots.slice(0, 6); // Limit to prevent overwhelming UI
  }

  /**
   * Create an instructor card with time slots
   */
  #createInstructorCard(instructor, timeSlots) {
    const card = document.createElement('div');
    card.className = 'instructor-card';
    card.style.cssText = 'border: 2px solid #ddd; margin: 15px 0; padding: 20px; border-radius: 8px; transition: border-color 0.3s;';
    
    const header = document.createElement('h6');
    header.style.cssText = 'margin: 0 0 15px 0; color: #2b68a4; display: flex; align-items: center;';
    
    // Get all instruments this instructor teaches
    const instructorInstruments = instructor.specialties || instructor.instruments || 
      (instructor.primaryInstrument ? [instructor.primaryInstrument] : ['Piano']);
    
    const normalizedInstruments = Array.isArray(instructorInstruments) 
      ? instructorInstruments 
      : [instructorInstruments].filter(Boolean);
    
    const instrumentsDisplay = normalizedInstruments.length > 0 
      ? normalizedInstruments.join(', ') 
      : 'Piano';
    
    header.innerHTML = `<b>${instructor.firstName} ${instructor.lastName} - ${instrumentsDisplay}</b> <span style="margin-left: 10px; font-size: 12px; background: #e8f5e8; color: #4caf50; padding: 4px 8px; border-radius: 12px;">${timeSlots.length} available</span>`;
    
    const timeslotGrid = document.createElement('div');
    timeslotGrid.className = 'timeslot-grid';
    timeslotGrid.style.cssText = 'display: flex; flex-wrap: wrap; gap: 10px;';
    
    timeSlots.forEach(slot => {
      const timeslotElement = this.#createTimeSlotElement(slot);
      timeslotGrid.appendChild(timeslotElement);
    });
    
    card.appendChild(header);
    card.appendChild(timeslotGrid);
    
    return card;
  }

  /**
   * Create a time slot element
   */
  #createTimeSlotElement(slot) {
    const element = document.createElement('div');
    element.className = 'timeslot available';
    element.dataset.instructorId = slot.instructor.id;
    element.dataset.day = slot.day;
    element.dataset.time = slot.time;
    element.dataset.length = slot.length;
    element.dataset.instrument = slot.instrument;
    
    element.style.cssText = 'border: 2px solid #4caf50; background: #e8f5e8; padding: 12px 16px; border-radius: 8px; cursor: pointer; min-width: 110px; text-align: center; transition: all 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
    
    element.innerHTML = `
      <div style="font-weight: bold; color: #2e7d32; font-size: 14px;">${slot.dayName}</div>
      <div style="font-weight: bold; color: #2e7d32; font-size: 16px;">${slot.timeFormatted}</div>
      <div style="font-size: 12px; color: #666;">${slot.length}min • ${slot.instrument}</div>
    `;
    
    return element;
  }

  /**
   * Format time string for display
   */
  #formatTime(timeStr) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes || '00'} ${ampm}`;
  }

  /**
   * Initialize the hybrid registration interface
   */
  #initializeHybridInterface() {
    // Generate all filter chips dynamically
    this.#generateInstructorChips();
    this.#generateDayChips();
    this.#generateInstrumentChips();
    this.#generateLengthChips();
    
    // Generate time slots dynamically
    this.#generateTimeSlots();
    
    // Handle filter chips
    this.#attachFilterChipListeners();
    
    // Handle time slot selection
    this.#attachTimeSlotListeners();
    
    // Handle submit button
    this.#attachSubmitButtonListener();
  }

  /**
   * Attach event listeners to filter chips
   */
  #attachFilterChipListeners() {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;
    
    const chips = parentContainer.querySelectorAll('.chip:not(.unavailable):not([data-listener-attached])');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const chipType = chip.dataset.type;
        
        // Handle chip selection logic
        const siblings = chip.parentElement.querySelectorAll('.chip');
        siblings.forEach(sibling => {
          sibling.classList.remove('active', 'selected');
          if (!sibling.classList.contains('unavailable')) {
            const isAvailable = sibling.classList.contains('available');
            const isLimited = sibling.classList.contains('limited');
            sibling.style.background = isAvailable ? '#e8f5e8' : isLimited ? '#fff3e0' : '#ffebee';
            sibling.style.color = 'inherit';
            sibling.style.border = isAvailable ? '2px solid #4caf50' : isLimited ? '2px solid #ff9800' : '2px solid #f44336';
          }
        });
        
        // Activate this chip
        chip.classList.add('active', 'selected');
        chip.style.background = '#2b68a4';
        chip.style.color = 'white';
        chip.style.border = '2px solid #2b68a4';
        
        // Update instrument and length chips if instructor selection changed
        if (chipType === 'instructor') {
          this.#generateInstrumentChips();
          this.#generateLengthChips();
          this.#attachFilterChipListeners(); // Re-attach listeners for new chips
        }
        
        // Filter time slots based on selection
        this.#filterTimeSlots();
      });
      chip.dataset.listenerAttached = 'true';
    });
  }

  /**
   * Attach event listeners to time slots
   */
  #attachTimeSlotListeners() {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;
    
    const timeSlots = parentContainer.querySelectorAll('.timeslot.available:not([data-listener-attached])');
    timeSlots.forEach(slot => {
      slot.addEventListener('click', () => {
        // Remove previous selection
        parentContainer.querySelectorAll('.timeslot').forEach(s => s.classList.remove('selected'));
        
        // Select this slot
        slot.classList.add('selected');
        slot.style.border = '3px solid #1976d2';
        slot.style.background = '#e3f2fd';
        
        // Update selection display
        this.#updateSelectionDisplay(slot);
      });
      slot.dataset.listenerAttached = 'true';
    });
  }

  /**
   * Attach event listener to submit button
   */
  #attachSubmitButtonListener() {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;
    
    const submitButton = document.getElementById('parent-confirm-registration-btn');
    if (submitButton) {
      // Remove existing onclick if any
      submitButton.removeAttribute('onclick');
      
      submitButton.addEventListener('click', async (event) => {
        event.preventDefault();
        
        if (!this.#validateRegistration()) {
          return;
        }
        
        try {
          const registrationData = this.#getCreateRegistrationData();
          await this.sendDataFunction(registrationData);
          this.#clearForm();
          M.toast({ html: 'Registration created successfully!' });
        } catch (error) {
          console.error('Error creating registration:', error);
          M.toast({ html: `Error creating registration: ${error.message}` });
        }
      });
    } else {
      console.warn('Parent submit button not found');
    }
  }

  /**
   * Filter time slots based on current filter selections
   */
  #filterTimeSlots() {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    // Get selected filter values
    const selectedInstructor = parentContainer.querySelector('.instructor-chip.active')?.dataset.value || 'all';
    const selectedDay = parentContainer.querySelector('.day-chip.active')?.dataset.value || 'all';
    const selectedLength = parentContainer.querySelector('.length-chip.active')?.dataset.value || 'all';
    const selectedInstrument = parentContainer.querySelector('.instrument-chip.active')?.dataset.value || 'all';

    // Get all time slots
    const timeSlots = parentContainer.querySelectorAll('.timeslot');
    
    timeSlots.forEach(slot => {
      let show = true;

      // Filter by instructor
      if (selectedInstructor !== 'all') {
        const slotInstructorId = slot.dataset.instructorId;
        if (slotInstructorId !== selectedInstructor) {
          show = false;
        }
      }

      // Filter by day
      if (selectedDay !== 'all') {
        const slotDay = slot.dataset.day;
        if (slotDay !== selectedDay) {
          show = false;
        }
      }

      // Filter by length
      if (selectedLength !== 'all') {
        const slotLength = slot.dataset.length;
        if (slotLength !== selectedLength) {
          show = false;
        }
      }

      // Filter by instrument
      if (selectedInstrument !== 'all') {
        const slotInstrument = slot.dataset.instrument;
        if (slotInstrument !== selectedInstrument) {
          show = false;
        }
      }

      // Show/hide the slot
      slot.style.display = show ? 'block' : 'none';
    });

    // Update instructor card visibility and counts
    this.#updateInstructorCardVisibility();
  }

  /**
   * Update instructor card visibility based on filtered time slots
   */
  #updateInstructorCardVisibility() {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const instructorCards = parentContainer.querySelectorAll('.instructor-card');
    
    instructorCards.forEach(card => {
      const visibleSlots = card.querySelectorAll('.timeslot[style*="display: block"], .timeslot:not([style*="display: none"])');
      const availableCount = visibleSlots.length;
      
      // Update availability count in card header
      const availabilitySpan = card.querySelector('h6 span');
      if (availabilitySpan) {
        availabilitySpan.textContent = `${availableCount} available`;
        availabilitySpan.style.background = availableCount > 3 ? '#e8f5e8' : availableCount > 0 ? '#fff3e0' : '#ffebee';
        availabilitySpan.style.color = availableCount > 3 ? '#4caf50' : availableCount > 0 ? '#ff9800' : '#f44336';
      }
      
      // Hide card if no slots are available
      card.style.display = availableCount > 0 ? 'block' : 'none';
    });
  }

  /**
   * Update the selection display when a time slot is selected
   */
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
    const parentContainer = document.getElementById('parent-registration');
    const selectionDisplay = parentContainer.querySelector('#selected-lesson-display');
    if (selectionDisplay) {
      const instructor = slot.dataset.instructorId;
      const dayName = slot.dataset.day.charAt(0).toUpperCase() + slot.dataset.day.slice(1);
      const timeFormatted = this.#formatTime(slot.dataset.time);
      const instrument = slot.dataset.instrument;
      const length = slot.dataset.length;
      
      const detailsElement = selectionDisplay.querySelector('#selected-lesson-details');
      if (detailsElement) {
        detailsElement.innerHTML = `
          <div><strong>Instructor:</strong> ${instructor}</div>
          <div><strong>Day:</strong> ${dayName}</div>
          <div><strong>Time:</strong> ${timeFormatted}</div>
          <div><strong>Duration:</strong> ${length} minutes</div>
          <div><strong>Instrument:</strong> ${instrument}</div>
        `;
      }
      
      selectionDisplay.style.display = 'block';
    }
  }

  /**
   * Validate registration data
   */
  #validateRegistration() {
    if (!this.selectedLesson) {
      M.toast({ html: 'Please select a lesson time slot' });
      return false;
    }
    
    return true;
  }

  /**
   * Get registration data for submission
   */
  #getCreateRegistrationData() {
    if (!this.selectedLesson) {
      return null;
    }
    
    const dayMap = {
      'monday': 0,
      'tuesday': 1,
      'wednesday': 2,
      'thursday': 3,
      'friday': 4
    };
    
    return {
      registrationType: RegistrationType.PRIVATE,
      transportationType: 'pickup', // Default for parent form
      instructorId: this.selectedLesson.instructorId,
      instrument: this.selectedLesson.instrument,
      day: dayMap[this.selectedLesson.day],
      startTime: this.selectedLesson.time,
      length: this.selectedLesson.length,
    };
  }

  /**
   * Clear the form after successful submission
   */
  #clearForm() {
    this.selectedLesson = null;
    
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;
    
    const selectedDisplay = parentContainer.querySelector('#selected-lesson-display');
    if (selectedDisplay) {
      selectedDisplay.style.display = 'none';
    }
    
    // Reset all timeslot selections
    parentContainer.querySelectorAll('.timeslot').forEach(slot => {
      slot.style.border = slot.classList.contains('available') ? '2px solid #4caf50' : '2px solid #f44336';
      slot.style.background = slot.classList.contains('available') ? '#e8f5e8' : '#ffebee';
      slot.classList.remove('selected');
    });
    
    // Regenerate time slots with fresh data
    this.#generateTimeSlots();
  }
}
