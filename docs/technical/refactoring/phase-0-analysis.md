# Phase 0 Analysis - Complete Method & API Mapping

**Date:** 2025-11-08
**Status:** Complete
**Purpose:** Comprehensive analysis of viewModel.js to support tab-based migration

---

## Executive Summary

This document provides the complete analysis of:
1. All 58 methods in viewModel.js mapped to their target tabs
2. All 15+ API endpoints currently in use
3. Data dependencies for each tab
4. Migration priority and complexity assessment

---

## Part 1: API Endpoints Inventory

### 1.1 Core Data Endpoints (Initial Load)

Used in `loadUserData()` at line 203-208:

```javascript
GET /api/configuration              → AppConfigurationResponse
GET /api/admins                     → Admin[]
GET /api/instructors                → Instructor[]
GET /api/students (paginated)       → Student[]
GET /api/registrations (paginated)  → Registration[]
GET /api/classes                    → Class[]
GET /api/rooms                      → Room[]
```

**Usage:** These are ALL loaded when ANY user logs in - this is the core problem!

### 1.2 Trimester-Specific Endpoints

```javascript
GET /api/admin/registrations/:trimester     → { registrations, classes, students }
GET /api/registrations/next-trimester       → Registration[] (parent enrollment)
```

**Usage:** Admin trimester switching, parent enrollment period

### 1.3 Registration CRUD Endpoints

```javascript
POST   /api/registrations                   → Create registration (current trimester)
POST   /api/registrations/next-trimester    → Create registration (enrollment period)
DELETE /api/registrations/:id               → Delete registration
PUT    /api/registrations/:id/intent        → Update intent (keep/drop/undecided)
```

**Usage:** Admin registration form, Parent registration form

### 1.4 Authentication Endpoints

```javascript
POST /api/authenticateByAccessCode   → User object (admin/instructor/parent)
```

**Usage:** Login flow

### 1.5 Support Endpoints

```javascript
POST /api/feedback                   → Submit user feedback
GET  /api/version                    → App version for cache busting
```

**Usage:** Feedback modal, main.js cache management

---

## Part 2: viewModel.js Method Mapping

### 2.1 Utility Functions (Module-Level)

**Location:** Lines 37-115
**Migration Target:** Create `src/web/js/utilities/stringUtils.js` and `src/web/js/utilities/dateUtils.js`

| Method | Line | Purpose | Target |
|--------|------|---------|--------|
| `capitalize(str)` | 37-40 | Capitalize first letter | `utilities/stringUtils.js` |
| `getNextTrimester(current)` | 49-60 | Get next in sequence | `utilities/trimesterUtils.js` (exists) |
| `formatDateTime(timestamp)` | 67-115 | Format dates for display | `utilities/dateUtils.js` (new) |

**Action:** Extract these to utilities, remove from viewModel.js

---

### 2.2 Initialization & Authentication Methods

**Migration Target:** Create `src/web/js/core/sessionManager.js` or keep in app-level init

| Method | Line | Purpose | Tab Association | Notes |
|--------|------|---------|-----------------|-------|
| `constructor()` | 123-138 | Initialize flags | N/A | Remove when tabs independent |
| `async initializeAsync()` | 140-190 | Initial app load | N/A | Keep app-level, don't migrate |
| `async loadUserData(user, roleToClick)` | 192-355 | Load ALL data | N/A | **CORE PROBLEM - Split per tab** |
| `_updateEnrollmentBanner()` | 357-390 | Update enrollment banner | ALL TABS | Extract to shared component |
| `#initLoginModal()` | 3470-3561 | Initialize login modal | N/A | Keep app-level |
| `#initLoginTypeSwitching()` | 3563-3618 | Parent/Employee tabs | N/A | Keep app-level |
| `#initParentPhoneInput()` | 3620-3667 | Phone input handlers | N/A | Keep app-level |
| `#initEmployeeCodeInput()` | 3669-3691 | Code input handlers | N/A | Keep app-level |
| `#validateCurrentInput()` | 3693-3764 | Validate login inputs | N/A | Keep app-level |
| `#focusCurrentInput()` | 3766-3777 | Focus management | N/A | Keep app-level |
| `#resetLoginModal()` | 3779-3818 | Reset login state | N/A | Keep app-level |
| `#initializeAllModals()` | 3820-3832 | Initialize all modals | N/A | Keep app-level |
| `#initTermsModal()` | 3834-3939 | Terms of service modal | N/A | Keep app-level |
| `#initPrivacyModal()` | 3941-3981 | Privacy policy modal | N/A | Keep app-level |
| `#updateLoginButtonState()` | 3983-4009 | Update button state | N/A | Keep app-level |
| `async handleLogin()` | 4011-4078 | Public login handler | N/A | Keep app-level |
| `async #handleLogin()` | 4080-4083 | Private login handler | N/A | Keep app-level |
| `async #attemptLoginWithCode()` | 4085-4200 | Login with code | N/A | Keep app-level |
| `clearUserSession()` | 4202-4210 | Logout | N/A | Keep app-level |
| `#resetInitializationFlags()` | 4212-4227 | Reset flags on logout | N/A | Remove when tabs independent |
| `#resetUIState()` | 4229-4291 | Reset UI on logout | N/A | Keep app-level |
| `#showLoginButton()` | 4293-4306 | Show login button | N/A | Keep app-level |
| `#showTermsOfService()` | 4308-4326 | Show terms modal | N/A | Keep app-level |

