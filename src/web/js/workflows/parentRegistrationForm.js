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
        const startTime = instructor[`${day}StartTime`];
        if (startTime) {
          // Simple calculation - assume 2-3 slots per day for each instructor
          slotCount += 2;
        }
      });
      
      availability[instructor.id] = slotCount;
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
          // Generate a few sample time slots
          [30, 45].forEach(length => {
            const slotTime = this.#formatTime(startTime);
            timeSlots.push({
              day: day,
              dayName: dayNames[index],
              time: startTime,
              timeFormatted: slotTime,
              length: length,
              instrument: instructor.primaryInstrument || 'Piano',
              instructor: instructor
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
    header.innerHTML = `<b>${instructor.firstName} ${instructor.lastName} - ${instructor.primaryInstrument || 'Piano'}</b> <span style="margin-left: 10px; font-size: 12px; background: #e8f5e8; color: #4caf50; padding: 4px 8px; border-radius: 12px;">${timeSlots.length} available</span>`;
    
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
    // Implementation for filtering time slots based on chip selections
    console.log('Filtering time slots based on chip selections');
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
