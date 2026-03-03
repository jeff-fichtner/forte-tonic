/**
 * Cascading Filter Chips — extracted from ParentRegistrationForm
 *
 * Manages the cascading instrument → day → length → instructor filter chip UI,
 * the instructor time-slot grid, and time-slot selection state. Communicates the
 * selected time slot to the parent form via the `onTimeSlotSelected` callback.
 */

import { TransportationType } from '/utils/values/transportationType.js';
import { createFilterChip, createInstructorCard } from './registrationFormElements.js';
import {
  isInstructorGradeEligible,
  calculateCascadingAvailability,
  generateInstructorTimeSlots,
  filterByInstrument,
} from '../../utilities/registrationForm/availabilityEngine.js';
import { formatDisplayTime } from '../../utilities/registrationForm/timeHelpers.js';
import { ModalKeyboardHandler } from '../../utilities/modalKeyboardHandler.js';
import type {
  InstructorLike,
  StudentLike,
  RegistrationLike,
  TimeSlot,
} from '../../types/registrationTypes.js';

// ---------------------------------------------------------------------------
// Public config interface
// ---------------------------------------------------------------------------

export interface CascadingFilterChipsConfig {
  instructors: InstructorLike[];
  registrations: RegistrationLike[];
  nextTrimesterRegistrations: RegistrationLike[];
  selectedPreviousRegistrationId: string | null;
  isEnrollmentPeriod: boolean;
  onTimeSlotSelected: (slot: TimeSlot | null) => void;
  parentChildren: StudentLike[];
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class CascadingFilterChips {
  // Data arrays (mutable via updateData)
  #instructors: InstructorLike[];
  #registrations: RegistrationLike[];
  #nextTrimesterRegistrations: RegistrationLike[];
  #selectedPreviousRegistrationId: string | null;
  #isEnrollmentPeriod: boolean;
  #onTimeSlotSelected: (slot: TimeSlot | null) => void;
  #parentChildren: StudentLike[];

  // Internal selection state
  #selectedLesson: TimeSlot | null = null;
  #regenerateTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor(config: CascadingFilterChipsConfig) {
    this.#instructors = config.instructors;
    this.#registrations = config.registrations;
    this.#nextTrimesterRegistrations = config.nextTrimesterRegistrations;
    this.#selectedPreviousRegistrationId = config.selectedPreviousRegistrationId;
    this.#isEnrollmentPeriod = config.isEnrollmentPeriod;
    this.#onTimeSlotSelected = config.onTimeSlotSelected;
    this.#parentChildren = config.parentChildren;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Generate initial chips, time slots, and attach listeners. */
  initialize(): void {
    this.#generateInstrumentChips();
    this.#generateDayChips();
    this.#generateLengthChips();
    this.#generateInstructorChips();
    this.#generateTimeSlots();
    this.#attachFilterChipListeners();
    this.#attachTimeSlotListeners();
    this.#attachTimeSlotKeyboardHandlers();
  }

  /** Patch one or more config properties and refresh the UI. */
  updateData(config: Partial<CascadingFilterChipsConfig>): void {
    if (config.instructors !== undefined) this.#instructors = config.instructors;
    if (config.registrations !== undefined) this.#registrations = config.registrations;
    if (config.nextTrimesterRegistrations !== undefined)
      this.#nextTrimesterRegistrations = config.nextTrimesterRegistrations;
    if (config.selectedPreviousRegistrationId !== undefined)
      this.#selectedPreviousRegistrationId = config.selectedPreviousRegistrationId;
    if (config.isEnrollmentPeriod !== undefined)
      this.#isEnrollmentPeriod = config.isEnrollmentPeriod;
    if (config.onTimeSlotSelected !== undefined)
      this.#onTimeSlotSelected = config.onTimeSlotSelected;
    if (config.parentChildren !== undefined) this.#parentChildren = config.parentChildren;
  }

  /** Return the currently selected time slot, or null. */
  getSelectedTimeSlot(): TimeSlot | null {
    return this.#selectedLesson;
  }

  /** Clear filter selections and the time slot selection. */
  clearSelection(): void {
    this.#clearTimeSlotSelection();
    this.#resetFilterChips();
  }

  /** Regenerate all chips and time slots (e.g. when student changes). */
  refreshChips(): void {
    this.#generateInstrumentChips();
    this.#generateDayChips();
    this.#generateLengthChips();
    this.#generateInstructorChips();
    this.#generateTimeSlots();
    this.#attachFilterChipListeners();
    this.#attachTimeSlotListeners();
  }

  /** Cleanup: cancel pending timeouts. */
  destroy(): void {
    clearTimeout(this.#regenerateTimeout);
  }

  // -----------------------------------------------------------------------
  // DOM helpers
  // -----------------------------------------------------------------------

  /**
   * Read the currently-selected student grade from the DOM.
   * Returns a numeric grade (0-8) or null.
   */
  #getSelectedStudentGrade(): number | null {
    const studentSelect = document.getElementById(
      'parent-student-select'
    ) as HTMLSelectElement | null;
    const selectedStudentId = studentSelect?.value;
    if (!selectedStudentId) return null;

    const selectedStudent = this.#parentChildren.find((s: StudentLike) => {
      const studentId = s.id;
      return studentId && studentId.toString() === selectedStudentId.toString();
    });

