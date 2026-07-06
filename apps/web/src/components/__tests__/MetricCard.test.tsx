import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard } from '../MetricCard';

describe('MetricCard', () => {
  it('renders label, value and unit', () => {
    render(<MetricCard label="PM2.5" value="12.5" unit="µg/m³" />);
    expect(screen.getByText('PM2.5')).toBeInTheDocument();
    expect(screen.getByText('12.5')).toBeInTheDocument();
    expect(screen.getByText('µg/m³')).toBeInTheDocument();
  });

  it('renders placeholder value for missing data', () => {
    render(<MetricCard label="CO₂" value="—" unit="ppm" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders optional icon', () => {
    render(<MetricCard label="Temp" value="22.1" unit="°C" icon="🌡️" />);
    expect(screen.getByText('🌡️')).toBeInTheDocument();
  });

  it('applies the status modifier class', () => {
    const { container } = render(
      <MetricCard label="PM2.5" value="80.0" unit="µg/m³" status="alert" />
    );
    expect(container.querySelector('.metric-card')).toHaveClass('metric-card--alert');
  });

  it('defaults to good status', () => {
    const { container } = render(<MetricCard label="RH" value="45" unit="%" />);
    expect(container.querySelector('.metric-card')).toHaveClass('metric-card--good');
  });
});
