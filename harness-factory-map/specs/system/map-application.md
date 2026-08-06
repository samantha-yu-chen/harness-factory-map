---
id: map-application
name: Factory Map Application
entity_type: component
plane: knowledge
scope: mvp
status: implemented
risk: low
actor_type: deterministic-system
automation_level: deterministic
data_classification: internal
description: The local application that validates these specifications and renders them as an inspectable map for technical and non-technical readers.
exec_summary: The tool you are looking at — it turns the written specifications into a map two different audiences can read.
business_value: A specification nobody reads is not a specification. This makes the architecture arguable by the people who have to fund and build it.
owner: system-owner
human_accountable: Head of Platform Engineering
tags:
  - visualisation
  - tooling
  - local-first
depends_on: []
connects_to:
  - agent-factory-system
reference_map: []
responsibilities:
  - Validate every specification against the schema at build time
  - Detect coverage gaps against the reference diagram
  - Enforce one owner per authoritative data object
  - Render the map for an executive and an engineering audience
owns:
  - The generated map and its validation results
does_not_own:
  - The platform being specified
  - Any running agent, credential, or cloud resource
inputs:
  - Markdown specifications under specs/
outputs:
  - A validated generated map
  - Coverage and cost rollups
permissions:
  - Read repository specifications at build time
restrictions:
  - No backend, no database, no authentication, no cloud resource
  - No external network calls at runtime
  - Raw HTML in specifications is never rendered
failure_behaviour:
  - Generation fails loudly on an invalid specification, an unresolved reference, a duplicate data owner, or an unknown reference-diagram claim
  - A coverage gap is reported in the map rather than failing the build — gaps are information, not errors
open_questions: []
---

# Factory Map Application

## What it does

It reads the Markdown under `specs/`, validates it, and renders it two ways: an executive view for people deciding whether to fund the platform, and an engineering view for people who have to build it. Both read from the same generated map, so they cannot drift apart.

## What the generator refuses to build

Generation fails on:

- a specification that does not match the schema
- a relationship pointing at an entity that does not exist
- two components claiming the same authoritative data object
- a `reference_map` entry naming a diagram element no stage declares

The third is worth noting. It is a structural enforcement of "one owner per authoritative object" — the rule most likely to erode silently as a system grows, because each individual violation looks reasonable at the time.

## What it reports rather than refuses

A reference-diagram element that no component claims is a **coverage gap**. It is shown in the map, counted, and attributed to its stage — but it does not fail the build.

That distinction is deliberate. A typo is an error and should stop the build. A genuine gap between the reference diagram and the specified components is information the leadership team needs to see, and hiding it behind a build failure would be exactly the wrong incentive.

## Boundary

This application visualises and validates. It is not the platform it describes, holds no credentials, and calls nothing. Every Azure service named anywhere in these specifications is a proposed placement, not a provisioned resource.
