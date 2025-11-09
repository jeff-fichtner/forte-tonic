# Frontend Data Independence Architecture

**Last Updated:** 2025-11-08
**Status:** PLANNING - Architecture design phase
**Priority:** HIGH - Reduces complexity, improves maintainability
**Related:** [es-modules-cleanup.md](./backlog/es-modules-cleanup.md), [model-agnostic-db-client.md](./backlog/model-agnostic-db-client.md)

---

## Overview

**Goal:** Refactor the frontend architecture to eliminate all data dependencies between tabs/views. Each tab should independently query all data it needs when loaded, and server responses should include all data needed to refresh the UI after mutations.

### Current Architecture (Problematic)

```
┌─────────────────────────────────────────────────────────────┐
│                       viewModel.js                          │
│  Singleton instance with shared state across all tabs       │
│                                                              │
│  Properties (loaded once at initialization):                │
│    • this.admins = [...]         ← Shared state             │
│    • this.instructors = [...]    ← Shared state             │
│    • this.students = [...]       ← Shared state             │
│    • this.registrations = [...]  ← Shared state             │
│    • this.classes = [...]        ← Shared state             │
│    • this.rooms = [...]          ← Shared state             │
└─────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼────┐      ┌─────▼──────┐    ┌────▼────┐
   │  Tab 1  │      │   Tab 2    │    │  Tab 3  │
   │ (Admin) │      │ (Parent)   │    │ (Instr) │
   └─────────┘      └────────────┘    └─────────┘

   All tabs access shared viewModel data
   Changes in one tab affect others
   Data staleness across tabs
   Complex dependency tracking
```

**Problems:**
1. **Shared State Pollution:** All tabs share the same data arrays, creating hidden dependencies
2. **Stale Data:** Tab switches don't refresh data, users see outdated information
3. **Coupling:** Adding/modifying features in one tab can break others
4. **Hard to Test:** Shared state makes unit testing difficult
5. **Memory Issues:** All data loaded upfront regardless of which tabs user visits
6. **Race Conditions:** Concurrent updates to shared arrays create bugs

### Target Architecture (Independent Tabs)

```
┌─────────────────────────────────────────────────────────────┐
│                    TabController.js                          │
│  Lightweight coordinator - NO shared data state              │
│  Only manages: routing, auth, period detection              │
└─────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────▼────┐      ┌─────▼──────┐    ┌────▼────┐
   │ AdminTab│      │ ParentTab  │    │InstrTab │
   │         │      │            │    │         │
   │ onLoad()│      │  onLoad()  │    │onLoad() │
   │    ↓    │      │     ↓      │    │   ↓     │
   │ fetch() │      │  fetch()   │    │fetch()  │
   └─────────┘      └────────────┘    └─────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                    ┌─────▼──────┐
                    │ API Server │
                    │ Returns:   │
                    │ • Data     │
                    │ • Fresh    │
                    │   copies   │
                    └────────────┘
```

**Benefits:**
1. **No Shared State:** Each tab owns its data, no cross-contamination
2. **Always Fresh:** Data fetched on every tab load
3. **Independent:** Tabs can be developed, tested, deployed independently
4. **Lazy Loading:** Only fetch data for tabs user actually visits
5. **Simpler:** Easier to reason about, easier to maintain
6. **Scalable:** New tabs don't affect existing ones

---

## Problem Analysis

### Current State Assessment

#### 1. ViewModel Initialization (src/web/js/viewModel.js:213-240)

```javascript
// Current: All data loaded once at initialization
constructor(appConfig) {
  const {
    admins, instructors, students, parents,
    registrations, classes, rooms, currentPeriod
  } = appConfig;

  this.admins = admins;              // ← SHARED STATE
  this.instructors = instructors;    // ← SHARED STATE
  this.students = students;          // ← SHARED STATE
  this.registrations = registrations.map(...); // ← SHARED STATE
  this.classes = classes;            // ← SHARED STATE
  this.rooms = rooms;                // ← SHARED STATE
}
```

**Issues:**
- Single massive fetch on page load (slow initial load)
- Data never refreshes unless page reloaded
- All tabs share same object references
- Mutations in one tab affect all others

#### 2. Tab Switching (src/web/js/components/navTabs.js:29-60)

```javascript
// Current: Just shows/hides DOM, no data refresh
tabsContainer.addEventListener('click', event => {
  const targetTab = tabLink.getAttribute('href');

  // Show/hide tabs
  tabContents.forEach(content => {
    content.hidden = content.id !== targetContent.id;
  });

  // ❌ NO DATA FETCHING - just shows stale cached data
});
```

**Issues:**
- No `onLoad` hook for tabs
- No way to trigger data refresh
- No way for tab to declare data dependencies

#### 3. Data Mutation (e.g., Creating Registration)

```javascript
// Current: Server returns single updated item
// POST /api/registrations → { success: true, registration: {...} }

// Frontend must manually update local cache
this.registrations.push(newRegistration);
this.#refreshTable();  // ← May be stale if other data changed
```

**Issues:**
- Manual cache management error-prone
- Other related data not refreshed (e.g., student state, class counts)
- Complex cascade of updates required

### Root Causes

1. **Singleton Pattern:** ViewModel is a god object holding all state
2. **No Tab Lifecycle:** Tabs have no `onLoad()`, `onUnload()`, `refresh()` hooks
3. **No Data Contracts:** Tabs don't declare what data they need
4. **Inadequate API Responses:** Mutations return single item, not full context
5. **No Staleness Detection:** No way to know if cached data is outdated

---

## Proposed Architecture

### 1. Tab Controller Pattern

**Create:** `src/web/js/core/tabController.js`

```javascript
/**
 * TabController - Lightweight coordinator for independent tabs
 *
 * Responsibilities:
 *  - Tab routing and visibility
 *  - Authentication/authorization checks
 *  - Period detection and availability
 *  - Tab lifecycle management
 *
 * Does NOT:
 *  - Store data (tabs own their data)
 *  - Share state between tabs
 *  - Manage business logic
 */
export class TabController {
  constructor() {
    this.currentTab = null;
    this.tabs = new Map(); // TabId → TabInstance
    this.sessionInfo = null; // Auth, period, user info only
  }

  /**
   * Register a tab component
   */
  registerTab(tabId, tabInstance) {
    if (!tabInstance.onLoad || !tabInstance.onUnload) {
      throw new Error(`Tab ${tabId} must implement onLoad() and onUnload()`);
    }
    this.tabs.set(tabId, tabInstance);
  }

  /**
   * Switch to a tab (triggers lifecycle)
   */
  async activateTab(tabId) {
    // Unload current tab
    if (this.currentTab) {
      const current = this.tabs.get(this.currentTab);
      await current.onUnload();
    }

    // Load new tab
    const next = this.tabs.get(tabId);
    if (!next) {
      throw new Error(`Tab not found: ${tabId}`);
    }

    await next.onLoad();
    this.currentTab = tabId;

    // Update DOM visibility
    this.#updateTabVisibility(tabId);
  }

  /**
   * Get session info (lightweight, no data)
   */
  getSessionInfo() {
    return {
      user: this.sessionInfo.user,        // User type, ID, email only
      currentPeriod: this.sessionInfo.currentPeriod,
      availableTrimesters: this.sessionInfo.availableTrimesters,
      permissions: this.sessionInfo.permissions,
    };
  }

  #updateTabVisibility(activeTabId) {
    document.querySelectorAll('.tab-content').forEach(content => {
      content.hidden = content.id !== activeTabId;
    });
  }
}
```

---

### 2. Tab Base Class

**Create:** `src/web/js/core/baseTab.js`