    const grade = selectedStudent?.grade;
    if (grade === null || grade === undefined) return null;
    return typeof grade === 'number' ? grade : Number(grade);
  }

  // -----------------------------------------------------------------------
  // Chip generation
  // -----------------------------------------------------------------------

  #generateInstrumentChips(): void {
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
    const selectedInstrument = (
      parentContainer.querySelector('.instrument-chip.active') as HTMLElement | null
    )?.dataset.value;

    // Calculate availability for each instrument (no upstream filters — top of cascade)
    const instrumentAvailabilityMap = calculateCascadingAvailability(
      'instrument',
      this.#instructors,
      this.#registrations,
      this.#nextTrimesterRegistrations,
      this.#getSelectedStudentGrade(),
      this.#selectedPreviousRegistrationId,
      this.#isEnrollmentPeriod,
      {}
    );
    let totalSlots = 0;
    instrumentAvailabilityMap.forEach(v => {
      totalSlots += v.available;
    });

    // Create "All Instruments" chip
    const isAllDefault = !selectedInstrument || selectedInstrument === 'all';
    const allChip = createFilterChip(
      'instrument',
      'all',
      `All Instruments (${totalSlots} slots)`,
      isAllDefault,
      'available'
    );
    instrumentContainer.appendChild(allChip);

    // Create individual instrument chips
    const uniqueInstruments = Array.from(instrumentAvailabilityMap.keys()).sort();
    uniqueInstruments.forEach(instrument => {
      const slots = instrumentAvailabilityMap.get(instrument)?.available || 0;
      const chipText = `${instrument} (${slots} slots)`;
      const availability = slots > 3 ? 'available' : slots > 0 ? 'limited' : 'unavailable';
      const chip = createFilterChip('instrument', instrument, chipText, false, availability);
      instrumentContainer.appendChild(chip);
    });
  }

  #generateDayChips(): void {
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

    // Get current filter context — only consider upstream filters (instrument)
    const selectedInstrument = (
      parentContainer.querySelector('.instrument-chip.active') as HTMLElement | null
    )?.dataset.value;
    const selectedDay = (parentContainer.querySelector('.day-chip.active') as HTMLElement | null)
      ?.dataset.value;

    const dayAvailabilityMap = calculateCascadingAvailability(
      'day',
      this.#instructors,
      this.#registrations,
      this.#nextTrimesterRegistrations,
      this.#getSelectedStudentGrade(),
      this.#selectedPreviousRegistrationId,
      this.#isEnrollmentPeriod,
      { instrument: selectedInstrument }
    );
    let totalSlots = 0;
    dayAvailabilityMap.forEach(v => {
      totalSlots += v.available;
    });

    const isAllDefault = !selectedDay || selectedDay === 'all';
    const allChip = createFilterChip(
      'day',
      'all',
      `All Days (${totalSlots} slots)`,
      isAllDefault,
      'available'
    );
    dayContainer.appendChild(allChip);

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    days.forEach((day, index) => {
      const slots = dayAvailabilityMap.get(day)?.available || 0;
      const chipText = `${dayNames[index]} (${slots} slots)`;
      const availability = slots > 3 ? 'available' : slots > 0 ? 'limited' : 'unavailable';
      const chip = createFilterChip('day', day, chipText, false, availability);
      dayContainer.appendChild(chip);
    });
  }

  #generateLengthChips(): void {
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

    // Get current filter context — only consider upstream filters (instrument and day)
    const selectedInstrument = (
      parentContainer.querySelector('.instrument-chip.active') as HTMLElement | null
    )?.dataset.value;
    const selectedDay = (parentContainer.querySelector('.day-chip.active') as HTMLElement | null)
      ?.dataset.value;
    const selectedLength = (
      parentContainer.querySelector('.length-chip.active') as HTMLElement | null
    )?.dataset.value;

    const lengthAvailabilityMap = calculateCascadingAvailability(
      'length',
      this.#instructors,
      this.#registrations,
      this.#nextTrimesterRegistrations,
      this.#getSelectedStudentGrade(),
      this.#selectedPreviousRegistrationId,
      this.#isEnrollmentPeriod,
      { instrument: selectedInstrument, day: selectedDay }
    );

    let totalSlots = 0;
    lengthAvailabilityMap.forEach(v => {
      totalSlots += v.available;
    });

    const isAllDefault = !selectedLength || selectedLength === 'all';
    const allChip = createFilterChip(
      'length',
      'all',
      `All Lengths (${totalSlots} slots)`,
      isAllDefault,
      'available'
    );
    lengthContainer.appendChild(allChip);

    const standardLengths = [30, 45, 60];
    standardLengths.forEach(length => {
      const slots = lengthAvailabilityMap.get(String(length))?.available || 0;
      const chipText = `${length} min (${slots} slots)`;
      const availability = slots > 3 ? 'available' : slots > 0 ? 'limited' : 'unavailable';
      const chip = createFilterChip('length', length.toString(), chipText, false, availability);
      lengthContainer.appendChild(chip);
    });
  }

  #generateInstructorChips(): void {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const instructorSection = Array.from(parentContainer.querySelectorAll('.filter-section')).find(
      section => {
        const label = section.querySelector('label');
        return label && label.textContent!.includes('Instructors');
      }
    );

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

    // Get current filter context — only consider upstream filters (instrument, day, length)
    const selectedInstrument = (
      parentContainer.querySelector('.instrument-chip.active') as HTMLElement | null
    )?.dataset.value;
    const selectedDay = (parentContainer.querySelector('.day-chip.active') as HTMLElement | null)
      ?.dataset.value;
    const selectedLength = (
      parentContainer.querySelector('.length-chip.active') as HTMLElement | null
    )?.dataset.value;
    const selectedInstructor = (
      parentContainer.querySelector('.instructor-chip.active') as HTMLElement | null
    )?.dataset.value;

    const instructorAvailabilityMap = calculateCascadingAvailability(
      'instructor',
      this.#instructors,
      this.#registrations,
      this.#nextTrimesterRegistrations,
      this.#getSelectedStudentGrade(),
      this.#selectedPreviousRegistrationId,
      this.#isEnrollmentPeriod,
      {
        instrument: selectedInstrument,
        day: selectedDay,
        length: selectedLength ? parseInt(selectedLength) : undefined,
      }
    );
    let totalSlots = 0;
    instructorAvailabilityMap.forEach(v => {
      totalSlots += v.available;
    });

    // Create "All Instructors" chip
    const isAllDefault = !selectedInstructor || selectedInstructor === 'all';
    const allChip = createFilterChip(
      'instructor',
      'all',
      `All Instructors (${totalSlots} slots)`,
      isAllDefault,
      'available'
    );
    instructorContainer.appendChild(allChip);

    // Create individual instructor chips (filtered by student grade)
    const studentGrade = this.#getSelectedStudentGrade();
    const eligibleInstructors = this.#instructors.filter((instructor: InstructorLike) =>
      isInstructorGradeEligible(instructor, studentGrade)
    );

    eligibleInstructors.forEach((instructor: InstructorLike) => {
      const slots = instructorAvailabilityMap.get(instructor.id)?.available || 0;
      const chipText = `${instructor.firstName} ${instructor.lastName} (${slots} slots)`;
      const availability = slots > 3 ? 'available' : slots > 0 ? 'limited' : 'unavailable';
      const chip = createFilterChip('instructor', instructor.id, chipText, false, availability);
      instructorContainer.appendChild(chip);
    });
  }

  // -----------------------------------------------------------------------
  // Time slot generation
  // -----------------------------------------------------------------------

  #generateTimeSlots(): void {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const timeslotGrid = parentContainer.querySelector('.instructor-timeslot-grid');
    if (!timeslotGrid) return;

    // Clear existing instructor cards
    const existingCards = timeslotGrid.querySelectorAll('.instructor-card');
    existingCards.forEach(card => card.remove());

    // Filter instructors by student grade eligibility
    const studentGrade = this.#getSelectedStudentGrade();
    const eligibleInstructors = this.#instructors.filter((instructor: InstructorLike) =>
      isInstructorGradeEligible(instructor, studentGrade)
    );

    // Generate cards for each eligible instructor
    eligibleInstructors.forEach((instructor: InstructorLike) => {
      const timeSlots = generateInstructorTimeSlots(
        instructor,
        this.#registrations,
        this.#nextTrimesterRegistrations,
        this.#selectedPreviousRegistrationId,
        this.#isEnrollmentPeriod
      );
      if (timeSlots.length > 0) {
        const card = createInstructorCard(instructor, timeSlots);
        timeslotGrid.appendChild(card);
      }
    });

    // Attach listeners after generating
    this.#attachTimeSlotListeners();
  }

  // -----------------------------------------------------------------------
  // Filter state management
  // -----------------------------------------------------------------------

  #attachFilterChipListeners(): void {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const chips = parentContainer.querySelectorAll(
      '.chip:not(.unavailable):not([data-listener-attached])'
    );
    chips.forEach((_chip: Element) => {
      const chip = _chip as HTMLElement;
      chip.addEventListener('click', () => {
        const chipType = chip.dataset.type;

        // Clear downstream selections when upstream chip is clicked (cascading)
        this.#clearDownstreamSelections(chipType);

        // Handle chip selection logic
        const siblings = chip.parentElement!.querySelectorAll('.chip');
        siblings.forEach((_sibling: Element) => {
          const sibling = _sibling as HTMLElement;
          sibling.classList.remove('active', 'selected');
          if (!sibling.classList.contains('unavailable')) {
            const isAvailable = sibling.classList.contains('available');
            const isLimited = sibling.classList.contains('limited');
            sibling.style.background = isAvailable ? '#e8f5e8' : isLimited ? '#fff3e0' : '#ffebee';
            sibling.style.color = 'inherit';
            sibling.style.border = isAvailable
              ? '2px solid #4caf50'
              : isLimited
                ? '2px solid #ff9800'
                : '2px solid #f44336';
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
        clearTimeout(this.#regenerateTimeout);
        this.#regenerateTimeout = setTimeout(() => {
          this.#regenerateFilteredTimeSlots();
          this.#filterTimeSlots();
        }, 50);
      });
      chip.dataset.listenerAttached = 'true';
    });
  }

  #clearDownstreamSelections(chipType: string | undefined): void {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const cascade = ['instrument', 'day', 'length', 'instructor'];
    const currentIndex = cascade.indexOf(chipType || '');

    for (let i = currentIndex + 1; i < cascade.length; i++) {
      const downstreamType = cascade[i];
      const downstreamChips = parentContainer.querySelectorAll(`.${downstreamType}-chip.active`);
      downstreamChips.forEach((_chip: Element) => {
        const chip = _chip as HTMLElement;
        chip.classList.remove('active', 'selected');
        const isAvailable = chip.classList.contains('available');
        const isLimited = chip.classList.contains('limited');
        chip.style.background = isAvailable ? '#e8f5e8' : isLimited ? '#fff3e0' : '#ffebee';
        chip.style.color = 'inherit';
        chip.style.border = isAvailable
          ? '2px solid #4caf50'
          : isLimited
            ? '2px solid #ff9800'
            : '2px solid #f44336';
      });

      // Activate the "All" chip for downstream categories
      const allChip = parentContainer.querySelector(
        `.${downstreamType}-chip[data-value="all"]`
      ) as HTMLElement | null;
      if (allChip && !allChip.classList.contains('unavailable')) {
        allChip.classList.add('active', 'selected');
        allChip.style.background = '#2b68a4';
        allChip.style.color = 'white';
        allChip.style.border = '2px solid #2b68a4';
      }
    }
  }

  #updateCascadingChips(changedChipType: string | undefined): void {
    const cascade = ['instrument', 'day', 'length', 'instructor'];
    const currentIndex = cascade.indexOf(changedChipType || '');

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

  #filterTimeSlots(): void {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const selectedInstructor =
      (parentContainer.querySelector('.instructor-chip.active') as HTMLElement | null)?.dataset
        .value || 'all';
    const selectedDay =
      (parentContainer.querySelector('.day-chip.active') as HTMLElement | null)?.dataset.value ||
      'all';
    const selectedLength =
      (parentContainer.querySelector('.length-chip.active') as HTMLElement | null)?.dataset.value ||
      'all';
    const selectedInstrument =
      (parentContainer.querySelector('.instrument-chip.active') as HTMLElement | null)?.dataset
        .value || 'all';

    const timeSlots = parentContainer.querySelectorAll('.timeslot');

    timeSlots.forEach((_slot: Element) => {
      const slot = _slot as HTMLElement;
      let show = true;

      if (selectedInstructor !== 'all' && slot.dataset.instructorId !== selectedInstructor)
        show = false;
      if (selectedDay !== 'all' && slot.dataset.day !== selectedDay) show = false;
      if (selectedLength !== 'all' && slot.dataset.length !== selectedLength) show = false;
      if (selectedInstrument !== 'all' && slot.dataset.instrument !== selectedInstrument)
        show = false;

      slot.style.display = show ? 'block' : 'none';
    });

    this.#updateInstructorCardVisibility();
  }

  #regenerateFilteredTimeSlots(): void {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const timeslotGrid = parentContainer.querySelector('.instructor-timeslot-grid');
    if (!timeslotGrid) return;

    // Store current selection before regenerating
    const currentSelection = this.#selectedLesson;
    console.log('Regenerating slots, preserving selection:', currentSelection);

    // Get current filter selections
    const selectedInstructor =
      (parentContainer.querySelector('.instructor-chip.active') as HTMLElement | null)?.dataset
        .value || 'all';
    const selectedDay =
      (parentContainer.querySelector('.day-chip.active') as HTMLElement | null)?.dataset.value ||
      'all';
    const selectedInstrument =
      (parentContainer.querySelector('.instrument-chip.active') as HTMLElement | null)?.dataset
        .value || 'all';
    const selectedLength =
      (parentContainer.querySelector('.length-chip.active') as HTMLElement | null)?.dataset.value ||
      'all';

    // Clear existing instructor cards
    const existingCards = timeslotGrid.querySelectorAll('.instructor-card');
    existingCards.forEach(card => card.remove());

    // Determine which instructors to include (filter by student grade first)
    const studentGrade = this.#getSelectedStudentGrade();
    let instructorsToInclude = this.#instructors.filter(inst =>
      isInstructorGradeEligible(inst, studentGrade)
    );

    // Filter by selected instructor
    if (selectedInstructor !== 'all') {
      instructorsToInclude = instructorsToInclude.filter(i => i.id === selectedInstructor);
    }

    // Filter by selected instrument (using shared engine function)
    if (selectedInstrument !== 'all') {
      instructorsToInclude = filterByInstrument(instructorsToInclude, selectedInstrument);
    }

    // Generate cards for filtered instructors using the canonical engine function
    instructorsToInclude.forEach((instructor: InstructorLike) => {
      let timeSlots = generateInstructorTimeSlots(
        instructor,
        this.#registrations,
        this.#nextTrimesterRegistrations,
        this.#selectedPreviousRegistrationId,
        this.#isEnrollmentPeriod
      );

      // Apply cascading filter selections
      if (selectedDay !== 'all') timeSlots = timeSlots.filter(s => s.day === selectedDay);
      if (selectedInstrument !== 'all')
        timeSlots = timeSlots.filter(s => s.instrument === selectedInstrument);
      if (selectedLength !== 'all')
        timeSlots = timeSlots.filter(s => s.length === parseInt(selectedLength));

      if (timeSlots.length > 0) {
        const card = createInstructorCard(instructor, timeSlots);
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

  // -----------------------------------------------------------------------
  // Time slot listeners and selection
  // -----------------------------------------------------------------------

  #attachTimeSlotListeners(): void {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    // Remove existing listeners first to prevent duplicates
    const existingSlots = parentContainer.querySelectorAll('.timeslot[data-listener-attached]');
    existingSlots.forEach(slot => {
      slot.removeAttribute('data-listener-attached');
      const newSlot = slot.cloneNode(true);
      slot.parentNode!.replaceChild(newSlot, slot);
    });

    const timeSlots = parentContainer.querySelectorAll('.timeslot.available');
    timeSlots.forEach((_slot: Element) => {
      const slot = _slot as HTMLElement;
      slot.addEventListener('click', (event: Event) => {
        event.preventDefault();
        event.stopPropagation();

        console.log('Time slot clicked:', slot.dataset);

        // Remove previous selection and reset styling for all slots
        parentContainer.querySelectorAll('.timeslot').forEach((_s: Element) => {
          const s = _s as HTMLElement;
          s.classList.remove('selected');
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

        this.#selectedLesson = {
          instructorId: instructorId,
          day: day,
          time: time,
          length: parseInt(length),
          instrument: instrument,
        };

        console.log('Selected lesson stored:', this.#selectedLesson);

        // Update the selection display
        this.#updateSelectionDisplay(slot);

        // Notify the parent form
        this.#onTimeSlotSelected(this.#selectedLesson);
      });

      slot.dataset.listenerAttached = 'true';
    });
  }

  #restoreTimeSlotSelection(selectionData: TimeSlot): void {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer || !selectionData) return;

    const matchingSlot = parentContainer.querySelector(
      `.timeslot[data-instructor-id="${selectionData.instructorId}"][data-day="${selectionData.day}"][data-time="${selectionData.time}"][data-length="${selectionData.length}"][data-instrument="${selectionData.instrument}"]`
    ) as HTMLElement | null;

    if (matchingSlot) {
      matchingSlot.classList.add('selected');
      matchingSlot.style.border = '3px solid #1976d2';
      matchingSlot.style.background = '#e3f2fd';

      this.#selectedLesson = selectionData;
      this.#updateSelectionDisplay(matchingSlot);

      // Notify the parent form
      this.#onTimeSlotSelected(this.#selectedLesson);

      console.log('Time slot selection restored:', selectionData);
    } else {
      console.log(
        'Could not restore time slot selection - slot no longer available:',
        selectionData
      );
      const stillAvailableSlot = document.querySelector(
        `.timeslot[data-instructor-id="${selectionData.instructorId}"][data-day="${selectionData.day}"][data-time="${selectionData.time}"][data-length="${selectionData.length}"][data-instrument="${selectionData.instrument}"]`
      ) as HTMLElement | null;

      if (!stillAvailableSlot) {
        console.log('Confirmed: slot no longer exists in DOM, clearing selection');
        this.#selectedLesson = null;
        this.#onTimeSlotSelected(null);
      } else {
        console.log('Slot still exists in DOM, keeping selection but re-selecting it');
        stillAvailableSlot.classList.add('selected');
        stillAvailableSlot.style.border = '3px solid #1976d2';
        stillAvailableSlot.style.background = '#e3f2fd';
        this.#updateSelectionDisplay(stillAvailableSlot);
      }
    }
  }

  #updateInstructorCardVisibility(): void {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const instructorCards = parentContainer.querySelectorAll('.instructor-card');

    instructorCards.forEach((_card: Element) => {
      const card = _card as HTMLElement;
      const visibleSlots = card.querySelectorAll(
        '.timeslot[style*="display: block"], .timeslot:not([style*="display: none"])'
      );
      const availableCount = visibleSlots.length;

      const availabilitySpan = card.querySelector('h6 span') as HTMLElement | null;
      if (availabilitySpan) {
        availabilitySpan.textContent = `${availableCount} available`;
        availabilitySpan.style.background =
          availableCount > 3 ? '#e8f5e8' : availableCount > 0 ? '#fff3e0' : '#ffebee';
        availabilitySpan.style.color =
          availableCount > 3 ? '#4caf50' : availableCount > 0 ? '#ff9800' : '#f44336';
      }

      card.style.display = availableCount > 0 ? 'block' : 'none';
    });
  }

  #updateSelectionDisplay(slot: HTMLElement): void {
    const parentContainer = document.getElementById('parent-registration');
    const selectionDisplay = parentContainer?.querySelector(
      '#admin-selected-lesson-display'
    ) as HTMLElement | null;
    if (selectionDisplay) {
      const instructor = slot.dataset.instructorId;
      const dayName =
        (slot.dataset.day || '').charAt(0).toUpperCase() + (slot.dataset.day || '').slice(1);
      const timeFormatted = formatDisplayTime(slot.dataset.time || '');
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
      selectionDisplay.style.pointerEvents = 'none';

      const innerContainer = selectionDisplay.querySelector('div') as HTMLElement | null;
      if (innerContainer) {
        innerContainer.style.pointerEvents = 'auto';
      }
    }
  }

  #attachTimeSlotKeyboardHandlers(): void {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) {
      console.warn('Parent registration container not found for keyboard handlers');
      return;
    }

    ModalKeyboardHandler.attachTimeSlotKeyboardHandlers(parentContainer, {
      onConfirm: (_event: KeyboardEvent, _selectedSlot: Element) => {
        console.log('Time slot keyboard: Enter pressed on selected slot');
        const submitButton = document.getElementById(
          'parent-confirm-registration-btn'
        ) as HTMLButtonElement | null;
        if (submitButton && !submitButton.disabled && this.#selectedLesson) {
          submitButton.click();
        }
      },
      onCancel: (_event: KeyboardEvent) => {
        console.log('Time slot keyboard: ESC pressed, clearing selection');
        this.#clearTimeSlotSelection();
        this.#onTimeSlotSelected(null);
        const submitButton = document.getElementById(
          'parent-confirm-registration-btn'
        ) as HTMLButtonElement | null;
        if (submitButton) {
          submitButton.disabled = true;
        }
      },
    });
  }

  #resetFilterChips(): void {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const allChips = parentContainer.querySelectorAll('.chip');
    allChips.forEach((_chip: Element) => {
      const chip = _chip as HTMLElement;
      chip.classList.remove('active');
      chip.style.cssText =
        'padding: 8px 12px; border-radius: 16px; display: flex; align-items: center; border: 2px solid #ddd; background: #f5f5f5; color: #666; transition: all 0.3s; cursor: pointer;';
    });

    const allInstrumentChip = parentContainer.querySelector(
      '.instrument-chip[data-value="all"]'
    ) as HTMLElement | null;
    const allDayChip = parentContainer.querySelector(
      '.day-chip[data-value="all"]'
    ) as HTMLElement | null;
    const allLengthChip = parentContainer.querySelector(
      '.length-chip[data-value="all"]'
    ) as HTMLElement | null;
    const allInstructorChip = parentContainer.querySelector(
      '.instructor-chip[data-value="all"]'
    ) as HTMLElement | null;

    [allInstrumentChip, allDayChip, allLengthChip, allInstructorChip].forEach(chip => {
      if (chip) {
        chip.classList.add('active');
        chip.style.cssText =
          'padding: 8px 12px; border-radius: 16px; display: flex; align-items: center; border: 2px solid #2b68a4; background: #2b68a4; color: white; transition: all 0.3s; cursor: pointer;';
      }
    });
  }

  #clearTimeSlotSelection(): void {
    this.#selectedLesson = null;

    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const selectedDisplay = parentContainer.querySelector(
      '#admin-selected-lesson-display'
    ) as HTMLElement | null;
    if (selectedDisplay) {
      selectedDisplay.style.display = 'none';
      selectedDisplay.style.pointerEvents = 'none';
    }

    // Reset transportation type to default (pickup) when clearing selection
    const pickupRadio = document.querySelector(
      `input[name="parent-transportation-type"][value="${TransportationType.PICKUP}"]`
    ) as HTMLInputElement | null;
    if (pickupRadio) {
      pickupRadio.checked = true;
    }

    const groupPickupRadio = document.querySelector(
      `input[name="parent-group-transportation-type"][value="${TransportationType.PICKUP}"]`
    ) as HTMLInputElement | null;
    if (groupPickupRadio) {
      groupPickupRadio.checked = true;
    }

    // Remove selected class and reset styling for all time slots
    parentContainer.querySelectorAll('.timeslot').forEach((_slot: Element) => {
      const slot = _slot as HTMLElement;
      slot.classList.remove('selected');
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
  }
}
