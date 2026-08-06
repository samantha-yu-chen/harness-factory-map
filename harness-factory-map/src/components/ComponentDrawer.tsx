import { useEffect, useState, type ReactNode } from 'react';
import { MarkdownBody } from './MarkdownBody';
import { buildEngineeringMarkdown } from '../app/markdownHandoff';
import { entity as lookup } from '../app/factoryModel';
import type { ApiOperation, GeneratedEntity } from '../types/specification';

type DrawerTab = 'contract' | 'boundary' | 'failure' | 'cost' | 'markdown';
type MarkdownView = 'preview' | 'source' | 'handoff';

const TABS: { id: DrawerTab; label: string }[] = [
  { id: 'contract', label: 'API contract' },
  { id: 'boundary', label: 'Boundary' },
  { id: 'failure', label: 'Failure & SLO' },
  { id: 'cost', label: 'Cost' },
  { id: 'markdown', label: 'Source' },
];

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="drawer-block">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Items({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="drawer-empty">{empty}</p>;
  return <ul className="drawer-list">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

function Refs({ ids, empty }: { ids: string[]; empty: string }) {
  return <Items items={ids.map((id) => lookup(id)?.name ?? id)} empty={empty} />;
}

function OperationRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="op-row">
      <span>{label}</span>
      <code>{value ?? 'not specified'}</code>
    </div>
  );
}

function OperationCard({ operation }: { operation: ApiOperation }) {
  return (
    <article className="op-card">
      <header>
        <span className={`op-kind kind-${operation.kind}`}>{operation.kind}</span>
        <code className="op-name">{operation.operation}</code>
      </header>
      <div className="op-parties">
        <div><span>Caller</span><strong>{operation.caller}</strong></div>
        <span className="op-arrow" aria-hidden="true">→</span>
        <div><span>Worker</span><strong>{operation.worker}</strong></div>
      </div>
      <OperationRow label="Request" value={operation.request} />
      <OperationRow label="Response" value={operation.response} />
      <OperationRow label="Idempotency" value={operation.idempotency} />
      <OperationRow label="Timeout" value={operation.timeout} />
      <OperationRow label="Auth" value={operation.auth} />
      <div className="op-row op-failure">
        <span>On failure</span>
        <code>{operation.failure}</code>
      </div>
    </article>
  );
}

function ContractPanel({ item }: { item: GeneratedEntity }) {
  if (item.api_contract.length === 0) {
    return <p className="drawer-empty">No callable surface declared. Define one before implementation starts.</p>;
  }
  return (
    <>
      <p className="drawer-note">Every operation names one caller and one worker. That pairing is the interface the harness team implements against.</p>
      {item.api_contract.map((operation) => <OperationCard key={operation.operation} operation={operation} />)}
      <div className="drawer-columns">
        <Block title="Events emitted"><Items items={item.events_emitted} empty="None" /></Block>
        <Block title="Events consumed"><Items items={item.events_consumed} empty="None" /></Block>
      </div>
    </>
  );
}

function BoundaryPanel({ item }: { item: GeneratedEntity }) {
  return (
    <>
      <div className="owner-callout">
        <div><span>Delivery owner</span><strong>{item.owner}</strong></div>
        <div><span>Accountable human</span><strong>{item.human_accountable}</strong></div>
      </div>
      <Block title="Authoritative data it owns">
        <Items items={item.data_owned} empty="Owns no authoritative data — it reads and recommends only." />
      </Block>
      <div className="drawer-columns">
        <Block title="Owns"><Items items={item.owns} empty="Not specified" /></Block>
        <Block title="Does not own"><Items items={item.does_not_own} empty="Not specified" /></Block>
      </div>
      <Block title="Responsibilities"><Items items={item.responsibilities} empty="Not specified" /></Block>
      <Block title="Restrictions"><Items items={item.restrictions} empty="None declared" /></Block>
      <div className="drawer-columns">
        <Block title="Depends on"><Refs ids={item.depends_on} empty="Nothing" /></Block>
        <Block title="Connects to"><Refs ids={item.connects_to} empty="Nothing" /></Block>
      </div>
    </>
  );
}

