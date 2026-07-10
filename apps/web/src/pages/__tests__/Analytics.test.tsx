import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Analytics } from '../Analytics';

global.fetch = vi.fn();

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

function jsonResponse(body: unknown) {
  return Promise.resolve({
    ok: true,
    json: async () => body,
  } as Response);
}

describe('Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, 'ResizeObserver', {
      writable: true,
      value: ResizeObserverMock,
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/homes')) {
        return jsonResponse({
          homes: [
            {
              id: 'home-1',
              ownerId: 'user-1',
              name: 'Test Loft',
              location: { city: 'Portland', region: 'OR', lat: 45.5, lon: -122.6 },
              timezone: 'America/Los_Angeles',
              configProfileId: 'default',
              roomIds: [],
            },
          ],
        });
      }

      if (url.includes('/analytics/trends')) {
        return jsonResponse({
          homeId: 'home-1',
          range: 'week',
          metric: 'score',
          points: [{ ts: '2026-07-10T08:00:00.000Z', value: 91 }],
          summary: { avg: 91, min: 88, max: 94, delta: 3 },
        });
      }

      if (url.includes('/analytics/calendar')) {
        return jsonResponse({
          days: [
            { date: '2026-07-10', score: 91, band: 'excellent', worstMetric: 'pm25' },
          ],
          bestDay: { date: '2026-07-10', score: 91, band: 'excellent', worstMetric: 'pm25' },
          worstDay: { date: '2026-07-10', score: 91, band: 'excellent', worstMetric: 'pm25' },
        });
      }

      if (url.includes('/analytics/patterns')) {
        return jsonResponse({
          hourly: [{ hour: 8, avgPm25: 4.2, avgScore: 92 }],
          bestHour: 8,
          worstHour: 18,
          weekday: { avgPm25: 5.1, avgScore: 90 },
          weekend: { avgPm25: 4.6, avgScore: 92 },
        });
      }

      if (url.includes('/analytics/factors')) {
        return jsonResponse({
          factors: [
            {
              tag: 'cooking',
              events: 3,
              avgPm25During: 12.4,
              baselinePm25: 8.2,
              deltaPct: 51,
            },
          ],
        });
      }

      return jsonResponse({});
    });
  });

  it('renders analytics controls and loaded sections', async () => {
    render(
      <BrowserRouter>
        <Analytics />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'week' })).toBeInTheDocument();
    expect(screen.getByLabelText(/metric/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Test Loft · Portland, OR')).toBeInTheDocument();
    });

    expect(screen.getByText('What affects your air')).toBeInTheDocument();
    expect(screen.getByText('Cooking')).toBeInTheDocument();
  });
});
