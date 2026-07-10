import { useMemo } from 'react';
import './ScoreRing.css';

interface ScoreRingProps {
  score: number | null;
  size?: number;
  label?: string;
}

export function ScoreRing({ score, size = 120, label }: ScoreRingProps) {
  const strokeWidth = useMemo(() => size * 0.12, [size]);
  const radius = useMemo(() => (size - strokeWidth) / 2, [size, strokeWidth]);
  const center = size / 2;
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);

  const validScore = score === null ? 0 : Math.max(0, Math.min(100, score));
  const offset = circumference - (validScore / 100) * circumference;
  const displayScore = score === null ? null : validScore;

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg
        className="score-ring__svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={displayScore === null ? 'Score unavailable' : `Air quality score ${displayScore}`}
      >
        <g transform={`rotate(-90 ${center} ${center})`}>
          <circle
            className="score-ring__track"
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
          />
          <circle
            className="score-ring__value"
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </g>
      </svg>
      <div className="score-ring__content">
        <span className="score-ring__score">{displayScore === null ? '—' : displayScore}</span>
        {label && <span className="score-ring__label">{label}</span>}
      </div>
    </div>
  );
}
