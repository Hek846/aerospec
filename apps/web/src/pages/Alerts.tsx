import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { AlertRule, AlertEvent } from '../types';
import './Alerts.css';

export default function Alerts() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'acknowledged' | 'closed'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getAlerts();
      setRules(data.rules);
      setEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async (eventId: string) => {
    try {
      await api.acknowledgeAlert(eventId);
      // Update local state optimistically
      setEvents(events.map(e =>
        e.id === eventId ? { ...e, status: 'acknowledged' as const } : e
      ));
    } catch (err) {
      alert('Failed to acknowledge alert');
    }
  };

  const handleDismiss = async (eventId: string) => {
    try {
      await api.dismissAlert(eventId);
      // Update local state optimistically
      setEvents(events.map(e =>
        e.id === eventId ? { ...e, status: 'closed' as const } : e
      ));
    } catch (err) {
      alert('Failed to dismiss alert');
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    return event.status === filter;
  });

  const getStatusChipClass = (status: string) => {
    switch (status) {
      case 'open':
        return 'chip chip--open';
      case 'acknowledged':
        return 'chip chip--acknowledged';
      case 'closed':
        return 'chip chip--closed';
      default:
        return 'chip chip--closed';
    }
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'pm25':
      case 'pm10':
        return '🌫️';
      case 'co2':
        return '💨';
      case 'vocIndex':
        return '🧪';
      case 'noiseDb':
        return '🔊';
      default:
        return '⚠️';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="alerts-loading">
        <div className="alerts-loading__content">
          <div className="alerts-loading__spinner"></div>
          <p>Loading alerts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alerts-error">
        <div className="alerts-error__box">
          <p>Error loading alerts</p>
          <p>{error}</p>
          <button onClick={loadAlerts}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="alerts-page">
      <div className="alerts-header">
        <h1>Alerts</h1>
        <p>Manage air quality alerts and notifications</p>
      </div>

      {/* Alert Rules Section */}
      <div className="alerts-section">
        <h2 className="alerts-section__title">Active Alert Rules</h2>
        <div className="alerts-rules-grid">
          {rules.map(rule => (
            <div
              key={rule.id}
              className="alert-rule-card"
            >
              <div className="alert-rule-card__header">
                <span className="alert-rule-card__icon">{getMetricIcon(rule.metric)}</span>
                <span className={rule.enabled ? 'chip chip--active' : 'chip chip--disabled'}>
                  {rule.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <h3 className="alert-rule-card__name">
                {rule.metric.replace(/([A-Z])/g, ' $1')}
              </h3>
              <p className="alert-rule-card__condition">
                Alert when {rule.thresholdType} {rule.thresholdValue}
              </p>
              <div className="alert-rule-card__meta">
                <p>Email: {rule.notifyEmail}</p>
                {rule.quietHours && (
                  <p>Quiet: {rule.quietHours.start} - {rule.quietHours.end}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alert Events Section */}
      <div className="alerts-section">
        <div className="alerts-events__header">
          <h2 className="alerts-section__title">Alert Events</h2>
          <div className="alerts-filter">
            {(['all', 'open', 'acknowledged', 'closed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={filter === f ? 'alerts-filter__btn alerts-filter__btn--active' : 'alerts-filter__btn'}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="alerts-empty">
            <p>No {filter !== 'all' ? filter : ''} alerts found</p>
            <p>All clear!</p>
          </div>
        ) : (
          <div className="alerts-events-list">
            {filteredEvents.map(event => (
              <div
                key={event.id}
                className="alert-event-row"
              >
                <div className="alert-event-row__content">
                  <span className="alert-event-row__icon">{getMetricIcon(event.metric)}</span>

                  <div className="alert-event-row__details">
                    <h3 className="alert-event-row__title">
                      {event.metric.replace(/([A-Z])/g, ' $1')}
                      <span className={getStatusChipClass(event.status)}>
                        {event.status}
                      </span>
                    </h3>
                    <p className="alert-event-row__reading">
                      Value: <strong>{event.value}</strong> • Device: {event.deviceId}
                    </p>
                    <p className="alert-event-row__time">
                      {formatTimestamp(event.timestamp)}
                    </p>
                  </div>
                </div>

                <div className="alert-event-row__actions">
                  {event.status === 'open' && (
                    <button
                      onClick={() => handleAcknowledge(event.id)}
                      className="btn btn--primary"
                    >
                      Acknowledge
                    </button>
                  )}
                  {(event.status === 'open' || event.status === 'acknowledged') && (
                    <button
                      onClick={() => handleDismiss(event.id)}
                      className="btn btn--secondary"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
