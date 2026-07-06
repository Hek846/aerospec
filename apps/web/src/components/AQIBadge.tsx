import { getAQIBandInfo } from '../utils/aqi';
import './AQIBadge.css';

interface AQIBadgeProps {
  aqi: number;
  size?: 'small' | 'medium' | 'large';
  showBand?: boolean;
}

export function AQIBadge({ aqi, size = 'medium', showBand = false }: AQIBadgeProps) {
  const { band, color } = getAQIBandInfo(aqi);

  return (
    <div className={`aqi-badge aqi-badge--${size}`}>
      <div className="aqi-value" style={{ backgroundColor: color }}>
        {aqi}
      </div>
      {showBand && <div className="aqi-band">{band}</div>}
    </div>
  );
}
