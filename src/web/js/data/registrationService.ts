/**
 * Registration Service - Standalone registration orchestration
 *
 * Extracted from viewModel.createRegistrationWithEnrichment, requestDeleteRegistrationAsync,
 * and submitIntent (Step US3 of 009-frontend-decomposition).
 *
 * Handles endpoint routing (admin vs parent, enrollment vs non-enrollment),
 * delete-then-create replacement flow, and response enrichment.
 */

import { HttpService } from './httpService.js';
import { ServerFunctions } from '../constants.js';
import { Registration } from '../../../models/shared/index.js';
import { isEnrollmentPeriod } from '../utilities/periodHelpers.js';

import type { Period } from '../../../models/shared/responses/appConfigurationResponse.js';
import type { RegistrationData } from '../../../models/shared/registration.js';

/** Registration creation data */
export interface RegistrationCreateData {
  trimester?: string | null;
  replaceRegistrationId?: string;
  [key: string]: unknown;
}

/** Options for enrichment lookup arrays */
export interface EnrichmentOptions {
  students?: Array<{ id: string; [key: string]: unknown }> | null;
  instructors?: Array<{ id: string; [key: string]: unknown }> | null;
}

/** Extended Registration with dynamically-assigned enrichment fields */
export interface EnrichedRegistration extends Registration {
  student?: { id: string; [key: string]: unknown };
  instructor?: { id: string; [key: string]: unknown };
}

/**
 * RegistrationService - static-method class for registration CRUD operations.
 *
 * Replaces viewModel.createRegistrationWithEnrichment,
 * viewModel.requestDeleteRegistrationAsync, and viewModel.submitIntent.
 */
export class RegistrationService {
  /**
   * Create a registration with proper endpoint routing and response enrichment.
   *
   * Routes to next trimester endpoint during enrollment periods (for parents only).
   * Admins always use the regular endpoint regardless of period.
   * Handles delete-then-create replacement flow when replaceRegistrationId is set.
   */
  static async create(
    data: RegistrationCreateData,
    { students = null, instructors = null }: EnrichmentOptions = {},
    options: { isAdmin?: boolean } = {}
  ): Promise<EnrichedRegistration> {
    const isAdmin = options.isAdmin ?? false;

    // Determine which endpoint to use based on enrollment period (for non-admin users)
    const currentPeriod: Period | undefined = window.UserSession?.getCurrentPeriod?.();

    // Admins always use regular endpoint, parents use next trimester endpoint during enrollment
    const endpoint =
      isEnrollmentPeriod(currentPeriod) && !isAdmin
        ? ServerFunctions.createNextTrimesterRegistration
        : ServerFunctions.register;

    // Ensure trimester is set when using the regular endpoint
    // For parents during registration period, use the current trimester
    if (endpoint === ServerFunctions.register && !data.trimester && currentPeriod?.trimester) {
      data.trimester = currentPeriod.trimester;
    }

    // If replacing an existing registration (has replaceRegistrationId),
    // delete the old registration first (this creates an audit record for the deletion)
    if (data.replaceRegistrationId) {
      try {
        // Use the appropriate delete endpoint based on enrollment period
        const deleteEndpoint =
          isEnrollmentPeriod(currentPeriod) && !isAdmin
            ? `registrations/next-trimester/${data.replaceRegistrationId}`
            : `registrations/${data.replaceRegistrationId}`;

        await HttpService.delete(deleteEndpoint);

        // Remove the replaceRegistrationId from the data object before creating the new registration
        // The new registration should NOT have linkedPreviousRegistrationId - that's only for migrations
        delete data.replaceRegistrationId;
      } catch (error: unknown) {
        console.error('Error deleting old registration:', error);
        throw new Error(`Failed to delete old registration: ${(error as Error).message}`);
      }
    }

    const response = await HttpService.post(endpoint, data);
    // HttpService auto-unwraps { success, data } responses, so response is already the registration data
    const newRegistration = new Registration(response as RegistrationData) as EnrichedRegistration;

    // Enrich the registration with instructor and student objects
    const studentsLookup = students || [];
    const instructorsLookup = instructors || [];

    if (!newRegistration.student) {
      newRegistration.student = studentsLookup.find((x: { id: string; [key: string]: unknown }) => {
        const studentId = x.id;
        const registrationStudentId = newRegistration.studentId;
        return studentId === registrationStudentId;
      });

      if (!newRegistration.student && studentsLookup.length > 0) {
        console.warn(
          `❌ Student not found for new registration with studentId "${newRegistration.studentId}"`
        );
      }
    }

    if (!newRegistration.instructor) {
      newRegistration.instructor = instructorsLookup.find((x: { id: string; [key: string]: unknown }) => {
        const instructorId = x.id;
        const registrationInstructorId = newRegistration.instructorId;
        return instructorId === registrationInstructorId;
      });

      if (!newRegistration.instructor && instructorsLookup.length > 0) {
        console.warn(
          `❌ Instructor not found for new registration with instructorId "${newRegistration.instructorId}"`
        );
      }
    }

    return newRegistration;
  }

  /**
   * Delete a registration with user confirmation.
   */
  static async delete(registrationId: string): Promise<void> {
    // Confirm delete
    if (!confirm('Are you sure you want to delete this registration?')) {
      return;
    }

    if (!registrationId) {
      console.error('No registration ID provided for deletion');
      M.toast({ html: 'Error: No registration ID provided for deletion.' });
      return;
    }

    try {
      await HttpService.delete(`registrations/${registrationId}`);
      M.toast({ html: 'Registration deleted successfully.' });
    } catch (error: unknown) {
      console.error('Error deleting registration:', error);
      M.toast({ html: 'Error deleting registration.' });
    }
  }

  /**
   * Submit an intent (keep/change/drop) for a registration.
   */
  static async submitIntent(registrationId: string, intent: string): Promise<unknown> {
    try {
      const data = await HttpService.patch(`registrations/${registrationId}/intent`, { intent });
      M.toast({ html: 'Intent submitted successfully.' });
      return data;
    } catch (error: unknown) {
      console.error('Error submitting intent:', error);
      M.toast({ html: (error as Error).message || 'Error submitting intent.' });
      throw error;
    }
  }
}