```javascript
/**
 * BaseTab - Base class for all independent tabs
 *
 * Enforces lifecycle hooks and provides common utilities
 */
export class BaseTab {
  constructor(tabId, httpService) {
    this.tabId = tabId;
    this.http = httpService;
    this.data = {}; // Tab-owned data, not shared
    this.isLoaded = false;
  }

  /**
   * Called when tab becomes active
   * Override in subclass to fetch data
   */
  async onLoad() {
    console.log(`Loading tab: ${this.tabId}`);
    this.data = await this.fetchData();
    await this.render();
    this.isLoaded = true;
  }

  /**
   * Called when tab becomes inactive
   * Override in subclass to cleanup
   */
  async onUnload() {
    console.log(`Unloading tab: ${this.tabId}`);
    this.data = {}; // Clear data to free memory
    this.isLoaded = false;
  }

  /**
   * Subclass implements data fetching
   */
  async fetchData() {
    throw new Error('fetchData() must be implemented by subclass');
  }

  /**
   * Subclass implements rendering
   */
  async render() {
    throw new Error('render() must be implemented by subclass');
  }

  /**
   * Refresh tab (re-fetch and re-render)
   */
  async refresh() {
    await this.onLoad();
  }
}
```

---

### 3. Example: Admin Master Schedule Tab

**Create:** `src/web/js/tabs/adminMasterScheduleTab.js`

```javascript
import { BaseTab } from '../core/baseTab.js';

/**
 * AdminMasterScheduleTab - Independent tab for admin master schedule
 */
export class AdminMasterScheduleTab extends BaseTab {
  constructor(httpService, trimester) {
    super('admin-master-schedule', httpService);
    this.trimester = trimester;
  }

  /**
   * Fetch ALL data needed for master schedule
   * No dependencies on other tabs
   */
  async fetchData() {
    // Single API call returns everything this tab needs
    const response = await this.http.get(
      `/api/admin/master-schedule/${this.trimester}`
    );

    return {
      classes: response.classes,           // All classes for trimester
      registrations: response.registrations, // All registrations
      instructors: response.instructors,   // All instructors
      rooms: response.rooms,               // All rooms
      students: response.students,         // All students
      metadata: response.metadata,         // Counts, stats, etc.
    };
  }

  /**
   * Render the master schedule table
   */
  async render() {
    const container = document.getElementById(this.tabId);

    // Build schedule table from this.data
    const scheduleHtml = this.#buildScheduleTable(
      this.data.classes,
      this.data.registrations,
      this.data.instructors,
      this.data.rooms
    );

    container.innerHTML = scheduleHtml;

    // Attach event handlers
    this.#attachEventHandlers();
  }

  /**
   * Handle trimester change (external event)
   */
  async changeTrimester(newTrimester) {
    this.trimester = newTrimester;
    await this.refresh(); // Re-fetch and re-render
  }

  #buildScheduleTable(classes, registrations, instructors, rooms) {
    // Table building logic (same as current, but uses local data)
    // ...
  }

  #attachEventHandlers() {
    // Event handler attachment
    // ...
  }
}
```

---

### 4. Example: Parent Registration Tab

**Create:** `src/web/js/tabs/parentRegistrationTab.js`

```javascript
import { BaseTab } from '../core/baseTab.js';

/**
 * ParentRegistrationTab - Independent tab for parent registration
 */
export class ParentRegistrationTab extends BaseTab {
  constructor(httpService, parentId) {
    super('parent-registration', httpService);
    this.parentId = parentId;
  }

  /**
   * Fetch ONLY data needed for parent's registrations
   * Much smaller dataset than admin tabs
   */
  async fetchData() {
    // Returns only THIS parent's data
    const response = await this.http.get(
      `/api/parents/${this.parentId}/registration-view`
    );

    return {
      students: response.students,         // Parent's students only
      registrations: response.registrations, // Parent's registrations only
      availableClasses: response.availableClasses, // Classes parent can enroll in
      currentPeriod: response.currentPeriod,
      trimester: response.trimester,
    };
  }

  /**
   * Render parent registration view
   */
  async render() {
    const container = document.getElementById(this.tabId);

    const html = this.#buildRegistrationForm(
      this.data.students,
      this.data.registrations,
      this.data.availableClasses
    );

    container.innerHTML = html;
    this.#attachFormHandlers();
  }

  /**
   * Create new registration
   * Server returns FULL updated dataset for parent
   */
  async createRegistration(registrationData) {
    const response = await this.http.post(
      `/api/parents/${this.parentId}/registrations`,
      registrationData
    );

    // Response includes ALL updated data
    this.data = {
      students: response.students,
      registrations: response.registrations,     // ← Fresh copy
      availableClasses: response.availableClasses, // ← May have changed
      currentPeriod: response.currentPeriod,
      trimester: response.trimester,
    };

    // Re-render with fresh data
    await this.render();
  }

  #buildRegistrationForm(students, registrations, availableClasses) {
    // Form building logic
    // ...
  }

  #attachFormHandlers() {
    // Event handlers
    // ...
  }
}
```

---

### 5. API Response Pattern

**Key Change:** API mutations return complete datasets, not single items

#### Current Pattern (Problematic)
```javascript
// POST /api/registrations
{
  "success": true,
  "registration": { id: "123", studentId: "456", ... } // ← Single item
}

// Frontend must manually update cache:
this.registrations.push(registration); // ← Error-prone
```

#### New Pattern (Tab-Friendly)
```javascript
// POST /api/parents/{parentId}/registrations
{
  "success": true,
  "data": {
    "students": [...],           // ← Full fresh list
    "registrations": [...],      // ← All parent's registrations
    "availableClasses": [...],   // ← Updated availability
    "metadata": { ... }          // ← Counts, stats, etc.
  }
}

// Frontend replaces entire dataset:
this.data = response.data; // ← Simple, correct
await this.render();
```

**Benefits:**
- No manual cache management
- Always consistent data
- Server controls what's fresh
- Simpler client logic

---

## Implementation Plan

### Phase 0: Preparation & Analysis (2-3 hours)

#### Step 0.1: Inventory Current Files
- [ ] List all current tab views in `src/web/index.html`
- [ ] Document which methods in `viewModel.js` belong to which tabs
- [ ] Identify all API endpoints currently used
- [ ] Map current data dependencies (which tabs use which data)
- [ ] Create migration priority order (simplest to most complex)

#### Step 0.2: Backup & Branch
- [ ] Create feature branch: `git checkout -b refactor/frontend-data-independence`
- [ ] Document current state in `dev/plans/frontend-data-independence-progress.md`
- [ ] Take performance baseline measurements (load times, memory usage)

---

### Phase 1: Core Infrastructure (Week 1)

#### Step 1.1: Create Core Classes (4 hours)

**File: `src/web/js/core/tabController.js`** (NEW FILE)
- [ ] Create file with class skeleton
- [ ] Implement `constructor()`
  - [ ] Initialize `this.currentTab = null`
  - [ ] Initialize `this.tabs = new Map()`
  - [ ] Initialize `this.sessionInfo = null`
- [ ] Implement `registerTab(tabId, tabInstance)`
  - [ ] Validate tab has `onLoad()` method
  - [ ] Validate tab has `onUnload()` method
  - [ ] Add to `this.tabs` Map
- [ ] Implement `async activateTab(tabId)`
  - [ ] Call `currentTab.onUnload()` if exists
  - [ ] Call `nextTab.onLoad()`
  - [ ] Update `this.currentTab`
  - [ ] Call `#updateTabVisibility(tabId)`
- [ ] Implement `getSessionInfo()`
  - [ ] Return session data (user, period, permissions)
- [ ] Implement `#updateTabVisibility(activeTabId)` (private)
  - [ ] Hide all `.tab-content` elements
  - [ ] Show only active tab content
- [ ] Add JSDoc comments to all methods
- [ ] Export `TabController` class

**File: `src/web/js/core/baseTab.js`** (NEW FILE)
- [ ] Create file with class skeleton
- [ ] Implement `constructor(tabId, httpService)`
  - [ ] Set `this.tabId = tabId`
  - [ ] Set `this.http = httpService`
  - [ ] Initialize `this.data = {}`
  - [ ] Initialize `this.isLoaded = false`
- [ ] Implement `async onLoad()`
  - [ ] Log loading message
  - [ ] Call `this.fetchData()`
  - [ ] Store result in `this.data`
  - [ ] Call `this.render()`
  - [ ] Set `this.isLoaded = true`
- [ ] Implement `async onUnload()`
  - [ ] Log unloading message
  - [ ] Clear `this.data = {}`
  - [ ] Set `this.isLoaded = false`
