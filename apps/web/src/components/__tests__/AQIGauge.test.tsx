import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AQIGauge } from '../AQIGauge';

describe('AQIGauge', () => {
  it('renders the AQI value', () => {
    render(<AQIGauge aqi={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders the band label', () => {
    render(<AQIGauge aqi={42} />);
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('has an accessible label', () => {
    render(<AQIGauge aqi={125} />);
    expect(screen.getByLabelText('AQI 125: Unhealthy for Sensitive Groups')).toBeInTheDocument();
  });

  it('renders a custom label', () => {
    render(<AQIGauge aqi={42} label="Outdoor" />);
    expect(screen.getByText('Outdoor')).toBeInTheDocument();
  });

  it('renders the trend percentage', () => {
    render(<AQIGauge aqi={42} trendPct={12.5} />);
    expect(screen.getByText('+12.5%')).toBeInTheDocument();
  });

  it('renders negative trend percentage', () => {
    render(<AQIGauge aqi={42} trendPct={-8} />);
    expect(screen.getByText('-8.0%')).toBeInTheDocument();
  });

  it('clamps values above 500', () => {
    render(<AQIGauge aqi={600} />);
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('Hazardous')).toBeInTheDocument();
  });

  it('clamps values below 0', () => {
    render(<AQIGauge aqi={-10} />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
  });
});
