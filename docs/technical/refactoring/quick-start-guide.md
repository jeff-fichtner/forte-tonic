# Quick Start Guide - Tab Migration

**Use this guide to migrate each remaining tab**

---

## Prerequisites

✅ Phase 0, 1, and 2 complete
✅ TabController initialized in main.js
✅ NavTabs integrated with TabController
✅ Pilot tab (instructor-forte-directory) working

---

## 5-Step Migration Process

### Step 1: Create Tab Class (30-60 min)

**Location:** `src/web/js/tabs/{tabName}Tab.js`

**Template:**
```javascript
import { BaseTab } from '../core/baseTab.js';
import { Table } from '../components/table.js';

export class MyTab extends BaseTab {
  constructor() {
    super('my-tab-id'); // Must match HTML element ID
  }

  /**
   * Fetch only the data this tab needs
   */
  async fetchData(sessionInfo) {
    const response = await fetch('/api/section/tabs/my-tab', {
      signal: this.getAbortSignal(), // For cancellation
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Render the tab UI
   */
  async render() {
    const container = this.getContainer();

    // Build your UI here using this.data
    // Can reuse existing components (Table, etc.)

    container.innerHTML = `<div>Your markup</div>`;
  }

  /**
   * Optional: Attach event listeners
   */
  attachEventListeners() {
    const button = this.getContainer().querySelector('.my-button');
    if (button) {
      this.addEventListener(button, 'click', () => {
        // Handler
      });
    }
  }

  /**
   * Optional: Cleanup when tab unloads
   */
  async cleanup() {
    // Custom cleanup if needed
  }
}
```

**Tips:**
- Look at existing code in viewModel.js for the logic
- Copy helper methods (sorting, formatting, etc.) into the tab class
- Reuse existing components (Table, Select, etc.)

---

### Step 2: Create Backend Endpoint (20-30 min)

**Location:** `src/controllers/userController.js` (or appropriate controller)

**Template:**
```javascript
/**
 * Get [tab name] tab data
 * Returns only [list what data] (no [list excluded data])
 * REST: GET /api/[section]/tabs/[tab-name]
 */
static async getMyTabData(req, res) {
  const startTime = Date.now();

  try {
    const userRepository = serviceContainer.get('userRepository');

    // Fetch ONLY what this tab needs
    const [data1, data2] = await Promise.all([
      userRepository.getData1(),
      userRepository.getData2(),
    ]);

    // Transform if needed
    const responseData = {
      data1: data1,
      data2: data2,
    };

    successResponse(res, responseData, {
      req,
      startTime,
      message: '[Tab name] data retrieved successfully',
      context: { controller: 'UserController', method: 'getMyTabData' },
    });
  } catch (error) {
    logger.error('Error getting [tab name] data:', error);
    errorResponse(res, error, {
      req,
      startTime,
      context: { controller: 'UserController', method: 'getMyTabData' },
    });
  }
}
```

**Scoping Guidelines:**
- **Admin tabs:** Can get all data for selected trimester
- **Instructor tabs:** Filter by instructor ID
- **Parent tabs:** Filter by parent ID (students)
- Only include data types the tab actually uses

---

### Step 3: Add Route (5 min)

**Location:** `src/routes/api.js`

Add to the "Tab-specific data endpoints" section (around line 130):

```javascript
router.get('/section/tabs/tab-name', ControllerName.getMyTabData);
```

**Examples:**
```javascript
// Admin tabs
router.get('/admin/tabs/wait-list', RegistrationController.getAdminWaitListTabData);

// Instructor tabs
router.get('/instructor/tabs/weekly-schedule', RegistrationController.getInstructorScheduleTabData);

// Parent tabs
router.get('/parent/tabs/contact', UserController.getParentContactTabData);
```

---

### Step 4: Register Tab (5 min)

**Location:** `src/web/js/main.js` (around line 260)

Add to the registration section after InstructorDirectoryTab:

```javascript
import { MyTab } from './tabs/myTab.js';

// ... in initializeApplication() ...

const myTab = new MyTab();
tabController.registerTab('my-tab-id', myTab);
```

**Update the console.log:**
```javascript
console.log('✓ TabController initialized with 2 registered tabs');
// Increment the number each time you add a tab
```

---

### Step 5: Test & Verify (30-60 min)

#### Manual Testing

1. **Login** as appropriate user type
2. **Click the tab**
3. **Check browser console:**
   ```
   🎯 Activating tab via TabController: my-tab-id
   Loading tab: my-tab-id
   Tab loaded: my-tab-id
   ✅ Tab activated via TabController: my-tab-id
   ```
4. **Check Network tab:**
   - Request to `/api/section/tabs/tab-name`
   - Response contains ONLY expected data
   - No requests for unneeded data
5. **Verify UI:**
   - Data displays correctly
   - Interactions work (buttons, links, etc.)
   - No console errors

#### Automated Testing

1. **Run all tests:**
   ```bash
   npm test
   ```
   - Ensure all 501+ tests still pass
   - No regressions

2. **Optional: Add tab-specific tests:**
   ```javascript
   // tests/unit/tabs/myTab.test.js
   import { MyTab } from '../../../src/web/js/tabs/myTab.js';

   describe('MyTab', () => {
     it('should fetch scoped data', async () => {
       // Test tab-specific behavior
     });
   });
   ```

#### Performance Verification

1. **Note data size before:**
   - Old: ~2070 records
2. **Note data size after:**
   - New: ~XX records
3. **Calculate reduction:**
   - (2070 - XX) / 2070 * 100 = XX% reduction

