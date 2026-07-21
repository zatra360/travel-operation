# AGENTS.md

> Authoritative rules for every specialized agent working in this repository.

This file is the **root of authority** for the agent operating system
that lives in `./agents/`. Every agent, every workflow, and every
checklist in this repository MUST follow the rules in this file. If
an instruction conflicts with an agent's own document, the rule in
`AGENTS.md` wins.

---

## 1. What the agent system is

`./agents/` is a directory of **eight specialised agents** that
collaborate on development tasks through role-based invocations. Each
agent reads its own markdown file to discover its responsibilities,
output contract, and prohibited actions.

| Agent                                                      | Invocation                       | Read first                                  |
| ---------------------------------------------------------- | -------------------------------- | ------------------------------------------- |
| [Software Architect](./agents/software-architect.md)       | `/agents software-architect`     | architecture, API contracts, data ownership |
| [Product Analyst](./agents/product-analyst.md)             | `/agents product-analyst`        | business rules, edge cases, acceptance      |
| [Code Writer](./agents/code-writer.md)                     | `/agents code-writer`            | existing patterns, all affected layers      |
| [Code Reviewer](./agents/code-reviewer.md)                 | `/agents code-reviewer`          | diff + surrounding code + spec             |
| [QA Engineer](./agents/qa-engineer.md)                     | `/agents qa-engineer`            | behaviour + edge + role matrix              |
| [Security Reviewer](./agents/security-reviewer.md)         | `/agents security-reviewer`      | auth, tenant, RBAC, supply chain            |
| [UI/UX Reviewer](./agents/ui-ux-reviewer.md)               | `/agents ui-ux-reviewer`         | usability, accessibility, mobile            |
| [Release Verifier](./agents/release-verifier.md)           | `/agents release-verifier`       | full 360-degree evidence                    |

`./agents/workflows/` defines **how agents are sequenced** for common
jobs (new feature, bug fix, audit, PR review, production readiness).

`./agents/checklists/` defines **what "done" looks like** for every
domain (architecture, API, database, UI, security, release, DoD).

---

## 2. Invocation

Agents are invoked through slash commands. The repository owner wires
these to a runner; the agents themselves do not parse slash commands —
they respond to the role they were summoned as.

```text
/agents software-architect
/agents product-analyst
/agents code-writer
/agents code-reviewer
/agents qa-engineer
/agents security-reviewer
/agents ui-ux-reviewer
/agents release-verifier
```

A workflow (`./agents/workflows/*.md`) defines the **handoff chain**
for a job — the agent must follow the chain in order and stop when
the chain stops.

---

## 3. Global rules

Every agent must:

1. **Inspect relevant existing code first.** Do not propose code when
   suitable implementations already exist.
2. **Use the smallest suitable workflow.** If a task is small, run the
   `fix-bug` workflow, not `implement-feature`.
3. **Produce evidence for completion.** "Tests pass", "lint clean",
   "RBAC verified on three roles" — each requires a command, a
   transcript, or a screenshot.
4. **Never claim completion merely because code was generated.**
   Generating code without verifying behaviour, RBAC, and lifecycle
   does not satisfy the Definition of Done.

Every agent must **protect** the following invariants of the
platform:

- Tenant isolation (every tenant-owned entity carries `tenantId`).
- Branch isolation (operational entities carry `branchId` when
  scoped).
- Backend-enforced RBAC (frontend checks never replace backend
  authorisation).
- Plug-and-play modules (optional modules never create hard
  dependencies on other optional modules).
- Shared reusable architecture (prefer established utilities over
  new helpers).
- Database integrity (migrations are atomic, reversible, and
  reviewed).
- Audit logging (every state change writes `audit_logs`).
- Activity timeline (every state change writes `activity_logs`).
- Mobile-first UI.
- Accessibility.
- Keyboard usability.
- API consistency (use class-validator + Transform + tenant-scoped
  pagination envelope).
- Validation (backend and frontend, do not diverge).
- Error handling (non-empty normalised string `message`, never
  `[object Object]`).
- Documentation accuracy.
- Production scalability.

---

## 4. Non-negotiable prohibitions

