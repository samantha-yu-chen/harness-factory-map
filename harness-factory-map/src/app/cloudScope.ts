export type AzureComponentCategory =
  | 'Edge'
  | 'Compute'
  | 'Knowledge'
  | 'Data'
  | 'Messaging'
  | 'Identity'
  | 'Security'
  | 'Artifact'
  | 'Storage'
  | 'Observability';

export interface AzureComponent {
  name: string;
  category: AzureComponentCategory;
  role: string;
  boundary: string;
}

export interface AzureStageScope {
  boundary: string;
  components: AzureComponent[];
}

export interface EnterpriseMemoryLayer {
  id: string;
  label: string;
  component: string;
  role: string;
  boundary: string;
  acceptance: string;
}

export const ENTERPRISE_MEMORY_LAYERS: EnterpriseMemoryLayer[] = [
  {
    id: 'source-of-truth',
    label: '1 · Enterprise data memory',
    component: 'Azure Data Lake Storage Gen2',
    role: 'Raw and curated policies, procedures, legal documents, finance rules, product knowledge, templates, and decision history.',
    boundary: 'Data owners publish versioned content. Agents and retrieval services cannot rewrite the source documents.',
    acceptance: 'Every document has an owner, version, effective date, classification, and retention rule.',
  },
  {
    id: 'rag-retrieval',
    label: '2 · RAG retrieval boundary',
    component: 'Azure AI Search',
    role: 'Derived hybrid/vector search index with metadata filters, source links, and citation-ready passages.',
    boundary: 'Read-only retrieval. The index is derived from approved source data and has no policy or execution authority.',
    acceptance: 'Each retrieved passage returns source identity, version, access filter result, and citation metadata.',
  },
  {
    id: 'operational-memory',
    label: '3 · Operational memory database',
    component: 'Azure Cosmos DB for NoSQL',
    role: 'Versioned task contracts, workflow context, memory pointers, approval records, and execution checkpoints.',
    boundary: 'Operational system of record only. It is not the enterprise knowledge source and cannot silently change policy.',
    acceptance: 'Writes are schema-versioned, attributable to an owner, and reject stale or unauthorized updates.',
  },
];

export const AZURE_SCOPE_BY_STAGE: Record<string, AzureStageScope> = {
  request: {
    boundary: 'Public entry is limited to request submission. It does not execute agents or own workflow decisions.',
    components: [
      {
        name: 'Azure Front Door Standard/Premium',
        category: 'Edge',
        role: 'Global HTTPS entry, WAF, and route protection.',
        boundary: 'Edge delivery only; no request or policy state.',
      },
      {
        name: 'Azure Container Apps',
        category: 'Compute',
        role: 'Request intake API and schema normalization.',
        boundary: 'Accepts a bounded request; does not execute agent work.',
      },
    ],
  },
  'system-check': {
    boundary: 'Existing-solution discovery is read-only. A search result is evidence, not an approval or execution command.',
    components: [
      {
        name: 'Azure AI Search',
        category: 'Knowledge',
        role: 'Retrieve approved solutions, policies, and indexed specifications.',
        boundary: 'Retrieval only; it does not become the source of policy authority.',
      },
      {
        name: 'Azure Data Lake Storage Gen2',
        category: 'Storage',
        role: 'Hold approved, versioned enterprise documents used to build retrieval indexes.',
        boundary: 'Enterprise source data only; no workflow decision ownership.',
      },
    ],
  },
  'problem-intake': {
    boundary: 'The intake boundary owns clarification and the task contract. Approval and execution remain downstream.',
    components: [
      {
        name: 'Azure Container Apps',
        category: 'Compute',
        role: 'Problem intake and task-contract service.',
        boundary: 'Owns the normalized contract; does not approve or run it.',
      },
      {
        name: 'Azure Cosmos DB for NoSQL',
        category: 'Data',
        role: 'Store versioned task contracts and intake records.',
        boundary: 'Durable contract data only; no implicit policy decisions.',
      },
    ],
  },
  evaluate: {
    boundary: 'Evaluation produces a rationale and route recommendation. It cannot silently lower controls or self-approve.',
    components: [
      {
        name: 'Azure Functions',
        category: 'Compute',
        role: 'Run deterministic risk classification and routing rules.',
        boundary: 'Classification only; no execution authority.',
      },
      {
        name: 'Azure Service Bus',
        category: 'Messaging',
        role: 'Queue evaluation work and route the resulting decision event.',
        boundary: 'Message transport only; it does not own the decision.',
      },
    ],
  },
  governance: {
    boundary: 'Governance is the human-accountable control point. Cloud identity and secrets support the decision but do not replace it.',
    components: [
      {
        name: 'Microsoft Entra ID',
        category: 'Identity',
        role: 'Provide identity, group membership, and approval context.',
        boundary: 'Identity context only; approval state stays in the workflow contract.',
      },
      {
        name: 'Azure Key Vault',
        category: 'Security',
        role: 'Protect application secrets, keys, and certificates.',
        boundary: 'Secret custody only; it does not decide policy.',
      },
      {
        name: 'Azure Container Apps',
        category: 'Compute',
        role: 'Expose a deny-by-default policy decision boundary.',
        boundary: 'Evaluates declared policy; it does not run agent tasks.',
      },
    ],
  },
  execution: {
    boundary: 'Execution is bounded by the approved task contract. Workers are disposable and evidence is captured separately.',
    components: [
      {
        name: 'Azure Container Apps Jobs',
        category: 'Compute',
        role: 'Run finite, bounded worker or review jobs.',
        boundary: 'Ephemeral execution only; no authoritative policy state.',
      },
      {
        name: 'Azure Service Bus',
        category: 'Messaging',
        role: 'Dispatch task, progress, review, and result events.',
        boundary: 'Delivery transport only; not a system of record.',
      },
      {
        name: 'Azure Container Registry',
        category: 'Artifact',
        role: 'Store versioned worker images and release artifacts.',
        boundary: 'Artifact supply only; it does not execute or approve work.',
      },
      {
        name: 'Azure Blob Storage',
        category: 'Storage',
        role: 'Stage outputs, evidence, and review attachments.',
        boundary: 'Evidence storage only; policy and delivery remain explicit.',
      },
    ],
  },
  learning: {
    boundary: 'Learning is an evidence and improvement loop. Nothing updates policy or agents autonomously in this MVP.',
    components: [
      {
        name: 'Azure Data Lake Storage Gen2',
        category: 'Data',
        role: 'Retain structured learning evidence and decision history.',
        boundary: 'Append-oriented evidence store; not an autonomous policy writer.',
      },
      {
        name: 'Azure Monitor / Log Analytics',
        category: 'Observability',
        role: 'Collect operational logs, metrics, and workflow signals.',
        boundary: 'Observability only; it is not authoritative workflow state.',
      },
      {
        name: 'Azure Key Vault',
        category: 'Security',
        role: 'Protect retention, export, and integration credentials.',
        boundary: 'Secret custody only; no learning or policy authority.',
      },
    ],
  },
};
