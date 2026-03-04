import type { MigrationContext } from '../infrastructure/migration/types.js';
import { DAY_TO_ROOM_FIELD } from '../utils/values/days.js';
import { Keys } from '../utils/values/keys.js';

export const id = '001-add-roomId-to-classes';

export async function migrate(ctx: MigrationContext): Promise<void> {
  const headers = await ctx.getSheetHeaders(Keys.CLASSES);
  if (headers.includes('RoomId')) return;

  // 1. Add the RoomId column at the end
  const colIndex = await ctx.addColumn(Keys.CLASSES, 'RoomId');

  // 2. Read instructors to build a lookup: instructorId → { day → roomId }
  const instructors = await ctx.readAllRows(Keys.INSTRUCTORS);
  const instructorRooms = new Map<string, Record<string, string>>();

  for (const instructor of instructors) {
    const rooms: Record<string, string> = {};
    for (const [day, field] of Object.entries(DAY_TO_ROOM_FIELD)) {
      if (instructor[field]) {
        rooms[day] = instructor[field];
      }
    }
    instructorRooms.set(instructor.Id, rooms);
  }

  // 3. Read classes and resolve roomId from instructor's day availability
  const classes = await ctx.readAllRows(Keys.CLASSES);
  const values = classes.map(cls => {
    const rooms = instructorRooms.get(cls.InstructorId);
    return rooms?.[cls.Day] ?? '';
  });

  // 4. Seed the column
  if (values.length > 0) {
    await ctx.batchUpdateColumn(Keys.CLASSES, colIndex, values);
  }
}
