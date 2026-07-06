import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard } from '../MetricCard';

describe('MetricCard', () => {
  it('renders metric label and value', () => {
    render(<MetricCard label="Temperature" value={22.5} unit="°C" />);
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText(/22\.5/)).toBeInTheDocument();
    expect(screen.getByText(/°C/)).toBeInTheDocument();
  });

  it('renders without unit when not provided', () => {
    render(<MetricCard label="AQI" value={42} />);
    expect(screen.getByText('AQI')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('formats decimal values correctly', () => {
    render(<MetricCard label="PM2.5" value={12.345} unit="µg/m³" />);
    expect(screen.getByText(/12\.3/)).toBeInTheDocument(); // Should round or truncate
  });

  it('handles zero values', () => {
    render(<MetricCard label="CO₂" value={0} unit="ppm" />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('displays trend indicator when provided', () => {
    const { rerender } = render(<MetricCard label="Temp" value={22} unit="°C" trend="up" />);
    expect(screen.getByText(/↑|up|increasing/i)).toBeInTheDocument();

    rerender(<MetricCard label="Temp" value={22} unit="°C" trend="down" />);
    expect(screen.getByText(/↓|down|decreasing/i)).toBeInTheDocument();

    rerender(<MetricCard label="Temp" value={22} unit="°C" trend="stable" />);
    expect(screen.getByText(/→|stable|steady/i)).toBeInTheDocument();
  });

  it('applies status color classes', () => {
    const { container, rerender } = render(
      <MetricCard label="AQI" value={42} status="good" />
    );
    expect(container.querySelector('.metric-card')).toHaveClass('good');

    rerender(<MetricCard label="AQI" value={150} status="unhealthy" />);
    expect(container.querySelector('.metric-card')).toHaveClass('unhealthy');
  });

  it('renders large format when size is specified', () => {
    const { container } = render(
      <MetricCard label="AQI" value={42} size="large" />
    );
    expect(container.querySelector('.metric-card')).toHaveClass('large');
  });
});
