import type { AzureStageScope } from './cloudScope';
import type { GeneratedEntity } from '../types/specification';

function markdownList(items: string[], emptyText: string): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : `- ${emptyText}`;
}

function acceptanceCriteria(entity: GeneratedEntity): string[] {
  const criteria = [
    `- [ ] The implementation remains within the declared scope: **${entity.scope}**.`,
    `- [ ] **${entity.owner}** remains the single accountable owner for this boundary.`,
    `- [ ] The component does not perform any action listed under "Does not own".`,
  ];

  if (entity.inputs.length > 0) {
    criteria.push(`- [ ] The component accepts only the declared inputs: ${entity.inputs.join('; ')}.`);
  } else {
    criteria.push('- [ ] A concrete input contract is documented before implementation starts.');
  }
  if (entity.outputs.length > 0) {
    criteria.push(`- [ ] The component emits the declared outputs: ${entity.outputs.join('; ')}.`);
  } else {
    criteria.push('- [ ] The output contract is documented before implementation starts.');
  }
  entity.restrictions.forEach((restriction) => {
    criteria.push(`- [ ] The restriction is enforced and covered by a test: ${restriction}.`);
  });
  entity.failure_behaviour.forEach((failure) => {
    criteria.push(`- [ ] The failure behaviour is observable and testable: ${failure}.`);
  });
  return criteria;
}

export function buildEngineeringMarkdown(
  entity: GeneratedEntity,
  cloudScope?: AzureStageScope,
): string {
  const cloudSection = cloudScope
    ? `
## Azure placement (Cloud-scope MVP)

### Cloud boundary

${cloudScope.boundary}

### Proposed Azure components

${cloudScope.components
  .map(
    (component) =>
      `#### ${component.name} (${component.category})\n\n- Role: ${component.role}\n- Boundary: ${component.boundary}`,
  )
  .join('\n\n')}

This section is a proposed architecture label for the local presentation prototype. It does not provision or call Azure services.
`
    : '';

  return `${entity.rawMarkdown.trim()}

---

## Engineering handoff

This appendix is generated from the specification metadata to make the component ready for an engineering refinement ticket. The front matter and body above remain the source of truth.

### Scope

- Entity: ${entity.name} (${entity.entity_type})
- Plane: ${entity.plane}
- Scope: ${entity.scope}
- Status: ${entity.status}
- Risk: ${entity.risk}
- Actor type: ${entity.actor_type}

### Boundary

#### Owner

${entity.owner}

#### Owns

${markdownList(entity.owns, 'No ownership is explicitly declared.')}

#### Does not own

${markdownList(entity.does_not_own, 'No exclusions are explicitly declared; clarify before implementation.')}

#### Dependencies

${markdownList(entity.depends_on, 'No dependencies are declared.')}

#### Connections

${markdownList(entity.connects_to, 'No connections are declared.')}

### Contract

#### Inputs

${markdownList(entity.inputs, 'No inputs are declared; define the contract before implementation.')}

#### Outputs

${markdownList(entity.outputs, 'No outputs are declared; define the contract before implementation.')}

### Acceptance criteria

${acceptanceCriteria(entity).join('\n')}
${cloudSection}`;
}
