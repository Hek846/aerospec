import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AQIBadge } from '../AQIBadge';

describe('AQIBadge', () => {
  it('renders with good AQI value', () => {
    render(<AQIBadge aqi={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('renders with moderate AQI value', () => {
    render(<AQIBadge aqi={75} />);
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('Moderate')).toBeInTheDocument();
  });

  it('renders with unhealthy AQI value', () => {
    render(<AQIBadge aqi={175} />);
    expect(screen.getByText('175')).toBeInTheDocument();
    expect(screen.getByText('Unhealthy')).toBeInTheDocument();
  });

  it('renders with hazardous AQI value', () => {
    render(<AQIBadge aqi={350} />);
    expect(screen.getByText('350')).toBeInTheDocument();
    expect(screen.getByText('Hazardous')).toBeInTheDocument();
  });

  it('applies correct CSS class for different sizes', () => {
    const { container, rerender } = render(<AQIBadge aqi={50} size="small" />);
    expect(container.querySelector('.aqi-badge')).toHaveClass('small');

    rerender(<AQIBadge aqi={50} size="medium" />);
    expect(container.querySelector('.aqi-badge')).toHaveClass('medium');

    rerender(<AQIBadge aqi={50} size="large" />);
    expect(container.querySelector('.aqi-badge')).toHaveClass('large');
  });

  it('applies correct CSS class for AQI bands', () => {
    const { container, rerender } = render(<AQIBadge aqi={25} />);
    expect(container.querySelector('.aqi-badge')).toHaveClass('good');

    rerender(<AQIBadge aqi={75} />);
    expect(container.querySelector('.aqi-badge')).toHaveClass('moderate');

    rerender(<AQIBadge aqi={125} />);
    expect(container.querySelector('.aqi-badge')).toHaveClass('unhealthy-sensitive');
  });

  it('handles edge values correctly', () => {
    const { rerender } = render(<AQIBadge aqi={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();

    rerender(<AQIBadge aqi={500} />);
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('includes aria-label for accessibility', () => {
    render(<AQIBadge aqi={42} />);
    const badge = screen.getByLabelText(/Air Quality Index/i);
    expect(badge).toBeInTheDocument();
  });
});
