/**
 * Cascading Filter Chips — extracted from ParentRegistrationForm
 *
 * Manages the cascading instrument → day → length → instructor filter chip UI,
 * the instructor time-slot grid, and time-slot selection state. Communicates the
 * selected time slot to the parent form via the `onTimeSlotSelected` callback.
 *
 * Chip counts and time slot grids are derived from a pre-computed
 * `AvailableTimeSlot[]` array (server-computed, grade-specific). No engine
 * functions are called — all filtering is `Array.filter()` + counting.
 */

import { TransportationType } from '/utils/values/transportationType.js';
import { createFilterChip, createInstructorCard } from './registrationFormElements.js';
import { isInstructorGradeEligible } from '../../utilities/registrationForm/availabilityEngine.js';
import { formatDisplayTime } from '../../utilities/registrationForm/timeHelpers.js';

import { ModalKeyboardHandler } from '../../utilities/modalKeyboardHandler.js';
import type { AvailableTimeSlot } from '../../../../models/shared/availableTimeSlot.js';
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
  availableTimeSlots: AvailableTimeSlot[];
}

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class CascadingFilterChips {
  // Data arrays (mutable via updateData)
  #instructors: InstructorLike[];
  #onTimeSlotSelected: (slot: TimeSlot | null) => void;
  #parentChildren: StudentLike[];
  #availableTimeSlots: AvailableTimeSlot[];

  // Internal selection state
  #selectedLesson: TimeSlot | null = null;
  #regenerateTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor(config: CascadingFilterChipsConfig) {
    this.#instructors = config.instructors;
    this.#onTimeSlotSelected = config.onTimeSlotSelected;
    this.#parentChildren = config.parentChildren;
    this.#availableTimeSlots = config.availableTimeSlots;
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
    if (config.onTimeSlotSelected !== undefined)
      this.#onTimeSlotSelected = config.onTimeSlotSelected;
    if (config.parentChildren !== undefined) this.#parentChildren = config.parentChildren;
    if (config.availableTimeSlots !== undefined)
      this.#availableTimeSlots = config.availableTimeSlots;
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
  // Slot filtering helpers
  // -----------------------------------------------------------------------

  /**
   * Read the active chip value for a given dimension from the DOM.
   * Returns the data-value of the active chip, or 'all'.
   */
  #getActiveChipValue(dimension: string): string {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return 'all';
    const chip = parentContainer.querySelector(`.${dimension}-chip.active`) as HTMLElement | null;
    return chip?.dataset.value || 'all';
  }

  /**
   * Filter the pre-computed slot array by all active selections upstream
   * of the given dimension. Cascade order: instrument → day → length → instructor.
   */
  #applyUpstreamFilters(
    dimension: 'instrument' | 'day' | 'length' | 'instructor'
  ): AvailableTimeSlot[] {
    let filtered = this.#availableTimeSlots;

    // instrument has no upstream filters
    if (dimension === 'instrument') return filtered;

    const instrument = this.#getActiveChipValue('instrument');
    if (instrument !== 'all') {
      filtered = filtered.filter(s => s.instrument === instrument);
    }

    if (dimension === 'day') return filtered;

    const day = this.#getActiveChipValue('day');
    if (day !== 'all') {
      filtered = filtered.filter(s => s.day === day);
    }

    if (dimension === 'length') return filtered;

    const length = this.#getActiveChipValue('length');
    if (length !== 'all') {
      filtered = filtered.filter(s => s.length === parseInt(length));
    }

    // dimension === 'instructor' — all upstream filters applied
    return filtered;
  }

  /**
   * Filter the pre-computed slot array by ALL active selections (all four dimensions).
   */
  #applyAllFilters(): AvailableTimeSlot[] {
    let filtered = this.#availableTimeSlots;

    const instrument = this.#getActiveChipValue('instrument');
    if (instrument !== 'all') {
      filtered = filtered.filter(s => s.instrument === instrument);
    }

    const day = this.#getActiveChipValue('day');
    if (day !== 'all') {
      filtered = filtered.filter(s => s.day === day);
    }

    const length = this.#getActiveChipValue('length');
    if (length !== 'all') {
      filtered = filtered.filter(s => s.length === parseInt(length));
    }

    const instructor = this.#getActiveChipValue('instructor');
    if (instructor !== 'all') {
      filtered = filtered.filter(s => s.instructorId === instructor);
    }

    return filtered;
  }

  // -----------------------------------------------------------------------
  // Chip generation (filter + count on pre-computed slots)
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

    // No upstream filters — count all slots by instrument
    const slots = this.#applyUpstreamFilters('instrument');
    const counts = new Map<string, number>();
    let totalSlots = 0;
    for (const slot of slots) {
      counts.set(slot.instrument, (counts.get(slot.instrument) || 0) + 1);
      totalSlots++;
    }

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
    const uniqueInstruments = Array.from(counts.keys()).sort();
    uniqueInstruments.forEach(instrument => {
      const count = counts.get(instrument) || 0;
      const chipText = `${instrument} (${count} slots)`;
      const availability = count > 3 ? 'available' : count > 0 ? 'limited' : 'unavailable';
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

    const selectedDay = (parentContainer.querySelector('.day-chip.active') as HTMLElement | null)
      ?.dataset.value;

    // Upstream filter: instrument
    const slots = this.#applyUpstreamFilters('day');
    const counts = new Map<string, number>();
    let totalSlots = 0;
    for (const slot of slots) {
      counts.set(slot.day, (counts.get(slot.day) || 0) + 1);
      totalSlots++;
    }

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
      const count = counts.get(day) || 0;
      const chipText = `${dayNames[index]} (${count} slots)`;
      const availability = count > 3 ? 'available' : count > 0 ? 'limited' : 'unavailable';
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

    const selectedLength = (
      parentContainer.querySelector('.length-chip.active') as HTMLElement | null
    )?.dataset.value;

    // Upstream filters: instrument + day
    const slots = this.#applyUpstreamFilters('length');
    const counts = new Map<string, number>();
    let totalSlots = 0;
    for (const slot of slots) {
      const key = String(slot.length);
      counts.set(key, (counts.get(key) || 0) + 1);
      totalSlots++;
    }

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
      const count = counts.get(String(length)) || 0;
      const chipText = `${length} min (${count} slots)`;
      const availability = count > 3 ? 'available' : count > 0 ? 'limited' : 'unavailable';
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

    const selectedInstructor = (
      parentContainer.querySelector('.instructor-chip.active') as HTMLElement | null
    )?.dataset.value;

    // Upstream filters: instrument + day + length
    const slots = this.#applyUpstreamFilters('instructor');
    const counts = new Map<string, number>();
    let totalSlots = 0;
    for (const slot of slots) {
      counts.set(slot.instructorId, (counts.get(slot.instructorId) || 0) + 1);
      totalSlots++;
    }

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

    // Create individual instructor chips (filtered by student grade for display)
    const studentGrade = this.#getSelectedStudentGrade();
    const eligibleInstructors = this.#instructors.filter((instructor: InstructorLike) =>
      isInstructorGradeEligible(instructor, studentGrade)
    );

    eligibleInstructors.forEach((instructor: InstructorLike) => {
      const count = counts.get(instructor.id) || 0;
      const chipText = `${instructor.fullName} (${count} slots)`;
      const availability = count > 3 ? 'available' : count > 0 ? 'limited' : 'unavailable';
      const chip = createFilterChip('instructor', instructor.id, chipText, false, availability);
      instructorContainer.appendChild(chip);
    });
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
  // Time slot generation (filter pre-computed slots, group by instructor)
  // -----------------------------------------------------------------------

  #generateTimeSlots(): void {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const timeslotGrid = parentContainer.querySelector('.instructor-timeslot-grid');
    if (!timeslotGrid) return;

    // Clear existing instructor cards
    const existingCards = timeslotGrid.querySelectorAll('.instructor-card');
    existingCards.forEach(card => card.remove());

    // Group all slots by instructorId
    const slotsByInstructor = new Map<string, AvailableTimeSlot[]>();
    for (const slot of this.#availableTimeSlots) {
      const existing = slotsByInstructor.get(slot.instructorId);
      if (existing) {
        existing.push(slot);
      } else {
        slotsByInstructor.set(slot.instructorId, [slot]);
      }
    }

    // Render a card for each instructor that has slots
    for (const [instructorId, slots] of slotsByInstructor) {
      const instructor = this.#instructors.find(i => i.id === instructorId);
      if (!instructor) continue;
      const card = createInstructorCard(instructor, slots);
      timeslotGrid.appendChild(card);
    }

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

  #regenerateFilteredTimeSlots(): void {
    const parentContainer = document.getElementById('parent-registration');
    if (!parentContainer) return;

    const timeslotGrid = parentContainer.querySelector('.instructor-timeslot-grid');
    if (!timeslotGrid) return;

    // Store current selection before regenerating
    const currentSelection = this.#selectedLesson;

    // Filter pre-computed slots by all active selections
    const filteredSlots = this.#applyAllFilters();

    // Clear existing instructor cards
    const existingCards = timeslotGrid.querySelectorAll('.instructor-card');
    existingCards.forEach(card => card.remove());

    // Group filtered slots by instructorId
    const slotsByInstructor = new Map<string, AvailableTimeSlot[]>();
    for (const slot of filteredSlots) {
      const existing = slotsByInstructor.get(slot.instructorId);
      if (existing) {
        existing.push(slot);
      } else {
        slotsByInstructor.set(slot.instructorId, [slot]);
      }
    }

    // Render a card for each instructor that has matching slots
    for (const [instructorId, slots] of slotsByInstructor) {
      const instructor = this.#instructors.find(i => i.id === instructorId);
      if (!instructor) continue;
      const card = createInstructorCard(instructor, slots);
      timeslotGrid.appendChild(card);
    }

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
        const roomId = slot.dataset.roomId;

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
          roomId: roomId,
        };

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
    } else {
      const stillAvailableSlot = document.querySelector(
        `.timeslot[data-instructor-id="${selectionData.instructorId}"][data-day="${selectionData.day}"][data-time="${selectionData.time}"][data-length="${selectionData.length}"][data-instrument="${selectionData.instrument}"]`
      ) as HTMLElement | null;

      if (!stillAvailableSlot) {
        this.#selectedLesson = null;
        this.#onTimeSlotSelected(null);
      } else {
        stillAvailableSlot.classList.add('selected');
        stillAvailableSlot.style.border = '3px solid #1976d2';
        stillAvailableSlot.style.background = '#e3f2fd';
        this.#updateSelectionDisplay(stillAvailableSlot);
      }
    }
  }

  #updateSelectionDisplay(slot: HTMLElement): void {
    const parentContainer = document.getElementById('parent-registration');
    const selectionDisplay = parentContainer?.querySelector(
      '#admin-selected-lesson-display'
    ) as HTMLElement | null;
    if (selectionDisplay) {
      const instructorId = slot.dataset.instructorId;
      const instructor = this.#instructors.find(i => i.id === instructorId);
      const instructorName = instructor?.fullName || instructorId;
      const dayName =
        (slot.dataset.day || '').charAt(0).toUpperCase() + (slot.dataset.day || '').slice(1);
      const timeFormatted = formatDisplayTime(slot.dataset.time || '');
      const instrument = slot.dataset.instrument;
      const length = slot.dataset.length;

      const detailsElement = selectionDisplay.querySelector('#admin-selected-lesson-details');
      if (detailsElement) {
        detailsElement.innerHTML = `
          <div><strong>Instructor:</strong> ${instructorName}</div>
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
        const submitButton = document.getElementById(
          'parent-confirm-registration-btn'
        ) as HTMLButtonElement | null;
        if (submitButton && !submitButton.disabled && this.#selectedLesson) {
          submitButton.click();
        }
      },
      onCancel: (_event: KeyboardEvent) => {
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