- [ ] Implement `async fetchData()` (throws error - subclass must override)
- [ ] Implement `async render()` (throws error - subclass must override)
- [ ] Implement `async refresh()`
  - [ ] Call `this.onLoad()`
- [ ] Add JSDoc comments to all methods
- [ ] Export `BaseTab` class

**File: `tests/unit/core/tabController.test.js`** (NEW FILE)
- [ ] Test `registerTab()` validates tab interface
- [ ] Test `registerTab()` adds tab to Map
- [ ] Test `activateTab()` calls onUnload on previous tab
- [ ] Test `activateTab()` calls onLoad on new tab
- [ ] Test `activateTab()` updates currentTab property
- [ ] Test `getSessionInfo()` returns session data

**File: `tests/unit/core/baseTab.test.js`** (NEW FILE)
- [ ] Test `onLoad()` calls fetchData()
- [ ] Test `onLoad()` calls render()
- [ ] Test `onLoad()` sets isLoaded = true
- [ ] Test `onUnload()` clears data
- [ ] Test `onUnload()` sets isLoaded = false
- [ ] Test `fetchData()` throws error (must override)
- [ ] Test `render()` throws error (must override)
- [ ] Test `refresh()` calls onLoad()

#### Step 1.2: Update HttpService (2 hours)

**File: `src/web/js/data/httpService.js`** (EXISTING FILE)
- [ ] Review current implementation
- [ ] Add method `getTabData(endpoint)` (wrapper for GET with error handling)
- [ ] Add method `postTabData(endpoint, data)` (wrapper for POST)
- [ ] Add method `patchTabData(endpoint, data)` (wrapper for PATCH)
- [ ] Add method `deleteTabData(endpoint)` (wrapper for DELETE)
- [ ] Add response envelope validation
  - [ ] Check for `success` property
  - [ ] Check for `data` property
  - [ ] Check for `error` property on failure
- [ ] Add tab-specific error handling
  - [ ] Log errors with tab context
  - [ ] Format user-friendly error messages
- [ ] Test all new methods

**File: `tests/unit/data/httpService.test.js`** (EXISTING FILE)
- [ ] Add tests for `getTabData()`
- [ ] Add tests for `postTabData()`
- [ ] Add tests for `patchTabData()`
- [ ] Add tests for `deleteTabData()`
- [ ] Test response envelope validation
- [ ] Test error handling

#### Step 1.3: Session Management (2 hours)

**File: `src/web/js/services/sessionService.js`** (NEW FILE)
- [ ] Create file with class skeleton
- [ ] Implement `constructor(httpService)`
- [ ] Implement `async initialize()`
  - [ ] Fetch session info from `/api/session`
  - [ ] Store user info
  - [ ] Store current period
  - [ ] Store available trimesters
  - [ ] Store permissions
- [ ] Implement `getUser()`
- [ ] Implement `getCurrentPeriod()`
- [ ] Implement `getAvailableTrimesters()`
- [ ] Implement `getPermissions()`
- [ ] Implement `isAdmin()`
- [ ] Implement `isParent()`
- [ ] Implement `isInstructor()`
- [ ] Export `SessionService` class

**File: `src/web/js/viewModel.js`** (EXISTING FILE - EXTRACT)
- [ ] Identify session-related properties
  - [ ] Find `this.currentUser` usage
  - [ ] Find `this.currentPeriod` usage
  - [ ] Find `this.permissions` usage
- [ ] Extract to SessionService (DO NOT DELETE YET)
- [ ] Add TODO comments marking for future removal
- [ ] Keep backward compatibility during migration

**File: `tests/unit/services/sessionService.test.js`** (NEW FILE)
- [ ] Test `initialize()` fetches session data
- [ ] Test `getUser()` returns user info
- [ ] Test `getCurrentPeriod()` returns period
- [ ] Test `isAdmin()`, `isParent()`, `isInstructor()` return correct booleans

---

### Phase 2: First Tab Migration (Week 2)

**Start with simplest tab to prove pattern**

#### Step 2.1: Choose Pilot Tab - Instructor Directory (6 hours)
**Recommended:** Instructor Directory (read-only, simple data)

**File: `src/web/js/tabs/instructorDirectoryTab.js`** (NEW FILE)
- [ ] Create file extending `BaseTab`
- [ ] Implement `constructor(httpService)`
  - [ ] Call `super('instructor-directory', httpService)`
- [ ] Implement `async fetchData()`
  - [ ] Call `this.http.getTabData('/api/instructors/directory')`
  - [ ] Return `{ instructors: response.data.instructors }`
- [ ] Implement `async render()`
  - [ ] Get container: `document.getElementById('instructor-directory')`
  - [ ] Build table HTML from `this.data.instructors`
  - [ ] Set `container.innerHTML = tableHtml`
  - [ ] Attach any event listeners (if needed)
- [ ] Implement `#buildDirectoryTable(instructors)` (private helper)
  - [ ] Generate table rows
  - [ ] Include: name, email, phone, subjects
  - [ ] Apply current styling/classes
- [ ] Add JSDoc comments
- [ ] Export class

**File: `src/controllers/instructorController.js`** (EXISTING FILE)
- [ ] Add new method `async getDirectoryView(req, res)`
  - [ ] Fetch all active instructors from repository
  - [ ] Format response: `{ success: true, data: { instructors: [...] } }`
  - [ ] Add error handling
- [ ] Add JSDoc comments

**File: `src/routes/instructorRoutes.js`** (EXISTING FILE)
- [ ] Add route: `router.get('/directory', instructorController.getDirectoryView)`
- [ ] Add authentication middleware
- [ ] Test route responds correctly

**File: `src/web/index.html`** (EXISTING FILE)
- [ ] Locate instructor directory tab content section
- [ ] Verify ID matches: `id="instructor-directory"`
- [ ] Add data attribute: `data-tab-class="InstructorDirectoryTab"`
- [ ] Document expected structure

**File: `tests/unit/tabs/instructorDirectoryTab.test.js`** (NEW FILE)
- [ ] Test `fetchData()` calls correct endpoint
- [ ] Test `fetchData()` returns instructors array
- [ ] Test `render()` builds table HTML
- [ ] Test `render()` includes all instructor fields
- [ ] Test `onLoad()` integration (fetch + render)
- [ ] Test `onUnload()` clears data

**File: `tests/integration/instructorDirectory.test.js`** (NEW FILE)
- [ ] Test `GET /api/instructors/directory` returns data
- [ ] Test response format matches expected envelope
- [ ] Test authentication required
- [ ] Test error handling (no instructors, DB error)

#### Step 2.2: Update NavTabs Component (3 hours)

**File: `src/web/js/components/navTabs.js`** (EXISTING FILE)
- [ ] Add import: `import { TabController } from '../core/tabController.js'`
- [ ] Add property: `this.tabController = null`
- [ ] Add method `setTabController(controller)`
  - [ ] Store controller reference
- [ ] Update tab click handler (line ~29-60)
  - [ ] Before hiding/showing, check if `this.tabController` exists
  - [ ] If exists, call `await this.tabController.activateTab(targetTabId)`
  - [ ] If not exists, use old DOM-only logic (backward compatible)
- [ ] Keep existing trimester selector logic
- [ ] Add error handling for tab activation failures
- [ ] Add loading state during tab switch (optional)

**File: `src/web/js/app.js` or main entry point** (EXISTING FILE - OR CREATE)
- [ ] Import `TabController`
- [ ] Import `SessionService`
- [ ] Import `InstructorDirectoryTab`
- [ ] Create initialization function:
  - [ ] Initialize `HttpService`
  - [ ] Initialize `SessionService`
  - [ ] Initialize `TabController`
  - [ ] Create `InstructorDirectoryTab` instance
  - [ ] Register tab with controller: `controller.registerTab('instructor-directory', tabInstance)`
  - [ ] Initialize `NavTabs` with controller: `navTabs.setTabController(controller)`
- [ ] Keep old ViewModel initialization for non-migrated tabs

**File: `tests/unit/components/navTabs.test.js`** (NEW OR EXISTING)
- [ ] Test `setTabController()` stores controller
- [ ] Test tab click calls `controller.activateTab()`
- [ ] Test backward compatibility (no controller set)
- [ ] Test error handling for failed activation

