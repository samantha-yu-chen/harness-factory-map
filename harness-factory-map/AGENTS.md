# AGENTS.md

## Mission

Build the first local-only version of Harness Factory Map: an interactive visualisation generated from Markdown specifications.

Treat this repository as a specification product, not as an agent runtime. Do not implement production orchestration, agent execution, external integrations, or enterprise infrastructure unless a later approved specification explicitly introduces them.

## Authoritative inputs

Read these files before implementation:

1. `README.md`
2. `docs/product-spec.md`
3. `docs/architecture-rules.md`
4. `docs/first-push-plan.md`
5. `schemas/spec.schema.json`
6. Existing files under `specs/`

When requirements conflict, use this precedence:

1. Explicit task instructions
2. `docs/product-spec.md`
3. `docs/architecture-rules.md`
4. `README.md`
5. Existing implementation

Do not silently resolve material contradictions. Record them in the final implementation summary.

## Working rules

- Keep the first release frontend-only and local-first.
- Use TypeScript strict mode.
- Keep Markdown metadata as the graph source of truth.
- Never hard-code the canonical graph in React components.
- Generated files must include a header stating that they must not be edited manually.
- Validate metadata before generating application data.
- Fail fast on duplicate IDs, invalid enum values, and unresolved references.
- Prefer small modules with explicit responsibilities.
- Do not add dependencies unless they materially reduce implementation complexity.
- Do not introduce a state-management framework for the first release.
- Do not use browser storage as authoritative project storage.
- Do not add analytics, telemetry, authentication, databases, or remote services.
- Do not change the specification schema merely to make implementation easier without documenting the decision.

## Expected implementation sequence

1. Scaffold React, TypeScript, and Vite.
2. Configure ESLint, Prettier, Vitest, and strict TypeScript.
3. Implement specification types and schema validation.
4. Implement the Markdown discovery and generation script.
5. Generate `src/generated/map.json`.
6. Implement graph layout and rendering.
7. Implement node selection and Markdown detail panel.
8. Implement search and filters.
9. Implement workflow trace highlighting.
10. Implement validation tests and UI tests.
11. Run all checks and update documentation only where implementation evidence requires it.

## Boundaries

Allowed:

- Read and modify this repository.
- Add frontend dependencies listed in the product specification.
- Add tests, fixtures, build scripts, and documentation.
- Change internal folder structure when necessary, while preserving source-of-truth rules.

Forbidden:

- Calling external APIs at application runtime.
- Adding Codex or LLM invocation.
- Connecting to GitHub, Jira, Azure, databases, MCP servers, or cloud storage.
- Implementing login or role-based access control.
- Building a production workflow engine.
- Generating or executing shell commands from specification content.
- Rendering raw HTML from Markdown.
- Committing secrets, tokens, personal paths, or machine-specific configuration.

## Security requirements

- Treat all Markdown content as untrusted input.
- Do not enable raw HTML rendering.
- Do not execute code blocks.
- Do not interpret metadata values as JavaScript.
- Ensure file discovery cannot escape the `specs/` directory.
- Do not expose absolute local filesystem paths in generated application data.
- Do not use `dangerouslySetInnerHTML`.

## Testing requirements

At minimum, cover:

- Valid specification parsing.
- Invalid front matter rejection.
- Duplicate ID rejection.
- Unresolved relationship rejection.
- Generated graph contains expected nodes and edges.
- Node selection displays the correct specification.
- Search filters nodes by name and description.
- Plane and status filters work.
- Workflow trace highlights the expected path.
- Markdown raw HTML is not executed.

## Completion report

At the end of the task, report:

- What was implemented.
- Files and architecture added.
- Tests and commands run.
- Any deviation from the specification.
- Known limitations.
- Recommended next bounded ticket.

Do not claim completion unless all acceptance commands pass.
