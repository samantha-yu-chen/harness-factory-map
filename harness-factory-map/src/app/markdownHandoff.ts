import type { ApiOperation, GeneratedEntity } from '../types/specification';

function list(items: string[], empty: string): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : `- ${empty}`;
}

function operationBlock(operation: ApiOperation): string {
  const rows = [
    ['Kind', operation.kind],
    ['Caller', operation.caller],
    ['Worker', operation.worker],
    ['Request', operation.request],
    ['Response', operation.response],
    ['Idempotency', operation.idempotency ?? 'Not specified — define before implementation'],
    ['Timeout', operation.timeout ?? 'Not specified — define before implementation'],
    ['Auth', operation.auth ?? 'Not specified — define before implementation'],
    ['Failure', operation.failure],
  ];
  const body = rows.map(([label, value]) => `| ${label} | ${value} |`).join('\n');
  return `### \`${operation.operation}\`\n\n| | |\n| --- | --- |\n${body}`;
}

function contractSection(entity: GeneratedEntity): string {
  if (entity.api_contract.length === 0) {
    return '## API contract\n\nNo callable surface is declared. Define one before implementation starts.';
  }
  return `## API contract\n\n${entity.api_contract.map(operationBlock).join('\n\n')}`;
}

function costSection(entity: GeneratedEntity): string {
  const cost = entity.cost;
  if (!cost) return '## Cost\n\nNo cost envelope is declared. Add one before this component enters a delivery wave.';
  const lines = (cost.azure ?? [])
    .map((line) => `| ${line.service} | ${line.sku} | $${line.monthly_usd_low}–${line.monthly_usd_high} | ${line.note ?? ''} |`)
    .join('\n');
  const perTask = cost.model_usd_per_task_high
    ? `\n\nModel cost per task: $${cost.model_usd_per_task_low ?? 0}–${cost.model_usd_per_task_high}.`
    : '';
  return `## Cost\n\nMonthly range $${cost.monthly_usd_low}–${cost.monthly_usd_high}. Driver: ${cost.driver}.${perTask}\n\n${cost.note ?? ''}\n\n| Service | SKU | Monthly | Note |\n| --- | --- | --- | --- |\n${lines}`;
}

function sloSection(entity: GeneratedEntity): string {
  const slo = entity.slo;
  if (!slo) return '';
  const rows = Object.entries(slo).map(([key, value]) => `| ${key} | ${value} |`).join('\n');
  return `\n## Service levels\n\n| | |\n| --- | --- |\n${rows}\n`;
}

function acceptanceCriteria(entity: GeneratedEntity): string {
  const fromRestrictions = entity.restrictions.map((item) => `- [ ] Enforced and covered by a test: ${item}`);
  const fromFailure = entity.failure_behaviour.map((item) => `- [ ] Observable and testable: ${item}`);
  const fromContract = entity.api_contract.map(
    (operation) => `- [ ] \`${operation.operation}\` behaves as specified on failure: ${operation.failure}`,
  );
  return [
    `- [ ] ${entity.human_accountable} is named as accountable and ${entity.owner} owns delivery.`,
    `- [ ] The component performs nothing listed under "does not own".`,
    ...fromContract,
    ...fromRestrictions,
    ...fromFailure,
  ].join('\n');
}

function header(entity: GeneratedEntity): string {
  return [
    `# Implementation brief — ${entity.name}`,
    '',
    `> Generated from \`${entity.sourcePath}\`. The specification is the working material; this brief is the ticket-ready extract.`,
    '',
    `| | |`,
    `| --- | --- |`,
    `| Delivery owner | ${entity.owner} |`,
    `| Accountable human | ${entity.human_accountable} |`,
    `| Build wave | ${entity.build_wave ?? 'unassigned'} |`,
    `| Scope | ${entity.scope} |`,
    `| Risk | ${entity.risk} |`,
    `| Plane | ${entity.plane} |`,
    `| Automation level | ${entity.automation_level ?? 'unspecified'} |`,
    `| Data classification | ${entity.data_classification ?? 'unspecified'} |`,
  ].join('\n');
}

export function buildEngineeringMarkdown(entity: GeneratedEntity): string {
  return [
    header(entity),
    `\n## Purpose\n\n${entity.description}`,
    `\n## Boundary\n\n### Owns\n\n${list(entity.owns, 'Not specified')}\n\n### Does not own\n\n${list(entity.does_not_own, 'Not specified')}\n\n### Authoritative data\n\n${list(entity.data_owned, 'Owns no authoritative data')}`,
    `\n${contractSection(entity)}`,
    `\n## Events\n\n### Emitted\n\n${list(entity.events_emitted, 'None')}\n\n### Consumed\n\n${list(entity.events_consumed, 'None')}`,
    `\n## Restrictions\n\n${list(entity.restrictions, 'None declared — clarify before implementation')}`,
    `\n## Failure behaviour\n\n${list(entity.failure_behaviour, 'None declared — define before implementation')}`,
    sloSection(entity),
    `\n${costSection(entity)}`,
    `\n## Open questions to resolve before build\n\n${list(entity.open_questions, 'None recorded')}`,
    `\n## Acceptance criteria\n\n${acceptanceCriteria(entity)}`,
    `\n---\n\n## Source specification\n\n${entity.body}`,
  ].join('\n');
}
