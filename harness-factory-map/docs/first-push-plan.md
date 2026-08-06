# First Push Implementation Plan

## Objective

Create the first buildable repository version of Harness Factory Map.

This push establishes:

- Project tooling.
- Source-of-truth schema.
- Initial Markdown specifications.
- Static graph generation.
- A usable interactive map.
- Validation and tests.
- Clear boundaries for later work.

## Deliverables

### D1. Project scaffold

Create a Vite React TypeScript project with:

- Strict TypeScript.
- ESLint.
- Prettier.
- Vitest.
- Tailwind CSS.
- React Flow.
- Markdown rendering.
- Front matter parsing.
- Ajv validation.

### D2. Scripts

Provide:

```json
{
  "dev": "vite",
  "generate": "tsx scripts/generate-map.ts",
  "build": "npm run generate && vite build",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "check": "npm run generate && npm run lint && npm run typecheck && npm test && npm run build"
}
```

Adjust exact commands where tool versions require it, while preserving their behaviour.

### D3. Schema and types

Implement the schema in `schemas/spec.schema.json` and matching TypeScript types.

Do not maintain independent, manually diverging enum lists where they can be generated or safely shared.

### D4. Generator

Implement `scripts/generate-map.ts`.

Responsibilities:

1. Discover specifications.
2. Parse front matter and Markdown body.
3. Validate each entity.
4. Reject duplicates.
5. validate references.
6. Build deterministic nodes, edges, and workflows.
7. Write `src/generated/map.json`.

The generator must produce actionable errors containing the relative source path.

### D5. Initial specifications

Add all entities listed in `docs/product-spec.md`.

Each specification must contain meaningful first-pass content for:

- Purpose.
- Responsibilities.
- Owns.
- Does not own.
- Inputs.
- Outputs.
- Permissions.
- Restrictions.
- Failure behaviour.
- Relationships.

### D6. Application layout

Implement:

- Header with product name and view selector.
- Search input.
- Filter controls.
- Main graph area.
- Accessible entity list.
- Detail drawer or side panel.
- Workflow trace selector.
- Reset controls.

Avoid over-design. Optimise for clarity and inspection.

### D7. Graph behaviour

- Fit graph on initial load.
- Use a deterministic initial layout.
- Permit pan and zoom.
- Select nodes by click and accessible list.
- De-emphasise filtered or non-trace elements as specified.
- Show semantic labels, not colour alone.

### D8. Tests

Implement generator and UI tests required by `AGENTS.md`.

### D9. Documentation

Update README commands only when verified.

Do not add speculative production architecture beyond the supplied specifications.

## Out of scope

- Backend.
- User accounts.
- Saving edits in the UI.
- Visual Markdown authoring.
- Dragging nodes to persist layout.
- Cloud deployment.
- CI/CD.
- External service integration.
- Agent execution.
- Live implementation status discovery.

## Definition of done

- Fresh clone installation succeeds.
- `npm run check` passes.
- The application displays all initial entities.
- The bounded engineering workflow can be traced.
- Selecting any entity displays its specification.
- Invalid sample fixtures fail for the correct reason.
- No hard-coded canonical graph exists in application components.
- No remote runtime dependencies exist.
