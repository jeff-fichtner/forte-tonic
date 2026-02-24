# Data Model: Frontend Decomposition

## New Entities

### RegistrationConfig (added to AppConfigurationResponse)

Business configuration for the registration system, served by the backend configuration endpoint.

| Field | Type | Description |
|-------|------|-------------|
| busDeadlines | Record<string, string> | Per-day bus departure cutoff times, e.g. `{"Monday": "16:45", "Wednesday": "16:15"}` |
| lessonLengths | number[] | Valid lesson length options in minutes, e.g. `[30, 45, 60]` |
| operationalHours | {startHour: number, endHour: number} | Scheduling window, e.g. `{startHour: 14, endHour: 18}` |
| schedulingIntervalMinutes | number | Time slot granularity, e.g. `15` |
| defaultInstruments | string[] | Instrument catalog, e.g. `["Piano", "Guitar", "Violin", ...]` |
| defaultInstrument | string | Fallback instrument when instructor has none, e.g. `"Piano"` |
| rockBandDisplayConfig | {timesDescription: string, defaultLengthMinutes: number} | Rock Band class display metadata |

**Defaults** (used as fallback when backend response omits `registrationConfig`):
- busDeadlines: `{"Monday": "16:45", "Tuesday": "16:45", "Wednesday": "16:15", "Thursday": "16:45", "Friday": "16:45"}`
- lessonLengths: `[30, 45, 60]`
- operationalHours: `{startHour: 14, endHour: 18}`
- schedulingIntervalMinutes: `15`
- defaultInstruments: `["Piano", "Guitar", "Violin", "Voice", "Drums", "Bass", "Other"]`
- defaultInstrument: `"Piano"`
- rockBandDisplayConfig: `{timesDescription: "Monday 3-4 PM or Monday 4-5 PM or Friday 3-4 PM", defaultLengthMinutes: 60}`

### Shared Frontend Entity Types (unified from duplicated interfaces)

These interfaces exist in both `parentRegistrationForm.ts` and `adminRegistrationForm.ts` today. They will be unified in a single shared location.

#### InstructorLike
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Instructor identifier |
| firstName | string or null | yes | Display name |
| lastName | string or null | yes | Display name |
| specialties | string[] | no | Instruments this instructor teaches |
| primaryInstrument | string | no | Fallback when specialties is empty |
| gradeRange | {minimum?: number, maximum?: number} | no | Grade eligibility range (parent form only) |
| availability | Record<string, DaySchedule> | no | Per-day schedule (parent form only) |
| [key: string] | unknown | — | Index signature for extensibility |

#### DaySchedule
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| isAvailable | boolean | no | Whether instructor is available this day |
| startTime | string | no | Start time in HH:MM format |
| endTime | string | no | End time in HH:MM format |
| [key: string] | unknown | — | Index signature |

#### StudentLike
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Student identifier |
| firstName | string | no | Display name |
| lastName | string | no | Display name |
| grade | number, string, or null | no | Grade level (0=K, 1-8) |
| getFullName | () => string | no | Method from model class |
| [key: string] | unknown | — | Index signature |

#### ClassLike
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Class identifier |
| day | string | no | Day of week |
| startTime | string | no | Start time |
| length | number | no | Duration in minutes |
| title | string | no | Class title |
| instrument | string | no | Instrument taught |
| instructorId | string | no | Assigned instructor |
| formattedName | string | no | Pre-formatted display name |
| minimumGrade | number | no | Grade eligibility floor |
| maximumGrade | number | no | Grade eligibility ceiling |
| size | number | no | Capacity limit |
| isRestricted | boolean | no | Admin-only class flag |
| [key: string] | unknown | — | Index signature |

#### RegistrationLike
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | yes | Registration identifier |
| studentId | string | no | Registered student |
| instructorId | string | no | Assigned instructor |
| classId | string | no | For group registrations |
| classTitle | string | no | Group class display name |
| day | string | no | Day of week |
| startTime | string | no | Lesson start time |
| length | number | no | Duration in minutes |
| instrument | string | no | Instrument |
| registrationType | string | no | "private" or "group" |
| transportationType | string | no | "bus" or "pickup" |
| linkedPreviousRegistrationId | string | no | For replacement tracking |
| [key: string] | unknown | — | Index signature |

#### RegistrationSubmitData
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| studentId | string | yes | Student to register |
| registrationType | string | yes | "private" or "group" |
| transportationType | string | no | Transportation preference |
| instructorId | string | no | For private lessons |
| instrument | string | no | For private lessons |
| day | string | no | Lesson day |
| startTime | string | no | Lesson start time |
| length | number | no | Duration in minutes |
| trimester | string | no | Target trimester |
| replaceRegistrationId | string | no | Registration to replace |
| classId | string | no | For group registrations |
| classTitle | string | no | Group class display name |
| [key: string] | unknown | — | Index signature |

#### TimeSlot
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| instructorId | string | yes | Available instructor |
| instructor | InstructorLike | no | Full instructor object reference |
| day | string | yes | Day key (lowercase) |
| dayName | string | no | Display day name (capitalized) |
| time | string | yes | Start time in HH:MM |
| timeFormatted | string | no | Display time (AM/PM) |
| length | number | yes | Slot duration in minutes |
| instrument | string | yes | Instrument for this slot |

## Modified Entities

### AppConfigurationResponse (expanded)

New field added:

| Field | Type | Description |
|-------|------|-------------|
| registrationConfig | RegistrationConfig or null | Business configuration for the registration system. Null when not yet populated by backend. |

Constructor defaults `registrationConfig` to `null`. Frontend consumers check for null and fall back to hardcoded defaults.
