import { getAQIBandInfo, getAQIBand } from '../utils/aqi';
import './AQIBadge.css';

interface AQIBadgeProps {
  aqi: number;
  size?: 'small' | 'medium' | 'large';
  showBand?: boolean;
}

export function AQIBadge({ aqi, size = 'medium', showBand = false }: AQIBadgeProps) {
  const { band } = getAQIBandInfo(aqi);
  const bandSlug = getAQIBand(aqi);

  return (
    <div className={`aqi-badge aqi-badge--${size} aqi-badge--${bandSlug}`}>
      <span className="aqi-dot" aria-hidden="true" />
      <span className="aqi-value">{aqi}</span>
      {showBand && <span className="aqi-band">{band}</span>}
    </div>
  );
}
