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
  constructor(instructors, students, classes, registrations, sendDataFunction, parentChildren = []) {
    this.instructors = instructors;
    this.students = students;
    this.classes = classes;
    this.registrations = registrations || [];
    this.sendDataFunction = sendDataFunction;
    this.parentChildren = parentChildren || [];
    
    // Initialize basic properties
    this.selectedLesson = null;
    
    // Defer complex initialization to avoid private method ordering issues
    setTimeout(() => {
      this.#initializeHybridInterface();
    }, 0);
  }

  /**
   * Parse time string (supports both "HH:MM" and "H:MM AM/PM" formats) to minutes since midnight
   */
  #parseTime(timeStr) {
    if (!timeStr) return null;
    
    // Handle AM/PM format (e.g., "3:00 PM", "11:30 AM")
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      const isPM = timeStr.includes('PM');
      const timeOnly = timeStr.replace(/\s*(AM|PM)$/i, '').trim();
      const [hours, minutes] = timeOnly.split(':').map(Number);
      
      let hour24 = hours;
      if (!isPM && hours === 12) {
        hour24 = 0; // 12:00 AM = 00:00
      } else if (isPM && hours !== 12) {
        hour24 = hours + 12; // Convert PM hours to 24-hour format
      }
      
      return hour24 * 60 + (minutes || 0);
    }
    
    // Handle 24-hour format (e.g., "15:00", "09:30")
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
      // Also add the availability class for proper deselection behavior
      if (availability === 'available') {
        chip.classList.add('available');
      } else if (availability === 'limited') {
        chip.classList.add('limited');
      } else if (availability === 'unavailable') {
        chip.classList.add('unavailable');
      }
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
    
    // Debug: Log instructor and registration data
    console.log('🔍 ParentRegistrationForm Debug - Instructors:', this.instructors.length);
    console.log('🔍 ParentRegistrationForm Debug - Registrations:', this.registrations.length);
    
    if (this.instructors.length > 0) {
      console.log('🔍 Sample instructor structure:', this.instructors[0]);
    }
    
    if (this.registrations.length > 0) {
      console.log('🔍 Sample registration structure:', this.registrations[0]);
    }
    
    // Create day mapping for registration lookups
    const dayMap = {
      'monday': 0,
      'tuesday': 1,
      'wednesday': 2,
      'thursday': 3,
      'friday': 4
    };
    
    this.instructors.forEach(instructor => {
      let slotCount = 0;
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      
      console.log(`🔍 Checking instructor ${instructor.id} (${instructor.firstName} ${instructor.lastName})`);
      
      days.forEach(day => {
        const daySchedule = instructor.availability?.[day] || instructor[day];
        console.log(`  📅 ${day} schedule:`, daySchedule);
        
        // Enhanced availability validation
        if (!this.#isInstructorAvailableOnDay(instructor, day, daySchedule)) {
          return; // Skip this day
        }
        
        // Calculate theoretical slots for this day (every 30-45 minutes)
        const startTime = daySchedule.startTime;
        const endTime = daySchedule.endTime || '17:00'; // Default end time
        
        const startMinutes = this.#parseTime(startTime);
        const endMinutes = this.#parseTime(endTime);
        
        if (startMinutes !== null && endMinutes !== null && endMinutes > startMinutes) {
          // Calculate available 30-minute slots
          const totalDuration = endMinutes - startMinutes;
          const theoreticalSlots = Math.floor(totalDuration / 30);
          
          // Count existing registrations for this instructor on this day
          const dayIndex = dayMap[day];
          const existingRegistrations = this.registrations.filter(reg => {
            const regInstructorId = reg.instructorId?.value || reg.instructorId;
            return regInstructorId === instructor.id && reg.day === dayIndex;
          });
          
          console.log(`    ⏰ ${startTime}-${endTime} (${totalDuration}min) = ${theoreticalSlots} theoretical slots`);
          console.log(`    📝 Existing registrations on ${day}: ${existingRegistrations.length}`);
          
          // Calculate actual available slots considering overlaps
          const availableSlots = this.#calculateAvailableSlotsForDay(
            startMinutes, 
            endMinutes, 
            existingRegistrations
          );
          
          slotCount += availableSlots;
          console.log(`    ✅ Available slots: ${availableSlots}`);
        }
      });
      
      console.log(`  📊 Total slots for ${instructor.firstName}: ${slotCount}`);
      availability[instructor.id] = slotCount;
    });
    
    console.log('🔍 Final availability:', availability);
    return availability;
  }

  /**
   * Check if instructor is available on a specific day
   * @param {Object} instructor - Instructor object
   * @param {string} day - Day name (e.g., 'monday')
   * @param {Object} daySchedule - Day schedule object
   * @returns {boolean} True if available
   */
  #isInstructorAvailableOnDay(instructor, day, daySchedule) {
    // Check 1: Day schedule must exist
    if (!daySchedule) {
      console.log(`    ❌ ${day}: No schedule defined`);
      return false;
    }
    
    // Check 2: Must be marked as available for this day
    if (!daySchedule.isAvailable) {
      console.log(`    ❌ ${day}: Instructor marked as not available (isAvailable: ${daySchedule.isAvailable})`);
      return false;
    }
    
    // Check 3: Must have start time
    if (!daySchedule.startTime) {
      console.log(`    ❌ ${day}: No start time defined`);
      return false;
    }
    
    // Check 4: Must have valid end time
    const endTime = daySchedule.endTime || '17:00';
    if (!endTime) {
      console.log(`    ❌ ${day}: No end time defined`);
      return false;
    }
    
    // Check 5: Start time must be before end time
    const startMinutes = this.#parseTime(daySchedule.startTime);
    const endMinutes = this.#parseTime(endTime);
    
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      console.log(`    ❌ ${day}: Invalid time window (${daySchedule.startTime} - ${endTime})`);
      return false;
    }
    
    console.log(`    ✅ ${day}: Available ${daySchedule.startTime} - ${endTime}`);
    return true;
  }

  /**
   * Calculate available slots for a day considering existing registrations
   * @param {number} startMinutes - Day start time in minutes
   * @param {number} endMinutes - Day end time in minutes  
   * @param {Array} existingRegistrations - Existing registrations for this day
   * @returns {number} Number of available 30-minute slots
   */
  #calculateAvailableSlotsForDay(startMinutes, endMinutes, existingRegistrations) {
    let availableSlots = 0;
    
    // Check every 30-minute slot in the day
    for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 30) {
      const hasConflict = this.#checkTimeSlotConflict(currentMinutes, 30, existingRegistrations);
      if (!hasConflict) {
        availableSlots++;
      }
    }
    
    return availableSlots;
  }

  /**
   * Calculate available time slots for each day of the week
   * @param {Array} instructorsToConsider - Optional array of instructors to filter by
   */
  #calculateDayAvailability(instructorsToConsider = null) {
    const availability = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    // Create day mapping for registration lookups
    const dayMap = {
      'monday': 0,
      'tuesday': 1,
      'wednesday': 2,
      'thursday': 3,
      'friday': 4
    };
    
    // Initialize all days to 0
    days.forEach(day => {
      availability[day] = 0;
    });
    
    // Use filtered instructors if provided, otherwise use all instructors
    const instructorsToUse = instructorsToConsider || this.instructors;
    
    // Count slots for each day across selected instructors
    instructorsToUse.forEach(instructor => {
      days.forEach(day => {
        const daySchedule = instructor.availability?.[day] || instructor[day];
        
        // Use enhanced availability checking
        if (!this.#isInstructorAvailableOnDay(instructor, day, daySchedule)) {
          return; // Skip this instructor on this day
        }
        
        // Calculate theoretical slots for this day
        const startTime = daySchedule.startTime;
        const endTime = daySchedule.endTime || '17:00';
        
        const startMinutes = this.#parseTime(startTime);
        const endMinutes = this.#parseTime(endTime);
        
        if (startMinutes !== null && endMinutes !== null && endMinutes > startMinutes) {
          // Count existing registrations for this instructor on this day
          const dayIndex = dayMap[day];
          const existingRegistrations = this.registrations.filter(reg => {
            const regInstructorId = reg.instructorId?.value || reg.instructorId;
            return regInstructorId === instructor.id && reg.day === dayIndex;
          });
          
          // Calculate actual available slots considering overlaps
          const availableSlots = this.#calculateAvailableSlotsForDay(
            startMinutes,
            endMinutes,
            existingRegistrations
          );
          
          availability[day] += availableSlots;
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

    // Create "All Instructors" chip - always green when deselected
    const allChip = this.#createFilterChip('instructor', 'all', `All Instructors (${totalSlots} slots)`, true, 'available');
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

    // Get selected instructor(s)
    const selectedInstructorChip = parentContainer.querySelector('.instructor-chip.active');
    const selectedInstructorId = selectedInstructorChip?.dataset.value;

    // Determine which instructors to consider
    let instructorsToConsider = this.instructors;
    if (selectedInstructorId && selectedInstructorId !== 'all') {
      instructorsToConsider = this.instructors.filter(instructor => instructor.id === selectedInstructorId);
    }

    // Calculate availability counts for each day based on selected instructors
    const dayAvailability = this.#calculateDayAvailability(instructorsToConsider);
    const totalSlots = Object.values(dayAvailability).reduce((sum, count) => sum + count, 0);

    // Create "All Days" chip - always green when deselected
    const allChip = this.#createFilterChip('day', 'all', `All Days (${totalSlots} slots)`, true, 'available');
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
      // Check instructor specialties (array of instruments)
      if (instructor.specialties && Array.isArray(instructor.specialties)) {
        instructor.specialties.forEach(instrument => {
          if (instrument && instrument.trim()) {
            instrumentsSet.add(instrument.trim());
          }
        });
      }
      
      // Also check for primary instrument field (fallback)
      if (instructor.primaryInstrument && instructor.primaryInstrument.trim()) {
        instrumentsSet.add(instructor.primaryInstrument.trim());
      }
      
      // Check for instruments field (another possible field name)
      if (instructor.instruments) {
        if (Array.isArray(instructor.instruments)) {
          instructor.instruments.forEach(instrument => {
            if (instrument && instrument.trim()) {
              instrumentsSet.add(instrument.trim());
            }
          });
        } else if (typeof instructor.instruments === 'string' && instructor.instruments.trim()) {
          instrumentsSet.add(instructor.instruments.trim());
        }
      }
    });

    const uniqueInstruments = Array.from(instrumentsSet).sort();
    
    // Calculate availability for each instrument
    const instrumentAvailability = this.#calculateInstrumentAvailability(uniqueInstruments, instructorsToConsider);
    const totalSlots = Object.values(instrumentAvailability).reduce((sum, count) => sum + count, 0);

    // Create "All Instruments" chip - always green when deselected
    const allChip = this.#createFilterChip('instrument', 'all', `All Instruments (${totalSlots} slots)`, true, 'available');
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
    
    // Create day mapping for registration lookups
    const dayMap = {
      'monday': 0,
      'tuesday': 1,
      'wednesday': 2,
      'thursday': 3,
      'friday': 4
    };
    
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
        const daySchedule = instructor.availability?.[day] || instructor[day];
        if (daySchedule && daySchedule.startTime && daySchedule.isAvailable) {
          const startTime = daySchedule.startTime;
          const endTime = daySchedule.endTime || '17:00';
          
          const startMinutes = this.#parseTime(startTime);
          const endMinutes = this.#parseTime(endTime);
          
          if (startMinutes !== null && endMinutes !== null && endMinutes > startMinutes) {
            const totalDuration = endMinutes - startMinutes;
            const theoreticalSlots = Math.floor(totalDuration / 30);
            
            // Count existing registrations for this instructor on this day
            const dayIndex = dayMap[day];
            const existingRegistrations = this.registrations.filter(reg => {
              const regInstructorId = reg.instructorId?.value || reg.instructorId;
              return regInstructorId === instructor.id && reg.day === dayIndex;
            });
            
            const availableSlots = Math.max(0, theoreticalSlots - existingRegistrations.length);
            
            // Add slots for each instrument this instructor teaches
            normalizedInstruments.forEach(instrument => {
              if (instrument && instrument.trim() && availability.hasOwnProperty(instrument.trim())) {
                availability[instrument.trim()] += availableSlots;
              }
            });
          }
        }
      });
    });
    
    return availability;
  }

  /**
   * Generate length chips based on available lesson lengths from selected instructors
   */
  #generateLengthChips() {
    // Find the length container specifically in parent registration
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;
    
    const lengthContainer = parentContainer.querySelector('#length-chips-container');
    if (!lengthContainer) {
      console.warn('Parent length chip container not found');
      return;
    }

    // Clear existing length chips
    const existingLengthChips = lengthContainer.querySelectorAll('.length-chip');
    existingLengthChips.forEach(chip => chip.remove());

    // Get available lesson lengths based on current instructor selection
    const availableLengths = this.#calculateLengthAvailability();
    
    // Calculate total slots across all lengths
    const totalSlots = Object.values(availableLengths).reduce((sum, count) => sum + count, 0);

    // Create "All Lengths" chip - always green when deselected
    const allChip = this.#createFilterChip('length', 'all', `All Lengths (${totalSlots} slots)`, true, 'available');
    lengthContainer.appendChild(allChip);

    // Standard lesson lengths in minutes
    const standardLengths = [30, 45, 60];

    // Create individual length chips
    standardLengths.forEach(length => {
      const slots = availableLengths[length] || 0;
      const chipText = `${length} min (${slots} slots)`;
      const availability = slots > 3 ? 'available' : slots > 0 ? 'limited' : 'unavailable';
      const chip = this.#createFilterChip('length', length.toString(), chipText, false, availability);
      lengthContainer.appendChild(chip);
    });
  }

  /**
   * Calculate availability for each lesson length based on selected instructors
   */
  #calculateLengthAvailability() {
    const selectedInstructorChips = document.querySelectorAll('#instructor-chips-container .chip.selected');
    const availability = { 30: 0, 45: 0, 60: 0 };

    console.log('🔍 Calculating length availability...');
    console.log('Selected instructor chips:', selectedInstructorChips.length);

    if (selectedInstructorChips.length === 0) {
      // If no instructors selected, show all available from current filter
      console.log('No instructors selected, using all instructors');
      this.instructors.forEach(instructor => {
        this.#addInstructorLengthAvailability(instructor, availability);
      });
    } else {
      // Calculate based on selected instructors
      console.log('Using selected instructors');
      selectedInstructorChips.forEach(chip => {
        const instructorId = chip.dataset.value; // Fixed: use dataset.value instead of dataset.instructorId
        if (instructorId === 'all') {
          // If "All Instructors" is selected, process all instructors
          console.log('All instructors selected, processing all instructors');
          this.instructors.forEach(instructor => {
            this.#addInstructorLengthAvailability(instructor, availability);
          });
        } else {
          // Process specific instructor
          const instructor = this.instructors.find(inst => inst.id === instructorId);
          if (instructor) {
            console.log('Adding availability for instructor:', instructor.firstName);
            this.#addInstructorLengthAvailability(instructor, availability);
          }
        }
      });
    }

    console.log('Final availability:', availability);
    return availability;
  }

  /**
   * Helper method to add lesson length availability for a specific instructor
   */
  #addInstructorLengthAvailability(instructor, availability) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    
    console.log(`📊 Calculating availability for ${instructor.firstName} ${instructor.lastName}`);
    
    // Create day mapping for registration lookups
    const dayMap = {
      'monday': 0,
      'tuesday': 1,
      'wednesday': 2,
      'thursday': 3,
      'friday': 4
    };
    
    days.forEach(day => {
      const daySchedule = instructor.availability?.[day] || instructor[day];
      
      console.log(`  📅 ${day}:`, daySchedule);
      
      // Check if instructor is available on this day
      if (!daySchedule || !daySchedule.isAvailable || !daySchedule.startTime || !daySchedule.endTime) {
        console.log(`    ❌ Not available or missing schedule`);
        return;
      }
      
      const startTime = daySchedule.startTime;
      const endTime = daySchedule.endTime;
      
      const startMinutes = this.#parseTime(startTime);
      const endMinutes = this.#parseTime(endTime);
      
      console.log(`    🕐 ${startTime} - ${endTime} (${startMinutes} - ${endMinutes} minutes)`);
      
      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        console.log(`    ❌ Invalid time range`);
        return;
      }
      
      // Get existing registrations for this instructor on this day
      const dayIndex = dayMap[day];
      const existingRegistrations = this.registrations.filter(reg => {
        const regInstructorId = reg.instructorId?.value || reg.instructorId;
        return regInstructorId === instructor.id && reg.day === dayIndex;
      });
      
      console.log(`    📝 Existing registrations: ${existingRegistrations.length}`);
      
      // Count actual available slots by checking each possible time slot
      // Generate potential time slots (every 30 minutes from start to end)
      for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 30) {
        // Check each lesson length
        [30, 45, 60].forEach(length => {
          // Check if this length would fit within instructor's available window
          if (currentMinutes + length > endMinutes) {
            return;
          }
          
          // Check if this length would conflict with existing registrations
          const lengthConflict = this.#checkTimeSlotConflict(currentMinutes, length, existingRegistrations);
          if (!lengthConflict) {
            availability[length]++;
            console.log(`    ✅ Added ${length}min slot at ${this.#formatTimeFromMinutes(currentMinutes)}`);
          }
        });
      }
    });
    
    console.log(`  📊 Total for ${instructor.firstName}: 30min=${availability[30]}, 45min=${availability[45]}, 60min=${availability[60]}`);
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
    
    // Create day mapping for registration lookups
    const dayMap = {
      'monday': 0,
      'tuesday': 1,
      'wednesday': 2,
      'thursday': 3,
      'friday': 4
    };
    
    console.log(`🎯 Generating time slots for instructor ${instructor.firstName} ${instructor.lastName}`);
    
    days.forEach((day, index) => {
      // Enhanced availability checking
      const daySchedule = instructor.availability?.[day] || instructor[day];
      
      console.log(`  📅 Checking ${day} availability:`, {
        daySchedule,
        isAvailable: daySchedule?.isAvailable,
        startTime: daySchedule?.startTime,
        endTime: daySchedule?.endTime
      });
      
      // Check 1: Instructor must be available on this day
      if (!daySchedule || !daySchedule.isAvailable) {
        console.log(`  ❌ ${day}: Instructor not available (isAvailable: ${daySchedule?.isAvailable})`);
        return;
      }
      
      // Check 2: Must have valid start and end times
      if (!daySchedule.startTime || !daySchedule.endTime) {
        console.log(`  ❌ ${day}: Missing time schedule (start: ${daySchedule.startTime}, end: ${daySchedule.endTime})`);
        return;
      }
      
      const startTime = daySchedule.startTime;
      const endTime = daySchedule.endTime;
      
      const startMinutes = this.#parseTime(startTime);
      const endMinutes = this.#parseTime(endTime);
      
      // Check 3: Valid time window
      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        console.log(`  ❌ ${day}: Invalid time window (${startTime} - ${endTime})`);
        return;
      }
      
      console.log(`  ✅ ${day}: Available ${startTime} - ${endTime} (${endMinutes - startMinutes} minutes)`);
      
      // Get all instruments this instructor teaches
      const instructorInstruments = instructor.specialties || instructor.instruments || 
        (instructor.primaryInstrument ? [instructor.primaryInstrument] : ['Piano']);
      
      const normalizedInstruments = Array.isArray(instructorInstruments) 
        ? instructorInstruments 
        : [instructorInstruments].filter(Boolean);
      
      // If no instruments found, default to Piano
      const instruments = normalizedInstruments.length > 0 ? normalizedInstruments : ['Piano'];
      
      // Get existing registrations for this instructor on this day
      const dayIndex = dayMap[day];
      const existingRegistrations = this.registrations.filter(reg => {
        const regInstructorId = reg.instructorId?.value || reg.instructorId;
        return regInstructorId === instructor.id && reg.day === dayIndex;
      });
      
      console.log(`  📝 Existing registrations on ${day}:`, existingRegistrations.length);
      existingRegistrations.forEach(reg => {
        console.log(`    - ${reg.startTime} (${reg.length || 30}min)`);
      });
      
      // Generate potential time slots (every 30 minutes from start to end)
      for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 30) {
        const currentTimeStr = this.#formatTimeFromMinutes(currentMinutes);
        
        // Check if this time slot conflicts with existing registrations
        const hasConflict = this.#checkTimeSlotConflict(currentMinutes, 30, existingRegistrations);
        
        if (hasConflict) {
          console.log(`    ⚠️  Conflict at ${currentTimeStr} - skipping`);
          continue;
        }
        
        // Generate slots for different lesson lengths
        instruments.forEach(instrument => {
          [30, 45, 60].forEach(length => {
            // Check if this length would fit within instructor's available window
            if (currentMinutes + length > endMinutes) {
              console.log(`    ⏰ ${currentTimeStr} (${length}min) extends past end time - skipping`);
              return;
            }
            
            // Check if this length would conflict with existing registrations
            const lengthConflict = this.#checkTimeSlotConflict(currentMinutes, length, existingRegistrations);
            if (lengthConflict) {
              console.log(`    ⚠️  ${currentTimeStr} (${length}min) conflicts with existing registration - skipping`);
              return;
            }
            
            const slotTime = this.#formatTime(currentTimeStr);
            console.log(`    ✅ Adding slot: ${currentTimeStr} (${length}min, ${instrument})`);
            
            timeSlots.push({
              day: day,
              dayName: dayNames[index],
              time: currentTimeStr,
              timeFormatted: slotTime,
              length: length,
              instrument: instrument.trim(),
              instructor: instructor
            });
          });
        });
      }
    });
    
    console.log(`🎯 Generated ${timeSlots.length} total slots for ${instructor.firstName}`);
    return timeSlots.slice(0, 15); // Increased limit since we have better filtering
  }

  /**
   * Check if a time slot conflicts with existing registrations
   * @param {number} slotStartMinutes - Start time in minutes since midnight
   * @param {number} slotLengthMinutes - Length of the slot in minutes
   * @param {Array} existingRegistrations - Array of existing registrations
   * @returns {boolean} True if there's a conflict
   */
  #checkTimeSlotConflict(slotStartMinutes, slotLengthMinutes, existingRegistrations) {
    const slotEndMinutes = slotStartMinutes + slotLengthMinutes;
    
    return existingRegistrations.some(reg => {
      const regStartMinutes = this.#parseTime(reg.startTime);
      if (regStartMinutes === null) return false;
      
      const regEndMinutes = regStartMinutes + (reg.length || 30);
      
      // Check for any overlap: slot starts before registration ends AND slot ends after registration starts
      const hasOverlap = (slotStartMinutes < regEndMinutes && slotEndMinutes > regStartMinutes);
      
      if (hasOverlap) {
        console.log(`    🔍 Conflict detected: Slot ${this.#formatTimeFromMinutes(slotStartMinutes)}-${this.#formatTimeFromMinutes(slotEndMinutes)} overlaps with registration ${reg.startTime}-${this.#formatTimeFromMinutes(regEndMinutes)}`);
      }
      
      return hasOverlap;
    });
  }

  /**
   * Helper method to format minutes since midnight back to HH:MM format
   */
  #formatTimeFromMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
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
    // Handle registration type selection first
    this.#attachRegistrationTypeListener();
    
    // Populate student selector
    this.#populateStudentSelector();
    
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
    
    // Handle clear button
    this.#attachClearButtonListener();
  }

  /**
   * Populate the student selector with parent's children
   */
  #populateStudentSelector() {
    const studentSelect = document.getElementById('parent-student-select');
    const studentSection = document.getElementById('parent-student-selection-section');
    
    if (!studentSelect || !studentSection) {
      console.warn('Parent student selector elements not found');
      return;
    }

    // Clear existing options (except the first placeholder)
    while (studentSelect.children.length > 1) {
      studentSelect.removeChild(studentSelect.lastChild);
    }

    // Handle based on number of students
    if (this.parentChildren.length === 0) {
      // No students - hide section
      studentSection.style.display = 'none';
      console.warn('No students found for parent');
    } else if (this.parentChildren.length === 1) {
      // Single student - hide section and auto-select
      studentSection.style.display = 'none';
      const student = this.parentChildren[0];
      
      // Create option and select it
      const option = document.createElement('option');
      option.value = student.id;
      option.textContent = `${student.firstName} ${student.lastName}`;
      option.selected = true;
      studentSelect.appendChild(option);
      
      console.log(`Auto-selected single student: ${student.firstName} ${student.lastName}`);
    } else {
      // Multiple students - show section
      studentSection.style.display = 'block';
      
      // Add student options
      this.parentChildren.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${student.firstName} ${student.lastName}`;
        studentSelect.appendChild(option);
      });
      
      console.log(`Showing student selector with ${this.parentChildren.length} students`);
    }

    // Reinitialize Materialize select
    M.FormSelect.init(studentSelect);
  }

  /**
   * Attach event listener to registration type selection
   */
  #attachRegistrationTypeListener() {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;
    
    const registrationTypeSelect = document.getElementById('parent-registration-type-select');
    const privateContainer = document.getElementById('parent-private-registration-container');
    const groupContainer = document.getElementById('parent-group-registration-container');
    
    if (registrationTypeSelect && privateContainer && groupContainer) {
      registrationTypeSelect.addEventListener('change', (event) => {
        const selectedType = event.target.value;
        
        // Hide both containers first
        privateContainer.style.display = 'none';
        groupContainer.style.display = 'none';
        
        if (selectedType === 'private') {
          // Show the private registration container
          privateContainer.style.display = 'block';
          console.log('🎯 Private registration container shown');
        } else if (selectedType === 'public') {
          // Show the group registration container
          groupContainer.style.display = 'block';
          console.log('🎯 Group registration container shown');
          
          // Populate the classes dropdown
          this.#populateParentClassesDropdown();
        } else {
          console.log('🎯 All registration containers hidden');
        }
        
        // Initialize Materialize select components
        setTimeout(() => {
          if (typeof M !== 'undefined') {
            M.FormSelect.init(document.querySelectorAll('select'));
          }
        }, 100);
      });
      
      // Initialize Materialize select
      if (typeof M !== 'undefined') {
        M.FormSelect.init(registrationTypeSelect);
      }
    }
  }

  /**
   * Populate the parent classes dropdown with available classes
   */
  #populateParentClassesDropdown() {
    const classSelect = document.getElementById('parent-class-select');
    if (!classSelect || !this.classes) {
      console.warn('Parent class select not found or no classes available');
      return;
    }

    // Clear existing options
    classSelect.innerHTML = '';

    // Create default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a class';
    classSelect.appendChild(defaultOption);

    // Add class options (same logic as admin)
    this.classes.forEach(cls => {
      const option = document.createElement('option');
      option.value = cls.id;
      option.textContent = cls.formattedName || cls.title || cls.instrument || `Class ${cls.id}`;
      classSelect.appendChild(option);
    });

    // Add event listener for class selection
    classSelect.addEventListener('change', (event) => {
      this.#handleClassSelection(event.target.value);
    });

    // Initialize Materialize select
    if (typeof M !== 'undefined') {
      M.FormSelect.init(classSelect);
    }

    console.log(`🎯 Populated parent classes dropdown with ${this.classes.length} classes`);
  }

  /**
   * Handle class selection and check capacity
   */
  #handleClassSelection(classId) {
    const registerButton = document.getElementById('parent-create-group-registration-btn');
    const errorContainer = this.#getOrCreateErrorContainer();
    
    // Clear previous error state
    this.#clearRegistrationError();
    
    if (!classId) {
      // No class selected, disable button
      if (registerButton) {
        registerButton.disabled = true;
        registerButton.style.opacity = '0.6';
      }
      return;
    }

    // Find the selected class
    const selectedClass = this.classes.find(cls => cls.id === classId);
    if (!selectedClass) {
      console.warn('Selected class not found:', classId);
      return;
    }

    console.log('🔍 Checking capacity for class:', selectedClass);

    // Count current registrations for this class
    const currentRegistrations = this.registrations.filter(reg => {
      const regClassId = reg.classId?.value || reg.classId;
      return regClassId === classId;
    });

    console.log(`📊 Class ${selectedClass.title || selectedClass.instrument} - Current: ${currentRegistrations.length}, Capacity: ${selectedClass.capacity || selectedClass.size || selectedClass.maxStudents || 'Unknown'}`);

    // Get class capacity (check multiple possible property names)
    const classCapacity = selectedClass.capacity || selectedClass.size || selectedClass.maxStudents || 12; // Default to 12

    if (currentRegistrations.length >= classCapacity) {
      // Class is full
      this.#showRegistrationError('This class is full. Please reach out to an administrator.');
      if (registerButton) {
        registerButton.disabled = true;
        registerButton.style.opacity = '0.6';
      }
    } else {
      // Class has space
      if (registerButton) {
        registerButton.disabled = false;
        registerButton.style.opacity = '1';
      }
      
      const availableSpots = classCapacity - currentRegistrations.length;
      console.log(`✅ Class has ${availableSpots} available spots`);
    }
  }

  /**
   * Get or create error container for registration messages
   */
  #getOrCreateErrorContainer() {
    let errorContainer = document.getElementById('parent-class-error-message');
    
    if (!errorContainer) {
      // Create error container
      errorContainer = document.createElement('div');
      errorContainer.id = 'parent-class-error-message';
      errorContainer.style.cssText = 'margin-top: 10px; padding: 10px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #d32f2f; font-size: 14px; display: none;';
      
      // Insert after the class select
      const classSelect = document.getElementById('parent-class-select');
      const inputField = classSelect?.closest('.input-field');
      if (inputField) {
        inputField.parentNode.insertBefore(errorContainer, inputField.nextSibling);
      }
    }
    
    return errorContainer;
  }

  /**
   * Show registration error message
   */
  #showRegistrationError(message) {
    const errorContainer = this.#getOrCreateErrorContainer();
    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.style.display = 'block';
    }
  }

  /**
   * Clear registration error message
   */
  #clearRegistrationError() {
    const errorContainer = document.getElementById('parent-class-error-message');
    if (errorContainer) {
      errorContainer.style.display = 'none';
      errorContainer.textContent = '';
    }
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
        
        // Update day, instrument and length chips if instructor selection changed
        if (chipType === 'instructor') {
          this.#generateDayChips();
          this.#generateInstrumentChips();
          this.#generateLengthChips();
          this.#attachFilterChipListeners(); // Re-attach listeners for new chips
        }
        
        // Update instrument and length chips if day selection changed
        if (chipType === 'day') {
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
        // Remove previous selection and reset styling for all slots
        parentContainer.querySelectorAll('.timeslot').forEach(s => {
          s.classList.remove('selected');
          // Reset to original styling based on availability
          if (s.classList.contains('available')) {
            s.style.border = '2px solid #4caf50';
            s.style.background = '#e8f5e8';
          } else if (s.classList.contains('limited')) {
            s.style.border = '2px solid #ff9800';
            s.style.background = '#fff3e0';
          } else {
            s.style.border = '2px solid #f44336';
            s.style.background = '#ffebee';
          }
        });
        
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
   * Attach event listener to clear button
   */
  #attachClearButtonListener() {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;
    
    const clearButton = document.getElementById('parent-clear-selection-btn');
    if (clearButton) {
      // Remove existing onclick if any
      clearButton.removeAttribute('onclick');
      
      clearButton.addEventListener('click', (event) => {
        event.preventDefault();
        this.clearSelection();
      });
    } else {
      console.warn('Parent clear button not found');
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
    const selectionDisplay = parentContainer.querySelector('#admin-selected-lesson-display');
    if (selectionDisplay) {
      const instructor = slot.dataset.instructorId;
      const dayName = slot.dataset.day.charAt(0).toUpperCase() + slot.dataset.day.slice(1);
      const timeFormatted = this.#formatTime(slot.dataset.time);
      const instrument = slot.dataset.instrument;
      const length = slot.dataset.length;
      
      const detailsElement = selectionDisplay.querySelector('#admin-selected-lesson-details');
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
      selectionDisplay.style.pointerEvents = 'none'; // Allow clicks to pass through
      
      // Enable pointer events on the inner container
      const innerContainer = selectionDisplay.querySelector('div');
      if (innerContainer) {
        innerContainer.style.pointerEvents = 'auto';
      }
    }
  }

  /**
   * Validate registration data
   */
  #validateRegistration() {
    // Check if student is selected (only if dropdown is visible for multiple students)
    const studentSection = document.getElementById('parent-student-selection-section');
    const studentSelect = document.getElementById('parent-student-select');
    const studentId = studentSelect?.value;
    
    // Only validate student selection if the section is visible (multiple students)
    if (studentSection && studentSection.style.display !== 'none' && !studentId) {
      M.toast({ html: 'Please select a student' });
      return false;
    }
    
    // For single student case, ensure there's still a student ID available
    if (!studentId) {
      M.toast({ html: 'No student available for registration' });
      return false;
    }
    
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
    
    // Get selected student ID
    const studentSelect = document.getElementById('parent-student-select');
    const studentId = studentSelect?.value;
    
    if (!studentId) {
      throw new Error('Please select a student');
    }
    
    const dayMap = {
      'monday': 0,
      'tuesday': 1,
      'wednesday': 2,
      'thursday': 3,
      'friday': 4
    };
    
    return {
      studentId: studentId,
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
    
    // Hide the fixed registration preview (using the correct ID)
    const selectedDisplay = parentContainer.querySelector('#admin-selected-lesson-display');
    if (selectedDisplay) {
      selectedDisplay.style.display = 'none';
      selectedDisplay.style.pointerEvents = 'none'; // Ensure it doesn't interfere when hidden
    }
    
    // Reset all timeslot selections
    parentContainer.querySelectorAll('.timeslot').forEach(slot => {
      slot.classList.remove('selected');
      // Reset to original styling based on availability
      if (slot.classList.contains('available')) {
        slot.style.border = '2px solid #4caf50';
        slot.style.background = '#e8f5e8';
      } else if (slot.classList.contains('limited')) {
        slot.style.border = '2px solid #ff9800';
        slot.style.background = '#fff3e0';
      } else {
        slot.style.border = '2px solid #f44336';
        slot.style.background = '#ffebee';
      }
    });
    
    // Regenerate time slots with fresh data
    this.#generateTimeSlots();
  }

  /**
   * Public method to clear the form selection (can be called externally)
   */
  clearSelection() {
    this.#clearForm();
  }
}
