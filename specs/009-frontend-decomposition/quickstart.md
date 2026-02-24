# Quickstart: Frontend Decomposition

## Verification Scenarios

### Scenario 1: Shared Types Compilation

**Setup**: Both registration forms import from the shared types location.
**Action**: Run `npx tsc --noEmit` and `npx tsc --noEmit -p tsconfig.web.json`.
**Expected**: Zero type errors. No entity interfaces defined inline in either form file.

### Scenario 2: Private Lesson Registration (Parent)

**Setup**: Log in as a parent with one child. Navigate to the registration tab during a non-enrollment period.
**Action**: Select Private Lesson → choose instrument filter → choose day → choose length → choose instructor → select a time slot → select transportation → submit.
**Expected**: Filter chips show correct availability counts with available/limited/unavailable styling. Time slot grid shows instructor cards with open slots. Submission creates the registration with the same payload as pre-decomposition.

### Scenario 3: Group Class Registration (Parent)

**Setup**: Log in as a parent with multiple children. Navigate to the registration tab.
**Action**: Select a student → select Group Class → choose a class from the dropdown.
**Expected**: Classes filtered by student grade eligibility. Restricted classes excluded. Already-enrolled classes excluded. Capacity check shows "class full" message when applicable. Rock Band classes show "Join Wait List" button text.

### Scenario 4: Enrollment Period Behavior (Parent)

**Setup**: Configure the system for priority enrollment period. Log in as a returning parent.
**Action**: Navigate to registration tab. View existing registrations for replacement.
**Expected**: Two parallel trimester fetches occur. Registration selector shows linked previous registrations. Availability engine uses next trimester registrations for conflict checking. Submission routes to the next-trimester endpoint.

### Scenario 5: Admin Registration

**Setup**: Log in as an admin. Navigate to admin registration tab.
**Action**: Create a private lesson registration, then a group class registration.
**Expected**: Admin form behavior is completely unchanged — same components, same flow, same endpoints. The only difference is imports now come from the shared types location.

### Scenario 6: Registration Replacement

**Setup**: Log in as a parent during enrollment period with an existing linked registration.
**Action**: Select the existing registration for replacement. Choose a new time slot. Submit.
**Expected**: Old registration is deleted, new one created. Identical to pre-decomposition behavior. The registration service handles the orchestration.

### Scenario 7: Backend Configuration Override

**Setup**: Backend returns `registrationConfig` with modified values (e.g., lessonLengths: [20, 30, 45, 60]).
**Action**: Load the parent registration form.
**Expected**: Length filter chips show 4 options (20, 30, 45, 60 min) instead of the default 3. Time slot generation uses the server-provided values.

### Scenario 8: Configuration Fallback

**Setup**: Backend returns `registrationConfig: null` or omits the field entirely.
**Action**: Load the parent registration form.
**Expected**: All behavior matches the current hardcoded defaults — no visible change. Bus deadlines, lesson lengths, operational hours all use the same values as today.

### Scenario 9: Bus Time Validation with Server Config

**Setup**: Backend returns modified bus deadline for Wednesday: "16:30" instead of "16:15".
**Action**: Attempt to register a lesson ending at 4:25 PM on Wednesday with bus transportation.
**Expected**: Validation passes (4:25 < 4:30). With the old hardcoded value (4:15), this would have failed.

### Scenario 10: ViewModal Cleanup Verification

**Setup**: Application loads normally.
**Action**: Inspect the viewModel instance.
**Expected**: No `admins`, `instructors`, `students`, `registrations`, `classes`, `rooms`, or `nextTrimesterRegistrations` properties exist. No `createRegistrationWithEnrichment` method exists. Login, modal management, and UI state functions still work.
