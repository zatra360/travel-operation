# Workflow: Review a Pull Request

A merged review across every agent that can provide a relevant
perspective on the diff.

## Required reviews

For every PR, run at minimum:

1. **Task & acceptance criteria review** — does the diff
   implement the task? Are the acceptance criteria from the
   original ticket met?
2. **Full diff review** — every line, every file. No
   "drive-by" changes.
3. **Surrounding code inspection** — does the diff fit the
   patterns in nearby files?
4. **Schema and migration inspection** — reversible? Indexed?
   Back-fill plan attached?
5. **Authorization tracing** — every state-changing endpoint
   has the right permission.
6. **Input-to-database tracing** — DTOs strip unknown fields,
   class-validator enforces constraints.
7. **Database-to-UI tracing** — the UI shows what the database
   records.
8. **Test review** — failures covered, isolation covered,
   regression included.
9. **Documentation review** — spec, module DoD, audit notes
   updated.

## Agents invoked

- **Code Reviewer** — full diff + severity table.
- **Security Reviewer** — auth, tenancy, secrets, rate limit.
- **QA Engineer** — retests if any user-facing behaviour
  changed.
- **UI/UX Reviewer** — if any pixel touched.
- **Software Architect** — if any cross-layer change or
  migration.

The Release Verifier only runs at the end, once every other agent
has produced its findings and the Code Writer has resolved
Blocker / Critical / High.

## Severity-tagged findings

Every finding carries the same fields as `code-reviewer.md`:

- Severity (Blocker / Critical / High / Medium / Low)
- File
- Affected code or behaviour
- Impact
- Reproduction or reasoning
- Recommended correction

## PR template

Every PR uses `.github/pull_request_template.md`. The Code Writer
fills the template before requesting review. A reviewer who finds
an empty template section must refuse to merge.

## Refuse

- Approve without exercising every checkbox.
- Approve on "someone else will check it" promises.
- Approve when CI is red.
- Approve when docs are out of date.