**Action:** Keep authentication/modal code at app level, these won't migrate to tabs

---

### 2.3 Admin Tab Methods

#### Admin Master Schedule Tab (`admin-master-schedule`)

| Method | Line | Purpose | Complexity |
|--------|------|---------|------------|
| `#populateFilterDropdowns()` | 2196-2393 | Populate filters | HIGH |
| `#sortRegistrations()` | 2395-2433 | Sort by time/length/instrument | MEDIUM |
| `#buildRegistrationTable()` | 2435-2743 | Build master schedule table | **VERY HIGH** |

**Data Needed:**
- registrations (for selected trimester)
- students
- instructors
- classes
- rooms

**Migration:** Phase 4.1 - High complexity

---

#### Admin Wait List Tab (`admin-wait-list`)

| Method | Line | Purpose | Complexity |
|--------|------|---------|------------|
| `#buildWaitListTable()` | 2745-2875 | Build wait list table | LOW |

**Data Needed:**
- registrations (rock band only, wait list status)
- students
- instructors
- classes

**Migration:** Phase 3.2 - Low complexity

---

#### Admin Registration Tab (`admin-registration`)

| Method | Line | Purpose | Complexity |
|--------|------|---------|------------|
| `#initAdminContent()` | 392-447 | Initialize admin UI | MEDIUM |
| `#setupAdminTabSyncListeners()` | 449-477 | Tab change listeners | MEDIUM |
| `#rebuildAdminTables()` | 1886-1913 | Rebuild after trimester change | MEDIUM |
| `#setAdminRegistrationLoading()` | 2184-2194 | Show loading state | LOW |
| `async #loadTrimesterData()` | 1859-1884 | Load data for trimester | HIGH |
| `async #handleTrimesterChange()` | 1727-1781 | Handle trimester switch | HIGH |
| `#showTrimesterErrorOverlay()` | 1783-1847 | Show error overlay | LOW |

**Data Needed:**
- AdminRegistrationForm (separate file, already exists)
- registrations (for selected trimester)
- students (all)
- instructors
- classes
- rooms

**Migration:** Phase 4.3 - Very high complexity (uses AdminRegistrationForm workflow)

---

#### Trimester Selector (Admin Only, Shared Component)

| Method | Line | Purpose | Complexity |
|--------|------|---------|------------|
| `#initTrimesterSelector()` | 1606-1725 | Initialize trimester selector | MEDIUM |
| `#capitalizeTrimester()` | 1849-1857 | Capitalize trimester name | TRIVIAL |
| `#refreshTablesAfterRegistration()` | 1265-1375 | Refresh after CRUD | HIGH |

**Action:** Create `TrimesterSelector` component in Phase 1/2

---

### 2.4 Instructor Tab Methods

#### Instructor Weekly Schedule Tab (`instructor-weekly-schedule`)

| Method | Line | Purpose | Complexity |
|--------|------|---------|------------|
| `#initInstructorContent()` | 479-593 | Initialize instructor UI | HIGH |
| `#buildWeeklySchedule()` | 2956-3149 | Build weekly schedule table | **VERY HIGH** |

