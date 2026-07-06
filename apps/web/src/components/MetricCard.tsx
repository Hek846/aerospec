import './MetricCard.css';

interface MetricCardProps {
  label: string;
  value: number | string;
  unit: string;
  icon?: string;
  status?: 'good' | 'warning' | 'alert';
}

export function MetricCard({ label, value, unit, icon, status = 'good' }: MetricCardProps) {
  return (
    <div className={`metric-card metric-card--${status}`}>
      <div className="metric-header">
        {icon && <span className="metric-icon">{icon}</span>}
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-value-container">
        <span className="metric-value">{value}</span>
        <span className="metric-unit">{unit}</span>
      </div>
    </div>
  );
}