---

## Tab-Specific Guides

### Low Complexity Tabs (1-2 hours each)

**parent-contact-us:**
- Data: admins only (~10 records)
- UI: Simple table (reuse #buildDirectory from viewModel)
- Endpoint: GET /api/parent/tabs/contact

**admin-wait-list:**
- Data: registrations (rock band, wait list only) (~50 records)
- UI: Simple table
- Endpoint: GET /api/admin/tabs/wait-list/:trimester

---

### Medium Complexity Tabs (3-4 hours each)

**instructor-weekly-schedule:**
- Data: registrations (for instructor), students (for instructor), classes, rooms
- UI: Multiple tables by day
- Endpoint: GET /api/instructor/tabs/weekly-schedule

**parent-weekly-schedule:**
- Data: registrations (for parent), students (for parent), instructors, classes
- UI: Schedule + wait list sections
- Endpoint: GET /api/parent/tabs/weekly-schedule/:trimester

---

### High Complexity Tabs (5-10 hours each)

**admin-master-schedule:**
- Data: registrations (for trimester), students, instructors, classes, rooms (~500 records)
- UI: Filterable table with dropdowns
- Endpoint: GET /api/admin/tabs/master-schedule/:trimester
- Note: Includes #populateFilterDropdowns, #sortRegistrations

**parent-registration:**
- Data: registrations (for parent, next trimester), students, instructors, classes
- UI: Complex form with ParentRegistrationForm workflow
- Endpoint: GET /api/parent/tabs/registration
- Note: Reuse existing ParentRegistrationForm component

**admin-registration:**
- Data: registrations (for trimester), students, instructors, classes, rooms
- UI: Complex form with AdminRegistrationForm workflow
- Endpoint: GET /api/admin/tabs/registration/:trimester
- Note: Reuse existing AdminRegistrationForm component

---

## Common Patterns

### Reusing Existing Components

**Table:**
```javascript
import { Table } from '../components/table.js';

this.table = new Table(
  'table-id',
  ['Column 1', 'Column 2'],
  (row) => `<td>${row.data}</td>`,
  this.data.rows,
  (event) => { /* click handler */ }
);
```

**Copying Helper Methods:**
```javascript
// In tab class
#sortItems(items) {
  // Copy logic from viewModel.js
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

#formatDate(date) {
  // Copy logic from viewModel.js or utilities
  return new Date(date).toLocaleDateString();
}
```

### Session-Aware Data Fetching

**For instructor tabs:**
```javascript
async fetchData(sessionInfo) {
  const instructorId = sessionInfo?.user?.instructor?.id;
  if (!instructorId) {
    throw new Error('No instructor ID found');
  }

  // Fetch instructor-specific data
  const response = await fetch(
    `/api/instructor/tabs/my-tab?instructorId=${instructorId}`
  );
  return response.json();
}
```

**For parent tabs:**
```javascript
async fetchData(sessionInfo) {
  const parentId = sessionInfo?.user?.parent?.id;
  if (!parentId) {
    throw new Error('No parent ID found');
  }

  // Fetch parent-specific data
  const response = await fetch(
    `/api/parent/tabs/my-tab?parentId=${parentId}`
  );
  return response.json();
}
```

---

## Troubleshooting

### Tab doesn't load

**Check:**
1. Tab ID in constructor matches HTML element ID
2. Tab is registered in main.js
3. Route is added to api.js
4. Backend endpoint exists and works

**Debug:**
```javascript
console.log('Registered tabs:', window.tabController.getRegisteredTabIds());
console.log('Is registered:', window.tabController.isTabRegistered('my-tab-id'));
```

### Data not scoped correctly

**Check:**
1. Backend endpoint filters by user ID
2. Frontend passes correct session info
3. API response includes only needed data

**Debug:**
```javascript
// In tab class
async fetchData(sessionInfo) {
  console.log('Session info:', sessionInfo);
  const response = await fetch('/api/...');
  const data = await response.json();
  console.log('Fetched data:', data);
  return data;
}
```

### UI doesn't render

**Check:**
1. render() method is implemented
2. this.data is populated after fetchData()
3. Container element exists in HTML
4. No JavaScript errors in console

**Debug:**
```javascript
async render() {
  console.log('Rendering with data:', this.data);
  const container = this.getContainer();
  console.log('Container:', container);
  // ... render logic
}
```

---

## Rollback

If issues occur:

**Remove tab registration:**
```javascript
// In main.js - comment out:
// const myTab = new MyTab();
// tabController.registerTab('my-tab-id', myTab);
```

Tab will automatically fall back to legacy behavior!

---

## Commit Message Template

```
feat(refactor): Phase 3.X - Migrate [tab name] to TabController

## [Tab Name] Migration Complete

Migrated [tab name] tab to use new tab-based architecture with
independent data fetching.

### Changes

1. Created [TabClass]
   - Fetches only [data types] (~XX records)
   - Renders [description of UI]
   - XX% data reduction (from 2070 to XX records)

2. Created backend endpoint
   - GET /api/[section]/tabs/[tab-name]
   - Scoped to [user type]

3. Registered tab with TabController

### Test Results

- All XXX tests passing ✅
- Manual testing verified
- Network inspection confirmed data reduction

### Migration Status

- Complete: X/8 tabs
- Remaining: X/8 tabs

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Next Tab to Migrate

**Recommended:** `parent-contact-us`
- **Complexity:** LOW
- **Time:** 1-2 hours
- **Data:** admins only (~10 records)
- **Pattern:** Same as instructor-forte-directory

Good luck! 🚀