**Data Needed:**
- registrations (for THIS instructor only)
- students (for THIS instructor's students only)
- classes
- rooms
- currentPeriod

**Migration:** Phase 3.3 - Medium complexity (complex rendering but no mutations)

---

#### Instructor Directory Tab (`instructor-forte-directory`)

| Method | Line | Purpose | Complexity |
|--------|------|---------|------------|
| `#buildDirectory()` | 3151-3202 | Build employee directory | LOW |
| `#sortEmployeesForDirectory()` | 3204-3251 | Sort by last name | LOW |
| `adminEmployees()` | 3404-3428 | Map admins to employees | LOW |
| `instructorToEmployee()` | 3430-3452 | Map instructors to employees | LOW |
| `async #copyToClipboard()` | 3376-3402 | Copy email to clipboard | TRIVIAL |

**Data Needed:**
- admins (small list)
- instructors (small list)

**Migration:** Phase 2 - **PILOT TAB** - Low complexity, perfect for proving pattern

---

### 2.5 Parent Tab Methods

#### Parent Weekly Schedule Tab (`parent-weekly-schedule`)

| Method | Line | Purpose | Complexity |
|--------|------|---------|------------|
| `#initParentContent()` | 595-798 | Initialize parent UI | **VERY HIGH** |
| `#renderParentWaitListSection()` | 800-889 | Render wait list section | MEDIUM |
| `#parentHasAnyRegistrations()` | 891-928 | Check if parent has regs | LOW |
| `#renderParentScheduleSection()` | 930-1034 | Render schedule section | HIGH |
| `#buildParentWaitListTable()` | 2877-2954 | Build wait list table | MEDIUM |
| `#rebuildParentWeeklySchedule()` | 1963-2031 | Rebuild after trimester change | MEDIUM |
| `async #loadParentTrimesterData()` | 1915-1961 | Load parent trimester data | HIGH |

**Data Needed:**
- registrations (for THIS parent's students only)
- students (for THIS parent only)
- instructors
- classes
- currentPeriod

**Migration:** Phase 3.4 - Medium complexity

---

#### Parent Registration Tab (`parent-registration`)

| Method | Line | Purpose | Complexity |
|--------|------|---------|------------|
| `#attachIntentDropdownListeners()` | 1036-1135 | Attach intent listeners | HIGH |
| `async #showIntentConfirmationModal()` | 1137-1263 | Show intent confirmation | MEDIUM |
| `async submitIntent()` | 3299-3374 | Submit intent (keep/drop) | MEDIUM |
| `#updateIntentBanner()` | 1532-1604 | Update intent banner | MEDIUM |
| `async #createRegistrationWithEnrichment()` | 1377-1530 | Create registration + enrich | **VERY HIGH** |
| `async #requestDeleteRegistrationAsync()` | 3253-3297 | Delete registration | MEDIUM |

**Data Needed:**
- ParentRegistrationForm (separate file, already exists)
- registrations (for THIS parent only)
- nextTrimesterRegistrations (during enrollment)
- students (for THIS parent only)
- instructors
- classes
- currentPeriod

**Migration:** Phase 4.2 - Very high complexity (uses ParentRegistrationForm workflow)

---

#### Parent Contact Tab (`parent-contact-us`)

| Method | Line | Purpose | Complexity |
|--------|------|---------|------------|
| `#buildDirectory()` | 3151-3202 | Build admin directory | LOW |
| `#sortEmployeesForDirectory()` | 3204-3251 | Sort by last name | LOW |
| `adminEmployees()` | 3404-3428 | Map admins to employees | LOW |

**Data Needed:**
- admins (small list)

**Migration:** Phase 3.1 - Low complexity (reuses directory methods)

---

### 2.6 Shared/Global Methods

These methods are used across multiple tabs:

| Method | Line | Purpose | Used By | Migration Target |
|--------|------|---------|---------|------------------|
| `#setPageLoading()` | 2161-2182 | Page loading overlay | ALL | Keep in app root or TabController |
| `#showLoadingState()` | 2033-2072 | Tab loading state | Admin, Parent | TabController or BaseTab |
| `#showMaintenanceMode()` | 2074-2097 | Maintenance overlay | ALL | Keep in app root |
| `#hideMaintenanceMode()` | 2099-2116 | Hide maintenance | ALL | Keep in app root |
| `overrideMaintenanceMode()` | 2118-2159 | Override for admins | ALL | Keep in app root |
| `async #getStudents()` | 3454-3468 | Get students list | Multiple | Move to data service or remove |

---

## Part 3: Data Dependency Mapping

### 3.1 Current Problem: EVERYTHING Loads EVERYTHING

**In `loadUserData()` (lines 203-208), ALL users get:**

```javascript
const [admins, instructors, students, registrations, classes, rooms] = await Promise.all([
  HttpService.fetch('admins'),           // ~5-10 records
  HttpService.fetch('instructors'),      // ~20-30 records
  HttpService.fetchAllPages('students'), // ~200-500 records ⚠️ LARGE
  HttpService.fetchAllPages('registrations'), // ~500-1500 records ⚠️ VERY LARGE
  HttpService.fetch('classes'),          // ~10-20 records
  HttpService.fetch('rooms'),            // ~5-10 records
]);
```

**Problem:** A parent viewing their schedule gets ALL 500+ students and ALL 1500+ registrations!

---

### 3.2 Per-Tab Data Needs (What Each Tab Actually Needs)

#### Admin Master Schedule
**Needs:**
- registrations (for selected trimester only) - ~300-500 records
- students (all) - needed for lookups
- instructors (all)
- classes (all)
- rooms (all)

**Doesn't Need:**
- admins
- registrations from other trimesters

**API Endpoint to Create:**
```
GET /api/admin/tabs/master-schedule/:trimester
→ { registrations, students, instructors, classes, rooms }
```

---

#### Admin Wait List
**Needs:**
- registrations (rock band only, wait list status, selected trimester)
- students (for those registrations only)
- instructors (all)
- classes (rock band classes only)

**API Endpoint to Create:**
```
GET /api/admin/tabs/wait-list/:trimester
→ { registrations, students, instructors, classes }
```

---

#### Admin Registration Form
**Needs:**
- registrations (for selected trimester)
- students (all, for autocomplete)
- instructors (all, for availability)
- classes (all)
- rooms (all)

**API Endpoint to Create:**
```
GET /api/admin/tabs/registration/:trimester
→ { registrations, students, instructors, classes, rooms }
```

---

#### Instructor Weekly Schedule
**Needs:**
- registrations (for THIS instructor only, current trimester)
- students (for THIS instructor's students only)
- classes (all)
- rooms (all)
- currentPeriod

**API Endpoint to Create:**
```
GET /api/instructor/tabs/weekly-schedule
→ { registrations, students, classes, rooms, currentPeriod }
```

**Estimated Size:** ~20-50 registrations instead of 1500!

---

#### Instructor Directory
**Needs:**
- admins (~5-10 records)
- instructors (~20-30 records)

**API Endpoint to Create:**
```
GET /api/instructor/tabs/directory
→ { admins, instructors }
```

**Estimated Size:** ~30-40 records total - TINY!

---

#### Parent Weekly Schedule
**Needs:**
- registrations (for THIS parent's students only, selected trimester)
- students (for THIS parent only)
- instructors (all, for display names)
- classes (all)
- currentPeriod

**API Endpoint to Create:**
```
GET /api/parent/tabs/weekly-schedule/:trimester
→ { registrations, students, instructors, classes, currentPeriod }
```

**Estimated Size:** ~5-20 registrations instead of 1500!

---

#### Parent Registration Form
**Needs:**
- registrations (for THIS parent only, next trimester during enrollment)
- students (for THIS parent only)
- instructors (all, for availability)
- classes (all)
- currentPeriod

**API Endpoint to Create:**
```
GET /api/parent/tabs/registration
→ { registrations, students, instructors, classes, currentPeriod }
```

**Estimated Size:** ~5-20 registrations instead of 1500!

---

#### Parent Contact Us
**Needs:**
- admins (~5-10 records)

**API Endpoint to Create:**
```
GET /api/parent/tabs/contact
→ { admins }
```

**Estimated Size:** ~5-10 records - TINY!

---

## Part 4: Migration Complexity & Priority

### 4.1 Complexity Assessment

| Tab | Complexity | Method Count | Data Size | API Calls | Priority |
|-----|------------|--------------|-----------|-----------|----------|
| `instructor-paylocity` | TRIVIAL | 0 | 0 | 0 | SKIP |
| `instructor-forte-directory` | LOW | 4 | Tiny (~40 records) | 1 | **1st (PILOT)** |
| `parent-contact-us` | LOW | 3 | Tiny (~10 records) | 1 | 2nd |
| `admin-wait-list` | LOW | 1 | Small (~50-100 records) | 1 | 3rd |
| `instructor-weekly-schedule` | MEDIUM | 2 | Medium (~50 records) | 1 | 4th |
| `parent-weekly-schedule` | MEDIUM | 6 | Medium (~20 records) | 1 | 5th |
| `admin-master-schedule` | HIGH | 3 | Large (~500 records) | 1 | 6th |
| `parent-registration` | VERY HIGH | 6 + Form | Medium (~20 records) | 2 | 7th |
| `admin-registration` | VERY HIGH | 7 + Form | Large (~500 records) | 2 | 8th (LAST) |

---

### 4.2 Final Migration Order

**Phase 2 (Pilot):**
1. `instructor-forte-directory` - LOW complexity, tiny data, perfect for proving pattern

**Phase 3 (Simple tabs):**
2. `parent-contact-us` - LOW complexity, tiny data, proves parent tab pattern
3. `admin-wait-list` - LOW complexity, small data, proves admin tab pattern
4. `instructor-weekly-schedule` - MEDIUM complexity, no mutations, proves complex rendering
5. `parent-weekly-schedule` - MEDIUM complexity, multiple tables, proves multi-section pattern

**Phase 4 (Complex tabs):**
6. `admin-master-schedule` - HIGH complexity, filtering/sorting, large data
7. `parent-registration` - VERY HIGH complexity, CRUD operations, ParentRegistrationForm
8. `admin-registration` - VERY HIGH complexity, CRUD operations, AdminRegistrationForm

---

## Part 5: Backend API Changes Needed

### 5.1 New Endpoints to Create

All endpoints below need to be created on the backend:

```javascript
// Admin tab endpoints
GET /api/admin/tabs/master-schedule/:trimester
GET /api/admin/tabs/wait-list/:trimester
GET /api/admin/tabs/registration/:trimester

// Instructor tab endpoints
GET /api/instructor/tabs/weekly-schedule
GET /api/instructor/tabs/directory

// Parent tab endpoints
GET /api/parent/tabs/weekly-schedule/:trimester
GET /api/parent/tabs/registration
GET /api/parent/tabs/contact
```

### 5.2 Existing Endpoints to Modify

**Keep as-is (still needed):**
```javascript
GET  /api/configuration           // App config (keep)
POST /api/authenticateByAccessCode // Login (keep)
POST /api/registrations           // Create registration (keep)
POST /api/registrations/next-trimester // Create registration (keep)
DELETE /api/registrations/:id     // Delete registration (keep)
PUT  /api/registrations/:id/intent // Update intent (keep)
POST /api/feedback                // Feedback (keep)
GET  /api/version                 // Version (keep)
```

**Remove after migration complete:**
```javascript
GET /api/admins                   // Replace with tab-specific endpoints
GET /api/instructors              // Replace with tab-specific endpoints
GET /api/students                 // Replace with tab-specific endpoints
GET /api/registrations            // Replace with tab-specific endpoints
GET /api/classes                  // Replace with tab-specific endpoints
GET /api/rooms                    // Replace with tab-specific endpoints
```

---

## Part 6: Next Steps

### 6.1 Immediate (Complete Phase 0)
- [x] Method mapping completed
- [x] API endpoint inventory completed
- [x] Data dependency mapping completed
- [ ] Create feature branch
- [ ] Take performance baselines
- [ ] Document backend API requirements

### 6.2 Phase 1 (Core Infrastructure)
- [ ] Create `TabController` class
- [ ] Create `BaseTab` class
- [ ] Create `SessionService` for user/session management
- [ ] Create new utility files (dateUtils.js, stringUtils.js)
- [ ] Update HttpService with tab-specific methods
- [ ] Write tests for all core infrastructure

### 6.3 Backend Work (Parallel Track)
- [ ] Create new tab-specific API endpoints (8 endpoints)
- [ ] Implement scoped data filtering (instructor-only, parent-only)
- [ ] Add integration tests for new endpoints
- [ ] Document API responses

---

## Appendix A: Method Summary

**Total Methods in viewModel.js:** 58

**Migration Breakdown:**
- Keep at app level (authentication/modals): 23 methods
- Migrate to utilities: 3 methods
- Migrate to admin tabs: 14 methods
- Migrate to instructor tabs: 6 methods
- Migrate to parent tabs: 12 methods

**After Migration:**
- viewModel.js will be DELETED
- App-level code moves to main.js or sessionManager.js
- Tab-specific code moves to individual tab classes
- Utilities move to utility modules

---

**Analysis Complete:** 2025-11-08
**Ready for Phase 1:** YES
**Blockers:** None (backend changes can happen in parallel)
