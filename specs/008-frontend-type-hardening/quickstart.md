# Quickstart: Frontend Type Hardening

## Verification Commands

### Type checking (primary validation)
```bash
# Must pass with zero errors after implementation
npx tsc --noEmit -p tsconfig.web.json
```

### Vite build (runtime compatibility)
```bash
# Must succeed — proves type changes don't break bundling
npm run build:frontend
```

### Backend tests (regression check)
```bash
# Must still pass — this feature shouldn't touch backend code
npm test
```

## Verification Scenarios

### Scenario 1: tsconfig.web.json actually compiles web files

**Before**: `tsc --noEmit -p tsconfig.web.json` compiles only 3 of 47 web files (due to inherited `exclude`).

**After**: All 47 files in `src/web/js/` are compiled. Verify by introducing a deliberate type error in a previously-excluded file (e.g., `viewModel.ts`) and confirming `tsc` reports it.

```bash
# Quick test: temporarily add a type error to viewModel.ts
# e.g., const x: number = "not a number";
# Then run tsc — it should report the error
# Then revert the test change
```

### Scenario 2: Utility function types are enforced

**Test**: In any file that imports from `utilities/`, pass a wrong-type argument.

```typescript
// This should produce a tsc error after US1:
import { parseTime } from './utilities/registrationForm/timeHelpers.js';
parseTime(42); // Error: Argument of type 'number' is not assignable to parameter of type 'string'
```

### Scenario 3: Window globals are typed

**Test**: Access a window global and use a non-existent property.

```typescript
// This should produce a tsc error after US2:
window.UserSession.nonExistentMethod(); // Error: Property 'nonExistentMethod' does not exist
```

### Scenario 4: Prototype extensions are recognized

**Test**: Use `.capitalize()` on a string literal.

```typescript
// This should NOT produce an error after US1:
const name = "hello".capitalize(); // OK, returns string
```

### Scenario 5: Manual smoke test (runtime behavior)

After all implementation is complete, verify these flows work identically to before:

1. **Parent login**: Enter phone number → login → see weekly schedule tab
2. **Admin login**: Enter access code → login → see master schedule tab → filter registrations
3. **Instructor login**: Enter access code → login → see weekly schedule
4. **Registration form**: As admin, open registration tab → select student → select instructor → submit
5. **Drop request**: As parent, initiate a drop request from weekly schedule

All of these should work exactly as before — this is a types-only change.
