import { useMemo } from 'react';
import { getAQIBandInfo, getAQIBand } from '../utils/aqi';
import './AQIGauge.css';

interface AQIGaugeProps {
  aqi: number;
  label?: string;
  trendPct?: number;
  size?: number;
}

const MIN_AQI = 0;
const MAX_AQI = 500;
const START_ANGLE = 135;
const SWEEP = 270;

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export function AQIGauge({ aqi, label, trendPct, size = 240 }: AQIGaugeProps) {
  const clampedAqi = Math.max(MIN_AQI, Math.min(MAX_AQI, aqi));
  const { band } = getAQIBandInfo(clampedAqi);
  const bandSlug = getAQIBand(clampedAqi);

  const strokeWidth = useMemo(() => size * 0.12, [size]);
  const radius = useMemo(() => (size - strokeWidth) / 2, [size, strokeWidth]);
  const center = size / 2;

  const valueFraction = clampedAqi / MAX_AQI;
  const valueAngle = START_ANGLE + valueFraction * SWEEP;

  const trackPath = useMemo(
    () => describeArc(center, center, radius, START_ANGLE, START_ANGLE + SWEEP),
    [center, radius]
  );
  const valuePath = useMemo(
    () => describeArc(center, center, radius, START_ANGLE, valueAngle),
    [center, radius, valueAngle]
  );

  const needleTip = polarToCartesian(center, center, radius, valueAngle);

  const trendText =
    trendPct === undefined
      ? null
      : `${trendPct >= 0 ? '+' : ''}${trendPct.toFixed(1)}%`;

  return (
    <div
      className={`aqi-gauge aqi-gauge--${bandSlug}`}
      style={{ width: size, height: size }}
    >
      <svg
        className="aqi-gauge__svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`AQI ${clampedAqi}: ${band}`}
      >
        <path
          d={trackPath}
          className="aqi-gauge__track"
          fill="none"
          strokeWidth={strokeWidth}
        />
        <path
          d={valuePath}
          className="aqi-gauge__value"
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          x1={center}
          y1={center}
          x2={needleTip.x}
          y2={needleTip.y}
          className="aqi-gauge__needle"
        />
        <circle
          className="aqi-gauge__needle-tip"
          cx={needleTip.x}
          cy={needleTip.y}
          r={strokeWidth * 0.3}
        />
        <circle
          className="aqi-gauge__center-dot"
          cx={center}
          cy={center}
          r={strokeWidth * 0.25}
        />
      </svg>
      <div className="aqi-gauge__content">
        <span className="aqi-gauge__value-text">{clampedAqi}</span>
        <span className="aqi-gauge__band">{band}</span>
        {label && <span className="aqi-gauge__label">{label}</span>}
        {trendText && (
          <span
            className={`aqi-gauge__trend ${
              trendPct && trendPct >= 0 ? 'aqi-gauge__trend--up' : 'aqi-gauge__trend--down'
            }`}
          >
            {trendText}
          </span>
        )}
      </div>
    </div>
  );
}
