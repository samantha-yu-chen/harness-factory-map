import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STATIONS } from '../src/app/stations';
import { MarkdownBody } from '../src/components/MarkdownBody';
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
});
