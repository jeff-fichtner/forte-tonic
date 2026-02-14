# API Testing Instructions

## Server

- **Port**: 3000 (default)
- **Base URL**: `http://localhost:3000`

## Start Server

```bash
npm run dev
```

## API Endpoints

### Get All Classes

```bash
curl http://localhost:3000/api/classes
```

Filter response:

```bash
curl -s http://localhost:3000/api/classes | jq '[.data[] | {id, title, isRestricted, minimumGrade, maximumGrade}]'
```

### Get All Instructors

```bash
curl http://localhost:3000/api/instructors
```

Filter response:

```bash
curl -s http://localhost:3000/api/instructors | jq '[.data[] | {id, firstName, lastName, gradeRange}]'
```

### Get Parent Registration Data

```bash
curl "http://localhost:3000/api/parent/tabs/registration?parentId=P001"
```

## Response Format

All endpoints return:

```json
{
  "success": true,
  "data": [...]
}
```

## Key Fields

### Classes

- `isRestricted`: `"TRUE"` or `null` - restricted classes hidden from parent registration
- `minimumGrade`, `maximumGrade`: `"0"` to `"8"` (0 = Kindergarten)

### Instructors

- `gradeRange`: `{ "minimum": "0", "maximum": "8" }` - grades instructor can teach

## Notes

- No authentication required for local development
- Grade 0 = Kindergarten, 1-8 = grades 1-8
