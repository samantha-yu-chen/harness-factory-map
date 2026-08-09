import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ComponentDrawer } from '../src/components/ComponentDrawer';
import { MarkdownBody } from '../src/components/MarkdownBody';
import {
  FACTORY_STAGES,
  PLATFORM_STAGE,
  RUNTIME_STAGES,
  entity,
  map,
} from '../src/app/factoryModel';

describe('generated map integrity', () => {
  it('keeps the reference workflow fully covered', () => {
    expect(map.coverage.gaps).toEqual([]);
    expect(map.coverage.coveredCount).toBe(map.coverage.elementCount);
  });

  it('gives every staged component a contract, an owner, and a cost', () => {
    const staged = map.entities.filter((item) => item.workflow_id !== undefined);
    expect(staged.length).toBeGreaterThan(20);
    for (const item of staged) {
      expect(item.api_contract.length, `${item.id} has no API contract`).toBeGreaterThan(0);
      expect(item.human_accountable, `${item.id} has no accountable human`).toBeTruthy();
      expect(item.cost, `${item.id} has no cost envelope`).toBeDefined();
      expect(item.build_wave, `${item.id} has no build wave`).toBeDefined();
    }
  });

  it('names one caller and one worker on every operation', () => {
    for (const item of map.entities) {
      for (const operation of item.api_contract) {
        expect(operation.caller, `${item.id} ${operation.operation}`).toBeTruthy();
        expect(operation.worker, `${item.id} ${operation.operation}`).toBeTruthy();
        expect(operation.failure, `${item.id} ${operation.operation}`).toBeTruthy();
      }
    }
  });

  it('orders the platform band, the factory loop, and the runtime loop', () => {
    expect(PLATFORM_STAGE?.stageOrder).toBe(0);
    expect(FACTORY_STAGES.map((stage) => stage.stageOrder)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(RUNTIME_STAGES.map((stage) => stage.stageOrder)).toEqual([8, 9, 10, 11, 12]);
  });

  it('keeps the runtime loop beyond the reference diagram', () => {
    for (const stage of RUNTIME_STAGES) {
      expect(stage.referenceElements, `${stage.id} claims reference elements`).toEqual([]);
    }
  });

  it('runs production on reused factory machinery rather than a second engine', () => {
    const execute = RUNTIME_STAGES.find((stage) => stage.stageOrder === 10);
    expect(execute?.componentIds).toEqual([]);
    expect(execute?.reusedComponentIds).toContain('team-orchestrator');
    expect(execute?.reusedComponentIds).toContain('agent-runtime');
    expect(execute?.reusedComponentIds).toContain('sandbox');
  });
});

describe('every buildable boundary has a home', () => {
  const buildable = map.entities.filter((item) => item.build_wave !== undefined);

  it('places each one in a repository and a module that repository declares', () => {
    expect(buildable.length).toBeGreaterThan(20);
    for (const item of buildable) {
      const unit = map.contracts.units.find((entry) => entry.id === item.deployable_unit);
      expect(unit, `${item.id} names no deployable unit`).toBeDefined();
      expect(
        unit?.modules.map((entry) => entry.module),
        `${item.id} sits in a module ${item.deployable_unit} does not declare`,
      ).toContain(item.module);
    }
  });

  it('accounts for every buildable boundary exactly once across the units', () => {
    const placed = map.contracts.units.flatMap((unit) => unit.componentIds);
    expect(new Set(placed).size).toBe(placed.length);
    expect(placed.sort()).toEqual(buildable.map((item) => item.id).sort());
  });

  it('names a forcing function for every unit, and only the host may decline one', () => {
    for (const unit of map.contracts.units) {
      expect(unit.repository, `${unit.id} has no repository`).toBeTruthy();
      expect(unit.forcingFunction, `${unit.id} has no forcing function`).toBeTruthy();
    }
    expect(map.contracts.units.filter((unit) => unit.forcingFunction === 'host')).toHaveLength(1);
  });
});

describe('contracts across repository boundaries', () => {
  it('backs every cross-repository call with a declared operation or a paired event', () => {
    expect(map.contracts.gaps).toEqual([]);
    expect(map.contracts.crossUnitCount).toBeGreaterThan(0);
    expect(map.contracts.backedCount).toBe(map.contracts.crossUnitCount);
  });

  it('resolves every consumed operation against what its provider publishes', () => {
    for (const item of map.entities) {
      for (const { from, operation } of item.consumes) {
        const provider = entity(from);
        expect(provider, `${item.id} consumes from unknown ${from}`).toBeDefined();
        expect(
          provider?.api_contract.map((entry) => entry.operation),
          `${from} does not publish ${operation}`,
        ).toContain(operation);
      }
    }
  });

  it('gives every consumed event an emitter, or declares it as coming from outside', () => {
    const emitted = new Set(map.entities.flatMap((item) => item.events_emitted));
    for (const item of map.entities) {
      for (const event of item.events_consumed) {
        expect(emitted.has(event), `${item.id} consumes unemitted ${event}`).toBe(true);
      }
    }
  });

  it('keeps most relationships inside a repository, where they are free to change', () => {
    expect(map.contracts.inUnitCount).toBeGreaterThan(map.contracts.crossUnitCount);
  });
});

describe('component drawer', () => {
  afterEach(() => cleanup());

  it('renders Markdown without turning raw HTML into DOM nodes', () => {
    render(<MarkdownBody body={'# Stage\n\n<script>window.alert(1)</script>'} />);
    expect(screen.getByRole('heading', { name: 'Stage' })).toBeInTheDocument();
    expect(document.querySelector('script')).not.toBeInTheDocument();
  });

  it('opens on the API contract and exposes caller, worker, boundary, and cost', async () => {
    const user = userEvent.setup();
    render(<ComponentDrawer item={entity('policy-engine')} onClose={() => undefined} />);

    expect(screen.getByRole('tab', { name: 'API contract' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByText('Caller').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Worker').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('tab', { name: 'Boundary' }));
    expect(screen.getByText('Authoritative data it owns')).toBeInTheDocument();
    expect(screen.getByText('Accountable human')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Cost' }));
    expect(screen.getByText('Monthly infrastructure')).toBeInTheDocument();
  });

  it('offers the source specification and a downloadable implementation brief', async () => {
    const user = userEvent.setup();
    render(<ComponentDrawer item={entity('request-intake')} onClose={() => undefined} />);

    await user.click(screen.getByRole('tab', { name: 'Source' }));
    const views = within(screen.getByRole('tablist', { name: 'Source views' }));
    await user.click(views.getByRole('tab', { name: 'Source .md' }));
    expect(screen.getByText(/id: request-intake/)).toBeInTheDocument();

    await user.click(views.getByRole('tab', { name: 'Implementation brief' }));
    expect(screen.getByText(/## API contract/)).toBeInTheDocument();
    expect(screen.getByText(/\| Caller \|/)).toBeInTheDocument();
  });
});

describe('scale readiness report', () => {
  it('prices every hot path against budgets its providers actually publish', () => {
    expect(map.scale.hotPaths.length).toBeGreaterThan(0);
    for (const path of map.scale.hotPaths) {
      expect(path.unpricedOperations, `${path.componentId} cannot price a call it makes`).toEqual([]);
      expect(path.budgetP95Ms, `${path.componentId} has no budget`).toBeGreaterThan(0);
    }
  });

  it('classifies every published operation by what changing it later costs', () => {
    expect(map.scale.classifiedCount).toBe(map.scale.operationCount);
    for (const entry of map.scale.decideNow) {
      expect(entry.retrofit, `${entry.componentId} ${entry.operation}`).not.toBe('refactor');
    }
  });

  it('holds the tool gateway overrun the map found rather than quietly widening the budget', () => {
    const gateway = map.scale.budgetFindings.find((path) => path.componentId === 'tool-gateway');
    expect(gateway).toBeDefined();
    expect(gateway?.committedMs).toBeGreaterThan(gateway?.budgetP95Ms ?? 0);
    expect(gateway?.crossUnitRoundTrips).toBe(4);
  });
});

describe('what the build brief promises', () => {
  it('pins the four operations the brief says cannot be recovered by a migration', () => {
    const rewrites = map.scale.decideNow
      .filter((entry) => entry.retrofit === 'rewrite')
      .map((entry) => `${entry.componentId} · ${entry.operation}`);
    expect(rewrites).toEqual([
      'audit-log · POST /v1/audit/records',
      'identity-access · POST /v1/identity/task-token',
      'outcome-ledger · POST /v1/outcomes',
      'outcome-ledger · POST /v1/runs',
    ]);
  });
});
