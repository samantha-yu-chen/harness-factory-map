# Product Specification: Harness Factory Map MVP

## 1. Product statement

Harness Factory Map is a local visual specification application used to design a future enterprise AI agent harness.

Its primary purpose is to make system responsibilities, boundaries, workflows, permissions, failure behaviour, and delivery readiness inspectable before production implementation begins.

## 2. Target user

The initial user is a system owner working locally on a personal laptop who:

- Defines enterprise harness architecture.
- Learns and applies system-design principles.
- Uses Codex as an implementation team.
- Needs a navigable source of truth for later bounded engineering tickets.

## 3. Primary user journey

1. The user starts the local application.
2. The application renders nodes generated from Markdown specifications.
3. The user searches, filters, or selects a view.
4. The user selects a component.
5. The application displays the component's full specification.
6. The user starts a workflow trace.
7. The application highlights each participating component and relationship.
8. The user sees missing or invalid specification information during generation or validation.

## 4. Functional requirements

### FR-1: Specification discovery

The generator must recursively discover `.md` files under `specs/`.

It must ignore:

- Files outside `specs/`.
- Non-Markdown files.
- Hidden files and directories.
- Generated output.

### FR-2: Front matter parsing

Every graph entity specification must contain YAML front matter conforming to `schemas/spec.schema.json`.

### FR-3: Validation

Generation must fail with a readable error when:

- A required property is missing.
- An enum value is invalid.
- Two entities share an ID.
- A relationship references an unknown entity.
- A workflow path references an unknown entity.
- A component claims an invalid ownership shape.
- A specification path escapes the permitted root.

### FR-4: Generated graph

The generator must create deterministic JSON containing:

- Entities.
- Edges.
- Workflow traces.
- Relative source paths.
- Renderable Markdown body.
- Validation metadata.

Generated content must not expose absolute filesystem paths.

### FR-5: Architecture map

The application must render entities as an interactive graph.

Each node must show:

- Name.
- Entity type.
- Plane.
- Status.
- Risk.

### FR-6: Detail panel

Selecting a node must display:

- Name and description.
- Source path.
- Ownership.
- Responsibilities.
- Does-not-own boundary.
- Inputs and outputs.
- Permissions and restrictions.
- Failure behaviour.
- Dependencies and relationships.
- Full Markdown body.

The first release may render structured metadata and Markdown body as separate sections.

### FR-7: Search

Search must match, at minimum:

- ID.
- Name.
- Description.
- Owner.
- Tags.

### FR-8: Filters

The application must filter by:

- Entity type.
- Plane.
- Scope.
- Status.
- Actor type.
- Risk.

Multiple active filters must use logical AND across filter categories and logical OR within one category.

### FR-9: View modes

The MVP must provide:

- Architecture.
- Workflow.
- Boundary.
- Delivery.

A view may alter visibility, emphasis, labels, or edge style. It does not require a separate data model.

### FR-10: Workflow trace

The supplied bounded engineering-ticket workflow must be selectable.

When selected:

- Participating nodes are highlighted.
- Participating edges are highlighted.
- Non-participating graph elements are visually de-emphasised.
- The ordered path is available as text for accessibility.

### FR-11: Reset and empty states

The user must be able to reset search, filters, selection, and workflow trace.

The application must show useful empty states when no nodes match.

### FR-12: Responsive operation

The app must remain usable at desktop and tablet widths. Mobile optimisation is desirable but not required for the first release.

## 5. Non-functional requirements

### NFR-1: Local operation

After dependency installation, development and production builds must run without remote services.

### NFR-2: Deterministic generation

The same specification input must produce byte-stable generated JSON, excluding an optional explicitly documented generation timestamp. Prefer no timestamp.

### NFR-3: Performance

With 200 entities and 500 edges on a normal personal laptop:

- Initial UI render should complete within two seconds after assets load.
- Search and filters should respond within 150 ms under normal use.

These are engineering targets, not production service-level objectives.

### NFR-4: Accessibility

- All controls require visible labels.
- Keyboard users must be able to select graph nodes through an alternative list or equivalent accessible control.
- Dynamic selection details must use an appropriate accessible region.
- Colour must not be the only status indicator.

### NFR-5: Security

- Markdown raw HTML must be disabled.
- Specification content must never execute.
- No runtime external network calls.
- No secrets.
- No absolute path leakage.

### NFR-6: Maintainability

- Strict TypeScript.
- Clear module boundaries.
- Unit tests for parsing and validation.
- Minimal UI coupling to the front matter schema.
- No manual duplicate graph data.

## 6. Entity model

The schema supports these initial entity types:

- `actor`
- `component`
- `artifact`
- `decision`
- `external-system`
- `workflow-step`

Initial planes:

- `request`
- `control`
- `execution`
- `knowledge`
- `assurance`
- `external`

Initial statuses:

- `idea`
- `specified`
- `ready`
- `building`
- `implemented`
- `validated`
- `production-ready`
- `blocked`

Initial scopes:

- `mvp`
- `next`
- `future`

Initial risk levels:

- `low`
- `medium`
- `high`
- `critical`

Initial actor types:

- `human`
- `agent`
- `deterministic-system`
- `external`

## 7. Initial entities

The first push must include specifications for:

1. User Request
2. Intake Service
3. Task Contract
4. Risk Classifier
5. Orchestrator
6. Execution Store
7. Policy Engine
8. Agent Runtime
9. Tool Gateway
10. Sandbox
11. Review Service
12. Pull Request
13. Audit Store

## 8. Acceptance commands

The completed implementation must provide and pass:

```bash
npm run generate
npm run lint
npm run typecheck
npm test
npm run build
npm run check
```

`npm run check` must run all required non-development checks.
