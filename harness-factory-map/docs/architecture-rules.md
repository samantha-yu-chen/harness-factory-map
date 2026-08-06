# Architecture Rules

These rules govern both the visualisation application and the future system being specified.

## A. Visualisation repository rules

### A1. Markdown is authoritative

Graph nodes and edges must be derived from Markdown front matter. React code must not define a second canonical graph.

### A2. Generation is a build step

Specification parsing and validation occur before or during the build. The browser must not access the local filesystem.

### A3. Generated content is disposable

Generated files may be deleted and recreated from specifications.

### A4. No backend in the MVP

The first release must not require a server, database, authentication provider, or cloud resource.

### A5. Safe Markdown

Raw HTML and executable content are prohibited.

### A6. Stable identifiers

Entity IDs are immutable machine identifiers. Display names may change.

### A7. Explicit relationships

Do not infer authoritative dependencies from prose. Relationships must be declared in metadata.

### A8. Relative references only

Generated source references must be repository-relative paths.

## B. Future harness design rules

These are represented in the map and should guide all specifications.

### B1. The control plane owns execution state

Agents may report results and recommend transitions. They do not authoritatively mutate workflow state.

### B2. Agent output is untrusted

All agent output requires schema validation, policy checks, deterministic checks, or human review appropriate to its risk.

### B3. Permission is scoped and temporary

Execution capabilities must be bounded by task, resource, operation, and time.

### B4. Policy and knowledge are different

Mandatory policy must not be treated as ordinary retrieved context.

### B5. Every side effect is attributable

External writes must be traceable to the request, task contract, decision, permission grant, execution, and audit event.

### B6. Failure behaviour is part of the contract

Every component must specify timeout, retry, duplicate, cancellation, and unavailable-dependency behaviour where relevant.

### B7. Deterministic checks precede expensive reasoning

Schemas, permissions, tests, linting, and static checks should run before model-based review when possible.

### B8. Human approval is subject-specific

An approval must identify exactly what is approved: scope, plan, execution, artifact, release, or exception.

### B9. Learning is initially observational

The system may collect evidence and propose improvements. It must not autonomously change production policy, permissions, prompts, workflow, or model routing in the MVP.

### B10. One owner for authoritative state

Each authoritative data object must have one owning component.
