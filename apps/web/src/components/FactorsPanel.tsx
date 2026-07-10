import type { AnalyticsFactors, FactorImpact } from '../api/analytics';
import './FactorsPanel.css';

interface FactorsPanelProps {
  data: AnalyticsFactors | null;
  loading: boolean;
}

const FACTOR_ICONS: Record<string, string> = {
  cooking: '🍳',
  cleaning: '🧽',
  candle: '🕯️',
  wildfire: '🔥',
  window_open: '🪟',
  vacuum: '🧹',
  sleep: '🛏️',
  pet: '🐾',
};

function humanizeTag(tag: string) {
  return tag
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function formatPm25(value: number | null) {
  return value === null || value === undefined ? '--' : `${value.toFixed(1)} PM2.5`;
}

function deltaClass(deltaPct: number | null) {
  if (deltaPct === null || deltaPct === 0) return 'factor-row__delta factor-row__delta--neutral';
  return deltaPct < 0 ? 'factor-row__delta factor-row__delta--good' : 'factor-row__delta factor-row__delta--bad';
}

function FactorRow({ factor }: { factor: FactorImpact }) {
  const icon = FACTOR_ICONS[factor.tag] ?? '•';

  return (
    <li className="factor-row">
      <span className="factor-row__icon" aria-hidden>{icon}</span>
      <div className="factor-row__copy">
        <strong>{humanizeTag(factor.tag)}</strong>
        <small>{factor.events} recorded {factor.events === 1 ? 'event' : 'events'}</small>
      </div>
      <div className="factor-row__metrics">
        <span>{formatPm25(factor.avgPm25During)}</span>
        <small>Baseline {formatPm25(factor.baselinePm25)}</small>
      </div>
      <span className={deltaClass(factor.deltaPct)}>
        {factor.deltaPct === null || factor.deltaPct === undefined
          ? '--'
          : `${factor.deltaPct > 0 ? '+' : ''}${Math.round(factor.deltaPct)}%`}
      </span>
    </li>
  );
}

function Skeleton() {
  return (
    <section className="factors-panel factors-panel--loading" aria-label="Loading air factors">
      <div className="factors-panel__heading">
        <div className="factors-skeleton factors-skeleton--title" />
        <div className="factors-skeleton factors-skeleton--subtitle" />
      </div>
      <div className="factors-panel__list">
        {[0, 1, 2].map(item => (
          <div className="factors-skeleton factors-skeleton--row" key={item} />
        ))}
      </div>
    </section>
  );
}

export function FactorsPanel({ data, loading }: FactorsPanelProps) {
  if (loading) return <Skeleton />;

  const factors = data?.factors ?? [];

  return (
    <section className="factors-panel" aria-label="What affects your air">
      <div className="factors-panel__heading">
        <p>What affects your air</p>
        <h2>Recorded reaction factors</h2>
      </div>

      {factors.length > 0 ? (
        <>
          <ul className="factors-panel__list">
            {factors.map(factor => (
              <FactorRow factor={factor} key={factor.tag} />
            ))}
          </ul>
          <p className="factors-panel__footnote">
            Based on your recorded reactions; correlation, not causation.
          </p>
        </>
      ) : (
        <div className="factors-panel__empty">
          Record reactions to learn which routines align with air changes.
        </div>
      )}
    </section>
  );
}
