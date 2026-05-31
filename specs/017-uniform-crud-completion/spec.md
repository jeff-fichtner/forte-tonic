# Feature Specification: Uniform CRUD Completion

**Feature Branch**: `017-uniform-crud-completion`
**Created**: 2026-05-30
**Status**: Stub
**Part of**: Audit remediation cluster (specs 015–020)
**Previous**: [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md)
**Next**: [018-business-rules-to-config](../018-business-rules-to-config/spec.md)

> **This is a stub, not a spec.** Captures intent only. The real spec is
> authored on this branch when the work is picked up.

## Overview

Constitution Principle XI ("Uniform CRUD Backend") says every repository must expose the same base interface and that no entity is special. The audit found one direct violation and one quasi-violation that point at a broader question: are there other places where the CRUD uniformity rule has been quietly broken?

## Findings to address

- **`RegistrationRepository.delete()` breaks Liskov.** It takes a required `trimester` parameter not present on `BaseRepository.delete(id, deletedBy)`. The compiler is silenced with `@ts-expect-error`. The reason — registrations live in per-trimester sheets — is real, but the fix is not "swallow the type error." Options: (a) accept the LSP carve-out as fundamental and codify it (extract a `TrimesteredRepository` base for registrations + future per-trimester entities), (b) move the trimester routing into a parameter object so the signature stays compatible, (c) accept that this entity legitimately is special and amend the constitution.
- **Audit the rest of the repository layer.** Before fixing this one, sweep all 7 repositories for other CRUD-shape inconsistencies. The audit only spot-checked. Look at: signature divergence from base, methods named for domain concepts that wrap a single CRUD call (forbidden by Principle XI), and any controller that bypasses the service layer for a "trivial" lookup.
- **Audit the service layer for thin pass-through methods.** Constitution Principle XI also says "if a service method does nothing beyond calling one repository method with the same arguments, it MUST NOT exist." The audit did not enumerate violations. Do that here.

## Why this is deferred

This is a layer-boundary refactor. Doing it inside [015-audit-remediation](../015-audit-remediation/spec.md) would have mixed a code-shape change with documentation work, and the right answer depends on the resolution of [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md) (the not-found-vs-throw decision changes what the base interface looks like).

## Dependencies

- Should ship after [016-error-contract-uniformization](../016-error-contract-uniformization/spec.md) so the base CRUD interface is settled before reshaping the repositories.
- May require a Constitution Principle XI amendment if option (c) above wins; if so, that amendment is a prerequisite.
