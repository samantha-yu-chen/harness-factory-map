import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../src/app/App';
import { UNITS } from '../src/app/factoryModel';

describe('app renders both audiences', () => {
  afterEach(() => cleanup());
  it('renders executive then engineering without crashing', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('heading', { name: /One front door/ })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Engineering/ }));
    expect(screen.getByRole('heading', { name: /Build plan/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Contracts between repositories/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Azure services/ })).toBeInTheDocument();
  });

  it('says which repository and directory each wave of work lands in', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: /Engineering/ }));

    for (const unit of UNITS) {
      expect(screen.getAllByText(unit.repository).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText('egress/').length).toBeGreaterThan(0);
    expect(screen.getAllByText('intake/').length).toBeGreaterThan(0);
  });
});

describe('scale readiness tab', () => {
  afterEach(() => cleanup());

  it('keeps the specification map as the tab Engineering opens on', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: /Engineering/ }));
    expect(screen.getByRole('tab', { name: /Specification map/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('heading', { name: /Hot paths/ })).not.toBeInTheDocument();
  });

  it('shows the hot-path arithmetic and the retrofit split on the second tab', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('tab', { name: /Engineering/ }));
    await user.click(screen.getByRole('tab', { name: /Scale readiness/ }));

    expect(screen.getByRole('heading', { name: /Hot paths · 4/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Decide now/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Safe to defer/ })).toBeInTheDocument();
    expect(screen.getByText(/over by 200ms/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Build plan/ })).not.toBeInTheDocument();
  });
});
