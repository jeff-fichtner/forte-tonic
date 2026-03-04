/**
 * Registration Form Element Factories
 *
 * Pure functions for creating DOM elements used by the parent registration form:
 * filter chips with availability styling, instructor cards, and time slot elements.
 * These are stateless — they take data and return DOM nodes.
 */

import type { InstructorLike } from '../../types/registrationTypes.js';
import type { AvailableTimeSlot } from '../../../../models/shared/availableTimeSlot.js';

/**
 * Create a filter chip element with availability-based styling
 */
export function createFilterChip(
  type: string,
  value: string,
  text: string,
  isDefault: boolean = false,
  availability: string = 'available'
): HTMLDivElement {
  const chip = document.createElement('div');
  chip.className = `filter-chip ${type}-chip`;
  chip.dataset.type = type;
  chip.dataset.value = value;
  chip.textContent = text;

  // Apply base styles
  const styles: Record<string, string> = {
    padding: '8px 12px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    border: '2px solid',
    transition: 'all 0.3s',
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
 * Create a time slot element
 */
export function createTimeSlotElement(slot: AvailableTimeSlot): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'timeslot available';
  element.dataset.instructorId = slot.instructorId;
  element.dataset.day = slot.day;
  element.dataset.time = slot.time;
  element.dataset.length = String(slot.length);
  element.dataset.instrument = slot.instrument;
  element.dataset.roomId = slot.roomId;

  element.style.cssText =
    'border: 2px solid #4caf50; background: #e8f5e8; padding: 12px 16px; border-radius: 8px; cursor: pointer; min-width: 110px; text-align: center; transition: all 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';

  element.innerHTML = `
      <div style="font-weight: bold; color: #2e7d32; font-size: 14px;">${slot.dayName}</div>
      <div style="font-weight: bold; color: #2e7d32; font-size: 16px;">${slot.timeFormatted}</div>
      <div style="font-size: 12px; color: #666;">${slot.length}min • ${slot.instrument}</div>
    `;

  return element;
}

/**
 * Create an instructor card with time slot grid
 */
export function createInstructorCard(
  instructor: InstructorLike,
  timeSlots: AvailableTimeSlot[]
): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'instructor-card';
  card.style.cssText =
    'border: 2px solid #ddd; margin: 15px 0; padding: 20px; border-radius: 8px; transition: border-color 0.3s;';

  const header = document.createElement('h6');
  header.style.cssText = 'margin: 0 0 15px 0; color: #2b68a4; display: flex; align-items: center;';

  // Get all instruments this instructor teaches
  const instructorInstruments =
    instructor.specialties ||
    (instructor.primaryInstrument ? [instructor.primaryInstrument] : ['Piano']);

  const normalizedInstruments = Array.isArray(instructorInstruments)
    ? instructorInstruments
    : [instructorInstruments].filter(Boolean);

  const instrumentsDisplay =
    normalizedInstruments.length > 0 ? normalizedInstruments.join(', ') : 'Piano';

  header.innerHTML = `<b>${instructor.fullName} - ${instrumentsDisplay}</b> <span style="margin-left: 10px; font-size: 12px; background: #e8f5e8; color: #4caf50; padding: 4px 8px; border-radius: 12px;">${timeSlots.length} available</span>`;

  const timeslotGrid = document.createElement('div');
  timeslotGrid.className = 'timeslot-grid';
  timeslotGrid.style.cssText = 'display: flex; flex-wrap: wrap; gap: 10px;';

  timeSlots.forEach(slot => {
    const timeslotElement = createTimeSlotElement(slot);
    timeslotGrid.appendChild(timeslotElement);
  });

  card.appendChild(header);
  card.appendChild(timeslotGrid);

  return card;
}