#### Step 2.3: Validation & Testing (2 hours)

**Visual Comparison Testing**
- [ ] Open instructor directory in current version
- [ ] Take screenshot
- [ ] Open instructor directory in new version
- [ ] Compare screenshots (should be identical)
- [ ] Test all interactive elements work

**Performance Testing**
- [ ] Measure current tab load time (console.time)
- [ ] Measure new tab load time
- [ ] Compare (should be same or faster)
- [ ] Measure memory before/after tab switch (DevTools)
- [ ] Verify memory is freed on tab unload

**Functional Testing**
- [ ] Test tab loads on first click
- [ ] Test tab refreshes on subsequent clicks
- [ ] Test data is fresh (modify instructor in DB, switch tabs)
- [ ] Test other tabs still work (backward compatibility)
- [ ] Test error states (API down, network error)

**User Acceptance Testing**
- [ ] Admin can view instructor directory
- [ ] All instructor info displays correctly
- [ ] No visual regressions
- [ ] No performance degradation
- [ ] Error messages are user-friendly

---

### Phase 3: Complex Tab Migration (Week 3-4)

**Migrate high-value, complex tab**

#### Step 3.1: Parent Registration Tab (12 hours)

**File: `src/web/js/tabs/parentRegistrationTab.js`** (NEW FILE)
- [ ] Create file extending `BaseTab`
- [ ] Implement `constructor(httpService, parentId)`
  - [ ] Call `super('parent-registration', httpService)`
  - [ ] Store `this.parentId = parentId`
- [ ] Implement `async fetchData()`
  - [ ] Call `this.http.getTabData(\`/api/parents/\${this.parentId}/registration-view\`)`
  - [ ] Return full response data object
- [ ] Implement `async render()`
  - [ ] Get container
  - [ ] Build registration form HTML
  - [ ] Render student cards
  - [ ] Render available classes
  - [ ] Render current registrations
  - [ ] Set innerHTML
  - [ ] Call `#attachFormHandlers()`
- [ ] Implement `async createRegistration(registrationData)`
  - [ ] Call `this.http.postTabData(\`/api/parents/\${this.parentId}/registrations\`, data)`
  - [ ] Update `this.data` with response
  - [ ] Call `this.render()`
  - [ ] Show success toast
- [ ] Implement `async updateRegistration(regId, updateData)`
  - [ ] Call `this.http.patchTabData(\`/api/parents/\${this.parentId}/registrations/\${regId}\`, data)`
  - [ ] Update `this.data` with response
  - [ ] Call `this.render()`
- [ ] Implement `async deleteRegistration(regId)`
  - [ ] Confirm with user
  - [ ] Call `this.http.deleteTabData(\`/api/parents/\${this.parentId}/registrations/\${regId}\`)`
  - [ ] Update `this.data` with response
  - [ ] Call `this.render()`
- [ ] Implement `async submitIntent(regId, intent)`
  - [ ] Call `this.http.patchTabData(\`/api/parents/\${this.parentId}/registrations/\${regId}/intent\`, { intent })`
  - [ ] Update `this.data` with response
  - [ ] Call `this.render()`
- [ ] Implement `#buildRegistrationForm(data)` (private)
- [ ] Implement `#attachFormHandlers()` (private)
  - [ ] Attach submit handlers
  - [ ] Attach delete handlers
  - [ ] Attach intent dropdown handlers
- [ ] Add JSDoc comments
- [ ] Export class

**File: `src/controllers/parentController.js`** (EXISTING FILE)
- [ ] Add method `async getRegistrationView(req, res)`
  - [ ] Extract parentId from req.params
  - [ ] Verify user is authorized (is this parent or admin)
  - [ ] Fetch parent's students from repository
  - [ ] Fetch parent's registrations for current trimester
  - [ ] Fetch available classes for current trimester
  - [ ] Get current period info
  - [ ] Format response: `{ success: true, data: { students, registrations, availableClasses, currentPeriod, trimester } }`
  - [ ] Add error handling
- [ ] Update method `async createRegistration(req, res)`
  - [ ] Extract parentId from route params
  - [ ] Create registration (existing logic)
  - [ ] **NEW:** Fetch FULL dataset (students, registrations, availableClasses)
  - [ ] **NEW:** Format response with complete data: `{ success: true, data: { students, registrations, availableClasses, ... } }`
  - [ ] Keep existing validation and error handling
- [ ] Update method `async updateRegistration(req, res)`
  - [ ] Update registration (existing logic)
  - [ ] **NEW:** Fetch full dataset
  - [ ] **NEW:** Return complete data in response
- [ ] Update method `async deleteRegistration(req, res)`
  - [ ] Delete registration (existing logic)
  - [ ] **NEW:** Fetch full dataset
  - [ ] **NEW:** Return complete data in response
- [ ] Add method `async updateIntent(req, res)`
  - [ ] Extract regId and intent from request
  - [ ] Update intent (may already exist in registrationController)
  - [ ] **NEW:** Fetch full parent dataset
  - [ ] **NEW:** Return complete data
- [ ] Add JSDoc comments to all methods

**File: `src/routes/parentRoutes.js`** (EXISTING FILE)
- [ ] Add route: `router.get('/:id/registration-view', parentController.getRegistrationView)`
- [ ] Update route: `router.post('/:id/registrations', parentController.createRegistration)` (if needed)
- [ ] Update route: `router.patch('/:id/registrations/:regId', parentController.updateRegistration)` (if needed)
- [ ] Update route: `router.delete('/:id/registrations/:regId', parentController.deleteRegistration)` (if needed)
- [ ] Add route: `router.patch('/:id/registrations/:regId/intent', parentController.updateIntent)`
- [ ] Verify authentication/authorization middleware on all routes
- [ ] Test all routes

**File: `src/web/js/workflows/parentRegistrationForm.js`** (EXISTING FILE - EXTRACT LOGIC)
- [ ] Identify reusable form building logic
- [ ] Extract to helper functions that can be imported by tab
- [ ] Add TODO comments: "To be removed after migration"
- [ ] Keep file for backward compatibility during migration

**File: `tests/unit/tabs/parentRegistrationTab.test.js`** (NEW FILE)
- [ ] Test `fetchData()` calls correct endpoint with parentId
- [ ] Test `fetchData()` returns complete dataset
- [ ] Test `render()` builds form with all sections
- [ ] Test `createRegistration()` calls API and updates data
- [ ] Test `updateRegistration()` calls API and updates data
- [ ] Test `deleteRegistration()` calls API and updates data
- [ ] Test `submitIntent()` calls API and updates data
- [ ] Test `#attachFormHandlers()` attaches event listeners
- [ ] Test error handling for all mutations