function FailurePanel({ item }: { item: GeneratedEntity }) {
  const slo = Object.entries(item.slo ?? {});
  return (
    <>
      <Block title="Failure behaviour"><Items items={item.failure_behaviour} empty="Not declared — define before implementation" /></Block>
      <Block title="Service levels">
        {slo.length === 0 ? <p className="drawer-empty">No SLO declared.</p> : (
          <div className="slo-grid">
            {slo.map(([key, value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}
          </div>
        )}
      </Block>
      <Block title="Open questions before build">
        <Items items={item.open_questions} empty="None recorded" />
      </Block>
    </>
  );
}

function CostPanel({ item }: { item: GeneratedEntity }) {
  const cost = item.cost;
  if (!cost) return <p className="drawer-empty">No cost envelope declared. Add one before this component enters a delivery wave.</p>;
  return (
    <>
      <div className="cost-headline">
        <div><span>Monthly infrastructure</span><strong>${cost.monthly_usd_low}–{cost.monthly_usd_high}</strong></div>
        {cost.model_usd_per_task_high !== undefined && (
          <div><span>Model per task</span><strong>${cost.model_usd_per_task_low ?? 0}–{cost.model_usd_per_task_high}</strong></div>
        )}
      </div>
      <p className="drawer-note"><b>Driver</b> {cost.driver}</p>
      {cost.note && <p className="cost-note">{cost.note}</p>}
      <table className="cost-table">
        <thead><tr><th>Service</th><th>SKU</th><th>Monthly</th></tr></thead>
        <tbody>
          {(cost.azure ?? []).map((line) => (
            <tr key={`${line.service}-${line.sku}`}>
              <td>{line.service}{line.shared && <em> shared</em>}</td>
              <td>{line.sku}{line.note && <small>{line.note}</small>}</td>
              <td className="num">${line.monthly_usd_low}–{line.monthly_usd_high}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function download(content: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

const MARKDOWN_VIEWS: [MarkdownView, string][] = [
  ['preview', 'Rendered'],
  ['source', 'Source .md'],
  ['handoff', 'Implementation brief'],
];

function MarkdownPanel({ item }: { item: GeneratedEntity }) {
  const [view, setView] = useState<MarkdownView>('preview');
  const handoff = buildEngineeringMarkdown(item);
  return (
    <>
      <div className="markdown-actions">
        <button type="button" onClick={() => download(item.rawMarkdown, `${item.id}.md`)}>Download source</button>
        <button type="button" onClick={() => download(handoff, `${item.id}-implementation-brief.md`)}>Download brief</button>
      </div>
      <div className="markdown-view-tabs" role="tablist" aria-label="Source views">
        {MARKDOWN_VIEWS.map(([id, label]) => (
          <button type="button" role="tab" key={id} aria-selected={view === id}
            className={view === id ? 'markdown-view-tab active' : 'markdown-view-tab'} onClick={() => setView(id)}>
            {label}
          </button>
        ))}
      </div>
      {view === 'preview' && <MarkdownBody body={item.body} />}
      {view === 'source' && <pre className="markdown-source">{item.rawMarkdown}</pre>}
      {view === 'handoff' && <pre className="markdown-source">{handoff}</pre>}
    </>
  );
}

const PANELS: Record<DrawerTab, (props: { item: GeneratedEntity }) => ReactNode> = {
  contract: ContractPanel,
  boundary: BoundaryPanel,
  failure: FailurePanel,
  cost: CostPanel,
  markdown: MarkdownPanel,
};

export function ComponentDrawer({ item, onClose }: { item?: GeneratedEntity; onClose: () => void }) {
  const [tab, setTab] = useState<DrawerTab>('contract');
  useEffect(() => setTab('contract'), [item?.id]);
  if (!item) return null;
  const Panel = PANELS[tab];

  return (
    <>
      <button type="button" className="drawer-backdrop" onClick={onClose} aria-label="Close component specification" />
      <aside className="component-drawer" aria-label={`${item.name} specification`}>
        <div className="drawer-header">
          <div>
            <span className="drawer-kicker">{item.plane} plane · wave {item.build_wave ?? '—'} · {item.scope}</span>
            <h2>{item.name}</h2>
            <p>{item.description}</p>
          </div>
          <button type="button" className="close-button" onClick={onClose} aria-label="Close component specification">×</button>
        </div>
        <div className="drawer-meta">
          <span className={`risk risk-${item.risk}`}>{item.risk} risk</span>
          <span>{item.actor_type}</span>
          <span>{item.automation_level ?? 'unspecified'}</span>
          <span>data: {item.data_classification ?? 'unspecified'}</span>
          <span>{item.status}</span>
        </div>
        <p className="drawer-source">{item.sourcePath}</p>
        <div className="drawer-tabs" role="tablist" aria-label="Component inspection views">
          {TABS.map((entry) => (
            <button type="button" role="tab" key={entry.id} aria-selected={tab === entry.id}
              className={tab === entry.id ? 'drawer-tab active' : 'drawer-tab'} onClick={() => setTab(entry.id)}>
              {entry.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="drawer-panel"><Panel item={item} /></div>
      </aside>
    </>
  );
}
