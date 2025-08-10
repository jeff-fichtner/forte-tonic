/**
 * Parent Registration Form - Hybrid interface with validation
 * This class handles the registration workflow for parents with full validation and restrictions
 */

import { RegistrationType } from '../../../utils/values/registrationType.js';
import { Select } from '../components/select.js';
import { DomHelpers } from '../utilities/domHelpers.js';
import { formatClassNameWithGradeCorrection } from '../utils/classNameFormatter.js';

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

    // Calculate availability for each instructor

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


      days.forEach(day => {
        const daySchedule = instructor.availability?.[day] || instructor[day];

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
          // Count existing registrations for this instructor on this day
          const existingRegistrations = this.registrations.filter(reg => {
            const regInstructorId = reg.instructorId?.value || reg.instructorId;
            return regInstructorId === instructor.id && reg.day === this.#getRegistrationDayName(day);
          });

          // Calculate actual available slots considering overlaps
          const availableSlots = this.#calculateAvailableSlotsForDay(
            startMinutes,
            endMinutes,
            existingRegistrations
          );

          slotCount += availableSlots;
        }
      });

      console.log(`📊 Total slots for ${instructor.firstName}: ${slotCount}`);
      availability[instructor.id] = slotCount;
    });

    return availability;
  }

  /**
   * Calculate filtered instructor availability based on selected filters
   */
  #calculateFilteredInstructorAvailability(selectedDay = null, selectedInstrument = null, selectedLength = null) {
    const availability = {};

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
      const days = selectedDay && selectedDay !== 'all' ? [selectedDay] : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

      // Check if instructor teaches the selected instrument
      if (selectedInstrument && selectedInstrument !== 'all') {
        const instructorInstruments = instructor.specialties || instructor.instruments ||
          (instructor.primaryInstrument ? [instructor.primaryInstrument] : []);

        const normalizedInstruments = Array.isArray(instructorInstruments)
          ? instructorInstruments
          : [instructorInstruments].filter(Boolean);

        const teachesInstrument = normalizedInstruments.some(inst =>
          inst && inst.toLowerCase().includes(selectedInstrument.toLowerCase())
        );

        if (!teachesInstrument) {
          availability[instructor.id] = 0;
          return; // Skip this instructor
        }
      }

      days.forEach(day => {
        const daySchedule = instructor.availability?.[day] || instructor[day];

        // Enhanced availability validation
        if (!this.#isInstructorAvailableOnDay(instructor, day, daySchedule)) {
          return; // Skip this day
        }

        const startTime = daySchedule.startTime;
        const endTime = daySchedule.endTime || '17:00';

        const startMinutes = this.#parseTime(startTime);
        const endMinutes = this.#parseTime(endTime);

        if (startMinutes !== null && endMinutes !== null && endMinutes > startMinutes) {
          // Count existing registrations for this instructor on this day
          const existingRegistrations = this.registrations.filter(reg => {
            const regInstructorId = reg.instructorId?.value || reg.instructorId;
            return regInstructorId === instructor.id && reg.day === this.#getRegistrationDayName(day);
          });

          // If length is specified, count slots for that specific length
          if (selectedLength && selectedLength !== 'all') {
            const lengthMinutes = parseInt(selectedLength);
            // Count potential slots for this specific length
            for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 30) {
              if (currentMinutes + lengthMinutes <= endMinutes) {
                const hasConflict = this.#checkTimeSlotConflict(currentMinutes, lengthMinutes, existingRegistrations);
                if (!hasConflict) {
                  slotCount++;
                }
              }
            }
          } else {
            // Calculate available slots considering all possible lengths
            const availableSlots = this.#calculateAvailableSlotsForDay(
              startMinutes,
              endMinutes,
              existingRegistrations
            );
            slotCount += availableSlots;
          }
        }
      });

      availability[instructor.id] = slotCount;
    });

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
      return false;
    }

    // Check 2: Must be marked as available for this day
    if (!daySchedule.isAvailable) {
      return false;
    }

    // Check 3: Must have start time
    if (!daySchedule.startTime) {
      return false;
    }

    // Check 4: Must have valid end time
    const endTime = daySchedule.endTime || '17:00';
    if (!endTime) {
      return false;
    }

    // Check 5: Start time must be before end time
    const startMinutes = this.#parseTime(daySchedule.startTime);
    const endMinutes = this.#parseTime(endTime);

    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      return false;
    }

    return true;
  }

  /**
   * Get the proper day name format for registration comparison
   * @param {string} day - Day name in lowercase (e.g., "monday")
   * @returns {string} Capitalized day name (e.g., "Monday")
   */
  #getRegistrationDayName(day) {
    return day.charAt(0).toUpperCase() + day.slice(1);
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
          const existingRegistrations = this.registrations.filter(reg => {
            const regInstructorId = reg.instructorId?.value || reg.instructorId;
            return regInstructorId === instructor.id && reg.day === this.#getRegistrationDayName(day);
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
   * Calculate filtered day availability based on selected filters
   */
  #calculateFilteredDayAvailability(selectedInstructor = null, selectedInstrument = null, selectedLength = null) {
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

    // Filter instructors based on selected instructor and instrument
    let instructorsToUse = this.instructors;

    if (selectedInstructor && selectedInstructor !== 'all') {
      instructorsToUse = instructorsToUse.filter(instructor => instructor.id === selectedInstructor);
    }

    if (selectedInstrument && selectedInstrument !== 'all') {
      instructorsToUse = instructorsToUse.filter(instructor => {
        const instructorInstruments = instructor.specialties || instructor.instruments ||
          (instructor.primaryInstrument ? [instructor.primaryInstrument] : []);

        const normalizedInstruments = Array.isArray(instructorInstruments)
          ? instructorInstruments
          : [instructorInstruments].filter(Boolean);

        return normalizedInstruments.some(inst =>
          inst && inst.toLowerCase().includes(selectedInstrument.toLowerCase())
        );
      });
    }

    // Count slots for each day across filtered instructors
    instructorsToUse.forEach(instructor => {
      days.forEach(day => {
        const daySchedule = instructor.availability?.[day] || instructor[day];

        if (!this.#isInstructorAvailableOnDay(instructor, day, daySchedule)) {
          return; // Skip this instructor on this day
        }

        const startTime = daySchedule.startTime;
        const endTime = daySchedule.endTime || '17:00';

        const startMinutes = this.#parseTime(startTime);
        const endMinutes = this.#parseTime(endTime);

        if (startMinutes !== null && endMinutes !== null && endMinutes > startMinutes) {
          const existingRegistrations = this.registrations.filter(reg => {
            const regInstructorId = reg.instructorId?.value || reg.instructorId;
            return regInstructorId === instructor.id && reg.day === this.#getRegistrationDayName(day);
          });

          // If length is specified, count slots for that specific length
          if (selectedLength && selectedLength !== 'all') {
            const lengthMinutes = parseInt(selectedLength);
            for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 30) {
              if (currentMinutes + lengthMinutes <= endMinutes) {
                const hasConflict = this.#checkTimeSlotConflict(currentMinutes, lengthMinutes, existingRegistrations);
                if (!hasConflict) {
                  availability[day]++;
                }
              }
            }
          } else {
            const availableSlots = this.#calculateAvailableSlotsForDay(
              startMinutes,
              endMinutes,
              existingRegistrations
            );
            availability[day] += availableSlots;
          }
        }
      });
    });

    return availability;
  }

  /**
   * Calculate cascading day availability based only on selected instrument
   */
  #calculateCascadingDayAvailability(selectedInstrument = null) {
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

    // Filter instructors based only on selected instrument (cascading)
    let instructorsToUse = this.instructors;

    if (selectedInstrument && selectedInstrument !== 'all') {
      instructorsToUse = instructorsToUse.filter(instructor => {
        const instructorInstruments = instructor.specialties || instructor.instruments ||
          (instructor.primaryInstrument ? [instructor.primaryInstrument] : []);

        const normalizedInstruments = Array.isArray(instructorInstruments)
          ? instructorInstruments
          : [instructorInstruments].filter(Boolean);

        return normalizedInstruments.some(inst =>
          inst && inst.toLowerCase().includes(selectedInstrument.toLowerCase())
        );
      });
    }

    // Count all possible slots for each day across filtered instructors
    instructorsToUse.forEach(instructor => {
      days.forEach(day => {
        const daySchedule = instructor.availability?.[day] || instructor[day];

        if (!this.#isInstructorAvailableOnDay(instructor, day, daySchedule)) {
          return; // Skip this instructor on this day
        }

        const startTime = daySchedule.startTime;
        const endTime = daySchedule.endTime || '17:00';

        const startMinutes = this.#parseTime(startTime);
        const endMinutes = this.#parseTime(endTime);

        if (startMinutes !== null && endMinutes !== null && endMinutes > startMinutes) {
          const existingRegistrations = this.registrations.filter(reg => {
            const regInstructorId = reg.instructorId?.value || reg.instructorId;
            return regInstructorId === instructor.id && reg.day === this.#getRegistrationDayName(day);
          });

          // Count all possible slots for each lesson length (30min, 45min, 60min)
          [30, 45, 60].forEach(length => {
            for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 30) {
              if (currentMinutes + length <= endMinutes) {
                const hasConflict = this.#checkTimeSlotConflict(currentMinutes, length, existingRegistrations);
                if (!hasConflict) {
                  availability[day]++;
                }
              }
            }
          });
        }
      });
    });

    return availability;
  }

  /**
   * Calculate cascading length availability based on selected instrument and day
   */
  #calculateCascadingLengthAvailability(selectedInstrument = null, selectedDay = null) {
    const availability = { 30: 0, 45: 0, 60: 0 };

    // Create day mapping for registration lookups
    const dayMap = {
      'monday': 0,
      'tuesday': 1,
      'wednesday': 2,
      'thursday': 3,
      'friday': 4
    };

    // Filter instructors based only on selected instrument (cascading)
    let instructorsToUse = this.instructors;

    if (selectedInstrument && selectedInstrument !== 'all') {
      instructorsToUse = instructorsToUse.filter(instructor => {
        const instructorInstruments = instructor.specialties || instructor.instruments ||
          (instructor.primaryInstrument ? [instructor.primaryInstrument] : []);

        const normalizedInstruments = Array.isArray(instructorInstruments)
          ? instructorInstruments
          : [instructorInstruments].filter(Boolean);

        return normalizedInstruments.some(inst =>
          inst && inst.toLowerCase().includes(selectedInstrument.toLowerCase())
        );
      });
    }

    // Filter days based on selected day (cascading)
    const daysToCheck = selectedDay && selectedDay !== 'all' ? [selectedDay] :
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    // Count slots for each length across filtered instructors and days
    instructorsToUse.forEach(instructor => {
      daysToCheck.forEach(day => {
        const daySchedule = instructor.availability?.[day] || instructor[day];

        if (!this.#isInstructorAvailableOnDay(instructor, day, daySchedule)) {
          return; // Skip this instructor on this day
        }

        const startTime = daySchedule.startTime;
        const endTime = daySchedule.endTime || '17:00';

        const startMinutes = this.#parseTime(startTime);
        const endMinutes = this.#parseTime(endTime);

        if (startMinutes !== null && endMinutes !== null && endMinutes > startMinutes) {
          const existingRegistrations = this.registrations.filter(reg => {
            const regInstructorId = reg.instructorId?.value || reg.instructorId;
            return regInstructorId === instructor.id && reg.day === this.#getRegistrationDayName(day);
          });

          // Count slots for each lesson length
          [30, 45, 60].forEach(length => {
            for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 30) {
              if (currentMinutes + length <= endMinutes) {
                const hasConflict = this.#checkTimeSlotConflict(currentMinutes, length, existingRegistrations);
                if (!hasConflict) {
                  availability[length]++;
                }
              }
            }
          });
        }
      });
    });

    return availability;
  }

  /**
   * Calculate cascading instructor availability based on selected instrument, day, and length
   */
  #calculateCascadingInstructorAvailability(selectedInstrument = null, selectedDay = null, selectedLength = null) {
    const availability = {};

    // Create day mapping for registration lookups
    const dayMap = {
      'monday': 0,
      'tuesday': 1,
      'wednesday': 2,
      'thursday': 3,
      'friday': 4
    };

    // Filter instructors based only on selected instrument (cascading)
    let instructorsToUse = this.instructors;

    if (selectedInstrument && selectedInstrument !== 'all') {
      instructorsToUse = instructorsToUse.filter(instructor => {
        const instructorInstruments = instructor.specialties || instructor.instruments ||
          (instructor.primaryInstrument ? [instructor.primaryInstrument] : []);

        const normalizedInstruments = Array.isArray(instructorInstruments)
          ? instructorInstruments
          : [instructorInstruments].filter(Boolean);

        return normalizedInstruments.some(inst =>
          inst && inst.toLowerCase().includes(selectedInstrument.toLowerCase())
        );
      });
    }

    // Filter days based on selected day (cascading)
    const daysToCheck = selectedDay && selectedDay !== 'all' ? [selectedDay] :
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    // Initialize instructor availability
    instructorsToUse.forEach(instructor => {
      availability[instructor.id] = 0;
    });

    // Count slots for each instructor based on cascading filters
    instructorsToUse.forEach(instructor => {
      daysToCheck.forEach(day => {
        const daySchedule = instructor.availability?.[day] || instructor[day];

        if (!this.#isInstructorAvailableOnDay(instructor, day, daySchedule)) {
          return; // Skip this instructor on this day
        }

        const startTime = daySchedule.startTime;
        const endTime = daySchedule.endTime || '17:00';

        const startMinutes = this.#parseTime(startTime);
        const endMinutes = this.#parseTime(endTime);

        if (startMinutes !== null && endMinutes !== null && endMinutes > startMinutes) {
          const existingRegistrations = this.registrations.filter(reg => {
            const regInstructorId = reg.instructorId?.value || reg.instructorId;
            return regInstructorId === instructor.id && reg.day === this.#getRegistrationDayName(day);
          });

          if (selectedLength && selectedLength !== 'all') {
            // Count slots for specific length
            const lengthMinutes = parseInt(selectedLength);
            for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 30) {
              if (currentMinutes + lengthMinutes <= endMinutes) {
                const hasConflict = this.#checkTimeSlotConflict(currentMinutes, lengthMinutes, existingRegistrations);
                if (!hasConflict) {
                  availability[instructor.id]++;
                }
              }
            }
          } else {
            // Count all possible slots for each lesson length (30min, 45min, 60min)
            [30, 45, 60].forEach(length => {
              for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 30) {
                if (currentMinutes + length <= endMinutes) {
                  const hasConflict = this.#checkTimeSlotConflict(currentMinutes, length, existingRegistrations);
                  if (!hasConflict) {
                    availability[instructor.id]++;
                  }
                }
              }
            });
          }
        }
      });
    });

    return availability;
  }

  /**
   * Generate instructor filter chips dynamically using cascading filters
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

    // Get current filter context - only consider upstream filters (instrument, day, length)
    const selectedInstrument = parentContainer.querySelector('.instrument-chip.active')?.dataset.value;
    const selectedDay = parentContainer.querySelector('.day-chip.active')?.dataset.value;
    const selectedLength = parentContainer.querySelector('.length-chip.active')?.dataset.value;
    const selectedInstructor = parentContainer.querySelector('.instructor-chip.active')?.dataset.value;

    // Calculate availability counts for each instructor based on cascading filters
    const instructorAvailability = this.#calculateCascadingInstructorAvailability(selectedInstrument, selectedDay, selectedLength);
    const totalSlots = Object.values(instructorAvailability).reduce((sum, count) => sum + count, 0);

    // Create "All Instructors" chip - only default if no specific instructor is selected
    const isAllDefault = !selectedInstructor || selectedInstructor === 'all';
    const allChip = this.#createFilterChip('instructor', 'all', `All Instructors (${totalSlots} slots)`, isAllDefault, 'available');
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
   * Generate day filter chips dynamically based on selected instrument (cascading)
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

    // Get current filter context - only consider upstream filters (instrument)
    const selectedInstrument = parentContainer.querySelector('.instrument-chip.active')?.dataset.value;
    const selectedDay = parentContainer.querySelector('.day-chip.active')?.dataset.value;

    // Calculate availability counts for each day based on selected instrument only
    const dayAvailability = this.#calculateCascadingDayAvailability(selectedInstrument);
    const totalSlots = Object.values(dayAvailability).reduce((sum, count) => sum + count, 0);

    // Create "All Days" chip - only default if no specific day is selected
    const isAllDefault = !selectedDay || selectedDay === 'all';
    const allChip = this.#createFilterChip('day', 'all', `All Days (${totalSlots} slots)`, isAllDefault, 'available');
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
   * Generate instrument filter chips dynamically (top of cascade - no upstream filters)
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

    // Get current selection (for restoring active state)
    const selectedInstrument = parentContainer.querySelector('.instrument-chip.active')?.dataset.value;

    // Calculate availability for each instrument (no upstream filters - top of cascade)
    const instrumentAvailability = this.#calculateFilteredInstrumentAvailability(null, null, null);
    const totalSlots = Object.values(instrumentAvailability).reduce((sum, count) => sum + count, 0);

    // Create "All Instruments" chip - only default if no specific instrument is selected
    const isAllDefault = !selectedInstrument || selectedInstrument === 'all';
    const allChip = this.#createFilterChip('instrument', 'all', `All Instruments (${totalSlots} slots)`, isAllDefault, 'available');
    instrumentContainer.appendChild(allChip);

    // Create individual instrument chips
    const uniqueInstruments = Object.keys(instrumentAvailability).sort();
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
            const existingRegistrations = this.registrations.filter(reg => {
              const regInstructorId = reg.instructorId?.value || reg.instructorId;
              return regInstructorId === instructor.id && reg.day === this.#getRegistrationDayName(day);
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
   * Calculate filtered instrument availability based on selected filters
   */
  #calculateFilteredInstrumentAvailability(selectedInstructor = null, selectedDay = null, selectedLength = null) {
    const availability = {};

    // Create day mapping for registration lookups
    const dayMap = {
      'monday': 0,
      'tuesday': 1,
      'wednesday': 2,
      'thursday': 3,
      'friday': 4
    };

    // Filter instructors based on selected instructor
    let instructorsToUse = this.instructors;
    if (selectedInstructor && selectedInstructor !== 'all') {
      instructorsToUse = instructorsToUse.filter(instructor => instructor.id === selectedInstructor);
    }

    // Get all possible instruments from filtered instructors
    const instrumentsSet = new Set();
    instructorsToUse.forEach(instructor => {
      const instructorInstruments = instructor.specialties || instructor.instruments ||
        (instructor.primaryInstrument ? [instructor.primaryInstrument] : []);

      const normalizedInstruments = Array.isArray(instructorInstruments)
        ? instructorInstruments
        : [instructorInstruments].filter(Boolean);

      normalizedInstruments.forEach(instrument => {
        if (instrument && instrument.trim()) {
          instrumentsSet.add(instrument.trim());
        }
      });
    });

    const instruments = Array.from(instrumentsSet);

    // Initialize all instruments to 0
    instruments.forEach(instrument => {
      availability[instrument] = 0;
    });

    // Calculate availability for each instrument
    instructorsToUse.forEach(instructor => {
      const days = selectedDay && selectedDay !== 'all' ? [selectedDay] : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

      const instructorInstruments = instructor.specialties || instructor.instruments ||
        (instructor.primaryInstrument ? [instructor.primaryInstrument] : []);

      const normalizedInstruments = Array.isArray(instructorInstruments)
        ? instructorInstruments
        : [instructorInstruments].filter(Boolean);

      days.forEach(day => {
        const daySchedule = instructor.availability?.[day] || instructor[day];

        if (!this.#isInstructorAvailableOnDay(instructor, day, daySchedule)) {
          return;
        }

        const startTime = daySchedule.startTime;
        const endTime = daySchedule.endTime || '17:00';

        const startMinutes = this.#parseTime(startTime);
        const endMinutes = this.#parseTime(endTime);

        if (startMinutes !== null && endMinutes !== null && endMinutes > startMinutes) {
          const dayIndex = dayMap[day];
          const existingRegistrations = this.registrations.filter(reg => {
            const regInstructorId = reg.instructorId?.value || reg.instructorId;
            return regInstructorId === instructor.id && reg.day === this.#getRegistrationDayName(day);
          });

          // Add slots for each instrument this instructor teaches
          normalizedInstruments.forEach(instrument => {
            if (instruments.includes(instrument)) {
              if (selectedLength && selectedLength !== 'all') {
                const lengthMinutes = parseInt(selectedLength);
                for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 30) {
                  if (currentMinutes + lengthMinutes <= endMinutes) {
                    const hasConflict = this.#checkTimeSlotConflict(currentMinutes, lengthMinutes, existingRegistrations);
                    if (!hasConflict) {
                      availability[instrument]++;
                    }
                  }
                }
              } else {
                const availableSlots = this.#calculateAvailableSlotsForDay(
                  startMinutes,
                  endMinutes,
                  existingRegistrations
                );
                availability[instrument] += availableSlots;
              }
            }
          });
        }
      });
    });

    return availability;
  }

  /**
   * Generate length chips based on cascading filters (instrument and day)
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

    // Get current filter context - only consider upstream filters (instrument and day)
    const selectedInstrument = parentContainer.querySelector('.instrument-chip.active')?.dataset.value;
    const selectedDay = parentContainer.querySelector('.day-chip.active')?.dataset.value;
    const selectedLength = parentContainer.querySelector('.length-chip.active')?.dataset.value;

    // Get available lesson lengths based on cascading filters
    const availableLengths = this.#calculateCascadingLengthAvailability(selectedInstrument, selectedDay);

    // Calculate total slots across all lengths
    const totalSlots = Object.values(availableLengths).reduce((sum, count) => sum + count, 0);

    // Create "All Lengths" chip - only default if no specific length is selected
    const isAllDefault = !selectedLength || selectedLength === 'all';
    const allChip = this.#createFilterChip('length', 'all', `All Lengths (${totalSlots} slots)`, isAllDefault, 'available');
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

    if (selectedInstructorChips.length === 0) {
      // If no instructors selected, show all available from current filter
      this.instructors.forEach(instructor => {
        this.#addInstructorLengthAvailability(instructor, availability);
      });
    } else {
      // Calculate based on selected instructors
      selectedInstructorChips.forEach(chip => {
        const instructorId = chip.dataset.value; // Fixed: use dataset.value instead of dataset.instructorId
        if (instructorId === 'all') {
          // If "All Instructors" is selected, process all instructors
          this.instructors.forEach(instructor => {
            this.#addInstructorLengthAvailability(instructor, availability);
          });
        } else {
          // Process specific instructor
          const instructor = this.instructors.find(inst => inst.id === instructorId);
          if (instructor) {
            this.#addInstructorLengthAvailability(instructor, availability);
          }
        }
      });
    }

    return availability;
  }

  /**
   * Calculate filtered length availability based on selected filters
   */
  #calculateFilteredLengthAvailability(selectedInstructor = null, selectedDay = null, selectedInstrument = null) {
    const availability = { 30: 0, 45: 0, 60: 0 };

    // Create day mapping for registration lookups
    const dayMap = {
      'monday': 0,
      'tuesday': 1,
      'wednesday': 2,
      'thursday': 3,
      'friday': 4
    };

    // Filter instructors based on current selections
    let instructorsToUse = this.instructors;

    if (selectedInstructor && selectedInstructor !== 'all') {
      instructorsToUse = instructorsToUse.filter(instructor => instructor.id === selectedInstructor);
    }

    if (selectedInstrument && selectedInstrument !== 'all') {
      instructorsToUse = instructorsToUse.filter(instructor => {
        const instructorInstruments = instructor.specialties || instructor.instruments ||
          (instructor.primaryInstrument ? [instructor.primaryInstrument] : []);

        const normalizedInstruments = Array.isArray(instructorInstruments)
          ? instructorInstruments
          : [instructorInstruments].filter(Boolean);

        return normalizedInstruments.some(inst =>
          inst && inst.toLowerCase().includes(selectedInstrument.toLowerCase())
        );
      });
    }

    // Calculate availability for each length
    instructorsToUse.forEach(instructor => {
      const days = selectedDay && selectedDay !== 'all' ? [selectedDay] : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

      days.forEach(day => {
        const daySchedule = instructor.availability?.[day] || instructor[day];

        if (!this.#isInstructorAvailableOnDay(instructor, day, daySchedule)) {
          return;
        }

        const startTime = daySchedule.startTime;
        const endTime = daySchedule.endTime || '17:00';

        const startMinutes = this.#parseTime(startTime);
        const endMinutes = this.#parseTime(endTime);

        if (startMinutes !== null && endMinutes !== null && endMinutes > startMinutes) {
          const dayIndex = dayMap[day];
          const existingRegistrations = this.registrations.filter(reg => {
            const regInstructorId = reg.instructorId?.value || reg.instructorId;
            return regInstructorId === instructor.id && reg.day === this.#getRegistrationDayName(day);
          });

          // Count potential slots for each length
          [30, 45, 60].forEach(length => {
            for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 30) {
              if (currentMinutes + length <= endMinutes) {
                const hasConflict = this.#checkTimeSlotConflict(currentMinutes, length, existingRegistrations);
                if (!hasConflict) {
                  availability[length]++;
                }
              }
            }
          });
        }
      });
    });

    return availability;
  }

  /**
   * Helper method to add lesson length availability for a specific instructor
   */
  #addInstructorLengthAvailability(instructor, availability) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

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

      // Check if instructor is available on this day
      if (!daySchedule || !daySchedule.isAvailable || !daySchedule.startTime || !daySchedule.endTime) {
        return;
      }

      const startTime = daySchedule.startTime;
      const endTime = daySchedule.endTime;

      const startMinutes = this.#parseTime(startTime);
      const endMinutes = this.#parseTime(endTime);

      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        return;
      }

      // Get existing registrations for this instructor on this day
      const dayIndex = dayMap[day];
      const existingRegistrations = this.registrations.filter(reg => {
        const regInstructorId = reg.instructorId?.value || reg.instructorId;
        return regInstructorId === instructor.id && reg.day === this.#getRegistrationDayName(day);
      });

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
          }
        });
      }
    });

    console.log(`📊 Total for ${instructor.firstName}: 30min=${availability[30]}, 45min=${availability[45]}, 60min=${availability[60]}`);
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

    days.forEach((day, index) => {
      // Enhanced availability checking
      const daySchedule = instructor.availability?.[day] || instructor[day];

      // Check 1: Instructor must be available on this day
      if (!daySchedule || !daySchedule.isAvailable) {
        return;
      }

      // Check 2: Must have valid start and end times
      if (!daySchedule.startTime || !daySchedule.endTime) {
        return;
      }

      const startTime = daySchedule.startTime;
      const endTime = daySchedule.endTime;

      const startMinutes = this.#parseTime(startTime);
      const endMinutes = this.#parseTime(endTime);

      // Check 3: Valid time window
      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        return;
      }

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
        return regInstructorId === instructor.id && reg.day === this.#getRegistrationDayName(day);
      });


      // Generate potential time slots (every 30 minutes from start to end)
      for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 30) {
        const currentTimeStr = this.#formatTimeFromMinutes(currentMinutes);

        // Check if this time slot conflicts with existing registrations
        const hasConflict = this.#checkTimeSlotConflict(currentMinutes, 30, existingRegistrations);

        if (hasConflict) {
          continue;
        }

        // Generate slots for different lesson lengths
        instruments.forEach(instrument => {
          [30, 45, 60].forEach(length => {
            // Check if this length would fit within instructor's available window
            if (currentMinutes + length > endMinutes) {
              return;
            }

            // Check if this length would conflict with existing registrations
            const lengthConflict = this.#checkTimeSlotConflict(currentMinutes, length, existingRegistrations);
            if (lengthConflict) {
              return;
            }

            const slotTime = this.#formatTime(currentTimeStr);

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
    // Hide all registration containers initially
    this.#hideAllRegistrationContainers();

    // Handle registration type selection first
    this.#attachRegistrationTypeListener();

    // Populate student selector
    this.#populateStudentSelector();

    // Generate all filter chips dynamically with cascading order
    // Order: Instrument → Day → Length → Instructor
    this.#generateInstrumentChips();
    this.#generateDayChips();
    this.#generateLengthChips();
    this.#generateInstructorChips();

    // Generate time slots dynamically
    this.#generateTimeSlots();

    // Handle filter chips
    this.#attachFilterChipListeners();

    // Handle time slot selection
    this.#attachTimeSlotListeners();

    // Handle private registration submit button
    this.#attachSubmitButtonListener();

    // Handle group registration submit button
    this.#attachGroupSubmitButtonListener();

    // Handle clear button
    this.#attachClearButtonListener();

    // Attach keyboard handlers for time slot interface
    this.#attachTimeSlotKeyboardHandlers();
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
      // No students - hide section and all registration containers
      studentSection.style.display = 'none';
      this.#hideAllRegistrationContainers();
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

      // Show registration type container since student is selected
      this.#showRegistrationTypeContainer();
    } else {
      // Multiple students - show section and hide registration containers until selection
      studentSection.style.display = 'block';
      this.#hideAllRegistrationContainers();

      // Add student options
      this.parentChildren.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = `${student.firstName} ${student.lastName}`;
        studentSelect.appendChild(option);
      });

      // Add event listener for student selection changes
      studentSelect.addEventListener('change', (event) => {
        const selectedStudentId = event.target.value;
        if (selectedStudentId) {
          this.#showRegistrationTypeContainer();
          // If group registration type is already selected, repopulate classes for new student
          const registrationTypeSelect = document.getElementById('parent-registration-type-select');
          if (registrationTypeSelect && registrationTypeSelect.value === 'public') {
            this.#populateParentClassesDropdown();
            
            // Re-check any currently selected class for conflicts with the new student
            const classSelect = document.getElementById('parent-class-select');
            if (classSelect && classSelect.value) {
              this.#handleClassSelection(classSelect.value);
            }
          }
          
          // Clear any selected time slots when student changes
          this.#clearTimeSlotSelection();
        } else {
          this.#hideAllRegistrationContainers();
        }
      });
    }

    // Reinitialize Materialize select
    M.FormSelect.init(studentSelect);
  }

  /**
   * Show the registration type container
   */
  #showRegistrationTypeContainer() {
    const registrationTypeSection = document.querySelector('.registration-type-section');
    if (registrationTypeSection) {
      registrationTypeSection.style.display = 'block';
    }
  }

  /**
   * Hide all registration containers (type, private, group)
   */
  #hideAllRegistrationContainers() {
    const registrationTypeSection = document.querySelector('.registration-type-section');
    const privateContainer = document.getElementById('parent-private-registration-container');
    const groupContainer = document.getElementById('parent-group-registration-container');

    if (registrationTypeSection) registrationTypeSection.style.display = 'none';
    if (privateContainer) privateContainer.style.display = 'none';
    if (groupContainer) groupContainer.style.display = 'none';
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
        } else if (selectedType === 'public') {
          // Show the group registration container
          groupContainer.style.display = 'block';

          // Populate the classes dropdown
          this.#populateParentClassesDropdown();
        }

        // Restore page scrolling to prevent scroll lock
        this.#restorePageScrolling();

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

    // Get selected student ID
    const studentSelect = document.getElementById('parent-student-select');
    const selectedStudentId = studentSelect?.value;

    if (!selectedStudentId) {
      console.warn('No student selected for class filtering');
      return;
    }

    // Filter classes where student is NOT already enrolled
    const availableClasses = this.classes.filter(cls => {
      // Check if student already has a group registration for this class
      const hasExistingRegistration = this.registrations.some(registration =>
        registration.studentId === selectedStudentId &&
        registration.classId === cls.id &&
        registration.registrationType === 'group'
      );

      return !hasExistingRegistration;
    });

    // Clear existing options
    classSelect.innerHTML = '';

    // Create default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a class';
    classSelect.appendChild(defaultOption);

    // Add available class options only
    availableClasses.forEach(cls => {
      const option = document.createElement('option');
      option.value = cls.id;
      option.textContent = formatClassNameWithGradeCorrection(cls);
      classSelect.appendChild(option);
    });

    // Show message if no classes available
    if (availableClasses.length === 0) {
      const noClassesOption = document.createElement('option');
      noClassesOption.value = '';
      noClassesOption.textContent = 'No available classes (student already enrolled in all classes)';
      noClassesOption.disabled = true;
      classSelect.appendChild(noClassesOption);
    }

    // Add event listener for class selection
    classSelect.addEventListener('change', (event) => {
      this.#handleClassSelection(event.target.value);
    });

    // Initialize Materialize select
    if (typeof M !== 'undefined') {
      M.FormSelect.init(classSelect);
    }

    console.log(`🎯 Populated parent classes dropdown with ${availableClasses.length} available classes (filtered from ${this.classes.length} total)`);
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

    // Count current registrations for this class
    const currentRegistrations = this.registrations.filter(reg => {
      const regClassId = reg.classId?.value || reg.classId;
      return regClassId === classId;
    });

    console.log(`📊 Class ${selectedClass.title || selectedClass.instrument} - Current: ${currentRegistrations.length}, Capacity: ${selectedClass.capacity || selectedClass.size || selectedClass.maxStudents || 'Unknown'}`);

    // Get class capacity (check multiple possible property names)
    const classCapacity = selectedClass.size;
    const hasACapacityDefined = classCapacity !== null && classCapacity !== undefined;

    if (!hasACapacityDefined) {
      // No capacity defined, assume unlimited
    }

    if (hasACapacityDefined && currentRegistrations.length >= classCapacity) {
      // Class is full
      this.#showRegistrationError('This class is full. Please email forte@mcds.org to be placed on the waitlist or to explore other options.');
      if (registerButton) {
        registerButton.disabled = true;
        registerButton.style.opacity = '0.6';
      }
    } else if (!hasACapacityDefined || classCapacity > 0) {
      // Class has space (or assume unlimited capacity), now check for conflicts
      
      // Get current student
      const studentSelect = document.getElementById('parent-student-select');
      const studentId = studentSelect?.value;
      
      if (studentId) {
        // Check for duplicate enrollment
        if (this.#checkStudentClassDuplicate(studentId, classId)) {
          this.#showRegistrationError('Student is already enrolled in this class.');
          if (registerButton) {
            registerButton.disabled = true;
            registerButton.style.opacity = '0.6';
          }
          return;
        }

        // Check for time conflicts
        if (selectedClass.day && selectedClass.startTime && selectedClass.length) {
          const conflictCheck = this.#checkStudentTimeConflict(
            studentId,
            selectedClass.day,
            selectedClass.startTime,
            selectedClass.length
          );

          if (conflictCheck.hasConflict) {
            const conflict = conflictCheck.conflictDetails;
            const conflictMessage = conflict.type === 'PRIVATE' 
              ? `This class conflicts with an existing lesson on ${conflict.day} at ${conflict.startTime} with ${conflict.instructorName}.`
              : `This class conflicts with existing class "${conflict.className}" on ${conflict.day} at ${conflict.startTime}.`;
            
            this.#showRegistrationError(conflictMessage);
            if (registerButton) {
              registerButton.disabled = true;
              registerButton.style.opacity = '0.6';
            }
            return;
          }
        }
      }
      
      // No conflicts found, enable registration
      if (registerButton) {
        registerButton.disabled = false;
        registerButton.style.opacity = '1';
      }
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
   * Attach event listeners to filter chips with cascading logic
   */
  #attachFilterChipListeners() {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const chips = parentContainer.querySelectorAll('.chip:not(.unavailable):not([data-listener-attached])');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const chipType = chip.dataset.type;
        const chipValue = chip.dataset.value;

        // Clear downstream selections when upstream chip is clicked (cascading)
        this.#clearDownstreamSelections(chipType);

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

        // Regenerate downstream chips based on cascading logic
        this.#updateCascadingChips(chipType);

        // Debounce the time slot regeneration to prevent race conditions
        clearTimeout(this.regenerateTimeout);
        this.regenerateTimeout = setTimeout(() => {
          // Regenerate time slots based on current filter state
          this.#regenerateFilteredTimeSlots();
          
          // Filter time slots based on selection
          this.#filterTimeSlots();
        }, 50);
      });
      chip.dataset.listenerAttached = 'true';
    });
  }

  /**
   * Clear selections in downstream chip categories when upstream chip is selected
   */
  #clearDownstreamSelections(chipType) {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const cascade = ['instrument', 'day', 'length', 'instructor'];
    const currentIndex = cascade.indexOf(chipType);

    // Clear all downstream selections (chips after current one in cascade)
    for (let i = currentIndex + 1; i < cascade.length; i++) {
      const downstreamType = cascade[i];
      const downstreamChips = parentContainer.querySelectorAll(`.${downstreamType}-chip.active`);
      downstreamChips.forEach(chip => {
        chip.classList.remove('active', 'selected');
        // Reset styling
        const isAvailable = chip.classList.contains('available');
        const isLimited = chip.classList.contains('limited');
        chip.style.background = isAvailable ? '#e8f5e8' : isLimited ? '#fff3e0' : '#ffebee';
        chip.style.color = 'inherit';
        chip.style.border = isAvailable ? '2px solid #4caf50' : isLimited ? '2px solid #ff9800' : '2px solid #f44336';
      });

      // Activate the "All" chip for downstream categories
      const allChip = parentContainer.querySelector(`.${downstreamType}-chip[data-value="all"]`);
      if (allChip && !allChip.classList.contains('unavailable')) {
        allChip.classList.add('active', 'selected');
        allChip.style.background = '#2b68a4';
        allChip.style.color = 'white';
        allChip.style.border = '2px solid #2b68a4';
      }
    }
  }

  /**
   * Update chips based on cascading logic - only regenerate downstream chips
   */
  #updateCascadingChips(changedChipType) {
    const cascade = ['instrument', 'day', 'length', 'instructor'];
    const currentIndex = cascade.indexOf(changedChipType);

    // Regenerate only downstream chips (chips after current one in cascade)
    for (let i = currentIndex + 1; i < cascade.length; i++) {
      const downstreamType = cascade[i];
      switch (downstreamType) {
        case 'day':
          this.#generateDayChips();
          break;
        case 'length':
          this.#generateLengthChips();
          break;
        case 'instructor':
          this.#generateInstructorChips();
          break;
      }
    }

    // Re-attach listeners to the new downstream chips
    this.#attachFilterChipListeners();
  }

  /**
   * Update all filter chips based on current filter state with cascading logic
   */
  #updateAllFilterChips() {
    // Store current active selections
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const currentInstructor = parentContainer.querySelector('.instructor-chip.active')?.dataset.value;
    const currentDay = parentContainer.querySelector('.day-chip.active')?.dataset.value;
    const currentInstrument = parentContainer.querySelector('.instrument-chip.active')?.dataset.value;
    const currentLength = parentContainer.querySelector('.length-chip.active')?.dataset.value;

    // Cascading regeneration - each chip considers only upstream filters
    // 1. Instrument chips (no upstream filters - always show all)
    this.#generateInstrumentChips();

    // 2. Day chips (filtered by selected instrument)
    this.#generateDayChips();

    // 3. Length chips (filtered by selected instrument + day)
    this.#generateLengthChips();

    // 4. Instructor chips (filtered by selected instrument + day + length)
    this.#generateInstructorChips();

    // Restore the active states, but clear downstream selections if upstream changed
    if (currentInstrument) {
      const instructorChip = parentContainer.querySelector(`.instructor-chip[data-value="${currentInstructor}"]`);
      if (instructorChip) {
        instructorChip.classList.add('active', 'selected');
        instructorChip.style.background = '#2b68a4';
        instructorChip.style.color = 'white';
        instructorChip.style.border = '2px solid #2b68a4';

        // If a specific instructor was selected, ensure "All Instructors" is deselected
        if (currentInstructor !== 'all') {
          const allInstructorChip = parentContainer.querySelector('.instructor-chip[data-value="all"]');
          if (allInstructorChip) {
            allInstructorChip.classList.remove('active', 'selected');
            const isAvailable = allInstructorChip.classList.contains('available');
            const isLimited = allInstructorChip.classList.contains('limited');
            allInstructorChip.style.background = isAvailable ? '#e8f5e8' : isLimited ? '#fff3e0' : '#ffebee';
            allInstructorChip.style.color = 'inherit';
            allInstructorChip.style.border = isAvailable ? '2px solid #4caf50' : isLimited ? '2px solid #ff9800' : '2px solid #f44336';
          }
        }
      }
    }

    if (currentDay) {
      const dayChip = parentContainer.querySelector(`.day-chip[data-value="${currentDay}"]`);
      if (dayChip) {
        dayChip.classList.add('active', 'selected');
        dayChip.style.background = '#2b68a4';
        dayChip.style.color = 'white';
        dayChip.style.border = '2px solid #2b68a4';

        // If a specific day was selected, ensure "All Days" is deselected
        if (currentDay !== 'all') {
          const allDayChip = parentContainer.querySelector('.day-chip[data-value="all"]');
          if (allDayChip) {
            allDayChip.classList.remove('active', 'selected');
            const isAvailable = allDayChip.classList.contains('available');
            const isLimited = allDayChip.classList.contains('limited');
            allDayChip.style.background = isAvailable ? '#e8f5e8' : isLimited ? '#fff3e0' : '#ffebee';
            allDayChip.style.color = 'inherit';
            allDayChip.style.border = isAvailable ? '2px solid #4caf50' : isLimited ? '2px solid #ff9800' : '2px solid #f44336';
          }
        }
      }
    }

    if (currentInstrument) {
      const instrumentChip = parentContainer.querySelector(`.instrument-chip[data-value="${currentInstrument}"]`);
      if (instrumentChip) {
        instrumentChip.classList.add('active', 'selected');
        instrumentChip.style.background = '#2b68a4';
        instrumentChip.style.color = 'white';
        instrumentChip.style.border = '2px solid #2b68a4';

        // If a specific instrument was selected, ensure "All Instruments" is deselected
        if (currentInstrument !== 'all') {
          const allInstrumentChip = parentContainer.querySelector('.instrument-chip[data-value="all"]');
          if (allInstrumentChip) {
            allInstrumentChip.classList.remove('active', 'selected');
            const isAvailable = allInstrumentChip.classList.contains('available');
            const isLimited = allInstrumentChip.classList.contains('limited');
            allInstrumentChip.style.background = isAvailable ? '#e8f5e8' : isLimited ? '#fff3e0' : '#ffebee';
            allInstrumentChip.style.color = 'inherit';
            allInstrumentChip.style.border = isAvailable ? '2px solid #4caf50' : isLimited ? '2px solid #ff9800' : '2px solid #f44336';
          }
        }
      }
    }

    if (currentLength) {
      const lengthChip = parentContainer.querySelector(`.length-chip[data-value="${currentLength}"]`);
      if (lengthChip) {
        lengthChip.classList.add('active', 'selected');
        lengthChip.style.background = '#2b68a4';
        lengthChip.style.color = 'white';
        lengthChip.style.border = '2px solid #2b68a4';

        // If a specific length was selected, ensure "All Lengths" is deselected
        if (currentLength !== 'all') {
          const allLengthChip = parentContainer.querySelector('.length-chip[data-value="all"]');
          if (allLengthChip) {
            allLengthChip.classList.remove('active', 'selected');
            const isAvailable = allLengthChip.classList.contains('available');
            const isLimited = allLengthChip.classList.contains('limited');
            allLengthChip.style.background = isAvailable ? '#e8f5e8' : isLimited ? '#fff3e0' : '#ffebee';
            allLengthChip.style.color = 'inherit';
            allLengthChip.style.border = isAvailable ? '2px solid #4caf50' : isLimited ? '2px solid #ff9800' : '2px solid #f44336';
          }
        }
      }
    }

    // Re-attach listeners to the new chips
    this.#attachFilterChipListeners();
  }

  /**
   * Regenerate time slots based on current filter selections
   */
  #regenerateFilteredTimeSlots() {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const timeslotGrid = parentContainer.querySelector('.instructor-timeslot-grid');
    if (!timeslotGrid) return;

    // Store current selection before regenerating
    const currentSelection = this.selectedLesson;
    console.log('Regenerating slots, preserving selection:', currentSelection);

    // Get current filter selections
    const selectedInstructor = parentContainer.querySelector('.instructor-chip.active')?.dataset.value || 'all';
    const selectedDay = parentContainer.querySelector('.day-chip.active')?.dataset.value || 'all';
    const selectedInstrument = parentContainer.querySelector('.instrument-chip.active')?.dataset.value || 'all';
    const selectedLength = parentContainer.querySelector('.length-chip.active')?.dataset.value || 'all';

    // Clear existing instructor cards
    const existingCards = timeslotGrid.querySelectorAll('.instructor-card');
    existingCards.forEach(card => card.remove());

    // Determine which instructors to include
    let instructorsToInclude = this.instructors;

    // Filter by selected instructor
    if (selectedInstructor !== 'all') {
      instructorsToInclude = instructorsToInclude.filter(instructor => instructor.id === selectedInstructor);
    }

    // Filter by selected instrument
    if (selectedInstrument !== 'all') {
      instructorsToInclude = instructorsToInclude.filter(instructor => {
        const instructorInstruments = instructor.specialties || instructor.instruments ||
          (instructor.primaryInstrument ? [instructor.primaryInstrument] : ['Piano']);
        const normalizedInstruments = Array.isArray(instructorInstruments)
          ? instructorInstruments
          : [instructorInstruments].filter(Boolean);
        return normalizedInstruments.some(inst => inst.trim() === selectedInstrument);
      });
    }

    // Generate cards for filtered instructors
    instructorsToInclude.forEach(instructor => {
      const timeSlots = this.#generateFilteredInstructorTimeSlots(instructor, selectedDay, selectedInstrument, selectedLength);
      if (timeSlots.length > 0) {
        const card = this.#createInstructorCard(instructor, timeSlots);
        timeslotGrid.appendChild(card);
      }
    });

    // Attach listeners after generating
    this.#attachTimeSlotListeners();

    // Restore previous selection if it still exists
    if (currentSelection) {
      setTimeout(() => {
        this.#restoreTimeSlotSelection(currentSelection);
      }, 100);
    }
  }

  /**
   * Restore time slot selection after regeneration
   */
  #restoreTimeSlotSelection(selectionData) {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer || !selectionData) return;

    const matchingSlot = parentContainer.querySelector(
      `.timeslot[data-instructor-id="${selectionData.instructorId}"][data-day="${selectionData.day}"][data-time="${selectionData.time}"][data-length="${selectionData.length}"][data-instrument="${selectionData.instrument}"]`
    );

    if (matchingSlot) {
      // Restore the selection
      matchingSlot.classList.add('selected');
      matchingSlot.style.border = '3px solid #1976d2';
      matchingSlot.style.background = '#e3f2fd';
      
      // Ensure selectedLesson is restored
      this.selectedLesson = selectionData;
      
      // Update display
      this.#updateSelectionDisplay(matchingSlot);
      
      console.log('Time slot selection restored:', selectionData);
    } else {
      console.log('Could not restore time slot selection - slot no longer available:', selectionData);
      // Only clear the selection if we're absolutely sure the slot is no longer available
      // Check if the slot is still in the DOM but just wasn't found by the query
      const stillAvailableSlot = document.querySelector(
        `.timeslot[data-instructor-id="${selectionData.instructorId}"][data-day="${selectionData.day}"][data-time="${selectionData.time}"][data-length="${selectionData.length}"][data-instrument="${selectionData.instrument}"]`
      );
      
      if (!stillAvailableSlot) {
        console.log('Confirmed: slot no longer exists in DOM, clearing selection');
        this.selectedLesson = null;
      } else {
        console.log('Slot still exists in DOM, keeping selection but re-selecting it');
        stillAvailableSlot.classList.add('selected');
        stillAvailableSlot.style.border = '3px solid #1976d2';
        stillAvailableSlot.style.background = '#e3f2fd';
        this.#updateSelectionDisplay(stillAvailableSlot);
      }
    }
  }

  /**
   * Generate time slots for a specific instructor with filters applied
   */
  #generateFilteredInstructorTimeSlots(instructor, dayFilter = 'all', instrumentFilter = 'all', lengthFilter = 'all') {
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

    // Filter days if a specific day is selected
    const daysToProcess = dayFilter !== 'all' ? [dayFilter] : days;

    daysToProcess.forEach((day) => {
      const index = days.indexOf(day);
      if (index === -1) return; // Skip invalid days

      // Enhanced availability checking
      const daySchedule = instructor.availability?.[day] || instructor[day];

      // Check if instructor is available on this day
      if (!daySchedule || !daySchedule.isAvailable) {
        return;
      }

      // Check for valid start and end times
      if (!daySchedule.startTime || !daySchedule.endTime) {
        return;
      }

      const startTime = daySchedule.startTime;
      const endTime = daySchedule.endTime;

      const startMinutes = this.#parseTime(startTime);
      const endMinutes = this.#parseTime(endTime);

      // Check for valid time window
      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        return;
      }

      // Get instructor's instruments
      const instructorInstruments = instructor.specialties || instructor.instruments ||
        (instructor.primaryInstrument ? [instructor.primaryInstrument] : ['Piano']);

      const normalizedInstruments = Array.isArray(instructorInstruments)
        ? instructorInstruments
        : [instructorInstruments].filter(Boolean);

      // Filter instruments if a specific instrument is selected
      const instrumentsToProcess = instrumentFilter !== 'all'
        ? normalizedInstruments.filter(inst => inst.trim() === instrumentFilter)
        : (normalizedInstruments.length > 0 ? normalizedInstruments : ['Piano']);

      // Get existing registrations for this instructor on this day
      const dayIndex = dayMap[day];
      const existingRegistrations = this.registrations.filter(reg => {
        const regInstructorId = reg.instructorId?.value || reg.instructorId;
        return regInstructorId === instructor.id && reg.day === this.#getRegistrationDayName(day);
      });

      // Generate potential time slots (every 30 minutes from start to end)
      for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 30) {
        const currentTimeStr = this.#formatTimeFromMinutes(currentMinutes);

        // Check if this time slot conflicts with existing registrations
        const hasConflict = this.#checkTimeSlotConflict(currentMinutes, 30, existingRegistrations);

        if (hasConflict) {
          continue;
        }

        // Generate slots for different lesson lengths and instruments
        instrumentsToProcess.forEach(instrument => {
          const lengthsToProcess = lengthFilter !== 'all'
            ? [parseInt(lengthFilter)]
            : [30, 45, 60];

          lengthsToProcess.forEach(length => {
            // Check if this length would fit within instructor's available window
            if (currentMinutes + length > endMinutes) {
              return;
            }

            // Check if this length would conflict with existing registrations
            const lengthConflict = this.#checkTimeSlotConflict(currentMinutes, length, existingRegistrations);
            if (lengthConflict) {
              return;
            }

            const slotTime = this.#formatTime(currentTimeStr);

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

    console.log(`🎯 Generated ${timeSlots.length} filtered slots for ${instructor.firstName}`);
    return timeSlots.slice(0, 20); // Limit to prevent overwhelming UI
  }

  /**
   * Attach event listeners to time slots
   */
  #attachTimeSlotListeners() {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    // Remove existing listeners first to prevent duplicates
    const existingSlots = parentContainer.querySelectorAll('.timeslot[data-listener-attached]');
    existingSlots.forEach(slot => {
      slot.removeAttribute('data-listener-attached');
      // Clone node to remove all event listeners
      const newSlot = slot.cloneNode(true);
      slot.parentNode.replaceChild(newSlot, slot);
    });

    const timeSlots = parentContainer.querySelectorAll('.timeslot.available');
    timeSlots.forEach(slot => {
      slot.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('Time slot clicked:', slot.dataset);
        
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

        // Store the selected lesson data with validation
        const instructorId = slot.dataset.instructorId;
        const day = slot.dataset.day;
        const time = slot.dataset.time;
        const length = slot.dataset.length;
        const instrument = slot.dataset.instrument;

        if (!instructorId || !day || !time || !length || !instrument) {
          console.error('Invalid time slot data:', slot.dataset);
          M.toast({ html: 'Invalid time slot data. Please try selecting again.' });
          return;
        }

        this.selectedLesson = {
          instructorId: instructorId,
          day: day,
          time: time,
          length: parseInt(length),
          instrument: instrument
        };

        console.log('Selected lesson stored:', this.selectedLesson);

        // Update the selection display
        this.#updateSelectionDisplay(slot);
      });
      
      slot.dataset.listenerAttached = 'true';
    });
    
    console.log(`Attached listeners to ${timeSlots.length} time slots`);
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

        // Show confirmation modal before proceeding
        const registrationData = this.#getCreateRegistrationData();
        const confirmationMessage = this.#buildPrivateLessonConfirmationMessage(registrationData);

        this.#showConfirmationModal(confirmationMessage, async () => {
          try {
            await this.sendDataFunction(registrationData);
            this.#clearForm();
            M.toast({ html: 'Registration created successfully!' });
          } catch (error) {
            console.error('Error creating registration:', error);
            M.toast({ html: `Error creating registration: ${error.message}` });
          }
        });
      });
    } else {
      console.warn('Parent submit button not found');
    }
  }

  /**
   * Attach event listener to group registration submit button
   */
  #attachGroupSubmitButtonListener() {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const groupSubmitButton = document.getElementById('parent-create-group-registration-btn');
    if (groupSubmitButton) {
      // Remove existing onclick if any
      groupSubmitButton.removeAttribute('onclick');

      groupSubmitButton.addEventListener('click', async (event) => {
        event.preventDefault();

        if (!this.#validateGroupRegistration()) {
          return;
        }

        // Show confirmation modal before proceeding
        const registrationData = this.#getCreateGroupRegistrationData();
        const confirmationMessage = this.#buildGroupClassConfirmationMessage(registrationData);

        this.#showConfirmationModal(confirmationMessage, async () => {
          try {
            await this.sendDataFunction(registrationData);
            this.#clearGroupForm();
            M.toast({ html: 'Group registration created successfully!' });
          } catch (error) {
            console.error('Error creating group registration:', error);
            M.toast({ html: `Error creating group registration: ${error.message}` });
          }
        });
      });
    } else {
      console.warn('Parent group submit button not found');
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
    // Note: selectedLesson is now handled in the click handler with validation
    
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
   * Check if a student has a time conflict with existing registrations
   * @param {string} studentId - Student ID to check
   * @param {string} day - Day name (e.g., 'Monday')
   * @param {string} startTime - Start time (e.g., '14:30')
   * @param {number} lengthMinutes - Lesson length in minutes
   * @returns {object} Conflict result with hasConflict boolean and conflictDetails
   */
  #checkStudentTimeConflict(studentId, day, startTime, lengthMinutes) {
    if (!studentId || !day || !startTime || !lengthMinutes) {
      console.warn('Invalid parameters for conflict check:', { studentId, day, startTime, lengthMinutes });
      return { hasConflict: false, conflictDetails: null };
    }

    // Convert start time to minutes since midnight
    const startMinutes = this.#parseTime(startTime);
    const endMinutes = startMinutes + lengthMinutes;

    console.log(`Checking time conflicts for student ${studentId} on ${day} from ${startTime} (${startMinutes}min) for ${lengthMinutes}min`);

    // Check against all existing registrations for this student
    const studentRegistrations = this.registrations.filter(reg => {
      const regStudentId = typeof reg.studentId === 'object' ? reg.studentId.value : reg.studentId;
      return regStudentId === studentId;
    });

    console.log(`Found ${studentRegistrations.length} existing registrations for student:`, studentRegistrations);

    for (const registration of studentRegistrations) {
      // Check day conflict
      const regDay = registration.day;
      if (regDay !== day) {
        continue; // Different day, no conflict
      }

      // Parse registration time and calculate end time
      const regStartTime = registration.startTime || registration.time;
      if (!regStartTime) {
        console.warn('Registration missing start time:', registration);
        continue;
      }

      const regStartMinutes = this.#parseTime(regStartTime);
      const regLengthMinutes = registration.length || registration.lengthMinutes || 30; // Default to 30 if not specified
      const regEndMinutes = regStartMinutes + regLengthMinutes;

      console.log(`Comparing with existing: ${regDay} ${regStartTime} (${regStartMinutes}-${regEndMinutes}min) vs new: ${day} ${startTime} (${startMinutes}-${endMinutes}min)`);

      // Check for time overlap
      const hasOverlap = (startMinutes < regEndMinutes) && (endMinutes > regStartMinutes);

      if (hasOverlap) {
        const conflictType = registration.registrationType || 'unknown';
        
        // Format the time properly for display
        const formattedStartTime = this.#formatTime(regStartTime);
        
        // Get instructor name from the instructor object if available
        let instructorName = 'Unknown';
        if (registration.instructor && registration.instructor.firstName && registration.instructor.lastName) {
          instructorName = `${registration.instructor.firstName} ${registration.instructor.lastName}`;
        } else if (registration.instructorName) {
          instructorName = registration.instructorName;
        }
        
        const conflictDetails = {
          type: conflictType,
          day: regDay,
          startTime: formattedStartTime,
          length: regLengthMinutes,
          className: registration.className || 'Unknown',
          instructorName: instructorName
        };

        console.log('Time conflict detected:', conflictDetails);
        return { hasConflict: true, conflictDetails };
      }
    }

    console.log('No time conflicts found');
    return { hasConflict: false, conflictDetails: null };
  }

  /**
   * Check if a student is already enrolled in a specific class
   * @param {string} studentId - Student ID to check
   * @param {string} classId - Class ID to check
   * @returns {boolean} True if student is already enrolled
   */
  #checkStudentClassDuplicate(studentId, classId) {
    if (!studentId || !classId) {
      return false;
    }

    const existingEnrollment = this.registrations.find(reg => {
      const regStudentId = typeof reg.studentId === 'object' ? reg.studentId.value : reg.studentId;
      const regClassId = typeof reg.classId === 'object' ? reg.classId.value : reg.classId;
      return regStudentId === studentId && regClassId === classId;
    });

    if (existingEnrollment) {
      console.log('Duplicate class enrollment detected:', existingEnrollment);
      return true;
    }

    return false;
  }

  /**
   * Check if Late Bus transportation is valid for the selected time
   * @param {string} day - Day of the week (e.g., 'Monday', 'Wednesday')
   * @param {string} startTime - Start time (e.g., '14:30')
   * @param {number} lengthMinutes - Duration in minutes
   * @param {string} transportationType - Selected transportation type
   * @returns {object} Validation result with isValid boolean and errorMessage
   */
  #validateBusTimeRestrictions(day, startTime, lengthMinutes, transportationType) {
    // Only validate if Late Bus is selected
    if (transportationType !== 'bus') {
      return { isValid: true, errorMessage: null };
    }

    // Parse start time and calculate end time
    const startMinutes = this.#parseTime(startTime);
    const endMinutes = startMinutes + lengthMinutes;

    // Convert end time back to time string for display (use 12-hour format)
    const endTimeHHMM = this.#formatTimeFromMinutes(endMinutes);
    const endTimeDisplay = this.#formatTime(endTimeHHMM);

    // Bus schedule restrictions
    const busDeadlines = {
      'Monday': '16:45',    // 4:45 PM
      'Tuesday': '16:45',   // 4:45 PM
      'Wednesday': '16:15', // 4:15 PM
      'Thursday': '16:45',  // 4:45 PM
      'Friday': '16:45'     // 4:45 PM
    };

    const deadlineTime = busDeadlines[day];
    if (!deadlineTime) {
      return { isValid: true, errorMessage: null }; // Unknown day, allow
    }

    const deadlineMinutes = this.#parseTime(deadlineTime);
    const deadlineDisplay = this.#formatTime(deadlineTime);

    if (endMinutes > deadlineMinutes) {
      const errorMessage = `Late Bus is not available for lessons ending after ${deadlineDisplay} on ${day}. This lesson ends at ${endTimeDisplay}. Please select "Late Pick Up" instead or choose a different time slot.`;
      return { isValid: false, errorMessage };
    }

    return { isValid: true, errorMessage: null };
  }

  /**
   * Validate registration data
   */
  #validateRegistration() {
    console.log('Validating registration...', { selectedLesson: this.selectedLesson });
    
    // Check if student is selected (only if dropdown is visible for multiple students)
    const studentSection = document.getElementById('parent-student-selection-section');
    const studentSelect = document.getElementById('parent-student-select');
    const studentId = studentSelect?.value;

    // Only validate student selection if the section is visible (multiple students)
    if (studentSection && studentSection.style.display !== 'none' && !studentId) {
      console.log('Validation failed: No student selected');
      M.toast({ html: 'Please select a student' });
      return false;
    }

    // For single student case, ensure there's still a student ID available
    if (!studentId) {
      console.log('Validation failed: No student ID available');
      M.toast({ html: 'No student available for registration' });
      return false;
    }

    if (!this.selectedLesson) {
      console.log('Validation failed: No lesson selected in memory, checking DOM for selected slots...');
      
      // Check if there's a selected time slot in the DOM as fallback
      const selectedSlots = document.querySelectorAll('.timeslot.selected');
      console.log('Current selected time slots in DOM:', selectedSlots);
      
      if (selectedSlots.length === 1) {
        // Try to rebuild selectedLesson from DOM state
        const slot = selectedSlots[0];
        const instructorId = slot.dataset.instructorId;
        const day = slot.dataset.day;
        const time = slot.dataset.time;
        const length = slot.dataset.length;
        const instrument = slot.dataset.instrument;
        
        if (instructorId && day && time && length && instrument) {
          console.log('Rebuilding selectedLesson from DOM state');
          this.selectedLesson = {
            instructorId: instructorId,
            day: day,
            time: time,
            length: parseInt(length),
            instrument: instrument
          };
          console.log('Rebuilt selectedLesson:', this.selectedLesson);
        } else {
          console.log('Selected slot in DOM has incomplete data');
          M.toast({ html: 'Please select a lesson time slot' });
          return false;
        }
      } else if (selectedSlots.length > 1) {
        console.log('Multiple slots selected, this should not happen');
        M.toast({ html: 'Multiple time slots selected. Please select only one.' });
        return false;
      } else {
        console.log('No selected time slots found in DOM either');
        M.toast({ html: 'Please select a lesson time slot' });
        return false;
      }
    }

    // Additional validation of selectedLesson data
    if (!this.selectedLesson.instructorId || !this.selectedLesson.day || !this.selectedLesson.time) {
      console.log('Validation failed: Incomplete lesson data', this.selectedLesson);
      M.toast({ html: 'Selected lesson is incomplete. Please select again.' });
      this.selectedLesson = null; // Clear invalid selection
      return false;
    }

    // Check for time conflicts with existing registrations
    const dayName = this.selectedLesson.day.charAt(0).toUpperCase() + this.selectedLesson.day.slice(1);
    const conflictCheck = this.#checkStudentTimeConflict(
      studentId,
      dayName,
      this.selectedLesson.time,
      this.selectedLesson.length
    );

    if (conflictCheck.hasConflict) {
      const conflict = conflictCheck.conflictDetails;
      const conflictMessage = conflict.type === 'GROUP' 
        ? `This lesson time conflicts with the student's existing class "${conflict.className}" on ${conflict.day} at ${conflict.startTime}.`
        : `This lesson time conflicts with the student's existing lesson on ${conflict.day} at ${conflict.startTime} with ${conflict.instructorName}.`;
      
      console.log('Validation failed: Time conflict detected', conflict);
      M.toast({ html: conflictMessage });
      return false;
    }

    // Check bus time restrictions for Late Bus transportation
    const transportationTypeRadio = document.querySelector('input[name="parent-transportation-type"]:checked');
    const transportationType = transportationTypeRadio?.value || 'pickup';
    
    const busValidation = this.#validateBusTimeRestrictions(
      dayName,
      this.selectedLesson.time,
      this.selectedLesson.length,
      transportationType
    );

    if (!busValidation.isValid) {
      console.log('Validation failed: Bus time restriction violated');
      M.toast({ html: busValidation.errorMessage });
      return false;
    }

    console.log('Validation passed');
    return true;
  }

  /**
   * Validate group registration data
   */
  #validateGroupRegistration() {
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

    // Check if class is selected
    const classSelect = document.getElementById('parent-class-select');
    const classId = classSelect?.value;

    if (!classId) {
      M.toast({ html: 'Please select a class' });
      return false;
    }

    // Check for duplicate class enrollment
    if (this.#checkStudentClassDuplicate(studentId, classId)) {
      M.toast({ html: 'Student is already enrolled in this class.' });
      return false;
    }

    // Check for time conflicts with existing registrations
    // First, get the class details to find the schedule
    const selectedClass = this.classes.find(cls => {
      const clsId = typeof cls.id === 'object' ? cls.id.value : cls.id;
      return clsId === classId;
    });

    if (selectedClass && selectedClass.day && selectedClass.startTime && selectedClass.length) {
      const conflictCheck = this.#checkStudentTimeConflict(
        studentId,
        selectedClass.day,
        selectedClass.startTime,
        selectedClass.length
      );

      if (conflictCheck.hasConflict) {
        const conflict = conflictCheck.conflictDetails;
        const conflictMessage = conflict.type === 'PRIVATE' 
          ? `This class time conflicts with the student's existing lesson on ${conflict.day} at ${conflict.startTime} with ${conflict.instructorName}.`
          : `This class time conflicts with the student's existing class "${conflict.className}" on ${conflict.day} at ${conflict.startTime}.`;
        
        console.log('Group validation failed: Time conflict detected', conflict);
        M.toast({ html: conflictMessage });
        return false;
      }

      // Check bus time restrictions for Late Bus transportation
      const transportationTypeRadio = document.querySelector('input[name="parent-group-transportation-type"]:checked');
      const transportationType = transportationTypeRadio?.value || 'pickup';
      
      const busValidation = this.#validateBusTimeRestrictions(
        selectedClass.day,
        selectedClass.startTime,
        selectedClass.length,
        transportationType
      );

      if (!busValidation.isValid) {
        console.log('Group validation failed: Bus time restriction violated');
        M.toast({ html: busValidation.errorMessage });
        return false;
      }
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

    // Get selected transportation type
    const transportationTypeRadio = document.querySelector('input[name="parent-transportation-type"]:checked');
    const transportationType = transportationTypeRadio?.value || 'pickup'; // Default to pickup if not selected

    // Get the current authenticated user's access code for audit purposes
    const accessCode = window.AccessCodeManager?.getStoredAccessCode() || null;

    const dayMap = {
      'monday': 'Monday',
      'tuesday': 'Tuesday',
      'wednesday': 'Wednesday',
      'thursday': 'Thursday',
      'friday': 'Friday'
    };

    return {
      studentId: studentId,
      registrationType: RegistrationType.PRIVATE,
      transportationType: transportationType,
      instructorId: this.selectedLesson.instructorId,
      instrument: this.selectedLesson.instrument,
      day: dayMap[this.selectedLesson.day],
      startTime: this.selectedLesson.time,
      length: this.selectedLesson.length,
      accessCode: accessCode || null, // Include access code for audit trail
    };
  }

  /**
   * Get group registration data for submission
   */
  #getCreateGroupRegistrationData() {
    // Get selected student ID
    const studentSelect = document.getElementById('parent-student-select');
    const studentId = studentSelect?.value;

    if (!studentId) {
      throw new Error('Please select a student');
    }

    // Get selected class ID
    const classSelect = document.getElementById('parent-class-select');
    const classId = classSelect?.value;

    if (!classId) {
      throw new Error('Please select a class');
    }

    // Find the selected class to get its details
    const selectedClass = this.classes.find(cls => cls.id === classId);

    if (!selectedClass) {
      throw new Error('Selected class not found');
    }

    // Get selected transportation type (for group registration)
    const transportationTypeRadio = document.querySelector('input[name="parent-group-transportation-type"]:checked');
    const transportationType = transportationTypeRadio?.value || 'pickup'; // Default to pickup if not selected

    // Get the current authenticated user's access code for audit purposes
    const accessCode = window.AccessCodeManager?.getStoredAccessCode() || null;

    return {
      studentId: studentId,
      registrationType: RegistrationType.GROUP,
      transportationType: transportationType,
      classId: classId,
      classTitle: selectedClass.formattedName || selectedClass.title || selectedClass.instrument || `Class ${selectedClass.id}`,
      instructorId: selectedClass.instructorId,
      day: selectedClass.day,
      startTime: selectedClass.startTime,
      length: selectedClass.length,
      instrument: selectedClass.instrument,
      accessCode: accessCode || null, // Include access code for audit trail
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

    // Reset transportation type to default (pickup)
    const pickupRadio = document.querySelector('input[name="parent-transportation-type"][value="pickup"]');
    if (pickupRadio) {
      pickupRadio.checked = true;
    }
    
    // Reset group transportation type to default (pickup) for consistency
    const groupPickupRadio = document.querySelector('input[name="parent-group-transportation-type"][value="pickup"]');
    if (groupPickupRadio) {
      groupPickupRadio.checked = true;
    }

    // Reset registration type selector using consistent utility
    DomHelpers.resetMaterializeSelect('parent-registration-type-select', true);

    // Hide all registration containers (private and group)
    this.#hideAllRegistrationContainers();

    // Clear any error messages
    this.#clearRegistrationError();
  }

  /**
   * Clear the group form after successful submission
   */
  #clearGroupForm() {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    // Clear selects using consistent utility
    DomHelpers.resetMaterializeSelects([
      'parent-class-select',
      'parent-registration-type-select'
    ], true);

    // Reset transportation type to default (pickup) for both forms
    const pickupRadio = document.querySelector('input[name="parent-transportation-type"][value="pickup"]');
    if (pickupRadio) {
      pickupRadio.checked = true;
    }
    
    // Reset group transportation type to default (pickup)
    const groupPickupRadio = document.querySelector('input[name="parent-group-transportation-type"][value="pickup"]');
    if (groupPickupRadio) {
      groupPickupRadio.checked = true;
    }

    // Hide all registration containers (private and group)
    this.#hideAllRegistrationContainers();

    // Clear any error messages
    this.#clearRegistrationError();

    // Disable register button again
    const registerButton = document.getElementById('parent-create-group-registration-btn');
    if (registerButton) {
      registerButton.disabled = true;
      registerButton.style.opacity = '0.6';
    }
  }

  /**
   * Show confirmation modal for parent registrations
   */
  #showConfirmationModal(message, onConfirm) {
    const modal = document.getElementById('parent-registration-confirmation-modal');
    const messageElement = document.getElementById('parent-confirmation-message');
    const confirmButton = document.getElementById('parent-confirmation-confirm');
    const cancelButton = document.getElementById('parent-confirmation-cancel');

    if (!modal || !messageElement || !confirmButton || !cancelButton) {
      console.warn('Confirmation modal elements not found');
      // If modal is not available, proceed directly
      onConfirm();
      return;
    }

    // Set the message
    messageElement.innerHTML = message;

    // Remove any existing event listeners
    const newConfirmButton = confirmButton.cloneNode(true);
    const newCancelButton = cancelButton.cloneNode(true);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);

    // Add event listeners
    newConfirmButton.addEventListener('click', () => {
      if (typeof M !== 'undefined') {
        M.Modal.getInstance(modal).close();
      }
      // Ensure scrolling is restored
      this.#restorePageScrolling();
      onConfirm();
    });

    newCancelButton.addEventListener('click', () => {
      if (typeof M !== 'undefined') {
        M.Modal.getInstance(modal).close();
      }
      // Ensure scrolling is restored
      this.#restorePageScrolling();
      // Do nothing on cancel
    });

    // Initialize and open modal
    if (typeof M !== 'undefined') {
      const modalInstance = M.Modal.init(modal, {
        dismissible: true,
        onCloseEnd: () => {
          // Clear message when modal closes and restore scrolling
          messageElement.innerHTML = '';
          this.#restorePageScrolling();
        }
      });

      // Attach keyboard handlers for this confirmation modal
      ModalKeyboardHandler.attachKeyboardHandlers(modal, {
        allowEscape: true,
        allowEnter: true,
        onConfirm: (event) => {
          // Handle Enter key press for confirmation
          console.log('Confirmation modal: Enter key pressed');
          newConfirmButton.click();
        },
        onCancel: (event) => {
          // Handle ESC key press for confirmation
          console.log('Confirmation modal: ESC key pressed');
          newCancelButton.click();
        }
      });

      modalInstance.open();
    }
  }

  /**
   * Ensure page scrolling is restored after modal operations
   */
  #restorePageScrolling() {
    // Remove any overflow restrictions that might prevent scrolling
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';

    // Remove any fixed positioning that might interfere
    document.body.style.position = '';

    // Ensure no modal overlay is blocking interactions
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay && modalOverlay.style.display !== 'none') {
      modalOverlay.style.display = 'none';
    }
  }

  /**
   * Build confirmation message for private lesson registration
   */
  #buildPrivateLessonConfirmationMessage(registrationData) {
    const studentSelect = document.getElementById('parent-student-select');
    const studentName = studentSelect?.selectedOptions[0]?.textContent || 'your child';

    // Find instructor name
    const instructor = this.instructors.find(inst => inst.id === registrationData.instructorId);
    const instructorName = instructor ? `${instructor.firstName} ${instructor.lastName}` : 'the instructor';

    // Format time
    const timeFormatted = this.#formatTime(registrationData.startTime);

    // Format transportation type
    const transportationDisplay = registrationData.transportationType === 'bus' ? 'Late Bus' : 'Late Pick Up';

    return `
      <strong>Are you sure you want to register ${studentName} for a private lesson?</strong>
      <br><br>
      <strong>Lesson Details:</strong><br>
      • <strong>Instructor:</strong> ${instructorName}<br>
      • <strong>Instrument:</strong> ${registrationData.instrument}<br>
      • <strong>Day:</strong> ${registrationData.day}<br>
      • <strong>Time:</strong> ${timeFormatted}<br>
      • <strong>Duration:</strong> ${registrationData.length} minutes<br>
      • <strong>Transportation:</strong> ${transportationDisplay}
      <br><br>
      <p>If you need to change or cancel this registration, please contact forte@mcds.org. The last day to cancel registrations without charge is August 29th. After this date, all registrations will be billed in full for the Fall Trimester.</p>
      
      <p><strong>Absence and Cancellation Policy:</strong></p>
      
      <p>Lessons missed due to student absence are charged in full except in the case of school-sponsored field trips or religious holidays. Sports practices or games are not considered school-sponsored activities.</p>
      
      <p>There will be no charge for lessons canceled by instructors unless the instructor schedules a make-up lesson at a later date.</p>
      
      <p>Instructors are encouraged to schedule make-up lessons for lessons they have missed; however, as they are working professionals in their fields, make-up lessons may not always be possible. The scheduling of make-up lessons will be at the instructor's discretion.</p>
      
      <p>Please notify your instructor at least 24 hours in advance of any student absence when possible. Instructor contact details will be emailed shortly after your child's first lesson. Additionally, notify FORTE staff of student absences at forte@mcds.org.</p>
      
      <p>Instructor cancellations will be communicated to parents/guardians via phone or email at least 24 hours in advance whenever possible. Same-day cancellations by instructors will result in no charge for PM care.</p>
      
      <p><strong>By clicking "Confirm Registration," you confirm your child's registration for the Fall Trimester in the FORTE program and acknowledge that you have read and agree to these terms and conditions.</strong></p>
    `;
  }

  /**
   * Build confirmation message for group class registration
   */
  #buildGroupClassConfirmationMessage(registrationData) {
    const studentSelect = document.getElementById('parent-student-select');
    const studentName = studentSelect?.selectedOptions[0]?.textContent || 'your child';

    // Find class details
    const selectedClass = this.classes.find(cls => cls.id === registrationData.classId);
    const className = selectedClass ? formatClassNameWithGradeCorrection(selectedClass) : 'the class';

    // Find instructor name
    const instructor = this.instructors.find(inst => inst.id === registrationData.instructorId);
    const instructorName = instructor ? `${instructor.firstName} ${instructor.lastName}` : 'the instructor';

    // Format transportation type
    const transportationDisplay = registrationData.transportationType === 'bus' ? 'Late Bus' : 'Late Pick Up';

    return `
      <strong>Are you sure you want to register ${studentName} for this group class?</strong>
      <br><br>
      <strong>Class Details:</strong><br>
      • <strong>Class:</strong> ${className}<br>
      • <strong>Instructor:</strong> ${instructorName}<br>
      • <strong>Day:</strong> ${registrationData.day}<br>
      • <strong>Time:</strong> ${registrationData.startTime}<br>
      • <strong>Duration:</strong> ${registrationData.length} minutes<br>
      • <strong>Transportation:</strong> ${transportationDisplay}
      <br><br>
      <p>If you need to change or cancel this registration, please contact forte@mcds.org. The last day to cancel registrations without charge is August 29th. After this date, all registrations will be billed in full for the Fall Trimester.</p>
      
      <p><strong>Absence and Cancellation Policy:</strong></p>
      
      <p>Lessons missed due to student absence are charged in full except in the case of school-sponsored field trips or religious holidays. Sports practices or games are not considered school-sponsored activities.</p>
      
      <p>There will be no charge for lessons canceled by instructors unless the instructor schedules a make-up lesson at a later date.</p>
      
      <p>Instructors are encouraged to schedule make-up lessons for lessons they have missed; however, as they are working professionals in their fields, make-up lessons may not always be possible. The scheduling of make-up lessons will be at the instructor's discretion.</p>
      
      <p>Please notify your instructor at least 24 hours in advance of any student absence when possible. Instructor contact details will be emailed shortly after your child's first lesson. Additionally, notify FORTE staff of student absences at forte@mcds.org.</p>
      
      <p>Instructor cancellations will be communicated to parents/guardians via phone or email at least 24 hours in advance whenever possible. Same-day cancellations by instructors will result in no charge for PM care.</p>
      
      <p><strong>By confirming, you acknowledge that you have read and agree to these terms and conditions.</strong></p>
    `;
  }

  /**
   * Public method to clear the form selection (can be called externally)
   */
  clearSelection() {
    this.#clearTimeSlotSelection();
  }

  /**
   * Clear only the time slot selection without hiding containers
   */
  #clearTimeSlotSelection() {
    this.selectedLesson = null;

    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    // Hide the selected lesson display
    const selectedDisplay = parentContainer.querySelector('#admin-selected-lesson-display');
    if (selectedDisplay) {
      selectedDisplay.style.display = 'none';
      selectedDisplay.style.pointerEvents = 'none';
    }

    // Reset transportation type to default (pickup) when clearing selection
    const pickupRadio = document.querySelector('input[name="parent-transportation-type"][value="pickup"]');
    if (pickupRadio) {
      pickupRadio.checked = true;
    }
    
    // Reset group transportation type to default (pickup) for consistency
    const groupPickupRadio = document.querySelector('input[name="parent-group-transportation-type"][value="pickup"]');
    if (groupPickupRadio) {
      groupPickupRadio.checked = true;
    }

    // Remove selected class and reset styling for all time slots
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

    // Clear any error messages
    this.#clearRegistrationError();
  }

  /**
   * Attach keyboard handlers for time slot interface
   */
  #attachTimeSlotKeyboardHandlers() {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) {
      console.warn('Parent registration container not found for keyboard handlers');
      return;
    }

    // Attach keyboard handlers for time slot selection
    ModalKeyboardHandler.attachTimeSlotKeyboardHandlers(parentContainer, {
      onConfirm: (event, selectedSlot) => {
        console.log('Time slot keyboard: Enter pressed on selected slot');
        // Try to submit the registration if a slot is selected
        const submitButton = document.getElementById('parent-confirm-registration-btn');
        if (submitButton && !submitButton.disabled && this.selectedLesson) {
          submitButton.click();
        }
      },
      onCancel: (event) => {
        console.log('Time slot keyboard: ESC pressed, clearing selection');
        // Clear time slot selection
        this.#clearTimeSlotSelection();
        // Also clear the selected lesson data
        this.selectedLesson = null;
        // Disable submit button since no lesson is selected
        const submitButton = document.getElementById('parent-confirm-registration-btn');
        if (submitButton) {
          submitButton.disabled = true;
        }
      }
    });

    console.log('Time slot keyboard handlers attached');
  }
}