**File: `tests/integration/parentRegistrationView.test.js`** (NEW FILE)
- [ ] Test `GET /api/parents/:id/registration-view` returns complete data
- [ ] Test authorization (parent can only see own data)
- [ ] Test authorization (admin can see any parent's data)
- [ ] Test `POST /api/parents/:id/registrations` returns updated dataset
- [ ] Test `PATCH /api/parents/:id/registrations/:regId` returns updated dataset
- [ ] Test `DELETE /api/parents/:id/registrations/:regId` returns updated dataset
- [ ] Test `PATCH /api/parents/:id/registrations/:regId/intent` returns updated dataset
- [ ] Test error cases (invalid parent, invalid registration, etc.)

#### Step 3.2: Admin Master Schedule Tab (10 hours)

**File: `src/web/js/tabs/adminMasterScheduleTab.js`** (NEW FILE)
- [ ] Create file extending `BaseTab`
- [ ] Implement `constructor(httpService, trimester)`
  - [ ] Call `super('admin-master-schedule', httpService)`
  - [ ] Store `this.trimester = trimester`
- [ ] Implement `async fetchData()`
  - [ ] Call `this.http.getTabData(\`/api/admin/master-schedule/\${this.trimester}\`)`
  - [ ] Return full response data
- [ ] Implement `async render()`
  - [ ] Get container
  - [ ] Build master schedule table
  - [ ] Group by day/time
  - [ ] Show classes, instructors, rooms, enrollment counts
  - [ ] Set innerHTML
  - [ ] Call `#attachEventHandlers()`
- [ ] Implement `async changeTrimester(newTrimester)`
  - [ ] Update `this.trimester`
  - [ ] Call `this.refresh()`
- [ ] Implement `#buildScheduleTable(data)` (private)
  - [ ] Extract logic from viewModel.js if exists
  - [ ] Group classes by day
  - [ ] Sort by time
  - [ ] Format rows with all details
- [ ] Implement `#attachEventHandlers()` (private)
  - [ ] Attach any click handlers (class details, etc.)
- [ ] Add JSDoc comments
- [ ] Export class

**File: `src/controllers/adminController.js`** (EXISTING FILE OR NEW)
- [ ] Add method `async getMasterScheduleView(req, res)`
  - [ ] Extract trimester from req.params
  - [ ] Verify user is admin
  - [ ] Fetch all classes for trimester
  - [ ] Fetch all registrations for trimester
  - [ ] Fetch all instructors (active)
  - [ ] Fetch all rooms
  - [ ] Fetch all students (for enrollment counts)
  - [ ] Calculate metadata (total enrollment, classes, etc.)
  - [ ] Format response: `{ success: true, data: { classes, registrations, instructors, rooms, students, metadata } }`
  - [ ] Add error handling
- [ ] Add JSDoc comments

**File: `src/routes/adminRoutes.js`** (EXISTING FILE)
- [ ] Add route: `router.get('/master-schedule/:trimester', adminController.getMasterScheduleView)`
- [ ] Add admin authentication middleware
- [ ] Test route

**File: `src/web/js/viewModel.js`** (EXISTING FILE - EXTRACT)
- [ ] Identify master schedule building logic
- [ ] Extract to helper function or keep in tab
- [ ] Add TODO comment: "To be removed after migration"

**File: `src/web/js/components/navTabs.js`** (EXISTING FILE - UPDATE)
- [ ] Update trimester selector handler
- [ ] When trimester changes, call `adminMasterScheduleTab.changeTrimester(newTrimester)`
- [ ] Ensure tab refreshes with new data

**File: `tests/unit/tabs/adminMasterScheduleTab.test.js`** (NEW FILE)
- [ ] Test `fetchData()` calls correct endpoint with trimester
- [ ] Test `fetchData()` returns complete dataset
- [ ] Test `render()` builds schedule table
- [ ] Test `changeTrimester()` updates trimester and refreshes
- [ ] Test `#buildScheduleTable()` groups classes correctly
- [ ] Test enrollment counts are calculated

**File: `tests/integration/adminMasterSchedule.test.js`** (NEW FILE)
- [ ] Test `GET /api/admin/master-schedule/:trimester` returns data
- [ ] Test authorization (admin only)
- [ ] Test response includes all required entities
- [ ] Test metadata is calculated correctly
- [ ] Test error handling

---

### Phase 4: Remaining Tabs (Week 5-6)

#### Step 4.1: Migrate Remaining Tabs (16 hours)

**For each tab, follow the same pattern as Phases 2-3:**

**Tab 1: Admin Wait List (3 hours)**
- [ ] File: `src/web/js/tabs/adminWaitListTab.js` (NEW)
  - [ ] Extend BaseTab
  - [ ] Implement fetchData() → `/api/admin/wait-list/:trimester`
  - [ ] Implement render() → wait list table
  - [ ] Implement trimester switching
- [ ] File: `src/controllers/adminController.js` (UPDATE)
  - [ ] Add `getWaitListView(req, res)` method
  - [ ] Fetch wait list entries, students, classes
  - [ ] Return complete dataset
- [ ] File: `src/routes/adminRoutes.js` (UPDATE)
  - [ ] Add route: `GET /wait-list/:trimester`
- [ ] Tests: Unit + Integration
  - [ ] File: `tests/unit/tabs/adminWaitListTab.test.js`
  - [ ] File: `tests/integration/adminWaitList.test.js`

**Tab 2: Admin Registration Tab (4 hours)**
- [ ] File: `src/web/js/tabs/adminRegistrationTab.js` (NEW)
  - [ ] Extend BaseTab
  - [ ] Implement fetchData() → `/api/admin/registrations/:trimester`
  - [ ] Implement render() → registration management UI
  - [ ] Implement CRUD operations (create, update, delete)
  - [ ] Implement bulk operations (if needed)
- [ ] File: `src/controllers/adminController.js` (UPDATE)
  - [ ] Add `getRegistrationsView(req, res)` method
  - [ ] Update mutation methods to return full datasets
- [ ] File: `src/routes/adminRoutes.js` (UPDATE)
  - [ ] Add route: `GET /registrations/:trimester`
- [ ] Tests: Unit + Integration
  - [ ] File: `tests/unit/tabs/adminRegistrationTab.test.js`
  - [ ] File: `tests/integration/adminRegistrations.test.js`

**Tab 3: Parent My Enrollments Tab (3 hours)**
- [ ] File: `src/web/js/tabs/parentEnrollmentsTab.js` (NEW)
  - [ ] Extend BaseTab
  - [ ] Implement fetchData() → `/api/parents/:id/enrollments-view`
  - [ ] Implement render() → enrollment history view
  - [ ] Read-only (no mutations)
- [ ] File: `src/controllers/parentController.js` (UPDATE)
  - [ ] Add `getEnrollmentsView(req, res)` method
  - [ ] Fetch all parent's registrations across all trimesters
- [ ] File: `src/routes/parentRoutes.js` (UPDATE)
  - [ ] Add route: `GET /:id/enrollments-view`
- [ ] Tests: Unit + Integration
  - [ ] File: `tests/unit/tabs/parentEnrollmentsTab.test.js`
  - [ ] File: `tests/integration/parentEnrollments.test.js`

**Tab 4: Instructor My Classes Tab (3 hours)**
- [ ] File: `src/web/js/tabs/instructorClassesTab.js` (NEW)
  - [ ] Extend BaseTab
  - [ ] Implement fetchData() → `/api/instructors/:id/classes-view`
  - [ ] Implement render() → class roster view
  - [ ] Implement roster downloads (if needed)
- [ ] File: `src/controllers/instructorController.js` (UPDATE)
  - [ ] Add `getClassesView(req, res)` method
  - [ ] Fetch instructor's classes with full rosters
- [ ] File: `src/routes/instructorRoutes.js` (UPDATE)
  - [ ] Add route: `GET /:id/classes-view`
- [ ] Tests: Unit + Integration
  - [ ] File: `tests/unit/tabs/instructorClassesTab.test.js`
  - [ ] File: `tests/integration/instructorClasses.test.js`

**Tab 5: Admin Directory Tab (3 hours)**
- [ ] File: `src/web/js/tabs/adminDirectoryTab.js` (NEW)
  - [ ] Extend BaseTab
  - [ ] Implement fetchData() → `/api/admin/directory`
  - [ ] Implement render() → admin contact directory
  - [ ] Read-only
- [ ] File: `src/controllers/adminController.js` (UPDATE)
  - [ ] Add `getDirectoryView(req, res)` method
  - [ ] Fetch all admins with contact info
- [ ] File: `src/routes/adminRoutes.js` (UPDATE)
  - [ ] Add route: `GET /directory`
- [ ] Tests: Unit + Integration
  - [ ] File: `tests/unit/tabs/adminDirectoryTab.test.js`
  - [ ] File: `tests/integration/adminDirectory.test.js`

#### Step 4.2: Registration Coordination (4 hours)

**Update main app initialization:**
- [ ] File: `src/web/js/app.js` (UPDATE OR CREATE)
  - [ ] Import all tab classes
  - [ ] Create tab instances with correct parameters
  - [ ] Register all tabs with TabController
  - [ ] Initialize NavTabs with TabController
  - [ ] Remove old ViewModel initialization
  - [ ] Add error handling for initialization failures

**Example structure:**
```javascript
// Initialize services
const httpService = new HttpService();
const sessionService = new SessionService(httpService);
await sessionService.initialize();

// Initialize tab controller
const tabController = new TabController();
tabController.sessionInfo = sessionService;

// Get user info
const user = sessionService.getUser();

// Register tabs based on user type
if (user.admin) {
  const adminMasterSchedule = new AdminMasterScheduleTab(httpService, 'fall');
  tabController.registerTab('admin-master-schedule', adminMasterSchedule);

  const adminWaitList = new AdminWaitListTab(httpService, 'fall');
  tabController.registerTab('admin-wait-list', adminWaitList);

  // ... register other admin tabs
}

if (user.parent) {
  const parentRegistration = new ParentRegistrationTab(httpService, user.parent.id);
  tabController.registerTab('parent-registration', parentRegistration);

  // ... register other parent tabs
}

// Initialize NavTabs with controller
const navTabs = new NavTabs();
navTabs.setTabController(tabController);
```

#### Step 4.3: Remove Old ViewModel (3 hours)

**File: `src/web/js/viewModel.js`** (MAJOR CLEANUP)
- [ ] **BACKUP FILE FIRST:** Copy to `viewModel.js.bak`
- [ ] Remove all data storage properties:
  - [ ] Delete `this.admins = admins`
  - [ ] Delete `this.instructors = instructors`
  - [ ] Delete `this.students = students`
  - [ ] Delete `this.registrations = registrations`
  - [ ] Delete `this.classes = classes`
  - [ ] Delete `this.rooms = rooms`
- [ ] Remove constructor data initialization
- [ ] Remove all tab-specific methods:
  - [ ] Identify methods used only by tabs
  - [ ] Delete or move to tab classes
  - [ ] Keep only utility methods (if truly shared)
- [ ] Keep utility methods (if needed):
  - [ ] Date/time formatters
  - [ ] String helpers
  - [ ] Math helpers
  - [ ] Consider moving to separate utility modules
- [ ] Update imports in other files that used ViewModel
- [ ] Search codebase for `viewModel.` references:
  - [ ] `grep -r "viewModel\." src/web/js/`
  - [ ] Update or remove each reference
- [ ] Run full test suite
- [ ] Fix any broken references

**File: `src/web/index.html`** (UPDATE)
- [ ] Remove ViewModel script import (if separate)
- [ ] Update to use new app.js initialization
- [ ] Remove any inline scripts using ViewModel
- [ ] Test page loads correctly

**Verification:**
- [ ] Search codebase: `grep -r "this\\.registrations" src/web/js/` → Should return nothing
- [ ] Search codebase: `grep -r "this\\.students" src/web/js/` → Should return nothing
- [ ] Search codebase: `grep -r "this\\.classes" src/web/js/` → Should return nothing
- [ ] All tests pass
- [ ] No console errors on page load
- [ ] All tabs work independently

---

### Phase 5: Testing & Optimization (Week 7)

#### Step 5.1: Comprehensive Testing (8 hours)

**Unit Tests (3 hours)**
- [ ] Verify all tab unit tests pass
  - [ ] Run: `npm test -- tests/unit/tabs/`
  - [ ] Check coverage: `npm test -- --coverage tests/unit/tabs/`
  - [ ] Fix any failures
- [ ] Verify core infrastructure tests pass
  - [ ] Run: `npm test -- tests/unit/core/`
  - [ ] Check TabController tests
  - [ ] Check BaseTab tests
- [ ] Add missing test cases
  - [ ] Edge cases (empty data, API errors)
  - [ ] Error recovery
  - [ ] Memory leaks (data cleanup)

**Integration Tests (3 hours)**
- [ ] Verify all API endpoint tests pass
  - [ ] Run: `npm test -- tests/integration/`
  - [ ] Check all `-view` endpoints work
  - [ ] Check all mutation endpoints return full datasets
- [ ] Add tab lifecycle integration tests
  - [ ] Test tab switching sequence
  - [ ] Test data refresh on tab activation
  - [ ] Test memory cleanup on tab deactivation
- [ ] Add authentication/authorization tests
  - [ ] Test parent can only access own data
  - [ ] Test admin can access all data
  - [ ] Test instructor can only access own classes

**End-to-End Workflow Tests (2 hours)**
- [ ] Critical Path 1: Parent Registration
  - [ ] Load page as parent
  - [ ] Navigate to registration tab
  - [ ] Create new registration
  - [ ] Verify data refreshes
  - [ ] Submit intent
  - [ ] Verify intent updates
- [ ] Critical Path 2: Admin Master Schedule
  - [ ] Load page as admin
  - [ ] Navigate to master schedule
  - [ ] Switch trimesters
  - [ ] Verify data refreshes
  - [ ] View class details
- [ ] Critical Path 3: Instructor Classes
  - [ ] Load page as instructor
  - [ ] Navigate to classes tab
  - [ ] View roster
  - [ ] Verify student data displays

**Performance Benchmarks**
- [ ] Measure initial page load
  - [ ] Before migration: ___ms
  - [ ] After migration: ___ms
  - [ ] Goal: Same or better
- [ ] Measure tab switching time
  - [ ] First load: ___ms
  - [ ] Subsequent loads: ___ms
  - [ ] Goal: < 500ms
- [ ] Measure memory usage
  - [ ] Before tab switch: ___MB
  - [ ] After tab switch: ___MB
  - [ ] After tab unload: ___MB (should decrease)
  - [ ] Goal: Memory freed on unload

#### Step 5.2: Optimization (6 hours)

**Data Caching (2 hours)**
- [ ] File: `src/web/js/core/baseTab.js` (UPDATE)
  - [ ] Add caching properties:
    - [ ] `this.cache = null`
    - [ ] `this.cacheTimestamp = null`
    - [ ] `this.cacheTTL = 60000` (default 60s)
  - [ ] Update `onLoad()` to check cache:
    ```javascript
    async onLoad() {
      const now = Date.now();
      if (this.cache && (now - this.cacheTimestamp < this.cacheTTL)) {
        this.data = this.cache;
      } else {
        this.data = await this.fetchData();
        this.cache = this.data;
        this.cacheTimestamp = now;
      }
      await this.render();
      this.isLoaded = true;
    }
    ```
  - [ ] Add `clearCache()` method
  - [ ] Add `setCacheTTL(ms)` method
- [ ] Test caching behavior
  - [ ] First load fetches from API
  - [ ] Second load (within TTL) uses cache
  - [ ] Load after TTL fetches from API
- [ ] Configure per-tab TTLs:
  - [ ] Static data (directories): 5 minutes
  - [ ] Dynamic data (registrations): 30 seconds
  - [ ] Real-time data (class counts): No cache

**Loading States (2 hours)**
- [ ] File: `src/web/js/core/baseTab.js` (UPDATE)
  - [ ] Add loading indicator during `onLoad()`
  - [ ] Show spinner in tab container
  - [ ] Hide spinner after render completes
- [ ] File: `src/web/css/loading-states.css` (NEW OR UPDATE)
  - [ ] Add spinner styles
  - [ ] Add skeleton screen styles (optional)
- [ ] Update each tab to show appropriate loading state
  - [ ] Tables: Show skeleton rows
  - [ ] Forms: Show disabled state
  - [ ] Lists: Show placeholder items
- [ ] Test loading states:
  - [ ] Visible during slow network
  - [ ] Hidden after load completes
  - [ ] User-friendly (not jarring)

**Error Handling UI (2 hours)**
- [ ] File: `src/web/js/core/baseTab.js` (UPDATE)
  - [ ] Add error rendering method:
    ```javascript
    renderError(error) {
      const container = document.getElementById(this.tabId);
      container.innerHTML = `
        <div class="error-state">
          <h3>Unable to load data</h3>
          <p>${error.message}</p>
          <button onclick="this.retry()">Retry</button>
        </div>
      `;
    }
    ```
  - [ ] Update `onLoad()` with try/catch
  - [ ] Call `renderError()` on fetch failure
  - [ ] Add `retry()` method to re-attempt load
- [ ] File: `src/web/css/error-states.css` (NEW OR UPDATE)
  - [ ] Add error state styles
  - [ ] User-friendly colors
  - [ ] Clear call-to-action (retry button)
- [ ] Test error states:
  - [ ] API down
  - [ ] Network timeout
  - [ ] Authentication expired
  - [ ] Invalid data

**Optional: Optimistic Updates (if time permits)**
- [ ] Implement optimistic UI for mutations
  - [ ] Update local data immediately
  - [ ] Show loading indicator
  - [ ] Revert on error
- [ ] Example: Registration creation
  - [ ] Add new registration to `this.data.registrations` immediately
  - [ ] Re-render (shows new registration)
  - [ ] Send API request
  - [ ] On success: Replace with server data
  - [ ] On error: Remove optimistic entry, show error

#### Step 5.3: Documentation (4 hours)

**Developer Documentation**
- [ ] File: `docs/frontend/TAB_ARCHITECTURE.md` (NEW)
  - [ ] Explain tab-based architecture
  - [ ] Document TabController and BaseTab
  - [ ] Provide example tab implementation
  - [ ] Explain data lifecycle
  - [ ] Document caching strategy
- [ ] File: `docs/frontend/TAB_DEVELOPMENT_GUIDE.md` (NEW)
  - [ ] Step-by-step: How to create a new tab
  - [ ] How to add API endpoints
  - [ ] How to test tabs
  - [ ] Common patterns and pitfalls
  - [ ] Troubleshooting guide
- [ ] File: `docs/api/TAB_ENDPOINTS.md` (NEW)
  - [ ] Document all `-view` endpoints
  - [ ] Document request/response formats
  - [ ] Document response envelopes
  - [ ] Document authentication requirements
  - [ ] Provide example requests/responses

**API Documentation**
- [ ] File: `docs/api/RESPONSE_PATTERNS.md` (NEW)
  - [ ] Document standard response envelope:
    ```json
    {
      "success": true,
      "data": { /* tab data */ },
      "message": "Optional message"
    }
    ```
  - [ ] Document error response format
  - [ ] Document metadata patterns
  - [ ] Provide examples for each tab type

**Architecture Diagrams**
- [ ] Update `docs/architecture/FRONTEND_ARCHITECTURE.md`
  - [ ] Add diagram of tab-based architecture
  - [ ] Show data flow (tab → API → tab)
  - [ ] Show lifecycle (onLoad/onUnload)
  - [ ] Compare old vs new architecture
- [ ] Create sequence diagrams
  - [ ] Diagram: User clicks tab
  - [ ] Diagram: User creates registration
  - [ ] Diagram: Tab switches with caching

**Migration Guide**
- [ ] File: `docs/migration/VIEWMODEL_TO_TABS.md` (NEW)
  - [ ] Document what changed
  - [ ] Document removed features (if any)
  - [ ] Document new patterns developers should use
  - [ ] Provide migration examples
  - [ ] FAQ section

**Code Comments**
- [ ] Review all new files for JSDoc completeness
  - [ ] TabController: All methods documented
  - [ ] BaseTab: All methods documented
  - [ ] All tab classes: Document purpose, params, returns
  - [ ] All API controllers: Document endpoints, responses
- [ ] Add inline comments for complex logic
  - [ ] Caching logic
  - [ ] Error recovery
  - [ ] Data transformations

---

## API Design Patterns

### 1. Tab Data Endpoint Pattern

**Naming Convention:**
```
GET /api/{userType}/{userId}/{tabName}-view
```

**Examples:**
```
GET /api/parents/p123/registration-view
GET /api/instructors/i456/classes-view
GET /api/admin/master-schedule/fall
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    // All entities this tab needs
    "primaryEntities": [...],    // Main data
    "relatedEntities": [...],    // Related data
    "metadata": {                // Counts, stats
      "totalCount": 42,
      "unreadCount": 3
    }
  },
  "timestamp": "2025-11-08T12:00:00Z"
}
```

### 2. Mutation Response Pattern

**All mutations return complete datasets**

**POST/PATCH/DELETE Pattern:**
```
POST /api/parents/{id}/registrations
→ Returns ALL parent data (students, registrations, classes)

PATCH /api/admin/classes/{id}
→ Returns ALL admin data for current tab
```

**Response Format:**
```json
{
  "success": true,
  "message": "Registration created successfully",
  "data": {
    // COMPLETE dataset for tab refresh
    "students": [...],
    "registrations": [...],
    "availableClasses": [...]
  }
}
```

**Benefits:**
- Tab just replaces `this.data` with `response.data`
- No manual array manipulation
- Always consistent state
- Server controls freshness

### 3. Error Response Pattern

**Consistent error format:**
```json
{
  "success": false,
  "error": "Registration failed: Class is full",
  "errorCode": "CLASS_FULL",
  "data": {
    // Even on error, return current state
    "students": [...],
    "registrations": [...],
    "availableClasses": [...]
  }
}
```

**Benefits:**
- Tab can still refresh UI on error
- User sees current state even if mutation failed
- Easier to show inline errors

---

## Migration Strategy

### Parallel Operation Approach

**Don't rewrite everything at once - migrate incrementally:**

1. **Phase 0: Prep**
   - Create core classes (TabController, BaseTab)
   - Add to codebase alongside existing ViewModel
   - No breaking changes yet

2. **Phase 1: First Tab**
   - Migrate ONE simple tab (Instructor Directory)
   - Old tabs still use ViewModel
   - Prove pattern works

3. **Phase 2-4: Incremental Migration**
   - Migrate one tab per week
   - Each tab becomes independent
   - Old tabs continue to work

4. **Phase 5: Cleanup**
   - When all tabs migrated, remove ViewModel
   - Delete shared state properties
   - Clean up dead code

### Rollback Strategy

**Each phase is independently revertable:**

- Phase 1 failure → Delete tab file, revert NavTabs changes
- Phase 2 failure → Keep working tabs, fix broken tab
- Any phase → Can rollback to previous commit

**Risk Mitigation:**
- Feature flags for new tabs
- A/B test new vs old tabs
- Gradual rollout to users

---

## Data Lifecycle Example

### Before (Current Architecture)

```
1. User loads page
   → Single massive API call
   → ViewModel stores ALL data in shared properties
   → All tabs share same object references

2. User clicks "Parent Registration" tab
   → NavTabs just shows/hides DOM
   → Uses stale shared data from page load
   → No refresh, data could be hours old

3. User creates registration
   → POST /api/registrations
   → Server returns single registration object
   → Frontend manually pushes to this.registrations array
   → Other arrays (students, classes) NOT updated
   → Possible inconsistency

4. User clicks "My Enrollments" tab
   → Still using stale shared data
   → New registration may or may not appear (race condition)
   → Related data definitely stale
```

### After (Independent Tabs)

```
1. User loads page
   → Lightweight API call for session info only
   → No data loaded yet (fast initial load)
   → TabController initialized

2. User clicks "Parent Registration" tab
   → TabController calls tab.onLoad()
   → Tab fetches ONLY its data: GET /api/parents/{id}/registration-view
   → Tab renders fresh data
   → First load: ~200ms, subsequent loads: cached or fresh

3. User creates registration
   → POST /api/parents/{id}/registrations
   → Server returns COMPLETE parent dataset
   → Tab replaces this.data with response.data
   → Tab re-renders with fresh data
   → 100% consistent

4. User clicks "My Enrollments" tab
   → TabController calls prevTab.onUnload() (cleanup)
   → TabController calls nextTab.onLoad()
   → Tab fetches fresh data: GET /api/parents/{id}/enrollments-view
   → Always current, always correct
```

---

## Performance Considerations

### Network Optimization

**Current:**
- 1 massive request on page load (~500KB-2MB)
- Loads data for tabs user never visits
- No refresh, data becomes stale

**New:**
- Small session request on load (~5KB)
- Lazy load tabs as user visits (~50-200KB each)
- Fresh data on every load
- **Net result: Faster initial load, fresher data**

### Memory Optimization

**Current:**
- All data in memory all the time
- Shared references prevent garbage collection
- Memory grows over session

**New:**
- Only active tab's data in memory
- Tab unload clears data (GC can collect)
- Memory footprint lower
- **Net result: Better memory usage**

### Caching Strategy (Optional)

If performance testing shows too many API calls:

```javascript
export class BaseTab {
  constructor(tabId, httpService, cacheTTL = 60000) {
    this.cache = null;
    this.cacheTimestamp = null;
    this.cacheTTL = cacheTTL; // 60 seconds default
  }

  async onLoad() {
    // Check cache
    if (this.cache && (Date.now() - this.cacheTimestamp < this.cacheTTL)) {
      this.data = this.cache;
    } else {
      this.data = await this.fetchData();
      this.cache = this.data;
      this.cacheTimestamp = Date.now();
    }
    await this.render();
  }
}
```

---

## Testing Strategy

### Unit Tests

**Test each tab in isolation:**

```javascript
// tests/unit/tabs/parentRegistrationTab.test.js
import { ParentRegistrationTab } from '../../../src/web/js/tabs/parentRegistrationTab.js';

describe('ParentRegistrationTab', () => {
  let tab;
  let mockHttp;

  beforeEach(() => {
    mockHttp = {
      get: jest.fn(),
      post: jest.fn(),
    };
    tab = new ParentRegistrationTab(mockHttp, 'parent-123');
  });

  test('fetchData() calls correct API endpoint', async () => {
    mockHttp.get.mockResolvedValue({
      students: [],
      registrations: [],
      availableClasses: [],
    });

    await tab.fetchData();

    expect(mockHttp.get).toHaveBeenCalledWith(
      '/api/parents/parent-123/registration-view'
    );
  });

  test('createRegistration() replaces data with response', async () => {
    const freshData = {
      students: [{ id: 's1' }],
      registrations: [{ id: 'r1' }],
      availableClasses: [{ id: 'c1' }],
    };

    mockHttp.post.mockResolvedValue(freshData);

    await tab.createRegistration({ classId: 'c1', studentId: 's1' });

    expect(tab.data).toEqual(freshData);
  });
});
```

### Integration Tests

**Test tab lifecycle:**

```javascript
// tests/integration/tabLifecycle.test.js
import { TabController } from '../../src/web/js/core/tabController.js';
import { ParentRegistrationTab } from '../../src/web/js/tabs/parentRegistrationTab.js';

describe('Tab Lifecycle', () => {
  let controller;
  let tab1;
  let tab2;

  beforeEach(() => {
    controller = new TabController();
    tab1 = new ParentRegistrationTab(mockHttp, 'p1');
    tab2 = new ParentRegistrationTab(mockHttp, 'p2');

    controller.registerTab('tab1', tab1);
    controller.registerTab('tab2', tab2);
  });

  test('activateTab() calls onUnload on previous tab', async () => {
    jest.spyOn(tab1, 'onUnload');
    jest.spyOn(tab2, 'onLoad');

    await controller.activateTab('tab1');
    await controller.activateTab('tab2');

    expect(tab1.onUnload).toHaveBeenCalled();
    expect(tab2.onLoad).toHaveBeenCalled();
  });

  test('tab data is cleared on unload', async () => {
    await controller.activateTab('tab1');
    tab1.data = { test: 'data' };

    await controller.activateTab('tab2');

    expect(tab1.data).toEqual({});
  });
});
```

---

## Success Criteria

### Must Have (MVP)

- [ ] All tabs implement BaseTab interface
- [ ] Tab switching triggers onLoad()/onUnload()
- [ ] Each tab fetches its own data independently
- [ ] No shared data state between tabs
- [ ] API mutations return complete datasets
- [ ] All existing features work in new architecture
- [ ] No performance regressions
- [ ] All tests pass

### Nice to Have (V2)

- [ ] Per-tab caching with TTL
- [ ] Loading states/spinners
- [ ] Optimistic updates
- [ ] Background data refresh
- [ ] Tab preloading (fetch data for likely next tab)
- [ ] Service workers for offline support

---

## Risks & Mitigations

### Risk 1: Performance Regression
**Impact:** Users perceive slower tab switching
**Likelihood:** Medium
**Mitigation:**
- Implement caching with TTL
- Add loading spinners
- Optimize API queries (indexes, caching)
- Preload likely next tab

### Risk 2: API Response Size
**Impact:** Large responses slow down tab loads
**Likelihood:** Low
**Mitigation:**
- Profile API responses, optimize queries
- Add pagination for large lists
- Use GraphQL for precise data fetching (future)

### Risk 3: Migration Complexity
**Impact:** Migration takes longer than estimated
**Likelihood:** High
**Mitigation:**
- Start with simplest tab
- Incremental migration (one tab at a time)
- Parallel operation (old and new coexist)
- Feature flags for rollback

### Risk 4: Breaking Changes
**Impact:** Users experience bugs during migration
**Likelihood:** Medium
**Mitigation:**
- Comprehensive testing
- Gradual rollout
- A/B testing new vs old
- Quick rollback capability

---

## Future Enhancements

### 1. GraphQL Migration
Replace REST endpoints with GraphQL for precise data fetching:

```graphql
query ParentRegistrationView($parentId: ID!) {
  parent(id: $parentId) {
    students {
      id
      fullName
      grade
    }
    registrations {
      id
      student { id }
      class { id, name }
    }
    availableClasses {
      id
      name
      availableSeats
    }
  }
}
```

**Benefits:**
- Exact data needed, no over-fetching
- Single request for all data
- Type safety

### 2. Real-time Updates (WebSockets)
Push updates to tabs when data changes:

```javascript
export class BaseTab {
  async onLoad() {
    // Subscribe to data changes
    this.subscription = socket.subscribe(`${this.tabId}:updates`, (update) => {
      this.data = update.data;
      this.render();
    });
  }

  async onUnload() {
    this.subscription.unsubscribe();
  }
}
```

### 3. Service Workers (Offline Support)
Cache tab data for offline viewing:

```javascript
// service-worker.js
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      caches.open('tab-data').then(cache => {
        return cache.match(event.request).then(response => {
          return response || fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  }
});
```

---

## Related Documentation

- [ES Modules Cleanup](./backlog/es-modules-cleanup.md) - Module system migration
- [Model-Agnostic DB Client](./backlog/model-agnostic-db-client.md) - Backend data independence
- [Reenrollment System](./reenrollment-consolidated.md) - Registration workflows
- [Dynamic Trimester Visibility](./dynamic-trimester-visibility.md) - Period-based UI

---

## Open Questions

1. **Caching Strategy:** Should we cache tab data? If so, what TTL?
2. **Loading States:** Design system for loading spinners/skeletons?
3. **Error Handling:** Unified error UI pattern for failed tab loads?
4. **Preloading:** Should we preload likely next tabs (e.g., adjacent tabs)?
5. **Analytics:** Track tab usage to prioritize optimization?
6. **Offline:** Do we need offline support? If so, which tabs?

---

## Appendix: API Endpoint Inventory

### Current Endpoints (To Be Replaced)

```
GET  /api/app-config           → Returns EVERYTHING
POST /api/registrations        → Returns single item
PATCH /api/registrations/{id}  → Returns single item
DELETE /api/registrations/{id} → Returns success only
```

### New Endpoints (Tab-Specific)

#### Parent Endpoints
```
GET  /api/parents/{id}/registration-view
  → students[], registrations[], availableClasses[], metadata

POST /api/parents/{id}/registrations
  → students[], registrations[], availableClasses[]

PATCH /api/parents/{id}/registrations/{regId}
  → students[], registrations[], availableClasses[]

DELETE /api/parents/{id}/registrations/{regId}
  → students[], registrations[], availableClasses[]

GET /api/parents/{id}/enrollments-view
  → students[], registrations[], classes[], metadata
```

#### Admin Endpoints
```
GET /api/admin/master-schedule/{trimester}
  → classes[], registrations[], instructors[], rooms[], students[], metadata

GET /api/admin/wait-list/{trimester}
  → waitList[], students[], classes[], metadata

GET /api/admin/registration/{trimester}
  → registrations[], students[], classes[], instructors[], rooms[]

POST /api/admin/classes
  → classes[], instructors[], rooms[]

PATCH /api/admin/classes/{id}
  → classes[], instructors[], rooms[]
```

#### Instructor Endpoints
```
GET /api/instructors/{id}/classes-view
  → classes[], registrations[], students[], metadata

GET /api/instructors/{id}/roster/{classId}
  → registrations[], students[], class, metadata
```

---

**Status:** Ready for review and approval
**Next Steps:**
1. Review this plan with team
2. Approve architecture approach
3. Begin Phase 1 implementation
4. Create tasks in project tracker

*Plan created: 2025-11-08*
*Author: Architecture Team*
