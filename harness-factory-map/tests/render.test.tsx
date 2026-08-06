import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '../src/app/App';

describe('app renders both audiences', () => {
  afterEach(() => cleanup());
  it('renders executive then engineering without crashing', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('heading', { name: /One front door/ })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Engineering/ }));
    expect(screen.getByRole('heading', { name: /Build waves/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Azure services/ })).toBeInTheDocument();
  });
});
