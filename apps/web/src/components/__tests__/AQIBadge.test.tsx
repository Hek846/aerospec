import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AQIBadge } from '../AQIBadge';

describe('AQIBadge', () => {
  it('renders the AQI value', () => {
    render(<AQIBadge aqi={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('hides the band label by default', () => {
    render(<AQIBadge aqi={42} />);
    expect(screen.queryByText('Good')).not.toBeInTheDocument();
  });

  it('shows the band label when showBand is set', () => {
    render(<AQIBadge aqi={42} showBand />);
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('maps AQI values to the correct band', () => {
    const { rerender } = render(<AQIBadge aqi={75} showBand />);
    expect(screen.getByText('Moderate')).toBeInTheDocument();

    rerender(<AQIBadge aqi={125} showBand />);
    expect(screen.getByText('Unhealthy for Sensitive Groups')).toBeInTheDocument();

    rerender(<AQIBadge aqi={175} showBand />);
    expect(screen.getByText('Unhealthy')).toBeInTheDocument();

    rerender(<AQIBadge aqi={350} showBand />);
    expect(screen.getByText('Hazardous')).toBeInTheDocument();
  });

  it('applies the size modifier class', () => {
    const { container, rerender } = render(<AQIBadge aqi={50} size="small" />);
    expect(container.querySelector('.aqi-badge')).toHaveClass('aqi-badge--small');

    rerender(<AQIBadge aqi={50} size="large" />);
    expect(container.querySelector('.aqi-badge')).toHaveClass('aqi-badge--large');
  });

  it('handles edge values correctly', () => {
    const { rerender } = render(<AQIBadge aqi={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();

    rerender(<AQIBadge aqi={500} />);
    expect(screen.getByText('500')).toBeInTheDocument();
  });
});
