# Harness Factory Map

Harness Factory Map is a local-first, interactive architecture and specification workspace for designing an enterprise AI agent harness before implementing the production runtime.

The repository treats Markdown specifications as the source of truth. A generated visual map presents system components, workflows, ownership, permissions, boundaries, failure behaviour, delivery status, and relationships. Selecting a node opens the relevant specification.

This repository is the design and delivery map for a future enterprise harness. It is not the production harness runtime.

## Project goals

The first release must:

- Render a visual system map from Markdown front matter.
- Allow users to select a component and read its specification.
- Show relationships between components.
- Filter the map by plane, scope, status, actor type, and risk.
- Trace one bounded engineering-ticket workflow.
- Validate required specification fields and broken references.
- Run entirely on a personal laptop without a backend or cloud service.
- Keep Markdown and Git as the authoritative design history.

## Non-goals

The first release must not:

- Execute AI agents.
- Call Codex, an LLM API, Jira, GitHub, or production systems.
- Provide authentication or multi-user collaboration.
- Implement RAG, embeddings, a vector database, or a general knowledge graph.
- Automatically modify approved specifications.
- Become a workflow orchestrator.
- Deploy or operate production agents.
- Store authoritative data in browser local storage or an application database.

## Product concept

The application provides four related views over the same specification set:

1. **Architecture view** — components and dependencies.
2. **Workflow view** — technical, business, human, policy, and failure paths.
3. **Boundary view** — trust, permission, data, ownership, and execution boundaries.
4. **Delivery view** — specification and implementation readiness.

Markdown files under `specs/` are authoritative. The visual map is generated from their metadata.

```text
specs/**/*.md
      |
      v
spec parser and validator
      |
      v
generated/map.json
      |
      v
interactive application
```

## MVP vertical slice

The initial map covers one bounded engineering workflow:

```text
User Request
  -> Intake Service
  -> Task Contract
  -> Risk Classifier
  -> Orchestrator
  -> Policy Engine
  -> Agent Runtime
  -> Tool Gateway
  -> Sandbox
  -> Review Service
  -> Pull Request
  -> Audit Store
```

The map describes the intended future system. It does not perform these operations.

## Technology

- React
- TypeScript
- Vite
- React Flow
- Tailwind CSS
- `gray-matter` for front matter
- `react-markdown` for Markdown rendering
- Ajv for schema validation
- Vitest
- ESLint
- Prettier

The first release has no backend.

## Repository structure

```text
.
├── AGENTS.md
├── README.md
├── docs/
│   ├── product-spec.md
│   ├── architecture-rules.md
│   └── first-push-plan.md
├── schemas/
│   └── spec.schema.json
├── specs/
│   ├── system/
│   ├── components/
│   └── workflows/
├── scripts/
│   └── generate-map.ts
├── src/
│   ├── app/
│   ├── components/
│   ├── generated/
│   ├── graph/
│   ├── markdown/
│   └── types/
└── tests/
```

## Getting started

Prerequisites:

- Node.js 22 or later
- npm 10 or later

Install and run:

```bash
npm install
npm run generate
npm run dev
```

Quality checks:

```bash
npm run check
npm test
npm run build
```

## Source-of-truth rules

- Do not manually maintain graph nodes or edges in UI code.
- Every visible node must originate from a Markdown specification.
- Every relationship must be declared in specification metadata.
- Generated files must not be edited manually.
- Component ownership must be singular unless an explicit architecture decision allows otherwise.
- Missing references and invalid metadata must fail validation.
- AI-generated specification changes require normal Git diff review.

## Definition of done for the first release

The first release is complete when:

- The application loads the supplied specifications.
- All initial nodes and relationships are visible.
- Selecting a node opens its Markdown detail.
- Search and filtering work.
- The engineering-ticket trace can be highlighted.
- Invalid metadata, duplicate IDs, and unresolved references fail the generation command.
- `npm run check`, `npm test`, and `npm run build` pass.
- The repository contains no backend, external API integration, or agent execution logic.

## Licence

No licence is selected in the first push. Add one only after the repository's intended ownership and distribution model are decided.
