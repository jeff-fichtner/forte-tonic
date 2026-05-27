# Feature Specification: School-Year Rollover Migration

**Feature Branch**: `015-school-year-rollover`
**Created**: 2026-05-27
**Status**: Stub
**Part of**: School-year rollover initiative (Parts 1-3)
**Previous**: Part 1 — [014-summer-registration](../014-summer-registration/spec.md)
**Next**: Part 3 — [016-intent-phase-reduction](../016-intent-phase-reduction/spec.md)

> **This is a stub, not a spec.** Captures intent only. The real spec will be
> authored on the `014-summer-registration` branch once Part 1 ships, since
> Part 2's design depends on the data shape Part 1 produces. Do not implement
> from this document.

## Overview

In August, teachers receive a new student list — one big import that kicks off
the new school year. The registrations parents made during Part 1 (summer
registration, really "next fall") get translated into next year's
`registrations_fall` sheet, re-paired with each student at their new (bumped)
grade.

Likely builds on the [013-migration-system](../013-migration-system/spec.md)
infrastructure, since this is a one-shot bulk data migration.

## Why this is deferred

The shape of the rollover depends on details Part 1 will firm up — how the
August student import lines up with grade-bumped summer registrations, how
year boundaries are represented across sheets, and what the source-of-truth
records look like by August. Speccing this now would lock in assumptions
before they're validated.