- **No agent may weaken tenancy or RBAC.** A `permission`-gated
  endpoint stays permission-gated. A `tenantId` clause stays.
- **Frontend checks never replace backend authorisation.** Backend
  is the source of truth.
- **Bulk actions authorise every affected record.** A bulk delete
  cannot bypass per-record checks.
- **Users cannot manually switch tenant context.** The tenant id is
  derived from the JWT, never accepted from query params.
- **Cross-tenant record attachment is impossible.** Server enforces
  `tenantId` on every relation.
- **Presigned URLs are scoped and temporary.** Browser never sees
  raw credentials.
- **Secrets never reach browser bundles or logs.** Period.
- **Audit records cannot be edited through normal product APIs.**
  Audit writes are append-only.
- **Optional service modules do not create hard dependencies on
  other optional modules.** Use shared interfaces, domain events,
  or adapters.

---

## 5. Handoff contract

Every agent response must contain these blocks **in this order**:

```md
### Context
- Task requested
- Module involved
- Files inspected
- Existing status

### Findings
- Confirmed facts
- Defects
- Dependencies
- Risks

### Work performed
- Files created
- Files modified
- Data changes
- API changes
- UI changes
- Permission changes
- Test changes

### Verification
- Commands executed
- Tests executed
- Routes tested
- Roles tested
- Tenant isolation result
- Branch isolation result
- Desktop result
- Mobile result
- Error-state result

### Remaining work
- Blockers
- Deferred work
- Manual checks
- Migration concerns
- Deployment considerations
```

If any block is empty, the agent must write `None` rather than
omitting the section.

---

## 6. Definition of Done

A task is complete when **all** of the following are true (see
[`agents/checklists/definition-of-done.md`](./agents/checklists/definition-of-done.md)
for the full list):

- Requirements implemented
- Architecture respected
- Database migration reviewed
- Tenant isolation verified
- Branch isolation verified
- RBAC enforced
- Backend validation added
- Frontend validation added
- Audit logging added
- Activity timeline integrated
- Loading, empty, error, permission-denied, disabled-module
  states all rendered
- Mobile layout verified
- Accessibility checked
- Tests added or updated
- `pnpm lint` passes (or pre-existing failures are explicitly
  recorded as "pre-existing")
- `pnpm test` passes (or pre-existing failures are explicitly
  recorded)
- `pnpm build` passes (or pre-existing failures are explicitly
  recorded)
- Documentation updated
- Final diff reviewed
- No unresolved high-severity defect

Documentation-only changes skip the build/test requirements unless
they touch scripts that run them, but every documentation change
must be reviewed against the accuracy rule (no fabricated APIs,
schemas, or commands).

---

## 7. Branching and commits

- The default branch is `main`. Do not commit directly to `main`.
- Use `agent/<scope>-<purpose>` for agent work
  (example: `agent/agent-operating-system`).
- Stage **only** files relevant to the change. Pre-existing
  uncommitted changes must be preserved untouched.
- Commit messages follow Conventional Commits
  (`docs:`, `feat:`, `fix:`, `refactor:`, `test:`, `chore:`).
- A draft PR is opened at the end of every agent-driven change
  (the release verifier promotes it from draft → ready for review
  when status returns `READY` or `READY WITH KNOWN LOW-RISK
  ITEMS`).

---

## 8. Escalation paths

| Symptom                                                       | Owner                    |
| ------------------------------------------------------------- | ------------------------ |
| Architectural ambiguity                                       | Software Architect       |
| Behaviour undefined for edge case                             | Product Analyst          |
| High-severity defect remains open                             | Code Reviewer            |
| Unresolved test failure                                       | QA Engineer              |
| Security finding open                                         | Security Reviewer        |
| UX/accessibility regression                                   | UI/UX Reviewer           |
| Release decision required (READY / NOT READY / BLOCKED)       | Release Verifier         |
| Any agent wants to deviate from `AGENTS.md`                   | Repository owner (human) |

---

## 9. Scope of this directory

This `/agents` system is the **only** sanctioned way to coordinate
AI-assisted work on this repository. Ad-hoc prompts without an
agent role are not part of the operating system.

When in doubt, ask the repository owner before extending an agent's
authority or bypassing a checklist.
