import { entityName, map } from '../app/factoryModel';
import type { HotPathCall, HotPathRollup, RetrofitEntry, RetrofitCost } from '../types/specification';

const { scale } = map;

const RETROFIT_COPY: Record<RetrofitCost, { label: string; blurb: string }> = {
  rewrite: {
    label: 'Rewrite',
    blurb: 'Not available later at any price worth paying — callers would have to be redesigned around a different model.',
  },
  migration: {
    label: 'Migration',
    blurb: 'Available later, but stored data has to be rewritten or backfilled first.',
  },
  refactor: {
    label: 'Refactor',
    blurb: 'Callers change and nothing stored moves. Designing for this now is the over-engineering to avoid.',
  },
};

function millis(value: number): string {
  return `${value}ms`;
}

function CallRow({ call }: { call: HotPathCall }) {
  const priced = call.p95Ms !== undefined;
  return (
    <li className={call.perAction === 0 ? 'call-row off-path' : 'call-row'}>
      <span className="call-name">
        {entityName(call.providerId)}
        <code>{call.operation}</code>
      </span>
      <span className="call-count">{call.perAction === 0 ? 'not on this path' : `×${call.perAction}`}</span>
      <span className="call-budget">{priced ? millis(call.p95Ms ?? 0) : 'no budget stated'}</span>
      <span className={call.crossesUnit ? 'call-where crosses' : 'call-where'}>
        {call.crossesUnit ? 'crosses a repository' : 'same repository'}
      </span>
      <strong className="call-subtotal">{call.perAction === 0 || !priced ? '—' : millis(call.subtotalMs ?? 0)}</strong>
    </li>
  );
}

function HotPathCard({ path }: { path: HotPathRollup }) {
  const over = path.overBudgetMs > 0;
  return (
    <article className={over ? 'hot-card over' : 'hot-card'}>
      <header>
        <div>
          <span className="kicker">Per {path.unitOfWork.toLowerCase()}</span>
          <h3>{entityName(path.componentId)}</h3>
        </div>
        <div className="hot-verdict">
          <strong>{millis(path.committedMs)}</strong>
          <span>committed of {millis(path.budgetP95Ms)}</span>
          {over && <em>over by {millis(path.overBudgetMs)}</em>}
        </div>
      </header>
      <p className="hot-trips">
        {path.roundTrips} round trip{path.roundTrips === 1 ? '' : 's'} per unit of work
        {path.crossUnitRoundTrips > 0 && `, ${path.crossUnitRoundTrips} of them leaving the repository`}.
      </p>
      <ul className="call-list">
        {path.calls.map((call) => <CallRow key={`${call.providerId}-${call.operation}`} call={call} />)}
      </ul>
      {path.unpricedOperations.length > 0 && (
        <p className="hot-unpriced">
          Cannot be priced: {path.unpricedOperations.join(', ')} — the provider states no p95 budget.
        </p>
      )}
    </article>
  );
}

function HotPathPanel() {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="kicker">Latency arithmetic · {scale.budgetFindings.length} over budget</span>
          <h2>Hot paths · {scale.hotPaths.length}</h2>
        </div>
        <p className="panel-aside">
          A component that declares a hot path gets the operations it already consumes priced against the
          budgets their providers publish. An overrun here is a specification fact, not a measurement — a
          boundary promising less overhead than the boundaries it names have promised it.
        </p>
      </div>
      <div className="hot-grid">
        {scale.hotPaths.map((path) => <HotPathCard key={path.componentId} path={path} />)}
      </div>
    </section>
  );
}

function RetrofitTable({ entries }: { entries: RetrofitEntry[] }) {
  return (
    <ul className="retrofit-list">
      {entries.map((entry) => (
        <li key={`${entry.componentId}-${entry.operation}`}>
          <span className={`retrofit-tag retrofit-${entry.retrofit}`}>{RETROFIT_COPY[entry.retrofit].label}</span>
          <span className="retrofit-owner">{entityName(entry.componentId)}</span>
          <code>{entry.operation}</code>
          <small>{entry.frequency ?? 'unclassified frequency'}</small>
        </li>
      ))}
    </ul>
  );
}

function DecideNowPanel() {
  const rewrites = scale.decideNow.filter((entry) => entry.retrofit === 'rewrite');
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="kicker">Expensive to change once traffic exists</span>
          <h2>Decide now · {scale.decideNow.length} of {scale.operationCount}</h2>
        </div>
        <p className="panel-aside">
          These are the shapes that stop being free to change the moment the first run lands. {rewrites.length} of
          them cannot be recovered by a migration at all, which makes them the shortlist for the design time
          this platform actually has.
        </p>
      </div>
      <div className="retrofit-legend">
        {(['rewrite', 'migration'] as const).map((cost) => (
          <div key={cost}>
            <span className={`retrofit-tag retrofit-${cost}`}>{RETROFIT_COPY[cost].label}</span>
            <p>{RETROFIT_COPY[cost].blurb}</p>
          </div>
        ))}
      </div>
      <RetrofitTable entries={scale.decideNow} />
    </section>
  );
}

function DeferPanel() {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="kicker">Cheap to change later, so do not design for it now</span>
          <h2>Safe to defer · {scale.deferrable.length}</h2>
        </div>
        <p className="panel-aside">
          {RETROFIT_COPY.refactor.blurb} This list is the permission to build a small version first. Every hour
          spent hardening one of these against a scale that does not exist yet is an hour the walking skeleton
          does not get.
        </p>
      </div>
      <RetrofitTable entries={scale.deferrable} />
    </section>
  );
}

function PremisePanel() {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <span className="kicker">What this view is for</span>
          <h2>Built at nought to one, shaped for one to a hundred</h2>
        </div>
        <p className="panel-aside">
          Nothing here has been built. Cost, volume, and capacity modelling belong to a later pass — this one
          answers only what would be expensive to change after the first pass ships.
        </p>
      </div>
      <p className="panel-copy">
        Two questions can be answered before a line of code exists, and both get harder every week after.
        What has a per-action path already committed to spending, and which of these {scale.operationCount} operations
        cost more than a refactor to change once real data is behind them. Everything else is deliberately
        left undecided.
      </p>
      <p className="panel-copy small">
        Transport is one of the deliberately undecided things. A module port is a typed function signature and
        the wire format behind it is an adapter detail, so the choice between an in-process call, REST, and gRPC
        stays a refactor for as long as the port holds. It is not on this list because it does not belong on it yet.
      </p>
    </section>
  );
}

export function ScaleReadinessView() {
  return (
    <>
      <PremisePanel />
      <HotPathPanel />
      <DecideNowPanel />
      <DeferPanel />
    </>
  );
}
