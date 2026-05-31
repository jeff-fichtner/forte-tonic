/**
 * Registration Service - Standalone registration orchestration.
 *
 * Handles delete-then-create replacement flow and response enrichment.
 * All registrations go through a single endpoint; trimester is always required.
 */

import { HttpService } from './httpService.js';
import type { HttpResult } from './httpService.js';
import { ServerFunctions } from '../constants.js';
import { Registration } from '/models/shared/index.js';
import { UserSession } from '../auth/session.js';

import type { RegistrationData } from '/models/shared/registration.js';

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
 * All methods return HttpResult — callers never need try/catch.
 */
export class RegistrationService {
  /**
   * Create a registration with response enrichment.
   * Trimester must be set on data by callers. Uses a single endpoint for all registrations.
   */
  static async create(
    data: RegistrationCreateData,
    { students = null, instructors = null }: EnrichmentOptions = {}
  ): Promise<HttpResult<EnrichedRegistration>> {
    // Ensure trimester is set — fall back to current period if callers omit it
    if (!data.trimester) {
      const currentPeriod = UserSession.getCurrentPeriod?.();
      if (currentPeriod?.trimester) {
        data.trimester = currentPeriod.trimester;
      }
    }

    // Modify-via-replace: pass `replaceRegistrationId` through to the backend
    // and let it handle authorization + create + delete in one request. The
    // server enforces parent eligibility (must be a carried-forward row, must
    // belong to the parent's student) so we don't need a separate DELETE call
    // here — which previously triggered a 401 → forced logout for parents.
    const result = await HttpService.post(ServerFunctions.register, data);
    if (!result.ok) return result;

    const newRegistration = new Registration(
      result.data as RegistrationData
    ) as EnrichedRegistration;

    const studentsLookup = students || [];
    const instructorsLookup = instructors || [];

    if (!newRegistration.student) {
      newRegistration.student = studentsLookup.find(x => x.id === newRegistration.studentId);
      if (!newRegistration.student && studentsLookup.length > 0) {
        console.warn(
          `❌ Student not found for new registration with studentId "${newRegistration.studentId}"`
        );
      }
    }

    if (!newRegistration.instructor) {
      newRegistration.instructor = instructorsLookup.find(
        x => x.id === newRegistration.instructorId
      );
      if (!newRegistration.instructor && instructorsLookup.length > 0) {
        console.warn(
          `❌ Instructor not found for new registration with instructorId "${newRegistration.instructorId}"`
        );
      }
    }

    return { ok: true, data: newRegistration };
  }

  /**
   * Delete a registration with user confirmation.
   * Returns ok:false (without toast) if the user cancels the confirmation.
   */
  static async delete(registrationId: string, trimester: string): Promise<HttpResult<void>> {
    if (!confirm('Are you sure you want to delete this registration?')) {
      return { ok: false, error: { message: 'Cancelled' } };
    }

    if (!registrationId) {
      return { ok: false, error: { message: 'No registration ID provided for deletion' } };
    }

    const result = await HttpService.delete<void>(`registrations/${trimester}/${registrationId}`);

    if (result.ok) {
      M.toast({ html: 'Registration deleted successfully.' });
    } else {
      M.toast({ html: result.error.message || 'Error deleting registration.' });
    }

    return result;
  }

  /**
   * Submit an intent (keep/change/drop) for a registration.
   */
  static async submitIntent(
    registrationId: string,
    trimester: string,
    intent: string
  ): Promise<HttpResult<unknown>> {
    const result = await HttpService.patch(`registrations/${trimester}/${registrationId}/intent`, {
      intent,
    });

    if (result.ok) {
      M.toast({ html: 'Intent submitted successfully.' });
    } else {
      M.toast({ html: result.error.message || 'Error submitting intent.' });
    }

    return result;
  }
}
