import { useEffect, useState, type ReactNode } from 'react';
import { MarkdownBody } from './MarkdownBody';
import { buildEngineeringMarkdown } from '../app/markdownHandoff';
import type { AzureStageScope } from '../app/cloudScope';
import type { StationDefinition } from '../app/stations';
import type { GeneratedEntity } from '../types/specification';

interface SpecDrawerProps {
  station: StationDefinition | undefined;
  entity: GeneratedEntity | undefined;
  entities: GeneratedEntity[];
  cloudScope?: AzureStageScope;
  onClose: () => void;
}

type DrawerTab = 'technical' | 'boundary' | 'implementation' | 'markdown';
type MarkdownView = 'preview' | 'source' | 'handoff';

const tabs: { id: DrawerTab; label: string }[] = [
  { id: 'technical', label: 'Technical Spec' },
  { id: 'boundary', label: 'Boundary' },
  { id: 'implementation', label: 'Scope & Design' },
  { id: 'markdown', label: 'Markdown' },
];

function ItemList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="drawer-empty">Not specified.</p>;
  return (
    <ul className="drawer-list">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="drawer-block">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function ReferenceList({ ids, entities }: { ids: string[]; entities: GeneratedEntity[] }) {
  return <ItemList items={ids.map((id) => entities.find((entity) => entity.id === id)?.name ?? id)} />;
}

function ScopeAndDesign({ entity }: { entity: GeneratedEntity }) {
  const checks = [
    ['Scope', `Keep implementation within the ${entity.scope} scope.`],
    ['Ownership', `Keep authoritative responsibility with ${entity.owner}.`],
    ['Contract', `Design around the declared ${entity.inputs.length} input(s) and ${entity.outputs.length} output(s).`],
    ['Controls', entity.restrictions.length > 0 ? 'Respect every restriction before adding capability.' : 'No restrictions are declared yet; clarify them before implementation.'],
    ['Failure', entity.failure_behaviour.length > 0 ? 'Implement the listed failure behaviour as part of the contract.' : 'Define failure behaviour before production implementation.'],
  ];
  return (
    <>
      <div className="design-callout">
        <span className="drawer-kicker">Implementation guardrail</span>
        <strong>Use this station as a bounded design contract.</strong>
        <p>These checks are derived from the Markdown metadata. They describe the intended boundary; they do not execute a runtime.</p>
      </div>
      <DetailBlock title="Design checklist">
        <ol className="design-checklist">
          {checks.map(([label, text]) => <li key={label}><strong>{label}</strong><span>{text}</span></li>)}
        </ol>
      </DetailBlock>
      <DetailBlock title="Declared responsibilities"><ItemList items={entity.responsibilities} /></DetailBlock>
      <DetailBlock title="Restrictions"><ItemList items={entity.restrictions} /></DetailBlock>
      <DetailBlock title="Failure behaviour"><ItemList items={entity.failure_behaviour} /></DetailBlock>
    </>
  );
}

function downloadMarkdown(content: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function SpecDrawer({ station, entity, entities, cloudScope, onClose }: SpecDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('technical');
  const [markdownView, setMarkdownView] = useState<MarkdownView>('preview');

  useEffect(() => {
    setActiveTab('technical');
    setMarkdownView('preview');
  }, [station?.id]);

  if (!station || !entity) return null;

  return (
    <>
      <button type="button" className="spec-drawer-backdrop" onClick={onClose} aria-label="Close station specification" />
      <aside className="spec-drawer" aria-label="Station specification">
      <div className="drawer-header">
        <div>
          <span className="drawer-kicker">Station specification</span>
          <h2>{station.label}</h2>
          <p>{entity.description}</p>
        </div>
        <button type="button" className="close-button" onClick={onClose} aria-label="Close station specification">×</button>
      </div>
      <div className="drawer-meta">
        <span>{entity.entity_type}</span>
        <span>{entity.plane}</span>
        <span>Scope: {entity.scope}</span>
        <span>Owner: {entity.owner}</span>
      </div>
      <p className="drawer-source">Source: {entity.sourcePath}</p>

      <div className="drawer-tabs" role="tablist" aria-label="Station inspection views">
        {tabs.map((tab) => (
          <button
            type="button"
            role="tab"
            key={tab.id}
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'drawer-tab active' : 'drawer-tab'}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'technical' && (
        <div role="tabpanel" className="drawer-panel">
          <DetailBlock title="Purpose"><p className="drawer-copy">{entity.description}</p></DetailBlock>
          <div className="drawer-facts">
            <div><span>Entity type</span><strong>{entity.entity_type}</strong></div>
            <div><span>Plane</span><strong>{entity.plane}</strong></div>
            <div><span>Status</span><strong>{entity.status}</strong></div>
            <div><span>Risk</span><strong>{entity.risk}</strong></div>
            <div><span>Actor type</span><strong>{entity.actor_type}</strong></div>
          </div>
          <DetailBlock title="Responsibilities"><ItemList items={entity.responsibilities} /></DetailBlock>
          <div className="drawer-columns">
            <DetailBlock title="Inputs"><ItemList items={entity.inputs} /></DetailBlock>
            <DetailBlock title="Outputs"><ItemList items={entity.outputs} /></DetailBlock>
          </div>
          <DetailBlock title="Permissions"><ItemList items={entity.permissions} /></DetailBlock>
          <DetailBlock title="Failure behaviour"><ItemList items={entity.failure_behaviour} /></DetailBlock>
        </div>
      )}

      {activeTab === 'boundary' && (
        <div role="tabpanel" className="drawer-panel">
          <div className="boundary-owner"><span>Single owner</span><strong>{entity.owner}</strong><small>Authoritative responsibility should remain clear.</small></div>
          <DetailBlock title="Owns"><ItemList items={entity.owns} /></DetailBlock>
          <DetailBlock title="Does not own"><ItemList items={entity.does_not_own} /></DetailBlock>
          <DetailBlock title="Depends on"><ReferenceList ids={entity.depends_on} entities={entities} /></DetailBlock>
          <DetailBlock title="Connects to"><ReferenceList ids={entity.connects_to} entities={entities} /></DetailBlock>
        </div>
      )}

      {activeTab === 'implementation' && <div role="tabpanel" className="drawer-panel"><ScopeAndDesign entity={entity} /></div>}

      {activeTab === 'markdown' && (
        <div role="tabpanel" className="drawer-panel">
          <div className="markdown-handoff-header">
            <div>
              <span className="drawer-kicker">Engineering source area</span>
              <p>Preview the safe rendering, inspect the exact source file, or download an implementation handoff.</p>
            </div>
            <div className="markdown-downloads">
              <button type="button" onClick={() => downloadMarkdown(entity.rawMarkdown, `${entity.id}.md`)}>Download source</button>
              <button type="button" onClick={() => downloadMarkdown(buildEngineeringMarkdown(entity, cloudScope), `${entity.id}-engineering-handoff.md`)}>Download handoff</button>
            </div>
          </div>
          <div className="markdown-view-tabs" role="tablist" aria-label="Markdown file views">
            {([
              ['preview', 'Rendered preview'],
              ['source', 'Source .md'],
              ['handoff', 'Engineering handoff'],
            ] as const).map(([id, label]) => (
              <button
                type="button"
                role="tab"
                aria-selected={markdownView === id}
                className={markdownView === id ? 'markdown-view-tab active' : 'markdown-view-tab'}
                key={id}
                onClick={() => setMarkdownView(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {markdownView === 'preview' && <MarkdownBody body={entity.body} />}
          {markdownView === 'source' && <pre className="markdown-source">{entity.rawMarkdown}</pre>}
          {markdownView === 'handoff' && <pre className="markdown-source">{buildEngineeringMarkdown(entity, cloudScope)}</pre>}
        </div>
      )}
      </aside>
    </>
  );
}
