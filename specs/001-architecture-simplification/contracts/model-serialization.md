# Model Serialization Contract

Every model MUST define exactly one `toJSON()` method. Express `res.json()` calls `toJSON()` automatically. No other serialization methods (`toDataObject()`, `toDatabaseModel()`) should exist.

## Target `toJSON()` Output Per Model

### Student

```json
{
  "id": "string",
  "firstName": "string",
  "lastName": "string",
  "firstNickname": "string|null",
  "lastNickname": "string|null",
  "grade": "string",
  "parent1Id": "string|null",
  "parent2Id": "string|null",
  "parentEmails": "string",
  "email": "string|null",
  "fullName": "string"
}
```

### Registration

```json
{
  "id": "string (UUID)",
  "studentId": "string",
  "instructorId": "string",
  "day": "string",
  "startTime": "string",
  "length": "number",
  "registrationType": "string (private|group)",
  "roomId": "string|null",
  "instrument": "string",
  "transportationType": "string|null",
  "notes": "string|null",
  "classId": "string|null",
  "classTitle": "string|null",
  "expectedStartDate": "string (ISO)|null",
  "createdAt": "string (ISO)",
  "createdBy": "string",
  "reenrollmentIntent": "string|null",
  "intentSubmittedAt": "string|null",
  "intentSubmittedBy": "string|null",
  "linkedPreviousRegistrationId": "string|null",
  "isWaitlistClass": "boolean"
}
```

### Instructor

```json
{
  "id": "string",
  "email": "string",
  "lastName": "string",
  "firstName": "string",
  "phone": "string|null",
  "fullName": "string",
  "displayName": "string",
  "displayEmail": "string|null",
  "displayPhone": "string|null",
  "specialties": ["string"],
  "isActive": "boolean",
  "availability": { "monday": {}, "tuesday": {}, ... },
  "gradeRange": { "minimum": "string|null", "maximum": "string|null" },
  "role": "string"
}
```

### Admin

```json
{
  "id": "string",
  "email": "string",
  "lastName": "string",
  "firstName": "string",
  "phone": "string|null",
  "fullName": "string",
  "displayName": "string",
  "displayEmail": "string|null",
  "displayPhone": "string|null",
  "accessCode": "string",
  "role": "string",
  "isDirector": "boolean",
  "isActive": "boolean"
}
```

Note: `phone` replaces `phoneNumber` to match the database column name.

### Parent

```json
{
  "id": "string",
  "email": "string",
  "lastName": "string",
  "firstName": "string",
  "phone": "string|null",
  "fullName": "string",
  "displayName": "string"
}
```

### Class

```json
{
  "id": "string",
  "instructorId": "string",
  "day": "string",
  "startTime": "string",
  "length": "number",
  "endTime": "string",
  "instrument": "string",
  "title": "string",
  "size": "number|null",
  "minimumGrade": "string|null",
  "maximumGrade": "string|null",
  "isRestricted": "boolean",
  "formattedStartTime": "string",
  "formattedEndTime": "string",
  "formattedName": "string"
}
```

### Room

```json
{
  "id": "string",
  "name": "string",
  "altName": "string|null",
  "includeRoomId": "boolean",
  "formattedName": "string",
  "displayName": "string"
}
```
