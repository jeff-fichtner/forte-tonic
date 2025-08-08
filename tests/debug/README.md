# Integration Test with Breakpoints Guide

This guide shows you how to run integration tests for the `getInstructorByAccessCode` route with debugging capabilities.

## Quick Start

### 1. Run the Integration Test (Simple)
```bash
# Run all tests in the getInstructorByAccessCode test file
npm run test:debug-route

# Or run directly
node tests/debug/run-single-test.js

# Run a specific test by name
node tests/debug/run-single-test.js "should return instructor data for valid access code"
```

### 2. Run with Debugger/Breakpoints
```bash
# Run with Node.js debugger enabled
node tests/debug/debug-integration-test.js

# Or run a specific test with debugger
node tests/debug/debug-integration-test.js "should return instructor data for valid access code"
```

## Debugging Instructions

### Using Chrome DevTools

1. **Start the debugger test:**
   ```bash
   node tests/debug/debug-integration-test.js
   ```

2. **Open Chrome DevTools:**
   - Open Chrome browser
   - Go to `chrome://inspect`
   - Click "Open dedicated DevTools for Node"

3. **Set Breakpoints:**
   - In the DevTools Sources tab, navigate to your files
   - Set breakpoints in:
     - `tests/integration/getInstructorByAccessCode.test.js` (test file)
     - `src/controllers/userController.js` (controller code)
     - Repository or service files if needed

4. **Use Debugger Statements:**
   - Uncomment `debugger;` statements in the test file
   - Uncomment `debugger;` statements in the controller (already added)

### Debugging Features in the Test

The test file includes several debugging features:

```javascript
// Console logging for test progress
console.log('🎯 Testing valid access code: 654321');

// Breakpoint locations (uncomment to use)
// debugger;

// Detailed response logging
console.log('📥 Response received:', response.body);

// Repository call verification
expect(mockUserRepository.getInstructorByAccessCode).toHaveBeenCalledWith(accessCode);
```

### Debugging Features in the Controller

The controller now includes debug logging:

```javascript
// Request logging
console.log('🔍 DEBUG: getInstructorByAccessCode called with:', { accessCode });

// Repository result logging
console.log('🔍 DEBUG: Repository returned:', instructor ? 
  `${instructor.firstName} ${instructor.lastName} (${instructor.email})` : 
  'null'
);

// Transformation logging
console.log('🔍 DEBUG: Transformed data keys:', Object.keys(transformedData));
```

## Test Cases Covered

### ✅ Success Cases
- Valid access code returns instructor data
- Multiple instructors with different access codes
- Service integration verification

### ❌ Error Cases
- Missing access code (400 error)
- Empty access code (400 error)  
- Invalid access code (404 error)
- Null access code (400 error)

### 🔄 Edge Cases
- Access code with whitespace
- Service transformation verification
- Repository integration testing

## Sample Test Data

The test uses these mock instructors:

```javascript
// Instructor 1
{
  id: 'INSTRUCTOR1@TEST.COM',
  accessCode: '654321',
  firstName: 'John',
  lastName: 'Instructor',
  specialties: ['Piano', 'Guitar']
}

// Instructor 2  
{
  id: 'INSTRUCTOR2@TEST.COM',
  accessCode: '789012',
  firstName: 'Jane',
  lastName: 'Teacher',
  specialties: ['Violin', 'Viola']
}
```

## Test Commands Reference

```bash
# Run integration test normally
npm run test:integration

# Run single test file with debugging output
npm run test:debug-route

# Run with Node.js debugger
node tests/debug/debug-integration-test.js

# Run specific test with debugger
node tests/debug/debug-integration-test.js "valid access code"

# Run Jest directly on this file
npx jest tests/integration/getInstructorByAccessCode.test.js --verbose

# Run with coverage
npx jest tests/integration/getInstructorByAccessCode.test.js --coverage
```

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Kill processes on port 3001
   lsof -ti:3001 | xargs kill -9
   ```

2. **Module import errors:**
   ```bash
   # Ensure you're using Node.js with ES modules support
   node --version  # Should be 14+ 
   ```

3. **Jest cache issues:**
   ```bash
   # Clear Jest cache
   npx jest --clearCache
   ```

### Debug Environment Variables

```bash
# Enable detailed debugging
DEBUG=true npm run test:debug-route

# Test environment
NODE_ENV=test npm run test:debug-route
```

## Adding Your Own Breakpoints

### In Test File
```javascript
test('your test name', async () => {
  // Add breakpoint here
  debugger;
  
  const response = await request(app)
    .post('/api/getInstructorByAccessCode')
    .send({ accessCode: '654321' });
    
  // Add breakpoint here to examine response
  debugger;
  
  expect(response.status).toBe(200);
});
```

### In Controller
```javascript
static async getInstructorByAccessCode(req, res) {
  try {
    const { accessCode } = req.body;
    
    // Add breakpoint here
    debugger;
    
    // Your debugging logic here...
```

## File Structure

```
tests/
├── integration/
│   └── getInstructorByAccessCode.test.js  # Main test file
├── debug/
│   ├── debug-integration-test.js          # Debugger runner
│   ├── run-single-test.js                 # Simple runner
│   └── README.md                          # This file
```
