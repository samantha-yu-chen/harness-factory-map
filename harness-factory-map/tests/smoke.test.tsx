import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { STATIONS } from '../src/app/stations';
import { MarkdownBody } from '../src/components/MarkdownBody';
import { SpecDrawer } from '../src/components/SpecDrawer';
import mapJson from '../src/generated/map.json';
import type { GeneratedMap } from '../src/types/specification';

describe('presentation prototype smoke checks', () => {
  it('keeps every visible station linked to a Markdown entity', () => {
    const map = mapJson as GeneratedMap;
    expect(STATIONS).toHaveLength(10);
    expect(STATIONS.every((station) => map.entities.some((entity) => entity.id === station.specId))).toBe(true);
  });

  it('renders Markdown without turning raw HTML into DOM nodes', () => {
    render(<MarkdownBody body={'# Station\n\n<script>window.alert(1)</script>'} />);
    expect(screen.getByRole('heading', { name: 'Station' })).toBeInTheDocument();
    expect(document.querySelector('script')).not.toBeInTheDocument();
  });

  it('switches between technical spec, boundary, and scope design views', async () => {
    const map = mapJson as GeneratedMap;
    const user = userEvent.setup();
    render(
      <SpecDrawer
        station={STATIONS[0]}
        entity={map.entities.find((entity) => entity.id === STATIONS[0].specId)}
        entities={map.entities}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Technical Spec' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'Boundary' }));
    expect(screen.getByText('Owns')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Scope & Design' }));
    expect(screen.getByText('Design checklist')).toBeInTheDocument();
    expect(screen.getByText(/Keep implementation within the mvp scope/)).toBeInTheDocument();
  });
});
