# Feature Specification: Error Contract Uniformization

**Feature Branch**: `016-error-contract-uniformization`
**Created**: 2026-05-30
**Status**: Stub
**Part of**: Audit remediation cluster (specs 015–020)
**Previous**: [015-audit-remediation](../015-audit-remediation/spec.md)
**Next**: [017-uniform-crud-completion](../017-uniform-crud-completion/spec.md)

> **This is a stub, not a spec.** Captures intent only. The real spec is
> authored on this branch when the work is picked up; speccing it now would
> pre-decide answers that should fall out of an explicit design discussion.

## Overview

The 2026-05-30 audit flagged that the backend has more than one error contract in active use. The goal of this spec is to pick one and make every code path comply.

## Findings to address

The audit identified these inconsistencies; this spec resolves all of them as one design decision.

- **Mixed not-found semantics in repositories.** Some methods return `null` on miss (e.g., `userRepository.getAdminByAccessCode`), others throw `NotFoundError` (e.g., `userRepository.getInstructorById`). Controllers cannot assume one shape, which leaks defensive coding into every caller. Pick one rule.
- **Duplicate response logging.** Both `successResponse()` and `errorResponse()` ([responseHelpers.ts:107–113, 160–161](../../src/common/responseHelpers.ts)) auto-log to GCP when given `req` and `startTime`. Some controllers also log manually before calling them, producing two Cloud Logging entries per request. Decide who owns logging and forbid the other path (probably a comment block in `responseHelpers.ts`, possibly an ESLint rule).
- **`asString()` silently takes the first array element** ([responseHelpers.ts:77–88](../../src/common/responseHelpers.ts)) when a query param appears multiple times. Decide: warn, reject, or document-as-intentional.
- **Audit-trail best-effort semantics.** When `registrationRepository.create()` persists a row but the subsequent `writeAudit()` call fails, the registration exists without an audit entry. No transaction boundary. Decide: (a) pin best-effort and document, (b) reverse the order so audit happens first, (c) introduce a real two-phase pattern. Probably (a) given the data store, but the decision needs to be explicit.
- **`authenticateByAccessCode` returns `{ success: true, data: null }` on miss** ([userController.ts](../../src/controllers/userController.ts)). The current comment says "required for frontend compatibility" without saying why. Either fix the response to be a real 401 and update the frontend, or document the actual frontend constraint and live with it. If left as-is, the inline comment from [015's US3](../015-audit-remediation/spec.md) covers it.
- **`AuthenticatedUser` carries response-level fields.** The canonical `AuthenticatedUser` interface in [src/web/js/auth/session.ts](../../src/web/js/auth/session.ts) (introduced by 015 US4) carries `systemError?: boolean` and `error?: string` fields. Those describe the response, not the user — they shouldn't be on a user shape. The correct fix is either (a) split into `AuthenticatedUser` (user-only) and `AuthenticationResponse` (discriminated union: `{user: AuthenticatedUser} | {error: string, systemError: true}`), OR (b) make the auth endpoint conform to the standard envelope from [responseHelpers.ts](../../src/common/responseHelpers.ts) and let `HttpService`'s `HttpResult<T>` carry the success/failure split. This is the same family of question as the `{success:true, data:null}` bullet above — both stem from the auth endpoint having bespoke response shapes — so resolve them together.
- **Auth ladder fallback re-tries the SAME path, not the opposite.** The fallback block in [extractAuthenticatedUser](../../src/middleware/auth.ts) is intended to recover when the first-pass lookup misses, but it re-runs the same path under a slightly different condition (the existing inline comment calls this "fallback to opposite method" — that framing is wrong, surfaced by 015 US6 tests). For a 10-digit code with no header, parent lookup is tried, misses, and is tried again. The employee path is NEVER reached for a 10-digit code unless the caller sends an explicit `x-login-type: employee` header. Either rewrite the fallback to actually try the opposite path (and update the inline comment to match), or accept the current behavior and rewrite the comment to describe what it really does. The user-facing impact is likely small (parents and employees have disjoint code formats in practice) but the misleading comment is a trap for future maintainers.
- **Explicit `x-login-type: employee` header does NOT skip the parent lookup for a 10-digit code.** The format heuristic in the first block (`isPhoneNumber || loginType === PARENT`) fires parent lookup first regardless of an explicit employee header. If the parent lookup matches anyone, the caller's `x-login-type: employee` intent is silently ignored and they receive the parent identity. This is real even when callers (e.g., a future admin UI logging in via a 10-digit MFA-style code) explicitly request employee auth. Surfaced by 015 US6 tests. Fix is probably "explicit header beats format heuristic" (change the conditions so an explicit header short-circuits the wrong-side path), but this is a security-adjacent decision and worth confirming with whoever owns the auth flow.

## Why this is deferred

A "uniform error contract" is a single design decision that touches every controller, every repository, and the response helpers. Pulling it into 015 would have made that spec twice as long and would have blocked the doc-heavy work on an architectural debate. Splitting it out lets the docs ship while this question gets its own focused discussion.

## Dependencies

- Should ship after [015-audit-remediation](../015-audit-remediation/spec.md) so that the architecture doc (US2 of 015) doesn't get rewritten mid-flight when this lands.
- Should ship before [017-uniform-crud-completion](../017-uniform-crud-completion/spec.md) so that the CRUD refactor inherits a clean error contract.
