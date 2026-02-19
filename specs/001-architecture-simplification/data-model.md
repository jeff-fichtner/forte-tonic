# Data Model: Architecture Simplification

**Branch**: `001-architecture-simplification` | **Date**: 2026-02-18

This document describes the **target state** of each model after simplification. Changes from current state are noted.

## Models

### Student

**Constructor**: `constructor(data)` (no change)
**ID type**: Plain string (currently `StudentId` value object — **change**)

| Property | Type | Source | Change |
|----------|------|--------|--------|
| `id` | string | DB column 0 | Remove `StudentId` wrapping |
| `firstName` | string | DB column 2 (or nickname from column 4) | No change |
| `lastName` | string | DB column 1 (or nickname from column 3) | No change |
| `firstNickname` | string | DB column 4 | No change |
| `lastNickname` | string | DB column 3 | No change |
| `grade` | string | DB column 5 | No change |
| `parent1Id` | string | DB column 6 | No change |
| `parent2Id` | string | DB column 7 | No change |
| `parentEmails` | string | Enriched by `UserRepository.getStudents()` | No change |
| `email` | string/null | Not in current DB row | Remove `Email` wrapping, store plain string |
| `age` | number/null | Not in current DB row | Remove `Age` wrapping, store plain number |
| `isActive` | boolean | Not in current DB row | No change |

**Removed properties**: `emergencyContactName`, `emergencyContactPhone`, `medicalNotes`, `dateOfBirth`, `createdAt`, `updatedAt`
**Removed methods**: `getAgeCategory()`, `canTakeAdvancedLessons()`, `needsSpecialAccommodations()`, `getRecommendedLessonDuration()`, `toEnrolledEvent()`, `updateContactInfo()`, `addMedicalNotes()`, `setActiveStatus()`, `requiresParentPermission()`
**Removed factories**: `createNew()`, `fromDataObject()` (trivial wrapper)
**Serialization**: `toJSON()` replaces `toDataObject()`

---

### Registration

**Constructor**: `constructor(data)` (no change)
**ID type**: Plain string UUID (currently `RegistrationId` — **change**)

| Property | Type | Source | Change |
|----------|------|--------|--------|
| `id` | string (UUID) | DB column 0 | Remove `RegistrationId` wrapping |
| `studentId` | string | DB column 1 | Remove `StudentId` wrapping |
| `instructorId` | string | DB column 2 | Remove `InstructorId` wrapping |
| `day` | string | DB column 3 | No change |
| `startTime` | string | DB column 4 | No change |
| `length` | number | DB column 5 | No change |
| `registrationType` | string | DB column 6 | No change |
| `roomId` | string | DB column 7 | No change |
| `instrument` | string | DB column 8 | No change |
| `transportationType` | string | DB column 9 | No change |
| `notes` | string | DB column 10 | No change |
| `classId` | string | DB column 11 | No change |
| `classTitle` | string | DB column 12 | No change |
| `expectedStartDate` | Date/null | DB column 13 | No change |
| `createdAt` | Date | DB column 14 | No change |
| `createdBy` | string | DB column 15 | No change |
| `reenrollmentIntent` | string | DB column 16 | No change |
| `intentSubmittedAt` | string | DB column 17 | No change |
| `intentSubmittedBy` | string | DB column 18 | No change |
| `linkedPreviousRegistrationId` | string/null | DB column 19 | No change |
| `isWaitlistClass` | boolean | Computed from classTitle | No change |

**Removed methods**: `isPrivateLesson()`, `isGroupClass()`, `getDurationMinutes()`, `getFormattedTime()`, `generateSchedule()`
**Removed factories**: `fromApiData()` (not used by `AuthenticatedUserResponse`)
**Serialization**: `toJSON()` inlines current `toDataObject()` logic, removes internal `extractValue`. `toDatabaseRow()` simplified to use plain string IDs.

---

### Instructor

**Constructor**: `constructor(data)` (no change)
**ID type**: Plain string (already plain string — no change)

| Property | Type | Source | Change |
|----------|------|--------|--------|
| `id` | string | DB column 0 | No change (already plain) |
| `email` | string | DB column 1 | No change |
| `lastName` | string | DB column 2 | No change |
| `firstName` | string | DB column 3 | No change |
| `phone` | string | DB column 4 | No change |
| `isActive` | boolean | DB column 5 (inverted `isDeactivated`) | No change |
| `specialties` | array | DB columns 8-11 (aggregated) | No change |
| `availability` | object | DB columns 12-31 | No change |
| `gradeRange` | object | DB columns 6-7 | No change |
| `accessCode` | string | DB column 32 | No change |
| `displayEmail` | string | DB column 33 | No change |
| `displayPhone` | string | DB column 34 | No change |
| `role` | string | Computed | No change |

