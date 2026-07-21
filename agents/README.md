# Agent Operating System

This directory defines the **specialised agents** that collaborate on
development tasks in this repository.

It is governed by `../AGENTS.md`. Each agent inherits the global
rules there and extends them with its own role-specific
responsibilities.

## Layout

```text
agents/
├── README.md                       this file
├── software-architect.md           architecture, data, contracts
├── product-analyst.md              user journeys, business rules
├── code-writer.md                  implementation across layers
├── code-reviewer.md                severity-tagged review
├── qa-engineer.md                  behaviour + role + isolation tests
├── security-reviewer.md            auth, tenancy, supply chain
├── ui-ux-reviewer.md               usability, accessibility, mobile
├── release-verifier.md             final 360-degree sign-off
├── workflows/                      multi-agent choreographies
│   ├── implement-feature.md        Analyst → Architect → Writer → ...
│   ├── fix-bug.md                  reproduce → diagnose → fix → retest
│   ├── audit-module.md             read-only multi-angle audit
│   ├── review-pull-request.md      PR + diff + spec triangulation
│   └── production-readiness.md     pre-deploy final pass
└── checklists/                     domain-specific DoD checklists
    ├── definition-of-done.md       universal completion gate
    ├── architecture-checklist.md   architect's review items
    ├── api-checklist.md            API design + tenancy rules
    ├── database-checklist.md       schema + migration rules
    ├── ui-checklist.md             UI + accessibility + mobile
    ├── security-checklist.md       authn + authz + secrets + supply
    └── release-checklist.md        pre-launch gates
```

## How to invoke

From the repository root:

```text
/agents <role>
```

Roles:

```text
software-architect
product-analyst
code-writer
code-reviewer
qa-engineer
security-reviewer
ui-ux-reviewer
release-verifier
```

When the task spans multiple agents, follow the chain in
`workflows/<name>.md`. Do not skip an agent unless the workflow
explicitly says you may.

## How agents communicate

Each agent produces a response with the same five blocks
(Context, Findings, Work performed, Verification, Remaining work).
This makes handoffs predictable — the next agent can lift the
previous agent's Verification block and add to it.

## How agents stay small

- Each agent file is bounded in scope to its own role.
- Cross-cutting concerns live in `AGENTS.md`, not duplicated.
- Every agent must consult `../AGENTS.md` before writing.

## Adding a new agent

Do not add a new agent without editing `AGENTS.md` and creating a
matching workflow + checklist. Every agent must be wired into the
operating system, not bolted on.
