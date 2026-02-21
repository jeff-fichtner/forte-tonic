# Data Model: TypeScript Migration

**Feature**: 002-typescript-migration
**Date**: 2026-02-20

This document defines the TypeScript interfaces for all entities in the Tonic codebase. These interfaces formalize the existing data shapes — no new fields or relationships are introduced.

## Model Interfaces

### Student

```typescript
interface StudentData {
  id?: string;
  studentId?: string;  // alias for id (accepted by constructor)
  firstName: string;
  lastName: string;
  firstNickname?: string | null;
  lastNickname?: string | null;
  email?: string | null;
  grade?: string;
  parent1Id?: string;
  parent2Id?: string;
  parentEmails?: string;
}

interface StudentJSON {
  id: string;
  firstName: string;       // returns nickname if set
  lastName: string;        // returns nickname if set
  firstNickname: string | null;
  lastNickname: string | null;
  grade: string;
  parent1Id: string;
  parent2Id: string;
  parentEmails: string;
  email: string | null;
  fullName: string;
}
```

### Admin

```typescript
interface AdminData {
  id: string;
  email: string;
  lastName: string;
  firstName: string;
  phoneNumber?: string | null;
  accessCode?: string | null;
  role?: string | null;
  displayEmail?: string | null;
  displayPhone?: string | null;
  isDirector?: boolean;
  isActive?: boolean;
}

interface AdminJSON {
  id: string;
  email: string;
  lastName: string;
  firstName: string;
  phone: string | null;        // note: maps from phoneNumber
  fullName: string;
  displayName: string;
  displayEmail: string | null;
  displayPhone: string | null;
  accessCode: string | null;
  role: string | null;
  isDirector: boolean;
  isActive: boolean;
}
```

### Instructor

```typescript
interface DayAvailability {
  isAvailable: string;         // "TRUE"/"FALSE" from sheet
  startTime: string;
  endTime: string;
  roomId: string;
}

interface InstructorAvailability {
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
}

interface GradeRange {
  minimum: string;
  maximum: string;
}

interface InstructorData {
  id: string;
  email?: string | null;
  lastName?: string | null;
  firstName?: string | null;
  phoneNumber?: string | null;
  accessCode?: string | null;
  displayEmail?: string | null;
  displayPhone?: string | null;
  specialties?: string[] | null;
  isActive?: boolean;
  role?: string | null;
  availability?: InstructorAvailability | null;
  gradeRange?: GradeRange | null;
}

interface InstructorJSON {
  id: string;
  email: string | null;
  lastName: string;
  firstName: string;
  phone: string | null;        // maps from phoneNumber
  fullName: string;
  displayName: string;
  displayEmail: string | null;
  displayPhone: string | null;
  specialties: string[] | null;
  isActive: boolean;
  availability: InstructorAvailability | null;
  gradeRange: GradeRange | null;
  role: string | null;
}
```

### Parent

```typescript
interface ParentData {
  id: string;
  email: string;
  lastName: string;
  firstName: string;
  phone?: string | null;
  accessCode?: string | null;
}

interface ParentJSON {
  id: string;
  email: string;
  lastName: string;
  firstName: string;
  phone: string | null;
  fullName: string;
  displayName: string;
}
```

### Room

```typescript
interface RoomData {
  id: string;
  name: string;
  altName?: string | null;
  includeRoomId?: boolean;
}

interface RoomJSON {
  id: string;
  name: string;
  altName: string | null;
  includeRoomId: boolean;
  formattedName: string;
  displayName: string;
  identifier: string;
}
```

### Class

```typescript
interface ClassData {
  id: string;
  instructorId: string;
  day: string;
  startTime: string;
  length: number;
  endTime: string;
  instrument: string;
  title: string;
  size?: string | null;
  minimumGrade?: string | null;
  maximumGrade?: string | null;
  isRestricted?: string | null;
}

interface ClassJSON {
  id: string;
  instructorId: string;
  day: string;
  startTime: string;
  length: number;
  endTime: string;
  instrument: string;
  title: string;
  size: string | null;
  minimumGrade: string | null;
  maximumGrade: string | null;
  isRestricted: string | null;
  formattedStartTime: string;
  formattedEndTime: string;
  formattedMinimumGrade: string;
  formattedMaximumGrade: string;
  formattedName: string;
  durationMinutes: number;
  formattedDuration: string;
  timeSlot: string;
}
```

