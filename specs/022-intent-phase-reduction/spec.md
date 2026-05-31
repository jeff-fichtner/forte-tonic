# Feature Specification: Intent Phase Reduction

**Feature Branch**: `022-intent-phase-reduction`
**Created**: 2026-05-27
**Status**: Stub
**Part of**: School-year rollover initiative (Parts 1-3)
**Previous**: Part 2 — [021-school-year-rollover](../021-school-year-rollover/spec.md)

> **This is a stub, not a spec.** Captures intent only. The real spec will be
> authored on the `014-summer-registration` branch once Parts 1 and 2 have
> shipped, because what (if anything) the intent phase still does is shaped
> by those changes. Do not implement from this document.

## Overview

Remove or significantly reduce the intent phase of registration. This is
partially motivated by changes already made and partially by the realization
that it isn't pulling its weight — but it must come after Parts 1 and 2 since
those are the higher-priority pieces of the school-year rollover initiative.

## Why this is deferred

The decision between "remove entirely" vs. "reduce to X" depends on what role
the intent phase still plays after summer registration (Part 1) and the August
rollover migration (Part 2) reshape the surrounding workflow. Speccing this
before those ship would pre-decide an answer that should fall out of the
post-rollover state.
