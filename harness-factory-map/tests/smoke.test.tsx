import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ComponentDrawer } from '../src/components/ComponentDrawer';
import { MarkdownBody } from '../src/components/MarkdownBody';
import { FLOW_STAGES, PLATFORM_STAGE, entity, map } from '../src/app/factoryModel';

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

  it('orders the stages from the always-on platform band through the seven flow stages', () => {
    expect(PLATFORM_STAGE?.stageOrder).toBe(0);
    expect(FLOW_STAGES.map((stage) => stage.stageOrder)).toEqual([1, 2, 3, 4, 5, 6, 7]);
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
