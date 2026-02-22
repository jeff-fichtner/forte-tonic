# Research: Backend Test Coverage

## Decision 1: Controller Test Approach

**Decision**: Unit tests with mocked req/res and service container (not supertest HTTP tests)

**Rationale**: Existing integration tests use supertest, which bootstraps the full Express app with all middleware. For isolated controller method testing, this adds unnecessary complexity — every dependency in the app must be mocked even if the test only exercises one controller method. Direct method invocation with mocked req/res is faster, more isolated, and easier to write.

**Alternatives considered**:
- Supertest HTTP tests: More realistic but requires mocking the entire app dependency tree. Existing integration tests already cover this pattern for the controllers that have tests.

## Decision 2: Service Container Mocking Strategy

**Decision**: Use `jest.unstable_mockModule` to mock the service container at module level, with `get()` returning mock services by name.

**Rationale**: This is the established pattern in existing integration tests (`appConfiguration.test.ts`, `registrationController.test.ts`). Consistency with the existing codebase is more important than any theoretical improvement.

**Alternatives considered**:
- Constructor injection: Some services accept dependencies via constructor, but `registrationApplicationService` and `dropRequestService` use `serviceContainer.get()` internally. Mocking the container is the only approach that works without refactoring production code.

## Decision 3: Test File Organization

**Decision**: Place all new tests in `tests/unit/` organized by source directory (services, controllers, repositories, utils).

**Rationale**: These are unit tests — they mock all dependencies and test individual methods in isolation. The `tests/integration/` directory is for tests that exercise multiple layers together via HTTP (supertest). The existing directory structure (`tests/unit/services/`, `tests/unit/repositories/`) already establishes this convention.

**Alternatives considered**:
- Putting controller tests in `tests/integration/`: Would be appropriate if using supertest, but we're testing controller methods directly with mocked dependencies.

## Decision 4: No Shared Test Utilities

**Decision**: Inline mocks per test file. No shared mock factories or test helpers.

**Rationale**: The existing codebase has no shared test utilities. All mocks are defined inline within each test file. Adding shared helpers for 14 test files would be premature abstraction — each file's mocks are specific to the module under test and rarely identical.

**Alternatives considered**:
- Shared mock builder for service container: Would reduce duplication but add a new abstraction to learn. The mock setup is straightforward enough that copy-paste-modify is preferable for a one-time effort.
