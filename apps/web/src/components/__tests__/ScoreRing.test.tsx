import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreRing } from '../ScoreRing';

describe('ScoreRing', () => {
  it('renders the score value', () => {
    render(<ScoreRing score={85} />);
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('has an accessible label', () => {
    render(<ScoreRing score={85} />);
    expect(screen.getByLabelText('Air quality score 85')).toBeInTheDocument();
  });

  it('renders an em-dash when score is null', () => {
    render(<ScoreRing score={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('reports unavailable score to assistive tech', () => {
    render(<ScoreRing score={null} />);
    expect(screen.getByLabelText('Score unavailable')).toBeInTheDocument();
  });

  it('renders a custom label', () => {
    render(<ScoreRing score={72} label="AQ Score" />);
    expect(screen.getByText('AQ Score')).toBeInTheDocument();
  });

  it('clamps scores above 100', () => {
    render(<ScoreRing score={150} />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});
