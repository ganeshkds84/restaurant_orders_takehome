import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../src/App';

vi.stubGlobal(
  'fetch',
  vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          status: 'healthy',
          timestamp: '2026-08-29T22:45:00.000Z',
          uptimeSeconds: 42,
          environment: 'test',
          version: '1.0.0',
          database: { connected: true, latencyMs: 5 },
        }),
    })
  )
);

describe('Client Foundation Shell & App', () => {
  it('renders application header and title', async () => {
    render(<App />);
    expect(screen.getByText('Restaurant Orders')).toBeInTheDocument();
    expect(screen.getByText('Restaurant Orders Core')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Backend Status: HEALTHY')).toBeInTheDocument();
    });
  });

  it('renders health check container and data', async () => {
    render(<App />);
    expect(screen.getByText('System Foundation Status')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });
});