### Registration

```typescript
type RegistrationType = 'private' | 'group';
type ReenrollmentIntent = 'keep' | 'drop' | 'change';

interface RegistrationData {
  id?: string;
  studentId: string;
  instructorId: string;
  day: string;
  startTime: string;
  length?: string | number;
  registrationType: string;    // normalized to RegistrationType in constructor
  roomId?: string;
  instrument?: string;
  transportationType?: string;
  notes?: string;
  classId?: string;
  classTitle?: string;
  expectedStartDate?: string | Date | null;
  createdAt?: string | Date;
  createdBy?: string;
  reenrollmentIntent?: ReenrollmentIntent | null;
  intentSubmittedAt?: string | Date | null;
  intentSubmittedBy?: string | null;
  linkedPreviousRegistrationId?: string | null;
  isWaitlistClass?: boolean;
}

interface RegistrationJSON {
  id: string;
  studentId: string;
  instructorId: string;
  day: string;
  startTime: string;
  length: number | null;
  registrationType: RegistrationType;
  roomId: string;
  instrument: string;
  transportationType: string;
  notes: string;
  classId: string;
  classTitle: string;
  expectedStartDate: Date | null;
  createdAt: Date;
  createdBy: string;
  reenrollmentIntent: ReenrollmentIntent | null;
  intentSubmittedAt: Date | null;
  intentSubmittedBy: string | null;
  linkedPreviousRegistrationId: string | null;
  isWaitlistClass: boolean;
}
```

### AttendanceRecord

```typescript
interface AttendanceRecordData {
  registrationId: string;
  createdAt?: string | Date;
  createdBy?: string;
}
```

### Response Models

```typescript
interface AuthenticatedUserResponseData {
  email: string;
  admin?: AdminData | null;
  instructor?: InstructorData | null;
  parent?: ParentData | null;
}

interface AuthenticatedUserResponseJSON {
  email: string;
  admin: AdminJSON | null;
  instructor: InstructorJSON | null;
  parent: ParentJSON | null;
  displayName: string;
}

interface Period {
  periodType: string;
  trimester: string;
  targetTrimester: string;
  startDate: string;
}

interface AppConfigurationResponseData {
  currentPeriod?: Period | null;
  nextPeriod?: Period | null;
  rockBandClassIds?: string[];
  currentTrimester?: string | null;
  nextTrimester?: string | null;
  availableTrimesters?: string[];
  defaultTrimester?: string | null;
  maintenanceMode?: boolean;
  maintenanceMessage?: string | null;
}
```

## Enums and Constants

```typescript
// src/models/shared/instruments.ts
const Instruments = {
  PIANO: 'Piano',
  VOICE: 'Voice',
  GUITAR: 'Guitar',
  BASS_GUITAR: 'Bass Guitar',
  UKULELE: 'Ukulele',
  DRUMS: 'Drums',
  VIOLIN: 'Violin',
} as const;

// src/models/shared/lengthOptions.ts
const LengthOptions = {
  THIRTY_MINUTES: 30,
  FORTY_FIVE_MINUTES: 45,
  SIXTY_MINUTES: 60,
} as const;
```

## Infrastructure Types

### Service Container

```typescript
interface ServiceContainer {
  get<T>(key: string): T;
  register(key: string, factory: () => unknown): void;
  resolve<T>(key: string): T;
}
```

### Repository Interface

```typescript
interface IRepository<T> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
}
```

## Relationships

```
Student --parent1Id--> Parent
Student --parent2Id--> Parent
Registration --studentId--> Student
Registration --instructorId--> Instructor
Registration --classId--> Class (when registrationType = 'group')
Registration --roomId--> Room
Class --instructorId--> Instructor
```

All relationships are string ID references. No foreign key enforcement — Google Sheets has no referential integrity. Lookups are done by scanning cached records.
