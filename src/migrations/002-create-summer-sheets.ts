import type { MigrationContext } from '../infrastructure/migration/types.js';
import { Registration } from '../models/shared/registration.js';

export const id = '002-create-summer-sheets';

/**
 * Creates the `registrations_summer` and `registrations_summer_audit`
 * sheets that the 014 summer-registration feature requires, using the
 * shared `Registration.columns` / `Registration.auditColumns` schemas so
 * the new sheets are structurally identical to fall/winter/spring sheets.
 *
 * Idempotent: `createSheet()` is a no-op when the sheet already exists,
 * so re-running this migration (e.g., partial-failure recovery) is safe.
 */
export async function migrate(ctx: MigrationContext): Promise<void> {
  await ctx.createSheet('registrations_summer', Registration.columns);
  await ctx.createSheet('registrations_summer_audit', Registration.auditColumns);
}
