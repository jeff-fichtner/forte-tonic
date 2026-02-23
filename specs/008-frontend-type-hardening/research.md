# Research: Frontend Type Hardening

## R1: tsconfig.web.json exclude inheritance bug

**Decision**: Add explicit `"exclude": ["node_modules", "dist"]` to `tsconfig.web.json` to override the inherited `exclude: ["src/web/**/*.ts"]` from the base `tsconfig.json`.

**Rationale**: TypeScript's `extends` mechanism inherits the `exclude` array from the base config when the extending config doesn't define its own `exclude`. The base config's `exclude: ["src/web/**/*.ts"]` is correct for server-side compilation (prevents Node.js tsc from compiling browser code), but when inherited by `tsconfig.web.json`, it makes `tsc -p tsconfig.web.json` skip all 44 of 47 web files. The 3 files that do get compiled (`classManager.ts`, `modalKeyboardHandler.ts`, `httpService.ts`) are pulled in only because `global.d.ts` (in `src/types/`) has `import type` references to them.

**Alternatives considered**:
- Remove `exclude` from base tsconfig and use `include` to limit scope → rejected because the base tsconfig's `include: ["src/**/*.ts"]` would then include web files in server compilation
- Use project references → over-engineered for this project size; would require restructuring both tsconfigs

## R2: Error count breakdown when web files are compiled

**Decision**: Document the ~1,856 errors categorized by type to guide implementation order.

**Rationale**: Tested by temporarily fixing tsconfig.web.json locally:
- **423 TS7006** — `Parameter 'x' implicitly has an 'any' type` — these are the core typing work
- **937 TS2339** — `Property 'x' does not exist on type` — mostly `window.*` globals not declared on the correct type, plus `event.target.value` on `EventTarget`
- **110 TS2304** — `Cannot find name 'x'` — bare `M` references (without `window.` prefix), `TONIC_ENV`, `overrideMaintenanceMode` etc.
- **94 TS18046** — `'x' is of type 'unknown'` — from `global.d.ts` placeholders typed as `unknown`
- **73 TS18047** — `'x' is possibly null` — `document.getElementById` returns `HTMLElement | null`
- **~219 other** — assorted type mismatches, missing members, etc.

Fixing global.d.ts (R4) and prototype declarations (R5) eliminates the TS2339/TS2304/TS18046 categories (~1,141 errors), leaving ~715 to fix via direct type annotations.

## R3: DOM element typing patterns

**Decision**: Use three patterns based on call-site context, with no runtime behavior changes.

**Rationale**:
1. **Non-null assertion (`!`)** — for elements guaranteed to exist in `index.html` (e.g., `document.getElementById('page-content')!`). Add a brief comment if the guarantee isn't obvious.
2. **Optional chaining (`?.`)** — for elements that may be conditionally present (e.g., dynamic content injected by tabs).
3. **Generic querySelector** — for typed element access: `querySelector<HTMLInputElement>('.selector')`.

For `event.target`, the standard TypeScript pattern is:
```typescript
const target = event.target as HTMLSelectElement;
const value = target.value;
```
Or use a type guard function if the pattern repeats heavily.

**Alternatives considered**:
- Add runtime null checks everywhere → violates Constitution I (Simplicity First) — adds unnecessary runtime code when elements are statically guaranteed
- Use `document.querySelector` with generics everywhere instead of `getElementById` → unnecessary churn; both patterns are valid

## R4: global.d.ts extension strategy

**Decision**: Extend the existing `src/types/global.d.ts` incrementally as each class gets typed. Replace `unknown` placeholders with proper class types. Add missing globals.

**Rationale**: The file already has good structure with Window interface augmentation. The gaps are:
- **Placeholders to replace**: `Table: unknown`, `Select: unknown`, `NavTabs: unknown`, `DomHelpers: unknown`, `DurationHelpers: unknown`, `PromiseHelpers: unknown`, `IndexedDbClient: unknown` → replace with `typeof Table`, `typeof Select`, etc. after those classes are typed
- **Missing globals to add**: `window.viewModel` (instance), `window.tabController`, `window.loginModal`, `window.loginModalInstance`, `window.termsModal`, `window.termsModalInstance`, `window.privacyModal`, `window.privacyModalInstance`, `window.termsOnConfirmationCallback`, `window.TONIC_ENV`, `window.overrideMaintenanceMode`, `window.clearServerCache`
- **UserSessionType to strengthen**: Replace `Record<string, unknown>` return types with proper `AppConfigurationResponse` and `Period` types
- **ViewModelType to strengthen**: Replace index signature escape hatch with actual class type after viewModel is typed

## R5: Prototype extension declaration merging

**Decision**: Add interface declaration merging to `src/types/global.d.ts` for `String.prototype.capitalize`, `Number.prototype.formatGrade`, `Number.prototype.formatTime`, and `Duration.prototype.to12HourFormat`/`to24HourFormat`.

**Rationale**: Standard TypeScript pattern for extending built-in types. Placing declarations in the existing `global.d.ts` (already in `tsconfig.web.json`'s `include` via `src/types/**/*.d.ts`) avoids creating new files.

```typescript
interface String {
  capitalize(): string;
}
interface Number {
  formatGrade(): string;
  formatTime(): string;
}
```

For `Duration` prototype extensions, these only apply if `window.Duration` exists (browser context), and `Duration` is already declared via the import in `global.d.ts`.

**Alternatives considered**:
- Create separate `extensions.d.ts` → adds a file for 10 lines of declarations; simpler to keep in global.d.ts
- Remove prototype extensions and convert to utility functions → out of scope (behavioral change)

## R6: Duplicated formatDateTime consolidation

**Decision**: Extract the `formatDateTime(timestamp)` function from `adminWaitListTab.ts` (module-level) and `parentWeeklyScheduleTab.ts` (private instance method `#formatDateTime`) into `src/web/js/utilities/formatHelpers.ts`, which already exists and contains formatting utilities.

**Rationale**: Both implementations are identical — they format an ISO timestamp to a human-readable date/time string. `formatHelpers.ts` already exports `capitalize` and `formatDateTime` would be a natural fit.

**Alternatives considered**:
- Create a new `dateTimeHelpers.ts` → unnecessary; `formatHelpers.ts` already exists for formatting
- Leave duplicated → violates Constitution VI (No Dead Code) and FR-009

## R7: Vite build compatibility

**Decision**: Vite uses esbuild for TypeScript, which strips types without checking them. The Vite build will continue to work regardless of type annotation changes. `tsc` is the sole type-checking authority.

**Rationale**: Vite's TypeScript handling:
- **Dev mode**: esbuild transpiles `.ts` → `.js`, strips types, no checking
- **Production build**: Same esbuild transpilation + Rollup bundling
- **Neither mode runs tsc** — Vite explicitly does not type-check

This means:
1. Adding type annotations cannot break the Vite build
2. `tsc --noEmit -p tsconfig.web.json` is the only way to verify types
3. The `npm run build:frontend` command may need a `tsc` check added, but that's a CI/pipeline concern, not a code change
