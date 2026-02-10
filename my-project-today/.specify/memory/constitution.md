# <!--
# Sync Impact Report
# Version change: unspecified -> 1.0.0
# Modified principles:
# - [PRINCIPLE_1_NAME] -> Library-First
# - [PRINCIPLE_2_NAME] -> CLI Interface
# - [PRINCIPLE_3_NAME] -> Test-First (NON-NEGOTIABLE)
# - [PRINCIPLE_4_NAME] -> Integration Testing
# - [PRINCIPLE_5_NAME] -> Observability & Versioning
# Added sections:
# - Constraints & Standards
# - Development Workflow
# Removed sections:
# - None
# Templates requiring updates:
# - .specify/templates/plan-template.md ⚠ pending
# - .specify/templates/spec-template.md ⚠ pending
# - .specify/templates/tasks-template.md ⚠ pending
# - .specify/templates/commands/*.md ⚠ pending
# Follow-up TODOs:
# - TODO(RATIFICATION_DATE): original ratification date unknown; project maintainers must set this.
# -->

# my-project-today Constitution
<!-- Project constitution for the my-project-today repository -->

## Core Principles

### Library-First
Every new capability MUST start as a standalone library or module with a clearly
defined public API and documentation. Libraries MUST be self-contained,
independently testable, and usable without the rest of the system. Rationale:
modular design promotes reuse, clear ownership, and easier testing and review.

### CLI Interface
Where applicable, libraries SHOULD expose a small CLI or script wrapper that
follows a text I/O contract: arguments/stdin → stdout for results, and stderr for
errors. Tools MUST support machine-friendly output (JSON) and a human-readable
format. Rationale: a simple CLI ensures reproducible, debuggable workflows and
automation-friendly integration.

### Test-First (NON-NEGOTIABLE)
Tests MUST be written before implementation for any new feature or library. The
team follows the Red-Green-Refactor cycle: write failing tests, implement to
make them pass, then refactor. Unit tests are REQUIRED; contract and
integration tests are REQUIRED for public APIs and cross-component behavior.
Rationale: Prevent regressions and ensure requirements are testable and
verifiable.

### Integration Testing
Integration tests MUST cover critical interactions: new library contracts,
backwards-compatibility when changing public APIs, inter-service communications,
and shared schema migrations. Integration tests MUST be automated in CI and
exercise real interfaces wherever practical (or faithful test doubles when
necessary).

### Observability & Versioning
All services and libraries MUST emit structured logs and basic metrics (request
counts, errors, latencies). Releases MUST follow semantic versioning
(`MAJOR.MINOR.PATCH`). Breaking changes require a MAJOR version bump plus a
published migration guide. Non-breaking feature additions require a MINOR bump.
Rationale: Observable systems are diagnosable in production; semver makes
compatibility expectations explicit.

## Constraints & Standards

- **Technology policy**: Use maintained LTS language versions. Dependency
	upgrades MUST be reviewed and pinned in manifests. Security-critical
	dependencies MUST be scanned for vulnerabilities before release.
- **Licensing**: All third-party dependencies MUST have compatible licenses.
- **Secrets & credentials**: Secrets MUST never be stored in the repository.
	Use approved secret management and rotation policies.
- **Performance & resource limits**: Performance goals and resource budgets
	(memory, CPU) MUST be specified in implementation plans when relevant.

Rationale: Clear constraints reduce surprises at build and runtime and enable
automated checks.

## Development Workflow

- **Branching**: Work happens on short-lived feature branches. Branch names MUST
	follow `feature/` or `fix/` prefixes and reference the task or spec ID when
	applicable.
- **Code review**: All changes MUST be reviewed via PR by at least one
	maintainer; significant or architecture changes REQUIRE two reviewers.
- **CI gates**: PRs MUST pass all automated checks (lint, unit tests, contract
	tests) before merge. Integration tests that are slow MAY run in a staged CI
	environment but results MUST be green for release branches.
- **Commits & changelogs**: Commits SHOULD be small and focused. Releases MUST
	include a human-readable changelog summarizing user-visible changes and any
	migration steps.

Rationale: A consistent workflow preserves quality, traceability, and safe
releases.

## Governance

Amendments to this constitution MUST be proposed via a documented PR that
includes: the proposed text changes, a rationale, and a migration or
compliance-check plan for effected projects. A constitutional amendment is
adopted when approved by a majority of active maintainers; if a maintainer
roster is not established, adoption requires at least two independent reviewer
approvals from active contributors.

- **Versioning policy**: The constitution itself follows semantic versioning.
	- MAJOR: Backwards-incompatible governance changes (principle removal or
		redefinition).
	- MINOR: New principle or material expansion of existing guidance.
	- PATCH: Clarifications, fixes, or editorial improvements.

- **Compliance**: PRs affecting code, templates, or release processes MUST
	include a short compliance checklist referencing the relevant principles.

- **Review cadence**: The constitution SHOULD be reviewed annually or when
	a major governance change is proposed.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date unknown | **Last Amended**: 2026-02-10