**Removed properties**: `bio`, `yearsExperience`, `certifications`, `hireDate`
**Removed methods**: `hasCertification()`, `canTeach()`, `isAvailableOnDay()`, `getDayAvailability()`, `canTeachGrade()`, `validate()`
**Removed getters**: `yearsOfService`, `seniorityLevel`, `formattedCertifications`, `availableDays`
**Removed factories**: `fromDatabase()`, `toDatabaseModel()`
**Serialization**: `toJSON()` inlines current `toDataObject()` logic. Remove `toDataObject()`.

---

### Admin

**Constructor**: `constructor(data)` (no change)
**ID type**: Plain string (no change)

| Property | Type | Source | Change |
|----------|------|--------|--------|
| `id` | string | DB column 0 | No change |
| `email` | string | DB column 1 | No change |
| `lastName` | string | DB column 2 | No change |
| `firstName` | string | DB column 3 | No change |
| `phone` | string | DB column 4 | **Rename from `phoneNumber`** to match DB |
| `accessCode` | string | DB column 5 | No change |
| `role` | string | DB column 6 | No change |
| `displayEmail` | string | DB column 7 | No change |
| `displayPhone` | string | DB column 8 | No change |
| `isDirector` | boolean | DB column 9 | No change |
| `isActive` | boolean | Computed | No change |

**Removed properties**: `permissions`, `lastLoginDate`
**Removed methods**: `hasPermission()`, `hasAnyPermission()`, `hasAllPermissions()`, `updateLastLogin()`, `validate()`
**Removed getters**: `isSuperAdmin`, `daysSinceLastLogin`
**Removed factories**: `fromDatabase()`, `toDatabaseModel()`
**Serialization**: `toJSON()` updated to use `phone` instead of `phoneNumber`

---

### Parent

**Constructor**: `constructor(data)` (**change** from positional args)
**ID type**: Plain string (no change)

| Property | Type | Source | Change |
|----------|------|--------|--------|
| `id` | string | DB column 0 | No change |
| `email` | string | DB column 1 | No change |
| `lastName` | string | DB column 2 | No change |
| `firstName` | string | DB column 3 | No change |
| `phone` | string | DB column 4 | No change |
| `accessCode` | string | DB column 5 | No change |

**Removed properties**: `alternatePhone`, `address`, `isEmergencyContact`, `relationship`, `isActive`
**Removed methods**: `canBeEmergencyContact()`, `validate()`
**Removed getters**: `allPhones`, `formattedPrimaryPhone`, `contactSummary`
**Removed factories**: `create()`
**Serialization**: `toJSON()` simplified to match reduced property set

---

### Class

**Constructor**: `constructor(data)` (**change** from positional args)
**ID type**: Plain string (no change)

| Property | Type | Source | Change |
|----------|------|--------|--------|
| `id` | string | DB column 0 | No change |
| `instructorId` | string | DB column 1 | No change |
| `day` | string | DB column 2 | No change |
| `startTime` | string | DB column 3 | No change |
| `length` | number | DB column 4 | No change |
| `endTime` | string | DB column 5 | No change |
| `instrument` | string | DB column 6 | No change |
| `title` | string | DB column 7 | No change |
| `size` | number | DB column 8 | No change |
| `minimumGrade` | string | DB column 9 | No change |
| `maximumGrade` | string | DB column 10 | No change |
| `isRestricted` | boolean | DB column 11 | No change |

**Removed properties**: `roomId` (from options, not in DB), `description` (not in DB), `isActive` (not in DB)
**Removed methods**: `validate()`, `gradeToNumber()`
**Removed factories**: `create()`
**Serialization**: `toJSON()` updated for `constructor(data)` pattern

---

### Room

**Constructor**: `constructor(data)` (**change** from positional args)
**ID type**: Plain string (no change)

| Property | Type | Source | Change |
|----------|------|--------|--------|
| `id` | string | DB column 0 | No change |
| `name` | string | DB column 1 | No change |
| `altName` | string | DB column 2 | No change |
| `includeRoomId` | boolean | DB column 3 | No change |

**Removed properties**: `capacity`, `location`, `equipment`, `description`, `isActive`
**Removed methods**: `hasEquipment()`, `addEquipment()`, `removeEquipment()`, `isSuitableForInstrument()`, `canAccommodate()`, `validate()`
**Removed getters**: `sizeCategory`, `fullLocation`, `formattedEquipment`
**Removed factories**: `create()`

---

### AttendanceRecord

**Constructor**: `constructor(data)` (**change** from positional args)
**ID type**: Composite string (no change)

| Property | Type | Source | Change |
|----------|------|--------|--------|
| `registrationId` | string | DB data | No change |
| `createdAt` | string | DB data | No change |
| `createdBy` | string | DB data | No change |

---

## Files to Delete

### Value Objects (src/utils/values/)
- `studentId.js`
- `instructorId.js`
- `registrationId.js`
- `age.js`
- `email.js`
- `lessonTime.js`
- `registrationType.js`
- `lengthOptions.js`

### Dead Model Files (src/models/shared/)
- `requests/studentRequests.js`
- `responses/studentResponses.js`

### Service Files
- `src/services/userTransformService.js`

### Frontend Files
- `src/web/js/data/apiClient.js`
